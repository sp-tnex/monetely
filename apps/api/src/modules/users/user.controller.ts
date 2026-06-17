import { Request, Response } from 'express';
import { userService } from './user.service';

export class UserController {
  async getMe(req: Request, res: Response) {
    const user = req.user;
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          gravatarEmail: user.gravatarEmail,
          theme: user.theme,
          darkPalette: user.darkPalette,
          customColors: user.customColors,
          defaultCurrency: user.defaultCurrency,
          timezone: user.timezone,
          language: user.language,
          notificationPreferences: user.notificationPreferences,
          webhook: user.webhook,
        }
      }
    });
  }

  async updateProfile(req: Request, res: Response) {
    const updated = await userService.updateProfile(req.user.id, req.body);
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: updated._id,
          username: updated.username,
          email: updated.email,
          avatarUrl: updated.avatarUrl,
          gravatarEmail: updated.gravatarEmail,
          theme: updated.theme,
          darkPalette: updated.darkPalette,
          customColors: updated.customColors,
          defaultCurrency: updated.defaultCurrency,
          timezone: updated.timezone,
          language: updated.language,
          notificationPreferences: updated.notificationPreferences,
          webhook: updated.webhook,
        }
      }
    });
  }

  async updatePassword(req: Request, res: Response) {
    await userService.updatePassword(req.user.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  }

  async deleteAccount(req: Request, res: Response) {
    await userService.deleteAccount(req.user.id, req.body);

    res.cookie('refreshToken', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  }
}

export const userController = new UserController();
