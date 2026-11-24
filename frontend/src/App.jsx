import { Navigate, Route, Routes } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage.jsx';
import ConfirmEmailPage from './pages/ConfirmEmailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import TrailPage from './pages/TrailPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
      <Route path="/login" element={<LoginPage />} />
      {/* Password recovery: request the link and choose the new password (public pages) */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      {/* Pages that require login */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/trails/:id" element={<TrailPage />} />
        <Route path="/map" element={<Navigate to="/" replace />} />
      </Route>
      {/* Any unknown URL redirects to "/" */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
