import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const WAQI_TOKEN = '902b7ac23858848177471971c036b6ce7a0bf295';

// ── Delhi Zones: 15 monitoring points across the city ──
const DELHI_ZONES = [
  { name: 'Anand Vihar', lat: 28.6469, lon: 77.3159, area: 'East Delhi' },
  { name: 'Punjabi Bagh', lat: 28.6675, lon: 77.1353, area: 'West Delhi' },
  { name: 'ITO', lat: 28.6284, lon: 77.2405, area: 'Central Delhi' },
  { name: 'R.K. Puram', lat: 28.5654, lon: 77.1774, area: 'South-West Delhi' },
  { name: 'Dwarka Sec-8', lat: 28.5714, lon: 77.0687, area: 'South-West Delhi' },
  { name: 'Rohini', lat: 28.7320, lon: 77.1198, area: 'North-West Delhi' },
  { name: 'Narela', lat: 28.8466, lon: 77.0987, area: 'North Delhi' },
  { name: 'Okhla Phase-2', lat: 28.5298, lon: 77.2796, area: 'South-East Delhi' },
  { name: 'IGI Airport T3', lat: 28.5562, lon: 77.1000, area: 'South-West Delhi' },
  { name: 'Lodhi Road', lat: 28.5881, lon: 77.2185, area: 'Central Delhi' },
  { name: 'Bawana', lat: 28.8021, lon: 77.0375, area: 'North Delhi' },
  { name: 'Mundka', lat: 28.6839, lon: 77.0321, area: 'West Delhi' },
  { name: 'Nehru Nagar', lat: 28.6350, lon: 77.2570, area: 'Central Delhi' },
  { name: 'Wazirpur', lat: 28.6953, lon: 77.1663, area: 'North-West Delhi' },
  { name: 'Vivek Vihar', lat: 28.6733, lon: 77.3152, area: 'East Delhi' }
];

// Cache
const cache = {};
const CACHE_TTL = 300000; // 5 min

function getCacheKey(lat, lng) {
  return `${parseFloat(lat).toFixed(4)}_${parseFloat(lng).toFixed(4)}`;
}
function getCached(key) {
  if (cache[key] && Date.now() - cache[key].ts < CACHE_TTL) return cache[key].data;
  return null;
}
function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

// ── Convert PM2.5 AQI sub-index to concentration (µg/m³) ──
function pm25AqiToConcentration(aqi) {
  if (aqi <= 0) return 0;
  if (aqi <= 50) return aqi * 12.0 / 50.0;
  if (aqi <= 100) return 12.1 + (aqi - 51) * (35.4 - 12.1) / 49;
  if (aqi <= 150) return 35.5 + (aqi - 101) * (55.4 - 35.5) / 49;
  if (aqi <= 200) return 55.5 + (aqi - 151) * (150.4 - 55.5) / 49;
  if (aqi <= 300) return 150.5 + (aqi - 201) * (250.4 - 150.5) / 99;
  if (aqi <= 400) return 250.5 + (aqi - 301) * (350.4 - 250.5) / 99;
  return 350.5 + (aqi - 401) * (500.4 - 350.5) / 99;
}

// ── Fetch WAQI data for a lat/lng ──
async function fetchWAQI(lat, lng) {
  const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${WAQI_TOKEN}`;
  const resp = await fetch(url);
  const json = await resp.json();
  if (json.status !== 'ok') return null;
  return json.data;
}

// ── Transform WAQI data into our API response format ──
function transformWAQI(waqiData) {
  if (!waqiData) return null;

  const aqi = waqiData.aqi || 0;
  const iaqi = waqiData.iaqi || {};

  // Extract pollutant values (WAQI returns AQI sub-indices)
  const pm25_aqi = iaqi.pm25?.v || 0;
  const pm10_aqi = iaqi.pm10?.v || 0;
  const no2_val = iaqi.no2?.v || 0;
  const co_val = iaqi.co?.v || 0;
  const so2_val = iaqi.so2?.v || 0;
  const o3_val = iaqi.o3?.v || 0;

  // Convert PM2.5 sub-index to concentration
  const pm2_5 = pm25_aqi > 0 ? pm25AqiToConcentration(pm25_aqi) : (aqi > 0 ? aqi * 0.6 : 0);
  const pm10 = pm10_aqi > 0 ? pm10_aqi * 1.5 : 0; // approximate

  return {
    european_aqi: aqi,
    european_aqi_pm2_5: pm25_aqi,
    european_aqi_pm10: pm10_aqi,
    pm2_5: Math.round(pm2_5 * 10) / 10,
    pm10: Math.round(pm10),
    carbon_monoxide: co_val,
    nitrogen_dioxide: no2_val,
    sulphur_dioxide: so2_val,
    ozone: o3_val,
    station: waqiData.city?.name || 'Unknown',
    dominentpol: waqiData.dominentpol || 'pm25'
  };
}

// ── GET /live — Single point AQI ──
router.get('/live', async (req, res) => {
  const { lat = 28.6139, lng = 77.2090 } = req.query;
  const key = `live_${getCacheKey(lat, lng)}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  try {
    const waqiData = await fetchWAQI(lat, lng);
    const result = transformWAQI(waqiData);

    if (result) {
      setCache(key, result);
      return res.json(result);
    }

    // Fallback to Open-Meteo if WAQI fails
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi,european_aqi_pm2_5,european_aqi_pm10,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.current) {
      setCache(key, data.current);
      return res.json(data.current);
    }
    res.status(500).json({ error: 'AQI data unavailable' });
  } catch (err) {
    console.error('Live AQI error:', err.message);
    res.status(500).json({ error: 'Failed to fetch AQI data' });
  }
});

