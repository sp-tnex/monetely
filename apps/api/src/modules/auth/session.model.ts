import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  userAgent?: string;
  ipAddress?: string;
  browser: string;
  os: string;
  device: string;
  isValid: boolean;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    device: { type: String, default: 'Desktop' },
    isValid: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Session = mongoose.model<ISession>('Session', SessionSchema);
