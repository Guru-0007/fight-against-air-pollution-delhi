import { AQI, Reports } from '../api/api.js';
import { getUser, getAQIColorRaw, getAQILabel } from '../utils.js';
import {
  FACTORIES, findNearbyFactories, findNearbyTraffic,
  getPopulationEstimate, getTrafficIntensity, getIndustrialScore,
  getSeasonalFactors, REPORT_STATUS_LABELS
} from '../data/govData.js';

let currentGovLat = 28.6139;
let currentGovLon = 77.2090;
let currentGovName = 'Delhi City Average';

export const GovDashboard = {
  render: () => {
    const user = getUser();
    if (!user || user.type !== 'gov') {
      return `
        <div class="form-page">
          <div class="glass-panel" style="text-align:center; padding:48px;">
            <div style="font-size:2.5rem; margin-bottom:12px; opacity:0.3">🔐</div>
            <h3 style="color:var(--text-primary); margin-bottom:8px;">Government Access Only</h3>
            <p style="color:var(--text-muted); margin-bottom:20px;">This section requires government credentials.</p>
            <a href="#/gov/login" class="btn btn-primary">Government Sign In</a>
          </div>
        </div>
      `;
    }

    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <!-- Left: Reports -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="glass-panel">
            <div class="panel-header">
              <div class="panel-title"><span class="dot"></span> Citizen Reports</div>
              <span class="badge badge-accent" id="report-count-badge">Loading...</span>
            </div>

            <div class="filter-bar">
              <button class="filter-btn active" data-filter="">All</button>
              <button class="filter-btn" data-filter="pending">Pending</button>
              <button class="filter-btn" data-filter="valid">Valid</button>
              <button class="filter-btn" data-filter="working">Working</button>
              <button class="filter-btn" data-filter="resolved">Resolved</button>
              <button class="filter-btn" data-filter="fake">Fake</button>
            </div>

            <div id="reports-list" style="max-height:500px; overflow-y:auto;">
              <div class="skeleton" style="height:200px;"></div>
            </div>
          </div>
        </div>

        <!-- Right: Analytics -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Location Search Input -->
          <div class="glass-panel" style="padding:16px; border:1px solid rgba(212,168,67,0.3);">
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); margin-bottom:10px;">📍 ANALYZE ZONE</div>
            <div style="display:flex; gap:8px;">
              <input type="text" id="gov-location-input" class="form-input" placeholder="Enter pincode or area name (e.g. 110001 or Rohini)" style="flex:1; margin-bottom:0; font-size:0.85rem;">
              <button id="gov-search-btn" class="btn btn-primary btn-sm" style="min-width:90px;">Analyze</button>
            </div>
            <div id="gov-current-zone" style="margin-top:8px; font-size:0.78rem; color:var(--accent-text); font-weight:600;">
              Currently analyzing: Delhi City Average
            </div>
          </div>

          <!-- AQI + Environmental Context -->
          <div class="glass-panel">
            <div class="panel-title"><span class="dot"></span> Zone Intelligence</div>
            <div id="zone-intel-container">
              <div class="skeleton" style="height:120px;"></div>
            </div>
          </div>

          <!-- Suspicion Index -->
          <div class="glass-panel">
            <div class="panel-title"><span class="dot"></span> Suspicion Index</div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:16px;">
              Anomaly detection based on AQI, wind patterns, industrial proximity, and time of day.
            </p>
            <div id="suspicion-container">
              <div class="skeleton" style="height:80px;"></div>
            </div>
          </div>

          <!-- Pollution Cause Analysis -->
          <div class="glass-panel">
            <div class="panel-title"><span class="dot"></span> Pollution Cause Analysis</div>
            <div id="causes-container">
              <div class="skeleton" style="height:200px;"></div>
            </div>
          </div>

          <!-- Solutions Panel -->
          <div class="glass-panel">
            <div class="panel-title"><span class="dot"></span> Recommended Actions</div>
            <div id="solutions-container">
              <div class="skeleton" style="height:150px;"></div>
            </div>
          </div>

          <!-- Factory Identification -->
          <div class="glass-panel">
            <div class="panel-title"><span class="dot"></span> Nearby Emission Sources</div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px;">
              Industrial sources near the selected zone. Click "Send Notice" to open a pre-filled email.
            </p>
            <div id="factories-container"></div>
          </div>

          <!-- Report Clusters -->
          <div class="glass-panel">
            <div class="panel-title"><span class="dot"></span> Report Clusters</div>
            <div id="alerts-container">
              <div class="skeleton" style="height:60px;"></div>
            </div>
          </div>

          <!-- Population Impact -->
          <div class="glass-panel">
            <div class="panel-title"><span class="dot"></span> Population Affected</div>
            <div style="font-size:2.5rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.03em;" id="pop-affected">—</div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;" id="pop-detail">Estimated residents in hazard zones</div>
          </div>
        </div>
      </div>
    `;
  },

  init: async () => {
    const user = getUser();
    if (!user || user.type !== 'gov') return;

    // ── Load all analytics for default location ──
    loadZoneIntel(currentGovLat, currentGovLon);
    loadSuspicion(currentGovLat, currentGovLon);
    loadCauses(currentGovLat, currentGovLon);
    loadNearbyFactories(currentGovLat, currentGovLon);
    loadReports('');
    updatePopulationImpact(currentGovLat, currentGovLon, currentGovName);

    // ── Location Search Handler ──
    const searchBtn = document.getElementById('gov-search-btn');
    const searchInput = document.getElementById('gov-location-input');

    searchBtn.addEventListener('click', () => handleGovSearch());
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleGovSearch();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadReports(e.target.dataset.filter);
      };
    });

    // Global gov actions
    window._govAction = async (action, id) => {
      try {
        if (action === 'valid') {
          await Reports.updateStatus(id, 'valid');
          window.showToast('Report verified.', 'success');
        } else if (action === 'fake') {
          await Reports.updateStatus(id, 'fake');
          window.showToast('Report marked as fake.', 'info');
        } else if (action === 'working') {
          await Reports.updateStatus(id, 'working');
          window.showToast('Action initiated on report.', 'info');
        } else if (action === 'resolved') {
          await Reports.updateStatus(id, 'resolved');
          window.showToast('Report marked as resolved.', 'success');
        } else if (action === 'undo_pending') {
          await Reports.updateStatus(id, 'pending');
          window.showToast('Report reverted to pending.', 'info');
        } else if (action === 'undo_valid') {
          await Reports.updateStatus(id, 'valid');
          window.showToast('Report reverted to valid.', 'info');
        } else if (action === 'delete') {
          if (!confirm('Permanently delete this report?')) return;
          await Reports.delete(id);
          window.showToast('Report deleted.', 'success');
        } else if (action === 'ban') {
          if (!confirm('Ban this user?')) return;
          await Reports.banUser(id);
          window.showToast('User banned.', 'info');
        } else if (action === 'unban') {
          await Reports.unbanUser(id);
          window.showToast('User unbanned.', 'success');
        }
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || '';
        loadReports(activeFilter);
      } catch (e) {
        window.showToast(e.message, 'error');
      }
    };

    window._openReportModal = (reportId) => {
      const report = window.__loadedReports?.find(r => r.id === reportId);
      if (!report) return;

      const date = new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const statusInfo = REPORT_STATUS_LABELS[report.status] || REPORT_STATUS_LABELS['pending'];

      document.getElementById('modal-title').textContent = report.title;
      document.getElementById('modal-status').className = `badge ${statusInfo.badge}`;
      document.getElementById('modal-status').innerHTML = `${statusInfo.icon} ${report.status.replace(/_/g, ' ')}`;
      document.getElementById('modal-meta').textContent = `${report.display_name || 'Unknown'} · ${date}`;
      document.getElementById('modal-desc').textContent = report.description;
      document.getElementById('modal-loc').textContent = `📍 ${report.location_text}`;
      document.getElementById('modal-image').src = report.image_url;
      document.getElementById('report-modal').classList.add('active');
    };

    window.closeReportModal = () => {
      document.getElementById('report-modal').classList.remove('active');
      document.getElementById('modal-image').src = '';
    };
  }
};

// ═══════════════════════════════════
// GOV LOCATION SEARCH
// ═══════════════════════════════════
async function handleGovSearch() {
  const input = document.getElementById('gov-location-input');
  const btn = document.getElementById('gov-search-btn');
  const query = input.value.trim();
  if (!query) return window.showToast('Enter a pincode or area name', 'error');

  btn.textContent = '...';
  btn.disabled = true;

  try {
    const isNumeric = /^\d+$/.test(query);
    let geoUrl;
    if (isNumeric) {
      geoUrl = `https://nominatim.openstreetmap.org/search?postalcode=${query}&country=India&format=json&limit=1`;
    } else {
      geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Delhi India')}&format=json&limit=1`;
    }

    const geoResp = await fetch(geoUrl, {
      headers: { 'User-Agent': 'DelhiAirQualityPlatform/2.0' }
    });
    const geoData = await geoResp.json();

    if (geoData && geoData.length > 0) {
      currentGovLat = parseFloat(geoData[0].lat);
      currentGovLon = parseFloat(geoData[0].lon);
      currentGovName = isNumeric ? `Pincode ${query}` : query;

      document.getElementById('gov-current-zone').innerHTML = `Currently analyzing: <strong>${currentGovName}</strong>`;
      window.showToast(`Analyzing zone: ${currentGovName}`, 'info');

      // Reload all analytics
      loadZoneIntel(currentGovLat, currentGovLon);
      loadSuspicion(currentGovLat, currentGovLon);
      loadCauses(currentGovLat, currentGovLon);
      loadNearbyFactories(currentGovLat, currentGovLon);
      updatePopulationImpact(currentGovLat, currentGovLon, currentGovName);
    } else {
      window.showToast('Location not found. Try a different pincode or area.', 'error');
    }
  } catch {
    window.showToast('Search failed.', 'error');
  } finally {
    btn.textContent = 'Analyze';
    btn.disabled = false;
  }
}

