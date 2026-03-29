import { fetchApi } from '../utils.js';

export const AQI = {
  getLiveAQI: (lat, lng) => fetchApi(`/aqi/live?lat=${lat}&lng=${lng}`),
  getZones: () => fetchApi('/aqi/zones'),
  getHistory: (lat, lng, days = 7) => fetchApi(`/aqi/history?lat=${lat}&lng=${lng}&days=${days}`),
  getWeather: (lat, lng) => fetchApi(`/aqi/weather?lat=${lat}&lng=${lng}`)
};

export const Reports = {
  submit: (formData) => fetchApi('/reports', { method: 'POST', body: formData }),
  getAll: (status = '') => fetchApi(`/reports?status=${status}`),
  getMyReports: () => fetchApi('/reports/my-reports'),
  updateStatus: (id, status) => fetchApi(`/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  banUser: (userId) => fetchApi(`/reports/ban-user/${userId}`, { method: 'POST' }),
  unbanUser: (userId) => fetchApi(`/reports/unban-user/${userId}`, { method: 'POST' }),
  getLeaderboard: () => fetchApi('/reports/leaderboard')
};

export const News = {
  getAll: () => fetchApi('/news')
};

export const Calculator = {
  calculate: (data) => fetchApi('/calculator', { method: 'POST', body: JSON.stringify(data) })
};
