import { announcementRepository } from './announcement.repository';
import { Announcement } from './announcement.model';
import { groupMemberRepository } from '../groups/group.repository';
import { AppError } from '../../core/errors/AppError';
import { webhookService } from '../groups/webhook.service';

export class AnnouncementService {
  async getAnnouncements(groupId: string, queryParams: any = {}) {
    const now = new Date();
    const page = parseInt(queryParams.page as string, 10) || 1;
    const limit = parseInt(queryParams.limit as string, 10) || 5;
    const skip = (page - 1) * limit;

    const filter = {
      group: groupId,
      $and: [
        { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ scheduledFor: { $exists: false } }, { scheduledFor: null }, { scheduledFor: { $lte: now } }] }
      ]
    };

    const announcements = await announcementRepository.find(
      filter,
      skip,
      limit,
      { isPinned: -1, createdAt: -1 }
    );

    const total = await Announcement.countDocuments(filter);

    return {
      announcements,
      total,
      page,
      limit,
      hasMore: skip + announcements.length < total
    };
  }

  async createAnnouncement(
    groupId: string,
    userId: string,
    data: { title: string; message: string; expiresAt?: string; scheduledFor?: string; isPinned?: boolean }
  ) {
    const member = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new AppError('Only group Owners and Admins can create announcements', 403);
    }

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined;
    const scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : undefined;

    const announcement = await announcementRepository.create({
      title: data.title,
      message: data.message,
      group: groupId as any,
      createdBy: userId as any,
      expiresAt,
      scheduledFor,
      isPinned: data.isPinned || false
    });

    // Trigger webhook event
    await webhookService.triggerWebhook(
      groupId,
      'announcement.created',
      `New announcement: ${data.title}`,
      { announcementId: announcement.id, title: data.title }
    );

    return announcement;
  }

  async deleteAnnouncement(groupId: string, userId: string, announcementId: string) {
    const member = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new AppError('Only group Owners and Admins can delete announcements', 403);
    }

    const announcement = await announcementRepository.findById(announcementId);
    if (!announcement || announcement.group.toString() !== groupId) {
      throw new AppError('Announcement not found in this group', 404);
    }

    await announcementRepository.deleteById(announcementId);
    return { success: true };
  }

  async togglePin(groupId: string, userId: string, announcementId: string, isPinned: boolean) {
    const member = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new AppError('Only group Owners and Admins can pin announcements', 403);
    }

    const announcement = await announcementRepository.findById(announcementId);
    if (!announcement || announcement.group.toString() !== groupId) {
      throw new AppError('Announcement not found in this group', 404);
    }

    announcement.isPinned = isPinned;
    await announcement.save();
    return announcement;
  }
}

export const announcementService = new AnnouncementService();
