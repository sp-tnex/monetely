import mongoose, { Schema, Document } from 'mongoose';

export interface IFeed extends Document {
  url: string;
  title: string;
  description?: string;
  siteUrl?: string;
  iconUrl?: string;
  categoryId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  enabled: boolean;
  refreshInterval: '15m' | '1h' | '1d';
  lastFetched?: Date;
  etag?: string;
  lastModified?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedSchema: Schema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    siteUrl: { type: String },
    iconUrl: { type: String },
    categoryId: { type: Schema.Types.ObjectId, ref: 'FeedCategory', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    enabled: { type: Boolean, default: true },
    refreshInterval: { type: String, enum: ['15m', '1h', '1d'], default: '1h' },
    lastFetched: { type: Date },
    etag: { type: String },
    lastModified: { type: String },
  },
  { timestamps: true }
);

FeedSchema.index({ userId: 1, url: 1 }, { unique: true });
FeedSchema.index({ enabled: 1, lastFetched: 1, refreshInterval: 1 });

export const Feed = mongoose.model<IFeed>('Feed', FeedSchema);
