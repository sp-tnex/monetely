import { Request, Response } from 'express';
import { notificationService } from './notification.service';

export class NotificationController {
  async getNotifications(req: Request, res: Response) {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const data = await notificationService.getUserNotifications(req.user.id, page, limit);
    res.status(200).json({ status: 'success', data });
  }

  async markAsRead(req: Request, res: Response) {
    const notification = await notificationService.markAsRead(req.params.id as string, req.user.id);
    res.status(200).json({ status: 'success', data: { notification } });
  }

  async markAllAsRead(req: Request, res: Response) {
    await notificationService.markAllAsRead(req.user.id);
    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
  }
}

export const notificationController = new NotificationController();
