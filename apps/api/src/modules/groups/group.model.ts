import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  currency: string;
  createdBy: mongoose.Types.ObjectId;
  monthlyBudget?: number;
}

const GroupSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  currency: { type: String, default: 'USD' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  monthlyBudget: { type: Number, default: 0 }
}, { timestamps: true });

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
