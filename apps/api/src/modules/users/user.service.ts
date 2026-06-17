import { userRepository } from './user.repository';
import { AppError } from '../../core/errors/AppError';
import crypto from 'crypto';
import { Session } from '../auth/session.model';
import { GroupMember } from '../groups/group.model';
import { DeletionWarning } from '../retention/retention.model';

export class UserService {
  async updateProfile(userId: string, data: {
    username?: string;
    avatarUrl?: string;
    theme?: 'light' | 'dark';
    gravatarEmail?: string;
    darkPalette?: 'midnight' | 'charcoal' | 'forest' | 'amethyst' | 'custom';
    customColors?: {
      background?: string;
      card?: string;
      border?: string;
      primary?: string;
    };
    defaultCurrency?: string;
    timezone?: string;
    language?: string;
    notificationPreferences?: {
      push?: boolean;
      system?: boolean;
    };
    webhook?: {
      url?: string;
      enabled?: boolean;
      secret?: string;
    };
  }) {
    if (data.username) {
      const existingUser = await userRepository.findByUsername(data.username);
      if (existingUser && existingUser.id !== userId) {
        throw new AppError('Username is already taken', 400);
      }
    }

    if (data.gravatarEmail !== undefined) {
      if (data.gravatarEmail.trim()) {
        const email = data.gravatarEmail.trim().toLowerCase();
        const hash = crypto.createHash('md5').update(email).digest('hex');
        data.avatarUrl = `https://www.gravatar.com/avatar/${hash}?d=mp`;
        data.gravatarEmail = email;
      } else {
        data.gravatarEmail = '';
        data.avatarUrl = '';
      }
    }

    const updateData: any = { ...data };
    if (data.webhook) {
      delete updateData.webhook;
      if (data.webhook.url !== undefined) updateData['webhook.url'] = data.webhook.url;
      if (data.webhook.enabled !== undefined) updateData['webhook.enabled'] = data.webhook.enabled;
    }
    if (data.notificationPreferences) {
      delete updateData.notificationPreferences;
      if (data.notificationPreferences.push !== undefined) updateData['notificationPreferences.push'] = data.notificationPreferences.push;
      if (data.notificationPreferences.system !== undefined) updateData['notificationPreferences.system'] = data.notificationPreferences.system;
    }
    if (data.customColors) {
      delete updateData.customColors;
      if (data.customColors.background !== undefined) updateData['customColors.background'] = data.customColors.background;
      if (data.customColors.card !== undefined) updateData['customColors.card'] = data.customColors.card;
      if (data.customColors.border !== undefined) updateData['customColors.border'] = data.customColors.border;
      if (data.customColors.primary !== undefined) updateData['customColors.primary'] = data.customColors.primary;
    }

    const updatedUser = await userRepository.updateById(userId, updateData);
    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }
    return updatedUser;
  }

  async updatePassword(userId: string, data: any) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await user.comparePassword(data.currentPassword);
    if (!isMatch) {
      throw new AppError('Incorrect current password', 400);
    }

    user.passwordHash = data.newPassword;
    await user.save();
    return { success: true };
  }

  async deleteAccount(userId: string, data: any) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new AppError('Incorrect password', 400);
    }

    await GroupMember.deleteMany({ user: userId });

    await Session.deleteMany({ userId });

    await DeletionWarning.deleteMany({ user: userId });

    await userRepository.deleteById(userId);

    return { success: true };
  }
}

export const userService = new UserService();
