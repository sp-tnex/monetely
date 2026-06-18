import { userRepository } from '../users/user.repository';
import { AppError } from '../../core/errors/AppError';
import { signToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { RegisterInput, LoginInput } from '@monetely/shared';
import crypto from 'crypto';
import logger from '../../utils/logger';
import { sessionRepository } from './session.repository';

export class AuthService {
  parseUserAgent(userAgent: string) {
    let browser = 'Other';
    let os = 'Other';
    let device = 'Desktop';

    const ua = userAgent.toLowerCase();

    // OS detection
    if (ua.includes('android')) {
      os = 'Android';
      device = ua.includes('tablet') ? 'Tablet' : 'Mobile';
    } else if (ua.includes('iphone')) {
      os = 'iOS';
      device = 'Mobile';
    } else if (ua.includes('ipad')) {
      os = 'iOS';
      device = 'Tablet';
    } else if (ua.includes('windows')) {
      os = 'Windows';
    } else if (ua.includes('macintosh') || ua.includes('mac os')) {
      os = 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    }

    // Browser detection
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    return { browser, os, device };
  }

  async createSession(userId: string, userAgent: string, ipAddress: string) {
    const parsedUa = this.parseUserAgent(userAgent);
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await sessionRepository.create({
      userId: userId as any,
      token,
      userAgent,
      ipAddress,
      expiresAt,
      ...parsedUa,
      isValid: true,
    });

    return session;
  }

  async register(data: RegisterInput, clientInfo: { userAgent: string; ipAddress: string } = { userAgent: '', ipAddress: '' }) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }
    const existingUsername = await userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new AppError('Username already taken', 400);
    }

    const user = await userRepository.create({
      username: data.username,
      email: data.email,
      passwordHash: data.password,
    });

    try {
      const { inviteRepository } = require('../invites/invite.repository');
      const { groupMemberRepository } = require('../groups/group.repository');
      const { groupRepository } = require('../groups/group.repository');
      const { notificationService } = require('../notifications/notification.service');

      const pendingEmailInvites = await inviteRepository.find({
        inviteeEmail: user.email.toLowerCase(),
        status: 'PENDING'
      });

      for (const invite of pendingEmailInvites) {
        const existingMember = await groupMemberRepository.findOne({ group: invite.group, user: user._id });
        if (!existingMember) {
          await groupMemberRepository.create({
            group: invite.group,
            user: user._id,
            role: 'MEMBER'
          });
        }
        invite.status = 'ACCEPTED';
        invite.invitee = user._id;
        await invite.save();

        const group = await groupRepository.findById(invite.group.toString());
        if (group) {
          await notificationService.notifyGroup(
            group._id.toString(),
            `${user.username} joined the group "${group.name}" via email invite`,
            'GROUP_INVITE',
            { groupId: group._id },
            user.id
          );
        }
      }
    } catch (inviteError) {
      logger.error('Error auto-accepting invites on registration:', inviteError);
    }

    const session = await this.createSession(user.id, clientInfo.userAgent, clientInfo.ipAddress);
    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id, session.id);

    return { user, accessToken, refreshToken };
  }

  async login(data: LoginInput, clientInfo: { userAgent: string; ipAddress: string } = { userAgent: '', ipAddress: '' }) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const session = await this.createSession(user.id, clientInfo.userAgent, clientInfo.ipAddress);
    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id, session.id);

    return { user, accessToken, refreshToken };
  }

  async refresh(token: string) {
    if (!token) throw new AppError('No refresh token provided', 401);
    
    try {
      const decoded = verifyRefreshToken(token);
      const session = await sessionRepository.findById(decoded.sessionId);
      if (!session || !session.isValid || session.expiresAt < new Date()) {
        throw new AppError('Session is invalid or expired', 401);
      }
      
      const user = await userRepository.findById(decoded.id);
      if (!user) throw new AppError('User no longer exists', 401);
      
      session.lastActiveAt = new Date();
      await session.save();

      const accessToken = signToken(user.id);
      return { accessToken, user };
    } catch (e) {
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return { message: 'If a user with that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    logger.info(`PASSWORD RESET LINK: http://localhost:5173/reset-password/${resetToken}`);

    return { message: 'If a user with that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, passwordNew: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await userRepository.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new AppError('Token is invalid or has expired', 400);
    }

    user.passwordHash = passwordNew;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return { message: 'Password has been reset successfully.' };
  }

  async logout(token: string) {
    if (!token) return;
    try {
      const decoded = verifyRefreshToken(token);
      await sessionRepository.deleteById(decoded.sessionId);
    } catch (e) {
      // Ignore
    }
  }

  async getSessions(userId: string, currentSessionId?: string) {
    const sessions = await sessionRepository.findActiveByUserId(userId);
    return sessions.map(session => ({
      id: session._id,
      browser: session.browser,
      os: session.os,
      device: session.device,
      ipAddress: session.ipAddress,
      lastActiveAt: session.lastActiveAt,
      isCurrent: session._id.toString() === currentSessionId,
    }));
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }
    if (session.userId.toString() !== userId) {
      throw new AppError('Access denied', 403);
    }
    await sessionRepository.deleteById(sessionId);
    return { success: true };
  }

  async clearOtherSessions(userId: string, currentSessionId: string) {
    const SessionModel = (sessionRepository as any).model;
    await SessionModel.deleteMany({
      userId,
      _id: { $ne: currentSessionId }
    });
    return { success: true };
  }
}

export const authService = new AuthService();
