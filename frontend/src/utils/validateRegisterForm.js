const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
export const PASSWORD_MIN_LENGTH = 8;

// Verifica i valori del modulo e restituisce un messaggio per ogni campo non valido.
// Un oggetto vuoto indica che il modulo è valido.
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

  // Verificato solo nel browser: il backend non riceve mai confirmPassword.
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'The passwords do not match';
  }

  // Il nome utente è facoltativo, ma se presente deve rispettare le regole.
  if (username && !USERNAME_RE.test(username)) {
    errors.username = '3-30 characters: letters, numbers or underscore';
  }

  return errors;
}