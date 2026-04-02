# Anleitung: Pro MMBbS Förderverein – Antragsportal

## Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [Lokaler Test](#2-lokaler-test)
3. [Passwörter für den Vorstand setzen](#3-passwörter-für-den-vorstand-setzen)
4. [E-Mail-Test lokal (Mailhog)](#4-e-mail-test-lokal-mailhog)
5. [Manueller Test-Workflow](#5-manueller-test-workflow)
6. [Deployment auf einem Server](#6-deployment-auf-einem-server)
7. [Nginx Reverse Proxy + SSL](#7-nginx-reverse-proxy--ssl)
8. [Wartung & Troubleshooting](#8-wartung--troubleshooting)
9. [Sicherheitshinweise](#9-sicherheitshinweise)

---

## 1. Voraussetzungen

### Lokal (Entwicklung & Test)

| Software | Mindestversion | Download |
|---|---|---|
| Docker Desktop | 24.x | https://www.docker.com/products/docker-desktop |
| Node.js | 20.x | https://nodejs.org (nur für Passwort-Skript) |
| Git (optional) | – | https://git-scm.com |

Prüfen ob Docker läuft:
```powershell
docker --version
docker compose version
```

### Server (Produktion)

- Linux-Server (Ubuntu 22.04 LTS empfohlen), mind. 1 GB RAM
- Docker + Docker Compose installiert
- Domain mit DNS-A-Record auf die Server-IP zeigend
- Port 80 und 443 offen in der Firewall

---

## 2. Lokaler Test

### 2.1 Projektordner öffnen

```powershell
cd C:\Users\Horn\Projekte\foerderverein-app
```

### 2.2 Konfigurationsdatei erstellen

```powershell
Copy-Item .env.example .env
```

Die `.env` öffnen und anpassen – für den lokalen Test reichen diese Werte:

```env
# Datenbank
POSTGRES_DB=foerderverein
POSTGRES_USER=fvuser
POSTGRES_PASSWORD=localtest123

# JWT (beliebiger langer String)
JWT_SECRET=mein_lokaler_jwt_secret_123

# SMTP – für lokalen Test Mailhog verwenden (siehe Abschnitt 4)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=foerderverein@mmbbs.de

# App-URL (für Links in E-Mails)
APP_URL=http://localhost:3000
```

### 2.3 App starten

```powershell
docker compose up --build
```

Beim ersten Start werden alle Images gebaut und die Datenbank initialisiert (~3–5 Minuten).

> 💡 Der Backend-Container wartet automatisch, bis die Datenbank den Health-Check besteht (`pg_isready`), bevor er startet. Ein kurzes Warten nach dem ersten `up --build` ist normal.

Erfolgreiche Ausgabe sieht so aus:
```
foerderverein-db        | database system is ready to accept connections
foerderverein-backend   | Backend läuft auf Port 4000
foerderverein-frontend  | ...
```

### 2.4 App im Browser öffnen

| URL | Beschreibung |
|---|---|
| http://localhost:3000 | Antragsportal (öffentlich) |
| http://localhost:3000/vorstand/login | Vorstand-Login |
| http://localhost:4000/api/health | API-Statuscheck |
| http://localhost:8025 | Mailhog (E-Mail-Vorschau, nur wenn aktiviert) |

### 2.5 API-Status prüfen

```powershell
# PowerShell
Invoke-WebRequest -Uri http://localhost:4000/api/health | Select-Object -ExpandProperty Content
# Erwartete Antwort: {"status":"ok","timestamp":"..."}
```

---

## 3. Passwörter für den Vorstand setzen

Die Datenbank enthält Standard-Passwörter (`Vorstand123!`). **Vor dem Einsatz unbedingt ändern!**

### 3.1 Passwort-Hashes generieren

```powershell
cd C:\Users\Horn\Projekte\foerderverein-app\db
npm install bcrypt
node generate-passwords.js
```

Das Skript gibt SQL-UPDATE-Befehle aus, z. B.:
```sql
UPDATE board_members SET password_hash='$2b$10$...' WHERE username='rhorn';
```

### 3.2 Hashes in laufende Datenbank eintragen

```powershell
# In den DB-Container verbinden
docker exec -it foerderverein-db psql -U fvuser -d foerderverein

# Dann im psql-Prompt:
UPDATE board_members SET password_hash='$2b$10$NEUER_HASH' WHERE username='rhorn';
UPDATE board_members SET password_hash='$2b$10$NEUER_HASH' WHERE username='ivater';
UPDATE board_members SET password_hash='$2b$10$NEUER_HASH' WHERE username='sziemdorff';
UPDATE board_members SET password_hash='$2b$10$NEUER_HASH' WHERE username='jtuttas';

# Prüfen
SELECT username, name, role FROM board_members;

# psql beenden
\q
```

### 3.3 Alternativ: init.sql dauerhaft anpassen

Hashes in `db/init.sql` einsetzen und dann neu bauen:
```powershell
docker compose down -v   # Achtung: löscht alle Daten!
docker compose up --build
```

---

## 4. E-Mail-Test lokal (Mailhog)

Für lokale Tests empfiehlt sich **Mailhog** – ein lokaler SMTP-Server der alle E-Mails abfängt und in einer Web-UI anzeigt.

### 4.1 Mailhog zu docker-compose.yml hinzufügen

Den `mailhog`-Service in `docker-compose.yml` ergänzen:

```yaml
  mailhog:
    image: mailhog/mailhog:latest
    container_name: foerderverein-mailhog
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web-UI
```

### 4.2 .env für Mailhog

```env
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
```

### 4.3 App neu starten

```powershell
docker compose up --build
```

E-Mails sind nun unter **http://localhost:8025** sichtbar.

---

## 5. Manueller Test-Workflow

### 5.1 Antrag stellen (öffentliche Seite)

1. http://localhost:3000 öffnen
2. Formular ausfüllen:
   - **Name:** Max Mustermann
   - **E-Mail:** test@example.de
   - **Art:** Klassenfahrt nach Berlin
   - **Umfang:** Busfahrt für 25 Schüler, 3 Tage Unterkunft
   - **Budget:** 2500 *(muss zwischen 0 und 99.999.999,99 € liegen)*
   - **Zeitraum:** 15.–18. Mai 2025
   - **Klasse:** FIAE23A
3. „Antrag einreichen" klicken
4. **Antrags-ID notieren** (wird auf der Bestätigungsseite angezeigt)
5. Mailhog prüfen → E-Mail an alle 4 Vorstandsmitglieder sollte eingegangen sein

> ℹ️ Die Antragstellung ist auf **10 Anträge pro Stunde** pro IP begrenzt (Rate Limiting). Beim Testen mehrerer Anträge kurz warten oder mit verschiedenen IPs arbeiten.

### 5.2 Abstimmung simulieren (Vorstand)

Für einen vollständigen Test alle 4 Vorstandsmitglieder einzeln einloggen:

> ℹ️ Der Login ist auf **10 Versuche pro 15 Minuten** pro IP begrenzt. Bei Tests mit falschen Passwörtern ggf. kurz warten.

#### Vorstandsmitglied 1 einloggen
1. http://localhost:3000/vorstand/login
2. Username: `rhorn` / Passwort: `Vorstand123!`
3. Antrag im Dashboard anklicken
4. Mit **Ja** abstimmen (optional Kommentar)
5. Abmelden

#### Vorstandsmitglied 2
1. Username: `ivater` → Mit **Ja** abstimmen

#### Vorstandsmitglied 3
1. Username: `sziemdorff` → Mit **Ja** abstimmen
2. → **Antrag wird sofort bewilligt** (3. Ja-Stimme)
3. Mailhog: Bestätigungs-E-Mail an `test@example.de` prüfen

### 5.3 Stichentscheid (2:2) testen

1. Neuen Antrag stellen
2. `rhorn` → **Ja**, `ivater` → **Nein**, `sziemdorff` → **Ja**, `jtuttas` → **Nein**
3. Nach letzter Stimme: Ergebnis 2:2 → Rainer Horn (1. Vorsitzender) hatte **Ja** gestimmt → **bewilligt**
4. Im Dashboard: goldener Stichentscheid-Hinweis erscheint

### 5.4 Antragsstatus prüfen

1. http://localhost:3000/status
2. Antrags-ID eingeben
3. Status und Entscheidungsdatum werden angezeigt

### 5.5 Direkter Datenbankblick (optional)

```powershell
docker exec -it foerderverein-db psql -U fvuser -d foerderverein -c "
SELECT a.name, a.type, a.status, a.tiebreaker_applied,
       COUNT(v.*) FILTER (WHERE v.vote=true) AS ja,
       COUNT(v.*) FILTER (WHERE v.vote=false) AS nein
FROM applications a
LEFT JOIN votes v ON a.id = v.application_id
GROUP BY a.id;"
```

---

## 6. Deployment auf einem Server

### 6.1 Server vorbereiten (Ubuntu 22.04)

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose (Plugin)
sudo apt install -y docker-compose-plugin

# Verzeichnis anlegen
sudo mkdir -p /opt/foerderverein-app
sudo chown $USER:$USER /opt/foerderverein-app
```

### 6.2 Projektdateien auf den Server übertragen

**Option A: per SCP (von Windows)**
```powershell
# Aus dem Projektordner heraus
scp -r C:\Users\Horn\Projekte\foerderverein-app\* user@SERVERIP:/opt/foerderverein-app/
```

**Option B: per Git**
```bash
# Auf dem Server
cd /opt/foerderverein-app
git clone https://github.com/IHR_REPO . 
```

### 6.3 Produktions-.env erstellen

```bash
cd /opt/foerderverein-app
cp .env.example .env
nano .env
```

Produktionswerte setzen:
```env
POSTGRES_DB=foerderverein
POSTGRES_USER=fvuser
POSTGRES_PASSWORD=SICHERES_ZUFALLSPASSWORT_32_ZEICHEN

JWT_SECRET=ZUFÄLLIGER_LANGER_STRING_MIN_64_ZEICHEN

SMTP_HOST=smtp.IHR_MAILPROVIDER.de
SMTP_PORT=587
SMTP_USER=foerderverein@mmbbs.de
SMTP_PASS=IHR_SMTP_PASSWORT
SMTP_FROM=foerderverein@mmbbs.de

APP_URL=https://foerderverein.mmbbs.de
```

> 💡 **Sichere Passwörter generieren:**
> ```bash
> openssl rand -base64 32   # Datenbankpasswort
> openssl rand -base64 64   # JWT Secret
> ```

### 6.4 Produktions-docker-compose.yml anpassen

Die Ports 3000 und 4000 müssen **nicht** nach außen geöffnet werden – der Nginx-Proxy übernimmt das. In `docker-compose.yml` die `ports`-Einträge für frontend und backend auf intern ändern:

```yaml
  frontend:
    # ports:
    #   - "3000:80"        # auskommentieren!
    expose:
      - "80"

  backend:
    # ports:
    #   - "4000:4000"      # auskommentieren!
    expose:
      - "4000"
```

### 6.5 App starten

```bash
cd /opt/foerderverein-app
docker compose up -d --build
```

Status prüfen:
```bash
docker compose ps
docker compose logs -f backend   # Backend-Logs verfolgen
```

### 6.6 Passwörter produktiv setzen

```bash
# bcrypt-Modul installieren (einmalig)
cd /opt/foerderverein-app/db
npm install bcrypt
node generate-passwords.js   # Neue Passwörter eingeben und Hashes kopieren

# In DB eintragen
docker exec -it foerderverein-db psql -U fvuser -d foerderverein
```

---

## 7. Nginx Reverse Proxy + SSL

### 7.1 Nginx und Certbot installieren

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 7.2 Nginx-Konfiguration erstellen

```bash
sudo nano /etc/nginx/sites-available/foerderverein
```

Inhalt:
```nginx
server {
    listen 80;
    server_name foerderverein.mmbbs.de;

    # Weiterleitungen der API zum Backend-Container
    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 10M;
    }

    # Upload-Dateien
    location /uploads/ {
        proxy_pass http://localhost:4000/uploads/;
    }

    # React-Frontend
    location / {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
    }
}
```

> ⚠️ `foerderverein.mmbbs.de` durch Ihre echte Domain ersetzen.  
> Und die `ports` in docker-compose.yml wieder auf `3000:80` und `4000:4000` setzen, damit Nginx sie erreicht.

### 7.3 Konfiguration aktivieren

```bash
sudo ln -s /etc/nginx/sites-available/foerderverein /etc/nginx/sites-enabled/
sudo nginx -t          # Konfiguration prüfen
sudo systemctl reload nginx
```

### 7.4 SSL-Zertifikat (Let's Encrypt)

```bash
sudo certbot --nginx -d foerderverein.mmbbs.de
```

Certbot konfiguriert HTTPS automatisch und trägt eine Weiterleitung von HTTP → HTTPS ein.

Zertifikat wird automatisch erneuert:
```bash
sudo certbot renew --dry-run   # Test der automatischen Erneuerung
```

### 7.5 Produktions-Test

```bash
# HTTPS-Erreichbarkeit
curl -I https://foerderverein.mmbbs.de
# Erwartete Antwort: HTTP/2 200

# API-Healthcheck
curl https://foerderverein.mmbbs.de/api/health
# Erwartete Antwort: {"status":"ok",...}
```

---

## 8. Wartung & Troubleshooting

### Logs anzeigen

```bash
docker compose logs -f              # Alle Container
docker compose logs -f backend      # Nur Backend
docker compose logs -f db           # Nur Datenbank
```

### App neu starten (nach Code-Änderungen)

```bash
docker compose down
docker compose up -d --build
```

### Datenbank-Backup

```bash
# Backup erstellen
docker exec foerderverein-db pg_dump -U fvuser foerderverein > backup_$(date +%Y%m%d).sql

# Backup wiederherstellen
docker exec -i foerderverein-db psql -U fvuser foerderverein < backup_20250101.sql
```

### Automatisches tägliches Backup (Cron)

```bash
sudo crontab -e
# Folgende Zeile hinzufügen (täglich 2:00 Uhr):
0 2 * * * docker exec foerderverein-db pg_dump -U fvuser foerderverein > /opt/backups/fv_$(date +\%Y\%m\%d).sql
```

### Häufige Probleme

| Problem | Ursache | Lösung |
|---|---|---|
| `Connection refused` auf Port 4000 | Backend noch nicht gestartet | `docker compose logs backend` prüfen |
| Backend startet nicht: „JWT_SECRET is required" | `.env` fehlt oder `JWT_SECRET` nicht gesetzt | `.env` prüfen und `docker compose up -d` |
| DB-Verbindungsfehler im Backend | Falsche `DATABASE_URL` in `.env` | `.env` prüfen, Container neu starten |
| Backend startet vor DB ist bereit | Health-Check schlägt fehl | `docker compose ps` prüfen – DB muss `healthy` sein |
| E-Mails kommen nicht an | Falsche SMTP-Einstellungen | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` prüfen |
| Login funktioniert nicht | Passwort-Hash falsch | Hash mit `generate-passwords.js` neu generieren |
| Login-Fehler nach 10 Versuchen | Rate Limiting aktiv | 15 Minuten warten oder Backend neu starten |
| Antrag-Einreichung blockiert | Rate Limiting: 10/Stunde | 1 Stunde warten oder Backend neu starten |
| Budget-Fehler beim Einreichen | Wert außerhalb 0–99.999.999,99 | Gültigen Betrag eingeben |
| Frontend lädt nicht | Nginx-Proxy-Fehler | `sudo nginx -t` und Nginx-Logs prüfen |
| PDF-Upload schlägt fehl | Datei ist kein PDF oder > 10 MB | Nur `.pdf`-Dateien unter 10 MB erlaubt |
| Uploads-Volume nicht gemountet | Docker-Volume fehlt | `docker compose down -v && docker compose up -d` |

### Datenbankinhalt direkt prüfen

```bash
docker exec -it foerderverein-db psql -U fvuser -d foerderverein

-- Alle Anträge anzeigen
SELECT id, name, type, status, tiebreaker_applied, created_at FROM applications;

-- Abstimmungen eines Antrags
SELECT b.name, b.role, v.vote, v.comment FROM votes v
JOIN board_members b ON v.board_member_id = b.id
WHERE v.application_id = 'ANTRAGS-UUID-HIER';

-- Vorstandsmitglieder prüfen
SELECT username, name, role FROM board_members;
```

### Container komplett zurücksetzen (alle Daten löschen!)

```bash
docker compose down -v --remove-orphans
docker compose up -d --build
```

---

## 9. Sicherheitshinweise

### Pflichtfelder in `.env`

Die App startet **nicht**, wenn folgende Variablen fehlen:

| Variable | Beschreibung |
|---|---|
| `JWT_SECRET` | Mind. 32 zufällige Zeichen – niemals `secret` oder ähnliches |
| `DATABASE_URL` | Wird automatisch aus den `POSTGRES_*`-Variablen gebildet |
| `CORS_ORIGIN` | Pflicht in Produktion – auf exakte Frontend-URL setzen |

```bash
# Sichere Werte generieren
openssl rand -base64 64   # JWT_SECRET
openssl rand -base64 32   # POSTGRES_PASSWORD
```

### Rate Limiting

| Endpunkt | Limit |
|---|---|
| `POST /api/auth/login` | 10 Versuche / 15 Minuten / IP |
| `POST /api/applications` | 10 Anträge / Stunde / IP |

### Datei-Upload

- Nur `.pdf`-Dateien werden akzeptiert (MIME-Type **und** Dateiendung werden geprüft)
- Maximale Dateigröße: **10 MB**
- Dateinamen werden mit UUID überschrieben (keine Originalname-Speicherung)

### Passwörter

Die in `db/init.sql` hinterlegten Passwort-Hashes sind **Platzhalter** (`Vorstand123!`).  
**Vor dem Produktivbetrieb unbedingt mit `node db/generate-passwords.js` neue Hashes erzeugen und eintragen!**

### Checkliste vor Produktivbetrieb

- [ ] Alle Vorstandspasswörter geändert (`generate-passwords.js`)
- [ ] `JWT_SECRET` auf langen zufälligen Wert gesetzt (≥ 64 Zeichen)
- [ ] `POSTGRES_PASSWORD` auf sicheren Wert gesetzt
- [ ] `CORS_ORIGIN` auf exakte Frontend-URL gesetzt
- [ ] SMTP-Einstellungen konfiguriert und E-Mail-Versand getestet
- [ ] `APP_URL` auf echte Domain gesetzt (für E-Mail-Links)
- [ ] SSL-Zertifikat eingerichtet (HTTPS aktiv)
- [ ] Automatisches Backup eingerichtet
- [ ] Firewall: nur Port 80 und 443 nach außen offen
- [ ] Vorstand-Login-Zugangsdaten sicher verteilt
