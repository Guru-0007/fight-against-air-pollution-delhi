import { getUser, logout } from '../utils.js';

export function renderNavbar() {
  const user = getUser();

  let navLinks = `
    <a href="#/dashboard" class="nav-link">Dashboard</a>
    <a href="#/calculator" class="nav-link">True Cost</a>
  `;

  if (user) {
    if (user.type === 'gov') {
      navLinks += `<a href="#/gov/dashboard" class="nav-link">Control Panel</a>`;
    } else {
      navLinks += `
        <a href="#/report" class="nav-link">Report</a>
        <a href="#/community" class="nav-link">Community</a>
      `;
    }
  }

  const navEl = document.getElementById('navbar');
  if (navEl) navEl.innerHTML = navLinks;

  // Auth area
  const authEl = document.getElementById('auth-area');
  if (authEl) {
    if (user) {
      const name = user.display_name || user.name || user.username;
      const verified = user.is_verified ? '<span class="badge badge-success" style="margin-right:4px">✓ Verified</span>' : '';
      const roleLabel = user.type === 'gov' ? '<span class="badge badge-accent">Gov</span>' : '';
      authEl.innerHTML = `
        ${roleLabel}
        ${verified}
        <span style="font-size:0.85rem; font-weight:500; color:var(--text-secondary)">${name}</span>
        <button id="logout-btn" class="btn btn-ghost btn-sm">Sign Out</button>
      `;
      document.getElementById('logout-btn').addEventListener('click', logout);
    } else {
      authEl.innerHTML = `
        <a href="#/login" class="btn btn-ghost btn-sm">Sign In</a>
        <a href="#/gov/login" class="btn btn-secondary btn-sm">Government</a>
      `;
    }
  }

  // Highlight active nav link
  const current = window.location.hash || '#/dashboard';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === current) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

window.addEventListener('auth-changed', renderNavbar);
