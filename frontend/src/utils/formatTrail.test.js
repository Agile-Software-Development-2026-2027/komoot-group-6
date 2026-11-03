import { expect, test } from 'vitest';
import { estimateDurationMin, formatDistance, formatDuration, formatElevation } from './formatTrail.js';

test('formatDistance uses meters below 1 km and km above', () => {
  expect(formatDistance(850)).toBe('850 m');
  expect(formatDistance(8400)).toBe('8.4 km');
  expect(formatDistance(10000)).toBe('10 km');
  expect(formatDistance(undefined)).toBe('—');
});

test('formatElevation rounds to meters', () => {
  expect(formatElevation(1149.6)).toBe('1150 m');
  expect(formatElevation(null)).toBe('—');
});

test('estimateDurationMin adds half of the shorter time to the longer one', () => {
  // 8 km in piano: 2 h
  expect(estimateDurationMin(8000, 0)).toBe(120);
  // 4 km (1 h) con 600 m di salita (2 h): 2 h + 0,5 h
  expect(estimateDurationMin(4000, 600)).toBe(150);
  expect(estimateDurationMin(undefined, 300)).toBeNull();
});

test('formatDuration writes hours and minutes', () => {
  expect(formatDuration(158)).toBe('2:38 h');
  expect(formatDuration(45)).toBe('0:45 h');
  expect(formatDuration(null)).toBe('—');
});
