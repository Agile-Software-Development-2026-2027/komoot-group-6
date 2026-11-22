export function validateGpxFile(authFetch, file) {
  const body = new FormData();
  body.append('file', file);
  return authFetch('/gpx/parse', { method: 'POST', body });
}

export function uploadTrail(authFetch, { file, id, name, description, trailType, difficulty, isPublic, coverImage }) {
  const body = new FormData();
  body.append('file', file);
  body.append('uploadId', id);
  body.append('name', name.trim());
  body.append('description', description.trim());
  body.append('trailType', trailType);
  body.append('difficulty', difficulty);
  body.append('isPublic', String(isPublic));
  body.append('cover', coverImage, 'cover.jpg');
  return authFetch('/trails', { method: 'POST', body });
}

export function getUploadedTrails(authFetch) {
  return authFetch('/profile/uploaded-trails');
}

export function updateTrailVisibility(authFetch, id, isPublic) {
  return authFetch(`/trails/${encodeURIComponent(id)}/visibility`, {
    method: 'PATCH',
    body: { isPublic },
  });
}
