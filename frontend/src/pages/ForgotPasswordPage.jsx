import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { requestPasswordReset } from '../services/loginService.js';
import { validateForgotPasswordForm } from '../utils/validatePasswordReset.js';
import './AuthPages.css';

// "Forgot password" page: the user enters their email and receives the link to reset the password.
export default function ForgotPasswordPage() {
  const location = useLocation();

  // If the user comes from the login page, the email typed there is filled in.
  const [values, setValues] = useState({ email: location.state?.email ?? '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // true once the request succeeds: the confirmation message is shown instead of the form.
  const [isSent, setIsSent] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    const formErrors = validateForgotPasswordForm(values);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setIsSent(true);
    } catch (error) {
      // e.g. 0 (server down) or 400 (email rejected by the backend).
      setServerError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Check your email</h1>
          {/* Same message whether the email is registered or not:
              this way the page does not reveal which emails have an account. */}
          <p>
            If an account exists for <strong>{values.email.trim()}</strong>, you will receive
            a link to reset your password. The link can only be used once.
          </p>
          <Link className="button-link" to="/login">Back to log in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Forgot password?</h1>
        <p>Enter the email you signed up with and we will send you a link to choose a new password.</p>

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

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>

        <p className="auth-switch">
          Remembered it? <Link to="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}
