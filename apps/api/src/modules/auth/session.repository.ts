import { BaseRepository } from '../../core/repositories/BaseRepository';
import { Session, ISession } from './session.model';

export class SessionRepository extends BaseRepository<ISession> {
  constructor() {
    super(Session);
  }

  async findByToken(token: string): Promise<ISession | null> {
    return this.findOne({ token });
  }

  async findActiveByUserId(userId: string): Promise<ISession[]> {
    return this.find({ userId, isValid: true, expiresAt: { $gt: new Date() } }, 0, 100, { lastActiveAt: -1 });
  }
}

export const sessionRepository = new SessionRepository();
