import './supabaseClient.js?v=7.0';
import { renderNavbar } from './components/navbar.js?v=7.0';
import { showToast } from './utils.js?v=7.0';
import './ambient.js?v=7.0';
import { Dashboard } from './pages/dashboard.js?v=7.0';
import { CalculatorPage } from './pages/calculator.js?v=7.0';
import { AuthPage, GovAuthPage } from './pages/auth.js?v=7.0';
import { ReportPage } from './pages/report.js?v=7.0';
import { CommunityPage } from './pages/community.js?v=7.0';
import { GovDashboard } from './pages/govDashboard.js?v=7.0';

// ── Route Table ──
const pages = {
  '#/dashboard':      { title: 'Dashboard — PolluSense', render: Dashboard.render, init: Dashboard.init },
  '#/calculator':     { title: 'True Cost Calculator — PolluSense', render: CalculatorPage.render, init: CalculatorPage.init },
  '#/report':         { title: 'Submit Report — PolluSense', render: ReportPage.render, init: ReportPage.init },
  '#/community':      { title: 'Community — PolluSense', render: CommunityPage.render, init: CommunityPage.init },
  '#/login':          { title: 'Sign In — PolluSense', render: AuthPage.render, init: AuthPage.init },
  '#/gov/login':      { title: 'Government Login — PolluSense', render: GovAuthPage.render, init: GovAuthPage.init },
  '#/gov/dashboard':  { title: 'Control Panel — PolluSense', render: GovDashboard.render, init: GovDashboard.init }
};

async function router() {
  let hash = window.location.hash || '#/dashboard';
  let route = hash;
  
  if (hash.includes('access_token=') || hash.includes('type=recovery') || hash.includes('type=signup')) {
    route = '#/login';
  }
  
  const page = pages[route] || pages['#/dashboard'];

  document.title = page.title;
  renderNavbar();

  const main = document.getElementById('main-content');
  if (!main) return;

  // Smooth page transition
  main.style.opacity = '0';
  main.style.transform = 'translateY(8px)';

  await new Promise(r => setTimeout(r, 120));

  try {
    main.innerHTML = typeof page.render === 'function' ? await page.render() : page.render;

    // Animate in
    requestAnimationFrame(() => {
      main.style.transition = 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      main.style.opacity = '1';
      main.style.transform = 'translateY(0)';
    });

    if (page.init) await page.init();
  } catch (err) {
    console.error('Page error:', err);
    showToast('Something went wrong loading this page.', 'error');
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  // Wipe old testing sessions to fix the "stuck in gov mode" bug
  if (!localStorage.getItem('pollusense_v3_reset')) {
    localStorage.removeItem('pollusense_auth');
    localStorage.setItem('pollusense_v3_reset', 'true');
  }

  if (!window.location.hash) window.location.hash = '#/dashboard';
  router();

  // Intro Animation Logic
  const overlay = document.getElementById('intro-overlay');
  if (overlay) {
    const skipBtn = document.getElementById('intro-skip');
    const dismissIntro = () => {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(() => overlay.remove(), 1200);
    };

    if (skipBtn) skipBtn.onclick = dismissIntro;
    setTimeout(dismissIntro, 4000); // Auto remove after 4s
  }
});

// Make showToast globally available
window.showToast = showToast;
