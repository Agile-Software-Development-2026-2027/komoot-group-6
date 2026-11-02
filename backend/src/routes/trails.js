import { Router } from 'express';
import { validateBbox, validateTrailId, validateNearbyQuery } from '../middlewares/validateTrailQuery.js';
import { listTrails, getTrail, nearbyTrails } from '../controllers/trailsController.js';

const router = Router();

// Trails are public data (readable by everyone in the database): no login required.
router.get('/', validateBbox, listTrails);

// NOTE: more specific routes (e.g. '/nearby') must be added ABOVE '/:id',
// otherwise Express would treat "nearby" as a trail id.
router.get('/nearby', validateNearbyQuery, nearbyTrails);
router.get('/:id', validateTrailId, getTrail);
export default router;