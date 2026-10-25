import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Entry point: React takes control of the <div id="root"> in index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter makes routing available to every component */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);