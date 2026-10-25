import { supabase } from '../config/supabase.js';

// Protegge una rotta: lascia passare solo chi manda un token valido
// Se il token è valido, le funzioni successive trovano l'utente in req.user e il token in req.token.
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  // getUser() fa verificare il token direttamente a Supabase: così vengono rifiutati non solo i token scaduti, ma anche quelli revocati con il logout.
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = data.user;
  req.token = token;
  next();
}
