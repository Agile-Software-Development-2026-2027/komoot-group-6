import { supabaseAsUser } from '../config/supabase.js';
import { calculateHikeScore } from '../utils/calculateHikeScore.js';
import { describeLevel } from '../utils/describeLevel.js';

const PROFILE_SEARCH_PAGE_SIZE = 20;

// Postgres errors that can come from the insert, with the response to send.
const INSERT_ERRORS = {
  '23505': { status: 409, error: 'Trail already saved' }, // duplicate key: the user has already saved it
  '23503': { status: 404, error: 'Trail not found' }, // the trail does not exist in the trails table
  '22P02': { status: 400, error: 'Invalid trail id' }, // the id is not a uuid
};

const COMPLETE_ERRORS = {
  '23505': { status: 409, error: 'Trail already completed' }, // duplicate key: the user has already completed it
  '23503': { status: 404, error: 'Trail not found' }, // the trail does not exist in the trails table
  '22P02': { status: 400, error: 'Invalid trail id' }, // the id is not a uuid
};


// Saves a trail to the logged-in user's profile (saved_trails table, see database/saved_trails.sql).
// requireAuth has already put the user in req.user and the token in req.token.
export async function saveTrail(req, res) {
  const { trailId } = req.body;

  const { error } = await supabaseAsUser(req.token)
    .from('saved_trails')
    .insert({ user_id: req.user.id, trail_id: trailId });

  if (error) {
    const known = INSERT_ERRORS[error.code];
    if (known) return res.status(known.status).json({ error: known.error });
    // Unexpected error: errorHandler takes care of it (500)
    throw error;
  }

  return res.status(201).json({ trailId });
}


// Returns the trails saved by the logged-in user, most recent first: [{ trail_id, created_at }, ...].
// The frontend uses them to show the filled bookmark on the cards of trails already saved.
export async function getSavedTrails(req, res) {
  const { data, error } = await supabaseAsUser(req.token)
    .from('saved_trails')
    .select('trail_id, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  // Unexpected error: errorHandler takes care of it (500)
  if (error) throw error;

  return res.json(data ?? []);
}


// Removes a trail from the logged-in user's saved trails (the bookmark becomes empty again).
// If the trail was not saved it is not an error: the result for the user is the same (204).
export async function unsaveTrail(req, res) {
  const { trailId } = req.params;

  const { error } = await supabaseAsUser(req.token)
    .from('saved_trails')
    .delete()
    .eq('user_id', req.user.id)
    .eq('trail_id', trailId);

  if (error) {
    if (error.code === '22P02') return res.status(400).json({ error: 'Invalid trail id' }); // the id is not a uuid
    // Unexpected error: errorHandler takes care of it (500)
    throw error;
  }

  return res.status(204).end();
}


// Returns the level saved in the profile of the logged-in user.
// The database calculates it from the points (see database/levels.sql).
async function readLevel(req) {
  const { data, error } = await supabaseAsUser(req.token)
    .from('profiles')
    .select('level')
    .eq('id', req.user.id)
    .single();

  if (error) throw error;
  return data.level;
}

// Marks a trail as completed in the logged-in user's profile (completed_trails table, see database/completed_trails.sql).
// requireAuth has already put the user in req.user and the token in req.token.
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
  
  // Level before the insert: the points depend on it, and it tells the frontend if the user goes up a level
  const levelBefore = await readLevel(req);
  // Calculate points based on difficulty, length and level of the user
  const pointsEarned = calculateHikeScore(trail.difficulty, trail.length_m, levelBefore);
  console.log("Points earned::", pointsEarned)
  const { data, error } = await supabaseAsUser(req.token)
    .from('completed_trails')
    .insert({ user_id: req.user.id, trail_id: trailId,points_earned: pointsEarned });

   // console.log("Completed trail::", data)
  if (error) {
    const known = COMPLETE_ERRORS[error.code];
    if (known) return res.status(known.status).json({ error: known.error });
    // Unexpected error: errorHandler takes care of it (500)
    throw error;
  }

  // The database trigger has already updated the level with the new points
  const level = await readLevel(req);
  return res.status(201).json({ trailId, pointsEarned, level, levelUp: level > levelBefore });
}


// Returns the list of trails completed by the logged-in user.
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


