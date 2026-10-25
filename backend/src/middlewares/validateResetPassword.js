// Controlla i dati per impostare la nuova password: il token del link
// ricevuto per email e una password di almeno 8 caratteri.
export function validateResetPassword(req, res, next) {
  const { access_token: accessToken, password } = req.body ?? {};

  if (typeof accessToken !== 'string' || !accessToken) {
    return res.status(400).json({ error: 'Invalid reset link. Request a new one.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'The password must be at least 8 characters long' });
  }

  next();
}