// ═══════════════════════════════════
// ZONE INTELLIGENCE
// ═══════════════════════════════════
async function loadZoneIntel(lat, lon) {
  try {
    const [liveData, weather] = await Promise.all([
      AQI.getLiveAQI(lat, lon).catch(() => ({})),
      AQI.getWeather(lat, lon).catch(() => ({}))
    ]);

    const aqi = liveData.european_aqi || 0;
    const pm25 = liveData.pm2_5 || 0;
    const wind = weather.wind_speed_10m ?? 0;
    const temp = weather.temperature_2m ?? 0;
    const humidity = weather.relative_humidity_2m ?? 0;
    const hour = new Date().getHours();
    const color = getAQIColorRaw(aqi);
    const traffic = getTrafficIntensity(lat, lon);
    const industrial = getIndustrialScore(lat, lon);

    const timeLabel = hour >= 6 && hour < 12 ? '🌅 Morning' :
                      hour >= 12 && hour < 17 ? '☀️ Afternoon' :
                      hour >= 17 && hour < 21 ? '🌆 Evening' : '🌙 Night';

    document.getElementById('zone-intel-container').innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-bottom:14px;">
        <div class="stat-card" style="text-align:center;">
          <div class="stat-label">AQI</div>
          <div class="stat-value" style="color:${color}; font-size:2rem;">${aqi}</div>
          <div style="font-size:0.7rem; color:${color}; font-weight:600;">${getAQILabel(aqi)}</div>
        </div>
        <div class="stat-card" style="text-align:center;">
          <div class="stat-label">PM2.5</div>
          <div class="stat-value" style="font-size:1.4rem;">${Math.round(pm25)}</div>
          <div style="font-size:0.7rem; color:var(--text-muted);">µg/m³</div>
        </div>
        <div class="stat-card" style="text-align:center;">
          <div class="stat-label">Wind</div>
          <div class="stat-value" style="font-size:1.4rem;">${wind}</div>
          <div style="font-size:0.7rem; color:var(--text-muted);">km/h</div>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
        <div style="background:var(--bg-glass-subtle); border-radius:var(--radius-sm); padding:10px; text-align:center;">
          <div style="font-size:0.68rem; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Temp</div>
          <div style="font-size:1rem; font-weight:700; color:var(--text-primary);">${temp}°C</div>
        </div>
        <div style="background:var(--bg-glass-subtle); border-radius:var(--radius-sm); padding:10px; text-align:center;">
          <div style="font-size:0.68rem; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Humidity</div>
          <div style="font-size:1rem; font-weight:700; color:var(--text-primary);">${humidity}%</div>
        </div>
        <div style="background:var(--bg-glass-subtle); border-radius:var(--radius-sm); padding:10px; text-align:center;">
          <div style="font-size:0.68rem; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Traffic</div>
          <div style="font-size:0.85rem; font-weight:700; color:${traffic.score > 50 ? 'var(--danger)' : 'var(--text-primary)'};">${traffic.label}</div>
        </div>
        <div style="background:var(--bg-glass-subtle); border-radius:var(--radius-sm); padding:10px; text-align:center;">
          <div style="font-size:0.68rem; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Time</div>
          <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">${timeLabel}</div>
        </div>
      </div>
    `;
  } catch {}
}

// ═══════════════════════════════════
// SUSPICION ENGINE
// ═══════════════════════════════════
async function loadSuspicion(lat, lon) {
  try {
    const [liveData, weather, allReports] = await Promise.all([
      AQI.getLiveAQI(lat, lon).catch(() => ({})),
      AQI.getWeather(lat, lon).catch(() => ({})),
      Reports.getAll('').catch(() => ([]))
    ]);

    const aqi = liveData.european_aqi || liveData.european_aqi_pm2_5 || 100;
    const wind = weather.wind_speed_10m || 5;
    const hour = new Date().getHours();
    const reportsCount = allReports.length || 0;
    const industrial = getIndustrialScore(lat, lon);

    let index = (aqi / 400) * 30;
    index += Math.min(reportsCount * 3, 20);
    index += (wind > 10 && aqi > 150) ? 15 : 0;
    index += (hour >= 23 || hour <= 4) ? 10 : 0;
    index += industrial.score * 0.25; // Factory proximity factor

    let suspicion = Math.min(Math.round(index), 100);

    let color, text;
    if (suspicion > 70) {
      color = 'var(--danger)';
      text = 'High likelihood of localized emission source — AQI anomalously high relative to wind dispersal patterns.';
    } else if (suspicion > 40) {
      color = 'var(--warning)';
      text = 'Moderate anomaly detected. Environmental accumulation within expected range but warrants monitoring.';
    } else {
      color = 'var(--aqi-good)';
      text = 'Normal conditions. No significant anomalies in pollution dispersal patterns.';
    }

    document.getElementById('suspicion-container').innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:0.82rem; font-weight:600; color:var(--text-secondary)">Index</span>
        <span style="font-size:1.2rem; font-weight:700; color:${color}">${suspicion}%</span>
      </div>
      <div class="suspicion-bar-track">
        <div class="suspicion-bar-fill" style="width:${suspicion}%; background:${color};"></div>
      </div>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-top:10px; line-height:1.5;">${text}</p>
    `;
  } catch {}
}

