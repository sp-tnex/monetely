import { Router } from 'express';
import { announcementController } from './announcement.controller';
import { requireAuth } from '../../core/middlewares/auth';
import { requireGroupPermission } from '../../core/middlewares/rbac';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.route('/')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(announcementController.getAnnouncements.bind(announcementController)))
  .post(requireGroupPermission('VIEW_GROUP'), asyncHandler(announcementController.createAnnouncement.bind(announcementController)));

router.route('/:announcementId')
  .delete(requireGroupPermission('VIEW_GROUP'), asyncHandler(announcementController.deleteAnnouncement.bind(announcementController)));

router.route('/:announcementId/pin')
  .patch(requireGroupPermission('VIEW_GROUP'), asyncHandler(announcementController.togglePin.bind(announcementController)));

export default router;
