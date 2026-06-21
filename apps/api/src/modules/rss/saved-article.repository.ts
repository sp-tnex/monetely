import { BaseRepository } from '../../core/repositories/BaseRepository';
import { SavedArticle, ISavedArticle } from './saved-article.model';

export class SavedArticleRepository extends BaseRepository<ISavedArticle> {
  constructor() {
    super(SavedArticle);
  }

  async findByUser(userId: string, skip = 0, limit = 20, filters: { isFavorite?: boolean; isArchived?: boolean } = {}): Promise<ISavedArticle[]> {
    const query: any = { userId };
    if (filters.isFavorite !== undefined) query.isFavorite = filters.isFavorite;
    if (filters.isArchived !== undefined) query.isArchived = filters.isArchived;

    return this.model
      .find(query)
      .populate('articleId')
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findOneSaved(userId: string, articleId: string): Promise<ISavedArticle | null> {
    return this.findOne({ userId, articleId });
  }
}

export const savedArticleRepository = new SavedArticleRepository();