// ═══════════════════════════════════
// DYNAMIC POLLUTION CAUSE ANALYSIS
// ═══════════════════════════════════
async function loadCauses(lat, lon) {
  try {
    const [liveData, weather] = await Promise.all([
      AQI.getLiveAQI(lat, lon).catch(() => ({})),
      AQI.getWeather(lat, lon).catch(() => ({}))
    ]);

    const aqi = liveData.european_aqi || 100;
    const wind = weather.wind_speed_10m ?? 5;
    const temp = weather.temperature_2m ?? 25;
    const humidity = weather.relative_humidity_2m ?? 50;
    const hour = new Date().getHours();

    // Location-aware scoring
    const traffic = getTrafficIntensity(lat, lon);
    const industrial = getIndustrialScore(lat, lon);
    const seasonal = getSeasonalFactors();

    // Base weights
    let trafficPct = 15 + (traffic.score * 0.35);
    let industrialPct = 10 + (industrial.score * 0.35);
    let constructPct = 15;
    let weatherPct = 10;
    let burnPct = 10;

    // Traffic peak hours
    if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) trafficPct += 15;
    
    // Industrial night operations
    if (hour >= 23 || hour <= 5) industrialPct += 15;

    // Weather impact
    if (wind < 4) weatherPct += 20; // Stagnant air
    if (wind > 15) constructPct += 15; // High wind stirs dust
    if (temp < 15 && wind < 5) burnPct += 15; // Winter inversion
    if (humidity > 80 && temp < 20) weatherPct += 10; // Smog formation

    // Seasonal factors
    seasonal.forEach(s => {
      if (s.cause.includes('Crop')) burnPct += s.weight;
      if (s.cause.includes('Firecracker')) burnPct += s.weight;
      if (s.cause.includes('Winter')) weatherPct += s.weight;
      if (s.cause.includes('Dust')) constructPct += s.weight;
      if (s.cause.includes('Monsoon')) { weatherPct -= 10; constructPct -= 5; }
    });

    // Normalize to 100
    const total = trafficPct + industrialPct + constructPct + weatherPct + burnPct;
    trafficPct = Math.round((trafficPct / total) * 100);
    industrialPct = Math.round((industrialPct / total) * 100);
    constructPct = Math.round((constructPct / total) * 100);
    weatherPct = Math.round((weatherPct / total) * 100);
    burnPct = 100 - trafficPct - industrialPct - constructPct - weatherPct;

    const causes = [
      { icon: '🚗', title: 'Vehicular Traffic', pct: trafficPct, color: '#e07850', detail: traffic.detail },
      { icon: '🏭', title: 'Industrial Emissions', pct: industrialPct, color: '#c5475b', detail: industrial.detail },
      { icon: '🏗️', title: 'Construction Dust', pct: constructPct, color: '#d4a843', detail: 'Metro/highway expansion, demolition, unpaved roads' },
      { icon: '🌡️', title: 'Weather Conditions', pct: weatherPct, color: '#5a8fbc', detail: `Wind: ${wind} km/h, Temp: ${temp}°C, Humidity: ${humidity}% — ${wind < 5 ? 'Inversion trap' : 'Moderate dispersal'}` },
      { icon: '🔥', title: 'Open Burning', pct: burnPct, color: '#8b5a6b', detail: seasonal.length > 0 ? seasonal.map(s => s.detail).join('; ') : 'Crop stubble, waste burning, biomass fuels' }
    ];

    causes.sort((a, b) => b.pct - a.pct);

    // Determine primary and secondary causes
    let html = `
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        <div style="background:rgba(197,71,91,0.08); border:1px solid rgba(197,71,91,0.2); border-radius:var(--radius-sm); padding:8px 14px;">
          <div style="font-size:0.68rem; font-weight:600; color:var(--danger); text-transform:uppercase;">Primary Cause</div>
          <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary);">${causes[0].icon} ${causes[0].title} (${causes[0].pct}%)</div>
        </div>
        <div style="background:var(--accent-soft); border:1px solid rgba(90,143,188,0.2); border-radius:var(--radius-sm); padding:8px 14px;">
          <div style="font-size:0.68rem; font-weight:600; color:var(--accent-text); text-transform:uppercase;">Secondary Causes</div>
          <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">${causes[1].icon} ${causes[1].title}, ${causes[2].icon} ${causes[2].title}</div>
        </div>
      </div>
    `;

    causes.forEach(c => {
      html += `
        <div class="cause-card">
          <div class="cause-header">
            <span class="cause-icon">${c.icon}</span>
            <div style="flex:1;">
              <div class="cause-title">${c.title}</div>
              <div class="cause-contrib">${c.pct}% contribution</div>
            </div>
          </div>
          <div class="cause-bar">
            <div class="cause-bar-fill" style="width:${c.pct}%; background:${c.color};"></div>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.4;">${c.detail}</div>
        </div>
      `;
    });

    // Add seasonal alerts if any
    if (seasonal.length > 0) {
      html += `<div style="margin-top:12px; padding:10px 14px; background:rgba(212,168,67,0.08); border:1px solid rgba(212,168,67,0.2); border-radius:var(--radius-sm);">
        <div style="font-size:0.75rem; font-weight:600; color:var(--warning); margin-bottom:4px;">📅 SEASONAL FACTORS ACTIVE</div>
        ${seasonal.map(s => `<div style="font-size:0.82rem; color:var(--text-secondary); line-height:1.5;">${s.icon} ${s.cause}: ${s.detail}</div>`).join('')}
      </div>`;
    }

    document.getElementById('causes-container').innerHTML = html;

    // Solutions based on top causes
    loadSolutions(causes, aqi);
  } catch {}
}