// ── GET /zones — Multi-zone AQI for all Delhi areas ──
router.get('/zones', async (req, res) => {
  const key = 'delhi_zones';
  const cached = getCached(key);
  if (cached) return res.json(cached);

  try {
    const promises = DELHI_ZONES.map(async (zone) => {
      try {
        const waqiData = await fetchWAQI(zone.lat, zone.lon);
        const transformed = transformWAQI(waqiData);

        if (transformed) {
          return {
            name: zone.name,
            area: zone.area,
            lat: zone.lat,
            lon: zone.lon,
            aqi: transformed.european_aqi,
            aqi_pm25: transformed.european_aqi_pm2_5,
            aqi_pm10: transformed.european_aqi_pm10,
            pm2_5: transformed.pm2_5,
            pm10: transformed.pm10,
            no2: transformed.nitrogen_dioxide,
            so2: transformed.sulphur_dioxide,
            co: transformed.carbon_monoxide,
            o3: transformed.ozone,
            station: transformed.station
          };
        }

        // Fallback to Open-Meteo
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${zone.lat}&longitude=${zone.lon}&current=european_aqi,european_aqi_pm2_5,european_aqi_pm10,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;
        const resp = await fetch(url);
        const data = await resp.json();
        return {
          name: zone.name, area: zone.area, lat: zone.lat, lon: zone.lon,
          aqi: data.current?.european_aqi ?? null,
          aqi_pm25: data.current?.european_aqi_pm2_5 ?? null,
          aqi_pm10: data.current?.european_aqi_pm10 ?? null,
          pm2_5: data.current?.pm2_5 ?? null,
          pm10: data.current?.pm10 ?? null,
          no2: data.current?.nitrogen_dioxide ?? null,
          so2: data.current?.sulphur_dioxide ?? null,
          co: data.current?.carbon_monoxide ?? null,
          o3: data.current?.ozone ?? null
        };
      } catch {
        return { name: zone.name, area: zone.area, lat: zone.lat, lon: zone.lon, aqi: null };
      }
    });

    const zones = await Promise.all(promises);
    const validZones = zones.filter(z => z.aqi !== null);
    setCache(key, validZones);
    res.json(validZones);
  } catch (err) {
    console.error('Zones error:', err.message);
    res.status(500).json({ error: 'Failed to fetch zone data' });
  }
});

// ── GET /history — 7-day hourly history (Open-Meteo) ──
router.get('/history', async (req, res) => {
  const { lat = 28.6139, lng = 77.2090, days = 7 } = req.query;
  const key = `history_${getCacheKey(lat, lng)}_${days}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=european_aqi,pm2_5,pm10&past_days=${days}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.hourly) {
      setCache(key, data.hourly);
      return res.json(data.hourly);
    }
    res.status(500).json({ error: 'Historical data unavailable' });
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── GET /weather — Wind + Temperature (Open-Meteo) ──
router.get('/weather', async (req, res) => {
  const { lat = 28.6139, lng = 77.2090 } = req.query;
  const key = `weather_${getCacheKey(lat, lng)}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.current) {
      setCache(key, data.current);
      return res.json(data.current);
    }
    res.status(500).json({ error: 'Weather data unavailable' });
  } catch (err) {
    console.error('Weather error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

export default router;
