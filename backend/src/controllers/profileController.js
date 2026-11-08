import { supabaseAsUser } from '../config/supabase.js';
import { calculateHikeScore } from '../utils/calculateHikeScore.js';
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


// Restituisce i sentieri salvati dall'utente loggato, dal più recente: [{ trail_id, created_at }, ...].
// Il frontend li usa per mostrare il segnalibro pieno sulle card dei sentieri già salvati.
export async function getSavedTrails(req, res) {
  const { data, error } = await supabaseAsUser(req.token)
    .from('saved_trails')
    .select('trail_id, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  // Errore inatteso: ci pensa errorHandler (500)
  if (error) throw error;

  return res.json(data ?? []);
}


// Segna un sentiero come completato nel profilo dell'utente loggato (tabella completed_trails, vedi database/completed_trails.sql).
// requireAuth ha già messo l'utente in req.user e il token in req.token.
export async function completeTrail(req, res) {
  const { trailId } = req.body;

  // Fetch trail info to get difficulty and distance for points calculation
  const { data: trail, error: trailError } = await supabaseAsUser(req.token)
    .from('trails')
    .select('difficulty, length_m')
    .eq('id', trailId)
    .single();
//  console.log("Trail info(Difficulty-distance)::", trail.difficulty, trail.length_m)

 if (trailError)
  {
    if (trailError.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Trail not found'
      });
    }
  throw trailError;
  }
  if (!trail) {
    return res.status(404).json({
      error: 'Trail not found'
    });
  }
  
  // Calculate points based on difficulty and length
  const pointsEarned = calculateHikeScore(trail.difficulty, trail.length_m);
  console.log("Points earned::", pointsEarned)
  const { data, error } = await supabaseAsUser(req.token)
    .from('completed_trails')
    .insert({ user_id: req.user.id, trail_id: trailId,points_earned: pointsEarned });

   // console.log("Completed trail::", data)
  if (error) {
    const known = COMPLETE_ERRORS[error.code];
    if (known) return res.status(known.status).json({ error: known.error });
    // Errore inatteso: ci pensa errorHandler (500)
    throw error;
  }

  return res.status(201).json({ trailId });
}


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


// Rimuove un sentiero completato nel profilo dell'utente loggato.
export async function uncompleteTrail(req, res) {
  const { trailId } = req.params;
  console.log(`Uncompleting trail ${trailId} for user ${req.user.id}`);

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

export async function getProfilePoints(req, res) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAsUser(req.token)
      .from('completed_trails')
      .select('points_earned')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch points:', error);

      return res.status(500).json({
        error: 'Failed to retrieve points'
      });
    }

    const totalPoints = data.reduce(
      (sum, trail) => sum + trail.points_earned,
      0
    );
    console.log(`User ${userId} has total points: ${totalPoints} from ${data.length} completed routes.`);
    return res.status(200).json({
      totalPoints,
      completedRoutes: data.length
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}