import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupActivity extends Document {
  group: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const GroupActivitySchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  description: { type: String, required: true },
  metadata: { type: Schema.Types.Map, of: Schema.Types.Mixed }
}, { 
  timestamps: { createdAt: true, updatedAt: false } 
});

GroupActivitySchema.index({ group: 1, createdAt: -1 });

export const GroupActivity = mongoose.model<IGroupActivity>('GroupActivity', GroupActivitySchema);
