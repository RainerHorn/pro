-- Förderverein BBS – Datenbankschema

CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE member_role AS ENUM ('chairman', 'member');

-- Vorstandsmitglieder
CREATE TABLE board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role member_role DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Förderanträge
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    scope TEXT NOT NULL,
    budget DECIMAL(10, 2),
    date_range VARCHAR(255),
    class_group VARCHAR(100),
    file_path VARCHAR(500),
    status application_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    tiebreaker_applied BOOLEAN DEFAULT FALSE
);

-- Abstimmungen
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    board_member_id UUID NOT NULL REFERENCES board_members(id) ON DELETE CASCADE,
    vote BOOLEAN NOT NULL,
    comment TEXT,
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(application_id, board_member_id)
);

-- Index für häufige Abfragen
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_votes_application ON votes(application_id);

-- Seed: 4 Vorstandsmitglieder (Pro MMBbS Förderverein e.V.)
-- Passwörter: alle "Vorstand123!" (bcrypt-gehashed)
-- WICHTIG: Vor Produktivbetrieb ändern! (node db/generate-passwords.js)
INSERT INTO board_members (id, name, email, username, password_hash, role) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Rainer Horn',       'rainer.horn@mmbbs.de',       'rhorn',       '$2b$10$Qw9T6pMRk2n5yqbvRKzuJuHW1rqv.It1zRy0LDM9bbaJQ/kEclISu', 'chairman'),
    ('b0000000-0000-0000-0000-000000000002', 'Ingmar Vater',      'ingmar.vater@mmbbs.de',      'ivater',      '$2b$10$Qw9T6pMRk2n5yqbvRKzuJuHW1rqv.It1zRy0LDM9bbaJQ/kEclISu', 'member'),
    ('b0000000-0000-0000-0000-000000000003', 'Silvan Ziemdorff',  'silvan.ziemdorff@mmbbs.de',  'sziemdorff',  '$2b$10$Qw9T6pMRk2n5yqbvRKzuJuHW1rqv.It1zRy0LDM9bbaJQ/kEclISu', 'member'),
    ('b0000000-0000-0000-0000-000000000004', 'Dr. Jörg Tuttas',   'joerg.tuttas@mmbbs.de',      'jtuttas',     '$2b$10$Qw9T6pMRk2n5yqbvRKzuJuHW1rqv.It1zRy0LDM9bbaJQ/kEclISu', 'member');

-- Seed: 10 Beispiel-Förderanträge (verschiedene Status)
INSERT INTO applications (id, name, email, type, scope, budget, date_range, class_group, status, created_at, decided_at) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Lena Bergmann',    'lena.bergmann@schule.de',    'Klassenfahrt',          'Mehrtägige Klassenfahrt nach Berlin zur politischen Bildung',               450.00,  '12.05.2026 – 16.05.2026', 'FI24a',   'pending',  '2026-03-28 09:15:00+00', NULL),
    ('a1000000-0000-0000-0000-000000000002', 'Marco Schulze',    'marco.schulze@schule.de',    'Exkursion',             'Betriebsbesichtigung bei Volkswagen in Wolfsburg',                          120.00,  '07.05.2026',              'IT23b',   'pending',  '2026-03-29 11:30:00+00', NULL),
    ('a1000000-0000-0000-0000-000000000003', 'Sabine Krüger',    'sabine.krueger@schule.de',   'Lernmittel',            'Anschaffung von Fachliteratur für die Abteilung Mediengestaltung',          380.00,  NULL,                      NULL,      'approved', '2026-03-10 08:00:00+00', '2026-03-20 14:00:00+00'),
    ('a1000000-0000-0000-0000-000000000004', 'Tobias Wendt',     'tobias.wendt@schule.de',     'Veranstaltung',         'Schulinterner Workshop zu agilen Entwicklungsmethoden (Scrum)',             250.00,  '22.04.2026',              'FI24b',   'approved', '2026-03-12 13:45:00+00', '2026-03-22 10:00:00+00'),
    ('a1000000-0000-0000-0000-000000000005', 'Julia Hartmann',   'julia.hartmann@schule.de',   'Klassenfahrt',          'Sprachreise nach Dublin zur Förderung der Englischkenntnisse',              980.00,  '01.06.2026 – 07.06.2026', 'KM23a',   'rejected', '2026-03-05 10:00:00+00', '2026-03-15 16:30:00+00'),
    ('a1000000-0000-0000-0000-000000000006', 'Felix Neumann',    'felix.neumann@schule.de',    'Ausstattung',           'Anschaffung von Grafiktablets für den Unterricht Mediengestaltung Digital', 1200.00, NULL,                      NULL,      'approved', '2026-02-18 09:00:00+00', '2026-03-01 11:00:00+00'),
    ('a1000000-0000-0000-0000-000000000007', 'Anna Voß',         'anna.voss@schule.de',         'Exkursion',             'Besuch der CeBIT-Nachfolgemesse sIT in Hannover',                           95.00,   '14.04.2026',              'IT24a',   'rejected', '2026-03-20 14:00:00+00', '2026-03-27 09:00:00+00'),
    ('a1000000-0000-0000-0000-000000000008', 'Kevin Brandt',     'kevin.brandt@schule.de',     'Veranstaltung',         'Abschlussfeier mit Zeugnisübergabe für Abschlussklassen 2026',              600.00,  '27.06.2026',              NULL,      'pending',  '2026-04-01 07:30:00+00', NULL),
    ('a1000000-0000-0000-0000-000000000009', 'Marie Hoffmann',   'marie.hoffmann@schule.de',   'Soziales Projekt',      'Partnerschaftsprojekt mit Berufsschule Poznań – Schüleraustausch',         750.00,  '10.05.2026 – 14.05.2026', 'KM24a',   'pending',  '2026-04-01 15:00:00+00', NULL),
    ('a1000000-0000-0000-0000-000000000010', 'Jonas Zimmermann', 'jonas.zimmermann@schule.de', 'Lernmittel',            'Lizenzkosten für Adobe Creative Cloud (Schuljahr 2026/27)',                 890.00,  NULL,                      NULL,      'rejected', '2026-03-01 10:00:00+00', '2026-03-10 13:00:00+00');

