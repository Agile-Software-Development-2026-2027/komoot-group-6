import { expect, it } from 'vitest';
import { formatDate } from './formatDate.js';

it('formats a date as "6 Nov 2026"', () => {
  expect(formatDate('2026-11-06T12:00:00Z')).toBe('6 Nov 2026');
});

it('returns null when the date is missing or not valid', () => {
  expect(formatDate(null)).toBeNull();
  expect(formatDate(undefined)).toBeNull();
  expect(formatDate('')).toBeNull();
  expect(formatDate('not a date')).toBeNull();
});
