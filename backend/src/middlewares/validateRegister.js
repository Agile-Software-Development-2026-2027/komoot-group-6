import { MAX_AGE, MIN_AGE, PASSWORD_LENGTH, USERNAME_LENGTH } from '../config/auth.config.js';

// Checks the body of POST /api/auth/register before calling Supabase.
// The limits are in config/auth.config.js. The same rules are in frontend/src/utils/validateRegisterForm.js:
// if you change a rule here, change it there too.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Letters, numbers or underscore, with the length of USERNAME_LENGTH
const USERNAME_RE = new RegExp(`^[a-zA-Z0-9_]{${USERNAME_LENGTH.min},${USERNAME_LENGTH.max}}$`);

// At least one character that is NOT a letter, a number or a space (e.g. ! ? # @ . -)
// \p{L} = any letter (also à, é...), \p{N} = any number, the "u" flag enables \p{...}
const SPECIAL_CHAR_RE = /[^\p{L}\p{N}\s]/u;

// The birth date arrives as text 'YYYY-MM-DD' (the format of <input type="date">)
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Age in full years on the day "today" (both are { year, month, day })
function ageOn(birth, today) {
  let age = today.year - birth.year;
  // Birthday not reached yet this year: one year less
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) {
    age -= 1;
  }
  return age;
}

// Returns the error message for the birth date, or null if it is valid
export function birthDateError(value, now = new Date()) {
  if (typeof value !== 'string' || !value) return 'The birth date is required';

  const match = DATE_RE.exec(value);
  if (!match) return 'Invalid birth date: use the format YYYY-MM-DD';

  const birth = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  // Date.UTC "fixes" impossible dates (2001-02-30 becomes 2001-03-02):
  // if the numbers change, the date did not exist
  const date = new Date(Date.UTC(birth.year, birth.month - 1, birth.day));
  if (date.getUTCFullYear() !== birth.year || date.getUTCMonth() !== birth.month - 1 || date.getUTCDate() !== birth.day) {
    return 'Invalid birth date';
  }

  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  const age = ageOn(birth, today);
  if (age < 0) return 'The birth date cannot be in the future';
  if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old to sign up`;
  if (age > MAX_AGE) return 'Invalid birth date';

  return null;
}

export function validateRegister(req, res, next) {
  const { email, password, username, birthDate } = req.body ?? {};
  const fail = (message) => res.status(400).json({ error: message });

  // typeof: a number or an object in the JSON must be rejected, not crash the check
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return fail('Invalid email');
  }

  if (typeof password !== 'string' || password.length < PASSWORD_LENGTH.min) {
    return fail(`The password must be at least ${PASSWORD_LENGTH.min} characters long`);
  }
  if (password.length > PASSWORD_LENGTH.max) {
    return fail(`The password must be at most ${PASSWORD_LENGTH.max} characters long`);
  }
  if (!SPECIAL_CHAR_RE.test(password)) {
    return fail('The password must contain at least one special character (e.g. ! ? # @)');
  }

  // The username is required
  if (typeof username !== 'string' || !username.trim()) {
    return fail('The username is required');
  }
  if (!USERNAME_RE.test(username)) {
    return fail(
      `The username must be ${USERNAME_LENGTH.min}–${USERNAME_LENGTH.max} characters long: letters, numbers, or underscores`,
    );
  }

  // The birth date is required and the user must be old enough
  const birthDateMessage = birthDateError(birthDate);
  if (birthDateMessage) {
    return fail(birthDateMessage);
  }

  next();
}