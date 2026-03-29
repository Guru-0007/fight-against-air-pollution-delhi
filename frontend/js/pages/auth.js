import { fetchApi, setAuth } from '../utils.js';

export const AuthPage = {
  render: () => `
    <div class="auth-container">
      <div class="glass-panel" style="padding:36px;">
        <div id="login-section">
          <h2 class="auth-title">Welcome back</h2>
          <p class="auth-subtitle">Sign in to submit pollution reports and access community features.</p>

          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" id="log-user" class="form-input" placeholder="Enter your username" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="log-pass" class="form-input" placeholder="Enter your password">
          </div>

          <div style="background:var(--accent-soft); padding:12px 16px; border-radius:var(--radius-sm); margin-bottom:20px; font-size:0.82rem; color:var(--accent-text);">
            <strong>Demo account:</strong> demo_citizen / citizen123
          </div>

          <button id="btn-login" class="btn btn-primary btn-lg" style="width:100%; margin-bottom:12px;">Sign In</button>

          <div class="auth-footer">
            Don't have an account? <button id="btn-show-register">Create one</button>
          </div>
        </div>

        <div id="register-section" style="display:none;">
          <h2 class="auth-title">Create Account</h2>
          <p class="auth-subtitle">Join the community to report pollution incidents in your area.</p>

          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" id="reg-user" class="form-input" placeholder="Choose a username" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">Display Name</label>
            <input type="text" id="reg-name" class="form-input" placeholder="Your name">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="reg-pass" class="form-input" placeholder="Min. 6 characters">
          </div>

          <button id="btn-register" class="btn btn-primary btn-lg" style="width:100%; margin-bottom:12px;">Create Account</button>

          <div class="auth-footer">
            Already have an account? <button id="btn-show-login">Sign in</button>
          </div>
        </div>
      </div>
    </div>
  `,

  init: () => {
    // Toggle forms
    document.getElementById('btn-show-register').onclick = () => {
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('register-section').style.display = 'block';
    };
    document.getElementById('btn-show-login').onclick = () => {
      document.getElementById('register-section').style.display = 'none';
      document.getElementById('login-section').style.display = 'block';
    };

    // Login
    document.getElementById('btn-login').onclick = async () => {
      const btn = document.getElementById('btn-login');
      const username = document.getElementById('log-user').value.trim();
      const password = document.getElementById('log-pass').value.trim();

      if (!username || !password) return window.showToast('Please fill in all fields', 'error');

      btn.textContent = 'Signing in...';
      btn.disabled = true;

      try {
        const data = await fetchApi('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        setAuth(data.token, data.user);
        window.showToast('Welcome back!', 'success');
        window.location.hash = '#/dashboard';
      } catch (e) {
        window.showToast(e.message, 'error');
        btn.textContent = 'Sign In';
        btn.disabled = false;
      }
    };

    // Allow Enter key
    ['log-user', 'log-pass'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-login').click();
      });
    });

    // Register
    document.getElementById('btn-register').onclick = async () => {
      const btn = document.getElementById('btn-register');
      const username = document.getElementById('reg-user').value.trim();
      const display_name = document.getElementById('reg-name').value.trim();
      const password = document.getElementById('reg-pass').value.trim();

      if (!username || !display_name || !password) return window.showToast('Please fill in all fields', 'error');

      btn.textContent = 'Creating...';
      btn.disabled = true;

      try {
        await fetchApi('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, password, display_name })
        });
        window.showToast('Account created! Please sign in.', 'success');
        document.getElementById('btn-show-login').click();
      } catch (e) {
        window.showToast(e.message, 'error');
        btn.textContent = 'Create Account';
        btn.disabled = false;
      }
    };
  }
};

export const GovAuthPage = {
  render: () => `
    <div class="auth-container">
      <div class="glass-panel" style="padding:36px;">
        <h2 class="auth-title">Government Access</h2>
        <p class="auth-subtitle">Restricted to authorized DPCC personnel only. No public registration available.</p>

        <div class="form-group">
          <label class="form-label">User ID</label>
          <input type="text" id="gov-user" class="form-input" placeholder="Government User ID" autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="gov-pass" class="form-input" placeholder="Password">
        </div>

        <div style="background:rgba(197,71,91,0.08); padding:12px 16px; border-radius:var(--radius-sm); margin-bottom:20px; font-size:0.82rem; color:var(--danger);">
          <strong>Demo credentials:</strong> dpcc_admin / DelhiCleanAir@2024
        </div>

        <button id="btn-gov-login" class="btn btn-primary btn-lg" style="width:100%;">Sign In</button>
      </div>
    </div>
  `,

  init: () => {
    document.getElementById('btn-gov-login').onclick = async () => {
      const btn = document.getElementById('btn-gov-login');
      const username = document.getElementById('gov-user').value.trim();
      const password = document.getElementById('gov-pass').value.trim();

      if (!username || !password) return window.showToast('Please fill in all fields', 'error');

      btn.textContent = 'Verifying...';
      btn.disabled = true;

      try {
        const data = await fetchApi('/auth/gov-login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        setAuth(data.token, data.user);
        window.showToast('Government access granted.', 'success');
        window.location.hash = '#/gov/dashboard';
      } catch (e) {
        window.showToast(e.message, 'error');
        btn.textContent = 'Sign In';
        btn.disabled = false;
      }
    };

    // Enter key support
    ['gov-user', 'gov-pass'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-gov-login').click();
      });
    });
  }
};
