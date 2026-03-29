// ── Toast & Auth Utilities ──

export const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '•'}</span> ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// ── Auth State ──
let memToken = null;
let memUser = null;

export const getToken = () => {
  try { return localStorage.getItem('dq_token') || memToken; }
  catch { return memToken; }
};

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('dq_user') || 'null') || memUser; }
  catch { return memUser; }
};

export const setAuth = (token, user) => {
  memToken = token;
  memUser = user;
  try {
    localStorage.setItem('dq_token', token);
    localStorage.setItem('dq_user', JSON.stringify(user));
  } catch {
    console.warn('localStorage unavailable, using memory session.');
  }
  window.dispatchEvent(new Event('auth-changed'));
};

export const logout = () => {
  memToken = null;
  memUser = null;
  try {
    localStorage.removeItem('dq_token');
    localStorage.removeItem('dq_user');
  } catch {}
  window.dispatchEvent(new Event('auth-changed'));
  window.location.hash = '#/dashboard';
};

// ── API Helper ──
export const fetchApi = async (url, options = {}) => {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Determine base URL
  let baseUrl = '/api';
  if (window.location.protocol === 'file:') baseUrl = 'http://localhost:3005/api';

  const res = await fetch(`${baseUrl}${url}`, { ...options, headers });

  if (!res.ok) {
    let err = 'Request failed';
    try { const d = await res.json(); err = d.error || err; } catch {}
    throw new Error(err);
  }

  if (res.status === 204) return null;
  return res.json();
};

// ── AQI Color Helpers ──
export function getAQIColor(aqi) {
  if (aqi <= 50) return 'var(--aqi-good)';
  if (aqi <= 100) return 'var(--aqi-moderate)';
  if (aqi <= 200) return 'var(--aqi-unhealthy)';
  if (aqi <= 300) return 'var(--aqi-hazardous)';
  return 'var(--aqi-severe)';
}

export function getAQIColorRaw(aqi) {
  if (aqi <= 50) return '#48bb78';
  if (aqi <= 100) return '#d4a843';
  if (aqi <= 200) return '#e07850';
  if (aqi <= 300) return '#c5475b';
  return '#8b5a6b';
}

export function getAQILabel(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Hazardous';
  return 'Severe';
}

export function getAQIBadgeClass(aqi) {
  if (aqi <= 50) return 'badge-good';
  if (aqi <= 100) return 'badge-moderate';
  if (aqi <= 200) return 'badge-unhealthy';
  if (aqi <= 300) return 'badge-hazardous';
  return 'badge-severe';
}
