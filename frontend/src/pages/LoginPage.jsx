import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/useAuth.js';
import { validateLoginForm } from '../utils/validateLoginForm.js';
import './AuthPages.css';

// Valori iniziali (vuoti) dei campi del modulo
const EMPTY_FORM = {
  email: '',
  password: '',
  // "Remember me": se spuntato l'utente resta loggato, altrimenti la sessione dura 1 minuto
  rememberMe: false,
};

export default function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Quello che l'utente ha scritto in ogni campo
  const [values, setValues] = useState(EMPTY_FORM);
  // Messaggi sotto i campi
  const [errors, setErrors] = useState({});
  // Messaggio in cima al modulo 
  const [serverError, setServerError] = useState('');
  // true mentre la richiesta è in corso
  const [isSubmitting, setIsSubmitting] = useState(false);

  // La pagina che l'utente voleva aprire prima di essere mandato qui. Se non c'è, dopo il login va alla home.
  const destination = location.state?.from?.pathname || '/';

  // Un solo gestore per tutti i campi: l'attributo "name" dice quale è cambiato.
  // Per la casella "Remember me" conta se è spuntata (checked), non il valore.
  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    // Toglie l'errore di quel campo mentre l'utente lo corregge
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    // Un form di default ricarica la pagina.
    event.preventDefault();
    setServerError('');

    const formErrors = validateLoginForm(values);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return; // dati non validi: la richiesta non parte.
    }

    setIsSubmitting(true);
    try {
      await login(values);
      navigate(destination, { replace: true });
    } catch (error) {
      // per esempio 401 (credenziali sbagliate), 403 (email non confermata), 0 (server spento).
      setServerError(error.message);
      // Svuota solo la password, l'email resta.
      setValues((prev) => ({ ...prev, password: '' }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      {/* noValidate: mostriamo i nostri messaggi al posto di quelli del browser */}
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Log in</h1>

        {serverError && (
          <p className="form-error" role="alert">{serverError}</p>
        )}

        {/* Mostrato quando l'utente è stato disconnesso perché la sessione era scaduta */}
        {sessionExpired && !serverError && (
          <p className="form-info" role="status">Your session has expired. Please log in again.</p>
        )}

        <FormField
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="current-password"
        />

        <label className="remember-me">
          <input
            type="checkbox"
            name="rememberMe"
            checked={values.rememberMe}
            onChange={handleChange}
          />
          Remember me
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </button>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </main>
  );
}
