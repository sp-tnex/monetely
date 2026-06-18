import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IGroup extends Document {
  name: string;
  description?: string;
  currency: string;
  createdBy: mongoose.Types.ObjectId;
  monthlyBudget?: number;
  allowUpiSharing: boolean;
  allowDirectSettlement: boolean;
  showUpiToMembers: boolean;
  settlementRemindersEnabled: boolean;
  webhookUrl?: string;
  webhookEnabled: boolean;
  webhookSecret?: string;
  reminderSchedule: 'monthly' | 'weekly' | 'custom';
  reminderDay: number;
}

const GroupSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  currency: { type: String, default: 'USD' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  monthlyBudget: { type: Number, default: 0 },
  allowUpiSharing: { type: Boolean, default: true },
  allowDirectSettlement: { type: Boolean, default: true },
  showUpiToMembers: { type: Boolean, default: true },
  settlementRemindersEnabled: { type: Boolean, default: true },
  webhookUrl: { type: String, default: '' },
  webhookEnabled: { type: Boolean, default: false },
  webhookSecret: { type: String },
  reminderSchedule: { type: String, enum: ['monthly', 'weekly', 'custom'], default: 'monthly' },
  reminderDay: { type: Number, default: 1 }
}, { timestamps: true });

GroupSchema.pre<IGroup>('save', async function (next) {
  if (this.isNew && !this.webhookSecret) {
    this.webhookSecret = crypto.randomBytes(24).toString('hex');
  }
  next();
});

export const Group = mongoose.model<IGroup>('Group', GroupSchema);

export interface IGroupMember extends Document {
  group: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

const GroupMemberSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'], default: 'MEMBER' }
}, { timestamps: true });

GroupMemberSchema.index({ group: 1, user: 1 }, { unique: true });

export const GroupMember = mongoose.model<IGroupMember>('GroupMember', GroupMemberSchema);
