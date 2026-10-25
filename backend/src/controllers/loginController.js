import { supabase } from '../config/supabase.js';

// Prepara l'utente da mandare al frontend con gli stessi campi della registrazione
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username ?? null,
    displayName: user.user_metadata?.display_name ?? null,
  };
}

// Tiene solo i dati della sessione che servono al frontend.
function toPublicSession(session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
  };
}

// Fa controllare email e password. Se sono giuste restituisce l'utente, altrimenti un errore.
export async function login(req, res) {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === 'invalid_credentials') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (error.code === 'email_not_confirmed') {
      return res.status(403).json({ error: 'Email not confirmed. Check your email to confirm.' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
    }
    return res.status(422).json({ error: error.message });
  }

  return res.json({
    user: toPublicUser(data.user),
    session: toPublicSession(data.session),
  });
}


// Restituisce l'utente a cui appartiene il token. Il controllo del token
// lo ha già fatto requireAuth, che gira prima e mette l'utente in req.user.
export async function me(req, res) {
  return res.json({ user: toPublicUser(req.user) });
}


// L'access token scade dopo circa un'ora: con il refresh token se ne ottiene uno nuovo, senza che l'utente debba rifare il login.
export async function refresh(req, res) {
  const { refresh_token: refreshToken } = req.body;

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data?.session) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  return res.json({
    user: toPublicUser(data.user),
    session: toPublicSession(data.session),
  });
}

// Chiamiamo direttamente l'API di Supabase con il token dell'utente, che così viene revocato e non funziona più.
export async function logout(req, res) {
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${req.token}`,
    },
  });

  // 401 vuol dire che il token era già scaduto o revocato.
  if (!response.ok && response.status !== 401) {
    return res.status(502).json({ error: 'Could not log out. Please try again.' });
  }

  return res.status(204).end();
}
