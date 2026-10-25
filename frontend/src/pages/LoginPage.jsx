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
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Quello che l'utente ha scritto in ogni campo
  const [values, setValues] = useState(EMPTY_FORM);
  // Messaggi sotto i campi (dal controllo nel browser)
  const [errors, setErrors] = useState({});
  // Messaggio in cima al modulo (dal backend)
  const [serverError, setServerError] = useState('');
  // true mentre la richiesta è in corso: disattiva il pulsante
  const [isSubmitting, setIsSubmitting] = useState(false);

  // La pagina che l'utente voleva aprire prima di essere mandato qui. Se non c'è, dopo il login va al profilo.
  const destination = location.state?.from?.pathname || '/profile';

  // Un solo gestore per tutti i campi: l'attributo "name" dice quale è cambiato
  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
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
