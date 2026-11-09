import { expect, it } from 'vitest';
import { completedTotals } from './profileStats.js';

it('adds up length and ascent of the completed trails', () => {
  expect(completedTotals([
    { lengthM: 5000, ascentM: 300 },
    { lengthM: 8400, ascentM: 650 },
  ])).toEqual({ lengthM: 13400, ascentM: 950 });
});

it('counts missing values as zero and handles an empty list', () => {
  expect(completedTotals([{ lengthM: 5000 }, { ascentM: undefined, lengthM: null }])).toEqual({ lengthM: 5000, ascentM: 0 });
  expect(completedTotals([])).toEqual({ lengthM: 0, ascentM: 0 });
});
