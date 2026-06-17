import { notificationRepository } from './notification.repository';
import { groupMemberRepository } from '../groups/group.repository';
import mongoose from 'mongoose';

export class NotificationService {
  async notifyUser(
    userId: string,
    message: string,
    type: 'EXPENSE_ADDED' | 'GROUP_INVITE' | 'SETTLEMENT_RECORDED',
    metadata?: Record<string, any>
  ) {
    return notificationRepository.create({
      user: new mongoose.Types.ObjectId(userId) as any,
      message,
      type,
      metadata,
      isRead: false
    });
  }

  async notifyGroup(
    groupId: string,
    message: string,
    type: 'EXPENSE_ADDED' | 'GROUP_INVITE' | 'SETTLEMENT_RECORDED',
    metadata?: Record<string, any>,
    excludeUserId?: string
  ) {
    const memberships = await groupMemberRepository.find({ group: groupId });
    const notifications = [];

    for (const member of memberships) {
      const memberIdStr = member.user.toString();
      if (excludeUserId && memberIdStr === excludeUserId) {
        continue;
      }
      notifications.push(
        this.notifyUser(memberIdStr, message, type, metadata)
      );
    }

    await Promise.all(notifications);
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const items = await notificationRepository.find({ user: userId }, skip, limit, '-createdAt');
    const total = await notificationRepository.count({ user: userId });
    return { items, total, page, limit };
  }

  async markAsRead(notificationId: string, userId: string) {
    const updated = await notificationRepository.updateById(notificationId, { isRead: true });
    return updated;
  }

  async markAllAsRead(userId: string) {
    const Model = (notificationRepository as any).model;
    await Model.updateMany({ user: userId, isRead: false }, { isRead: true });
    return { success: true };
  }
}

export const notificationService = new NotificationService();
