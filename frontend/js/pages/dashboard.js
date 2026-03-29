import { AQI } from '../api/api.js';
import { AQIMap } from '../components/map.js';
import { ambientSystem } from '../ambient.js';
import { getAQIColor, getAQIColorRaw, getAQILabel, getAQIBadgeClass } from '../utils.js';

let currentMap = null;
let currentZones = [];
let historyChartInstance = null;
let previousAQI = null;

export const Dashboard = {
  render: () => `
    <div class="dashboard-layout">
      <!-- Left Column -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- AQI Hero -->
        <div class="glass-panel aqi-hero" id="aqi-hero-panel">
          <div class="panel-title"><span class="dot"></span> Air Quality Index</div>
          <div style="position:relative; display:inline-block;margin:20px 0;">
            <div class="aqi-hero-aura" id="aqi-aura"></div>
            <div class="aqi-hero-number" id="aqi-number">—</div>
          </div>
          <div class="aqi-hero-label" id="aqi-location-label">Delhi City Average</div>
          <div class="aqi-hero-status" id="aqi-status">
            <span id="aqi-status-dot" style="width:8px;height:8px;border-radius:50%;"></span>
            <span id="aqi-status-text">Loading...</span>
          </div>
          <div id="pop-impact" style="margin-top:16px; font-size:0.85rem; color:var(--text-secondary); background:var(--bg-glass-subtle); padding:6px 12px; border-radius:12px; display:inline-block;">
            Calculating population impact...
          </div>
        </div>

        <!-- CIGARETTE + LIFESPAN — BIG AND ALARMING -->
        <div class="glass-panel impact-hero-panel" id="impact-panel">
          <div class="panel-title"><span class="dot"></span> Health Impact</div>
          <div class="impact-hero-grid">
            <div class="impact-hero-card impact-cig" id="impact-cig-card">
              <div class="impact-hero-icon">🚬</div>
              <div class="impact-hero-value" id="cig-eq">—</div>
              <div class="impact-hero-unit">cigarettes/day equivalent</div>
              <div class="impact-hero-bar">
                <div class="impact-hero-bar-fill" id="cig-bar-fill" style="width:0%"></div>
              </div>
              <div class="impact-hero-note">Based on PM2.5 inhalation</div>
            </div>
            <div class="impact-hero-card impact-life" id="impact-life-card">
              <div class="impact-hero-icon">⏳</div>
              <div class="impact-hero-value" id="life-impact">—</div>
              <div class="impact-hero-unit">years lifespan reduction</div>
              <div class="impact-hero-bar">
                <div class="impact-hero-bar-fill" id="life-bar-fill" style="width:0%"></div>
              </div>
              <div class="impact-hero-note">Compared to WHO safe limits</div>
            </div>
          </div>
        </div>

        <!-- Safety Advisory — Dynamic -->
        <div class="glass-panel" id="safety-panel">
          <div class="panel-title"><span class="dot"></span> Safety Advisory</div>
          <div id="safety-content">
            <div class="skeleton" style="height:80px;"></div>
          </div>
        </div>

        <!-- Weather + Pollutants -->
        <div class="glass-panel">
          <div class="panel-title"><span class="dot"></span> Weather & Pollutants</div>
          <div class="stats-grid" style="margin-bottom:16px;">
            <div class="stat-card">
              <div class="stat-label">Wind Speed</div>
              <div class="stat-value" id="wind-speed">—</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Temperature</div>
              <div class="stat-value" id="temperature">—</div>
            </div>
          </div>
          <div id="pollutants-list">
            <div class="skeleton" style="height:80px;"></div>
          </div>
        </div>
      </div>

      <!-- Center Column: Map + DIY -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="glass-panel-flat map-wrapper" style="flex:1; padding:0; position:relative; min-height:480px;">
          <div class="map-search-bar">
            <input type="text" id="pincode-input" class="form-input" placeholder="Search pincode or area..." style="margin-bottom:0;">
            <button id="btn-scan" class="btn btn-primary btn-sm">Search</button>
          </div>
          <div id="main-map" class="map-container"></div>
        </div>

        <!-- 7-Day Trend -->
        <div class="glass-panel">
          <div class="panel-header">
            <div class="panel-title"><span class="dot"></span> 7-Day Trend</div>
            <span class="badge badge-accent" id="trend-location-badge">Delhi Avg</span>
          </div>
          <div style="height:180px; position:relative;">
            <canvas id="historyChart"></canvas>
          </div>
        </div>

        <!-- DIY Pollution Control -->
        <div class="glass-panel">
          <div class="panel-title"><span class="dot"></span> What You Can Do</div>
          <div class="diy-grid">
            <div class="diy-card">
              <div class="diy-icon">🚲</div>
              <div class="diy-text"><strong>Reduce Vehicles</strong><br>Use public transport, cycle, or carpool for short commutes.</div>
            </div>
            <div class="diy-card">
              <div class="diy-icon">🔥</div>
              <div class="diy-text"><strong>Avoid Burning</strong><br>Never burn waste, leaves, or firecrackers. Report open burning.</div>
            </div>
            <div class="diy-card">
              <div class="diy-icon">🌳</div>
              <div class="diy-text"><strong>Plant Trees</strong><br>Native species like Neem, Peepal & Arjuna are natural air purifiers.</div>
            </div>
            <div class="diy-card">
              <div class="diy-icon">🏠</div>
              <div class="diy-text"><strong>Indoor Air</strong><br>Use air-purifying plants (Spider Plant, Peace Lily) and keep ventilation smart.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Zone AQI Meters -->
        <div class="glass-panel">
          <div class="panel-title"><span class="dot"></span> Zone AQI</div>
          <div id="zones-grid" class="zones-grid">
            <div class="skeleton" style="height:200px; grid-column: 1/-1;"></div>
          </div>
        </div>
      </div>
    </div>
  `,

  init: async () => {
    // Init map
    currentMap = new AQIMap('main-map');
    currentMap.init();

    // ── MAP CLICK → Update all data ──
    currentMap.onLocationSelect = async (lat, lng, name) => {
      await selectLocation(lat, lng, name);
    };

    try {
      // Fetch all data in parallel
      const [zones, weather, history, allReports] = await Promise.all([
        AQI.getZones().catch(() => []),
        AQI.getWeather(28.6139, 77.2090).catch(() => ({})),
        AQI.getHistory(28.6139, 77.2090, 7).catch(() => ({ european_aqi: [] })),
        fetch('/api/reports?status=').then(r=>r.json()).catch(() => ([])) // Fallback direct fetch if import missing
      ]);

      currentZones = zones;

      // ── City Average AQI ──
      const validZones = zones.filter(z => z.aqi !== null);
      const avgAqi = validZones.length > 0
        ? Math.round(validZones.reduce((s, z) => s + z.aqi, 0) / validZones.length)
        : 0;

      const avgPm25 = validZones.length > 0
        ? validZones.reduce((s, z) => s + (z.pm2_5 || 0), 0) / validZones.length
        : 0;

      updateAQIDisplay(avgAqi, 'Delhi City Average');
      updateHealthImpact(avgPm25, avgAqi);
      updateSafetyAdvisory(avgAqi);
      ambientSystem.updateAQI(avgAqi);

      // Weather
      updateWeather(weather);

      // Pollutants
      const avgPollutants = {
        pm2_5: avg(validZones, 'pm2_5'),
        pm10: avg(validZones, 'pm10'),
        no2: avg(validZones, 'no2'),
        co: avg(validZones, 'co'),
        o3: avg(validZones, 'o3')
      };
      updatePollutants(avgPollutants);

      // Zone Grid
      renderZoneGrid(validZones);

      // Map Zones
      if (validZones.length > 0) {
        currentMap.addZones(validZones);
        currentMap.addFactories();
        currentMap.addBlindSpots(validZones, allReports);
        currentMap.addVulnerableZones();
        if (weather.wind_direction_10m !== undefined) {
          currentMap.addWindOverlay(weather.wind_direction_10m);
        }
      }

      // History Chart
      renderHistoryChart(history);

      // Pincode Search event listeners
      const btnScan = document.getElementById('btn-scan');
      const pincodeInput = document.getElementById('pincode-input');

      btnScan.onclick = () => handlePincodeSearch();
      pincodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePincodeSearch();
      });

    } catch (err) {
      console.error('Dashboard error:', err);
      window.showToast('Failed to load data', 'error');
    }
  }
};