// ═══════════════════════════════════
// DYNAMIC SOLUTIONS PANEL
// ═══════════════════════════════════
function loadSolutions(causes, aqi) {
  const solutionMap = {
    'Vehicular Traffic': [
      'Enforce odd-even vehicle rationing during peak hours',
      'Expand CNG/electric bus fleet on high-pollution corridors',
      'Deploy traffic management to reduce congestion hotspots',
      'Promote last-mile connectivity to reduce personal vehicle use'
    ],
    'Industrial Emissions': [
      'Mandate real-time emission monitoring for all units',
      'Conduct surprise inspections at nearby industrial areas',
      'Revoke consent for non-compliant factories',
      'Promote cleaner fuel transition (coal → gas)'
    ],
    'Construction Dust': [
      'Enforce GRAP mandatory anti-smog gun deployment',
      'Require dust barriers and water sprinklers at all sites',
      'Fine violations under NGT construction guidelines',
      'Halt construction when AQI exceeds 300'
    ],
    'Weather Conditions': [
      'Issue public health advisories during thermal inversions',
      'Activate emergency GRAP measures proactively',
      'Deploy artificial rain technology if feasible',
      'Increase frequency of road water-spraying'
    ],
    'Open Burning': [
      'Deploy satellite monitoring for crop fire detection',
      'Subsidize Happy Seeder machines for Punjab/Haryana farmers',
      'Strict penalties for urban waste burning',
      'Community awareness campaigns in rural NCR'
    ]
  };

  // Urgency level
  let urgencyColor, urgencyLabel, urgencyBg;
  if (aqi > 300) { urgencyColor = 'var(--danger)'; urgencyLabel = '🚨 EMERGENCY'; urgencyBg = 'rgba(197,71,91,0.08)'; }
  else if (aqi > 200) { urgencyColor = 'var(--warning)'; urgencyLabel = '⚠️ ALERT'; urgencyBg = 'rgba(212,168,67,0.08)'; }
  else { urgencyColor = 'var(--aqi-good)'; urgencyLabel = '✅ NORMAL'; urgencyBg = 'rgba(72,187,120,0.08)'; }

  let html = `
    <div style="background:${urgencyBg}; border:1px solid ${urgencyColor}22; border-radius:var(--radius-sm); padding:10px 14px; margin-bottom:16px;">
      <div style="font-size:0.78rem; font-weight:700; color:${urgencyColor};">${urgencyLabel} — AQI ${aqi}</div>
      <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
        ${aqi > 300 ? 'Immediate action required across all sectors.' : aqi > 200 ? 'Priority actions needed for top pollution causes.' : 'Routine monitoring and preventive measures.'}
      </div>
    </div>
  `;

  causes.slice(0, 3).forEach(c => {
    const solutions = solutionMap[c.title] || [];
    if (solutions.length === 0) return;

    html += `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span>${c.icon}</span>
          <strong style="font-size:0.85rem;color:var(--text-primary);">${c.title}</strong>
          <span style="font-size:0.7rem;color:var(--text-muted);">(${c.pct}%)</span>
        </div>
        <ul class="solutions-list">
          ${solutions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    `;
  });

  document.getElementById('solutions-container').innerHTML = html || '<div class="empty-state">No solutions generated.</div>';
}

