// display names of user progression levels from database levels table
export const LEVEL_NAMES = {
  0: 'Beginner',
  1: 'Walker',
  2: 'Hiker',
  3: 'Explorer',
  4: 'Mountaineer',
  5: 'Trail master',
};

// maximum progression level that shows celebration popup
export const MAX_LEVEL = 5;

// gets level name by level number with fallback
export function getLevelName(levelNumber) {
  return LEVEL_NAMES[levelNumber] ?? `Level ${levelNumber}`;
}
