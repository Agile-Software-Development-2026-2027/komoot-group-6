import { Navigate, Route, Routes } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage.jsx';
import ConfirmEmailPage from './pages/ConfirmEmailPage.jsx';

// Map of the pages: each Route links a URL to the component to show.
// Other pages (login, map, profile...) will be added here by their tasks.
export default function App() {
  return (
    <Routes>
      {/* Temporary: until the home page exists, "/" goes to sign up */}
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
      {/* Any unknown URL goes back to "/" */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}