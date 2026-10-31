import { ApiError } from './api.js';
function toLngLat(point) {
  const isValid = Array.isArray(point) && point.length >= 2 && point.slice(0, 2).every(Number.isFinite);
  return isValid ? [point[0], point[1]] : null;
}

// Converte un sentiero della risposta nel formato usato dalle card.
function toTrail(raw) {
  return {
    id: raw.id,
    name: raw.name,
    difficulty: raw.difficulty,
    lengthM: raw.lengthM,
    elevationGainM: raw.elevationGainM,
    distanceM: raw.distanceM,
    start: toLngLat(raw.start),
    imageUrl: raw.imageUrl ?? null,
    saved: Boolean(raw.saved),
  };
}

// Sentieri entro radiusKm dal punto (lat, lng). Il backend vuole il raggio in metri.
// authFetch viene da useAuth(): aggiunge il token e lo rinnova se è scaduto.
export async function getNearbyTrails(authFetch, { lat, lng, radiusKm }) {
  const query = new URLSearchParams({ lat, lng, radius: Math.round(radiusKm * 1000) });
  const data = await authFetch(`/trails/nearby?${query}`);
  return (data?.trails ?? []).map(toTrail);
}

// Salva il sentiero nel profilo dell'utente.
// Se era già salvato (409) per l'utente il risultato è lo stesso, quindi non è un errore.
export async function saveTrail(authFetch, trailId) {
  try {
    await authFetch('/profile/saved-trails', { method: 'POST', body: { trailId } });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 409)) throw err;
  }
}