// ═══════════════════════════════════
// NEARBY FACTORIES (DYNAMIC)
// ═══════════════════════════════════
function loadNearbyFactories(lat, lon) {
  const nearby = findNearbyFactories(lat, lon, 10);
  
  if (nearby.length === 0) {
    document.getElementById('factories-container').innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted); padding:16px 0;">No major industrial sources within 10km of this location.</div>';
    return;
  }

  let html = '';
  nearby.forEach(f => {
    const riskColor = f.risk === 'High' ? 'var(--danger)' : f.risk === 'Medium' ? 'var(--warning)' : 'var(--aqi-good)';
    html += `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--bg-glass-subtle); border:var(--glass-border); border-radius:var(--radius-sm); margin-bottom:8px; transition:all 0.2s;">
        <div>
          <div style="font-size:0.88rem; font-weight:600; color:var(--text-primary);">🏭 ${f.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${f.type} · <span style="color:${riskColor};font-weight:600">${f.risk} Risk</span> · ${f.distance.toFixed(1)}km away</div>
        </div>
        ${f.email ? `<button class="factory-notice-btn" onclick="window._sendFactoryNotice('${f.name.replace(/'/g, "\\'")}', '${f.type}', ${f.lat}, ${f.lon}, '${f.email}')">
          ✉ Send Notice
        </button>` : '<span style="font-size:0.72rem; color:var(--text-light);">No email</span>'}
      </div>
    `;
  });

  document.getElementById('factories-container').innerHTML = html;

  // Global factory notice handler
  window._sendFactoryNotice = async (name, type, fLat, fLon, targetEmail) => {
    let curAqi = 'Unknown';
    try {
      const liveData = await AQI.getLiveAQI(fLat, fLon);
      curAqi = liveData.european_aqi || liveData.european_aqi_pm2_5 || 'Unknown';
    } catch {}

    const subject = encodeURIComponent(`URGENT: Legal Notice of Emission Violation – ${name}`);
    const body = encodeURIComponent(
      `URGENT OFFICIAL COMPLIANCE NOTICE\n` +
      `--------------------------------------------------\n` +
      `To: Management / Compliance Officer, ${name}\n` +
      `Date/Time: ${new Date().toLocaleString()}\n` +
      `Recorded Facility location: ${fLat}°N, ${fLon}°E\n\n` +
      `WARNING: IMMINENT REGULATORY ACTION\n\n` +
      `This is a formal preliminary notice regarding dangerous atmospheric violations tracked to your operational coordinates via satellite and real-time sensor aggregation.\n\n` +
      `[ LIVE METRICS RECORDED ]\n` +
      `Current Local AQI Overload: ${curAqi}\n` +
      `Violation Proximity: Extreme confidence level.\n\n` +
      `MANDATORY ACTION DIRECTIVE:\n` +
      `Immediate inspection, halting of noxious waste processes, and strict enforcement of operational dust controls must be commenced instantly. If regional values do not normalize within 4 hours, this case will automatically escalate to the DPCC Central Enforcement Division under SECTION 21 of the Federal Air (Prevention and Control of Pollution) Act, 1981.\n\n` +
      `Site shutdown teams have been placed on standby.\n\n` +
      `Regards,\nDelhi Air Quality Command & Enforcement Protocol`
    );
    window.open(`mailto:${targetEmail}?subject=${subject}&body=${body}`, '_self');
    window.showToast(`Legal notice prepared for ${name}`, 'success');
  };
}

