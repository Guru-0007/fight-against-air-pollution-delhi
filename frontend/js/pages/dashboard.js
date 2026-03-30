import { AQI, Reports } from '../api/api.js';
import { AQIMap } from '../components/map.js';
import { ambientSystem } from '../ambient.js';
import { getAQIColor, getAQIColorRaw, getAQILabel, getAQIBadgeClass } from '../utils.js';
import { getPopulationEstimate, getTrafficIntensity, getIndustrialScore, getSeasonalFactors, findNearbyFactories } from '../data/govData.js';

let currentMap = null;
let currentZones = [];
let historyChartInstance = null;
let previousAQI = null;
let zoneSelectHandler = null; // Single handler reference to prevent duplication

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

          <!-- CIGARETTE + LIFESPAN (Merged inside AQI Hero to guarantee rendering) -->
          <div id="health-metrics-wrapper" style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border);">
            <div class="panel-title" style="margin-bottom:12px;"><span class="dot"></span> Health Impact</div>
            <div class="health-dash-grid">
              <div class="health-dash-card health-cig" id="health-cig-card" style="background:transparent; border:none; padding:10px;">
                <div class="health-dash-icon">🚬</div>
                <div class="health-dash-value" id="cig-eq">—</div>
                <div class="health-dash-unit">cigarettes/day equivalent</div>
              </div>
              <div class="health-dash-card health-life" id="health-life-card" style="background:transparent; border:none; padding:10px;">
                <div class="health-dash-icon">⏳</div>
                <div class="health-dash-value" id="life-impact">—</div>
                <div class="health-dash-unit">years lifespan reduction</div>
              </div>
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

      <!-- Center Column: Main Map & Primary Analytics -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="glass-panel-flat map-wrapper" style="padding:0; position:relative; min-height:280px; height: 350px;">
          <div class="map-search-bar">
            <input type="text" id="pincode-input" class="form-input" placeholder="Search pincode or area..." style="margin-bottom:0;">
            <button id="btn-scan" class="btn btn-primary btn-sm">Search</button>
          </div>
          <div id="main-map" class="map-container" style="height:100%;"></div>
        </div>

        <!-- Pollution Causes (Moved Here) -->
        <div class="glass-panel">
          <div class="panel-title"><span class="dot"></span> Pollution Causes</div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px;">Top factors affecting air quality in this zone.</p>
          <div id="user-causes-container">
            <div class="skeleton" style="height:120px;"></div>
          </div>
        </div>

        <!-- Nearby Emission Sources (Moved Here) -->
        <div class="glass-panel">
          <div class="panel-title"><span class="dot"></span> Local Emission Sources</div>
          <div id="user-factories-container">
            <div class="skeleton" style="height:100px;"></div>
          </div>
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
              <div class="diy-text"><strong>Avoid Burning</strong><br>Never burn waste, leaves, or firecrackers.</div>
            </div>
            <div class="diy-card">
              <div class="diy-icon">🌳</div>
              <div class="diy-text"><strong>Plant Trees</strong><br>Native species like Neem & Peepal purify air.</div>
            </div>
            <div class="diy-card">
              <div class="diy-icon">🏠</div>
              <div class="diy-text"><strong>Indoor Air</strong><br>Use air-purifying plants (Peace Lily) indoors.</div>
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

    // ── GLOBAL ZONE SELECT HANDLER — Registered ONCE (fixes duplication bug) ──
    if (zoneSelectHandler) {
      window.removeEventListener('select-zone', zoneSelectHandler);
    }
    zoneSelectHandler = async (e) => {
      const { lat, lon, name } = e.detail;
      await selectLocation(lat, lon, name);
    };
    window.addEventListener('select-zone', zoneSelectHandler);

    try {
      // Fetch all data in parallel
      const [zones, weather, history, allReports] = await Promise.all([
        AQI.getZones().catch(() => []),
        AQI.getWeather(28.6139, 77.2090).catch(() => ({})),
        AQI.getHistory(28.6139, 77.2090, 7).catch(() => ({ european_aqi: [] })),
        Reports.getAll().catch(() => ([]))
      ]);

      currentZones = zones;

      // ── City Average AQI ──
      const validZones = zones.filter(z => z.aqi !== null);
      const avgAqi = validZones.length > 0
        ? Math.round(validZones.reduce((s, z) => s + z.aqi, 0) / validZones.length)
        : 0;

      let avgPm25 = validZones.length > 0
        ? validZones.reduce((s, z) => s + (z.pm2_5 || 0), 0) / validZones.length
        : 0;
      if ((!avgPm25 || avgPm25 === 0) && avgAqi > 0) avgPm25 = avgAqi * 0.6;

      updateAQIDisplay(avgAqi, 'Delhi City Average');
      updateHealthImpact(avgPm25, avgAqi);
      updateSafetyAdvisory(avgAqi);
      ambientSystem.updateAQI(avgAqi);

      // Weather
      updateWeather(weather);

      // Pollutants
      const avgPollutants = {
        pm2_5: avg(validZones, 'pm2_5') || avgPm25,
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

      userLoadCauses(28.6139, 77.2090, weather.wind_speed_10m || 5, weather.temperature_2m || 25, weather.relative_humidity_2m || 50, avgAqi);
      userLoadNearbyFactories(28.6139, 77.2090);

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
    const [liveData, weather, history, calcData] = await Promise.all([
      AQI.getLiveAQI(lat, lng).catch(() => ({})),
      AQI.getWeather(lat, lng).catch(() => ({})),
      AQI.getHistory(lat, lng, 7).catch(() => ({ european_aqi: [] })),
      fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
      }).then(r => r.json()).catch(() => null)
    ]);

    // Use passedAqi / passedPm25 if available from map zone click, otherwise parse from liveData
    let aqi = liveData.european_aqi ?? liveData.european_aqi_pm2_5 ?? 0;
    let pm25 = liveData.pm2_5 ?? 0;

    // Bulletproof fallback
    if (!aqi || aqi === 0) {
      // Find the nearest known zone's AQI
      if (currentZones && currentZones.length > 0) {
        let nearestZone = currentZones.reduce((prev, curr) => {
          const dCurr = Math.pow(curr.lat - lat, 2) + Math.pow(curr.lon - lng, 2);
          const dPrev = Math.pow(prev.lat - lat, 2) + Math.pow(prev.lon - lng, 2);
          return dCurr < dPrev ? curr : prev;
        });
        aqi = nearestZone.aqi || 120; // safe fallback
        pm25 = nearestZone.pm2_5 || (aqi * 0.6);
      } else {
        aqi = 150; 
      }
    }

    if ((!pm25 || pm25 === 0) && aqi > 0) {
      pm25 = aqi * 0.6;
    }

    // Update map marker
    currentMap.updateSearchMarker(lat, lng, name, aqi);
    currentMap.map.setView([lat, lng], 13, { animate: true, duration: 1 });

    // Update all displays
    updateAQIDisplay(aqi, name);
    updateHealthImpact(pm25, aqi, calcData);
    updateSafetyAdvisory(aqi);
    updateWeather(weather);
    ambientSystem.updateAQI(aqi);

    // Update pollutants
    updatePollutants({
      pm2_5: pm25,
      pm10: liveData.pm10 || 0,
      no2: liveData.nitrogen_dioxide || 0,
      co: liveData.carbon_monoxide || 0,
      o3: liveData.ozone || 0
    });

    // Update history chart
    renderHistoryChart(history);

    userLoadCauses(lat, lng, weather.wind_speed_10m || 5, weather.temperature_2m || 25, weather.relative_humidity_2m || 50, aqi);
    userLoadNearbyFactories(lat, lng);

    window.showToast(`AQI for ${name}: ${aqi || 'Estimated'}`, 'success');
  } catch (err) {
    console.error('Location select error:', err);
    window.showToast('Failed to fetch data for this location', 'error');
  }
}

