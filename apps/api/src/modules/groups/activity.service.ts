import { groupActivityRepository } from './activity.repository';
import { groupMemberRepository } from './group.repository';
import { AppError } from '../../core/errors/AppError';

export class ActivityService {
  async logActivity(
    groupId: string,
    actorId: string,
    action: string,
    description: string,
    metadata?: any
  ) {
    try {
      await groupActivityRepository.create({
        group: groupId as any,
        actor: actorId as any,
        action,
        description,
        metadata
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }

  async getGroupActivity(groupId: string, userId: string, queryParams: any = {}) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const { GroupActivity } = require('./activity.model');
    const page = parseInt(queryParams.page as string, 10) || 1;
    const limit = parseInt(queryParams.limit as string, 10) || 15;
    const skip = (page - 1) * limit;

    const activities = await GroupActivity.find({ group: groupId })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('actor', 'username email avatarUrl');

    const total = await GroupActivity.countDocuments({ group: groupId });

    return {
      activities,
      total,
      page,
      limit,
      hasMore: skip + activities.length < total
    };
  }
}

export const activityService = new ActivityService();
