import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../core/middlewares/validate';
import { requireAuth } from '../../core/middlewares/auth';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@monetely/shared';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(authController.register.bind(authController)));
router.post('/login', validate(loginSchema), asyncHandler(authController.login.bind(authController)));
router.post('/refresh', asyncHandler(authController.refresh.bind(authController)));
router.post('/logout', asyncHandler(authController.logout.bind(authController)));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword.bind(authController)));
router.post('/reset-password/:token', validate(resetPasswordSchema), asyncHandler(authController.resetPassword.bind(authController)));

router.get('/sessions', requireAuth, asyncHandler(authController.getSessions.bind(authController)));
router.delete('/sessions/:id', requireAuth, asyncHandler(authController.deleteSession.bind(authController)));
router.delete('/sessions', requireAuth, asyncHandler(authController.clearOtherSessions.bind(authController)));

export default router;
