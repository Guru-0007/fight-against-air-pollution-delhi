import { Reports } from '../api/api.js';
import { getUser, getToken } from '../utils.js';

export const ReportPage = {
  render: () => {
    const user = getUser();
    if (!user || user.type === 'gov') {
      return `
        <div class="form-page">
          <div class="glass-panel" style="text-align:center; padding:48px;">
            <div style="font-size:2.5rem; margin-bottom:12px; opacity:0.3">🔒</div>
            <h3 style="color:var(--text-primary); margin-bottom:8px;">Sign in Required</h3>
            <p style="color:var(--text-muted); margin-bottom:20px;">You need to be signed in as a citizen to submit pollution reports.</p>
            <a href="#/login" class="btn btn-primary">Sign In</a>
          </div>
        </div>
      `;
    }

    return `
      <div class="form-page">
        <div class="glass-panel">
          <h2 class="form-page-title">Submit Pollution Report</h2>
          <p class="form-page-subtitle">Help improve Delhi's air quality by reporting pollution incidents in your area. Verified reports are forwarded to DPCC for action.</p>

          <form id="report-form" onsubmit="return false;">
            <div class="form-group">
              <label class="form-label">Incident Title</label>
              <input type="text" id="rep-title" class="form-input" placeholder="e.g., Illegal waste burning near market" required>
            </div>

            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="rep-category" class="form-select" required>
                <option value="" disabled selected>Select type of pollution</option>
                <option value="industrial">Industrial Exhaust</option>
                <option value="construction">Construction Dust</option>
                <option value="waste">Waste Burning</option>
                <option value="vehicular">Heavy Vehicular Emission</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea id="rep-desc" class="form-textarea" placeholder="Describe what you observed, including time and severity..." rows="4" required></textarea>
            </div>

            <div class="form-group" style="display:flex; gap:10px;">
              <div style="flex:1;">
                <label class="form-label">Location</label>
                <input type="text" id="rep-loc" class="form-input" placeholder="Area name or pincode" required style="margin-bottom:0;">
              </div>
              <div style="align-self:flex-end;">
                <button type="button" id="btn-gps" class="btn btn-secondary" style="height:46px;">📍 GPS</button>
              </div>
            </div>

            <input type="hidden" id="rep-lat">
            <input type="hidden" id="rep-lng">

            <div class="form-group">
              <label class="form-label">Photo Evidence (optional)</label>
              <div class="upload-zone" id="upload-zone">
                <div class="upload-zone-icon">📷</div>
                <div class="upload-zone-text">Click to upload photo</div>
                <div class="upload-zone-hint">Max 5MB · JPG, PNG</div>
                <input type="file" id="rep-file" accept="image/*" style="display:none;">
                <img id="img-preview" style="max-width:100%; margin-top:12px; border-radius:var(--radius-sm); display:none;">
              </div>
            </div>

            <button type="submit" id="btn-submit" class="btn btn-primary btn-lg" style="width:100%;">Submit Report</button>
          </form>
        </div>
      </div>
    `;
  },

  init: () => {
    const user = getUser();
    if (!user || user.type === 'gov') return;

    // GPS
    document.getElementById('btn-gps').onclick = () => {
      const btn = document.getElementById('btn-gps');
      btn.textContent = '⏳';
      navigator.geolocation.getCurrentPosition(
        pos => {
          document.getElementById('rep-lat').value = pos.coords.latitude;
          document.getElementById('rep-lng').value = pos.coords.longitude;
          document.getElementById('rep-loc').value = `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
          btn.textContent = '✓ Located';
          btn.classList.add('btn-success');
        },
        () => {
          window.showToast('GPS not available', 'error');
          btn.textContent = '📍 GPS';
        }
      );
    };

    // File upload
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('rep-file');
    const preview = document.getElementById('img-preview');

    zone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          preview.src = re.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    };

    // Submit
    document.getElementById('report-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit');
      btn.textContent = 'Submitting...';
      btn.disabled = true;

      try {
        const formData = new FormData();
        formData.append('title', document.getElementById('rep-title').value);
        formData.append('category', document.getElementById('rep-category').value);
        formData.append('description', document.getElementById('rep-desc').value);
        formData.append('location_text', document.getElementById('rep-loc').value);
        formData.append('lat', document.getElementById('rep-lat').value || '28.6139');
        formData.append('lng', document.getElementById('rep-lng').value || '77.2090');

        const file = document.getElementById('rep-file').files[0];
        if (file) formData.append('image', file);

        await Reports.submit(formData);
        
        const formPanel = document.querySelector('.glass-panel');
        if (formPanel) {
          formPanel.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; animation: reportSuccess 0.6s ease-out forwards;">
              <div style="font-size: 4rem; margin-bottom: 20px; animation: bounceIn 0.8s ease-out forwards;">🌱</div>
              <h2 style="color:var(--text-primary); margin-bottom: 12px;">Thank You!</h2>
              <p style="color:var(--text-secondary); font-size:1.1rem;">You contributed to a cleaner city.</p>
            </div>
          `;
        }

        window.showToast('Report submitted successfully!', 'success');
        setTimeout(() => window.location.hash = '#/community', 2500);
      } catch (err) {
        window.showToast(err.message, 'error');
        btn.textContent = 'Submit Report';
        btn.disabled = false;
      }
    };
  }
};
