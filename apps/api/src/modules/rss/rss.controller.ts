import { Request, Response } from 'express';
import { rssService } from './rss.service';
import { readingService } from './reading.service';
import { feedCategoryRepository } from './feed-category.repository';
import { feedCollectionRepository } from './feed-collection.repository';
import { feedRepository } from './feed.repository';
import { AppError } from '../../core/errors/AppError';
import mongoose from 'mongoose';

export class RssController {
  async addFeed(req: Request, res: Response) {
    const userId = req.user.id as string;
    const { url, categoryId, refreshInterval, title } = req.body;

    const feed = await rssService.subscribe(userId, url, categoryId, refreshInterval, title);
    res.status(201).json({
      status: 'success',
      data: { feed },
    });
  }

  async getFeeds(req: Request, res: Response) {
    const userId = req.user.id as string;
    const feeds = await feedRepository.findByUserId(userId);
    res.status(200).json({
      status: 'success',
      data: { feeds },
    });
  }

  async updateFeed(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    const updated = await rssService.updateSubscription(userId, id, req.body);
    res.status(200).json({
      status: 'success',
      data: { feed: updated },
    });
  }

  async deleteFeed(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    await rssService.deleteSubscription(userId, id);
    res.status(200).json({
      status: 'success',
      message: 'Feed unsubscribed successfully',
    });
  }

  async refreshFeed(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    const newArticlesCount = await rssService.refreshFeed(userId, id);
    res.status(200).json({
      status: 'success',
      message: `Feed refreshed. Added ${newArticlesCount} new articles.`,
      data: { newArticlesCount },
    });
  }

  async getCategories(req: Request, res: Response) {
    const userId = req.user.id as string;
    
    let defaults = await feedCategoryRepository.findSystemCategories();
    if (defaults.length === 0) {
      const defaultNames = ['Technology', 'Programming', 'AI', 'Business', 'Finance', 'News', 'Sports', 'Entertainment'];
      await Promise.all(defaultNames.map(name => feedCategoryRepository.create({ name })));
    }

    const categories = await feedCategoryRepository.findAvailableCategories(userId);
    res.status(200).json({
      status: 'success',
      data: { categories },
    });
  }

  async createCategory(req: Request, res: Response) {
    const userId = req.user.id as string;
    const { name } = req.body;

    const existing = await feedCategoryRepository.findOne({
      name,
      $or: [{ userId: null }, { userId: new mongoose.Types.ObjectId(userId) }],
    });
    if (existing) {
      throw new AppError('Category with this name already exists', 400);
    }

    const category = await feedCategoryRepository.create({
      name,
      userId: new mongoose.Types.ObjectId(userId) as any,
    });

    res.status(201).json({
      status: 'success',
      data: { category },
    });
  }

  async deleteCategory(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    const category = await feedCategoryRepository.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
    if (!category.userId || category.userId.toString() !== userId) {
      throw new AppError('Cannot delete system default categories', 403);
    }

    let generalCat = await feedCategoryRepository.findOne({ name: 'Technology', userId: null });
    if (!generalCat) {
      generalCat = await feedCategoryRepository.create({ name: 'Technology' });
    }

    await feedRepository.updateManyCategoryId(
      userId,
      category._id.toString(),
      generalCat._id.toString()
    );

    await feedCategoryRepository.deleteById(id);

    res.status(200).json({
      status: 'success',
      message: 'Custom category deleted and feeds reassigned successfully',
    });
  }

  async getCollections(req: Request, res: Response) {
    const userId = req.user.id as string;
    const collections = await feedCollectionRepository.findByUserId(userId);
    res.status(200).json({
      status: 'success',
      data: { collections },
    });
  }

