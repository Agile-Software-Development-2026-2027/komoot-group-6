const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Controlla che l'email per il recupero password abbia un formato valido.
export function validateForgotPassword(req, res, next) {
  const { email } = req.body ?? {};

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  next();
}
