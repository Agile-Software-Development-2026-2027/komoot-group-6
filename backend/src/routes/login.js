import { Router } from 'express';
import {
  login,
  me,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/loginController.js';
import { validateLogin } from '../middlewares/validateLogin.js';
import { validateRefresh } from '../middlewares/validateRefresh.js';
import { validateForgotPassword } from '../middlewares/validateForgotPassword.js';
import { validateResetPassword } from '../middlewares/validateResetPassword.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

router.post('/login', validateLogin, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/refresh', validateRefresh, refresh);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

export default router;
