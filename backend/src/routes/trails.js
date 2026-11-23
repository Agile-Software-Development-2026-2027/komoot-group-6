import { Router } from 'express';
import { validateBbox, validateTrailId, validateNearbyQuery } from '../middlewares/validateTrailQuery.js';
import { validateLeaderboardQuery } from '../middlewares/validateLeaderboardQuery.js';
import { listTrails, getTrail, getTrailCover, nearbyTrails } from '../controllers/trailsController.js';
import { getTrailLikes, likeTrail, unlikeTrail } from '../controllers/likesController.js';
import { deleteTrailComment, getTrailComments, postTrailComment } from '../controllers/trailCommentsController.js';
import { getTrailLeaderboard } from '../controllers/leaderboardController.js';
import { requireAuth, requireAuthIfPresent } from '../middlewares/requireAuth.js';
import { uploadTrailGpx } from '../middlewares/uploadGpx.js';
import { readGpx } from '../controllers/gpxController.js';
import { changeTrailVisibility, createUploadedTrail } from '../controllers/uploadedTrailsController.js';

const router = Router();

// The optional session also allows authors to read their own private trails.
router.get('/', validateBbox, requireAuthIfPresent, listTrails);
router.post('/', requireAuth, uploadTrailGpx, readGpx, createUploadedTrail);

// NOTE: more specific routes (e.g. '/nearby') must be added ABOVE '/:id',
// otherwise Express would treat "nearby" as a trail id.
router.get('/nearby', validateNearbyQuery, requireAuthIfPresent, nearbyTrails);
router.get('/:id', validateTrailId, requireAuthIfPresent, getTrail);
router.get('/:id/cover', validateTrailId, requireAuthIfPresent, getTrailCover);
router.patch('/:id/visibility', requireAuth, validateTrailId, changeTrailVisibility);

router.get('/:id/comments', validateTrailId, requireAuthIfPresent, getTrailComments);
router.post('/:id/comments', requireAuth, validateTrailId, postTrailComment);
router.delete('/:id/comments/:commentId', requireAuth, validateTrailId, deleteTrailComment);

// Likes of the trail: they need login (to know who is liking the trail)
// and a valid id. They all answer with { trailId, count, liked },
// or 404 if the trail does not exist.
router.get('/:id/likes', requireAuth, validateTrailId, getTrailLikes);
router.post('/:id/likes', requireAuth, validateTrailId, likeTrail);
router.delete('/:id/likes', requireAuth, validateTrailId, unlikeTrail);

// trail leaderboard ordered by points earned on this hike for logged in users
router.get('/:id/leaderboard', requireAuth, validateTrailId, validateLeaderboardQuery, getTrailLeaderboard);

export default router;
