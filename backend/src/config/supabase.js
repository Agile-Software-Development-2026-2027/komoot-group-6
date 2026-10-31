import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Client che fa le query come l'utente del token: così le policy RLS di Supabase
// vedono auth.uid() = id dell'utente e lo lasciano leggere/scrivere solo i suoi dati.
// Il token deve essere già stato verificato (lo fa requireAuth).
export function supabaseAsUser(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
