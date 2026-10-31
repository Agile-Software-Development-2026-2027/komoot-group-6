import { Router } from 'express';
import { saveTrail } from '../controllers/profileController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validateSaveTrail } from '../middlewares/validateSaveTrail.js';

const router = Router();

// Rotte del profilo.
router.post('/saved-trails', requireAuth, validateSaveTrail, saveTrail);

export default router;
