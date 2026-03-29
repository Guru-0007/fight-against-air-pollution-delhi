import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import JSONDatabase from '../db/db.js';
import { authenticateUser, authorizeGov } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'database', 'delhi_air.json');
const db = new JSONDatabase(dbPath);

// Valid status values
const VALID_STATUSES = ['pending', 'under_review', 'action_in_progress', 'resolved', 'valid', 'fake'];

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Submit Report (authenticated citizen) ──
router.post('/', authenticateUser, upload.single('image'), (req, res) => {
  if (req.user.is_banned) {
    return res.status(403).json({ error: 'Your account has been suspended.' });
  }

  const { title, description, location_text, lat, lng, category } = req.body;
  if (!title || !description || !location_text || !category) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const image_path = req.file ? `/uploads/${req.file.filename}` : null;
  const id = crypto.randomUUID();

  try {
    db.prepare('INSERT INTO reports (id, user_id, title, description, location_text, lat, lng, category, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, req.user.id, title, description, location_text,
      lat || 28.6139, lng || 77.2090, category, image_path
    );

    // Update report count
    db.prepare('UPDATE users SET report_count = report_count + 1 WHERE id = ?').run(req.user.id);

    // Auto-verify after 5 reports
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (user && user.report_count >= 5) {
      db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(req.user.id);
    }

    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('Report submit error:', err);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

// ── Get Reports ──
router.get('/', (req, res) => {
  const { status } = req.query;
  try {
    let reports;
    if (status) {
      reports = db.prepare('SELECT r.*, u.display_name, u.is_verified, u.is_banned FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.status = ? ORDER BY r.created_at DESC').all(status);
    } else {
      reports = db.prepare('SELECT r.*, u.display_name, u.is_verified, u.is_banned FROM reports r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC').all();
    }
    res.json(reports);
  } catch (err) {
    console.error('Reports fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// ── Get My Reports (authenticated user) ──
router.get('/my-reports', authenticateUser, (req, res) => {
  try {
    const allReports = db.data.reports
      .filter(r => String(r.user_id) === String(req.user.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(r => ({
        ...r,
        status_updated_at: r.status_updated_at || r.created_at
      }));
    res.json(allReports);
  } catch (err) {
    console.error('My reports error:', err);
    res.status(500).json({ error: 'Failed to fetch your reports.' });
  }
});

// ── Leaderboard ──
router.get('/leaderboard', (req, res) => {
  try {
    const users = db.data.users
      .filter(u => !u.is_banned)
      .map(u => {
        const validReports = db.data.reports.filter(r => String(r.user_id) === String(u.id) && (r.status === 'valid' || r.status === 'resolved')).length;
        return {
          username: u.username,
          display_name: u.display_name,
          report_count: validReports,
          is_verified: validReports >= 5 ? 1 : (u.is_verified || 0)
        };
      })
      .filter(u => u.report_count > 0)
      .sort((a, b) => b.report_count - a.report_count)
      .slice(0, 10);

    res.json(users);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

// ── Update Report Status (Gov only) ──
router.patch('/:id/status', authorizeGov, (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    // Update status and track timestamp
    const report = db.data.reports.find(r => String(r.id) === String(req.params.id));
    if (report) {
      report.status = status;
      report.status_updated_at = new Date().toISOString();
      db._write();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

// ── Ban User (Gov only) ──
router.post('/ban-user/:id', authorizeGov, (req, res) => {
  try {
    db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(1, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to ban user.' });
  }
});

// ── Unban User (Gov only) ──
router.post('/unban-user/:id', authorizeGov, (req, res) => {
  try {
    db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(0, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unban user.' });
  }
});

export default router;
