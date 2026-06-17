import { Request, Response } from 'express';
import { authService } from './auth.service';
import { RegisterInput, LoginInput } from '@monetely/shared';
import { env } from '../../config';
import { verifyRefreshToken } from '../../utils/jwt';

export class AuthController {
  async register(req: Request, res: Response) {
    const data: RegisterInput = req.body;
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress) || '';
    const userAgent = req.headers['user-agent'] || '';
    
    const { user, accessToken, refreshToken } = await authService.register(data, { userAgent, ipAddress });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
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
        },
        accessToken,
      },
    });
  }

  async login(req: Request, res: Response) {
    const data: LoginInput = req.body;
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress) || '';
    const userAgent = req.headers['user-agent'] || '';
    
    const { user, accessToken, refreshToken } = await authService.login(data, { userAgent, ipAddress });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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
        },
        accessToken,
      },
    });
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    const { accessToken, user } = await authService.refresh(refreshToken);
    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
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

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);
    
    res.cookie('refreshToken', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  }

  async forgotPassword(req: Request, res: Response) {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json({ status: 'success', message: result.message });
  }

  async resetPassword(req: Request, res: Response) {
    const result = await authService.resetPassword(req.params.token as string, req.body.password);
    res.status(200).json({ status: 'success', message: result.message });
  }

  async getSessions(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    let currentSessionId = '';
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        currentSessionId = decoded.sessionId;
      } catch (e) {}
    }
    const sessions = await authService.getSessions(req.user.id, currentSessionId);
    res.status(200).json({ status: 'success', data: sessions });
  }

  async deleteSession(req: Request, res: Response) {
    await authService.deleteSession(req.user.id, req.params.id as string);
    res.status(200).json({ status: 'success', message: 'Session terminated successfully' });
  }

  async clearOtherSessions(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    let currentSessionId = '';
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        currentSessionId = decoded.sessionId;
      } catch (e) {}
    }

    await authService.clearOtherSessions(req.user.id, currentSessionId);
    res.status(200).json({ status: 'success', message: 'Other sessions cleared successfully' });
  }
}

export const authController = new AuthController();
