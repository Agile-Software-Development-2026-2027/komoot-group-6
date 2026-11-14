// The radius in meters to search for nearby trails. The default is 5000 meters (5 km), but the user can request a larger radius (up to 50000 meters, or 50 km).
export const NEARBY_RADIUS_M = { default: 5000, max: 50000 };

// The number of nearby trails to return. The default is 50, but the user can request more (up to 100).
export const NEARBY_LIMIT = { default: 50, max: 100 };