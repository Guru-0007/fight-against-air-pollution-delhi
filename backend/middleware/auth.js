import { supabase } from '../db/supabase.js';

// Verify Supabase access token and load user profile
export async function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Access denied. Please log in.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Invalid token format.' });

  try {
    // Verify the Supabase JWT
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Session expired. Please log in again.' });

    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return res.status(401).json({ error: 'Profile not found.' });
    if (profile.is_banned) return res.status(403).json({ error: 'Account suspended. Contact support.' });

    req.user = {
      id: user.id,
      email: user.email,
      username: profile.username,
      display_name: profile.display_name,
      role: profile.role,
      type: profile.role === 'government' ? 'gov' : 'user',
      is_verified: profile.is_verified,
      is_banned: profile.is_banned,
      report_count: profile.report_count
    };
    req.accessToken = token;
    next();
  } catch (ex) {
    console.error('Auth error:', ex);
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

export function authorizeGov(req, res, next) {
  authenticateUser(req, res, () => {
    if (req.user && req.user.type === 'gov') {
      next();
    } else {
      res.status(403).json({ error: 'Government clearance required.' });
    }
  });
}
