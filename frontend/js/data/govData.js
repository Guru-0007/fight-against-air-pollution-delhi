// ═══════════════════════════════════════════════
// DELHI COMPREHENSIVE DATA MODULE
// Factories, Traffic, Population, Seasonal Data
// ═══════════════════════════════════════════════

// ── Known Industrial Emission Sources ──
export const FACTORIES = [
  { name: 'Okhla Waste-to-Energy Plant', lat: 28.5300, lon: 77.2900, type: 'Waste Incineration', risk: 'High', email: 'environment@okhla-wte.in' },
  { name: 'Bawana Industrial Hub', lat: 28.8021, lon: 77.0375, type: 'Mixed Industrial', risk: 'High', email: 'admin@bawana-industries.in' },
  { name: 'Wazirpur Industrial Area', lat: 28.6953, lon: 77.1663, type: 'Steel & Metalworks', risk: 'High', email: 'compliance@wazirpurmetal.com' },
  { name: 'Mundka Industrial Area', lat: 28.6839, lon: 77.0321, type: 'Manufacturing', risk: 'Medium', email: 'contact@mundkaindustries.in' },
  { name: 'Anand Parbat Industrial Area', lat: 28.6426, lon: 77.1909, type: 'Mixed Industrial', risk: 'Medium', email: 'environment@anandparbat.com' },
  { name: 'Mayapuri Scrap Market', lat: 28.6216, lon: 77.1360, type: 'Scrap & Recycling', risk: 'Medium', email: 'compliance@mayapuriscrap.in' },
  { name: 'Naraina Industrial Area', lat: 28.6282, lon: 77.1448, type: 'Manufacturing', risk: 'Medium', email: 'ops@narainamanufacturing.com' },
  { name: 'Badarpur (Legacy Thermal Site)', lat: 28.5042, lon: 77.3060, type: 'Legacy Thermal Power', risk: 'Low', email: 'site-manager@badarpur-thermal.in' },
  { name: 'GT Karnal Road Industrial Belt', lat: 28.7500, lon: 77.1500, type: 'Mixed Manufacturing', risk: 'High', email: 'ops@gtkr-industries.in' },
  { name: 'Jhilmil Industrial Area', lat: 28.6700, lon: 77.3100, type: 'Plastics & Chemicals', risk: 'High', email: 'compliance@jhilmilindustries.com' },
  { name: 'Patparganj Industrial Area', lat: 28.6250, lon: 77.2900, type: 'Electronics & Manufacturing', risk: 'Medium', email: 'admin@patparganjmfg.in' },
  { name: 'Shahdara Industrial Complex', lat: 28.6800, lon: 77.2900, type: 'Mixed Industrial', risk: 'Medium', email: 'contact@shahdaraindustries.in' },
  { name: 'Kirti Nagar Industrial Area', lat: 28.6500, lon: 77.1500, type: 'Furniture & Woodworks', risk: 'Low', email: 'compliance@kirtinagarhub.com' },
  { name: 'Lawrence Road Industrial Area', lat: 28.6900, lon: 77.1300, type: 'Mixed Manufacturing', risk: 'Medium', email: 'admin@lawrenceroadind.in' },
  { name: 'Badli Industrial Area', lat: 28.7300, lon: 77.1400, type: 'Auto Parts & Metal', risk: 'Medium', email: 'environment@badli.in' }
];

