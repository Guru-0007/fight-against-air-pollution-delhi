import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import JSONDatabase from '../db/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'database', 'delhi_air.json');
const db = new JSONDatabase(dbPath);

const JWT_SECRET = process.env.JWT_SECRET || 'delhi-air-quality-secret-2024';

// ── Register new citizen ──
router.post('/register', (req, res) => {
  const { username, password, display_name } = req.body;

  if (!username || !password || !display_name) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)').run(
      username.toLowerCase().trim(), hash, display_name.trim()
    );

    res.status(201).json({ success: true, id: info.lastInsertRowid, username, display_name });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username already taken.' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// ── Citizen Login ──
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

  if (user.is_banned) {
    return res.status(403).json({ error: 'Account suspended. Contact support.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });

  const token = jwt.sign({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    type: 'user',
    is_verified: user.is_verified,
    is_banned: user.is_banned
  }, JWT_SECRET, { expiresIn: '24h' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      type: 'user',
      is_verified: user.is_verified
    }
  });
});

// ── Government Login ──
router.post('/gov-login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Credentials required.' });
  }

  const user = db.prepare('SELECT * FROM gov_users WHERE username = ?').get(username.trim());
  if (!user) return res.status(401).json({ error: 'Invalid government credentials.' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid government credentials.' });

  const token = jwt.sign({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    type: 'gov'
  }, JWT_SECRET, { expiresIn: '12h' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      display_name: user.name,
      role: user.role,
      type: 'gov'
    }
  });
});

// ── Validate Token ──
router.get('/validate', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ valid: false });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

export default router;