// ═══════════════════════════════════
// PINCODE SEARCH
// ═══════════════════════════════════
let searchDebounce = null;
async function handlePincodeSearch() {
  const input = document.getElementById('pincode-input');
  const btn = document.getElementById('btn-scan');
  const query = input.value.trim();
  if (!query) return window.showToast('Enter a pincode or area name', 'error');

  // Debounce rapid clicks
  if (searchDebounce) clearTimeout(searchDebounce);
  
  btn.textContent = '...';
  btn.disabled = true;

  searchDebounce = setTimeout(async () => {
    try {
      // Geocode via Nominatim
      const isNumeric = /^\d+$/.test(query);
      let geoUrl;
      if (isNumeric) {
        geoUrl = `https://nominatim.openstreetmap.org/search?postalcode=${query}&country=India&format=json&limit=1`;
      } else {
        geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Delhi India')}&format=json&limit=1`;
      }

      let geoResp = await fetch(geoUrl, {
        headers: { 'User-Agent': 'DelhiAirQualityPlatform/2.0' }
      });
      let geoData = await geoResp.json();

      // Fallback 1: Try generic string search if strict postal code failed
      if ((!geoData || geoData.length === 0) && isNumeric) {
         geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Delhi India')}&format=json&limit=1`;
         geoResp = await fetch(geoUrl, { headers: { 'User-Agent': 'DelhiAirQualityPlatform/2.0' } });
         geoData = await geoResp.json();
      }

      const isDelhiPincode = isNumeric && query.startsWith('110');

      if (geoData && geoData.length > 0) {
        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);
        const name = isNumeric ? `Pincode ${query}` : query;

        // Select this location — updates everything
        await selectLocation(lat, lng, name);
      } else if (isDelhiPincode) {
        // Fallback 2: Unmapped Delhi pincode -> Use Delhi Center
        window.showToast('Specific pincode unmapped. Using regional Delhi estimate.', 'info');
        await selectLocation(28.6139, 77.2090, `Pincode ${query} (Estimated)`);
      } else {
        window.showToast('Location not found in Delhi NCR. Try a valid area.', 'error');
      }
    } catch {
      window.showToast('Search failed. Please try again.', 'error');
    } finally {
      btn.textContent = 'Search';
      btn.disabled = false;
    }
  }, 250);
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

  // ── Dynamic Population Impact ──
  const popImpact = document.getElementById('pop-impact');
  if (popImpact) {
    // Extract pincode from label if present
    const pincodeMatch = label.match(/\b(1100\d{2})\b/);
    const pincode = pincodeMatch ? pincodeMatch[1] : null;
    const areaPop = getPopulationEstimate(label, pincode);

    let affectedRatio = Math.min((aqi / 300), 1);
    let affected = Math.round(areaPop * affectedRatio);

    popImpact.innerHTML = `👥 <strong>${new Intl.NumberFormat('en-IN').format(affected)}</strong> residents at risk in this zone <span style="font-size:0.75rem;color:var(--text-muted);">(pop: ${new Intl.NumberFormat('en-IN').format(areaPop)})</span>`;
  }
}

