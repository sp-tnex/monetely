import { BaseRepository } from '../../core/repositories/BaseRepository';
import { Invite, IInvite } from './invite.model';

export class InviteRepository extends BaseRepository<IInvite> {
  constructor() {
    super(Invite);
  }

  async findByToken(token: string): Promise<IInvite | null> {
    return this.findOne({ token });
  }
}

export const inviteRepository = new InviteRepository();
