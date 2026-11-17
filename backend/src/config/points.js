// Points awarded for each difficulty level. The values are arbitrary and can be adjusted as needed.
export const DIFFICULTY_BASE_POINTS = Object.freeze({ T: 20, E: 40, EE: 60, EEA: 70 });

// Points awarded for each started kilometer. For example, a trail of 1.5 km would award 10 points (5 points for the first km and 5 points for the second km).
export const POINTS_PER_STARTED_KM = 5;

// Number of meters in a kilometer. This is a constant used for calculations.
export const METERS_PER_KM = 1000;

// levels are not here, to update them you need to change the database (see database/levels.sql) update the .sql and run it on supabase sql editor. 
// The backend reads the levels table to show the points missing to the next level.


// The percentage of points a hike gives you based on your current level. 
// For example, if you are at level 1, you will receive 90% of the points for a hike. This is used to scale the points awarded based on the user's level.
export const LEVEL_POINTS_PERCENTAGE = Object.freeze([100, 90, 80, 70, 60, 50]);
