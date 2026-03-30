import { fetchApi, setAuth } from '../utils.js';
import { supabase } from '../supabaseClient.js';

export const AuthPage = {
  render: () => `
    <div class="auth-container">
      <div class="glass-panel" style="padding:36px;">
        <div id="login-section">
          <h2 class="auth-title">Welcome back</h2>
          <p class="auth-subtitle">Sign in to submit pollution reports and access community features.</p>

          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="log-email" class="form-input" placeholder="Enter your email" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="log-pass" class="form-input" placeholder="Enter your password">
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
            <label class="form-label">Email</label>
            <input type="email" id="reg-email" class="form-input" placeholder="Your email address" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" id="reg-user" class="form-input" placeholder="Choose a username (min. 3 chars)" autocomplete="off">
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

        <div id="verify-section" style="display:none;">
          <div style="text-align:center; padding:20px 0;">
            <div style="font-size:3rem; margin-bottom:16px;">📧</div>
            <h2 class="auth-title">Verify Your Email</h2>
            <p class="auth-subtitle" id="verify-message">We've sent a verification link to your email. Please check your inbox and click the link to activate your account.</p>
            <button id="btn-back-login" class="btn btn-secondary" style="margin-top:20px;">Back to Sign In</button>
          </div>
        </div>
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
      document.getElementById('verify-section').style.display = 'none';
      document.getElementById('login-section').style.display = 'block';
    };
    document.getElementById('btn-back-login').onclick = () => {
      document.getElementById('verify-section').style.display = 'none';
      document.getElementById('login-section').style.display = 'block';
    };

    // Login
    document.getElementById('btn-login').onclick = async () => {
      const btn = document.getElementById('btn-login');
      const email = document.getElementById('log-email').value.trim();
      const password = document.getElementById('log-pass').value.trim();

      if (!email || !password) return window.showToast('Please fill in all fields', 'error');

      btn.textContent = 'Signing in...';
      btn.disabled = true;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Fetch profile to get role/username
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        
        setAuth({
          token: data.session.access_token,
          user: { 
            id: data.user.id, 
            email: data.user.email,
            username: profile?.username || 'user',
            type: profile?.role || 'user', // Match legacy type expectations
            role: profile?.role || 'user'
          }
        });
        window.showToast('Successfully signed in', 'success');
        window.location.hash = '#/dashboard';
      } catch (e) {
        window.showToast(e.message, 'error');
        btn.textContent = 'Sign In';
        btn.disabled = false;
      }
    };

    // Allow Enter key on login
    ['log-email', 'log-pass'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-login').click();
      });
    });

    // Register
    document.getElementById('btn-register').onclick = async () => {
      const btn = document.getElementById('btn-register');
      const email = document.getElementById('reg-email').value.trim();
      const username = document.getElementById('reg-user').value.trim();
      const name = document.getElementById('reg-name').value.trim();
      const password = document.getElementById('reg-pass').value.trim();

      if (!email || !username || !name || !password) {
        return window.showToast('Please fill in all fields', 'error');
      }

      btn.textContent = 'Creating...';
      btn.disabled = true;

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, full_name: name, role: 'user' }
          }
        });
        if (error) throw error;

        document.getElementById('register-section').style.display = 'none';
        document.getElementById('verify-section').style.display = 'block';
        document.getElementById('verify-message').textContent = `We've sent a verification link to ${email}. Please check your inbox and click the link to activate your account.`;
        window.showToast('Check your email to verify!', 'success');
      } catch (e) {
        window.showToast(e.message, 'error');
      } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
      }
    };

    // Allow Enter key on register
    ['reg-email', 'reg-user', 'reg-name', 'reg-pass'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-register').click();
      });
    });
  }
};

export const GovAuthPage = {
  render: () => `
    <div class="auth-container">
      <div class="glass-panel" style="padding:36px;">
        <h2 class="auth-title">Government Access</h2>
        <p class="auth-subtitle">Restricted to authorized DPCC personnel only. No public registration available.</p>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="gov-email" class="form-input" placeholder="Government email" autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="gov-pass" class="form-input" placeholder="Password">
        </div>

        <button id="btn-gov-login" class="btn btn-primary btn-lg" style="width:100%;">Sign In</button>
      </div>
    </div>
  `,

  init: () => {
    document.getElementById('btn-gov-login').onclick = async () => {
      const btn = document.getElementById('btn-gov-login');
      const email = document.getElementById('gov-email').value.trim();
      const password = document.getElementById('gov-pass').value.trim();

      if (!email || !password) return window.showToast('Please fill in all fields', 'error');

      btn.textContent = 'Verifying...';
      btn.disabled = true;

      try {
        const data = await fetchApi('/auth/gov-login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        setAuth(data.token, data.user, data.refresh_token);
        window.showToast('Government access granted.', 'success');
        window.location.hash = '#/gov/dashboard';
      } catch (e) {
        window.showToast(e.message, 'error');
        btn.textContent = 'Sign In';
        btn.disabled = false;
      }
    };

    // Enter key support
    ['gov-email', 'gov-pass'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-gov-login').click();
      });
    });
  }
};
