import { supabase } from '../config/supabase.js';

// Prepara l'utente da mandare al frontend: gli stessi campi della registrazione
// (id, email) più username e nome visualizzato, salvati al momento dell'iscrizione.
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

// POST /api/auth/login
// Fa controllare email e password a Supabase. Se sono giuste restituisce
// l'utente e i token della sessione; altrimenti un errore con lo status adatto.
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

// GET /api/auth/me
// Restituisce l'utente a cui appartiene il token. Il controllo del token
// lo ha già fatto requireAuth, che gira prima e mette l'utente in req.user.
export async function me(req, res) {
  return res.json({ user: toPublicUser(req.user) });
}

// POST /api/auth/refresh
// L'access token scade dopo circa un'ora: con il refresh token se ne ottiene
// uno nuovo, senza che l'utente debba rifare il login.
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

// POST /api/auth/logout
// Il client Supabase del backend non tiene sessioni in memoria (persistSession: false),
// quindi supabase.auth.signOut() non saprebbe quale sessione chiudere.
// Per questo chiamiamo direttamente l'API di Supabase con il token dell'utente,
// che così viene revocato e non funziona più.
export async function logout(req, res) {
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${req.token}`,
    },
  });

  // 401 vuol dire che il token era già scaduto o revocato: l'utente è comunque fuori.
  if (!response.ok && response.status !== 401) {
    return res.status(502).json({ error: 'Could not log out. Please try again.' });
  }

  return res.status(204).end();
}

// POST /api/auth/forgot-password
// Chiede a Supabase di mandare all'utente l'email con il link per reimpostare
// la password. Il link riporta alla pagina /auth/reset-password del frontend.
export async function forgotPassword(req, res) {
  const { email } = req.body;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
  });

  if (error) {
    console.error(error);
  }

  // Risponde sempre allo stesso modo, che l'email sia registrata o no:
  // altrimenti chiunque potrebbe usare questa rotta per scoprire quali email esistono.
  return res.json({
    message: 'If the email is registered, you will receive a link to reset your password.',
  });
}

// POST /api/auth/reset-password
// Imposta la nuova password. Il frontend prende l'access_token dal link
// arrivato per email e lo manda qui insieme alla password nuova.
export async function resetPassword(req, res) {
  const { access_token: accessToken, password } = req.body;

  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    // 401 o 403 vuol dire che il link è scaduto o è già stato usato.
    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ error: 'The reset link has expired. Request a new one.' });
    }
    const body = await response.json().catch(() => null);
    // Supabase può rifiutare una password troppo debole.
    if (body?.error_code === 'weak_password') {
      return res.status(400).json({ error: body.msg });
    }
    return res.status(422).json({ error: body?.msg || 'Could not update the password' });
  }

  return res.json({ message: 'Password updated. You can now log in.' });
}
