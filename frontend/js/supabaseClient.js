// ── Supabase Client for Frontend ──
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = window.__SUPABASE_URL || 'https://isaxgqajsavgsvbfcqli.supabase.co';
const SUPABASE_KEY = window.__SUPABASE_KEY || 'sb_publishable_XlK6v-JrSUPssYcqv7Nt0g_8dU9ac1v';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Make globally available for token refresh
window.__supabase = supabase;
