import { trailImageUrl } from '../utils/trailImages.js';
import { ApiError, apiRequest } from './api.js';

// Chiamate al backend che riguardano i sentieri.
// getTrailsInBounds e getTrail: i sentieri sono dati pubblici, gli endpoint non richiedono il login,
// quindi niente token. getNearbyTrails e saveTrail ricevono invece authFetch da useAuth(),
// che aggiunge il token e lo rinnova se è scaduto.

// Sentieri che partono dentro l'area [minLng, minLat, maxLng, maxLat].
// Restituisce una FeatureCollection di punti (i punti di partenza).
export function getTrailsInBounds(bbox) {
  return apiRequest(`/trails?bbox=${bbox.join(',')}`);
}

// Un sentiero con il percorso completo: una Feature la cui geometria è il percorso.
export function getTrail(id) {
  return apiRequest(`/trails/${encodeURIComponent(id)}`);
}

// Il backend usa la scala CAI (T, E, EE, EEA); card e filtri usano easy / moderate / hard.
const CAI_TO_DIFFICULTY = { T: 'easy', E: 'moderate', EE: 'hard', EEA: 'hard' };

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
// Se era già salvato (409) per l'utente il risultato è lo stesso, quindi non è un errore.
export async function saveTrail(authFetch, trailId) {
  try {
    await authFetch('/profile/saved-trails', { method: 'POST', body: { trailId } });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 409)) throw err;
  }
}
