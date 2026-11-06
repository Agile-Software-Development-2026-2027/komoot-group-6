// Dopo quanto tempo senza attività (clic, tasti, movimenti del mouse) la sessione scade.
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

// Dice se una sessione non va più usata. Succede se:
// - non si sa quando l'utente è stato attivo l'ultima volta.
// - l'ultima attività è più vecchia di IDLE_TIMEOUT_MS;
// - è passata la durata massima dal login decisa dal backend (session_expires_at, in secondi).
export function isSessionExpired(session, lastActivity, now = Date.now()) {
  if (!session || !lastActivity) return true;
  if (now - lastActivity >= IDLE_TIMEOUT_MS) return true;
  // Se il backend non manda session_expires_at conta solo l'inattività.
  return session.session_expires_at ? now >= session.session_expires_at * 1000 : false;
}
