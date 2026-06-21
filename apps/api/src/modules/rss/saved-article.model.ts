import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedArticle extends Document {
  userId: mongoose.Types.ObjectId;
  articleId: mongoose.Types.ObjectId;
  savedAt: Date;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SavedArticleSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    savedAt: { type: Date, default: Date.now },
    isFavorite: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SavedArticleSchema.index({ userId: 1, articleId: 1 }, { unique: true });

export const SavedArticle = mongoose.model<ISavedArticle>('SavedArticle', SavedArticleSchema);
