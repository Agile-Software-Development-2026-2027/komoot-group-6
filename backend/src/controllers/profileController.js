import { supabaseAsUser } from '../config/supabase.js';

// Errori di Postgres che possono arrivare dall'insert, con la risposta da dare.
const INSERT_ERRORS = {
  '23505': { status: 409, error: 'Trail already saved' }, // chiave duplicata: l'utente l'ha già salvato
  '23503': { status: 404, error: 'Trail not found' }, // il sentiero non esiste nella tabella trails
  '22P02': { status: 400, error: 'Invalid trail id' }, // l'id non è un uuid
};

// POST /api/profile/saved-trails
// Salva un sentiero nel profilo dell'utente loggato (tabella saved_trails, vedi sql/saved_trails.sql).
// requireAuth ha già messo l'utente in req.user e il token in req.token.
export async function saveTrail(req, res) {
  const { trailId } = req.body;

  const { error } = await supabaseAsUser(req.token)
    .from('saved_trails')
    .insert({ user_id: req.user.id, trail_id: trailId });

  if (error) {
    const known = INSERT_ERRORS[error.code];
    if (known) return res.status(known.status).json({ error: known.error });
    // Errore inatteso: ci pensa errorHandler (500)
    throw error;
  }

  return res.status(201).json({ trailId });
}
