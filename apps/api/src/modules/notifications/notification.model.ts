import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  message: string;
  isRead: boolean;
  type: 'EXPENSE_ADDED' | 'GROUP_INVITE' | 'SETTLEMENT_RECORDED';
  metadata?: Record<string, any>;
}

const NotificationSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ['EXPENSE_ADDED', 'GROUP_INVITE', 'SETTLEMENT_RECORDED'],
    required: true
  },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
