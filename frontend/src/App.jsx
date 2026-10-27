import { Navigate, Route, Routes } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage.jsx';
import ConfirmEmailPage from './pages/ConfirmEmailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import MapView from './components/MapView/MapView.jsx';


export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/map" element={<MapView />} />
      {/* Pagine che richiedono l'accesso */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      {/* Qualsiasi URL sconosciuto rimanda a "/" */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}