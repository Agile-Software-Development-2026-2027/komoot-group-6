import { DIFFICULTY_BASE_POINTS, METERS_PER_KM, POINTS_PER_STARTED_KM } from '../config/points.js';

export function calculateHikeScore(difficulty, lengthM) {
  if (!Object.hasOwn(DIFFICULTY_BASE_POINTS, difficulty) || !Number.isInteger(lengthM) || lengthM <= 0) {
    throw new Error('Trail must have a valid difficulty and positive length');
  }
  return DIFFICULTY_BASE_POINTS[difficulty] + POINTS_PER_STARTED_KM * Math.ceil(lengthM / METERS_PER_KM);
}
