import { trailImageUrl } from '../utils/trailImages.js';
import { ApiError, apiRequest } from './api.js';

// Solo in sviluppo e su richiesta esplicita: GPX originali per provare grafico e mappa.
// Senza VITE_USE_LOCAL_GPX=true il servizio continua a usare il backend.
async function getLocalTrails() {
  const { default: collection } = await import('../data/gpxTrails.json');
  return collection.features;
}

// Chiamate al backend che riguardano i sentieri.
// getTrailsInBounds e getTrail: i sentieri sono dati pubblici, gli endpoint non richiedono il login,
// quindi niente token. getNearbyTrails e saveTrail ricevono invece authFetch da useAuth(),
// che aggiunge il token e lo rinnova se è scaduto.

// Sentieri che partono dentro l'area [minLng, minLat, maxLng, maxLat].
// Restituisce una FeatureCollection di punti (i punti di partenza).
export async function getTrailsInBounds(bbox) {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_LOCAL_GPX !== 'true') {
    return apiRequest(`/trails?bbox=${bbox.join(',')}`);
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;
  const trails = await getLocalTrails();
  const features = trails
    .filter(({ properties: { startPoint: [lng, lat] } }) =>
      lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat)
    .map((trail) => ({
      ...trail,
      geometry: { type: 'Point', coordinates: trail.properties.startPoint },
    }));

  return structuredClone({ type: 'FeatureCollection', features });
}

// Un sentiero con il percorso completo: una Feature la cui geometria è il percorso.
export async function getTrail(id) {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_LOCAL_GPX !== 'true') {
    return apiRequest(`/trails/${encodeURIComponent(id)}`);
  }

  const trails = await getLocalTrails();
  const trail = trails.find((feature) => feature.properties.id === id);
  if (!trail) throw new ApiError('Trail not found', 404);
  return structuredClone(trail);
}

// Il backend usa la scala CAI (T, E, EE, EEA); card e filtri usano easy / moderate / hard.
export const CAI_TO_DIFFICULTY = { T: 'easy', E: 'moderate', EE: 'hard', EEA: 'hard' };

function toLngLat(point) {
  const isValid = Array.isArray(point) && point.length >= 2 && point.slice(0, 2).every(Number.isFinite);
  return isValid ? [point[0], point[1]] : null;
}

// Converte un sentiero della risposta nel formato usato dalle card.
// Ogni sentiero è una Feature GeoJSON: la geometria è il punto di partenza, i dati sono in properties.
function toTrail(feature) {
  const props = feature?.properties ?? {};
  return {
    id: props.id ?? feature?.id,
    name: props.name,
    // Un livello che non è nella tabella resta com'è
    difficulty: CAI_TO_DIFFICULTY[props.difficulty] ?? props.difficulty ?? null,
    lengthM: props.lengthM,
    elevationGainM: props.ascentM,
    distanceM: props.distanceM,
    start: toLngLat(feature?.geometry?.coordinates),
    imageUrl: trailImageUrl(props.name),
    saved: Boolean(props.saved),
  };
}

// Sentieri entro radiusKm dal punto (lat, lng), i più vicini per primi.
// Il backend vuole il raggio in metri e risponde con una FeatureCollection.
export async function getNearbyTrails(authFetch, { lat, lng, radiusKm }) {
  const query = new URLSearchParams({ lat, lng, radius: Math.round(radiusKm * 1000) });
  const data = await authFetch(`/trails/nearby?${query}`);
  return (data?.features ?? []).map(toTrail);
}

// Salva il sentiero nel profilo dell'utente.
// Restituisce 'saved' se è stato salvato adesso, 'already-saved' se era già nel profilo (409):
// non è un errore, ma la card mostra un messaggio diverso.
export async function saveTrail(authFetch, trailId) {
  try {
    await authFetch('/profile/saved-trails', { method: 'POST', body: { trailId } });
    return 'saved';
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return 'already-saved';
    throw err;
  }
}

// Sentieri salvati dall'utente loggato: [{ trail_id, created_at }, ...].
// Servono per mostrare il segnalibro pieno sui sentieri già salvati (anche dopo un nuovo login).
export async function getSavedTrails(authFetch) {
  return authFetch('/profile/saved-trails');
}


// Se era già completato (409) per l'utente il risultato è lo stesso, quindi non è un errore.
export async function completeTrail(authFetch, trailId) {
  try {
    await authFetch('/profile/completed-trails', { method: 'POST', body: { trailId } });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 409)) throw err;
  }
}

// Restituisce l'elenco dei sentieri completati per l'utente loggato.
export async function getCompletedTrails(authFetch) {
  return authFetch('/profile/completed-trails');
}

// Rimuove il sentiero dai completati nel profilo dell'utente (SCRUM-51).
export async function uncompleteTrail(authFetch, trailId) {
  await authFetch(`/profile/completed-trails/${trailId}`, { method: 'DELETE' });
}

// Likes of the trail (SCRUM-15). All three answer with { trailId, count, liked }:
// count = total likes of all users, liked = true if the logged-in user's like is among them.
export async function getTrailLikes(authFetch, trailId) {
  return authFetch(`/trails/${encodeURIComponent(trailId)}/likes`);
}

// Adds the like. If it was already there, the backend still answers with the updated total.
export async function likeTrail(authFetch, trailId) {
  return authFetch(`/trails/${encodeURIComponent(trailId)}/likes`, { method: 'POST' });
}

// Removes the like and returns the updated total.
export async function unlikeTrail(authFetch, trailId) {
  return authFetch(`/trails/${encodeURIComponent(trailId)}/likes`, { method: 'DELETE' });
}
