import { PASSWORD_LENGTH } from '../config/auth.config.js';

// Checks the data to set the new password: the token of the link received by email
// and a password of at least PASSWORD_LENGTH.min characters.
export function validateResetPassword(req, res, next) {
  const { access_token: accessToken, password } = req.body ?? {};

  if (typeof accessToken !== 'string' || !accessToken) {
    return res.status(400).json({ error: 'Invalid reset link. Request a new one.' });
  }
  if (typeof password !== 'string' || password.length < PASSWORD_LENGTH.min) {
    return res.status(400).json({ error: `The password must be at least ${PASSWORD_LENGTH.min} characters long` });
  }

  next();
}