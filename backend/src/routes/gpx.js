import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { uploadGpx } from '../middlewares/uploadGpx.js';
import { parseGpxFile } from '../controllers/gpxController.js';

const router = Router();

// POST /api/gpx/parse: logged-in users only, then file upload, then conversion
router.post('/parse', requireAuth, uploadGpx, parseGpxFile);

export default router;