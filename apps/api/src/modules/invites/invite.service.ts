import { inviteRepository } from './invite.repository';
import { groupRepository, groupMemberRepository } from '../groups/group.repository';
import { userRepository } from '../users/user.repository';
import { AppError } from '../../core/errors/AppError';
import { notificationService } from '../notifications/notification.service';
import { activityService } from '../groups/activity.service';
import crypto from 'crypto';
import QRCode from 'qrcode';

export class InviteService {
  async createInvite(
    groupId: string,
    inviterId: string,
    data: {
      type: 'EMAIL' | 'USERNAME' | 'LINK';
      email?: string;
      username?: string;
      expiresInDays?: number;
      role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
    }
  ) {
    const inviterMember = await groupMemberRepository.findOne({ group: groupId, user: inviterId });
    if (!inviterMember) {
      throw new AppError('You must be a group member to invite others', 403);
    }

    if (inviterMember.role === 'VIEWER') {
      throw new AppError('Viewers do not have permission to invite members', 403);
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const inviterUser = await userRepository.findById(inviterId);
    if (!inviterUser) {
      throw new AppError('Inviter not found', 404);
    }

    const targetRole = data.role || 'MEMBER';
    if (targetRole === 'OWNER') {
      throw new AppError('Cannot invite a user as OWNER directly. Transfer ownership instead.', 400);
    }

    const ROLE_LEVELS = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };
    const inviterLevel = ROLE_LEVELS[inviterMember.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;
    const targetLevel = ROLE_LEVELS[targetRole];

    if (inviterMember.role !== 'OWNER' && targetLevel >= inviterLevel) {
      throw new AppError('You cannot invite a user with a role equal to or higher than your own', 403);
    }

    let inviteeId: any = undefined;
    let inviteeEmail: string | undefined = undefined;
    let inviteeUsername: string | undefined = undefined;

    if (data.type === 'EMAIL') {
      if (!data.email) {
        throw new AppError('Email is required for email invites', 400);
      }
      inviteeEmail = data.email.toLowerCase().trim();
      
      const inviteeUser = await userRepository.findByEmail(inviteeEmail);
      if (inviteeUser) {
        inviteeId = inviteeUser._id;
        const existingMember = await groupMemberRepository.findOne({ group: groupId, user: inviteeId });
        if (existingMember) {
          throw new AppError('User is already a member of this group', 400);
        }
      }
    } else if (data.type === 'USERNAME') {
      if (!data.username) {
        throw new AppError('Username is required for username invites', 400);
      }
      inviteeUsername = data.username.trim();
      const inviteeUser = await userRepository.findByUsername(inviteeUsername);
      if (!inviteeUser) {
        throw new AppError('User not found with this username', 404);
      }
      inviteeId = inviteeUser._id;
      inviteeEmail = inviteeUser.email;
      
      const existingMember = await groupMemberRepository.findOne({ group: groupId, user: inviteeId });
      if (existingMember) {
        throw new AppError('User is already a member of this group', 400);
      }
    } else if (data.type === 'LINK') {
      
    } else {
      throw new AppError('Invalid invite type', 400);
    }

    const token = crypto.randomBytes(16).toString('hex');
    
    let expiresAt: Date | undefined = undefined;
    if (data.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);
    }

    if (data.type !== 'LINK') {
      const existingInvite = await inviteRepository.findOne({
        group: groupId,
        status: 'PENDING',
        $or: [
          ...(inviteeEmail ? [{ inviteeEmail }] : []),
          ...(inviteeUsername ? [{ inviteeUsername }] : [])
        ]
      });
      if (existingInvite) {
        return existingInvite;
      }
    }

    const invite = await inviteRepository.create({
      group: groupId as any,
      inviter: inviterId as any,
      type: data.type,
      inviteeEmail,
      inviteeUsername,
      invitee: inviteeId,
      token,
      expiresAt,
      status: 'PENDING',
      role: targetRole
    });

    if (inviteeId) {
      await notificationService.notifyUser(
        inviteeId.toString(),
        `You have been invited to join the group "${group.name}" by ${inviterUser.username}`,
        'GROUP_INVITE',
        { inviteId: invite._id, groupId: group._id }
      );
    }

    const inviteeName = data.type === 'LINK' ? 'Share Link' : (inviteeEmail || `@${inviteeUsername}` || 'user');
    await activityService.logActivity(
      groupId,
      inviterId,
      'MEMBER_INVITED',
      `${inviterUser.username} invited ${inviteeName} as ${targetRole}`,
      { inviteId: invite._id, inviteType: data.type, inviteRole: targetRole }
    );

    return invite;
  }

