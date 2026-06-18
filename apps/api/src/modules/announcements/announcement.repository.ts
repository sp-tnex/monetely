import { BaseRepository } from '../../core/repositories/BaseRepository';
import { Announcement, IAnnouncement } from './announcement.model';

export class AnnouncementRepository extends BaseRepository<IAnnouncement> {
  constructor() {
    super(Announcement);
  }
}

export const announcementRepository = new AnnouncementRepository();
