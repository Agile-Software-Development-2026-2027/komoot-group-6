import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import LogoutButton from './LogoutButton.jsx';
import { useAuth } from '../context/useAuth.js';
import './SideMenu.css';

// Menu laterale a scomparsa: l'hamburger lo apre, poi si chiude con Esc, X o toccando lo sfondo.
export default function SideMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  // true dopo la prima apertura: serve a non spostare il focus quando la pagina si carica
  const hasOpenedRef = useRef(false);

  const name = user.displayName || user.username || user.email;

  // Esc chiude il menu
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Il focus entra nel menu quando si apre e torna all'hamburger quando si chiude
  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      closeButtonRef.current?.focus();
    } else if (hasOpenedRef.current) {
      openButtonRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        className="menu-toggle"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="side-menu"
        onClick={() => setOpen(true)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className={`menu-scrim${open ? ' is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      {/* inert: quando è chiuso, Tab non entra nei suoi link */}
      <aside id="side-menu" className={`side-menu${open ? ' is-open' : ''}`} aria-label="Main menu" inert={!open}>
        <button ref={closeButtonRef} type="button" className="menu-close" aria-label="Close menu" onClick={() => setOpen(false)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="menu-user">
          <Avatar name={name} />
          <div className="menu-user-text">
            <strong>{name}</strong>
            {user.username && <span>@{user.username}</span>}
          </div>
        </div>

        <nav className="menu-nav" aria-label="Main">
          <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/profile" onClick={() => setOpen(false)}>Profile</NavLink>
        </nav>

        <LogoutButton className="menu-logout" />
      </aside>
    </>
  );
}
