import mongoose from 'mongoose';
import { BaseRepository } from '../../core/repositories/BaseRepository';
import { Feed, IFeed } from './feed.model';

export class FeedRepository extends BaseRepository<IFeed> {
  constructor() {
    super(Feed);
  }

  async findByUserId(userId: string): Promise<IFeed[]> {
    return this.model.find({ userId }).populate('categoryId').exec();
  }

  async findEnabledForInterval(interval: '15m' | '1h' | '1d'): Promise<IFeed[]> {
    return this.model.find({ enabled: true, refreshInterval: interval }).exec();
  }

  async findEnabledFeeds(): Promise<IFeed[]> {
    return this.model.find({ enabled: true }).exec();
  }

  async updateManyCategoryId(userId: string, oldCategoryId: string, newCategoryId: string): Promise<void> {
    await this.model.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), categoryId: new mongoose.Types.ObjectId(oldCategoryId) },
      { categoryId: new mongoose.Types.ObjectId(newCategoryId) }
    ).exec();
  }
}

export const feedRepository = new FeedRepository();
