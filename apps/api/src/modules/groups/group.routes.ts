import { Router } from 'express';
import { groupController } from './group.controller';
import { requireAuth } from '../../core/middlewares/auth';
import { requireGroupPermission } from '../../core/middlewares/rbac';
import { validate } from '../../core/middlewares/validate';
import { createGroupSchema, updateGroupSchema, addMemberSchema, updateMemberRoleSchema } from '@monetely/shared';
import { asyncHandler } from '../../utils/asyncHandler';

import expenseRouter from '../expenses/expense.routes';
import settlementRouter from '../settlements/settlement.routes';
import { groupInviteRouter } from '../invites/invite.routes';
import analyticsRouter from '../analytics/analytics.routes';
import announcementRouter from '../announcements/announcement.routes';

const router = Router();

router.use(requireAuth);

// Mount nested routers
router.use('/:groupId/expenses', expenseRouter);
router.use('/:groupId/settlements', settlementRouter);
router.use('/:groupId/invites', groupInviteRouter);
router.use('/:groupId/analytics', analyticsRouter);
router.use('/:groupId/announcements', announcementRouter);

router.route('/')
  .post(validate(createGroupSchema), asyncHandler(groupController.createGroup.bind(groupController)))
  .get(asyncHandler(groupController.getGroups.bind(groupController)));

router.route('/:id')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(groupController.getGroupDetails.bind(groupController)))
  .patch(requireGroupPermission('MANAGE_SETTINGS'), validate(updateGroupSchema), asyncHandler(groupController.updateGroup.bind(groupController)))
  .delete(requireGroupPermission('DELETE_GROUP'), asyncHandler(groupController.deleteGroup.bind(groupController)));

router.route('/:id/export')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(groupController.exportGroupData.bind(groupController)));

router.route('/:id/members')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(groupController.getGroupMembers.bind(groupController)))
  .post(requireGroupPermission('INVITE_MEMBER'), validate(addMemberSchema), asyncHandler(groupController.addMember.bind(groupController)));

router.route('/:id/members/:memberId')
  .delete(requireGroupPermission('REMOVE_MEMBER'), asyncHandler(groupController.removeMember.bind(groupController)));

router.route('/:id/members/:memberId/role')
  .patch(requireGroupPermission('UPDATE_MEMBER_ROLE'), validate(updateMemberRoleSchema), asyncHandler(groupController.updateMemberRole.bind(groupController)));

router.route('/:id/activity')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(groupController.getGroupActivity.bind(groupController)));

export default router;