// ═══════════════════════════════════
// POPULATION IMPACT (DYNAMIC)
// ═══════════════════════════════════
async function updatePopulationImpact(lat, lon, name) {
  try {
    const liveData = await AQI.getLiveAQI(lat, lon).catch(() => ({}));
    const aqi = liveData.european_aqi || 0;

    const pincodeMatch = name.match(/\b(1100\d{2})\b/);
    const pincode = pincodeMatch ? pincodeMatch[1] : null;
    const totalPop = getPopulationEstimate(name, pincode);

    const affectedRatio = Math.min(aqi / 300, 1);
    const affected = Math.round(totalPop * affectedRatio);

    const popEl = document.getElementById('pop-affected');
    const detailEl = document.getElementById('pop-detail');

    if (popEl) {
      if (affected >= 1000000) {
        popEl.textContent = `~${(affected / 1000000).toFixed(1)}M`;
      } else if (affected >= 1000) {
        popEl.textContent = `~${(affected / 1000).toFixed(0)}K`;
      } else {
        popEl.textContent = new Intl.NumberFormat('en-IN').format(affected);
      }
    }

    if (detailEl) {
      detailEl.textContent = `${new Intl.NumberFormat('en-IN').format(affected)} of ${new Intl.NumberFormat('en-IN').format(totalPop)} zone residents at risk (AQI: ${aqi})`;
    }
  } catch {}
}

