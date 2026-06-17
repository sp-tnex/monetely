import { BaseRepository } from '../../core/repositories/BaseRepository';
import { User, IUser } from './user.model';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email });
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return this.findOne({ username });
  }
}

export const userRepository = new UserRepository();