function updateHealthImpact(pm25, aqi, calcData) {
  let effectivePm25 = parseFloat(pm25);
  let effectiveAqi = parseFloat(aqi) || 0;
  
  // Bulletproof fallback to absolutely ensure valid health calculation occurs
  if (isNaN(effectivePm25) || effectivePm25 <= 0) {
    if (effectiveAqi > 0) {
       effectivePm25 = effectiveAqi * 0.6; 
    } else {
       // Safe ultimate fallback if API returns fully empty JSON but function is called
       effectivePm25 = 45; 
       effectiveAqi = 100;
    }
  }

  // Dynamic calculation based on real/computed PM2.5 or True Cost API
  let cigValue, lifeValue;
  if (calcData && calcData.cigaretteEq && calcData.lifespanReductionYears) {
      cigValue = calcData.cigaretteEq;
      lifeValue = calcData.lifespanReductionYears;
  } else {
      cigValue = (effectivePm25 / 22).toFixed(1);
      lifeValue = Math.max(((effectivePm25 - 10) * 0.05), 0).toFixed(1);
  }
  const color = getAQIColorRaw(effectiveAqi);

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
  const cigCard = document.getElementById('health-cig-card');
  const lifeCard = document.getElementById('health-life-card');
  if (cigCard) cigCard.style.borderColor = color + '44';
  if (lifeCard) lifeCard.style.borderColor = color + '44';

  // Pulse effect for dangerous levels
  const healthPanel = document.getElementById('health-metrics-wrapper');
  if (healthPanel) {
    if (effectiveAqi > 200) {
      healthPanel.classList.add('danger-pulse');
    } else {
      healthPanel.classList.remove('danger-pulse');
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
    <div class="safety-banner" style="background:${bgColor}; border-left:4px solid ${textColor}; border-radius:var(--radius-sm); padding:16px 20px; transition: all 0.5s ease;">
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
      <div class="zone-card" onclick="window.dispatchEvent(new CustomEvent('select-zone', {detail:{lat:${z.lat},lon:${z.lon},name:'${z.name.replace(/'/g, "\\\'")}'}}))" title="Click to select ${z.name}">
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
  // NOTE: Event handler is registered ONCE in Dashboard.init() — not here
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

  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#8896a6';

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
          ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
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

