import { Router, Request, Response } from 'express';
import { db } from '../models/db';
import { upload } from '../middleware/upload';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendNewApplicationNotification } from '../services/emailService';
import { processVoteResult } from '../services/voteService';

export const applicationsRouter = Router();

// Öffentlich: Neuen Antrag einreichen
applicationsRouter.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, type, scope, budget, dateRange, classGroup } = req.body;

    if (!name || !email || !type || !scope) {
      res.status(400).json({ error: 'Name, E-Mail, Art und Umfang sind Pflichtfelder' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
      return;
    }

    const budgetNum = budget != null && budget !== '' ? parseFloat(budget) : null;
    if (budgetNum !== null && (isNaN(budgetNum) || budgetNum < 0 || budgetNum > 99999999.99)) {
      res.status(400).json({ error: 'Ungültiger Budgetbetrag (0 – 99.999.999,99 €)' });
      return;
    }

    try {
      const filePath = req.file ? req.file.filename : null;

      const result = await db.query(
        `INSERT INTO applications (name, email, type, scope, budget, date_range, class_group, file_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, email, type, scope, budgetNum, dateRange || null, classGroup || null, filePath]
      );

      const application = result.rows[0];

      // Vorstand benachrichtigen
      try {
        await sendNewApplicationNotification(
          { id: application.id, name, type, scope, budget, dateRange, classGroup }
        );
      } catch (emailErr) {
        console.error('E-Mail-Fehler (nicht kritisch):', emailErr);
      }

      res.status(201).json({
        message: 'Antrag erfolgreich eingereicht',
        applicationId: application.id,
      });
    } catch (err) {
      console.error('Fehler beim Einreichen:', err);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Öffentlich: Antragsstatus prüfen
applicationsRouter.get('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(
      `SELECT id, name, type, status, created_at, decided_at FROM applications WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Antrag nicht gefunden' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Vorstand: Alle Anträge (gefiltert)
applicationsRouter.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.query;
  try {
    const query = status
      ? `SELECT a.*, 
           COUNT(v.*) FILTER (WHERE v.vote = true) AS yes_votes,
           COUNT(v.*) FILTER (WHERE v.vote = false) AS no_votes,
           COUNT(v.*) AS total_votes
         FROM applications a
         LEFT JOIN votes v ON a.id = v.application_id
         WHERE a.status = $1
         GROUP BY a.id ORDER BY a.created_at DESC`
      : `SELECT a.*,
           COUNT(v.*) FILTER (WHERE v.vote = true) AS yes_votes,
           COUNT(v.*) FILTER (WHERE v.vote = false) AS no_votes,
           COUNT(v.*) AS total_votes
         FROM applications a
         LEFT JOIN votes v ON a.id = v.application_id
         GROUP BY a.id ORDER BY a.created_at DESC`;

    const result = await db.query(query, status ? [status] : []);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Vorstand: Einzelnen Antrag anzeigen
applicationsRouter.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appResult = await db.query(
      `SELECT a.*,
         COUNT(v.*) FILTER (WHERE v.vote = true) AS yes_votes,
         COUNT(v.*) FILTER (WHERE v.vote = false) AS no_votes
       FROM applications a
       LEFT JOIN votes v ON a.id = v.application_id
       WHERE a.id = $1 GROUP BY a.id`,
      [req.params.id]
    );
    if (appResult.rows.length === 0) {
      res.status(404).json({ error: 'Antrag nicht gefunden' });
      return;
    }

    // Alle Stimmen inkl. Vorstandsname und Rolle
    const votesResult = await db.query(
      `SELECT v.vote, v.comment, v.voted_at, b.name AS board_member_name, b.role AS board_member_role
       FROM votes v
       JOIN board_members b ON v.board_member_id = b.id
       WHERE v.application_id = $1 ORDER BY v.voted_at`,
      [req.params.id]
    );

    // Hat der aktuelle Nutzer bereits abgestimmt?
    const myVote = await db.query(
      `SELECT vote, comment FROM votes WHERE application_id = $1 AND board_member_id = $2`,
      [req.params.id, req.boardMember!.id]
    );

    res.json({
      ...appResult.rows[0],
      votes: votesResult.rows,
      myVote: myVote.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Vorstand: Abstimmen
applicationsRouter.post('/:id/vote', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { vote, comment } = req.body;

  if (vote === undefined || vote === null) {
    res.status(400).json({ error: 'Stimme (vote: true/false) erforderlich' });
    return;
  }

  try {
    // Antrag prüfen
    const appResult = await db.query(
      `SELECT status FROM applications WHERE id = $1`,
      [req.params.id]
    );
    if (appResult.rows.length === 0) {
      res.status(404).json({ error: 'Antrag nicht gefunden' });
      return;
    }
    if (appResult.rows[0].status !== 'pending') {
      res.status(409).json({ error: 'Dieser Antrag wurde bereits entschieden' });
      return;
    }

    // Abstimmung speichern (Duplikat wird als Konflikt erkannt)
    const insertResult = await db.query(
      `INSERT INTO votes (application_id, board_member_id, vote, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (application_id, board_member_id) DO NOTHING
       RETURNING id`,
      [req.params.id, req.boardMember!.id, vote, comment || null]
    );

    if (insertResult.rowCount === 0) {
      res.status(409).json({ error: 'Sie haben für diesen Antrag bereits abgestimmt.' });
      return;
    }

    // Ergebnis prüfen
    await processVoteResult(req.params.id);

    res.json({ message: 'Stimme erfolgreich abgegeben' });
  } catch (err) {
    console.error('Abstimmungs-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});
