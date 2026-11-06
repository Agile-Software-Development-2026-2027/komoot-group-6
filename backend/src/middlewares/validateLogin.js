const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Controlla i dati del login prima di disturbare Supabase:
// l'email deve avere un formato valido e la password deve esserci.
// rememberMe ("Remember me") è facoltativo: se c'è deve essere true o false.
export function validateLogin(req, res, next) {
  const { email, password, rememberMe } = req.body ?? {};

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  if (rememberMe !== undefined && typeof rememberMe !== 'boolean') {
    return res.status(400).json({ error: 'rememberMe must be true or false' });
  }

  next();
}
