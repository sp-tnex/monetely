import { BaseRepository } from '../../core/repositories/BaseRepository';
import { FeedCategory, IFeedCategory } from './feed-category.model';

export class FeedCategoryRepository extends BaseRepository<IFeedCategory> {
  constructor() {
    super(FeedCategory);
  }

  async findSystemCategories(): Promise<IFeedCategory[]> {
    return this.model.find({ userId: null }).exec();
  }

  async findUserCategories(userId: string): Promise<IFeedCategory[]> {
    return this.model.find({ userId }).exec();
  }

  async findAvailableCategories(userId: string): Promise<IFeedCategory[]> {
    return this.model.find({
      $or: [{ userId: null }, { userId }],
    }).exec();
  }
}

export const feedCategoryRepository = new FeedCategoryRepository();
