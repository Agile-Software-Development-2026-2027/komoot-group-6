import { supabase } from '../config/supabase.js';

// Prepares the user to send to the frontend: the same fields as registration
// (id, email) plus username and display name, saved at sign-up.
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username ?? null,
    displayName: user.user_metadata?.display_name ?? null,
    birthDate: user.user_metadata?.birth_date ?? null,
    createdAt: user.created_at ?? null,
  };
}

// Session length without "Remember me": 1 minute from login, like the access token
// (on Supabase the JWT expiry is set to 60 seconds). After that the user has to log in again.
const SESSION_MAX_AGE_SECONDS = 60;

// With "Remember me" the frontend renews the token with the refresh token and the user stays logged in,
// even after closing the browser, but not beyond 30 days from login.
// On its own, Supabase would renew the session forever.
const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;


function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

// Returns the login time (in seconds) written in the access token, which is a JWT.
// Returns null if the token cannot be read.
function getLoginTime(accessToken) {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString());
    const times = (payload.amr ?? []).map((entry) => entry.timestamp).filter(Number.isFinite);
    return times.length > 0 ? Math.min(...times) : null;
  } catch {
    return null;
  }
}

// Keeps only the session data the frontend needs.
// remember_me tells the frontend where to store the session and whether it can renew it.
function toPublicSession(session, loggedInAt, rememberMe) {
  const maxAge = rememberMe ? REMEMBER_ME_MAX_AGE_SECONDS : SESSION_MAX_AGE_SECONDS;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    session_expires_at: loggedInAt + maxAge,
    remember_me: rememberMe,
  };
}

// Has Supabase check the email and password.
// If they are right it returns the user and the session tokens; otherwise an error with the right status.
export async function login(req, res) {
  const { email, password, rememberMe = false } = req.body;

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
    // The login has just happened: the maximum duration starts now.
    session: toPublicSession(data.session, nowInSeconds(), rememberMe),
  });
}


// Returns the user the token belongs to.
export async function me(req, res) {
  return res.json({ user: toPublicUser(req.user) });
}


// The access token expires after 1 minute: with the refresh token a new one is obtained,
// without the user having to log in again.
// The frontend calls it only for sessions with "Remember me" (without it, after 1 minute the user goes back to login),
// and not beyond REMEMBER_ME_MAX_AGE_SECONDS from login: at that point the user has to log in again.
export async function refresh(req, res) {
  const { refresh_token: refreshToken } = req.body;

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data?.session) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // If we cannot tell when the login happened, the session is not renewed, to be safe.
  const loggedInAt = getLoginTime(data.session.access_token);
  if (!loggedInAt || nowInSeconds() - loggedInAt >= REMEMBER_ME_MAX_AGE_SECONDS) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  return res.json({
    user: toPublicUser(data.user),
    session: toPublicSession(data.session, loggedInAt, true),
  });
}


// scope=local closes only the session of this device: without it, Supabase would close
// the user's sessions on all devices (even when the session here expires from inactivity).
export async function logout(req, res) {
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout?scope=local`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${req.token}`,
    },
  });

  // 401 means the token had already expired or been revoked: the user is logged out anyway.
  if (!response.ok && response.status !== 401) {
    return res.status(502).json({ error: 'Could not log out. Please try again.' });
  }

  return res.status(204).end();
}


// Asks Supabase to email the user the link to reset the password.
// The link leads back to the frontend page /auth/reset-password.
export async function forgotPassword(req, res) {
  const { email } = req.body;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
  });

  if (error) {
    console.error(error);
  }

  // Always answers the same way, whether the email is registered or not:
  // otherwise anyone could use this route to find out which emails exist.
  return res.json({
    message: 'If the email is registered, you will receive a link to reset your password.',
  });
}


// Sets the new password. The frontend takes the access_token from the link
// received by email and sends it here together with the new password.
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
    // 401 or 403 means the link has expired or has already been used.
    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ error: 'The reset link has expired. Request a new one.' });
    }
    const body = await response.json().catch(() => null);
    // Supabase may reject a password that is too weak.
    if (body?.error_code === 'weak_password') {
      return res.status(400).json({ error: body.msg });
    }
    return res.status(422).json({ error: body?.msg || 'Could not update the password' });
  }

  return res.json({ message: 'Password updated. You can now log in.' });
}