  async revokeInvite(inviteId: string, userId: string) {
    const invite = await inviteRepository.findById(inviteId);
    if (!invite) {
      throw new AppError('Invite not found', 404);
    }

    const groupMember = await groupMemberRepository.findOne({ group: invite.group, user: userId });
    if (!groupMember || (groupMember.role !== 'OWNER' && groupMember.role !== 'ADMIN' && invite.inviter.toString() !== userId)) {
      throw new AppError('You do not have permission to revoke this invite', 403);
    }

    invite.status = 'REVOKED';
    await invite.save();

    const actorUser = await userRepository.findById(userId);
    const inviteeName = invite.type === 'LINK' ? 'Share Link' : (invite.inviteeEmail || `@${invite.inviteeUsername}` || 'user');
    await activityService.logActivity(
      invite.group.toString(),
      userId,
      'INVITE_REVOKED',
      `${actorUser ? actorUser.username : 'Someone'} revoked invitation for ${inviteeName}`,
      { inviteId: invite._id }
    );

    return invite;
  }

  async resendInvite(groupId: string, actorId: string, inviteId: string) {
    const actorMember = await groupMemberRepository.findOne({ group: groupId, user: actorId });
    if (!actorMember) {
      throw new AppError('You must be a group member to manage invites', 403);
    }
    if (actorMember.role === 'VIEWER') {
      throw new AppError('Viewers cannot resend invitations', 403);
    }

    const invite = await inviteRepository.findOne({ _id: inviteId, group: groupId });
    if (!invite) {
      throw new AppError('Invite not found', 404);
    }

    if (invite.status !== 'PENDING') {
      throw new AppError('Can only resend pending invitations', 400);
    }

    const actorUser = await userRepository.findById(actorId);
    if (!actorUser) {
      throw new AppError('Actor not found', 404);
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const ROLE_LEVELS = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };
    const actorLevel = ROLE_LEVELS[actorMember.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;
    const inviteLevel = ROLE_LEVELS[invite.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'] || 2;

    if (actorMember.role !== 'OWNER' && inviteLevel >= actorLevel) {
      throw new AppError('You do not have permission to resend this invite due to role hierarchy', 403);
    }

    invite.token = crypto.randomBytes(16).toString('hex');
    if (invite.expiresAt) {
      const durationMs = invite.expiresAt.getTime() - invite.createdAt.getTime();
      invite.expiresAt = new Date(Date.now() + (durationMs > 0 ? durationMs : 7 * 24 * 60 * 60 * 1000));
    }
    await invite.save();

    if (invite.invitee) {
      await notificationService.notifyUser(
        invite.invitee.toString(),
        `You have been invited to join the group "${group.name}" by ${actorUser.username} (resent)`,
        'GROUP_INVITE',
        { inviteId: invite._id, groupId: group._id }
      );
    } else if (invite.inviteeEmail) {
      const inviteeUser = await userRepository.findByEmail(invite.inviteeEmail);
      if (inviteeUser) {
        await notificationService.notifyUser(
          inviteeUser._id.toString(),
          `You have been invited to join the group "${group.name}" by ${actorUser.username} (resent)`,
          'GROUP_INVITE',
          { inviteId: invite._id, groupId: group._id }
        );
      }
    }

    const inviteeName = invite.type === 'LINK' ? 'Share Link' : (invite.inviteeEmail || `@${invite.inviteeUsername}` || 'user');
    await activityService.logActivity(
      groupId,
      actorId,
      'INVITE_RESENT',
      `${actorUser.username} resent invitation to ${inviteeName}`,
      { inviteId: invite._id }
    );

    return invite;
  }

  async getGroupInvites(groupId: string, userId: string) {
    const groupMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!groupMember) {
      throw new AppError('You must be a group member to view invites', 403);
    }
    return inviteRepository.find({ group: groupId, status: 'PENDING' });
  }

  async getUserPendingInvites(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { Invite } = require('./invite.model');
    return Invite.find({
      status: 'PENDING',
      $or: [
        { invitee: userId },
        { inviteeEmail: user.email }
      ]
    })
    .populate('group', 'name description')
    .populate('inviter', 'username email');
  }

  async getInviteByToken(token: string) {
    const { Invite } = require('./invite.model');
    const invite = await Invite.findOne({ token, status: 'PENDING' })
      .populate('group', 'name description currency')
      .populate('inviter', 'username email');

    if (!invite) {
      throw new AppError('Invite not found or no longer active', 404);
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = 'REVOKED';
      await invite.save();
      throw new AppError('This invite link has expired', 400);
    }

    return invite;
  }

  async acceptInvite(tokenOrInviteId: string, userId: string, isToken: boolean) {
    const { Invite } = require('./invite.model');
    let invite;
    if (isToken) {
      invite = await Invite.findOne({ token: tokenOrInviteId, status: 'PENDING' });
    } else {
      invite = await Invite.findOne({ _id: tokenOrInviteId, status: 'PENDING' });
    }

    if (!invite) {
      throw new AppError('Invite not found or no longer pending', 404);
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new AppError('This invite has expired', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (invite.invitee && invite.invitee.toString() !== userId) {
      throw new AppError('This invite is not for you', 403);
    }
    if (invite.inviteeEmail && invite.inviteeEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new AppError('This invite is not for you', 403);
    }

    const existingMember = await groupMemberRepository.findOne({ group: invite.group, user: userId });
    if (!existingMember) {
      await groupMemberRepository.create({
        group: invite.group,
        user: userId as any,
        role: invite.role || 'MEMBER'
      });
    }

    invite.status = 'ACCEPTED';
    invite.invitee = userId as any;
    await invite.save();

    const group = await groupRepository.findById(invite.group.toString());
    if (group) {
      await notificationService.notifyGroup(
        group._id.toString(),
        `${user.username} joined the group "${group.name}" via invite`,
        'GROUP_INVITE',
        { groupId: group._id },
        userId
      );
    }

    await activityService.logActivity(
      invite.group.toString(),
      userId,
      'INVITE_ACCEPTED',
      `${user.username} accepted invitation and joined the group as ${invite.role || 'MEMBER'}`,
      { inviteId: invite._id }
    );

    return invite;
  }

  async declineInvite(tokenOrInviteId: string, userId: string, isToken: boolean) {
    const { Invite } = require('./invite.model');
    let invite;
    if (isToken) {
      invite = await Invite.findOne({ token: tokenOrInviteId, status: 'PENDING' });
    } else {
      invite = await Invite.findOne({ _id: tokenOrInviteId, status: 'PENDING' });
    }

    if (!invite) {
      throw new AppError('Invite not found or no longer pending', 404);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (invite.invitee && invite.invitee.toString() !== userId) {
      throw new AppError('This invite is not for you', 403);
    }
    if (invite.inviteeEmail && invite.inviteeEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new AppError('This invite is not for you', 403);
    }

    invite.status = 'DECLINED';
    await invite.save();

    await activityService.logActivity(
      invite.group.toString(),
      userId,
      'INVITE_DECLINED',
      `${user.username} declined invitation`,
      { inviteId: invite._id }
    );

    return invite;
  }

  async generateQR(token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/invite/${token}`;
    const qrDataUrl = await QRCode.toDataURL(inviteLink);
    return qrDataUrl;
  }
}

export const inviteService = new InviteService();
