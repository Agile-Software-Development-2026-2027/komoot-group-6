import LogoutButton from '../components/LogoutButton.jsx';
import { useAuth } from '../context/useAuth.js';
import './AuthPages.css';

// Temporanea: la pagina dove si arriva dopo il login, finché non esiste il vero profilo.
export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Welcome, {user.displayName || user.username || user.email}</h1>
        <p>You are logged in.</p>
        <LogoutButton />
      </section>
    </main>
  );
}
