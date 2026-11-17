// Describes the level of a user for the frontend: its name and the points missing to the next one.
// levelNumber: profiles.level, saved by the database (see database/levels.sql)
// levels: the rows of the levels table ({ level, min_points, name }), in any order
export function describeLevel(levelNumber, totalPoints, levels) {
  const current = levels.find((row) => row.level === levelNumber);
  const next = levels.find((row) => row.level === levelNumber + 1);

  return {
    number: levelNumber,
    name: current?.name ?? null,
    // null = the user is already at the highest level
    nextLevelPoints: next ? next.min_points : null,
    // Never below 0, even if the thresholds changed and the levels were not calculated again yet
    pointsToNext: next ? Math.max(next.min_points - totalPoints, 0) : 0,
  };
}