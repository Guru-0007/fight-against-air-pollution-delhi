import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/aqi', aqiRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/news', newsRouter);
app.use('/api/calculator', calculatorRouter);

// Serve uploads and frontend static files
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Delhi Air Quality Intelligence Platform    ║');
  console.log(`║   Running at http://localhost:${PORT}            ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});
