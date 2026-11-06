import { supabaseAsUser } from '../config/supabase.js';

// Errori di Postgres che possono arrivare dall'insert, con la risposta da dare.
const INSERT_ERRORS = {
  '23505': { status: 409, error: 'Trail already saved' }, // chiave duplicata: l'utente l'ha già salvato
  '23503': { status: 404, error: 'Trail not found' }, // il sentiero non esiste nella tabella trails
  '22P02': { status: 400, error: 'Invalid trail id' }, // l'id non è un uuid
};

const COMPLETE_ERRORS = {
  '23505': { status: 409, error: 'Trail already completed' }, // chiave duplicata: l'utente l'ha già completato
  '23503': { status: 404, error: 'Trail not found' }, // il sentiero non esiste nella tabella trails
  '22P02': { status: 400, error: 'Invalid trail id' }, // l'id non è un uuid
};

// POST /api/profile/saved-trails
// Salva un sentiero nel profilo dell'utente loggato (tabella saved_trails, vedi database/saved_trails.sql).
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

// POST /api/profile/completed-trails
// Segna un sentiero come completato nel profilo dell'utente loggato (tabella completed_trails, vedi database/completed_trails.sql).
// requireAuth ha già messo l'utente in req.user e il token in req.token.
export async function completeTrail(req, res) {
  const { trailId } = req.body;

  const { error } = await supabaseAsUser(req.token)
    .from('completed_trails')
    .insert({ user_id: req.user.id, trail_id: trailId });

  if (error) {
    const known = COMPLETE_ERRORS[error.code];
    if (known) return res.status(known.status).json({ error: known.error });
    // Errore inatteso: ci pensa errorHandler (500)
    throw error;
  }

  return res.status(201).json({ trailId });
}

// GET /api/profile/completed-trails
// Restituisce l'elenco dei sentieri completati dall'utente loggato.
export async function getCompletedTrails(req, res) {
  const { data, error } = await supabaseAsUser(req.token)
    .from('completed_trails')
    .select('trail_id, completed_at')
    .order('completed_at', { ascending: false });

  if (error) {
    throw error;
  }

  return res.json(data ?? []);
}

// DELETE /api/profile/completed-trails/:trailId
// Rimuove un sentiero completato nel profilo dell'utente loggato.
export async function uncompleteTrail(req, res) {
  const { trailId } = req.params;

  const { error } = await supabaseAsUser(req.token)
    .from('completed_trails')
    .delete()
    .eq('user_id', req.user.id)
    .eq('trail_id', trailId);

  if (error) {
    if (error.code === '22P02') return res.status(400).json({ error: 'Invalid trail id' });
    throw error;
  }

  return res.status(204).end();
}

