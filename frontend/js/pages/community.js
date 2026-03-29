import { News, Reports } from '../api/api.js';
import { getUser } from '../utils.js';
import { REPORT_STATUS_LABELS } from '../data/govData.js';

export const CommunityPage = {
  render: () => {
    const user = getUser();
    const myReportsSection = user && user.type !== 'gov' ? `
      <!-- My Reports -->
      <div class="glass-panel" style="grid-column: 1 / -1;">
        <div class="panel-header">
          <div class="panel-title"><span class="dot"></span> My Reports</div>
          <span class="badge badge-accent" id="my-reports-count">Loading...</span>
        </div>
        <div id="my-reports-container">
          <div class="skeleton" style="height:100px;"></div>
        </div>
      </div>
    ` : '';

    return `
      ${myReportsSection}
      <div class="two-col-layout">
        <!-- News Feed -->
        <div>
          <div class="glass-panel">
            <div class="panel-header">
              <div class="panel-title"><span class="dot"></span> Latest News</div>
              <span class="badge badge-accent">Live Feed</span>
            </div>
            <div id="news-container">
              <div class="skeleton" style="height:200px;"></div>
            </div>
          </div>
        </div>

        <!-- Leaderboard -->
        <div>
          <div class="glass-panel">
            <div class="panel-header">
              <div class="panel-title"><span class="dot"></span> Top Reporters</div>
            </div>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:16px;">Citizens with 5+ verified reports earn Verified status.</p>
            <div id="leaderboard">
              <div class="skeleton" style="height:200px;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  init: async () => {
    const user = getUser();

    // ── My Reports (if logged in as citizen) ──
    if (user && user.type !== 'gov') {
      try {
        const myReports = await Reports.getMyReports();
        const countBadge = document.getElementById('my-reports-count');
        if (countBadge) countBadge.textContent = `${myReports.length} submitted`;

        const container = document.getElementById('my-reports-container');
        if (container) {
          if (myReports.length === 0) {
            container.innerHTML = `
              <div class="empty-state" style="padding:24px;">
                <div class="empty-state-icon">📋</div>
                You haven't submitted any reports yet. <a href="#/report" style="color:var(--accent-text); font-weight:600;">Submit one now</a>
              </div>
            `;
          } else {
            let html = '<div style="display:grid; gap:10px;">';
            myReports.forEach(r => {
              const date = new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              const statusInfo = REPORT_STATUS_LABELS[r.status] || REPORT_STATUS_LABELS['pending'];
              const updatedAt = r.status_updated_at ? new Date(r.status_updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

              html += `
                <div class="report-status-card" style="display:flex; align-items:center; gap:16px; padding:16px; background:var(--bg-glass-subtle); border:var(--glass-border); border-radius:var(--radius-md); transition: all 0.3s ease;">
                  <div style="font-size:1.8rem; flex-shrink:0;">${statusInfo.icon}</div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-size:0.92rem; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.title}</div>
                    <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">📍 ${r.location_text} · ${date}</div>
                    <div style="font-size:0.82rem; font-weight:600; color:${statusInfo.color}; margin-top:6px;">
                      ${statusInfo.label}
                    </div>
                    ${updatedAt && r.status !== 'pending' ? `<div style="font-size:0.72rem; color:var(--text-light); margin-top:2px;">Updated: ${updatedAt}</div>` : ''}
                  </div>
                  <span class="badge ${statusInfo.badge}" style="flex-shrink:0;">${r.status.replace(/_/g, ' ')}</span>
                </div>
              `;
            });
            html += '</div>';
            container.innerHTML = html;
          }
        }
      } catch {
        const container = document.getElementById('my-reports-container');
        if (container) container.innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted); padding:16px;">Sign in to see your report status.</div>';
      }
    }

    // ── News ──
    try {
      const news = await News.getAll();
      let html = '';

      if (news && news.length > 0) {
        news.forEach(item => {
          const date = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
          html += `
            <div class="news-card" onclick="window.open('${item.url}', '_blank')">
              <div class="news-source">${item.source || 'News'} ${date ? '· ' + date : ''}</div>
              <div class="news-title">${item.title}</div>
              ${item.description ? `<div class="news-desc">${item.description}</div>` : ''}
            </div>
          `;
        });
      } else {
        html = '<div class="empty-state"><div class="empty-state-icon">📰</div>No articles available right now.</div>';
      }

      document.getElementById('news-container').innerHTML = html;
    } catch {
      document.getElementById('news-container').innerHTML = '<div class="empty-state" style="color:var(--danger)">Failed to load news.</div>';
    }

    // ── Leaderboard ──
    try {
      const users = await Reports.getLeaderboard();
      let html = '';

      if (users && users.length > 0) {
        users.forEach((u, i) => {
          const verified = u.is_verified ? '<span class="badge badge-success" style="margin-left:6px; font-size:0.65rem">Verified</span>' : '';
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
          html += `
            <div class="leaderboard-row">
              <span class="leaderboard-rank">${medal || '#' + (i + 1)}</span>
              <span class="leaderboard-name">${u.display_name || u.username}${verified}</span>
              <span class="leaderboard-count">${u.report_count || 0} reports</span>
            </div>
          `;
        });
      } else {
        html = '<div class="empty-state"><div class="empty-state-icon">👥</div>No reporters yet. Be the first!</div>';
      }

      document.getElementById('leaderboard').innerHTML = html;
    } catch {
      document.getElementById('leaderboard').innerHTML = '<div class="empty-state" style="color:var(--danger)">Failed to load leaderboard.</div>';
    }
  }
};
