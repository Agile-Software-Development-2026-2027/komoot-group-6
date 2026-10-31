import { Router } from 'express';
import authRoutes from './auth.js';
import loginRoutes from './login.js';
import profileRoutes from './profile.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/auth', loginRoutes);
router.use('/profile', profileRoutes);

export default router;