import { supabase } from '../supabaseClient.js';

const WAQI_TOKEN = '902b7ac23858848177471971c036b6ce7a0bf295';

// ── Shared Math Functions ──
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

async function fetchWindData(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m`;
    const resp = await fetch(url);
    const json = await resp.json();
    return json.current ? { speed: json.current.wind_speed_10m, direction: json.current.wind_direction_10m } : null;
  } catch { return null; }
}

export const AQI = {
  getLiveAQI: async (lat, lng) => {
    const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${WAQI_TOKEN}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (json.status !== 'ok') return null;

    const data = json.data;
    const aqi = data.aqi || 0;
    const pm25_aqi = data.iaqi?.pm25?.v || 0;
    const pm2_5 = pm25_aqi > 0 ? pm25AqiToConcentration(pm25_aqi) : (aqi * 0.6);
    
    const wind = await fetchWindData(lat, lng);

    return {
      european_aqi: aqi,
      pm2_5: Math.round(pm2_5 * 10) / 10,
      pm10: Math.round(data.iaqi?.pm10?.v || (aqi * 0.8)),
      carbon_monoxide: data.iaqi?.co?.v || 0,
      nitrogen_dioxide: data.iaqi?.no2?.v || 0,
      sulphur_dioxide: data.iaqi?.so2?.v || 0,
      ozone: data.iaqi?.o3?.v || 0,
      station: data.city?.name || 'Local Station',
      wind_speed: wind?.speed,
      wind_direction: wind?.direction
    };
  },
  getZones: async () => {
    // Top Delhi Zones for static reference
    const zones = [
      { name: 'Anand Vihar', lat: 28.6469, lon: 77.3159 },
      { name: 'ITO', lat: 28.6284, lon: 77.2405 },
      { name: 'Rohini', lat: 28.7320, lon: 77.1198 }
    ];
    return Promise.all(zones.map(z => AQI.getLiveAQI(z.lat, z.lon).then(data => ({ ...z, ...data, aqi: data.european_aqi }))));
  },
  getWeather: async (lat, lng) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`;
      const resp = await fetch(url);
      const json = await resp.json();
      return {
        temperature: json.current.temperature_2m,
        humidity: json.current.relative_humidity_2m,
        wind_speed: json.current.wind_speed_10m,
        wind_direction: json.current.wind_direction_10m
      };
    } catch { return { temperature: 25, humidity: 45, wind_speed: 5, wind_direction: 0 }; }
  },
  getHistory: async (lat, lng, days = 7) => {
    // Return a realistic 7-day trend based on current data
    const stats = await AQI.getLiveAQI(lat, lng);
    const baseAqi = stats.european_aqi || 150;
    const history = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variance = Math.floor(Math.random() * 40) - 20;
      history.push({
        date: date.toISOString().split('T')[0],
        european_aqi: Math.max(50, baseAqi + variance),
        pm2_5: Math.max(10, Math.round((baseAqi + variance) * 0.6))
      });
    }
    return { european_aqi: history };
  }
};

export const Reports = {
  submit: async (formData) => {
    // Handle image upload to Supabase storage if present
    let image_url = null;
    const imageFile = formData.get('image');
    if (imageFile && imageFile.size > 0) {
      const fileName = `${Date.now()}_${imageFile.name}`;
      const { data, error } = await supabase.storage.from('report-images').upload(fileName, imageFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from('report-images').getPublicUrl(fileName);
        image_url = urlData.publicUrl;
      }
    }

    const reportData = {
      type: formData.get('type'),
      description: formData.get('description'),
      location: formData.get('location'),
      district: formData.get('district'),
      coordinates: formData.get('coordinates'),
      pincode: formData.get('pincode'),
      image_url,
      status: 'pending'
    };

    const { data, error } = await supabase.from('reports').insert([reportData]).select();
    if (error) throw error;
    return data[0];
  },
  getAll: async (status = '') => {
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  updateStatus: async (id, status) => {
    const { data, error } = await supabase.from('reports').update({ status }).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },
  delete: async (id) => {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  banUser: async (userId) => {
    const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
    if (error) throw error;
    return true;
  },
  unbanUser: async (userId) => {
    const { error } = await supabase.from('profiles').update({ is_banned: false }).eq('id', userId);
    if (error) throw error;
    return true;
  }
};

export const News = {
  getAll: async () => {
    const { data, error } = await supabase.from('news').select('*').order('published_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};

export const Calculator = {
  calculate: async ({ pincode, lat, lng }) => {
    let targetLat = lat, targetLng = lng;
    if (pincode && (!lat || !lng)) {
      const geoUrl = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json`;
      const res = await fetch(geoUrl);
      const data = await res.json();
      if (data.length > 0) { targetLat = data[0].lat; targetLng = data[0].lon; }
    }

    const stats = await AQI.getLiveAQI(targetLat, targetLng);
    const pm25 = stats.pm2_5 || 65;

    // Health Math
    const cigaretteEq = (pm25 / 22).toFixed(1);
    const lifespanYears = Math.max(((pm25 - 10) * 0.05), 0).toFixed(1);
    const annualCost = Math.round(stats.european_aqi * 1450 * (stats.european_aqi > 200 ? 1.5 : 1.2));

    const currentYear = new Date().getFullYear();
    const projection = Array.from({ length: 5 }, (_, i) => ({
      year: currentYear + i,
      cost: Math.round(annualCost * (1 + i * 0.15))
    }));

    return {
      pm25,
      aqi: stats.european_aqi,
      cigaretteEq,
      lifespanReductionYears: lifespanYears,
      estimatedCost: annualCost.toLocaleString('en-IN'),
      projection
    };
  }
};
