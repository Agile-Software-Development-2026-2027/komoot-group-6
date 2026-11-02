import { getTrailsInBounds, getTrailById, getNearbyTrails } from '../services/trailsService.js'; //added for nearby trails search

// GET /api/trails?bbox=...
// Trails starting inside the area (already checked by validateBbox, in req.bbox)
export async function listTrails(req, res) {
  const trails = await getTrailsInBounds(req.bbox);
  return res.json(trails);
}

// GET /api/trails/:id
// One trail with its route, or 404
export async function getTrail(req, res) {
  const trail = await getTrailById(req.params.id);
  if (!trail) {
    return res.status(404).json({ error: 'Trail not found' });
  }
  return res.json(trail);
}
// GET /api/trails/nearby?lat=...&lng=...&radius=...&limit=...
// Trails passing near the position, closest first
// (query already checked by validateNearbyQuery, in req.nearbyQuery)
export async function nearbyTrails(req, res) {
  const trails = await getNearbyTrails(req.nearbyQuery);
  return res.json(trails);
}