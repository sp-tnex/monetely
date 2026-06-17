import { Router } from 'express';
import { userController } from './user.controller';
import { requireAuth } from '../../core/middlewares/auth';
import { validate } from '../../core/middlewares/validate';
import { updateProfileSchema, updatePasswordSchema, deleteAccountSchema } from '@monetely/shared';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/me', asyncHandler(userController.getMe.bind(userController)));
router.patch('/profile', validate(updateProfileSchema), asyncHandler(userController.updateProfile.bind(userController)));
router.patch('/password', validate(updatePasswordSchema), asyncHandler(userController.updatePassword.bind(userController)));
router.delete('/me', validate(deleteAccountSchema), asyncHandler(userController.deleteAccount.bind(userController)));

export default router;
