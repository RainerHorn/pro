# Pro MMBbS Förderverein – Antragsportal

Web-App für den Förderverein Pro MMBbS e.V.: Öffentliche Antragstellung, Vorstandsabstimmung mit Stichentscheid-Regel und automatische E-Mail-Benachrichtigungen – vollständig in Docker.

## Schnellstart (lokal)

### 1. Konfiguration
```powershell
Copy-Item .env.example .env
# .env anpassen (Datenbankpasswort, JWT-Secret, SMTP)
```

### 2. Passwörter generieren
```powershell
cd db
npm install bcrypt
node generate-passwords.js
# Ausgegebene SQL-Befehle in die laufende DB eintragen (siehe ANLEITUNG.md §3)
```

### 3. App starten
```powershell
docker compose up --build
```

| URL | Beschreibung |
|---|---|
| http://localhost:3000 | Antragsportal (öffentlich) |
| http://localhost:3000/vorstand/login | Vorstand-Login |
| http://localhost:4000/api/health | API-Statuscheck |

---

## Produktions-Deployment (Traefik)

Für den Serverbetrieb wird `docker-compose.prod.yml` verwendet. Voraussetzung ist ein laufender [Traefik](https://traefik.io/)-Reverse-Proxy im externen Docker-Netzwerk `proxy`, der TLS-Terminierung übernimmt.

### 1. Pflicht-Variablen in `.env` setzen

```env
DOMAIN=foerderverein.example.de
APP_URL=https://foerderverein.example.de
POSTGRES_PASSWORD=sicheres_passwort
JWT_SECRET=langer_zufaelliger_string
SMTP_HOST=smtp.IHR_PROVIDER.de
SMTP_PORT=587
SMTP_USER=foerderverein@mmbbs.de
SMTP_PASS=IHR_SMTP_PASSWORT
SMTP_FROM=foerderverein@mmbbs.de
```

### 2. App starten

```powershell
docker compose -f docker-compose.prod.yml up -d --build
```

Traefik leitet automatisch HTTP → HTTPS um und stellt das Zertifikat bereit.
Die App ist danach unter `https://$DOMAIN` erreichbar.

### 3. Passwörter setzen (Ersteinrichtung)

```powershell
cd db; node generate-passwords.js
docker exec -it foerderverein-db psql -U fvuser -d foerderverein
```
```sql
UPDATE board_members SET password_hash='$2b$10$...' WHERE username='rhorn';
-- (für alle vier Vorstandsmitglieder wiederholen)
```

---

## Standard-Zugangsdaten (Vorstand)

> ⚠️ **Vor Produktivbetrieb unbedingt ändern!** (siehe `db/generate-passwords.js`)

| Benutzername | Name              | Rolle           | Passwort     |
|---|---|---|---|
| rhorn        | Rainer Horn       | 1. Vorsitzender | Vorstand123! |
| ivater       | Ingmar Vater      | Mitglied        | Vorstand123! |
| sziemdorff   | Silvan Ziemdorff  | Mitglied        | Vorstand123! |
| jtuttas      | Dr. Jörg Tuttas   | Mitglied        | Vorstand123! |

---

## Abstimmungslogik

| Situation | Ergebnis |
|---|---|
| 3 oder mehr Ja-Stimmen | ✅ Sofort bewilligt |
| 2 oder mehr Nein-Stimmen | ❌ Sofort abgelehnt |
| Alle 4 abgestimmt, Ergebnis 2:2 | Stimme des 1. Vorsitzenden entscheidet (Stichentscheid) |

- Jede Stimme löst automatisch die Entscheidungslogik aus
- Antragsteller erhält automatisch eine E-Mail bei Bewilligung oder Ablehnung
- Bei Stichentscheid wird dies im Dashboard als goldener Hinweis angezeigt

---

## Architektur

```
frontend  React 18 + TypeScript, Nginx   :3000
              ↕ /api/* Proxy
backend   Node.js 20 + Express + TypeScript   :4000
              ↕ pg Pool
db        PostgreSQL 16 Alpine               :5432
```

Alle Dienste laufen als Docker-Container. Die Datenbank wartet auf den Health-Check, bevor das Backend startet (`condition: service_healthy`).

### Verzeichnisstruktur

```
foerderverein-app/
├── backend/          Node.js/TypeScript API
│   └── src/
│       ├── routes/   auth.ts, applications.ts
│       ├── services/ emailService.ts, voteService.ts
│       └── middleware/ auth.ts, upload.ts
├── frontend/         React SPA
│   └── src/
│       ├── pages/    Formulare, Dashboard, Abstimmung
│       └── components/ Header, PrivateRoute
├── db/
│   ├── init.sql      Schema + Seed-Daten
│   └── generate-passwords.js
├── docker-compose.yml
├── .env.example
├── README.md         (diese Datei)
└── ANLEITUNG.md      Ausführliche Installations- & Deployment-Anleitung
```

---

## Sicherheitsmerkmale

- **JWT-Authentifizierung** (8 Stunden Gültigkeit, HS256)
- **bcrypt** für Passwort-Hashes (Faktor 10)
- **Rate Limiting:** Login max. 10 Versuche / 15 Min · Antrag max. 10 / Stunde
- **CORS** nur für konfigurierte `CORS_ORIGIN` (Pflichtfeld in Produktion)
- **Datei-Upload:** nur `.pdf`, max. 10 MB, MIME-Type + Extension werden geprüft
- **Budget-Validierung:** server-seitig (0 – 99.999.999,99 €)
- `JWT_SECRET` und `DATABASE_URL` sind Pflichtfelder – App startet nicht ohne sie
- `password_hash` wird nie in einer API-Antwort mitgeliefert
- Doppelabstimmung auf DB-Ebene verhindert (UNIQUE Constraint), Fehler → HTTP 409

---

## Passwörter ändern

```powershell
cd db
node generate-passwords.js
# Im psql-Prompt:
docker exec -it foerderverein-db psql -U fvuser -d foerderverein
```
```sql
UPDATE board_members SET password_hash='$2b$10$...' WHERE username='rhorn';
```

---

## SMTP konfigurieren

```env
SMTP_HOST=smtp.IHR_PROVIDER.de
SMTP_PORT=587
SMTP_USER=foerderverein@mmbbs.de
SMTP_PASS=IHR_SMTP_PASSWORT
SMTP_FROM=foerderverein@mmbbs.de
```

Für lokale Tests: Mailhog verwenden (siehe `ANLEITUNG.md §4`).

---

## Weiterführende Dokumentation

📖 **[ANLEITUNG.md](ANLEITUNG.md)** – ausführliche Anleitung für lokalen Test, Mailhog-Setup, Server-Deployment, Nginx + SSL, Backup und Troubleshooting.
