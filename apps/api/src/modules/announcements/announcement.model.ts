import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  group: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  expiresAt?: Date;
  scheduledFor?: Date;
  isPinned: boolean;
}

const AnnouncementSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date },
  scheduledFor: { type: Date },
  isPinned: { type: Boolean, default: false }
}, { timestamps: true });

AnnouncementSchema.index({ group: 1, createdAt: -1 });

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
