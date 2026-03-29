import { News, Reports } from '../api/api.js';

export const CommunityPage = {
  render: () => `
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
  `,

  init: async () => {
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
