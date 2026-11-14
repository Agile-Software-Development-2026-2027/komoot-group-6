import { IDLE_TIMEOUT_MS } from '../config/auth.config.js';

// Dice se una sessione non va più usata. Succede se:
// - è passata la durata massima dal login decisa dal backend (session_expires_at, in secondi):
//   8 ore senza "Remember me" (o quanto impostato nel backend), 30 giorni con "Remember me";
// - senza "Remember me": non si sa quando l'utente è stato attivo l'ultima volta,
//   oppure l'ultima attività è più vecchia di IDLE_TIMEOUT_MS.
// Con "Remember me" l'inattività non conta: l'utente resta loggato.
export function isSessionExpired(session, lastActivity, now = Date.now()) {
  if (!session) return true;
  if (!session.remember_me) {
    if (!lastActivity) return true;
    if (now - lastActivity >= IDLE_TIMEOUT_MS) return true;
  }
  // Se il backend non manda session_expires_at conta solo l'inattività.
  return session.session_expires_at ? now >= session.session_expires_at * 1000 : false;
}