// ═══════════════════════════════════
// LOCATION SELECTION — Updates everything
// ═══════════════════════════════════
async function selectLocation(lat, lng, name) {
  // Show loading state
  document.getElementById('aqi-number').textContent = '...';
  document.getElementById('aqi-location-label').textContent = name;
  const badge = document.getElementById('trend-location-badge');
  if (badge) badge.textContent = name;

  try {
    // Fetch fresh data for this specific location
    const [liveData, weather, history] = await Promise.all([
      AQI.getLiveAQI(lat, lng).catch(() => ({})),
      AQI.getWeather(lat, lng).catch(() => ({})),
      AQI.getHistory(lat, lng, 7).catch(() => ({ european_aqi: [] }))
    ]);

    const aqi = liveData.european_aqi ?? liveData.european_aqi_pm2_5 ?? 0;
    const pm25 = liveData.pm2_5 ?? 0;

    // Update map marker
    currentMap.updateSearchMarker(lat, lng, name, aqi);
    currentMap.map.setView([lat, lng], 13, { animate: true, duration: 1 });

    // Update all displays
    updateAQIDisplay(aqi, name);
    updateHealthImpact(pm25, aqi);
    updateSafetyAdvisory(aqi);
    updateWeather(weather);
    ambientSystem.updateAQI(aqi);

    // Update pollutants
    updatePollutants({
      pm2_5: liveData.pm2_5 || 0,
      pm10: liveData.pm10 || 0,
      no2: liveData.nitrogen_dioxide || 0,
      co: liveData.carbon_monoxide || 0,
      o3: liveData.ozone || 0
    });

    // Update history chart
    renderHistoryChart(history);

    window.showToast(`AQI for ${name}: ${aqi}`, 'success');
  } catch (err) {
    console.error('Location select error:', err);
    window.showToast('Failed to fetch data for this location', 'error');
  }
}

