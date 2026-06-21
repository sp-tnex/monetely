import { BaseRepository } from '../../core/repositories/BaseRepository';
import { FeedCollection, IFeedCollection } from './feed-collection.model';

export class FeedCollectionRepository extends BaseRepository<IFeedCollection> {
  constructor() {
    super(FeedCollection);
  }

  async findByUserId(userId: string): Promise<IFeedCollection[]> {
    return this.model.find({ userId }).populate({
      path: 'feeds',
      populate: {
        path: 'categoryId'
      }
    }).exec();
  }
}

export const feedCollectionRepository = new FeedCollectionRepository();
