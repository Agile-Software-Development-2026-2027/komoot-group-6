// Sums a numeric field of the trails; missing or non-numeric values count as 0.
function sum(trails, key) {
  return trails.reduce((total, trail) => total + (Number.isFinite(trail[key]) ? trail[key] : 0), 0);
}

// Totals of the completed trails: length and ascent, in meters.
export function completedTotals(completed) {
  return {
    lengthM: sum(completed, 'lengthM'),
    ascentM: sum(completed, 'ascentM'),
  };
}
