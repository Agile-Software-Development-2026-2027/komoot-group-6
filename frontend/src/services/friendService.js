export function getFriends(authFetch) {
  return authFetch('/friends');
}

export function getFriendRequests(authFetch) {
  return authFetch('/friends/requests');
}

export function getFriendshipStatus(authFetch, userId) {
  return authFetch(
    `/friends/status/${encodeURIComponent(userId)}`
  );
}

export function sendFriendRequest(authFetch, userId) {
  return authFetch('/friends/request', {
    method: 'POST',
    body: { userId },
  });
}

export function acceptFriendRequest(authFetch, friendshipId) {
  return authFetch(
    `/friends/${encodeURIComponent(friendshipId)}/accept`,
    { method: 'PATCH' }
  );
}

export function declineFriendRequest(authFetch, friendshipId) {
  return authFetch(
    `/friends/${encodeURIComponent(friendshipId)}/decline`,
    { method: 'PATCH' }
  );
}

export function removeFriendship(authFetch, friendshipId) {
  return authFetch(
    `/friends/${encodeURIComponent(friendshipId)}`,
    { method: 'DELETE' }
  );
}