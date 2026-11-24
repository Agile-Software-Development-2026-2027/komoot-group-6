import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/useAuth.js';
import { validateLoginForm } from '../utils/validateLoginForm.js';
import './AuthPages.css';

// Initial (empty) values of the form fields
const EMPTY_FORM = {
  email: '',
  password: '',
  // "Remember me": if checked the user stays logged in (30 days), otherwise the session expires after inactivity or at the end of the day (8 hours by default)
  rememberMe: false,
};

export default function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // What the user typed in each field
  const [values, setValues] = useState(EMPTY_FORM);
  // Messages under the fields
  const [errors, setErrors] = useState({});
  // Message at the top of the form
  const [serverError, setServerError] = useState('');
  // true while the request is in progress
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The page the user wanted to open before being sent here. If there is none, after login they go to the home page.
  const { pathname = '/', search = '', hash = '' } = location.state?.from ?? {};
  const destination = { pathname, search, hash };

  // One handler for all fields: the "name" attribute tells which one changed.
  // For the "Remember me" checkbox what matters is whether it is checked, not its value.
  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    // Clears the error of that field while the user fixes it
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    // By default a form reloads the page.
    event.preventDefault();
    setServerError('');

    const formErrors = validateLoginForm(values);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return; // invalid data: the request is not sent.
    }

    setIsSubmitting(true);
    try {
      await login(values);
      navigate(destination, { replace: true });
    } catch (error) {
      // e.g. 401 (wrong credentials), 403 (email not confirmed), 0 (server down).
      setServerError(error.message);
      // Clears only the password, the email stays.
      setValues((prev) => ({ ...prev, password: '' }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      {/* noValidate: we show our own messages instead of the browser's */}
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Log in</h1>

        {serverError && (
          <p className="form-error" role="alert">{serverError}</p>
        )}

        {/* Shown when the user was logged out because the session had expired */}
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

        {/* "Remember me" and the password recovery link on the same row */}
        <div className="login-options">
          <label className="remember-me">
            <input
              type="checkbox"
              name="rememberMe"
              checked={values.rememberMe}
              onChange={handleChange}
            />
            Remember me
          </label>
          {/* Passes the email already typed, so it does not have to be typed again on the recovery page */}
          <Link className="forgot-password-link" to="/forgot-password" state={{ email: values.email }}>
            Forgot password?
          </Link>
        </div>

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
