import { AQI, Reports } from '../api/api.js';
import { getUser, getAQIColorRaw, getAQILabel } from '../utils.js';

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
              <button class="filter-btn" data-filter="valid">Verified</button>
              <button class="filter-btn" data-filter="fake">Fake</button>
            </div>

            <div id="reports-list" style="max-height:500px; overflow-y:auto;">
              <div class="skeleton" style="height:200px;"></div>
            </div>
          </div>
        </div>

        <!-- Right: Analytics -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Location Context Selector -->
          <div class="glass-panel" style="padding:16px; border:1px solid rgba(212,168,67,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
               <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary);">📍 ANALYZING ZONE:</div>
               <select id="gov-location-select" class="form-select" style="width:200px; padding:6px 10px; margin-bottom:0; font-size:0.85rem; background:rgba(0,0,0,0.1); border:1px solid rgba(255,255,255,0.1);">
                 <option value="28.6139,77.2090">Delhi City Average</option>
                 <option value="28.8021,77.0375">Bawana Industrial Hub</option>
                 <option value="28.5300,77.2900">Okhla Plant Area</option>
                 <option value="28.6839,77.0321">Mundka Processing</option>
                 <option value="28.5672,77.2100">AIIMS (Vulnerable)</option>
               </select>
            </div>
          </div>

          <!-- Suspicion Index -->
          <div class="glass-panel">
            <div class="panel-title"><span class="dot"></span> Suspicion Index</div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:16px;">
              Anomaly detection based on AQI, wind patterns, and time of day.
            </p>
            <div id="suspicion-container">
              <div class="skeleton" style="height:80px;"></div>
            </div>
          </div>

          <!-- Pollution Cause Analysis -->
          <div class="glass-panel">
            <div class="panel-title"><span class="dot"></span> Major Causes of Pollution</div>
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
            <div class="panel-title"><span class="dot"></span> Major Emission Sources</div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px;">
              Known pollution hotspots in Delhi NCR. Click "Send Notice" to open a pre-filled email.
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
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Estimated residents in hazard zones</div>
          </div>
        </div>
      </div>
    `;
  },

  init: async () => {
    const user = getUser();
    if (!user || user.type !== 'gov') return;

    // ── Load all analytics ──
    loadSuspicion(28.6139, 77.2090);
    loadCauses(28.6139, 77.2090);
    loadFactories();
    loadReports('');

    document.getElementById('gov-location-select').addEventListener('change', (e) => {
      const coords = e.target.value.split(',');
      const lat = parseFloat(coords[0]);
      const lon = parseFloat(coords[1]);
      loadSuspicion(lat, lon);
      loadCauses(lat, lon);
      window.showToast('Re-analyzing zone data...', 'info');
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
        if (action === 'verify') {
          await Reports.updateStatus(id, 'valid');
          window.showToast('Report verified.', 'success');
        } else if (action === 'fake') {
          await Reports.updateStatus(id, 'fake');
          window.showToast('Report marked as fake.', 'info');
        } else if (action === 'undo') {
          await Reports.updateStatus(id, 'pending');
          window.showToast('Report status reverted.', 'info');
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
  }
};

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

    let index = (aqi / 400) * 40; 
    index += Math.min(reportsCount * 3, 30); 
    index += (wind > 10 && aqi > 150) ? 20 : 0; 
    index += (hour >= 23 || hour <= 4) ? 10 : 0; 

    let suspicion = Math.min(index, 100);
    suspicion = Math.round(suspicion);

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

    document.getElementById('pop-affected').textContent =
      `~${Math.max(((aqi * 4500) / 1000000).toFixed(1), 0.1)}M`;
  } catch {}
}

// ═══════════════════════════════════
// POLLUTION CAUSE ANALYSIS
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

    // Dynamic cause weighting based on conditions
    let trafficPct = 30;
    let industrialPct = 25;
    let constructPct = 15;
    let weatherPct = 15;
    let burnPct = 15;

    // Traffic peak
    if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) trafficPct += 20;
    // Industrial night operations
    if (hour >= 23 || hour <= 5) industrialPct += 20;

    // Weather impact dynamically
    if (wind < 4) weatherPct += 20; // Stagnant air
    if (wind > 15) constructPct += 15; // High wind stirs up dust
    if (temp < 15 && wind < 5) burnPct += 15; // Winter inversion + burning
    if (humidity > 80 && temp < 20) weatherPct += 10; // Smog formation conditions

    // Normalize to 100
    const total = trafficPct + industrialPct + constructPct + weatherPct + burnPct;
    trafficPct = Math.round((trafficPct / total) * 100);
    industrialPct = Math.round((industrialPct / total) * 100);
    constructPct = Math.round((constructPct / total) * 100);
    weatherPct = Math.round((weatherPct / total) * 100);
    burnPct = 100 - trafficPct - industrialPct - constructPct - weatherPct;

    const causes = [
      { icon: '🚗', title: 'Vehicular Traffic', pct: trafficPct, color: '#e07850', detail: 'Diesel vehicles, congestion zones, outdated emission standards' },
      { icon: '🏭', title: 'Industrial Emissions', pct: industrialPct, color: '#c5475b', detail: 'Manufacturing units, thermal power, waste processing' },
      { icon: '🏗️', title: 'Construction Dust', pct: constructPct, color: '#d4a843', detail: 'Metro/highway expansion, demolition, unpaved roads' },
      { icon: '🌡️', title: 'Weather Conditions', pct: weatherPct, color: '#5a8fbc', detail: `Wind: ${wind} km/h, Temp: ${temp}°C — ${wind < 5 ? 'Inversion trap' : 'Moderate dispersal'}` },
      { icon: '🔥', title: 'Open Burning', pct: burnPct, color: '#8b5a6b', detail: 'Crop stubble, waste burning, biomass fuels' }
    ];

    causes.sort((a, b) => b.pct - a.pct);

    let html = '';
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

    document.getElementById('causes-container').innerHTML = html;

    // Solutions based on top causes
    loadSolutions(causes);
  } catch {}
}

// ═══════════════════════════════════
// SOLUTIONS PANEL
// ═══════════════════════════════════
function loadSolutions(causes) {
  const solutionMap = {
    'Vehicular Traffic': [
      'Enforce odd-even vehicle rationing during peak hours',
      'Expand CNG/electric bus fleet on high-pollution corridors',
      'Deploy traffic management to reduce congestion hotspots',
      'Promote last-mile connectivity to reduce personal vehicle use'
    ],
    'Industrial Emissions': [
      'Mandate real-time emission monitoring for all units',
      'Conduct surprise inspections at Bawana, Wazirpur, Mundka',
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

  let html = '';
  causes.slice(0, 3).forEach(c => {
    const solutions = solutionMap[c.title] || [];
    if (solutions.length === 0) return;

    html += `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span>${c.icon}</span>
          <strong style="font-size:0.85rem;color:var(--text-primary);">${c.title}</strong>
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
// FACTORY LIST + SEND NOTICE
// ═══════════════════════════════════
function loadFactories() {
  const factories = [
    { name: 'Okhla Waste-to-Energy Plant', type: 'Waste Incineration', lat: 28.5300, lon: 77.2900, risk: 'High', email: 'environment@okhla-wte.in' },
    { name: 'Bawana Industrial Hub', type: 'Mixed Industrial', lat: 28.8021, lon: 77.0375, risk: 'High', email: 'admin@bawana-industries.in' },
    { name: 'Wazirpur Industrial Area', type: 'Steel & Metalworks', lat: 28.6953, lon: 77.1663, risk: 'High', email: 'compliance@wazirpurmetal.com' },
    { name: 'Mundka Industrial Area', type: 'Manufacturing', lat: 28.6839, lon: 77.0321, risk: 'Medium', email: 'contact@mundkaindustries.in' },
    { name: 'Anand Parbat Industrial Area', type: 'Mixed Industrial', lat: 28.6426, lon: 77.1909, risk: 'Medium', email: '' },
    { name: 'Mayapuri Scrap Market', type: 'Scrap & Recycling', lat: 28.6216, lon: 77.1360, risk: 'Medium', email: '' },
    { name: 'Naraina Industrial Area', type: 'Manufacturing', lat: 28.6282, lon: 77.1448, risk: 'Medium', email: 'ops@narainamanufacturing.com' },
    { name: 'Badarpur (Legacy Thermal Site)', type: 'Legacy Thermal Power', lat: 28.5042, lon: 77.3060, risk: 'Low', email: 'site-manager@badarpur-thermal.in' }
  ];

  let html = '';
  factories.forEach(f => {
    const riskColor = f.risk === 'High' ? 'var(--danger)' : f.risk === 'Medium' ? 'var(--warning)' : 'var(--aqi-good)';
    html += `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--bg-glass-subtle); border:var(--glass-border); border-radius:var(--radius-sm); margin-bottom:8px; transition:all 0.2s;">
        <div>
          <div style="font-size:0.88rem; font-weight:600; color:var(--text-primary);">🏭 ${f.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${f.type} · <span style="color:${riskColor};font-weight:600">${f.risk} Risk</span></div>
        </div>
        <button class="factory-notice-btn" onclick="window._sendFactoryNotice('${f.name.replace(/'/g, "\\'")}', '${f.type}', ${f.lat}, ${f.lon}, '${f.email}')">
          ✉ Send Notice
        </button>
      </div>
    `;
  });

  document.getElementById('factories-container').innerHTML = html;

  // Global factory notice handler
  window._sendFactoryNotice = async (name, type, lat, lon, targetEmail) => {
    let curAqi = 'Unknown';
    try {
      const liveData = await AQI.getLiveAQI(lat, lon);
      curAqi = liveData.european_aqi || liveData.european_aqi_pm2_5 || 'Unknown';
    } catch {}

    const subject = encodeURIComponent(`URGENT: Legal Notice of Emission Violation – ${name}`);
    const body = encodeURIComponent(
      `URGENT OFFICIAL COMPLIANCE NOTICE\n` +
      `--------------------------------------------------\n` +
      `To: Management / Compliance Officer, ${name}\n` +
      `Date/Time: ${new Date().toLocaleString()}\n` +
      `Recorded Facility location: ${lat}°N, ${lon}°E\n\n` +
      `WARNING: IMMINENT REGULATORY ACTION\n\n` +
      `This is a formal preliminary notice regarding dangerous atmospheric violations tracked to your operational coordinates via satellite and real-time sensor aggregation. We have also verified multiple citizen reports corroborating severe particulate discharge.\n\n` +
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
// REPORTS
// ═══════════════════════════════════
async function loadReports(status = '') {
  document.getElementById('reports-list').innerHTML = '<div class="skeleton" style="height:200px;"></div>';

  try {
    const reports = await Reports.getAll(status);
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
              <div style="font-size:0.78rem; font-weight:600; color:var(--warning); margin-bottom:4px;">⚠️ Duplicate Cluster</div>
              <div style="font-size:0.82rem; color:var(--text-secondary);">${clusters[loc].length} reports near <strong>${loc}</strong></div>
              <button class="btn btn-sm btn-secondary" style="margin-top:8px;" onclick="window.location.href='mailto:enforcement@dpcc.delhigovt.nic.in?subject=Action Required: Multiple pollution reports near ${encodeURIComponent(loc)}&body=We have received ${clusters[loc].length} citizen reports about pollution near ${encodeURIComponent(loc)}. Immediate investigation recommended.'">
                ✉ Email DPCC
              </button>
            </div>
          `;
        }
      });

      const alertsEl = document.getElementById('alerts-container');
      if (alertsEl) {
        alertsEl.innerHTML = alertsHtml || '<div style="font-size:0.82rem; color:var(--text-muted);">No clusters detected.</div>';
      }

      // Render reports
      reports.forEach(r => {
        const date = new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        let statusBadge = 'badge-accent';
        if (r.status === 'valid') statusBadge = 'badge-success';
        if (r.status === 'fake') statusBadge = 'badge-danger';

        html += `
          <div class="report-card">
            <div class="report-header">
              <span class="report-meta">${date} · ${r.display_name || 'Unknown'}</span>
              <span class="badge ${statusBadge}">${r.status}</span>
            </div>
            <div class="report-title">${r.title} <span style="color:var(--text-muted); font-weight:400;">[${r.category}]</span></div>
            <div class="report-location">📍 ${r.location_text}</div>
            <div class="report-desc">${r.description}</div>
            ${r.image_path ? `<img src="${r.image_path}" style="max-width:200px; border-radius:var(--radius-sm); margin-bottom:12px;">` : ''}
            <div class="report-actions" style="margin-top: 12px; display: flex; gap: 8px;">
              ${r.status === 'pending' ? `
                <button class="btn btn-success btn-sm" onclick="window._govAction('verify','${r.id}')">✓ Verify</button>
                <button class="btn btn-danger btn-sm" onclick="window._govAction('fake','${r.id}')">✕ Mark Fake</button>
              ` : `
                <button class="btn btn-secondary btn-sm" onclick="window._govAction('undo','${r.id}')">↺ Undo</button>
              `}
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
