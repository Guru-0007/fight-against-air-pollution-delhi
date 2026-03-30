import { getAQIColorRaw } from '../utils.js';
import { FACTORIES } from '../data/govData.js';
import { getUser } from '../utils.js';

export class AQIMap {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.heatLayer = null;
    this.markers = [];
    this.searchMarker = null;
    this.onLocationSelect = null; // callback for location selection
  }

  init(lat = 28.6139, lng = 77.2090, zoom = 11) {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }

    const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const attribution = '&copy; <a href="https://www.openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>';

    this.map = L.map(this.containerId, {
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: true
    }).setView([lat, lng], zoom);

    L.tileLayer(tileUrl, {
      attribution,
      subdomains: 'abcd',
      maxZoom: 18
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    const el = document.getElementById(this.containerId);
    if (el) el.style.pointerEvents = 'auto';

    // ── MAP CLICK HANDLER ──
    // Click anywhere on the map to select that location
    this.map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this._placeSearchMarker(lat, lng, 'Selected Location');
      if (this.onLocationSelect) {
        this.onLocationSelect(lat, lng, 'Custom Location');
      }
    });

    setTimeout(() => this.map.invalidateSize(), 200);
  }

  // Place or move the search/selection marker
  _placeSearchMarker(lat, lng, label, aqi = null) {
    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
    }

    const color = aqi ? getAQIColorRaw(aqi) : '#5a8fbc';
    const displayValue = aqi || '?';

    const icon = L.divIcon({
      className: 'search-marker',
      html: `<div style="
        width:46px; height:46px;
        background:white;
        border:3px solid ${color};
        border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-family:'Inter',sans-serif; font-size:13px; font-weight:800;
        color:${color};
        box-shadow:0 4px 20px rgba(0,0,0,0.18), 0 0 0 6px ${color}33;
        animation: markerPulse 2s infinite;
      ">${displayValue}</div>`,
      iconSize: [46, 46],
      iconAnchor: [23, 23]
    });

    this.searchMarker = L.marker([lat, lng], { icon }).addTo(this.map);
    this.searchMarker.bindTooltip(
      `<b>${label}</b>${aqi ? `<br><span style="color:${color};font-weight:700">AQI: ${aqi}</span>` : '<br>Fetching AQI...'}`,
      { className: 'aqi-tooltip', direction: 'top', offset: [0, -26] }
    );
  }

  // Update the search marker with AQI data
  updateSearchMarker(lat, lng, label, aqi) {
    this.map.eachLayer((layer) => {
      if (typeof layer.closeTooltip === 'function') {
        layer.closeTooltip();
      }
    });
    this._placeSearchMarker(lat, lng, label, aqi);
    setTimeout(() => {
        if (this.searchMarker && this.searchMarker.getTooltip()) {
             this.searchMarker.openTooltip();
        }
    }, 50);
  }

  addZones(zones) {
    this.clearMarkers();
    const heatData = [];

    zones.forEach(zone => {
      const aqi = parseInt(zone.aqi);
      if (isNaN(aqi)) return;

      const color = getAQIColorRaw(aqi);
      heatData.push([zone.lat, zone.lon, Math.min(aqi / 300, 1)]);

      const icon = L.divIcon({
        className: 'aqi-map-marker',
        html: `<div style="
          width: 38px; height: 38px;
          background: rgba(255,255,255,0.88);
          border: 2.5px solid ${color};
          color: ${color};
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12), 0 0 0 4px ${color}22;
          transition: transform 0.25s, box-shadow 0.25s;
          cursor: pointer;
        " onmouseenter="this.style.transform='scale(1.2)'; this.style.boxShadow='0 4px 20px rgba(0,0,0,0.2), 0 0 0 6px ${color}33'"
           onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 10px rgba(0,0,0,0.12), 0 0 0 4px ${color}22'"
        >${aqi}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const marker = L.marker([zone.lat, zone.lon], { icon }).addTo(this.map);

      let tooltipContent = `<b>${zone.name}</b><br><span style="color:${color};font-weight:700">AQI: ${aqi}</span>`;
      if (zone.pm2_5) tooltipContent += `<br>PM2.5: ${Math.round(zone.pm2_5)} µg/m³`;
      if (zone.pm10) tooltipContent += `<br>PM10: ${Math.round(zone.pm10)} µg/m³`;
      tooltipContent += `<br><span style="opacity:0.6">${zone.area}</span>`;
      tooltipContent += `<br><span style="font-size:0.72rem;color:var(--accent-text);">Click to select this zone</span>`;

      marker.bindTooltip(tooltipContent, {
        className: 'aqi-tooltip',
        direction: 'top',
        offset: [0, -22]
      });

      // Click on zone marker → select that location
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.onLocationSelect) {
          this.onLocationSelect(zone.lat, zone.lon, zone.name);
        }
      });

      this.markers.push(marker);
    });

    // Heatmap
    if (heatData.length > 0 && typeof L.heatLayer !== 'undefined') {
      if (this.heatLayer) this.map.removeLayer(this.heatLayer);

      this.heatLayer = L.heatLayer(heatData, {
        radius: 40,
        blur: 35,
        maxZoom: 14,
        gradient: {
          0.1: 'rgba(72, 187, 120, 0.8)',
          0.3: 'rgba(148, 200, 100, 0.8)',
          0.5: 'rgba(212, 168, 67, 0.8)',
          0.7: 'rgba(224, 120, 80, 0.8)',
          0.9: 'rgba(197, 71, 91, 0.8)',
          1.0: 'rgba(139, 90, 107, 0.9)'
        }
      }).addTo(this.map);
    }
  }

  addVulnerableZones() {
    const zones = [
      { name: 'AIIMS Hospital', lat: 28.5672, lon: 77.2100, type: 'Hospital' },
      { name: 'Safdarjung Hospital', lat: 28.5686, lon: 77.2066, type: 'Hospital' },
      { name: 'GTB Hospital', lat: 28.6832, lon: 77.3110, type: 'Hospital' },
      { name: 'Delhi University', lat: 28.6889, lon: 77.2094, type: 'School' },
      { name: 'JNU Campus', lat: 28.5402, lon: 77.1674, type: 'School' },
      { name: 'IIT Delhi', lat: 28.5459, lon: 77.1926, type: 'School' }
    ];

    zones.forEach(z => {
      const icon = L.divIcon({
        className: 'vuln-marker',
        html: `<div style="
          font-size: 16px;
          width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.9);
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        ">${z.type === 'Hospital' ? '🏥' : '🏫'}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      L.marker([z.lat, z.lon], { icon }).addTo(this.map)
        .bindTooltip(`<b>${z.name}</b><br><span style="opacity:0.6">${z.type} — Vulnerable Zone</span>`, {
          className: 'aqi-tooltip',
          direction: 'top'
        });
    });
  }

  addFactories() {
    const factories = [
      { name: 'Okhla Waste-to-Energy Plant', lat: 28.5300, lon: 77.2900, type: 'Waste Incineration' },
      { name: 'Badarpur Area (Ex-Thermal)', lat: 28.5042, lon: 77.3060, type: 'Legacy Thermal Power' },
      { name: 'Bawana Industrial Hub', lat: 28.8021, lon: 77.0375, type: 'Mixed Industrial' },
      { name: 'Wazirpur Industrial Area', lat: 28.6953, lon: 77.1663, type: 'Steel & Metalworks' },
      { name: 'Mundka Industrial Area', lat: 28.6839, lon: 77.0321, type: 'Manufacturing' },
      { name: 'Anand Parbat Industrial Area', lat: 28.6426, lon: 77.1909, type: 'Mixed Industrial' },
      { name: 'Mayapuri Industrial Area', lat: 28.6216, lon: 77.1360, type: 'Scrap & Recycling' },
      { name: 'Naraina Industrial Area', lat: 28.6282, lon: 77.1448, type: 'Manufacturing' }
    ];

    factories.forEach(f => {
      const icon = L.divIcon({
        className: 'factory-marker',
        html: `<div style="
          font-size: 14px;
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(224, 120, 80, 0.15);
          border: 1.5px solid rgba(224, 120, 80, 0.5);
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(224, 120, 80, 0.25);
          cursor: pointer;
          transition: transform 0.2s;
        " onmouseenter="this.style.transform='scale(1.2)'" onmouseleave="this.style.transform='scale(1)'"
        >🏭</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([f.lat, f.lon], { icon }).addTo(this.map);
      
      const user = getUser();
      const isGov = user && user.type === 'gov';

      const tooltipAction = isGov ? '<br><span style="font-size:0.72rem;color:var(--accent-text);">Click to send notice</span>' : '<br><span style="font-size:0.72rem;color:var(--text-muted);">Industrial Emission Source</span>';

      marker.bindTooltip(
        `<b>🏭 ${f.name}</b><br><span style="color:var(--aqi-unhealthy);font-weight:500">${f.type}</span>${tooltipAction}`,
        { className: 'aqi-tooltip' }
      );

      // Click factory → open email (ONLY FOR GOV)
      if (isGov) {
        marker.on('click', () => {
          const subject = encodeURIComponent(`Pollution Compliance Notice — ${f.name}`);
          const body = encodeURIComponent(
            `To Whom It May Concern,\n\n` +
            `This is to bring to your attention suspected emission violations at:\n\n` +
            `Facility: ${f.name}\n` +
            `Type: ${f.type}\n` +
            `Location: ${f.lat}°N, ${f.lon}°E\n\n` +
            `The facility appears to be contributing to elevated pollution levels in the surrounding area. ` +
            `Immediate inspection and compliance verification is requested under the Air (Prevention and Control of Pollution) Act, 1981.\n\n` +
            `Please take necessary action.\n\nRegards`
          );
          window.open(`mailto:enforcement@dpcc.delhigovt.nic.in?subject=${subject}&body=${body}`, '_self');
          window.showToast('Email client opened for ' + f.name, 'success');
        });
      }
    });
  }

  addBlindSpots(zones = [], reports = []) {
    const spots = [];
    if (zones.length > 0) {
      zones.forEach(z => {
         if (z.aqi > 200) {
            const nearReports = reports.filter(r => {
               const dLat = Math.abs(r.lat - z.lat);
               const dLon = Math.abs(r.lng - z.lon);
               return (dLat < 0.05 && dLon < 0.05);
            });
            if (nearReports.length < 2) {
               spots.push({ lat: z.lat, lon: z.lon, radius: 3000, name: z.name });
            }
         }
      });
    } else {
      spots.push(
        { lat: 28.7041, lon: 76.9530, radius: 3500 },
        { lat: 28.61, lon: 77.02, radius: 3000 },
        { lat: 28.78, lon: 77.25, radius: 2500 }
      );
    }

    spots.forEach(s => {
      L.circle([s.lat, s.lon], {
        color: 'rgba(139, 90, 107, 0.4)',
        fillColor: 'rgba(139, 90, 107, 0.12)',
        fillOpacity: 1,
        radius: s.radius,
        weight: 1.5,
        dashArray: '6, 8'
      }).addTo(this.map)
        .bindTooltip(`<b>${s.name || 'Blind Spot'}</b><br><span style="color:var(--danger)">High pollution, low awareness area</span>`, { className: 'aqi-tooltip' });
    });
  }

  addWindOverlay(direction) {
    const icon = L.divIcon({
      className: 'wind-marker',
      html: `<div style="
        width: 48px; height: 48px;
        display: flex; align-items: center; justify-content: center;
        font-size: 28px;
        opacity: 0.2;
        transform: rotate(${direction}deg);
        pointer-events: none;
      ">↑</div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    L.marker([28.6139, 77.2090], { icon, interactive: false }).addTo(this.map);
  }

  clearMarkers() {
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];
  }
}
