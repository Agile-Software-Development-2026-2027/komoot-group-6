import { Router } from 'express';
import authRoutes from './auth.js';
import loginRoutes from './login.js';
import profileRoutes from './profile.js';
import gpxRoutes from './gpx.js';
import trailsRoutes from './trails.js';
import leaderboardRoutes from './leaderboard.js';
import friendsRoutes from './friends.js';
const router = Router();

router.use('/auth', authRoutes);
router.use('/auth', loginRoutes);
router.use('/profile', profileRoutes);
router.use('/gpx', gpxRoutes);
router.use('/trails', trailsRoutes);
// mount global leaderboard routes under api leaderboard
router.use('/leaderboard', leaderboardRoutes);
// mount friend routes under api friends
router.use('/friends', friendsRoutes);

export default router;