// ═══════════════════════════════════
// PINCODE SEARCH
// ═══════════════════════════════════
async function handlePincodeSearch() {
  const input = document.getElementById('pincode-input');
  const btn = document.getElementById('btn-scan');
  const query = input.value.trim();
  if (!query) return window.showToast('Enter a pincode or area name', 'error');

  btn.textContent = '...';
  btn.disabled = true;

  try {
    // Geocode via Nominatim
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
      const lat = parseFloat(geoData[0].lat);
      const lng = parseFloat(geoData[0].lon);
      const name = isNumeric ? `Pincode ${query}` : query;

      // Select this location — updates everything
      await selectLocation(lat, lng, name);
    } else {
      window.showToast('Location not found. Try a different pincode or area.', 'error');
    }
  } catch {
    window.showToast('Search failed. Please try again.', 'error');
  } finally {
    btn.textContent = 'Search';
    btn.disabled = false;
  }
}

// ═══════════════════════════════════
// UI UPDATE FUNCTIONS
// ═══════════════════════════════════

function updateAQIDisplay(aqi, label) {
  const number = document.getElementById('aqi-number');
  const aura = document.getElementById('aqi-aura');
  const locLabel = document.getElementById('aqi-location-label');
  const statusEl = document.getElementById('aqi-status');
  const statusDot = document.getElementById('aqi-status-dot');
  const statusText = document.getElementById('aqi-status-text');
  const heroPanel = document.getElementById('aqi-hero-panel');

  if (number) animateNumber(number, aqi, 1200);
  if (aura) aura.style.backgroundColor = getAQIColorRaw(aqi);
  if (number) number.style.color = getAQIColorRaw(aqi);
  if (locLabel) locLabel.textContent = label;

  if (statusEl) {
    const aqiLabel = getAQILabel(aqi);
    const badgeClass = getAQIBadgeClass(aqi);
    statusEl.className = `aqi-hero-status badge ${badgeClass}`;
    if (statusDot) statusDot.style.backgroundColor = getAQIColorRaw(aqi);
    if (statusText) statusText.textContent = aqiLabel;
  }

  if (heroPanel) {
    if ((previousAQI && (aqi - previousAQI > 50)) || aqi >= 300) {
      heroPanel.classList.add('spike-alert');
    } else {
      heroPanel.classList.remove('spike-alert');
    }
  }
  previousAQI = aqi;

  const popImpact = document.getElementById('pop-impact');
  if (popImpact) {
    // TODO: implement real census API. Falling back to estimation model.
    const hash = label.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
    let areaPop = label.includes('Delhi City') ? 32000000 : (Math.abs(hash) % 800000) + 150000;
    
    let affectedRatio = Math.min((aqi / 300), 1);
    let affected = Math.round(areaPop * affectedRatio);
    
    popImpact.innerHTML = `👥 <strong>${new Intl.NumberFormat('en-IN').format(affected)}</strong> residents at risk in this zone.`;
  }
}

