import mongoose, { Schema, Document } from 'mongoose';

export interface IDeletionWarning extends Document {
  user: mongoose.Types.ObjectId;
  scheduledDeletionDate: Date;
  targetMonth: number;
  targetYear: number;
  expenseCount: number;
  status: 'PENDING' | 'APPROVED' | 'CANCELLED' | 'EXTENDED';
  extendedUntil?: Date;
  notifiedAt: Date;
}

const DeletionWarningSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledDeletionDate: { type: Date, required: true },
  targetMonth: { type: Number, required: true, min: 1, max: 12 },
  targetYear: { type: Number, required: true },
  expenseCount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'CANCELLED', 'EXTENDED'],
    default: 'PENDING'
  },
  extendedUntil: { type: Date },
  notifiedAt: { type: Date, default: Date.now },
}, { timestamps: true });

DeletionWarningSchema.index({ user: 1, status: 1 });
DeletionWarningSchema.index({ scheduledDeletionDate: 1 });

export const DeletionWarning = mongoose.model<IDeletionWarning>('DeletionWarning', DeletionWarningSchema);
