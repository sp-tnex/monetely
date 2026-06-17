import { groupRepository, groupMemberRepository } from './group.repository';
import { userRepository } from '../users/user.repository';
import { AppError } from '../../core/errors/AppError';
import { notificationService } from '../notifications/notification.service';
import { activityService } from './activity.service';
import mongoose from 'mongoose';

export class GroupService {
  async createGroup(userId: string, data: any) {
    const group = await groupRepository.create({ ...data, createdBy: userId });
    await groupMemberRepository.create({
      group: group._id as any,
      user: userId as any,
      role: 'OWNER'
    });

    const creatorUser = await userRepository.findById(userId);
    if (creatorUser) {
      await activityService.logActivity(
        group._id.toString(),
        userId,
        'GROUP_CREATED',
        `${creatorUser.username} created the group "${group.name}"`
      );
    }

    return group;
  }

  async getUserGroups(userId: string) {
    const memberships = await groupMemberRepository.find({ user: userId });
    const groupIds = memberships.map(m => m.group);
    return groupRepository.find({ _id: { $in: groupIds } });
  }

  async getGroupDetails(groupId: string, userId: string) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }
    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }
    return group;
  }

  async getGroupMembers(groupId: string, userId: string) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }
    const { GroupMember } = require('./group.model');
    return GroupMember.find({ group: groupId }).populate('user', 'username email avatarUrl');
  }

  async addMember(groupId: string, actorId: string, email: string, role: string) {
    const actorMembership = await groupMemberRepository.findOne({ group: groupId, user: actorId });
    if (!actorMembership) {
      throw new AppError('You must be a group member to invite others', 403);
    }

    if (actorMembership.role === 'VIEWER' || actorMembership.role === 'MEMBER') {
      throw new AppError('You do not have permission to directly add members', 403);
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const userToAdd = await userRepository.findByEmail(email);
    if (!userToAdd) {
      throw new AppError('User not found', 404);
    }

    const existingMembership = await groupMemberRepository.findOne({ group: groupId, user: userToAdd._id });
    if (existingMembership) {
      throw new AppError('User is already a member of this group', 400);
    }

    const targetRole = role || 'MEMBER';
    if (targetRole === 'OWNER') {
      throw new AppError('Cannot directly add a member as OWNER. Transfer ownership instead.', 400);
    }

    const ROLE_LEVELS = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };
    const actorLevel = ROLE_LEVELS[actorMembership.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;
    const targetLevel = ROLE_LEVELS[targetRole as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;

    if (actorMembership.role !== 'OWNER' && targetLevel >= actorLevel) {
      throw new AppError('You cannot add a member with a role equal to or higher than your own', 403);
    }

    const newMember = await groupMemberRepository.create({
      group: groupId as any,
      user: userToAdd._id as any,
      role: targetRole as any
    });

    const actorUser = await userRepository.findById(actorId);
    if (actorUser) {
      await activityService.logActivity(
        groupId,
        actorId,
        'MEMBER_ADDED',
        `${actorUser.username} added ${userToAdd.username} as ${targetRole}`,
        { memberId: userToAdd._id, role: targetRole }
      );
    }

    // Notify the added user
    await notificationService.notifyUser(
      userToAdd._id.toString(),
      `You have been added to the group "${group.name}" as ${targetRole}`,
      'GROUP_INVITE',
      { groupId }
    );

    return newMember;
  }

  async updateGroup(groupId: string, data: { name?: string; description?: string; currency?: string; monthlyBudget?: number }) {
    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }
    const updated = await groupRepository.updateById(groupId, data);
    return updated;
  }

  async deleteGroup(groupId: string) {
    const group = await groupRepository.deleteById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const MemberModel = (groupMemberRepository as any).model;
    await MemberModel.deleteMany({ group: groupId });

    const { Expense } = require('../expenses/expense.model');
    await Expense.deleteMany({ group: groupId });

    const { Settlement } = require('../settlements/settlement.model');
    await Settlement.deleteMany({ group: groupId });

    const { GroupActivity } = require('./activity.model');
    await GroupActivity.deleteMany({ group: groupId });

    return { success: true };
  }

  async removeMember(groupId: string, actorId: string, memberId: string) {
    const membership = await groupMemberRepository.findOne({ group: groupId, user: memberId });
    if (!membership) {
      throw new AppError('Member not found in this group', 404);
    }

    const actorUser = await userRepository.findById(actorId);
    const targetUser = await userRepository.findById(memberId);
    if (!actorUser || !targetUser) {
      throw new AppError('User not found', 404);
    }

    if (actorId !== memberId) {
      const actorMembership = await groupMemberRepository.findOne({ group: groupId, user: actorId });
      if (!actorMembership) {
        throw new AppError('You are not a member of this group', 403);
      }

      const ROLE_LEVELS = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };
      const actorLevel = ROLE_LEVELS[actorMembership.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;
      const targetLevel = ROLE_LEVELS[membership.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;

      if (actorLevel < 3) {
        throw new AppError('Only group owners and admins can eject members', 403);
      }

      if (actorMembership.role !== 'OWNER' && targetLevel >= actorLevel) {
        throw new AppError('You cannot eject members with a role equal to or higher than your own', 403);
      }
    }

    if (membership.role === 'OWNER') {
      const otherOwners = await groupMemberRepository.count({ group: groupId, role: 'OWNER', _id: { $ne: membership.id } });
      if (otherOwners === 0) {
        throw new AppError('Cannot leave the group as the sole owner. Promote another member first.', 400);
      }
    }

    await groupMemberRepository.deleteById(membership.id);

    if (actorId === memberId) {
      await activityService.logActivity(
        groupId,
        actorId,
        'MEMBER_LEFT',
        `${actorUser.username} left the group`
      );
    } else {
      await activityService.logActivity(
        groupId,
        actorId,
        'MEMBER_REMOVED',
        `${actorUser.username} removed ${targetUser.username} from the group`,
        { memberId }
      );
    }

    return { success: true };
  }

  async updateMemberRole(groupId: string, actorId: string, memberId: string, newRole: string) {
    const actorMembership = await groupMemberRepository.findOne({ group: groupId, user: actorId });
    if (!actorMembership) {
      throw new AppError('You are not a member of this group', 403);
    }

    const targetMembership = await groupMemberRepository.findOne({ group: groupId, user: memberId });
    if (!targetMembership) {
      throw new AppError('Member not found in this group', 404);
    }

    if (targetMembership.role === newRole) {
      return targetMembership;
    }

    const actorUser = await userRepository.findById(actorId);
    const targetUser = await userRepository.findById(memberId);
    if (!actorUser || !targetUser) {
      throw new AppError('User not found', 404);
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const ROLE_LEVELS = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };
    const actorLevel = ROLE_LEVELS[actorMembership.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;
    const currentTargetLevel = ROLE_LEVELS[targetMembership.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;
    const newTargetLevel = ROLE_LEVELS[newRole as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;

    if (actorMembership.role === 'OWNER') {
      if (actorId === memberId && newRole !== 'OWNER') {
        const otherOwners = await groupMemberRepository.count({ group: groupId, role: 'OWNER', _id: { $ne: targetMembership.id } });
        if (otherOwners === 0) {
          throw new AppError('Cannot change your role as the sole owner. Promote another member first.', 400);
        }
      }

      if (newRole === 'OWNER') {
        actorMembership.role = 'ADMIN';
        await actorMembership.save();
        await activityService.logActivity(
          groupId,
          actorId,
          'ROLE_CHANGED',
          `${actorUser.username} transferred group ownership to ${targetUser.username}`,
          { oldOwnerId: actorId, newOwnerId: memberId }
        );
      }
    } else if (actorMembership.role === 'ADMIN') {
      if (targetMembership.role === 'OWNER' || targetMembership.role === 'ADMIN') {
        throw new AppError('You do not have permission to modify roles of OWNER or other ADMINs', 403);
      }
      if (newRole === 'ADMIN' || newRole === 'OWNER') {
        throw new AppError('Only group owners can promote members to ADMIN or OWNER', 403);
      }
    } else {
      throw new AppError('Only group owners and admins can update member roles', 403);
    }

    const oldRole = targetMembership.role;
    targetMembership.role = newRole as any;
    await targetMembership.save();

    if (newRole !== 'OWNER') {
      await activityService.logActivity(
        groupId,
        actorId,
        'ROLE_CHANGED',
        `${actorUser.username} changed ${targetUser.username}'s role from ${oldRole} to ${newRole}`,
        { memberId, oldRole, newRole }
      );
    }

    await notificationService.notifyUser(
      memberId,
      `Your role in the group "${group.name}" has been updated to ${newRole}`,
      'GROUP_INVITE',
      { groupId }
    );

    return targetMembership;
  }

  async exportGroupData(groupId: string, format: 'json' | 'csv' | 'html') {
    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const { Expense } = require('../expenses/expense.model');
    const expenses = await Expense.find({
      group: new mongoose.Types.ObjectId(groupId),
      status: { $ne: 'DELETED' },
    }).populate('paidBy', 'username email');

    const { GroupMember } = require('./group.model');
    const members = await GroupMember.find({ group: groupId }).populate('user', 'username email');

    if (format === 'json') {
      return {
        contentType: 'application/json',
        filename: `monetely_group_${groupId}.json`,
        content: JSON.stringify({ group, members, expenses }, null, 2),
      };
    }

    if (format === 'csv') {
      let csv = 'ID,Date,Description,Category,Amount,Currency,PaidBy,Status\n';
      expenses.forEach((e: any) => {
        const paidByUsername = e.paidBy?.username || 'Unknown';
        const desc = e.description.replace(/"/g, '""');
        csv += `"${e._id}","${e.date.toISOString()}","${desc}","${e.category}",${e.amount},"${group.currency}","${paidByUsername}","${e.status}"\n`;
      });

      return {
        contentType: 'text/csv',
        filename: `monetely_group_${groupId}.csv`,
        content: csv,
      };
    }

    if (format === 'html') {
      let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monetely Group Export: ${group.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; }
          h1 { color: #0f172a; margin-bottom: 5px; }
          .meta { font-size: 14px; color: #64748b; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
          th, td { padding: 14px 20px; text-align: left; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
          th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
          tr:last-child td { border-bottom: none; }
          .badge { padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .badge-active { background: #dcfce7; color: #15803d; }
          .badge-archived { background: #fef9c3; color: #a16207; }
        </style>
      </head>
      <body>
        <h1>Group Spending Ledger: ${group.name}</h1>
        <p class="meta">Export generated on: ${new Date().toLocaleString()} | Members: ${members.map((m: any) => m.user?.username || 'Unknown').join(', ')}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Total Amount</th>
              <th>Paid By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;

      expenses.forEach((e: any) => {
        const paidByUsername = e.paidBy?.username || 'Unknown';
        const dateStr = new Date(e.date).toLocaleDateString();
        const badgeClass = e.status === 'ACTIVE' ? 'badge-active' : 'badge-archived';

        html += `
          <tr>
            <td>${dateStr}</td>
            <td><strong>${e.description}</strong></td>
            <td style="text-transform: capitalize;">${e.category}</td>
            <td>${group.currency} ${e.amount.toFixed(2)}</td>
            <td>${paidByUsername}</td>
            <td><span class="badge ${badgeClass}">${e.status}</span></td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      </body>
      </html>
      `;

      return {
        contentType: 'text/html',
        filename: `monetely_group_${groupId}.html`,
        content: html,
      };
    }

    throw new AppError('Unsupported format', 400);
  }
}

export const groupService = new GroupService();