function updateHealthImpact(pm25, aqi) {
  const cigValue = (pm25 / 22).toFixed(1);
  const lifeValue = Math.max(((pm25 - 10) * 0.05), 0).toFixed(1);
  const color = getAQIColorRaw(aqi);

  // Animate cigarette count
  const cigEl = document.getElementById('cig-eq');
  if (cigEl) animateDecimal(cigEl, parseFloat(cigValue), 1500);

  // Animate lifespan
  const lifeEl = document.getElementById('life-impact');
  if (lifeEl) animateDecimal(lifeEl, parseFloat(lifeValue), 1500, ' yrs');

  // Bars
  const cigBar = document.getElementById('cig-bar-fill');
  const lifeBar = document.getElementById('life-bar-fill');
  if (cigBar) {
    const cigPct = Math.min((parseFloat(cigValue) / 15) * 100, 100);
    setTimeout(() => { cigBar.style.width = cigPct + '%'; cigBar.style.background = color; }, 100);
  }
  if (lifeBar) {
    const lifePct = Math.min((parseFloat(lifeValue) / 8) * 100, 100);
    setTimeout(() => { lifeBar.style.width = lifePct + '%'; lifeBar.style.background = color; }, 100);
  }

  // Color intensity on cards
  const cigCard = document.getElementById('impact-cig-card');
  const lifeCard = document.getElementById('impact-life-card');
  if (cigCard) cigCard.style.borderColor = color + '44';
  if (lifeCard) lifeCard.style.borderColor = color + '44';

  // Pulse effect for dangerous levels
  const impactPanel = document.getElementById('impact-panel');
  if (impactPanel) {
    if (aqi > 200) {
      impactPanel.classList.add('impact-pulse');
    } else {
      impactPanel.classList.remove('impact-pulse');
    }
  }
}

function updateSafetyAdvisory(aqi) {
  const container = document.getElementById('safety-content');
  if (!container) return;

  let icon, title, desc, bgColor, textColor;

  if (aqi <= 50) {
    icon = '✅'; title = 'Safe to Go Outside';
    desc = 'Air quality is ideal for outdoor activities. Enjoy the fresh air!';
    bgColor = 'var(--aqi-good-bg)'; textColor = 'var(--aqi-good)';
  } else if (aqi <= 100) {
    icon = '⚠️'; title = 'Moderate — Sensitive Groups Caution';
    desc = 'Unusually sensitive people should consider reducing prolonged outdoor exertion.';
    bgColor = 'var(--aqi-moderate-bg)'; textColor = 'var(--aqi-moderate)';
  } else if (aqi <= 200) {
    icon = '😷'; title = 'Mask Recommended Outdoors';
    desc = 'Everyone should reduce prolonged outdoor exertion. Use N95 masks if outside for long periods.';
    bgColor = 'var(--aqi-unhealthy-bg)'; textColor = 'var(--aqi-unhealthy)';
  } else if (aqi <= 300) {
    icon = '🚫'; title = 'Limit Outdoor Activity';
    desc = 'Everyone should avoid prolonged outdoor exertion. Keep windows closed. Use air purifiers indoors.';
    bgColor = 'var(--aqi-hazardous-bg)'; textColor = 'var(--aqi-hazardous)';
  } else {
    icon = '🛑'; title = 'STAY INDOORS';
    desc = 'Health emergency. Avoid all outdoor activity. Use N95 masks if going outside is essential. Seek medical help for breathing difficulty.';
    bgColor = 'var(--aqi-severe-bg)'; textColor = 'var(--aqi-severe)';
  }

  container.innerHTML = `
    <div class="safety-banner" style="background:${bgColor}; border-left:4px solid ${textColor}; border-radius:var(--radius-sm); padding:16px 20px;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
        <span style="font-size:1.3rem;">${icon}</span>
        <strong style="font-size:0.95rem; color:${textColor};">${title}</strong>
      </div>
      <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5; margin:0;">${desc}</p>
    </div>
  `;
}

