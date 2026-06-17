import { BaseRepository } from '../../core/repositories/BaseRepository';
import { GroupActivity, IGroupActivity } from './activity.model';

export class GroupActivityRepository extends BaseRepository<IGroupActivity> {
  constructor() {
    super(GroupActivity);
  }
}

export const groupActivityRepository = new GroupActivityRepository();
