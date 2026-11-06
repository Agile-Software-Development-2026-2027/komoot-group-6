import { Router } from 'express';
import { validateBbox, validateTrailId, validateNearbyQuery } from '../middlewares/validateTrailQuery.js';
import { listTrails, getTrail, nearbyTrails } from '../controllers/trailsController.js';
import { getTrailLikes, likeTrail, unlikeTrail } from '../controllers/likesController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Trails are public data (readable by everyone in the database): no login required.
router.get('/', validateBbox, listTrails);

// NOTE: more specific routes (e.g. '/nearby') must be added ABOVE '/:id',
// otherwise Express would treat "nearby" as a trail id.
router.get('/nearby', validateNearbyQuery, nearbyTrails);
router.get('/:id', validateTrailId, getTrail);

// Likes of the trail: they need login (to know who is liking the trail)
// and a valid id. They all answer with { trailId, count, liked },
// or 404 if the trail does not exist.
router.get('/:id/likes', requireAuth, validateTrailId, getTrailLikes);
router.post('/:id/likes', requireAuth, validateTrailId, likeTrail);
router.delete('/:id/likes', requireAuth, validateTrailId, unlikeTrail);

export default router;