// ── Traffic Hotspots & Corridors ──
export const TRAFFIC_ZONES = [
  { name: 'ITO Junction', lat: 28.6284, lon: 77.2405, intensity: 'Extreme', peakHours: [8,9,10,17,18,19,20] },
  { name: 'Connaught Place Ring', lat: 28.6315, lon: 77.2167, intensity: 'High', peakHours: [9,10,11,17,18,19] },
  { name: 'AIIMS Flyover', lat: 28.5672, lon: 77.2100, intensity: 'High', peakHours: [8,9,10,17,18,19,20] },
  { name: 'Ashram Chowk', lat: 28.5714, lon: 77.2510, intensity: 'Extreme', peakHours: [8,9,10,11,17,18,19,20] },
  { name: 'Kashmere Gate ISBT', lat: 28.6685, lon: 77.2295, intensity: 'High', peakHours: [7,8,9,18,19,20,21] },
  { name: 'Dhaula Kuan', lat: 28.5916, lon: 77.1660, intensity: 'Extreme', peakHours: [8,9,10,17,18,19,20] },
  { name: 'Nehru Place', lat: 28.5494, lon: 77.2528, intensity: 'High', peakHours: [9,10,17,18,19] },
  { name: 'Anand Vihar ISBT', lat: 28.6469, lon: 77.3159, intensity: 'Extreme', peakHours: [7,8,9,17,18,19,20,21] },
  { name: 'Moolchand Flyover', lat: 28.5686, lon: 77.2350, intensity: 'High', peakHours: [8,9,10,17,18,19] },
  { name: 'Rajouri Garden', lat: 28.6495, lon: 77.1220, intensity: 'Medium', peakHours: [9,10,18,19] },
  { name: 'Sarai Kale Khan', lat: 28.5900, lon: 77.2530, intensity: 'Extreme', peakHours: [7,8,9,10,17,18,19,20,21] },
  { name: 'Ring Road (South)', lat: 28.5500, lon: 77.2200, intensity: 'High', peakHours: [8,9,10,17,18,19,20] },
  { name: 'Outer Ring Road (North)', lat: 28.7200, lon: 77.1100, intensity: 'High', peakHours: [8,9,17,18,19] },
  { name: 'NH-24 Ghaziabad Border', lat: 28.6300, lon: 77.3500, intensity: 'Extreme', peakHours: [7,8,9,10,17,18,19,20,21] },
  { name: 'GT Road Corridor', lat: 28.7000, lon: 77.1500, intensity: 'High', peakHours: [8,9,10,17,18,19] }
];

// ── Delhi Zone Population (pincode prefix → approx population) ──
// Based on Census 2011 projections extended to 2026
export const POPULATION_BY_PINCODE = {
  '110001': 185000, '110002': 172000, '110003': 168000, '110004': 45000,
  '110005': 195000, '110006': 210000, '110007': 155000, '110008': 140000,
  '110009': 125000, '110010': 148000, '110011': 162000, '110012': 98000,
  '110013': 175000, '110014': 165000, '110015': 220000, '110016': 135000,
  '110017': 110000, '110018': 142000, '110019': 195000, '110020': 205000,
  '110021': 118000, '110022': 160000, '110023': 145000, '110024': 178000,
  '110025': 215000, '110026': 132000, '110027': 189000, '110028': 210000,
  '110029': 155000, '110030': 168000, '110031': 245000, '110032': 385000,
  '110033': 310000, '110034': 175000, '110035': 265000, '110036': 230000,
  '110037': 180000, '110038': 190000, '110039': 275000, '110040': 155000,
  '110041': 290000, '110042': 310000, '110043': 215000, '110044': 340000,
  '110045': 365000, '110046': 195000, '110047': 165000, '110048': 130000,
  '110049': 112000, '110050': 155000, '110051': 375000, '110052': 288000,
  '110053': 265000, '110054': 225000, '110055': 340000, '110056': 290000,
  '110057': 142000, '110058': 365000, '110059': 285000, '110060': 210000,
  '110061': 175000, '110062': 195000, '110063': 230000, '110064': 265000,
  '110065': 188000, '110066': 195000, '110067': 142000, '110068': 168000,
  '110069': 175000, '110070': 210000, '110071': 178000, '110072': 155000,
  '110073': 245000, '110074': 168000, '110075': 205000, '110076': 310000,
  '110077': 155000, '110078': 185000, '110079': 142000, '110080': 112000,
  '110081': 285000, '110082': 245000, '110083': 275000, '110084': 310000,
  '110085': 340000, '110086': 285000, '110087': 210000, '110088': 195000,
  '110089': 142000, '110090': 265000, '110091': 355000, '110092': 415000,
  '110093': 295000, '110094': 235000, '110095': 265000, '110096': 185000,
  '110097': 130000
};

