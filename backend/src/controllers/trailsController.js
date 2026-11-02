import { getTrailsInBounds, getTrailById } from '../services/trailsService.js';

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