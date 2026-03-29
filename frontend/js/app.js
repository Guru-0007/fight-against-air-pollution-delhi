import { renderNavbar } from './components/navbar.js';
import { showToast } from './utils.js';
import './ambient.js';
import { Dashboard } from './pages/dashboard.js';
import { CalculatorPage } from './pages/calculator.js';
import { AuthPage, GovAuthPage } from './pages/auth.js';
import { ReportPage } from './pages/report.js';
import { CommunityPage } from './pages/community.js';
import { GovDashboard } from './pages/govDashboard.js';

// ── Route Table ──
const pages = {
  '#/dashboard':      { title: 'Dashboard — Delhi Air Quality', render: Dashboard.render, init: Dashboard.init },
  '#/calculator':     { title: 'True Cost Calculator — Delhi Air Quality', render: CalculatorPage.render, init: CalculatorPage.init },
  '#/report':         { title: 'Submit Report — Delhi Air Quality', render: ReportPage.render, init: ReportPage.init },
  '#/community':      { title: 'Community — Delhi Air Quality', render: CommunityPage.render, init: CommunityPage.init },
  '#/login':          { title: 'Sign In — Delhi Air Quality', render: AuthPage.render, init: AuthPage.init },
  '#/gov/login':      { title: 'Government Login — Delhi Air Quality', render: GovAuthPage.render, init: GovAuthPage.init },
  '#/gov/dashboard':  { title: 'Control Panel — Delhi Air Quality', render: GovDashboard.render, init: GovDashboard.init }
};

async function router() {
  const hash = window.location.hash || '#/dashboard';
  const page = pages[hash] || pages['#/dashboard'];

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
  if (!window.location.hash) window.location.hash = '#/dashboard';
  router();
});

// Make showToast globally available
window.showToast = showToast;
