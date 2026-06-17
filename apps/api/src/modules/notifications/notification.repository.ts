import { BaseRepository } from '../../core/repositories/BaseRepository';
import { Notification, INotification } from './notification.model';

export class NotificationRepository extends BaseRepository<INotification> {
  constructor() {
    super(Notification);
  }
}

export const notificationRepository = new NotificationRepository();
