import { chatService } from '../chat.service';
import { ChatRoom, Message, Reaction } from '../chat.model';
import { GroupMember } from '../../groups/group.model';
import mongoose from 'mongoose';

jest.mock('../chat.model', () => ({
  ChatRoom: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn()
  },
  Message: {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn()
  },
  Reaction: {
    create: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn()
  },
  ReadReceipt: {
    find: jest.fn(),
    bulkWrite: jest.fn()
  }
}));

jest.mock('../../groups/group.model', () => ({
  Group: {
    findById: jest.fn()
  },
  GroupMember: {
    findOne: jest.fn(),
    find: jest.fn()
  }
}));

describe('ChatService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateGroupMembership', () => {
    it('should throw an error if the user is not a member of the group', async () => {
      const gId = new mongoose.Types.ObjectId().toString();
      const uId = new mongoose.Types.ObjectId().toString();

      (GroupMember.findOne as jest.Mock).mockResolvedValue(null);

      await expect(chatService.validateGroupMembership(gId, uId))
        .rejects
        .toThrow('Access Denied: You are not a member of this group.');
    });

    it('should return member role if user is in the group', async () => {
      const gId = new mongoose.Types.ObjectId().toString();
      const uId = new mongoose.Types.ObjectId().toString();

      (GroupMember.findOne as jest.Mock).mockResolvedValue({ role: 'MEMBER' });

      const role = await chatService.validateGroupMembership(gId, uId);
      expect(role).toBe('MEMBER');
    });
  });

  describe('getOrCreateRoom', () => {
    it('should return existing room if it exists', async () => {
      const gId = new mongoose.Types.ObjectId().toString();
      const mockRoom = { _id: 'room123', groupId: gId, type: 'GROUP_CHAT' };

      (ChatRoom.findOne as jest.Mock).mockResolvedValue(mockRoom);

      const room = await chatService.getOrCreateRoom(gId, 'GROUP_CHAT');
      expect(room).toEqual(mockRoom);
      expect(ChatRoom.create).not.toHaveBeenCalled();
    });

    it('should create new room if it does not exist', async () => {
      const gId = new mongoose.Types.ObjectId().toString();
      const mockRoom = { _id: 'room123', groupId: gId, type: 'GROUP_CHAT' };

      (ChatRoom.findOne as jest.Mock).mockResolvedValue(null);
      (ChatRoom.create as jest.Mock).mockResolvedValue(mockRoom);

      const room = await chatService.getOrCreateRoom(gId, 'GROUP_CHAT');
      expect(room).toEqual(mockRoom);
      expect(ChatRoom.create).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should block non-admins from writing to the announcement channel', async () => {
      const rId = new mongoose.Types.ObjectId().toString();
      const uId = new mongoose.Types.ObjectId().toString();
      const gId = new mongoose.Types.ObjectId().toString();

      (ChatRoom.findById as jest.Mock).mockResolvedValue({ _id: rId, groupId: gId, type: 'ANNOUNCEMENT_CHANNEL' });
      (GroupMember.findOne as jest.Mock).mockResolvedValue({ role: 'MEMBER' }); // Demote to MEMBER

      await expect(chatService.sendMessage(rId, uId, { type: 'TEXT', content: 'Test' }))
        .rejects
        .toThrow('Only group Owners and Admins can send messages in the Announcement Channel');
    });

    it('should allow admins to write to the announcement channel', async () => {
      const rId = new mongoose.Types.ObjectId().toString();
      const uId = new mongoose.Types.ObjectId().toString();
      const gId = new mongoose.Types.ObjectId().toString();
      const mockMsg = { _id: 'msg1', roomId: rId, senderId: uId, content: 'Announce', populate: jest.fn() };

      (ChatRoom.findById as jest.Mock).mockResolvedValue({ _id: rId, groupId: gId, type: 'ANNOUNCEMENT_CHANNEL' });
      (GroupMember.findOne as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
      (Message.create as jest.Mock).mockResolvedValue(mockMsg);

      const msg = await chatService.sendMessage(rId, uId, { type: 'TEXT', content: 'Announce' });
      expect(msg).toEqual(mockMsg);
      expect(Message.create).toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('should allow soft-delete for everyone by sender', async () => {
      const mId = new mongoose.Types.ObjectId().toString();
      const uId = new mongoose.Types.ObjectId().toString();
      const rId = new mongoose.Types.ObjectId().toString();
      const gId = new mongoose.Types.ObjectId().toString();

      const mockMsg = { 
        _id: mId, 
        senderId: uId, 
        roomId: rId, 
        deleted: false, 
        content: '',
        populate: jest.fn(),
        save: jest.fn()
      } as any;

      (Message.findById as jest.Mock).mockResolvedValue(mockMsg);
      (ChatRoom.findById as jest.Mock).mockResolvedValue({ _id: rId, groupId: gId });
      (GroupMember.findOne as jest.Mock).mockResolvedValue({ role: 'MEMBER' });

      const result = await chatService.deleteMessage(mId, uId, 'everyone');
      expect(mockMsg.deleted).toBe(true);
      expect(mockMsg.content).toBe('This message was deleted.');
      expect(mockMsg.save).toHaveBeenCalled();
      expect(result.messageId).toBe(mId);
    });

    it('should block non-sender and non-admin from delete for everyone', async () => {
      const mId = new mongoose.Types.ObjectId().toString();
      const uId = new mongoose.Types.ObjectId().toString(); // current user
      const senderId = new mongoose.Types.ObjectId().toString(); // other user
      const rId = new mongoose.Types.ObjectId().toString();
      const gId = new mongoose.Types.ObjectId().toString();

      const mockMsg = { 
        _id: mId, 
        senderId, 
        roomId: rId
      };

      (Message.findById as jest.Mock).mockResolvedValue(mockMsg);
      (ChatRoom.findById as jest.Mock).mockResolvedValue({ _id: rId, groupId: gId });
      (GroupMember.findOne as jest.Mock).mockResolvedValue({ role: 'MEMBER' });

      await expect(chatService.deleteMessage(mId, uId, 'everyone'))
        .rejects
        .toThrow('Unauthorized to delete this message for everyone');
    });
  });
});
