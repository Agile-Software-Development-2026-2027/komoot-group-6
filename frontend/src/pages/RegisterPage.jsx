import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { registerUser } from '../services/authService.js';
import {birthDateLimits,MIN_AGE,PASSWORD_MAX_LENGTH,PASSWORD_MIN_LENGTH,validateRegisterForm,} from '../utils/validateRegisterForm.js';
import './AuthPages.css';


const EMPTY_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  username: '',
  displayName: '',
  birthDate: '',
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


  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    
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
    
      setServerError(error.message);
    } finally {
    
      setIsSubmitting(false);
    }
  }

  
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
          info={`${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters, with at least one special character (e.g. ! ? # @)`}
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
                {/* Two fields side by side, so the form does not get longer */}
        <div className="field-row">
          <FormField
            label="Username"
            name="username"
            value={values.username}
            onChange={handleChange}
            error={errors.username}
            info="3-30 characters: letters, numbers or underscore"
            autoComplete="username"
          />
          <FormField
            label="Date of birth"
            name="birthDate"
            type="date" // the browser shows its own calendar (date picker)
            value={values.birthDate}
            onChange={handleChange}
            error={errors.birthDate}
            info={`You must be at least ${MIN_AGE} years old`}
            autoComplete="bday"
            // Days outside these limits are greyed out in the calendar
            min={birthDateLimits().min}
            max={birthDateLimits().max}
          />
        </div>
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