// ── Zone-level population (area → population) ──
export const POPULATION_BY_ZONE = {
  'Anand Vihar': 485000, 'Punjabi Bagh': 310000, 'ITO': 225000,
  'R.K. Puram': 195000, 'Dwarka Sec-8': 450000, 'Rohini': 620000,
  'Narela': 185000, 'Okhla Phase-2': 285000, 'IGI Airport T3': 95000,
  'Lodhi Road': 145000, 'Bawana': 175000, 'Mundka': 265000,
  'Nehru Nagar': 210000, 'Wazirpur': 195000, 'Vivek Vihar': 385000,
  // Broader areas
  'North Delhi': 3800000, 'South Delhi': 2800000, 'East Delhi': 1750000,
  'West Delhi': 2540000, 'Central Delhi': 640000, 'New Delhi': 250000,
  'North-West Delhi': 3650000, 'South-West Delhi': 2290000,
  'South-East Delhi': 1390000, 'North-East Delhi': 2240000, 'Shahdara': 1650000,
  'Delhi City Average': 32000000, 'Delhi': 32000000
};

// ── Seasonal Pollution Factors ──
export function getSeasonalFactors() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  const factors = [];

  // Crop burning season (Oct 15 - Nov 30)
  if ((month === 9 && day >= 15) || month === 10) {
    factors.push({ cause: 'Crop Stubble Burning', weight: 35, icon: '🌾', detail: 'Active crop burning season in Punjab/Haryana — smoke drifts into Delhi' });
  }

  // Diwali period (flexible — approximate Oct-Nov window)
  if (month === 9 || month === 10) {
    factors.push({ cause: 'Firecracker Emissions', weight: 15, icon: '🎆', detail: 'Festival season — increased firecracker-related particulate matter' });
  }

  // Winter inversion (Dec - Feb)
  if (month >= 11 || month <= 1) {
    factors.push({ cause: 'Winter Thermal Inversion', weight: 25, icon: '🌫️', detail: 'Cold temperatures trap pollutants close to ground, preventing dispersal' });
  }

  // Summer dust storms (May - June)
  if (month === 4 || month === 5) {
    factors.push({ cause: 'Dust Storms', weight: 20, icon: '💨', detail: 'Hot-weather dust storms from Rajasthan carry particulate matter into Delhi' });
  }

  // Monsoon washout (Jul - Sep) — GOOD factor
  if (month >= 6 && month <= 8) {
    factors.push({ cause: 'Monsoon Washout', weight: -20, icon: '🌧️', detail: 'Rain washes away pollutants — air quality typically improves' });
  }

  return factors;
}

