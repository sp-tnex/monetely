import { Router } from 'express';
import { inviteController } from './invite.controller';
import { requireAuth } from '../../core/middlewares/auth';
import { requireGroupPermission } from '../../core/middlewares/rbac';
import { validate } from '../../core/middlewares/validate';
import { createInviteSchema } from '@monetely/shared';
import { asyncHandler } from '../../utils/asyncHandler';

// Global router for /api/v1/invites
const router = Router();

// Public route to fetch metadata from token
router.get('/token/:token', asyncHandler(inviteController.getInviteDetailsByToken.bind(inviteController)));

// Protected user invite routes
router.use(requireAuth);
router.get('/pending', asyncHandler(inviteController.getUserPendingInvites.bind(inviteController)));
router.post('/token/:token/accept', asyncHandler(inviteController.acceptInvite.bind(inviteController)));
router.post('/token/:token/decline', asyncHandler(inviteController.declineInvite.bind(inviteController)));
router.post('/:inviteId/accept', asyncHandler(inviteController.acceptInvite.bind(inviteController)));
router.post('/:inviteId/decline', asyncHandler(inviteController.declineInvite.bind(inviteController)));

// Group nested router for /api/v1/groups/:groupId/invites
const groupInviteRouter = Router({ mergeParams: true });
groupInviteRouter.use(requireAuth);

groupInviteRouter.route('/')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(inviteController.getGroupInvites.bind(inviteController)))
  .post(requireGroupPermission('INVITE_MEMBER'), validate(createInviteSchema), asyncHandler(inviteController.createInvite.bind(inviteController)));

groupInviteRouter.route('/:inviteId')
  .delete(requireGroupPermission('INVITE_MEMBER'), asyncHandler(inviteController.revokeInvite.bind(inviteController)));

groupInviteRouter.route('/:inviteId/resend')
  .post(requireGroupPermission('INVITE_MEMBER'), asyncHandler(inviteController.resendInvite.bind(inviteController)));

export { router as default, groupInviteRouter };
