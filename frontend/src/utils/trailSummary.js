import { CAI_TO_DIFFICULTY } from '../services/trailsService.js';
import { formatDistance, formatDuration, formatElevation } from './formatTrail.js';

// Words used in the sentence for each difficulty level
const LEVEL_WORDS = { easy: 'An easy', moderate: 'An intermediate', hard: 'A demanding' };

// One sentence that sums up a trail, built only from its real data, e.g.
// "An easy round trip of 4 km: about 1:00 h on foot, 40 m of climbing and a highest point of 240 m."
// "trail" = the properties from GET /api/trails/:id, "durationMin" = the duration shown on the page,
// "loop" = true / false / null (from isLoop). Missing values are simply left out of the sentence.
// "Round trip" (like on Komoot) = it ends where it starts: a loop or an out-and-back.
export function trailSummary(trail, durationMin, loop) {
  const level = LEVEL_WORDS[CAI_TO_DIFFICULTY[trail.difficulty]] ?? 'A';
  const shape = loop === true ? 'round trip' : loop === false ? 'one-way route' : 'route';
  const running = trail.trailType === 'trail_running';

  let sentence = `${level} ${running ? 'running ' : ''}${shape}`;
  if (Number.isFinite(trail.lengthM)) sentence += ` of ${formatDistance(trail.lengthM)}`;

  const details = [];
  if (Number.isFinite(durationMin)) details.push(`about ${formatDuration(durationMin)} ${running ? 'running' : 'on foot'}`);
  if (Number.isFinite(trail.ascentM)) details.push(`${formatElevation(trail.ascentM)} of climbing`);
  if (Number.isFinite(trail.maxElevationM)) details.push(`a highest point of ${formatElevation(trail.maxElevationM)}`);

  if (details.length === 0) return `${sentence}.`;
  // "a, b and c": commas between the first ones, "and" before the last one
  const list = details.length === 1 ? details[0] : `${details.slice(0, -1).join(', ')} and ${details.at(-1)}`;
  return `${sentence}: ${list}.`;
}

// [16.2275, 39.359] -> "39.3590° N, 16.2275° E"
export function formatCoordinates([lng, lat]) {
  const latText = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngText = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${latText}, ${lngText}`;
}

// Google Maps opens with the route from where the user is to the start of the trail
export function directionsUrl([lng, lat]) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}