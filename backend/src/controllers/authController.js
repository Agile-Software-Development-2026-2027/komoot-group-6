import { supabase } from '../config/supabase.js';

export async function register(req, res) {
  
  const { email, password, username, displayName } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: displayName },
      emailRedirectTo: `${process.env.FRONTEND_URL}/auth/confirm`,
    },
  });

  if (error) {
    if (error.code === 'weak_password') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message?.includes('Database error saving new user')) {
      return res.status(409).json({ error: 'Username already in use' });
    }
    return res.status(422).json({ error: error.message });
  }

  if (data.user?.identities?.length === 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  return res.status(201).json({
    message: 'Registration complete. Check your email to confirm.',
    user: { id: data.user.id, email: data.user.email },
  });
}