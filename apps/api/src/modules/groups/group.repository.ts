import { BaseRepository } from '../../core/repositories/BaseRepository';
import { Group, IGroup, GroupMember, IGroupMember } from './group.model';

export class GroupRepository extends BaseRepository<IGroup> {
  constructor() {
    super(Group);
  }
}

export class GroupMemberRepository extends BaseRepository<IGroupMember> {
  constructor() {
    super(GroupMember);
  }
}

export const groupRepository = new GroupRepository();
export const groupMemberRepository = new GroupMemberRepository();
