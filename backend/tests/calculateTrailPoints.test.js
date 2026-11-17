
import { describe, it, expect } from 'vitest';
import { calculateHikeScore } from '../src/utils/calculateHikeScore';

describe('Hiking points calculation', () => {
  it.each([
    ['T', 3200, 40],
    ['E', 6400, 75],
    ['EE', 9100, 110],
    ['EEA', 1000, 75],
    ['T', 100, 25],
    ['E', 2000, 50],
  ])('calculates %s difficulty and %i meters', (difficulty, distance, expected) => {
    expect(calculateHikeScore(difficulty, distance)).toBe(expected);
  });

  it('rejects unknown difficulty', () => {
    expect(() => calculateHikeScore('UNKNOWN', 5000)).toThrow();
  });

  it('rejects missing or invalid distance', () => {
    expect(() => calculateHikeScore('T', null)).toThrow();
    expect(() => calculateHikeScore('T', 0)).toThrow();
    expect(() => calculateHikeScore('E', -100)).toThrow();
  });
});

describe('Points by level of the user', () => {
  // E, 6.4 km: 75 points at level 0
  it.each([
    [0, 75],
    [1, 68], // 90%: 67.5 rounded up
    [2, 60], // 80%
    [5, 38], // 50%: 37.5 rounded up
  ])('at level %i gives %i points', (level, expected) => {
    expect(calculateHikeScore('E', 6400, level)).toBe(expected);
  });

  it('uses the last percentage for the levels after the last one', () => {
    expect(calculateHikeScore('E', 6400, 9)).toBe(calculateHikeScore('E', 6400, 5));
  });

  it('rounds half points up without floating point errors', () => {
    // E, 9 km: 85 points; 70% is 59.5, not 59.49999999999999
    expect(calculateHikeScore('E', 9000, 3)).toBe(60);
  });

  it('rejects an invalid level', () => {
    expect(() => calculateHikeScore('E', 6400, -1)).toThrow();
    expect(() => calculateHikeScore('E', 6400, 1.5)).toThrow();
    expect(() => calculateHikeScore('E', 6400, null)).toThrow();
  });
});