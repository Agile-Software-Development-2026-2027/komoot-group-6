import { PASSWORD_LENGTH } from '../config/auth.config.js';

// Same rule as sign-up: at least one character that is not a letter, a number or a space.
const SPECIAL_CHAR_RE = /[^\p{L}\p{N}\s]/u;

// Checks the data to set the new password: the token of the link received by email
// and a password with the same rules as sign-up (length and special character).
export function validateResetPassword(req, res, next) {
  const { access_token: accessToken, password } = req.body ?? {};

  if (typeof accessToken !== 'string' || !accessToken) {
    return res.status(400).json({ error: 'Invalid reset link. Request a new one.' });
  }
  if (typeof password !== 'string' || password.length < PASSWORD_LENGTH.min) {
    return res.status(400).json({ error: `The password must be at least ${PASSWORD_LENGTH.min} characters long` });
  }
  if (password.length > PASSWORD_LENGTH.max) {
    return res.status(400).json({ error: `The password must be at most ${PASSWORD_LENGTH.max} characters long` });
  }
  if (!SPECIAL_CHAR_RE.test(password)) {
    return res.status(400).json({ error: 'The password must contain at least one special character (e.g. ! ? # @)' });
  }

  next();
}
