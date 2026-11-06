import { supabaseAsUser } from '../config/supabase.js';

const LIKE_ERRORS = {
  '23503': { status: 404, error: 'Trail not found' }, // the trail does not exist in the trails table
  '22P02': { status: 400, error: 'Invalid trail id' }, // the id is not a uuid
};

// Reads from the database the total likes of the trail and whether the user's like is among them.
// The SQL function always returns one row, but an empty answer counts as 0 just in case.
async function readLikes(db, trailId) {
  const { data, error } = await db.rpc('trail_likes_summary', { p_trail_id: trailId });
  // Unexpected error: errorHandler takes care of it (500)
  if (error) throw error;

  const [row] = data ?? [];
  return { trailId, count: row?.like_count ?? 0, liked: Boolean(row?.liked_by_me) };
}


// How many likes the trail has and whether the logged-in user is one of them.
export async function getTrailLikes(req, res) {
  const db = supabaseAsUser(req.token);
  return res.json(await readLikes(db, req.params.id));
}


// Adds the like of the logged-in user and returns the new total.
// If the like was already there (double click, two open tabs) the result for the user
// is the same: we answer 200 with the total instead of an error.
export async function likeTrail(req, res) {
  const db = supabaseAsUser(req.token);
  const trailId = req.params.id;

  const { error } = await db.from('trail_likes').insert({ user_id: req.user.id, trail_id: trailId });

  if (error && error.code !== '23505') {
    const known = LIKE_ERRORS[error.code];
    if (known) return res.status(known.status).json({ error: known.error });
    throw error;
  }

  const created = !error;
  return res.status(created ? 201 : 200).json(await readLikes(db, trailId));
}


// Removes the like of the logged-in user and returns the new total.
// If there was no like, the delete finds no rows: that is fine too.
export async function unlikeTrail(req, res) {
  const db = supabaseAsUser(req.token);
  const trailId = req.params.id;

  const { error } = await db
    .from('trail_likes')
    .delete()
    .eq('user_id', req.user.id)
    .eq('trail_id', trailId);

  if (error) throw error;

  return res.json(await readLikes(db, trailId));
}
