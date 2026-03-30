import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import JSONDatabase from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', '..', 'database', 'delhi_air.json');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new JSONDatabase(dbPath);

console.log('[INIT] Setting up database...');

// ── Seed Government Account ──
const adminExists = db.prepare('SELECT id FROM gov_users WHERE username = ?').get('dpcc_admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('DelhiCleanAir@2024', 10);
  db.prepare('INSERT INTO gov_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
    'dpcc_admin', hash, 'Delhi Pollution Control Committee', 'administrator'
  );
  console.log('[INIT] Government admin created → dpcc_admin / DelhiCleanAir@2024');
} else {
  console.log('[INIT] Government admin already exists.');
}

// ── Seed Demo Citizen Account ──
const citizenExists = db.prepare('SELECT id FROM users WHERE username = ?').get('demo_citizen');
if (!citizenExists) {
  const hash = bcrypt.hashSync('citizen123', 10);
  db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)').run(
    'demo_citizen', hash, 'Aarav Sharma'
  );
  console.log('[INIT] Demo citizen created → demo_citizen / citizen123');
} else {
  console.log('[INIT] Demo citizen already exists.');
}

console.log('[INIT] Database ready.');
console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║          LOGIN CREDENTIALS                   ║');
console.log('╠══════════════════════════════════════════════╣');
console.log('║  Citizen:  demo_citizen / citizen123         ║');
console.log('║  Government: dpcc_admin / DelhiCleanAir@2024 ║');
console.log('╚══════════════════════════════════════════════╝');
