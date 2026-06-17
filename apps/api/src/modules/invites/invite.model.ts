import mongoose, { Schema, Document } from 'mongoose';

export interface IInvite extends Document {
  group: mongoose.Types.ObjectId;
  inviter: mongoose.Types.ObjectId;
  type: 'EMAIL' | 'USERNAME' | 'LINK';
  inviteeEmail?: string;
  inviteeUsername?: string;
  invitee?: mongoose.Types.ObjectId;
  token: string;
  expiresAt?: Date;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  inviter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['EMAIL', 'USERNAME', 'LINK'], required: true },
  inviteeEmail: { type: String, lowercase: true },
  inviteeUsername: { type: String },
  invitee: { type: Schema.Types.ObjectId, ref: 'User' },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED'], 
    default: 'PENDING',
    required: true
  },
  role: {
    type: String,
    enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
    default: 'MEMBER',
    required: true
  }
}, { timestamps: true });

// Add indexes for efficient queries
InviteSchema.index({ group: 1, status: 1 });
InviteSchema.index({ invitee: 1, status: 1 });
InviteSchema.index({ inviteeEmail: 1, status: 1 });

export const Invite = mongoose.model<IInvite>('Invite', InviteSchema);
