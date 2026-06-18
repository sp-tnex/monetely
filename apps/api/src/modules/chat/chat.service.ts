import mongoose from 'mongoose';
import { ChatRoom, Message, Reaction, ReadReceipt, IChatRoom, IMessage } from './chat.model';
import { Group, GroupMember } from '../groups/group.model';
import { AppError } from '../../core/errors/AppError';
import { notificationService } from '../notifications/notification.service';
import logger from '../../utils/logger';

export class ChatService {
  /**
   * Helper: Check if a user is a member of the group.
   */
  async validateGroupMembership(groupId: string, userId: string): Promise<string> {
    const member = await GroupMember.findOne({ group: groupId, user: userId });
    if (!member) {
      throw new AppError('Access Denied: You are not a member of this group.', 403);
    }
    return member.role;
  }

  /**
   * Helper: Validate role allows Admin privileges (Admin/Owner).
   */
  isAdminOrOwner(role: string): boolean {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Fetch or create the requested Chat Room for a group.
   */
  async getOrCreateRoom(
    groupId: string,
    type: 'GROUP_CHAT' | 'EXPENSE_DISCUSSION' | 'SETTLEMENT_DISCUSSION' | 'ANNOUNCEMENT_CHANNEL',
    referenceId?: string
  ): Promise<IChatRoom> {
    const query: any = { groupId, type };
    if (referenceId) {
      query.referenceId = new mongoose.Types.ObjectId(referenceId);
    } else {
      query.referenceId = { $exists: false };
    }

    let room = await ChatRoom.findOne(query);
    if (!room) {
      room = await ChatRoom.create({
        groupId: new mongoose.Types.ObjectId(groupId),
        type,
        referenceId: referenceId ? new mongoose.Types.ObjectId(referenceId) : undefined,
        retentionSettings: {
          policy: 'FOREVER',
          autoArchiveEnabled: false,
          autoDeleteEnabled: false,
          notifyBeforeCleanup: true
        }
      });
      logger.info(`Chat room created: type ${type} for group ${groupId}`);
    }

    return room;
  }

  /**
   * Get messages inside a chat room using cursor-based pagination.
   */
  async getMessages(
    roomId: string,
    userId: string,
    options: { limit?: number; cursor?: string } = {}
  ) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }
    await this.validateGroupMembership(room.groupId.toString(), userId);

    const limit = options.limit || 50;
    const query: any = {
      roomId: new mongoose.Types.ObjectId(roomId),
      deletedForUsers: { $ne: new mongoose.Types.ObjectId(userId) }
    };

    if (options.cursor) {
      query.createdAt = { $lt: new Date(options.cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'username email avatarUrl')
      .populate({
        path: 'parentMessageId',
        populate: { path: 'senderId', select: 'username' }
      })
      .lean() as any[];

    const messageIds = messages.map(m => m._id);
    const [reactions, receipts] = await Promise.all([
      Reaction.find({ messageId: { $in: messageIds } }).populate('userId', 'username').lean(),
      ReadReceipt.find({ messageId: { $in: messageIds } }).populate('userId', 'username').lean()
    ]);

    const messagesWithMetadata = messages.map(msg => {
      const msgReactions = reactions.filter(r => r.messageId.toString() === msg._id.toString());
      const msgReceipts = receipts.filter(r => r.messageId.toString() === msg._id.toString());

      const reactionSummary = msgReactions.reduce((acc: any, curr) => {
        const existing = acc.find((item: any) => item.emoji === curr.emoji);
        if (existing) {
          existing.users.push({ id: curr.userId._id, username: (curr.userId as any).username });
          existing.count += 1;
        } else {
          acc.push({
            emoji: curr.emoji,
            users: [{ id: curr.userId._id, username: (curr.userId as any).username }],
            count: 1
          });
        }
        return acc;
      }, []);

      return {
        ...msg,
        reactions: reactionSummary,
        readReceipts: msgReceipts.map(r => ({
          userId: r.userId._id,
          username: (r.userId as any).username,
          deliveredAt: r.deliveredAt,
          readAt: r.readAt
        }))
      };
    });

    const nextCursor = messages.length === limit ? messages[messages.length - 1].createdAt.toISOString() : null;

    return {
      messages: messagesWithMetadata.reverse(),
      nextCursor
    };
  }

  /**
   * Save a new message to the database.
   */
  async sendMessage(
    roomId: string,
    senderId: string,
    data: {
      type: 'TEXT' | 'IMAGE' | 'EXPENSE_REF' | 'SETTLEMENT_REF' | 'SYSTEM';
      content: string;
      attachments?: string[];
      referenceId?: string;
      parentMessageId?: string;
    }
  ): Promise<IMessage> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }
    