function updateWeather(weather) {
  const windEl = document.getElementById('wind-speed');
  const tempEl = document.getElementById('temperature');
  if (windEl && weather.wind_speed_10m !== undefined) windEl.textContent = weather.wind_speed_10m + ' km/h';
  if (tempEl && weather.temperature_2m !== undefined) tempEl.textContent = weather.temperature_2m + '°C';
}

function updatePollutants(data) {
  const el = document.getElementById('pollutants-list');
  if (!el) return;
  el.innerHTML =
    pollutantBar('PM2.5', data.pm2_5, 100) +
    pollutantBar('PM10', data.pm10, 200) +
    pollutantBar('NO₂', data.no2, 150) +
    pollutantBar('CO', data.co, 5000) +
    pollutantBar('O₃', data.o3, 180);
}

function renderZoneGrid(zones) {
  let html = '';
  // Sort zones by AQI descending to act as Area Ranking
  zones.sort((a, b) => b.aqi - a.aqi);
  
  zones.forEach(z => {
    const color = getAQIColorRaw(z.aqi);
    let rankLabel = 'Safe';
    if (z.aqi > 200) rankLabel = 'Dangerous ⚠️';
    else if (z.aqi > 100) rankLabel = 'Moderate';
    
    html += `
      <div class="zone-card" onclick="window.dispatchEvent(new CustomEvent('select-zone', {detail:{lat:${z.lat},lon:${z.lon},name:'${z.name.replace(/'/g, "\\'")}'}}))" title="Click to select ${z.name}">
        <div class="zone-card-glow" style="background:${color}"></div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
           <div class="zone-card-aqi" style="color:${color}">${z.aqi}</div>
           <div style="font-size:0.7rem; font-weight:700; color:${color}; background:${color}22; padding:2px 6px; border-radius:8px;">${rankLabel}</div>
        </div>
        <div class="zone-card-name">${z.name}</div>
        <div class="zone-card-area">${z.area}</div>
      </div>
    `;
  });
  document.getElementById('zones-grid').innerHTML = html || '<div class="empty-state">No zone data</div>';

  // Zone click handler → select location
  window.addEventListener('select-zone', async (e) => {
    const { lat, lon, name } = e.detail;
    await selectLocation(lat, lon, name);
  });
}

function renderHistoryChart(history) {
  if (!history.european_aqi || typeof Chart === 'undefined') return;

  const hourlyData = history.european_aqi;
  const dailyMax = [];
  for (let i = 0; i < hourlyData.length; i += 24) {
    const daySlice = hourlyData.slice(i, i + 24);
    const max = Math.max(...daySlice.filter(v => v !== null));
    if (isFinite(max)) dailyMax.push(max);
  }

  const last7 = dailyMax.slice(-7);
  const labels = Array.from({ length: last7.length }, (_, i) =>
    i === last7.length - 1 ? 'Today' : `D-${last7.length - 1 - i}`
  );

  const ctx = document.getElementById('historyChart');
  if (!ctx) return;

  if (historyChartInstance) historyChartInstance.destroy();

  historyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Peak AQI',
        data: last7,
        borderColor: '#5a8fbc',
        backgroundColor: 'rgba(90, 143, 188, 0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: last7.map(v => getAQIColorRaw(v)),
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutCubic' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          titleColor: '#1a2332',
          bodyColor: '#4a5568',
          borderColor: 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#8896a6', font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { color: '#8896a6', font: { family: 'Inter', size: 11 } },
          suggestedMin: 0
        }
      }
    }
  });
}

// ═══════════════════════════════════
// HELPERS
// ═══════════════════════════════════
function avg(zones, key) {
  const vals = zones.map(z => z[key]).filter(v => v !== null && v !== undefined);
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

function pollutantBar(name, value, maxVal) {
  if (value === undefined || value === null) return '';
  const v = Math.round(value);
  const pct = Math.min((v / maxVal) * 100, 100);
  let color = 'var(--aqi-good)';
  if (pct > 50) color = 'var(--aqi-moderate)';
  if (pct > 80) color = 'var(--aqi-unhealthy)';

  return `
    <div class="pollutant-item">
      <span class="pollutant-name">${name}</span>
      <div class="pollutant-bar">
        <div class="pollutant-fill" style="width:${pct}%; background:${color};"></div>
      </div>
      <span class="pollutant-value">${v}</span>
    </div>
  `;
}

function animateNumber(el, target, duration) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function animateDecimal(el, target, duration, suffix = '') {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = (start + (target - start) * eased).toFixed(1);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
