const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Controlla i dati del login prima di disturbare Supabase:
// l'email deve avere un formato valido e la password deve esserci.
export function validateLogin(req, res, next) {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  next();
}
