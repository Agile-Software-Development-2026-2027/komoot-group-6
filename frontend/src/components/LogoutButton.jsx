import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

// Pulsante di logout: chiude la sessione e torna alla pagina di login.
export default function LogoutButton({ className }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  // true mentre il logout è in corso: disattiva il pulsante
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    // logout() non dà mai errore: la sessione locale viene cancellata comunque.
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <button type="button" className={className} onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? 'Logging out...' : 'Log out'}
    </button>
  );
}