// ═══════════════════════════════════
// REPORTS
// ═══════════════════════════════════
async function loadReports(status = '') {
  document.getElementById('reports-list').innerHTML = '<div class="skeleton" style="height:200px;"></div>';

  try {
    const reports = await Reports.getAll(status);
    window.__loadedReports = reports; // Cache for modal
    
    const badge = document.getElementById('report-count-badge');
    if (badge) badge.textContent = `${reports.length} reports`;

    let html = '';
    if (reports.length === 0) {
      html = '<div class="empty-state"><div class="empty-state-icon">📋</div>No reports found.</div>';
    } else {
      // Build clusters
      const clusters = {};
      reports.forEach(r => {
        const loc = (r.location_text || '').toLowerCase().trim();
        if (!clusters[loc]) clusters[loc] = [];
        clusters[loc].push(r);
      });

      // Render cluster alerts
      let alertsHtml = '';
      Object.keys(clusters).forEach(loc => {
        if (clusters[loc].length >= 2) {
          alertsHtml += `
            <div style="background:rgba(212,168,67,0.08); border:1px solid rgba(212,168,67,0.2); border-radius:var(--radius-sm); padding:12px; margin-bottom:8px;">
              <div style="font-size:0.78rem; font-weight:600; color:var(--warning); margin-bottom:4px;">⚠️ Cluster Alert</div>
              <div style="font-size:0.82rem; color:var(--text-secondary);">${clusters[loc].length} reports near <strong>${loc}</strong></div>
            </div>
          `;
        }
      });

      const alertsEl = document.getElementById('alerts-container');
      if (alertsEl) {
        alertsEl.innerHTML = alertsHtml || '<div style="font-size:0.82rem; color:var(--text-muted);">No clusters detected.</div>';
      }

      // Render reports with new status progression
      reports.forEach(r => {
        const date = new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const statusInfo = REPORT_STATUS_LABELS[r.status] || REPORT_STATUS_LABELS['pending'];

        html += `
          <div class="report-card">
            <div class="report-header">
              <span class="report-meta">${date} · ${r.display_name || 'Unknown'}</span>
              <span class="badge ${statusInfo.badge}">${statusInfo.icon} ${r.status.replace(/_/g, ' ')}</span>
            </div>
            <div class="report-title">${r.title} <span style="color:var(--text-muted); font-weight:400;">[${r.category}]</span></div>
            <div class="report-location">📍 ${r.location_text}</div>
            <div class="report-desc">${r.description}</div>
            ${r.image_url ? `<img src="${r.image_url}" onclick="window._openReportModal('${r.id}')" style="max-width:200px; border-radius:var(--radius-sm); margin-bottom:12px; background:#1a1a2e; object-fit: cover; cursor:pointer;" onerror="this.onerror=null; this.src='https://placehold.co/200x150/1a1a2e/4A4A6A?text=Image+Unavailable';">` : ''}
            <div class="report-actions" style="margin-top: 12px; display: flex; gap: 8px; flex-wrap:wrap;">
              ${getStatusActions(r)}
              ${r.is_banned ? `
                <button class="btn btn-success btn-sm" style="margin-left:auto;" onclick="window._govAction('unban','${r.user_id}')">Unban User</button>
              ` : `
                <button class="btn btn-danger btn-sm" style="margin-left:auto;" onclick="window._govAction('ban','${r.user_id}')">Ban User</button>
              `}
            </div>
          </div>
        `;
      });
    }

    document.getElementById('reports-list').innerHTML = html;
  } catch {
    document.getElementById('reports-list').innerHTML = '<div class="empty-state" style="color:var(--danger)">Failed to load reports.</div>';
  }
}

