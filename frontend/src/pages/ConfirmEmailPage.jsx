import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './AuthPages.css';

// After the confirmation link, Supabase sends the user here and puts the
// result in the part of the URL after "#":
//   success: #access_token=...&refresh_token=...&type=signup
//   error:   #error=access_denied&error_code=otp_expired&error_description=...
function readConfirmationResult(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  if (params.get('error')) {
    return { status: 'error', code: params.get('error_code') };
  }
  if (params.get('access_token')) {
    return { status: 'success' };
  }
  return { status: 'unknown' };
}

export default function ConfirmEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // The URL is read only once, when the page opens
  const [result] = useState(() => readConfirmationResult(location.hash));

  useEffect(() => {
    // Remove the tokens from the address bar and from the browser history
    if (location.hash) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  if (result.status === 'success') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Email confirmed</h1>
          <p>Your account is active. You can now log in.</p>
          <Link className="button-link" to="/login">Log in</Link>
        </section>
      </main>
    );
  }

  if (result.status === 'error') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Link not valid</h1>
          <p>
            {result.code === 'otp_expired'
              ? 'This confirmation link has expired or has already been used.'
              : 'We could not confirm your email.'}
          </p>
          <Link className="button-link" to="/register">Back to sign up</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Nothing to confirm</h1>
        <p>Open the link we sent you by email to confirm your account.</p>
        <Link className="button-link" to="/register">Go to sign up</Link>
      </section>
    </main>
  );
}