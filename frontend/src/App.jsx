import { Navigate, Route, Routes } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage.jsx';
import ConfirmEmailPage from './pages/ConfirmEmailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import MapView from './components/MapView/MapView.jsx';

export default function App() {
  return (
    <Routes>
      {/* Provvisorio: finché non esiste la home page, "/" rimanda alla registrazione */}
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
      <Route path="/login" element={<LoginPage />} />
      {/* Pagine che richiedono l'accesso */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      {/* Qualsiasi URL sconosciuto rimanda a "/" */}
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/map" element={<MapView />} />
    </Routes>
  );
}