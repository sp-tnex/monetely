import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedCategory extends Document {
  name: string;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FeedCategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

FeedCategorySchema.index({ name: 1, userId: 1 }, { unique: true });

export const FeedCategory = mongoose.model<IFeedCategory>('FeedCategory', FeedCategorySchema);
