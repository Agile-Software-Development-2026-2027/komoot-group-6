import { Router } from 'express';
import { completeTrail, getCompletedTrails, saveTrail } from '../controllers/profileController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validateCompleteTrail } from '../middlewares/validateCompleteTrail.js';
import { validateSaveTrail } from '../middlewares/validateSaveTrail.js';

const router = Router();

// Rotte del profilo.
router.post('/saved-trails', requireAuth, validateSaveTrail, saveTrail);
router.post('/completed-trails', requireAuth, validateCompleteTrail, completeTrail);
router.get('/completed-trails', requireAuth, getCompletedTrails);

export default router;
