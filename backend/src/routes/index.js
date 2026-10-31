import { Router } from 'express';
import authRoutes from './auth.js';
import loginRoutes from './login.js';
import gpxRoutes from './gpx.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/auth', loginRoutes);
router.use('/gpx', gpxRoutes);

export default router;