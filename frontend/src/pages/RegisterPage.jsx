import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { registerUser } from '../services/authService.js';
import { validateRegisterForm, PASSWORD_MIN_LENGTH } from '../utils/validateRegisterForm.js';
import './AuthPages.css';

// Initial (empty) values of the form fields
const EMPTY_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  username: '',
  displayName: '',
};

export default function RegisterPage() {
  // What the user typed in each field
  const [values, setValues] = useState(EMPTY_FORM);
  // Messages shown under the fields (from the browser validation)
  const [errors, setErrors] = useState({});
  // Message shown at the top of the form (from the backend)
  const [serverError, setServerError] = useState('');
  // True while the request is in progress: disables the button
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Filled in after a successful registration: shows the success message
  const [registeredEmail, setRegisteredEmail] = useState('');

  // One handler for every input: the "name" attribute tells which field changed
  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Remove the error of that field while the user is fixing it
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    // A form reloads the page by default: we handle the submit ourselves
    event.preventDefault();
    setServerError('');

    const formErrors = validateRegisterForm(values);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return; // invalid data: the request is not sent
    }

    setIsSubmitting(true);
    try {
      await registerUser(values);
      setRegisteredEmail(values.email.trim());
      setValues(EMPTY_FORM);
    } catch (error) {
      // e.g. 409 (email or username already in use), 0 (server unreachable)
      setServerError(error.message);
    } finally {
      // Runs both after success and after an error
      setIsSubmitting(false);
    }
  }

  // After a successful registration we show a message instead of the form
  if (registeredEmail) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Check your inbox</h1>
          <p>
            We sent a confirmation link to <strong>{registeredEmail}</strong>.
            Click it to activate your account.
          </p>
          <p className="auth-switch">
            Already confirmed? <Link to="/login">Log in</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      {/* noValidate: we show our own messages instead of the browser ones */}
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Create your account</h1>

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
          hint={`At least ${PASSWORD_MIN_LENGTH} characters`}
          autoComplete="new-password"
        />
        <FormField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        <FormField
          label="Username (optional)"
          name="username"
          value={values.username}
          onChange={handleChange}
          error={errors.username}
          hint="If you leave it empty, we create one for you"
          autoComplete="username"
        />
        <FormField
          label="Display name (optional)"
          name="displayName"
          value={values.displayName}
          onChange={handleChange}
          autoComplete="name"
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating your account...' : 'Sign up'}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}