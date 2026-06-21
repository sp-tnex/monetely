import { BaseRepository } from '../../core/repositories/BaseRepository';
import { Article, IArticle } from './article.model';

export class ArticleRepository extends BaseRepository<IArticle> {
  constructor() {
    super(Article);
  }

  async findByFeedId(feedId: string, skip = 0, limit = 20): Promise<IArticle[]> {
    return this.model
      .find({ feedId })
      .sort({ pubDate: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findByFeedIds(feedIds: string[], skip = 0, limit = 20): Promise<IArticle[]> {
    return this.model
      .find({ feedId: { $in: feedIds } })
      .sort({ pubDate: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async deleteByFeedId(feedId: string): Promise<void> {
    await this.model.deleteMany({ feedId }).exec();
  }
}

export const articleRepository = new ArticleRepository();
