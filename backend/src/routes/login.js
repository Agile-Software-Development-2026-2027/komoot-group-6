import { Router } from 'express';
import { login, me, refresh, logout } from '../controllers/loginController.js';
import { validateLogin } from '../middlewares/validateLogin.js';
import { validateRefresh } from '../middlewares/validateRefresh.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Rotte del login, montate sotto /api/auth da routes/index.js.
// Quelle con requireAuth richiedono un utente loggato.
router.post('/login', validateLogin, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/refresh', validateRefresh, refresh);

export default router;
