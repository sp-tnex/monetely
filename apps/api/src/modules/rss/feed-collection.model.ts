import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedCollection extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  feeds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const FeedCollectionSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    feeds: [{ type: Schema.Types.ObjectId, ref: 'Feed' }],
  },
  { timestamps: true }
);

FeedCollectionSchema.index({ name: 1, userId: 1 }, { unique: true });

export const FeedCollection = mongoose.model<IFeedCollection>('FeedCollection', FeedCollectionSchema);
