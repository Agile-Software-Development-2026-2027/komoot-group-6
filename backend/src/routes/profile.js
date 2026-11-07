import { Router } from 'express';
import {
  completeTrail,
  getCompletedTrails,
  getSavedTrails,
  getVisibility,
  saveTrail,
  setVisibility,
  uncompleteTrail,
} from '../controllers/profileController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validateCompleteTrail } from '../middlewares/validateCompleteTrail.js';
import { validateSaveTrail } from '../middlewares/validateSaveTrail.js';
import { validateVisibility } from '../middlewares/validateVisibility.js';

const router = Router();

// Profile routes.
router.post('/saved-trails', requireAuth, validateSaveTrail, saveTrail);
router.get('/saved-trails', requireAuth, getSavedTrails);
router.post('/completed-trails', requireAuth, validateCompleteTrail, completeTrail);
router.get('/completed-trails', requireAuth, getCompletedTrails);
router.delete('/completed-trails/:trailId', requireAuth, uncompleteTrail);
router.get('/visibility', requireAuth, getVisibility);
router.put('/visibility', requireAuth, validateVisibility, setVisibility);

export default router;
