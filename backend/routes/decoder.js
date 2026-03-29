import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let pdfParse;
try { pdfParse = require('pdf-parse'); } catch { pdfParse = null; }

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/analyze', upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No document provided.' });

  try {
    let textContent = '';

    if (req.file.mimetype === 'application/pdf') {
      if (!pdfParse) {
        return res.status(500).json({ error: 'PDF parsing library not available. Please upload a .txt file instead.' });
      }
      const data = await pdfParse(req.file.buffer);
      textContent = data.text;
    } else if (req.file.mimetype === 'text/plain') {
      textContent = req.file.buffer.toString('utf8');
    } else {
      return res.status(400).json({ error: 'Please upload a PDF or TXT file.' });
    }

    if (!textContent || textContent.trim() === '') {
      return res.status(400).json({ error: 'Document appears empty or contains only scanned images.' });
    }

    // ── Rule-based compliance analysis ──
    const t = textContent.toLowerCase();
    const wordCount = textContent.split(/\s+/).length;

    let isViolationFound = false;
    let legal = 'No specific regulatory violations identified from automated keyword analysis. Manual expert review recommended.';
    let health = 'No immediate health risk indicators detected in the document text.';
    let simple = 'Our automated scanner did not find obvious signs of pollution violations. This does not mean the document is clean — a human expert should verify.';

    // Check for PM violations
    if (t.includes('pm2.5') || t.includes('pm10') || t.includes('particulate')) {
      if (t.includes('exceed') || t.includes('violation') || t.includes('above limit') || t.includes('warning') || t.includes('non-compliance')) {
        isViolationFound = true;
        legal = 'Potential violation of Section 21 of the Air (Prevention and Control of Pollution) Act, 1981. Document references particulate matter levels exceeding permissible consent limits.';
        health = 'Elevated PM levels documented. Chronic exposure at indicated levels is associated with increased respiratory disease, cardiovascular events, and premature mortality in surrounding populations.';
        simple = 'This document shows the facility is releasing dust and fine particles above legally allowed limits. This directly harms people breathing nearby air.';
      }
    }

    // Check for equipment bypass / fraud
    if (t.includes('bypass') || t.includes('scrubber') || t.includes('shut off') || t.includes('disabled') || t.includes('night operation')) {
      isViolationFound = true;
      legal = 'Evidence of deliberate emission control bypass. Potential violation of Environment Protection Rules (Rule 14) and consent conditions under Air Act.';
      health = 'Unfiltered industrial emissions contain volatile organic compounds, sulfur dioxide, and heavy metals. Nearby populations face acute and chronic health risks.';
      simple = 'The document suggests pollution control equipment was intentionally turned off — likely to save costs — releasing toxic chemicals directly into the air.';
    }

    // Check for generic compliance issues
    if (!isViolationFound && (t.includes('penalty') || t.includes('illegal') || t.includes('unauthorized') || t.includes('harmful') || t.includes('contamination'))) {
      isViolationFound = true;
      legal = 'General regulatory non-compliance indicators found. The facility may be operating outside its consent-to-operate conditions.';
      health = 'Potential environmental contamination referenced. Health impact assessment recommended for affected communities.';
      simple = 'The document contains references to illegal activity or penalties related to environmental violations.';
    }

    res.json({
      status: 'ok',
      analysis: {
        legal,
        health,
        simple,
        wordCount,
        isViolationFound
      }
    });

  } catch (err) {
    console.error('Decoder error:', err);
    res.status(500).json({ error: 'Failed to analyze document.' });
  }
});

export default router;
