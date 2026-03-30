import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://isaxgqajsavgsvbfcqli.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XlK6v-JrSUPssYcqv7Nt0g_8dU9ac1v';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;

// Default client (anon/publishable — respects RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Client with Service Role (for administrative tasks like cleanup)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Create a client authenticated as a specific user (for RLS-aware operations)
export function createUserClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  });
}

export { SUPABASE_URL, SUPABASE_KEY };