UPDATE applications SET tiebreaker_applied = true WHERE id = 'a1000000-0000-0000-0000-000000000010';

-- Seed: Stimmen für entschiedene Anträge
INSERT INTO votes (id, application_id, board_member_id, vote, comment, voted_at) VALUES
    -- Antrag 003 (Fachliteratur) – bewilligt 3:1
    ('e0000000-0000-0000-0003-000000000001', 'a1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', true,  'Sinnvolle Investition für die Abteilung.',           '2026-03-18 09:00:00+00'),
    ('e0000000-0000-0000-0003-000000000002', 'a1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', true,  NULL,                                                 '2026-03-18 11:30:00+00'),
    ('e0000000-0000-0000-0003-000000000003', 'a1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', true,  NULL,                                                 '2026-03-19 14:00:00+00'),
    ('e0000000-0000-0000-0003-000000000004', 'a1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', false, 'Budget könnte aus Fachmitteln der Schule bestritten werden.', '2026-03-20 10:00:00+00'),

    -- Antrag 004 (Scrum-Workshop) – einstimmig bewilligt 4:0
    ('e0000000-0000-0000-0004-000000000001', 'a1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', true,  'Hervorragend – sehr praxisnaher Antrag.',            '2026-03-20 08:30:00+00'),
    ('e0000000-0000-0000-0004-000000000002', 'a1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', true,  NULL,                                                 '2026-03-20 10:00:00+00'),
    ('e0000000-0000-0000-0004-000000000003', 'a1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', true,  NULL,                                                 '2026-03-21 13:00:00+00'),
    ('e0000000-0000-0000-0004-000000000004', 'a1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', true,  'Agile Methoden sind wichtig für die Ausbildung.',    '2026-03-22 08:00:00+00'),

    -- Antrag 005 (Sprachreise Dublin) – abgelehnt 1:3
    ('e0000000-0000-0000-0005-000000000001', 'a1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', false, 'Budget übersteigt unsere Fördermöglichkeiten.',      '2026-03-12 09:00:00+00'),
    ('e0000000-0000-0000-0005-000000000002', 'a1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', false, NULL,                                                 '2026-03-13 11:00:00+00'),
    ('e0000000-0000-0000-0005-000000000003', 'a1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', true,  'Sprachkompetenz ist für Berufsschüler wertvoll.',    '2026-03-14 14:30:00+00'),
    ('e0000000-0000-0000-0005-000000000004', 'a1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', false, 'Kosten-Nutzen-Verhältnis nicht überzeugend.',         '2026-03-15 10:00:00+00'),

    -- Antrag 006 (Grafiktablets) – bewilligt 3:1
    ('e0000000-0000-0000-0006-000000000001', 'a1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', true,  'Wichtige Ausstattung für den Unterricht.',           '2026-02-25 10:00:00+00'),
    ('e0000000-0000-0000-0006-000000000002', 'a1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', true,  NULL,                                                 '2026-02-26 09:00:00+00'),
    ('e0000000-0000-0000-0006-000000000003', 'a1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', false, 'Betrag ist sehr hoch, Priorität unklar.',             '2026-02-27 15:00:00+00'),
    ('e0000000-0000-0000-0006-000000000004', 'a1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000004', true,  NULL,                                                 '2026-03-01 09:00:00+00'),

    -- Antrag 007 (sIT-Messe) – abgelehnt 1:2, eine Stimme ausstehend
    ('e0000000-0000-0000-0007-000000000001', 'a1000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', false, 'Kein direkter Lehrplanbezug erkennbar.',              '2026-03-24 08:00:00+00'),
    ('e0000000-0000-0000-0007-000000000002', 'a1000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', false, NULL,                                                 '2026-03-25 10:30:00+00'),
    ('e0000000-0000-0000-0007-000000000003', 'a1000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', true,  'Branchenkontakte für IT-Schüler sinnvoll.',          '2026-03-26 14:00:00+00'),

    -- Antrag 010 (Adobe CC) – abgelehnt 2:2, Stichentscheid durch Vorsitzenden (nein)
    ('e0000000-0000-0000-0010-000000000001', 'a1000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', false, 'Lizenzkosten sollten regulär im Schulbudget eingeplant werden.', '2026-03-08 09:00:00+00'),
    ('e0000000-0000-0000-0010-000000000002', 'a1000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', true,  'Für die Ausbildung in Mediengestaltung unerlässlich.','2026-03-08 11:00:00+00'),
    ('e0000000-0000-0000-0010-000000000003', 'a1000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', true,  NULL,                                                 '2026-03-09 10:00:00+00'),
    ('e0000000-0000-0000-0010-000000000004', 'a1000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000004', false, NULL,                                                 '2026-03-10 12:00:00+00');

