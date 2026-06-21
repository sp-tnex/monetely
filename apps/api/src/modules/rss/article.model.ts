import mongoose, { Schema, Document } from 'mongoose';

export interface IArticle extends Document {
  feedId: mongoose.Types.ObjectId;
  guid: string;
  title: string;
  author?: string;
  source?: string;
  pubDate: Date;
  thumbnailUrl?: string;
  description?: string;
  content?: string;
  readingTime: number;
  link: string;
  createdAt: Date;
  updatedAt: Date;
}

const ArticleSchema: Schema = new Schema(
  {
    feedId: { type: Schema.Types.ObjectId, ref: 'Feed', required: true },
    guid: { type: String, required: true },
    title: { type: String, required: true },
    author: { type: String },
    source: { type: String },
    pubDate: { type: Date, required: true },
    thumbnailUrl: { type: String },
    description: { type: String },
    content: { type: String },
    readingTime: { type: Number, required: true },
    link: { type: String, required: true },
  },
  { timestamps: true }
);

ArticleSchema.index({ feedId: 1, guid: 1 }, { unique: true });
ArticleSchema.index({ pubDate: -1 });

ArticleSchema.index(
  {
    title: 'text',
    description: 'text',
    content: 'text',
    author: 'text',
    source: 'text',
  },
  {
    weights: {
      title: 10,
      source: 5,
      description: 3,
      author: 2,
      content: 1,
    },
    name: 'ArticleSearchIndex',
  }
);

export const Article = mongoose.model<IArticle>('Article', ArticleSchema);
