import { Decoder } from '../api/api.js';

export const DecoderPage = {
  render: () => `
    <div class="form-page">
      <div class="glass-panel">
        <h2 class="form-page-title">Data Decoder</h2>
        <p class="form-page-subtitle">
          Upload regulatory or environmental reports (PDF/TXT) to automatically scan for pollution violations, 
          legal non-compliance, and health risks. Our automated analysis highlights key findings.
        </p>

        <div class="upload-zone" id="decoder-dropzone" style="margin-bottom:20px;">
          <div class="upload-zone-icon">📄</div>
          <div class="upload-zone-text">Drop a PDF or TXT file here</div>
          <div class="upload-zone-hint">Max 5MB · Regulatory reports, compliance documents</div>
          <div id="file-name-display" style="margin-top:10px; font-weight:600; color:var(--text-primary);"></div>
        </div>
        <input type="file" id="decoder-file" accept=".pdf,.txt" style="display:none;">

        <button id="btn-analyze" class="btn btn-primary btn-lg" style="width:100%; display:none; margin-bottom:24px;">Analyze Document</button>

        <div id="decoder-output" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid var(--border);">
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin:0;">Analysis Results</h3>
            <span id="violation-badge" class="badge badge-success">No violations</span>
          </div>

          <div class="analysis-grid">
            <div class="analysis-card">
              <div class="analysis-card-label">⚖️ Legal Analysis</div>
              <div class="analysis-card-text" id="res-legal"></div>
            </div>
            <div class="analysis-card">
              <div class="analysis-card-label">🏥 Health Impact</div>
              <div class="analysis-card-text" id="res-health"></div>
            </div>
          </div>

          <div class="glass-panel-flat" style="margin-bottom:20px;">
            <div class="analysis-card-label" style="margin-bottom:10px;">📋 Citizen Summary</div>
            <div class="analysis-card-text" id="res-simple" style="line-height:1.6;"></div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <button id="btn-whistle" class="btn btn-danger" style="display:none;">
              🔔 Blow the Whistle
            </button>
            <div style="font-size:0.78rem; color:var(--text-muted);">
              Words analyzed: <strong id="res-words">0</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  init: () => {
    const dropzone = document.getElementById('decoder-dropzone');
    const fileInput = document.getElementById('decoder-file');
    const btnAnalyze = document.getElementById('btn-analyze');
    const fileNameDisplay = document.getElementById('file-name-display');
    const outputArea = document.getElementById('decoder-output');

    let currentFile = null;

    dropzone.onclick = () => fileInput.click();

    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--accent)';
      dropzone.style.background = 'var(--accent-soft)';
    };

    dropzone.ondragleave = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
    };

    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
      if (e.dataTransfer.files?.length > 0) handleFile(e.dataTransfer.files[0]);
    };

    fileInput.onchange = (e) => {
      if (e.target.files?.length > 0) handleFile(e.target.files[0]);
    };

    function handleFile(file) {
      if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
        return window.showToast('Please upload a PDF or TXT file.', 'error');
      }
      if (file.size > 5 * 1024 * 1024) {
        return window.showToast('File too large. Max 5MB.', 'error');
      }
      currentFile = file;
      fileNameDisplay.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      btnAnalyze.style.display = 'block';
      outputArea.style.display = 'none';

      setTimeout(() => btnAnalyze.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }

    btnAnalyze.onclick = async () => {
      if (!currentFile) return;

      btnAnalyze.textContent = 'Analyzing...';
      btnAnalyze.disabled = true;

      try {
        const formData = new FormData();
        formData.append('document', currentFile);

        const response = await Decoder.analyze(formData);
        const data = response.analysis;

        document.getElementById('res-legal').textContent = data.legal;
        document.getElementById('res-health').textContent = data.health;
        document.getElementById('res-simple').textContent = data.simple;
        document.getElementById('res-words').textContent = data.wordCount;

        const badge = document.getElementById('violation-badge');
        if (data.isViolationFound) {
          badge.textContent = 'Violation Detected';
          badge.className = 'badge badge-danger';
        } else {
          badge.textContent = 'No Violations';
          badge.className = 'badge badge-success';
        }

        outputArea.style.display = 'block';
        outputArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Whistle button
        const btnWhistle = document.getElementById('btn-whistle');
        if (data.isViolationFound) {
          btnWhistle.style.display = 'inline-flex';
          btnWhistle.onclick = () => {
            if (confirm('This will open your email client to send this analysis to press contacts. Proceed?')) {
              const body = encodeURIComponent(
                `Environmental Violation Report\n\n` +
                `Legal Analysis:\n${data.legal}\n\n` +
                `Health Risks:\n${data.health}\n\n` +
                `Summary:\n${data.simple}\n\n` +
                `Please investigate these findings.`
              );
              window.location.href = `mailto:editor@ndtv.com,investigations@thehindu.co.in?subject=Environmental Violation Report — Delhi&body=${body}`;
              window.showToast('Email client opened.', 'success');
            }
          };
        } else {
          btnWhistle.style.display = 'none';
        }

        window.showToast('Analysis complete.', 'success');
      } catch (err) {
        window.showToast(err.message || 'Analysis failed.', 'error');
      } finally {
        btnAnalyze.textContent = 'Analyze Again';
        btnAnalyze.disabled = false;
      }
    };
  }
};
