import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { applicationsRouter } from './routes/applications';

dotenv.config();

// Pflichtumgebungsvariablen prüfen – App startet nicht ohne sie
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Umgebungsvariable ${key} ist nicht gesetzt.`);
    process.exit(1);
  }
}

if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error('FATAL: CORS_ORIGIN muss in der Produktion gesetzt sein.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Rate Limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10,
  message: { error: 'Zu viele Anmeldeversuche. Bitte nach 15 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 10,
  message: { error: 'Zu viele Anträge von dieser IP. Bitte später erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Statische Dateien (Uploads)
app.use('/uploads', express.static(path.join(process.env.UPLOAD_DIR || './uploads')));

// Routen
app.use('/api/auth', loginLimiter, authRouter);
app.use('/api/applications', applicationsRouter);
// Rate Limit nur für neue Anträge (POST), nicht für Statusabfragen
app.use('/api/applications', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/') {
    return applicationLimiter(req, res, next);
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
});

export default app;
