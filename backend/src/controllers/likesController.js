import { supabaseAsUser } from '../config/supabase.js';

const TRAIL_NOT_FOUND = { error: 'Trail not found' };

// Reads from the database the total likes of the trail and whether the user's like is among them.
// The SQL function returns no row when the trail does not exist: then the result is null.
async function readLikes(db, trailId) {
  const { data, error } = await db.rpc('trail_likes_summary', { p_trail_id: trailId });
  // Unexpected error: errorHandler takes care of it (500)
  if (error) throw error;

  const [row] = data ?? [];
  if (!row) return null;
  return { trailId, count: row.like_count ?? 0, liked: Boolean(row.liked_by_me) };
}

// Answers with the likes of the trail, or 404 if the trail does not exist.
// GET, POST and DELETE all end here, so they answer in the same way.
async function sendLikes(res, db, trailId, status = 200) {
  const likes = await readLikes(db, trailId);
  if (!likes) return res.status(404).json(TRAIL_NOT_FOUND);
  return res.status(status).json(likes);
}


// How many likes the trail has and whether the logged-in user is one of them.
export async function getTrailLikes(req, res) {
  return sendLikes(res, supabaseAsUser(req.token), req.params.id);
}


// Adds the like of the logged-in user and returns the new total.
// If the like was already there (double click, two open tabs) the result for the user
// is the same: we answer 200 with the total instead of an error.
export async function likeTrail(req, res) {
  const db = supabaseAsUser(req.token);
  const trailId = req.params.id;

  const { error } = await db.from('trail_likes').insert({ user_id: req.user.id, trail_id: trailId });

  // 23503: the trail does not exist in the trails table
  if (error?.code === '23503') return res.status(404).json(TRAIL_NOT_FOUND);
  // 23505: the like was already there
  if (error && error.code !== '23505') throw error;

  const created = !error;
  return sendLikes(res, db, trailId, created ? 201 : 200);
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

  return sendLikes(res, db, trailId);
}
