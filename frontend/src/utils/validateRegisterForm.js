const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;


const SPECIAL_CHAR_RE = /[^\p{L}\p{N}\s]/u;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export function validateRegisterForm(values) {
  const errors = {};
  const email = values.email.trim();
  const username = values.username.trim();
  const { password } = values;

  if (!email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address';
  }


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

  if (!username) {
    errors.username = 'Username is required';
  } else if (!USERNAME_RE.test(username)) {
    errors.username = '3-30 characters: letters, numbers or underscore';
  }

  return errors;
}