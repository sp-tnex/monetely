import { create } from 'zustand';
import { api } from '../config/api';
import socketService from '../utils/socketService';

interface ChatRoom {
  _id: string;
  groupId: string;
  type: 'GROUP_CHAT' | 'EXPENSE_DISCUSSION' | 'SETTLEMENT_DISCUSSION' | 'ANNOUNCEMENT_CHANNEL';
  referenceId?: string;
  retentionSettings: {
    policy: 'FOREVER' | '30_DAYS' | '90_DAYS' | '1_YEAR' | 'CUSTOM';
    customDays?: number;
    autoArchiveEnabled: boolean;
    autoDeleteEnabled: boolean;
    notifyBeforeCleanup: boolean;
  };
}

interface Message {
  _id: string;
  roomId: string;
  senderId: {
    _id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
  type: 'TEXT' | 'IMAGE' | 'EXPENSE_REF' | 'SETTLEMENT_REF' | 'SYSTEM';
  content: string;
  attachments?: string[];
  referenceId?: string;
  parentMessageId?: any;
  isPinned: boolean;
  edited: boolean;
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  reactions: Array<{
    emoji: string;
    count: number;
    users: Array<{ id: string; username: string }>;
  }>;
  readReceipts: Array<{
    userId: string;
    username: string;
    deliveredAt?: string;
    readAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TypingUser {
  userId: string;
  username: string;
}

interface ChatState {
  rooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  messages: Message[];
  nextCursor: string | null;
  isLoadingRooms: boolean;
  isLoadingMessages: boolean;
  typingUsers: Record<string, TypingUser[]>; 
  onlineUsers: Set<string>;
  
  fetchRooms: (groupId: string) => Promise<ChatRoom[]>;
  getOrCreateRoom: (groupId: string, type: ChatRoom['type'], referenceId?: string) => Promise<ChatRoom>;
  setActiveRoom: (room: ChatRoom | null) => void;
  fetchMessages: (roomId: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (content: string, type?: Message['type'], referenceId?: string, parentMessageId?: string, attachments?: string[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string, deleteType: 'me' | 'everyone') => void;
  togglePin: (messageId: string, isPinned: boolean) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  markAsRead: (roomId: string, messageId?: string) => void;
  setTyping: (roomId: string, isTyping: boolean) => void;
  updateRetention: (roomId: string, settings: ChatRoom['retentionSettings']) => Promise<void>;
  manualCleanup: (roomId: string, options: { action: 'ARCHIVE' | 'DELETE'; beforeDate?: string; messagesSelected?: string[] }) => Promise<void>;
  searchMessages: (roomId: string, query: string, filters?: any) => Promise<Message[]>;
  
  // Socket listener setup
  setupSocketListeners: () => void;
  removeSocketListeners: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  activeRoom: null,
  messages: [],
  nextCursor: null,
  isLoadingRooms: false,
  isLoadingMessages: false,
  typingUsers: {},
  onlineUsers: new Set<string>(),

  fetchRooms: async (groupId) => {
    set({ isLoadingRooms: true });
    try {
      const [generalRes, annRes] = await Promise.all([
        api.get(`/chat/groups/${groupId}/rooms?type=GROUP_CHAT`),
        api.get(`/chat/groups/${groupId}/rooms?type=ANNOUNCEMENT_CHANNEL`),
      ]);
      
      const newRooms = [
        generalRes.data.data.room,
        annRes.data.data.room
      ].filter(Boolean);

      set({ rooms: newRooms });
      return newRooms;
    } catch (err) {
      console.error('Failed to fetch rooms', err);
      return [];
    } finally {
      set({ isLoadingRooms: false });
    }
  },

  getOrCreateRoom: async (groupId, type, referenceId) => {
    let url = `/chat/groups/${groupId}/rooms?type=${type}`;
    if (referenceId) {
      url += `&referenceId=${referenceId}`;
    }
    const res = await api.get(url);
    const room = res.data.data.room;
    
    const currentRooms = get().rooms;
    if (!currentRooms.some(r => r._id === room._id)) {
      set({ rooms: [...currentRooms, room] });
    }
    return room;
  },

  setActiveRoom: (room) => {
    const oldRoom = get().activeRoom;
    if (oldRoom) {
      socketService.emit('chat:leaveRoom', { roomId: oldRoom._id });
    }

    set({ activeRoom: room, messages: [], nextCursor: null });

    if (room) {
      socketService.connect();
      socketService.emit('chat:joinRoom', { roomId: room._id }, (response: any) => {
        if (response?.error) {
          console.error('Failed to join room', response.error);
        }
      });
      get().fetchMessages(room._id);
    }
  },

  fetchMessages: async (roomId, loadMore = false) => {
    if (get().isLoadingMessages) return;

    set({ isLoadingMessages: true });
    try {
      const cursor = loadMore ? get().nextCursor : null;
      let url = `/chat/rooms/${roomId}/messages?limit=30`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }

      const res = await api.get(url);
      const { messages: newMessages, nextCursor } = res.data.data;

      set((state) => ({
        messages: loadMore ? [...newMessages, ...state.messages] : newMessages,
        nextCursor,
      }));
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (content, type = 'TEXT', referenceId, parentMessageId, attachments) => {
    const activeRoom = get().activeRoom;
    if (!activeRoom) return;

    return new Promise((resolve, reject) => {
      socketService.emit(
        'chat:sendMessage',
        {
          roomId: activeRoom._id,
          type,
          content,
          referenceId,
          parentMessageId,
          attachments,
        },
        (res: any) => {
          if (res?.error) {
            reject(new Error(res.error));
          } else {
            resolve();
          }
        }
      );
    });
  },

  editMessage: (messageId, content) => {
    socketService.emit('chat:editMessage', { messageId, content });
  },

  deleteMessage: (messageId, deleteType) => {
    socketService.emit('chat:deleteMessage', { messageId, deleteType });
    if (deleteType === 'me') {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
    }
  },

  togglePin: (messageId, isPinned) => {
    socketService.emit('chat:pinMessage', { messageId, isPinned });
  },

  addReaction: (messageId, emoji) => {
    socketService.emit('chat:reaction', { messageId, emoji, action: 'add' });
  },

  removeReaction: (messageId, emoji) => {
    socketService.emit('chat:reaction', { messageId, emoji, action: 'remove' });
  },

  markAsRead: (roomId, messageId) => {
    socketService.emit('chat:messageRead', { roomId, messageId });
  },

  setTyping: (roomId, isTyping) => {
    if (isTyping) {
      socketService.emit('chat:typing', { roomId });
    } else {
      socketService.emit('chat:stopTyping', { roomId });
    }
  },

  updateRetention: async (roomId, settings) => {
    const res = await api.patch(`/chat/rooms/${roomId}/retention`, settings);
    const updatedRoom = res.data.data.room;
    set((state) => ({
      activeRoom: state.activeRoom?._id === roomId ? updatedRoom : state.activeRoom,
      rooms: state.rooms.map((r) => (r._id === roomId ? updatedRoom : r)),
    }));
  },

  manualCleanup: async (roomId, options) => {
    await api.post(`/chat/rooms/${roomId}/cleanup`, options);
    get().fetchMessages(roomId);
  },

  searchMessages: async (roomId, query, filters = {}) => {
    let url = `/chat/rooms/${roomId}/search?query=${encodeURIComponent(query)}`;
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        url += `&${key}=${filters[key]}`;
      }
    });
    const res = await api.get(url);
    return res.data.data.messages || [];
  },

  setupSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    get().removeSocketListeners();

    socket.on('chat:receiveMessage', (message: Message) => {
      const activeRoom = get().activeRoom;
      if (activeRoom && message.roomId === activeRoom._id) {
        set((state) => ({
          messages: [...state.messages, message],
        }));
        
        get().markAsRead(activeRoom._id, message._id);
      }
    });

    socket.on('chat:editMessage', (editedMsg: Message) => {
      set((state) => ({
        messages: state.messages.map((m) => (m._id === editedMsg._id ? { ...m, ...editedMsg } : m)),
      }));
    });

    socket.on('chat:deleteMessage', ({ messageId, message }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? (message ? { ...m, ...message } : { ...m, deleted: true, content: 'This message was deleted.' }) : m
        ),
      }));
    });

    socket.on('chat:reaction', ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((m) => (m._id === messageId ? { ...m, reactions } : m)),
      }));
    });

    socket.on('chat:pinMessage', (pinnedMsg: Message) => {
      set((state) => ({
        messages: state.messages.map((m) => (m._id === pinnedMsg._id ? { ...m, isPinned: pinnedMsg.isPinned } : m)),
      }));
    });

    socket.on('chat:messageRead', ({ roomId, userId, messageId }) => {
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m.roomId !== roomId) return m;
          
          // If messageId is provided, mark up to it, otherwise mark all
          const isReadTarget = !messageId || m._id === messageId;
          
          if (isReadTarget) {
            const hasReceipt = m.readReceipts.some((r) => r.userId === userId);
            const updatedReceipts = hasReceipt
              ? m.readReceipts.map((r) => (r.userId === userId ? { ...r, readAt: new Date().toISOString() } : r))
              : [...m.readReceipts, { userId, username: '', readAt: new Date().toISOString() }];
            return { ...m, readReceipts: updatedReceipts };
          }
          return m;
        }),
      }));
    });

    socket.on('chat:typing', ({ roomId, userId, username }) => {
      set((state) => {
        const currentList = state.typingUsers[roomId] || [];
        if (currentList.some((u) => u.userId === userId)) return state;
        return {
          typingUsers: {
            ...state.typingUsers,
            [roomId]: [...currentList, { userId, username }],
          },
        };
      });
    });

    socket.on('chat:stopTyping', ({ roomId, userId }) => {
      set((state) => {
        const currentList = state.typingUsers[roomId] || [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [roomId]: currentList.filter((u) => u.userId !== userId),
          },
        };
      });
    });

    socket.on('chat:presenceUpdate', ({ userId, status }) => {
      set((state) => {
        const nextSet = new Set(state.onlineUsers);
        if (status === 'online') {
          nextSet.add(userId);
        } else {
          nextSet.delete(userId);
        }
        return { onlineUsers: nextSet };
      });
    });
  },

  removeSocketListeners: () => {
    socketService.off('chat:receiveMessage');
    socketService.off('chat:editMessage');
    socketService.off('chat:deleteMessage');
    socketService.off('chat:reaction');
    socketService.off('chat:pinMessage');
    socketService.off('chat:messageRead');
    socketService.off('chat:typing');
    socketService.off('chat:stopTyping');
    socketService.off('chat:presenceUpdate');
  },
}));