  async createCollection(req: Request, res: Response) {
    const userId = req.user.id as string;
    const { name, feedIds } = req.body;

    const existing = await feedCollectionRepository.findOne({ name, userId: new mongoose.Types.ObjectId(userId) });
    if (existing) {
      throw new AppError('Collection already exists with this name', 400);
    }

    const userFeeds = await feedRepository.find({ userId: new mongoose.Types.ObjectId(userId) });
    const userFeedIds = userFeeds.map(f => f._id.toString());
    const validFeedIds = (feedIds || []).filter((id: string) => userFeedIds.includes(id));

    const collection = await feedCollectionRepository.create({
      name,
      userId: new mongoose.Types.ObjectId(userId) as any,
      feeds: validFeedIds.map((id: string) => new mongoose.Types.ObjectId(id)),
    });

    res.status(201).json({
      status: 'success',
      data: { collection },
    });
  }

  async updateCollection(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;
    const { name, feedIds } = req.body;

    const collection = await feedCollectionRepository.findById(id);
    if (!collection || collection.userId.toString() !== userId) {
      throw new AppError('Collection not found', 404);
    }

    const userFeeds = await feedRepository.find({ userId: new mongoose.Types.ObjectId(userId) });
    const userFeedIds = userFeeds.map(f => f._id.toString());
    const validFeedIds = (feedIds || []).filter((fid: string) => userFeedIds.includes(fid));

    const updated = await feedCollectionRepository.updateById(id, {
      name,
      feeds: validFeedIds.map((fid: string) => new mongoose.Types.ObjectId(fid)),
    });

    res.status(200).json({
      status: 'success',
      data: { collection: updated },
    });
  }

  async deleteCollection(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    const collection = await feedCollectionRepository.findById(id);
    if (!collection || collection.userId.toString() !== userId) {
      throw new AppError('Collection not found', 404);
    }

    await feedCollectionRepository.deleteById(id);
    res.status(200).json({
      status: 'success',
      message: 'Collection deleted successfully',
    });
  }

  async getArticles(req: Request, res: Response) {
    const userId = req.user.id as string;
    const { page, limit, search, feedId, categoryId, collectionId, read, saved, favorite, archived } = req.query;

    const parseBool = (val: any) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    };

    const result = await rssService.getArticles(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      feedId: feedId as string,
      categoryId: categoryId as string,
      collectionId: collectionId as string,
      read: parseBool(read),
      saved: parseBool(saved),
      favorite: parseBool(favorite),
      archived: parseBool(archived),
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }

  async getArticleDetails(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    const article = await rssService.getArticleDetails(userId, id);
    res.status(200).json({
      status: 'success',
      data: { article },
    });
  }

  async markAsRead(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;
    const { readingTime } = req.body; // in seconds

    await readingService.markAsRead(userId, id, readingTime || 0);
    res.status(200).json({
      status: 'success',
      message: 'Article marked as read',
    });
  }

  async markAsUnread(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    await readingService.markAsUnread(userId, id);
    res.status(200).json({
      status: 'success',
      message: 'Article marked as unread',
    });
  }

  async saveArticle(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    await readingService.saveForLater(userId, id);
    res.status(200).json({
      status: 'success',
      message: 'Article saved for later',
    });
  }

  async unsaveArticle(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    await readingService.unsave(userId, id);
    res.status(200).json({
      status: 'success',
      message: 'Article unsaved',
    });
  }

  async toggleFavorite(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;
    const { favorite } = req.body; // boolean

    await readingService.toggleFavorite(userId, id, !!favorite);
    res.status(200).json({
      status: 'success',
      message: favorite ? 'Article added to favorites' : 'Article removed from favorites',
    });
  }

  async toggleArchive(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;
    const { archived } = req.body; // boolean

    await readingService.toggleArchive(userId, id, !!archived);
    res.status(200).json({
      status: 'success',
      message: archived ? 'Article archived' : 'Article unarchived',
    });
  }

  async shareArticle(req: Request, res: Response) {
    const userId = req.user.id as string;
    const id = req.params.id as string;

    const shareDetails = await readingService.getShareDetails(userId, id);
    res.status(200).json({
      status: 'success',
      data: { shareDetails },
    });
  }

  async getReadingAnalytics(req: Request, res: Response) {
    const userId = req.user.id as string;
    const analytics = await readingService.getReadingAnalytics(userId);
    res.status(200).json({
      status: 'success',
      data: { analytics },
    });
  }
}

export const rssController = new RssController();
