
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
