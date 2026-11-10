// search radius in km, min and max and initial value of the slider
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 50;
export const DEFAULT_RADIUS_KM = 25;

// wait before searching, while dragging the slider or the map, no request is sent at every step
export const SEARCH_DELAY_MS = 400;

// walking speeds for estimated duration, 4 km/h on flat ground and 300 m/h climbing
export const FLAT_SPEED_KMH = 4;
export const CLIMB_SPEED_MH = 300;

// if the end of a route is farther than this from its start, the route is "one way"
export const LOOP_TOLERANCE_M = 100;

// filter gps jitter
export const ELEV_THRESHOLD = 5;