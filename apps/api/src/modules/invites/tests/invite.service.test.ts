import { inviteService } from '../invite.service';
import { inviteRepository } from '../invite.repository';
import { groupRepository, groupMemberRepository } from '../../groups/group.repository';
import { userRepository } from '../../users/user.repository';
import { notificationService } from '../../notifications/notification.service';

jest.mock('../invite.repository', () => ({
  inviteRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }
}));

jest.mock('../../groups/group.repository', () => ({
  groupRepository: {
    findById: jest.fn(),
  },
  groupMemberRepository: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }
}));

jest.mock('../../users/user.repository', () => ({
  userRepository: {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
  }
}));

jest.mock('../../notifications/notification.service', () => ({
  notificationService: {
    notifyUser: jest.fn(),
    notifyGroup: jest.fn(),
  }
}));

describe('InviteService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvite', () => {
    it('should throw an error if the inviter is not a member of the group', async () => {
      (groupMemberRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(inviteService.createInvite('group123', 'user123', {
        type: 'EMAIL',
        email: 'test@example.com'
      })).rejects.toThrow('You must be a group member to invite others');
    });

    it('should create a pending invite successfully for email type', async () => {
      (groupMemberRepository.findOne as jest.Mock)
        .mockResolvedValueOnce({ group: 'group123', user: 'user123', role: 'OWNER' })
        .mockResolvedValueOnce(null);
      
      (groupRepository.findById as jest.Mock).mockResolvedValue({ _id: 'group123', name: 'Test Group' });
      (userRepository.findById as jest.Mock).mockResolvedValue({ _id: 'user123', username: 'inviter' });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({ _id: 'invitee123', email: 'test@example.com' });
      
      const mockInvite = {
        _id: 'invite123',
        group: 'group123',
        inviter: 'user123',
        type: 'EMAIL',
        inviteeEmail: 'test@example.com',
        invitee: 'invitee123',
        token: 'mocktoken',
        status: 'PENDING'
      };
      
      (inviteRepository.create as jest.Mock).mockResolvedValue(mockInvite);

      const result = await inviteService.createInvite('group123', 'user123', {
        type: 'EMAIL',
        email: 'test@example.com'
      });

      expect(result).toEqual(mockInvite);
      expect(inviteRepository.create).toHaveBeenCalled();
      expect(notificationService.notifyUser).toHaveBeenCalledWith(
        'invitee123',
        expect.stringContaining('Test Group'),
        'GROUP_INVITE',
        expect.any(Object)
      );
    });
  });
});
