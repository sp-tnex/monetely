import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { verifyToken } from '../../utils/jwt';
import { chatService } from '../../modules/chat/chat.service';
import { ChatRoom, Message } from '../../modules/chat/chat.model';
import { User } from '../../modules/users/user.model';
import { GroupMember } from '../../modules/groups/group.model';
import { notificationService } from '../../modules/notifications/notification.service';
import { env } from '../..//config';
import logger from '../../utils/logger';

let io: SocketIOServer | null = null;
const onlineUsers = new Map<string, string>();

export const initSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true
    }
  });

  if (env.REDIS_URI) {
    try {
      const pubClient = new Redis(env.REDIS_URI);
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => logger.warn('Redis pubClient error, falling back to memory adapter:', err.message));
      subClient.on('error', (err) => logger.warn('Redis subClient error, falling back to memory adapter:', err.message));

      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis Adapter initialized successfully.');
    } catch (err: any) {
      logger.error('Failed to initialize Socket.IO Redis Adapter. Using in-memory adapter.', err.message);
    }
  }

  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth.token || socket.handshake.headers.authorization;
      if (!authHeader) {
        return next(new Error('Authentication error: Token missing'));
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      const decoded = verifyToken(token);
      
      const user = await User.findById(decoded.id).select('username email avatarUrl');
      if (!user) {
        return next(new Error('Authentication error: User no longer exists'));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      logger.warn('Socket authentication failed:', err);
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const userId = user._id.toString();

    onlineUsers.set(userId, socket.id);
    logger.info(`User ${user.username} (${userId}) connected to Socket.IO`);

    socket.broadcast.emit('chat:presenceUpdate', {
      userId,
      status: 'online'
    });

    socket.on('group:join', ({ groupId }) => {
      socket.join(`group:${groupId}`);
      logger.info(`User ${user.username} joined group room ${groupId}`);
    });

    socket.on('group:leave', ({ groupId }) => {
      socket.leave(`group:${groupId}`);
      logger.info(`User ${user.username} left group room ${groupId}`);
    });

    socket.on('chat:joinRoom', async ({ roomId }, callback) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) {
          if (callback) callback({ error: 'Room not found' });
          return;
        }

        const role = await chatService.validateGroupMembership(room.groupId.toString(), userId);
        
        const socketRoomName = `room:${roomId}`;
        socket.join(socketRoomName);
        socket.data.currentRoomId = roomId;

        logger.info(`User ${user.username} joined room ${roomId}`);
        if (callback) callback({ success: true, role });

        await chatService.markRoomAsRead(roomId, userId);
        socket.to(socketRoomName).emit('chat:messageRead', {
          roomId,
          userId,
          readAt: new Date()
        });
      } catch (err: any) {
        logger.error('Error joining room:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    socket.on('chat:leaveRoom', ({ roomId }) => {
      socket.leave(`room:${roomId}`);
      if (socket.data.currentRoomId === roomId) {
        delete socket.data.currentRoomId;
      }
      logger.info(`User ${user.username} left room ${roomId}`);
    });

    socket.on('chat:sendMessage', async (data, callback) => {
      try {
        const { roomId, type, content, referenceId, parentMessageId, attachments } = data;
        const room = await ChatRoom.findById(roomId);
        if (!room) {
          if (callback) callback({ error: 'Room not found' });
          return;
        }

        await chatService.validateGroupMembership(room.groupId.toString(), userId);

        const message = await chatService.sendMessage(roomId, userId, {
          type,
          content,
          referenceId,
          parentMessageId,
          attachments
        });

        const socketRoomName = `room:${roomId}`;
        io?.to(socketRoomName).emit('chat:receiveMessage', message);

        if (callback) callback({ success: true, message });

        const groupMembers = await GroupMember.find({ group: room.groupId }).populate('user');
        
        const recipientMembers = groupMembers.filter(m => m.user._id.toString() !== userId);
        const mentionRegex = /@(\w+)/g;
        const mentionedUsernames: string[] = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
          mentionedUsernames.push(match[1]);
        }

        const isMentionAll = content.includes('@All') || content.includes('@all');

        for (const member of recipientMembers) {
          const recUserId = member.user._id.toString();
          const recSocketId = onlineUsers.get(recUserId);
          const recSocket = io?.sockets.sockets.get(recSocketId || '');
          const isUserInRoom = recSocket && recSocket.data.currentRoomId === roomId;

          if (!isUserInRoom) {
            const isMentioned = isMentionAll || mentionedUsernames.includes((member.user as any).username);
            let notifType: 'EXPENSE_ADDED' | 'GROUP_INVITE' | 'SETTLEMENT_RECORDED' = 'EXPENSE_ADDED';
            let msgText = `New message in ${room.type === 'GROUP_CHAT' ? 'Group Chat' : 'Discussion'}: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`;
            
            if (isMentioned) {
              msgText = `${user.username} mentioned you in group chat: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`;
            }

            await notificationService.notifyUser(
              recUserId,
              msgText,
              notifType,
              {
                roomId,
                groupId: room.groupId,
                messageId: message._id,
                type: isMentioned ? 'CHAT_MENTION' : 'CHAT_MESSAGE',
                senderUsername: user.username
              }
            );

            if (recSocketId) {
              io?.to(recSocketId).emit('notification:new', {
                message: msgText,
                metadata: { roomId, groupId: room.groupId }
              });
            }
          }
        }
      } catch (err: any) {
        logger.error('Error sending message:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    socket.on('chat:typing', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('chat:typing', {
        roomId,
        userId,
        username: user.username
      });
    });

    socket.on('chat:stopTyping', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('chat:stopTyping', {
        roomId,
        userId
      });
    });

    socket.on('chat:editMessage', async ({ messageId, content }, callback) => {
      try {
        const message = await chatService.editMessage(messageId, userId, content);
        const socketRoomName = `room:${message.roomId}`;
        io?.to(socketRoomName).emit('chat:editMessage', message);
        if (callback) callback({ success: true, message });
      } catch (err: any) {
        logger.error('Error editing message:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    socket.on('chat:deleteMessage', async ({ messageId, deleteType }, callback) => {
      try {
        const result = await chatService.deleteMessage(messageId, userId, deleteType);
        
        if (deleteType === 'everyone') {
          const socketRoomName = `room:${result.message?.roomId}`;
          io?.to(socketRoomName).emit('chat:deleteMessage', {
            messageId,
            deleteType,
            message: result.message
          });
        }
        
        if (callback) callback({ success: true });
      } catch (err: any) {
        logger.error('Error deleting message:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    socket.on('chat:messageRead', async ({ roomId, messageId }) => {
      try {
        await chatService.markRoomAsRead(roomId, userId, messageId);
        socket.to(`room:${roomId}`).emit('chat:messageRead', {
          roomId,
          userId,
          messageId
        });
      } catch (err: any) {
        logger.error('Error marking messages as read:', err.message);
      }
    });

    socket.on('chat:reaction', async ({ messageId, emoji, action }, callback) => {
      try {
        const result = await chatService.handleReaction(messageId, userId, emoji, action);
        const targetMessage = await Message.findById(messageId);
        if (targetMessage) {
          io?.to(`room:${targetMessage.roomId}`).emit('chat:reaction', {
            messageId,
            reactions: result.reactions
          });
        }
        if (callback) callback({ success: true });
      } catch (err: any) {
        logger.error('Error handling reaction:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    socket.on('chat:pinMessage', async ({ messageId, isPinned }, callback) => {
      try {
        const message = await chatService.pinMessage(messageId, userId, isPinned);
        io?.to(`room:${message.roomId}`).emit('chat:pinMessage', message);
        if (callback) callback({ success: true, message });
      } catch (err: any) {
        logger.error('Error pinning message:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      logger.info(`User ${user.username} (${userId}) disconnected from Socket.IO`);

      socket.broadcast.emit('chat:presenceUpdate', {
        userId,
        status: 'offline',
        lastSeen: new Date()
      });
    });
  });
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};
