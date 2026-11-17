import {
  DIFFICULTY_BASE_POINTS,
  LEVEL_POINTS_PERCENTAGE,
  METERS_PER_KM,
  POINTS_PER_STARTED_KM,
} from '../config/points.js';

// Points of a completed trail: base points of the difficulty + points for every started km,
// reduced by the level of the user when they complete it (see LEVEL_POINTS_PERCENTAGE).
export function calculateHikeScore(difficulty, lengthM, level = 0) {
  if (!Object.hasOwn(DIFFICULTY_BASE_POINTS, difficulty) || !Number.isInteger(lengthM) || lengthM <= 0) {
    throw new Error('Trail must have a valid difficulty and positive length');
  }
  if (!Number.isInteger(level) || level < 0) {
    throw new Error('Level must be a whole number from 0');
  }

  const fullPoints = DIFFICULTY_BASE_POINTS[difficulty] + POINTS_PER_STARTED_KM * Math.ceil(lengthM / METERS_PER_KM);
  const percent = LEVEL_POINTS_PERCENTAGE[Math.min(level, LEVEL_POINTS_PERCENTAGE.length - 1)];
  // Whole points, rounded half up (59.5 becomes 60)
  return Math.round((fullPoints * percent) / 100);
}