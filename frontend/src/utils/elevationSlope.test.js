import { describe, expect, it } from 'vitest';
import { addSlopeToProfile, classifySlope, SLOPE_COLORS } from './elevationSlope.js';

describe('elevation slope classification', () => {
  it.each([
    [0, 'gentle'], [4.99, 'gentle'], [5, 'moderate'],
    [10, 'steep'], [-15, 'verySteep'], [null, 'unknown'],
  ])('classifies %s as %s', (value, expected) => {
    expect(classifySlope(value)).toBe(expected);
  });

  it('preserves original coordinates and marks the first point unknown', () => {
    const a = [16, 39, 100];
    const b = [16.001, 39, 110];
    const result = addSlopeToProfile([
      { distance: 0, elevation: 100, coordinates: a },
      { distance: 0.1, elevation: 110, coordinates: b },
    ]);
    expect(result[0].slopeCategory).toBe('unknown');
    expect(result[1].slopePercent).toBeGreaterThan(0);
    expect(result[1].coordinates).toBe(b);
    expect(result[1].slopeColor).toBe(SLOPE_COLORS[result[1].slopeCategory]);
  });

  it('handles identical coordinates without dividing by zero', () => {
    const coords = [16, 39, 100];
    const result = addSlopeToProfile([
      { distance: 0, elevation: 100, coordinates: coords },
      { distance: 0, elevation: 120, coordinates: coords },
    ]);
    expect(result[1].slopePercent).toBeNull();
    expect(result[1].slopeCategory).toBe('unknown');
  });
});
