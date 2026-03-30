import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://isaxgqajsavgsvbfcqli.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XlK6v-JrSUPssYcqv7Nt0g_8dU9ac1v';

// Default client (anon/publishable — respects RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create a client authenticated as a specific user (for RLS-aware operations)
export function createUserClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  });
}

export { SUPABASE_URL, SUPABASE_KEY };
