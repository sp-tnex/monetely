import { Request, Response } from 'express';
import { announcementService } from './announcement.service';

export class AnnouncementController {
  async getAnnouncements(req: Request, res: Response) {
    const { announcements, total, page, limit, hasMore } = await announcementService.getAnnouncements(
      req.params.groupId as string,
      req.query
    );
    res.status(200).json({ status: 'success', data: { announcements, total, page, limit, hasMore } });
  }

  async createAnnouncement(req: Request, res: Response) {
    const announcement = await announcementService.createAnnouncement(
      req.params.groupId as string,
      req.user.id,
      req.body
    );
    res.status(201).json({ status: 'success', data: { announcement } });
  }

  async deleteAnnouncement(req: Request, res: Response) {
    await announcementService.deleteAnnouncement(
      req.params.groupId as string,
      req.user.id,
      req.params.announcementId as string
    );
    res.status(200).json({ status: 'success', message: 'Announcement deleted successfully' });
  }

  async togglePin(req: Request, res: Response) {
    const announcement = await announcementService.togglePin(
      req.params.groupId as string,
      req.user.id,
      req.params.announcementId as string,
      req.body.isPinned
    );
    res.status(200).json({ status: 'success', data: { announcement } });
  }
}

export const announcementController = new AnnouncementController();
