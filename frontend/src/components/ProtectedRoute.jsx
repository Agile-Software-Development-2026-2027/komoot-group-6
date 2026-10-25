import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

// Protegge le pagine che richiedono il login. 
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Aspetta che AuthProvider abbia controllato la sessione salvata: senza questa attesa, ricaricando la pagina un utente loggato verrebbe mandato al login temporaneamente.
  if (loading) {
    return (
      <main className="auth-page">
        <p role="status">Loading...</p>
      </main>
    );
  }

  // Non loggato: va al login. In state.from ricordiamo la pagina che voleva aprire, così dopo il login ci torna.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
