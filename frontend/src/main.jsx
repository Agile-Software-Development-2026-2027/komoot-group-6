import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import './index.css';

// Punto di ingresso: React prende il controllo del <div id="root"> in index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter rende il routing disponibile a ogni componente */}
    <BrowserRouter>
      {/* AuthProvider rende lo stato di accesso disponibile a ogni componente */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);