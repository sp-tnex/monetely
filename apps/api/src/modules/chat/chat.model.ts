import mongoose, { Schema, Document } from 'mongoose';

export interface IChatRoom extends Document {
  groupId: mongoose.Types.ObjectId;
  type: 'GROUP_CHAT' | 'EXPENSE_DISCUSSION' | 'SETTLEMENT_DISCUSSION' | 'ANNOUNCEMENT_CHANNEL';
  referenceId?: mongoose.Types.ObjectId;
  retentionSettings: {
    policy: 'FOREVER' | '30_DAYS' | '90_DAYS' | '1_YEAR' | 'CUSTOM';
    customDays?: number;
    autoArchiveEnabled: boolean;
    autoDeleteEnabled: boolean;
    notifyBeforeCleanup: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomSchema: Schema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  type: {
    type: String,
    enum: ['GROUP_CHAT', 'EXPENSE_DISCUSSION', 'SETTLEMENT_DISCUSSION', 'ANNOUNCEMENT_CHANNEL'],
    required: true
  },
  referenceId: { type: Schema.Types.ObjectId },
  retentionSettings: {
    policy: {
      type: String,
      enum: ['FOREVER', '30_DAYS', '90_DAYS', '1_YEAR', 'CUSTOM'],
      default: 'FOREVER'
    },
    customDays: { type: Number },
    autoArchiveEnabled: { type: Boolean, default: false },
    autoDeleteEnabled: { type: Boolean, default: false },
    notifyBeforeCleanup: { type: Boolean, default: true }
  }
}, { timestamps: true });

ChatRoomSchema.index({ groupId: 1, type: 1 });
ChatRoomSchema.index({ referenceId: 1 }, { sparse: true });

export const ChatRoom = mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema);

export interface IMessage extends Document {
  roomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  type: 'TEXT' | 'IMAGE' | 'EXPENSE_REF' | 'SETTLEMENT_REF' | 'SYSTEM';
  content: string;
  attachments?: string[];
  referenceId?: mongoose.Types.ObjectId;
  parentMessageId?: mongoose.Types.ObjectId; 
  isPinned: boolean;
  edited: boolean;
  editHistory: Array<{
    content: string;
    editedAt: Date;
  }>;
  deleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  deletedForUsers: mongoose.Types.ObjectId[];
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  roomId: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['TEXT', 'IMAGE', 'EXPENSE_REF', 'SETTLEMENT_REF', 'SYSTEM'],
    default: 'TEXT'
  },
  content: { type: String, required: true },
  attachments: [{ type: String }],
  referenceId: { type: Schema.Types.ObjectId },
  parentMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  isPinned: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  editHistory: [{
    content: { type: String, required: true },
    editedAt: { type: Date, default: Date.now }
  }],
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedForUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['ACTIVE', 'ARCHIVED', 'DELETED'],
    default: 'ACTIVE'
  }
}, { timestamps: true });

MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ roomId: 1, type: 1 });
MessageSchema.index({ parentMessageId: 1 }, { sparse: true });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ status: 1 });

MessageSchema.index({ content: 'text' });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

export interface IReaction extends Document {
  messageId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  emoji: string;
}

const ReactionSchema: Schema = new Schema({
  messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true }
}, { timestamps: true });

ReactionSchema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true });

export const Reaction = mongoose.model<IReaction>('Reaction', ReactionSchema);

export interface IReadReceipt extends Document {
  messageId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deliveredAt?: Date;
  readAt?: Date;
}

const ReadReceiptSchema: Schema = new Schema({
  messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deliveredAt: { type: Date },
  readAt: { type: Date }
}, { timestamps: true });

ReadReceiptSchema.index({ messageId: 1, userId: 1 }, { unique: true });
ReadReceiptSchema.index({ userId: 1, readAt: 1 });

export const ReadReceipt = mongoose.model<IReadReceipt>('ReadReceipt', ReadReceiptSchema);
