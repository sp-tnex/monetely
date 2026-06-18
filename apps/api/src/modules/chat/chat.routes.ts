import { Router } from 'express';
import { chatController } from './chat.controller';
import { requireAuth } from '../../core/middlewares/auth';
import { requireGroupPermission } from '../../core/middlewares/rbac';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.route('/groups/:groupId/rooms')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(chatController.getOrCreateRoom.bind(chatController)));

router.route('/rooms/:roomId/messages')
  .get(asyncHandler(chatController.getMessages.bind(chatController)))
  .post(asyncHandler(chatController.sendMessage.bind(chatController)));

router.route('/rooms/:roomId/read')
  .post(asyncHandler(chatController.markAsRead.bind(chatController)));

router.route('/rooms/:roomId/retention')
  .patch(asyncHandler(chatController.updateRetentionSettings.bind(chatController)));

router.route('/rooms/:roomId/cleanup')
  .post(asyncHandler(chatController.manualCleanup.bind(chatController)));

router.route('/rooms/:roomId/search')
  .get(asyncHandler(chatController.searchMessages.bind(chatController)));

router.route('/rooms/:roomId/export')
  .get(asyncHandler(chatController.exportChatHistory.bind(chatController)));

router.route('/messages/:messageId')
  .patch(asyncHandler(chatController.editMessage.bind(chatController)))
  .delete(asyncHandler(chatController.deleteMessage.bind(chatController)));

router.route('/messages/:messageId/pin')
  .patch(asyncHandler(chatController.togglePin.bind(chatController)));

router.route('/messages/:messageId/reactions')
  .post(asyncHandler(chatController.handleReaction.bind(chatController)));

export default router;