    const role = await this.validateGroupMembership(room.groupId.toString(), senderId);
    if (room.type === 'ANNOUNCEMENT_CHANNEL' && !this.isAdminOrOwner(role)) {
      throw new AppError('Only group Owners and Admins can send messages in the Announcement Channel', 403);
    }

    const message = await Message.create({
      roomId: new mongoose.Types.ObjectId(roomId),
      senderId: new mongoose.Types.ObjectId(senderId),
      type: data.type,
      content: data.content,
      attachments: data.attachments || [],
      referenceId: data.referenceId ? new mongoose.Types.ObjectId(data.referenceId) : undefined,
      parentMessageId: data.parentMessageId ? new mongoose.Types.ObjectId(data.parentMessageId) : undefined,
      isPinned: false,
      edited: false,
      deleted: false,
      status: 'ACTIVE'
    });

    await message.populate('senderId', 'username email avatarUrl');
    if (message.parentMessageId) {
      await message.populate({
        path: 'parentMessageId',
        populate: { path: 'senderId', select: 'username' }
      });
    }

    return message;
  }

  /**
   * Edit a message.
   */
  async editMessage(messageId: string, userId: string, content: string): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.senderId.toString() !== userId) {
      throw new AppError('Unauthorized: You can only edit your own messages', 403);
    }

    if (message.deleted) {
      throw new AppError('Cannot edit a deleted message', 400);
    }

    message.editHistory.push({
      content: message.content,
      editedAt: new Date()
    });
    message.content = content;
    message.edited = true;
    await message.save();

    await message.populate('senderId', 'username email avatarUrl');
    if (message.parentMessageId) {
      await message.populate({
        path: 'parentMessageId',
        populate: { path: 'senderId', select: 'username' }
      });
    }

    return message;
  }

  /**
   * Delete a message.
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    deleteType: 'me' | 'everyone'
  ): Promise<{ messageId: string; deleteType: 'me' | 'everyone'; message?: IMessage }> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const room = await ChatRoom.findById(message.roomId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const role = await this.validateGroupMembership(room.groupId.toString(), userId);

    if (deleteType === 'me') {
      if (!message.deletedForUsers.some(id => id.toString() === userId)) {
        message.deletedForUsers.push(new mongoose.Types.ObjectId(userId));
        await message.save();
      }
      return { messageId, deleteType };
    }

    const isSender = message.senderId.toString() === userId;
    const isAuthorized = isSender || this.isAdminOrOwner(role);

    if (!isAuthorized) {
      throw new AppError('Unauthorized to delete this message for everyone', 403);
    }

    message.deleted = true;
    message.deletedAt = new Date();
    message.deletedBy = new mongoose.Types.ObjectId(userId);
    message.content = 'This message was deleted.';
    message.attachments = [];
    message.referenceId = undefined;
    await message.save();

    await message.populate('senderId', 'username email avatarUrl');
    if (message.parentMessageId) {
      await message.populate({
        path: 'parentMessageId',
        populate: { path: 'senderId', select: 'username' }
      });
    }

    return { messageId, deleteType, message };
  }

  /**
   * Toggle Pin Status.
   */
  async pinMessage(messageId: string, userId: string, isPinned: boolean): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const room = await ChatRoom.findById(message.roomId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const role = await this.validateGroupMembership(room.groupId.toString(), userId);
    if (!this.isAdminOrOwner(role)) {
      throw new AppError('Only group Owners and Admins can pin messages', 403);
    }

    message.isPinned = isPinned;
    await message.save();

    await message.populate('senderId', 'username email avatarUrl');
    return message;
  }

  /**
   * Handle Emoji Reactions.
   */
  async handleReaction(
    messageId: string,
    userId: string,
    emoji: string,
    action: 'add' | 'remove'
  ) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const room = await ChatRoom.findById(message.roomId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    await this.validateGroupMembership(room.groupId.toString(), userId);

    if (action === 'add') {
      try {
        await Reaction.create({
          messageId: new mongoose.Types.ObjectId(messageId),
          userId: new mongoose.Types.ObjectId(userId),
          emoji
        });
      } catch (err) {
      }
    } else {
      await Reaction.deleteOne({
        messageId: new mongoose.Types.ObjectId(messageId),
        userId: new mongoose.Types.ObjectId(userId),
        emoji
      });
    }

    const allReactions = await Reaction.find({ messageId: new mongoose.Types.ObjectId(messageId) })
      .populate('userId', 'username')
      .lean();

    const reactionSummary = allReactions.reduce((acc: any, curr) => {
      const existing = acc.find((item: any) => item.emoji === curr.emoji);
      if (existing) {
        existing.users.push({ id: curr.userId._id, username: (curr.userId as any).username });
        existing.count += 1;
      } else {
        acc.push({
          emoji: curr.emoji,
          users: [{ id: curr.userId._id, username: (curr.userId as any).username }],
          count: 1
        });
      }
      return acc;
    }, []);

    return {
      messageId,
      reactions: reactionSummary
    };
  }

  /**
   * Mark messages as read by a user.
   */
  async markRoomAsRead(roomId: string, userId: string, messageId?: string) {
    const query: any = { roomId: new mongoose.Types.ObjectId(roomId) };
    if (messageId) {
      const targetMessage = await Message.findById(messageId);
      if (targetMessage) {
        query.createdAt = { $lte: targetMessage.createdAt };
      }
    }

    const messages = await Message.find(query).select('_id').lean();
    const messageIds = messages.map(m => m._id);

    const bulkOps = messageIds.map(mId => ({
      updateOne: {
        filter: { messageId: mId, userId: new mongoose.Types.ObjectId(userId) },
        update: { $set: { readAt: new Date() }, $setOnInsert: { deliveredAt: new Date() } },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      await ReadReceipt.bulkWrite(bulkOps);
    }

    return { roomId, userId, messageId };
  }

  /**
   * Update Room Retention Settings.
   */
  async updateRetentionSettings(
    roomId: string,
    userId: string,
    settings: {
      policy: 'FOREVER' | '30_DAYS' | '90_DAYS' | '1_YEAR' | 'CUSTOM';
      customDays?: number;
      autoArchiveEnabled: boolean;
      autoDeleteEnabled: boolean;
      notifyBeforeCleanup: boolean;
    }
  ): Promise<IChatRoom> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const role = await this.validateGroupMembership(room.groupId.toString(), userId);
    if (role !== 'OWNER') {
      throw new AppError('Only the Group Owner can modify retention configurations', 403);
    }

    room.retentionSettings = settings;
    await room.save();
    return room;
  }

  /**
   * Manual History Cleanup / Archive / Purge.
   */
  async manualCleanup(
    roomId: string,
    userId: string,
    options: {
      action: 'ARCHIVE' | 'DELETE';
      beforeDate?: string;
      messagesSelected?: string[];
    }
  ): Promise<{ success: boolean; modifiedCount: number }> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const role = await this.validateGroupMembership(room.groupId.toString(), userId);
    if (!this.isAdminOrOwner(role)) {
      throw new AppError('Only group Owners and Admins can clean chat history', 403);
    }

    const query: any = { roomId: new mongoose.Types.ObjectId(roomId) };

    if (options.messagesSelected && options.messagesSelected.length > 0) {
      query._id = { $in: options.messagesSelected.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (options.beforeDate) {
      query.createdAt = { $lte: new Date(options.beforeDate) };
    } else {
      throw new AppError('Please provide either a cutoff date or selected messages to cleanup', 400);
    }

    let modifiedCount = 0;

    if (options.action === 'ARCHIVE') {
      const result = await Message.updateMany(
        { ...query, status: 'ACTIVE' },
        { status: 'ARCHIVED' }
      );
      modifiedCount = result.modifiedCount;
    } else {
      const result = await Message.updateMany(
        { ...query, status: { $in: ['ACTIVE', 'ARCHIVED'] } },
        {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: new mongoose.Types.ObjectId(userId),
          content: 'This message was deleted during history manual cleanup.',
          attachments: [],
          referenceId: undefined,
          status: 'DELETED'
        }
      );
      modifiedCount = result.modifiedCount;
    }

    return { success: true, modifiedCount };
  }

  /**
   * Search chat messages.
   */
  async searchMessages(
    roomId: string,
    userId: string,
    queryStr: string,
    filters: { senderId?: string; type?: string; startDate?: string; endDate?: string } = {}
  ) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }
    await this.validateGroupMembership(room.groupId.toString(), userId);

    const query: any = {
      roomId: new mongoose.Types.ObjectId(roomId),
      deleted: false,
      deletedForUsers: { $ne: new mongoose.Types.ObjectId(userId) }
    };

    if (queryStr && queryStr.trim()) {
      query.$text = { $search: queryStr };
    }

    if (filters.senderId) {
      query.senderId = new mongoose.Types.ObjectId(filters.senderId);
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .populate('senderId', 'username email avatarUrl')
      .populate('parentMessageId')
      .limit(100)
      .lean();

    return messages.reverse();
  }

  /**
   * Export chat history.
   */
  async exportChatHistory(roomId: string, userId: string, format: 'json' | 'csv' | 'txt') {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }
    await this.validateGroupMembership(room.groupId.toString(), userId);

    const messages = await Message.find({
      roomId: new mongoose.Types.ObjectId(roomId),
      deletedForUsers: { $ne: new mongoose.Types.ObjectId(userId) }
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username email')
      .lean();

    if (format === 'json') {
      return {
        contentType: 'application/json',
        data: JSON.stringify(messages, null, 2),
        filename: `chat_history_${roomId}.json`
      };
    }

    if (format === 'csv') {
      let csv = 'Timestamp,Sender,Type,Content,Status\n';
      messages.forEach((msg: any) => {
        const timestamp = msg.createdAt.toISOString();
        const sender = msg.senderId ? msg.senderId.username : 'System';
        const contentEscaped = (msg.content || '').replace(/"/g, '""');
        csv += `"${timestamp}","${sender}","${msg.type}","${contentEscaped}","${msg.status}"\n`;
      });
      return {
        contentType: 'text/csv',
        data: csv,
        filename: `chat_history_${roomId}.csv`
      };
    }

    let txt = `CHAT ROOM LOG: ${room.type} (ID: ${roomId})\n\n`;
    messages.forEach((msg: any) => {
      const timestamp = msg.createdAt.toLocaleString();
      const sender = msg.senderId ? msg.senderId.username : 'System';
      txt += `[${timestamp}] ${sender}: ${msg.content}\n`;
    });

    return {
      contentType: 'text/plain',
      data: txt,
      filename: `chat_history_${roomId}.txt`
    };
  }
}

export const chatService = new ChatService();
