// Points awarded for each difficulty level. The values are arbitrary and can be adjusted as needed.
export const DIFFICULTY_BASE_POINTS = Object.freeze({ T: 20, E: 40, EE: 60, EEA: 70 });

// Points awarded for each started kilometer. For example, a trail of 1.5 km would award 10 points (5 points for the first km and 5 points for the second km).
export const POINTS_PER_STARTED_KM = 5;

// Number of meters in a kilometer. This is a constant used for calculations.
export const METERS_PER_KM = 1000;