export async function searchPublicProfiles(req, res) {
  const { q, after } = req.query;
  const query = typeof q === 'string' ? q.trim() : '';
  if (!query || query.includes('\0')) {
    return res.status(400).json({ error: 'Enter a username to search for.' });
  }
  if (after !== undefined && (typeof after !== 'string' || !after || after.includes('\0'))) {
    return res.status(400).json({ error: 'Invalid profile search cursor.' });
  }

  // Escape regex operators to match the typed text literally within the username.
  const literalQuery = query.replace(/[.*+?^{}$()|[\]\\]/g, '\\$&');
  const db = supabaseAsUser(req.token);
  const matches = db
    .from('profiles')
    .select('id, username, display_name, bio, level')
    .eq('is_public', true)
    .regexIMatch('username', literalQuery)
    .order('username')
    .limit(PROFILE_SEARCH_PAGE_SIZE + 1);
  if (after !== undefined) matches.gt('username', after);

  const { data, error } = await matches;
  if (error) throw error;

  const rows = data ?? [];
  const page = rows.slice(0, PROFILE_SEARCH_PAGE_SIZE);
  const pointsByProfile = new Map();

  if (page.length > 0) {
    const { data: totals, error: pointsError } = await db.rpc('get_public_profile_points', {
      p_profile_ids: page.map((row) => row.id),
    });
    // A database without the optional points function can still serve profile search.
    if (pointsError && pointsError.code !== 'PGRST202') {
      console.error('Could not load public profile points', pointsError);
    }
    for (const row of totals ?? []) {
      pointsByProfile.set(row.profile_id, row.total_points);
    }
  }

  const profiles = page.map((row) => ({
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    level: row.level,
    isMine: row.id === req.user.id,
    totalPoints: pointsByProfile.get(row.id) ?? null,
  }));
  const nextCursor = rows.length > PROFILE_SEARCH_PAGE_SIZE ? profiles.at(-1).username : null;
  return res.set('Cache-Control', 'no-store').json({ profiles, nextCursor });
}

// PostgREST answers PGRST116 when .single() finds no row:
// the profile does not exist, or the RLS policies do not let the user touch it.
const NO_ROWS = 'PGRST116';

// Returns whether the logged-in user's profile is public: { isPublic } (column profiles.is_public,
// see database/profiles_visibility.sql). Profiles are private by default.
export async function getVisibility(req, res) {
  const { data, error } = await supabaseAsUser(req.token)
    .from('profiles')
    .select('is_public')
    .eq('id', req.user.id)
    .single();

  if (error) {
    if (error.code === NO_ROWS) return res.status(404).json({ error: 'Profile not found' });
    // Unexpected error: errorHandler takes care of it (500)
    throw error;
  }

  return res.json({ isPublic: data.is_public });
}


// Makes the logged-in user's profile public or private. The body { isPublic } has already been checked
// by validateVisibility. Answers with the saved value.
export async function setVisibility(req, res) {
  const { isPublic } = req.body;

  const { data, error } = await supabaseAsUser(req.token)
    .from('profiles')
    .update({ is_public: isPublic })
    .eq('id', req.user.id)
    .select('is_public')
    .single();

  if (error) {
    if (error.code === NO_ROWS) return res.status(404).json({ error: 'Profile not found' });
    // Unexpected error: errorHandler takes care of it (500)
    throw error;
  }

  return res.json({ isPublic: data.is_public });
}


// Removes a completed trail from the logged-in user's profile.
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

// Returns the points of the logged-in user, how many trails they completed and their level.
export async function getProfilePoints(req, res) {
  const db = supabaseAsUser(req.token);

  // The three reads do not depend on each other: they run at the same time
  const [points, level, levels] = await Promise.all([
    db.from('completed_trails').select('points_earned').eq('user_id', req.user.id),
    readLevel(req),
    db.from('levels').select('level, min_points, name'),
  ]);

  // Unexpected error: errorHandler takes care of it (500)
  const error = points.error ?? levels.error;
  if (error) throw error;

  const totalPoints = points.data.reduce((sum, row) => sum + row.points_earned, 0);

  return res.json({
    totalPoints,
    completedRoutes: points.data.length,
    level: describeLevel(level, totalPoints, levels.data),
  });
}