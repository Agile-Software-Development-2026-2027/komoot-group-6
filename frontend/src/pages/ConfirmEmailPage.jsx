import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './AuthPages.css';


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

  // L'URL viene letto una sola volta, all'apertura della pagina.
  const [result] = useState(() => readConfirmationResult(location.hash));

  useEffect(() => {
    // Rimuovi i token dalla barra degli indirizzi e dalla cronologia del browser.
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