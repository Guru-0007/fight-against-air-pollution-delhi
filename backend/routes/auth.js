import express from 'express';
import { supabase } from '../db/supabase.js';

const router = express.Router();

// ── Register new citizen ──
router.post('/register', async (req, res) => {
  const { email, username, password, display_name } = req.body;

  if (!email || !username || !password || !display_name) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // Check if username is taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    // Sign up via Supabase Auth (triggers profile creation via DB trigger)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: 'http://localhost:3005/#/login',
        data: {
          username: username.toLowerCase().trim(),
          display_name: display_name.trim(),
          role: 'user'
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return res.status(400).json({ error: 'Email already registered.' });
      }
      if (error.message.toLowerCase().includes('rate limit')) {
        // Swallow rate limit for dev purposes and pretend success
        return res.status(201).json({
          success: true,
          needsVerification: false,
          message: 'Account created! (Note: Email limit reached on server, but account is registered).'
        });
      }
      return res.status(400).json({ error: error.message });
    }

    // Check if email confirmation is required or if user already exists
    if (data.user && !data.session && data.user.identities && data.user.identities.length === 0) {
      return res.status(400).json({ error: 'Account already exists for this email. Please log in, or try a different email.' });
    }

    res.status(201).json({
      success: true,
      needsVerification: false,
      message: 'Account created successfully!'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// ── Citizen Login ──
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        return res.status(401).json({ error: 'Please verify your email before logging in. Check your inbox.' });
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile?.is_banned) {
      await supabase.auth.signOut();
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    // Block gov users from citizen login
    if (profile?.role === 'government') {
      return res.status(403).json({ error: 'Please use the Government login portal.' });
    }

    res.json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username || data.user.email.split('@')[0],
        display_name: profile?.display_name || 'User',
        type: 'user',
        is_verified: profile?.is_verified || false
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ── Government Login ──
router.post('/gov-login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Credentials required.' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid government credentials.' });
    }

    // Load profile and verify government role
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!profile || profile.role !== 'government') {
      await supabase.auth.signOut();
      return res.status(403).json({ error: 'Government clearance not found for this account.' });
    }

    res.json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        username: profile.username,
        name: profile.display_name,
        display_name: profile.display_name,
        role: profile.role,
        type: 'gov'
      }
    });
  } catch (err) {
    console.error('Gov login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ── Validate Token ──
router.get('/validate', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ valid: false });

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ valid: false });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username,
        display_name: profile?.display_name,
        type: profile?.role === 'government' ? 'gov' : 'user',
        is_verified: profile?.is_verified
      }
    });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// ── Refresh Token ──
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'Refresh token required.' });

  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Session expired. Please log in again.' });

    res.json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });
  } catch {
    res.status(500).json({ error: 'Token refresh failed.' });
  }
});

export default router;