// ── Helper: Distance between two lat/lng points (km) ──
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Find nearby factories within radius (km) ──
export function findNearbyFactories(lat, lon, radiusKm = 5) {
  return FACTORIES
    .map(f => ({ ...f, distance: haversineDistance(lat, lon, f.lat, f.lon) }))
    .filter(f => f.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// ── Find nearby traffic zones within radius ──
export function findNearbyTraffic(lat, lon, radiusKm = 3) {
  const hour = new Date().getHours();
  return TRAFFIC_ZONES
    .map(t => ({
      ...t,
      distance: haversineDistance(lat, lon, t.lat, t.lon),
      isCurrentlyPeak: t.peakHours.includes(hour)
    }))
    .filter(t => t.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// ── Get population for a location name or pincode ──
export function getPopulationEstimate(locationName, pincode = null) {
  // Try exact pincode match
  if (pincode && POPULATION_BY_PINCODE[pincode]) {
    return POPULATION_BY_PINCODE[pincode];
  }

  // Try zone name match
  for (const [zone, pop] of Object.entries(POPULATION_BY_ZONE)) {
    if (locationName.toLowerCase().includes(zone.toLowerCase())) {
      return pop;
    }
  }

  // Try pincode extraction from location string
  const pincodeMatch = locationName.match(/\b(1100\d{2})\b/);
  if (pincodeMatch && POPULATION_BY_PINCODE[pincodeMatch[1]]) {
    return POPULATION_BY_PINCODE[pincodeMatch[1]];
  }

  // Fallback: estimate based on Delhi average density
  // Delhi: ~32M people in ~1483 sq km → ~21,578 per sq km
  // Assume a 5km radius zone = ~78.5 sq km → ~1.7M
  return 250000; // Conservative zone-level estimate
}

// ── Compute traffic intensity score (0-100) ──
export function getTrafficIntensity(lat, lon) {
  const nearby = findNearbyTraffic(lat, lon, 4);
  if (nearby.length === 0) return { score: 15, label: 'Low', detail: 'No major traffic corridors nearby' };

  let score = 0;
  const hour = new Date().getHours();

  nearby.forEach(t => {
    const proxBonus = Math.max(0, (4 - t.distance) / 4) * 25; // Closer = more impact
    const peakBonus = t.isCurrentlyPeak ? 25 : 5;
    const intensityBonus = t.intensity === 'Extreme' ? 15 : t.intensity === 'High' ? 10 : 5;
    score += proxBonus + peakBonus + intensityBonus;
  });

  score = Math.min(Math.round(score), 100);

  let label = 'Low';
  if (score > 70) label = 'Extreme';
  else if (score > 50) label = 'High';
  else if (score > 30) label = 'Moderate';

  const peakZones = nearby.filter(t => t.isCurrentlyPeak);
  const detail = peakZones.length > 0
    ? `${peakZones.length} zone(s) at peak traffic: ${peakZones.map(t => t.name).join(', ')}`
    : `${nearby.length} traffic corridor(s) nearby, currently off-peak`;

  return { score, label, detail, zones: nearby };
}

// ── Compute industrial proximity score (0-100) ──
export function getIndustrialScore(lat, lon) {
  const nearby = findNearbyFactories(lat, lon, 8);
  if (nearby.length === 0) return { score: 5, label: 'Minimal', detail: 'No major industrial sources within 8km', factories: [] };

  let score = 0;
  nearby.forEach(f => {
    const proxBonus = Math.max(0, (8 - f.distance) / 8) * 20;
    const riskBonus = f.risk === 'High' ? 20 : f.risk === 'Medium' ? 10 : 5;
    score += proxBonus + riskBonus;
  });

  score = Math.min(Math.round(score), 100);

  let label = 'Minimal';
  if (score > 60) label = 'High';
  else if (score > 35) label = 'Moderate';
  else if (score > 15) label = 'Low';

  return {
    score, label,
    detail: `${nearby.length} industrial source(s) within 8km — nearest: ${nearby[0].name} (${nearby[0].distance.toFixed(1)}km)`,
    factories: nearby
  };
}

// ── Report Status Labels (friendly user-facing text) ──
export const REPORT_STATUS_LABELS = {
  'pending': { label: 'Submitted — Awaiting Review', icon: '📋', color: 'var(--warning)', badge: 'badge-accent' },
  'under_review': { label: 'Your report is being reviewed', icon: '🔍', color: 'var(--accent)', badge: 'badge-accent' },
  'action_in_progress': { label: 'Action has been initiated', icon: '⚡', color: '#5a8fbc', badge: 'badge-accent' },
  'resolved': { label: 'Issue resolved', icon: '✅', color: 'var(--success)', badge: 'badge-success' },
  'valid': { label: 'Verified report', icon: '✓', color: 'var(--success)', badge: 'badge-success' },
  'fake': { label: 'Report could not be verified', icon: '✕', color: 'var(--danger)', badge: 'badge-danger' }
};
