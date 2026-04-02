import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../models/db';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
    return;
  }

  try {
    // Nutzer ohne password_hash laden, dann Hash separat prüfen
    const result = await db.query(
      'SELECT id, name, email, username, role FROM board_members WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Ungültige Anmeldedaten' });
      return;
    }

    const member = result.rows[0];

    // password_hash separat abrufen (nie in Response-Objekt)
    const hashResult = await db.query(
      'SELECT password_hash FROM board_members WHERE id = $1',
      [member.id]
    );
    const valid = await bcrypt.compare(password, hashResult.rows[0].password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Ungültige Anmeldedaten' });
      return;
    }

    const token = jwt.sign(
      { id: member.id, username: member.username, name: member.name, role: member.role },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    res.json({ token, member: { id: member.id, name: member.name, email: member.email, role: member.role } });
  } catch (err) {
    console.error('Login-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});
