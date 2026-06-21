import mongoose, { Schema, Document } from 'mongoose';

export interface IReadingHistory extends Document {
  userId: mongoose.Types.ObjectId;
  articleId: mongoose.Types.ObjectId;
  readAt: Date;
  readingTime: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReadingHistorySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    readAt: { type: Date, default: Date.now },
    readingTime: { type: Number, default: 0 },
    completed: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ReadingHistorySchema.index({ userId: 1, articleId: 1 }, { unique: true });
ReadingHistorySchema.index({ userId: 1, readAt: -1 });

export const ReadingHistory = mongoose.model<IReadingHistory>('ReadingHistory', ReadingHistorySchema);
