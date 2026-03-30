import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './db/supabase.js';

// Route imports
import aqiRouter from './routes/aqi.js';
import authRouter from './routes/auth.js';
import reportsRouter from './routes/reports.js';
import newsRouter from './routes/news.js';
import calculatorRouter from './routes/calculator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/aqi', aqiRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/news', newsRouter);
app.use('/api/calculator', calculatorRouter);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Delhi Air Quality Intelligence Platform    ║');
  console.log('║   Powered by Supabase + WAQI                ║');
  console.log(`║   Running at http://localhost:${PORT}            ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});

// ── Auto Data Cleanup Cron (12 hours) ──
const CLEANUP_INTERVAL = 12 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    const { error } = await supabase.rpc('cleanup_old_reports', { max_records: 1000 });
    if (error) {
      console.error('[Cron] Cleanup error:', error);
    } else {
      console.log('[Cron] Database auto-cleanup executed successfully.');
    }
  } catch (err) {
    console.error('[Cron] Cleanup exception:', err);
  }
}, CLEANUP_INTERVAL);

// Run once on startup
(async () => {
  try {
    const { error } = await supabase.rpc('cleanup_old_reports', { max_records: 1000 });
    if (error) console.error('[Init] Cleanup error:', error);
  } catch (err) {
    console.error('[Init] Cleanup exception:', err);
  }
})();
