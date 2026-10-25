const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Controlla i valori del modulo e restituisce un messaggio per ogni campo non valido.
// Un oggetto vuoto vuol dire che il modulo è valido.
export function validateLoginForm(values) {
  const errors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  // Al login basta che la password ci sia: se è giusta lo verifica Supabase.
  if (!values.password) {
    errors.password = 'Password is required';
  }

  return errors;
}
