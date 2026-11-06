import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import LogoutButton from '../components/LogoutButton.jsx';
import SideMenu from '../components/SideMenu.jsx';
import { useAuth } from '../context/useAuth.js';
import './AuthPages.css';
import './ProfilePage.css';

// Pagina del profilo: mostra i dati dell'utente loggato.
export default function ProfilePage() {
  const { user } = useAuth();
  const name = user.displayName || user.username || user.email;

  return (
    <main className="auth-page">
      <SideMenu />
      <section className="auth-card profile-card">
        <Avatar name={name} size="lg" />

        <div className="profile-heading">
          <h1>{name}</h1>
          {user.username && <p className="profile-username">@{user.username}</p>}
        </div>

        <dl className="profile-list">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>{user.username || '—'}</dd>
          </div>
          <div>
            <dt>Display name</dt>
            <dd>{user.displayName || '—'}</dd>
          </div>
        </dl>

        <LogoutButton />

        <p className="auth-switch"><Link to="/">← Back to home</Link></p>
      </section>
    </main>
  );
}
