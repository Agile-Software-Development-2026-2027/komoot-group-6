const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const SPECIAL_CHAR_RE = /[^\p{L}\p{N}\s]/u;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export function validateRegister(req, res, next) {
  
  const { email, password, username } = req.body ?? {};
  const fail = (message) => res.status(400).json({ error: message });

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return fail('Invalid email');
  }
 
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return fail(`The password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return fail(`The password must be at most ${PASSWORD_MAX_LENGTH} characters long`);
  }
  if (!SPECIAL_CHAR_RE.test(password)) {
    return fail('The password must contain at least one special character (e.g. ! ? # @)');
  }
 
  
  if (typeof username !== 'string' || !username.trim()) {
    return fail('The username is required');
  }
  if (!USERNAME_RE.test(username)) {
    return fail('The username must be 3–30 characters long: letters, numbers, or underscores');
  }
 
  next();
}