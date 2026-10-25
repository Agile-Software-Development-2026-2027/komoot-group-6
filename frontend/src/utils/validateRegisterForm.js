// Same rules as the backend (middlewares/validateRegister.js): keep them in sync!
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
export const PASSWORD_MIN_LENGTH = 8;

// Checks the form values and returns one message per invalid field.
// An empty object means that the form is valid.
export function validateRegisterForm(values) {
  const errors = {};
  const email = values.email.trim();
  const username = values.username.trim();

  if (!email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `The password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  }

  // Checked only in the browser: the backend never receives confirmPassword
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'The passwords do not match';
  }

  // The username is optional, but if present it must follow the rules
  if (username && !USERNAME_RE.test(username)) {
    errors.username = '3-30 characters: letters, numbers or underscore';
  }

  return errors;
}