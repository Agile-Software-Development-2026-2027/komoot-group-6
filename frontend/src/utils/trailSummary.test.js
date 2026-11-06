// Unit tests for trailSummary: the sentence on top of the trail page, coordinates, directions
import { describe, expect, it } from 'vitest';
import { directionsUrl, formatCoordinates, trailSummary } from './trailSummary.js';

const TRAIL = {
  trailType: 'hiking',
  difficulty: 'T',
  lengthM: 4003,
  ascentM: 40,
  maxElevationM: 240,
};

describe('trailSummary', () => {
  it('builds the sentence from the data of the trail', () => {
    expect(trailSummary(TRAIL, 60, true)).toBe(
      'An easy round trip of 4 km: about 1:00 h on foot, 40 m of climbing and a highest point of 240 m.'
    );
  });

  it('uses the difficulty, the shape and the type of the trail', () => {
    expect(trailSummary({ ...TRAIL, difficulty: 'EE' }, 60, false)).toMatch(/^A demanding one-way route/);
    expect(trailSummary({ ...TRAIL, difficulty: 'E' }, 60, null)).toMatch(/^An intermediate route/);
    expect(trailSummary({ ...TRAIL, trailType: 'trail_running' }, 60, true)).toMatch(
      /^An easy running round trip of 4 km: about 1:00 h running/
    );
  });

  it('leaves out the values that are missing', () => {
    expect(trailSummary({ difficulty: 'T', lengthM: 4003 }, null, true)).toBe('An easy round trip of 4 km.');
    expect(trailSummary({ difficulty: 'T', ascentM: 40 }, null, true)).toBe('An easy round trip: 40 m of climbing.');
  });
});

describe('formatCoordinates and directionsUrl', () => {
  it('writes latitude first, with N/S and E/W', () => {
    expect(formatCoordinates([16.2275, 39.359])).toBe('39.3590° N, 16.2275° E');
    expect(formatCoordinates([-3.7, -40.5])).toBe('40.5000° S, 3.7000° W');
  });

  it('opens Google Maps with the start of the trail as destination', () => {
    expect(directionsUrl([16.2275, 39.359])).toBe('https://www.google.com/maps/dir/?api=1&destination=39.359,16.2275');
  });
});