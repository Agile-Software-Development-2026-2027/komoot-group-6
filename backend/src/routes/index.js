import { Router } from 'express';
import authRoutes from './auth.js';
import loginRoutes from './login.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/auth', loginRoutes);

export default router;