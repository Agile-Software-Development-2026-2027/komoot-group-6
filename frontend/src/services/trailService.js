import { ApiError } from './api.js';

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
    imageUrl: props.imageUrl ?? null,
    saved: Boolean(props.saved),
  };
}

// Sentieri entro radiusKm dal punto (lat, lng), i più vicini per primi.
// Il backend vuole il raggio in metri e risponde con una FeatureCollection.
// authFetch viene da useAuth(): aggiunge il token e lo rinnova se è scaduto.
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
