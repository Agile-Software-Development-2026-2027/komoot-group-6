import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../config/auth.config.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rule as sign-up: at least one character that is not a letter, a number or a space.
const SPECIAL_CHAR_RE = /[^\p{L}\p{N}\s]/u;

// "Forgot password" form: a valid email is enough.
// An empty object means the form is valid.
export function validateForgotPasswordForm(values) {
  const errors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  return errors;
}

// "New password" form: the same password rules as sign-up,
// so recovery cannot set a password that sign-up would reject.
export function validateResetPasswordForm(values) {
  const errors = {};
  const { password } = values;

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `The password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `The password must be at most ${PASSWORD_MAX_LENGTH} characters long`;
  } else if (!SPECIAL_CHAR_RE.test(password)) {
    errors.password = 'Add at least one special character (e.g. ! ? # @)';
  }

  if (values.confirmPassword !== password) {
    errors.confirmPassword = 'The passwords do not match';
  }

  return errors;
}
