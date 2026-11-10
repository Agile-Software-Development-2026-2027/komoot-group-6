import { CLIMB_SPEED_MH, FLAT_SPEED_KMH } from '../config/trails.config.js';

// Distanze e lunghezze: 850 → "850 m", 8400 → "8.4 km", 10000 → "10 km".
export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '—';
  return meters < 1000 ? `${Math.round(meters)} m` : `${Number((meters / 1000).toFixed(1))} km`;
}

// Dislivello: sempre in metri, 1149.6 → "1150 m".
export function formatElevation(meters) {
  return Number.isFinite(meters) ? `${Math.round(meters)} m` : '—';
}

// Tempo di cammino stimato in minuti
// 4 km/h in piano e 300 m/h in salita; il tempo totale è il maggiore dei due più metà del minore.
export function estimateDurationMin(lengthM, elevationGainM) {
  if (!Number.isFinite(lengthM)) return null;
  const flatHours = lengthM / 1000 / FLAT_SPEED_KMH;
  const climbHours = Number.isFinite(elevationGainM) ? elevationGainM / CLIMB_SPEED_MH : 0;
  const hours = Math.max(flatHours, climbHours) + Math.min(flatHours, climbHours) / 2;
  return Math.round(hours * 60);
}

// 158 → "2:38 h". Se il valore manca → "—".
export function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = String(minutes % 60).padStart(2, '0');
  return `${hours}:${rest} h`;
}
