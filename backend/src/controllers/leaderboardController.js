import { TRAIL_NOT_FOUND_ERROR } from '../config/leaderboard.config.js';
import { supabaseAsUser } from '../config/supabase.js';

// maps a raw database row of the trail leaderboard to camel case json fields
function toTrailLeaderboardEntry(row) {
  return {
    rank: row.rank,
    username: row.username,
    displayName: row.display_name,
    level: row.level,
    pointsEarned: row.points_earned,
    completedAt: row.completed_at,
    isMine: row.is_mine === true,
  };
}

// maps a raw database row of the global leaderboard to camel case json fields
function toGlobalLeaderboardEntry(row) {
  return {
    rank: row.rank,
    username: row.username,
    displayName: row.display_name,
    level: row.level,
    totalPoints: row.total_points ?? 0,
    completedTrails: row.completed_trails ?? 0,
    isMine: row.is_mine === true,
  };
}

// returns the leaderboard of a specific trail ordered by points earned on that hike
export async function getTrailLeaderboard(req, res) {
  // run the query as the authenticated user so auth uid matches their id
  const db = supabaseAsUser(req.token);
  const trailId = req.params.id;

  // call the database rpc function with the validated trail id and limit
  const { data, error } = await db.rpc('get_trail_leaderboard', {
    p_trail_id: trailId,
    p_limit: req.leaderboardLimit,
  });

  // forward unexpected database errors to the global error handler
  if (error) throw error;

  // when the trail does not exist the sql function returns zero rows
  const [row] = data ?? [];
  if (!row) return res.status(404).json(TRAIL_NOT_FOUND_ERROR);

  // format the entries and return them without browser caching
  const leaderboard = (row.leaderboard ?? []).map(toTrailLeaderboardEntry);
  return res.set('Cache-Control', 'no-store').json({ trailId, leaderboard });
}

// returns the global leaderboard ordered by highest level and total points
export async function getGlobalLeaderboard(req, res) {
  // run the query as the authenticated user so auth uid matches their id
  const db = supabaseAsUser(req.token);

  // call the database rpc function with the validated limit
  const { data, error } = await db.rpc('get_global_leaderboard', {
    p_limit: req.leaderboardLimit,
  });

  // forward unexpected database errors to the global error handler
  if (error) throw error;

  // format the entries and return them without browser caching
  const leaderboard = (data ?? []).map(toGlobalLeaderboardEntry);
  return res.set('Cache-Control', 'no-store').json({ leaderboard });
}
