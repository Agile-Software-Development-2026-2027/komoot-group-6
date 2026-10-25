import { Router } from 'express';
import { login, me, refresh, logout } from '../controllers/loginController.js';
import { validateLogin } from '../middlewares/validateLogin.js';
import { validateRefresh } from '../middlewares/validateRefresh.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

router.post('/login', validateLogin, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/refresh', validateRefresh, refresh);

export default router;