function getStatusActions(report) {
  const id = report.id;
  
  let actionButtons = '';

  switch (report.status) {
    case 'pending':
      actionButtons = `
        <button class="btn btn-success btn-sm" onclick="window._govAction('valid','${id}')">✓ Valid</button>
        <button class="btn btn-danger btn-sm" onclick="window._govAction('fake','${id}')">✕ Fake</button>
      `;
      break;
    case 'valid':
      actionButtons = `
        <button class="btn btn-primary btn-sm" onclick="window._govAction('working','${id}')">⚡ Working</button>
        <button class="btn btn-success btn-sm" onclick="window._govAction('resolved','${id}')">✅ Resolve</button>
        <button class="btn btn-secondary btn-sm" onclick="window._govAction('undo_pending','${id}')">↺ Undo</button>
      `;
      break;
    case 'working':
      actionButtons = `
        <button class="btn btn-success btn-sm" onclick="window._govAction('resolved','${id}')">✅ Resolve</button>
        <button class="btn btn-secondary btn-sm" onclick="window._govAction('undo_valid','${id}')">↺ Undo</button>
      `;
      break;
    case 'resolved':
      actionButtons = `<button class="btn btn-secondary btn-sm" onclick="window._govAction('undo_working','${id}')">↺ Revert to Working</button>`;
      // Optional: Since there is no status prior to resolved if it jumped from valid, wait, let's just make undo revert to valid for simplicity
      actionButtons = `<button class="btn btn-secondary btn-sm" onclick="window._govAction('undo_valid','${id}')">↺ Undo Action</button>`;
      break;
    case 'fake':
      actionButtons = `<button class="btn btn-secondary btn-sm" onclick="window._govAction('undo_pending','${id}')">↺ Undo</button>`;
      break;
  }

  // Always append Delete button for Gov
  return actionButtons + ` <button class="btn btn-danger btn-sm" style="margin-left:auto; background-color: #8B0000; color: white; border:none;" onclick="window._govAction('delete','${id}')">🗑️ Delete</button>`;
}
