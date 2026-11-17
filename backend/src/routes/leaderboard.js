import { Router } from 'express';
import { getGlobalLeaderboard } from '../controllers/leaderboardController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validateLeaderboardQuery } from '../middlewares/validateLeaderboardQuery.js';

const router = Router();

// global leaderboard ordered by highest level for logged in users
router.get('/', requireAuth, validateLeaderboardQuery, getGlobalLeaderboard);

export default router;
