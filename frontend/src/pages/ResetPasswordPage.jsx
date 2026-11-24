import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { resetPassword } from '../services/loginService.js';
import { validateResetPasswordForm } from '../utils/validatePasswordReset.js';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../config/auth.config.js';
import './AuthPages.css';

// Supabase brings the user back here from the email link, with the data after the # of the URL:
// #access_token=...&type=recovery if the link is valid, #error=...&error_code=... if it is not.
function readResetLink(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  if (params.get('error')) {
    return { status: 'error', code: params.get('error_code') };
  }
  if (params.get('access_token')) {
    return { status: 'valid', accessToken: params.get('access_token') };
  }
  return { status: 'missing' };
}

// "New password" page: opened from the link received by email.
export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // The link is read only once, when the page opens (as in ConfirmEmailPage).
  const [link] = useState(() => readResetLink(location.hash));

  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  // true if the backend says the link has expired or was already used.
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Removes the token from the address bar and from the browser history.
    if (location.hash) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    const formErrors = validateResetPasswordForm(values);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ accessToken: link.accessToken, password: values.password });
      setIsDone(true);
    } catch (error) {
      if (error.status === 401) {
        setIsExpired(true);
      } else {
        // e.g. 400 (password too weak for Supabase) or 0 (server down).
        setServerError(error.message);
        setValues({ password: '', confirmPassword: '' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Password updated</h1>
          <p>Your new password is set. You can now log in with it.</p>
          <Link className="button-link" to="/login">Log in</Link>
        </section>
      </main>
    );
  }

  // Invalid link: expired, already used, or page opened without going through the email.
  if (link.status !== 'valid' || isExpired) {
    const expired = isExpired || link.code === 'otp_expired';
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Link not valid</h1>
          <p>
            {link.status === 'missing' && !isExpired
              ? 'Open the link we sent you by email to choose a new password.'
              : expired
                ? 'This reset link has expired or has already been used.'
                : 'We could not verify your reset link.'}
          </p>
          <Link className="button-link" to="/forgot-password">Request a new link</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Choose a new password</h1>

        {serverError && (
          <p className="form-error" role="alert">{serverError}</p>
        )}

        <FormField
          label="New password"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          info={`${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters, with at least one special character (e.g. ! ? # @)`}
          autoComplete="new-password"
        />
        <FormField
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save new password'}
        </button>
      </form>
    </main>
  );
}
