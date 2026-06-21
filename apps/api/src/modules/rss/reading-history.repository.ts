import { BaseRepository } from '../../core/repositories/BaseRepository';
import { ReadingHistory, IReadingHistory } from './reading-history.model';

export class ReadingHistoryRepository extends BaseRepository<IReadingHistory> {
  constructor() {
    super(ReadingHistory);
  }

  async findByUser(userId: string, skip = 0, limit = 20): Promise<IReadingHistory[]> {
    return this.model
      .find({ userId })
      .populate('articleId')
      .sort({ readAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findByUserAndArticle(userId: string, articleId: string): Promise<IReadingHistory | null> {
    return this.findOne({ userId, articleId });
  }

  async findHistoryForAnalytics(userId: string): Promise<IReadingHistory[]> {
    return this.model
      .find({ userId })
      .populate({
        path: 'articleId',
        select: 'source readingTime feedId'
      })
      .sort({ readAt: -1 })
      .exec();
  }
}

export const readingHistoryRepository = new ReadingHistoryRepository();