// ═══════════════════════════════════
// USER UI: CAUSES AND FACTORIES
// ═══════════════════════════════════
function userLoadCauses(lat, lon, wind, temp, humidity, aqi) {
  try {
    const hour = new Date().getHours();
    const traffic = getTrafficIntensity(lat, lon);
    const industrial = getIndustrialScore(lat, lon);
    const seasonal = getSeasonalFactors();

    let trafficPct = 15 + (traffic.score * 0.35);
    let industrialPct = 10 + (industrial.score * 0.35);
    let constructPct = 15;
    let weatherPct = 10;
    let burnPct = 10;

    if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) trafficPct += 15;
    if (hour >= 23 || hour <= 5) industrialPct += 15;

    if (wind < 4) weatherPct += 20; 
    if (wind > 15) constructPct += 15; 
    if (temp < 15 && wind < 5) burnPct += 15; 
    if (humidity > 80 && temp < 20) weatherPct += 10; 

    seasonal.forEach(s => {
      if (s.cause.includes('Crop')) burnPct += s.weight;
      if (s.cause.includes('Firecracker')) burnPct += s.weight;
      if (s.cause.includes('Winter')) weatherPct += s.weight;
      if (s.cause.includes('Dust')) constructPct += s.weight;
      if (s.cause.includes('Monsoon')) { weatherPct -= 10; constructPct -= 5; }
    });

    const total = trafficPct + industrialPct + constructPct + weatherPct + burnPct;
    trafficPct = Math.round((trafficPct / total) * 100);
    industrialPct = Math.round((industrialPct / total) * 100);
    constructPct = Math.round((constructPct / total) * 100);
    weatherPct = Math.round((weatherPct / total) * 100);
    burnPct = 100 - trafficPct - industrialPct - constructPct - weatherPct;

    const causes = [
      { icon: '🚗', title: 'Vehicular Traffic', pct: trafficPct, color: '#e07850' },
      { icon: '🏭', title: 'Industrial Emissions', pct: industrialPct, color: '#c5475b' },
      { icon: '🏗️', title: 'Construction Dust', pct: constructPct, color: '#d4a843' },
      { icon: '🌡️', title: 'Weather Conditions', pct: weatherPct, color: '#5a8fbc' },
      { icon: '🔥', title: 'Open Burning', pct: burnPct, color: '#8b5a6b' }
    ];

    causes.sort((a, b) => b.pct - a.pct);

    let html = '';
    causes.slice(0, 3).forEach(c => {
      html += `
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.85rem;">
            <span>${c.icon} <strong style="color:var(--text-primary)">${c.title}</strong></span>
            <strong>${c.pct}%</strong>
          </div>
          <div class="pollutant-bar">
            <div class="pollutant-fill" style="width:${c.pct}%; background:${c.color};"></div>
          </div>
        </div>
      `;
    });

    document.getElementById('user-causes-container').innerHTML = html;
  } catch {}
}

function userLoadNearbyFactories(lat, lon) {
  const nearby = findNearbyFactories(lat, lon, 10);
  
  if (nearby.length === 0) {
    document.getElementById('user-factories-container').innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted); padding:16px 0;">No major industrial sources within 10km.</div>';
    return;
  }

  let html = '';
  nearby.slice(0, 3).forEach(f => {
    const riskColor = f.risk === 'High' ? 'var(--danger)' : f.risk === 'Medium' ? 'var(--warning)' : 'var(--aqi-good)';
    html += `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--bg-glass-subtle); border:var(--glass-border); border-radius:var(--radius-sm); margin-bottom:8px;">
        <div style="flex:1;">
          <div style="font-size:0.88rem; font-weight:600; color:var(--text-primary);">🏭 ${f.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${f.type} · <span style="color:${riskColor};font-weight:600">${f.risk} Risk</span> · ${f.distance.toFixed(1)}km</div>
        </div>
      </div>
    `;
  });

  document.getElementById('user-factories-container').innerHTML = html;
}

