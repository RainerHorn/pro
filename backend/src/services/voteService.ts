import { db } from '../models/db';
import { sendDecisionNotification } from './emailService';

export async function processVoteResult(applicationId: string): Promise<void> {
  // Aktuelle Stimmzählung und Gesamtanzahl der Vorstandsmitglieder
  const countResult = await db.query(
    `SELECT 
      COUNT(*) FILTER (WHERE v.vote = true)  AS yes_count,
      COUNT(*) FILTER (WHERE v.vote = false) AS no_count,
      COUNT(*) AS total_votes,
      (SELECT COUNT(*) FROM board_members)   AS board_size
     FROM votes v WHERE v.application_id = $1`,
    [applicationId]
  );

  const yesCount   = parseInt(countResult.rows[0].yes_count, 10);
  const noCount    = parseInt(countResult.rows[0].no_count, 10);
  const totalVotes = parseInt(countResult.rows[0].total_votes, 10);
  const boardSize  = parseInt(countResult.rows[0].board_size, 10);

  let newStatus: 'approved' | 'rejected' | null = null;
  let tiebreakerApplied = false;

  // Normalfall: 3 Ja = bewilligt
  if (yesCount >= 3) {
    newStatus = 'approved';
  }
  // Normalfall: 2 Nein = abgelehnt (3 Ja mathematisch unmöglich)
  else if (noCount >= 2) {
    newStatus = 'rejected';
  }
  // Sonderregel: alle haben abgestimmt und Ergebnis ist 2:2 → Stimme des 1. Vorsitzenden zählt doppelt
  else if (totalVotes === boardSize && yesCount === 2 && noCount === 2) {
    const chairmanVoteResult = await db.query(
      `SELECT v.vote FROM votes v
       JOIN board_members b ON v.board_member_id = b.id
       WHERE v.application_id = $1 AND b.role = 'chairman'
       LIMIT 1`,
      [applicationId]
    );

    if (chairmanVoteResult.rows.length === 0) {
      // Kein Vorsitzender gefunden – Admins benachrichtigen und Antrag blockieren
      console.error(
        `KRITISCH: Stichentscheid bei Antrag ${applicationId} nötig, ` +
        `aber kein Vorstandsmitglied mit Rolle 'chairman' gefunden. ` +
        `Bitte Datenbankrolle prüfen.`
      );
      return; // Antrag bleibt 'pending' – manuelle Intervention nötig
    }

    tiebreakerApplied = true;
    newStatus = chairmanVoteResult.rows[0].vote ? 'approved' : 'rejected';
  }

  if (!newStatus) return;

  // Status aktualisieren
  const appResult = await db.query(
    `UPDATE applications
     SET status = $1, decided_at = NOW(), tiebreaker_applied = $2
     WHERE id = $3 AND status = 'pending'
     RETURNING name, email, type`,
    [newStatus, tiebreakerApplied, applicationId]
  );

  if (appResult.rowCount === 0) return; // Bereits entschieden

  const { name, email, type } = appResult.rows[0];
  try {
    await sendDecisionNotification(
      email, name, type,
      newStatus === 'approved',
      tiebreakerApplied
    );
  } catch (emailErr) {
    console.error(`E-Mail-Benachrichtigung für Antrag ${applicationId} fehlgeschlagen:`, emailErr);
    // Kein Re-throw – Entscheidung ist bereits gespeichert
  }
}
