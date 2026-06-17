import { Router } from 'express';
import { notificationController } from './notification.controller';
import { requireAuth } from '../../core/middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.route('/')
  .get(asyncHandler(notificationController.getNotifications.bind(notificationController)));

router.route('/read-all')
  .patch(asyncHandler(notificationController.markAllAsRead.bind(notificationController)));

router.route('/:id/read')
  .patch(asyncHandler(notificationController.markAsRead.bind(notificationController)));

export default router;
