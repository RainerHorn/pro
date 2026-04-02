#!/usr/bin/env node
/**
 * Dieses Skript generiert bcrypt-Hashes für die Vorstandspasswörter.
 * Verwendung: node generate-passwords.js
 * 
 * Kopiere den Hash dann in die init.sql für das jeweilige Vorstandsmitglied.
 */

const bcrypt = require('bcrypt');

const passwords = [
  { username: 'rhorn',      password: 'Vorstand123!' },
  { username: 'ivater',     password: 'Vorstand123!' },
  { username: 'sziemdorff', password: 'Vorstand123!' },
  { username: 'jtuttas',    password: 'Vorstand123!' },
];

(async () => {
  for (const { username, password } of passwords) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${username}: ${hash}`);
  }
  console.log('\nSQL-Update-Befehle:');
  for (const { username, password } of passwords) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`UPDATE board_members SET password_hash='${hash}' WHERE username='${username}';`);
  }
})();
