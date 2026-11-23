import turfDistance from '@turf/distance';

export const SLOPE_COLORS = Object.freeze({
  gentle: '#4c9e36',
  moderate: '#e5b83b',
  steep: '#ed8b27',
  verySteep: '#dc4038',
  unknown: '#87938b',
});

export function classifySlope(slopePercent) {
  if (!Number.isFinite(slopePercent)) return 'unknown';
  const grade = Math.abs(slopePercent);
  if (grade < 5) return 'gentle';
  if (grade < 10) return 'moderate';
  if (grade < 15) return 'steep';
  return 'verySteep';
}

/**
 * Adds slope metadata without changing existing profile points or coordinates.
 * Slope is the grade of the segment leading into each point.
 * Missing or zero-length segments are marked unknown.
 */
export function addSlopeToProfile(profile = []) {
  if (!Array.isArray(profile)) return [];
  return profile.map((point, index) => {
    const previous = profile[index - 1];
    let slopePercent = null;
    if (previous && Array.isArray(previous.coordinates) && Array.isArray(point.coordinates)) {
      const horizontalKm = turfDistance(previous.coordinates, point.coordinates, { units: 'kilometers' });
      if (horizontalKm > 0 && Number.isFinite(previous.elevation) && Number.isFinite(point.elevation)) {
        slopePercent = ((point.elevation - previous.elevation) / (horizontalKm * 1000)) * 100;
      }
    }
    const slopeCategory = classifySlope(slopePercent);
    return { ...point, slopePercent, slopeCategory, slopeColor: SLOPE_COLORS[slopeCategory] };
  });
}
