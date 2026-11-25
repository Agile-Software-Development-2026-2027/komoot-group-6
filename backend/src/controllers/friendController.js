import { supabaseAsUser } from '../config/supabase.js';

const FRIENDSHIP_COLUMNS =
  'id, requester_id, addressee_id, status, created_at, updated_at';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id) {
  return typeof id === 'string' && UUID_PATTERN.test(id);
}


// Send a friend request
export async function sendFriendRequest(req, res) {
  const { userId } = req.body ?? {};
  const requesterId = req.user.id;

  if (!isValidId(userId)) {
    return res.status(400).json({
      error: 'Invalid user id',
    });
  }

  if (requesterId.toLowerCase() === userId.toLowerCase()) {
    return res.status(400).json({
      error: 'You cannot add yourself as a friend',
    });
  }

  const db = supabaseAsUser(req.token);

  // Only public profiles can receive new requests
  // through this endpoint.
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .eq('is_public', true)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    return res.status(404).json({
      error: 'Profile not found',
    });
  }

  const { data, error } = await db
    .from('friendships')
    .insert({
      requester_id: requesterId,
      addressee_id: userId,
    })
    .select(FRIENDSHIP_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A friendship or request already exists',
      });
    }

    if (error.code === '23503') {
      return res.status(404).json({
        error: 'Profile not found',
      });
    }

    throw error;
  }

  return res.status(201).json(data);
}


// Retrieve accepted friendships
export async function getFriends(req, res) {
  const userId = req.user.id;

  const { data, error } = await supabaseAsUser(req.token)
    .from('friendships')
    .select(FRIENDSHIP_COLUMNS)
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const friends = (data ?? []).map((friendship) => ({
    ...friendship,
    friendId:
      friendship.requester_id === userId
        ? friendship.addressee_id
        : friendship.requester_id,
  }));

  return res.json(friends);
}


// Retrieve incoming and outgoing pending requests
export async function getFriendRequests(req, res) {
  const userId = req.user.id;

  const { data, error } = await supabaseAsUser(req.token)
    .from('friendships')
    .select(FRIENDSHIP_COLUMNS)
    .eq('status', 'pending')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const requests = data ?? [];

  return res.json({
    incoming: requests.filter(
      (request) => request.addressee_id === userId
    ),
    outgoing: requests.filter(
      (request) => request.requester_id === userId
    ),
  });
}


// Check friendship status with another user
export async function getFriendshipStatus(req, res) {
  const currentUserId = req.user.id;
  const { userId } = req.params;

  if (!isValidId(userId)) {
    return res.status(400).json({
      error: 'Invalid user id',
    });
  }

  if (currentUserId.toLowerCase() === userId.toLowerCase()) {
    return res.json({
      status: 'self',
      friendshipId: null,
    });
  }

  const { data, error } = await supabaseAsUser(req.token)
    .from('friendships')
    .select(FRIENDSHIP_COLUMNS)
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${userId}),` +
      `and(requester_id.eq.${userId},addressee_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return res.json({
      status: 'none',
      friendshipId: null,
    });
  }

  let status = data.status;

  if (data.status === 'pending') {
    status =
      data.requester_id === currentUserId
        ? 'outgoing_pending'
        : 'incoming_pending';
  }

  return res.json({
    status,
    friendshipId: data.id,
  });
}


// Shared function for accepting and declining requests
async function respondToFriendRequest(req, res, status) {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      error: 'Invalid friendship id',
    });
  }

  const { data, error } = await supabaseAsUser(req.token)
    .from('friendships')
    .update({ status })
    .eq('id', id)
    .eq('addressee_id', req.user.id)
    .eq('status', 'pending')
    .select(FRIENDSHIP_COLUMNS)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return res.status(404).json({
      error: 'Pending friend request not found',
    });
  }

  return res.json(data);
}


// Accept an incoming request
export async function acceptFriendRequest(req, res) {
  return respondToFriendRequest(req, res, 'accepted');
}


// Decline an incoming request
export async function declineFriendRequest(req, res) {
  return respondToFriendRequest(req, res, 'declined');
}


// Cancel a request or remove an existing friendship
export async function removeFriendship(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  if (!isValidId(id)) {
    return res.status(400).json({
      error: 'Invalid friendship id',
    });
  }

  const { data, error } = await supabaseAsUser(req.token)
    .from('friendships')
    .delete()
    .eq('id', id)
    .or(
      `and(status.eq.pending,requester_id.eq.${userId}),` +
      `and(status.in.(accepted,declined),` +
      `or(requester_id.eq.${userId},addressee_id.eq.${userId}))`
    )
    .select('id')
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return res.status(404).json({
      error: 'Friendship not found',
    });
  }

  return res.status(204).end();
}