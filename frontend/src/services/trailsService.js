import { apiRequest } from './api.js';

// I sentieri sono dati pubblici: gli endpoint non richiedono il login, quindi niente token.

// Sentieri che partono dentro l'area [minLng, minLat, maxLng, maxLat].
// Restituisce una FeatureCollection di punti (i punti di partenza).
export function getTrailsInBounds(bbox) {
  return apiRequest(`/trails?bbox=${bbox.join(',')}`);
}

// Un sentiero con il percorso completo: una Feature la cui geometria è il percorso.
export function getTrail(id) {
  return apiRequest(`/trails/${encodeURIComponent(id)}`);
}
