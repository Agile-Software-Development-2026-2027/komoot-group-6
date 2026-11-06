import { formatDistance, formatDuration, formatElevation } from './formatTrail.js';
import { toImageKey } from './trailImages.js';

// Average speed in km/h from length (meters) and duration (minutes), null if it cannot be computed
export function averageSpeedKmh(lengthM, durationMin) {
  if (!Number.isFinite(lengthM) || !Number.isFinite(durationMin) || durationMin <= 0) return null;
  return lengthM / 1000 / (durationMin / 60);
}

// 3.625 -> "3.6 km/h", missing value -> "—"
export function formatSpeed(kmh) {
  return Number.isFinite(kmh) ? `${kmh.toFixed(1)} km/h` : '—';
}

// "2026-11-06T10:00:00Z" -> "6 Nov 2026", null if the date is missing or not valid
export function formatCompletedDate(isoDate) {
  const date = new Date(isoDate ?? '');
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

// The four numbers of the recap, in the order they are shown.
// "trail" = the properties returned by GET /api/trails/:id, "durationMin" = the estimated duration.
export function recapStats(trail, durationMin) {
  return [
    { label: 'Distance', value: formatDistance(trail.lengthM) },
    { label: 'Est. time', value: formatDuration(durationMin) },
    { label: 'Avg speed', value: formatSpeed(averageSpeedKmh(trail.lengthM, durationMin)) },
    { label: 'Ascent', value: formatElevation(trail.ascentM) },
  ];
}

// Text of the message shared on WhatsApp, Telegram, X...: the name and the numbers in one line.
export function shareText(trail, durationMin) {
  const parts = [
    formatDistance(trail.lengthM),
    formatDuration(durationMin),
    formatSpeed(averageSpeedKmh(trail.lengthM, durationMin)),
    Number.isFinite(trail.ascentM) ? `${formatElevation(trail.ascentM)} ascent` : '—',
  ].filter((part) => part !== '—');

  const numbers = parts.length > 0 ? ` ${parts.join(' · ')}` : '';
  return `I completed "${trail.name}"! 🥾${numbers}`;
}

// Links that open the "share" page of each app with the text and the link already filled in.
export function shareLinks(text, url) {
  const message = encodeURIComponent(`${text}\n${url}`);
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  return {
    whatsapp: `https://wa.me/?text=${message}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    x: `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
}

// Name of the downloaded image: "Anello del Lago Arvo" -> "hike-anello-del-lago-arvo.png"
export function recapFileName(trailName) {
  const key = toImageKey(trailName);
  return key ? `hike-${key}.png` : 'hike.png';
}

// Turns the route (GeoJSON LineString or MultiLineString, [lng, lat] points) into lines of
// [x, y] pixels that fit inside "box" = { x, y, width, height }, centered and without stretching.
// Longitudes are multiplied by cos(latitude): at our latitudes a degree of longitude is shorter
// than a degree of latitude, and without this the route would look wider than it is.
// The y axis is flipped: on the screen y grows downwards, latitude grows upwards (north).
// Returns [] when there is no route to draw.
export function projectRoute(geometry, box) {
  let lines = [];
  if (geometry?.type === 'LineString') lines = [geometry.coordinates];
  else if (geometry?.type === 'MultiLineString') lines = geometry.coordinates;

  const valid = lines
    .map((line) => (line ?? []).filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat)))
    .filter((line) => line.length > 0);
  if (valid.length === 0) return [];

  const points = valid.flat();
  const lats = points.map(([, lat]) => lat);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);

  const xs = points.map(([lng]) => lng * kx);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const spanX = maxX - minX;
  const spanY = maxY - minY;

  // Pixels per (scaled) degree: the side that would overflow decides. A single point has no size.
  const scales = [spanX > 0 ? box.width / spanX : Infinity, spanY > 0 ? box.height / spanY : Infinity];
  const scale = Math.min(...scales);
  const k = Number.isFinite(scale) ? scale : 0;

  // Space left on the sides, so that the route is centered in the box
  const offsetX = box.x + (box.width - spanX * k) / 2;
  const offsetY = box.y + (box.height - spanY * k) / 2;

  return valid.map((line) =>
    line.map(([lng, lat]) => [offsetX + (lng * kx - minX) * k, offsetY + (maxY - lat) * k])
  );
}
