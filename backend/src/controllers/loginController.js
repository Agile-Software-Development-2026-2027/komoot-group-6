import { supabase } from '../config/supabase.js';


function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username ?? null,
    displayName: user.user_metadata?.display_name ?? null,
  };
}

function toPublicSession(session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
  };
}

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

export async function me(req, res) {
  return res.json({ user: toPublicUser(req.user) });
}

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


export async function logout(req, res) {
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${req.token}`,
    },
  });

  
  if (!response.ok && response.status !== 401) {
    return res.status(502).json({ error: 'Could not log out. Please try again.' });
  }

  return res.status(204).end();
}

export async function forgotPassword(req, res) {
  const { email } = req.body;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
  });

  if (error) {
    console.error(error);
  }

  
  return res.json({
    message: 'If the email is registered, you will receive a link to reset your password.',
  });
}


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
    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ error: 'The reset link has expired. Request a new one.' });
    }
    const body = await response.json().catch(() => null);
    if (body?.error_code === 'weak_password') {
      return res.status(400).json({ error: body.msg });
    }
    return res.status(422).json({ error: body?.msg || 'Could not update the password' });
  }

  return res.json({ message: 'Password updated. You can now log in.' });
}
