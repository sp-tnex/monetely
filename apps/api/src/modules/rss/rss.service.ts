import Parser from 'rss-parser';
import mongoose from 'mongoose';
import { feedRepository } from './feed.repository';
import { feedCategoryRepository } from './feed-category.repository';
import { feedCollectionRepository } from './feed-collection.repository';
import { articleRepository } from './article.repository';
import { Article } from './article.model';
import { savedArticleRepository } from './saved-article.repository';
import { readingHistoryRepository } from './reading-history.repository';
import { readabilityService } from './readability.service';
import { cacheService } from '../../core/services/cache.service';
import { AppError } from '../../core/errors/AppError';
import logger from '../../utils/logger';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
    ],
  },
});

export interface GetArticlesQuery {
  page?: number;
  limit?: number;
  search?: string;
  feedId?: string;
  categoryId?: string;
  collectionId?: string;
  read?: boolean;
  saved?: boolean;
  favorite?: boolean;
  archived?: boolean;
}

export class RssService {
  /**
   * Add a new RSS Feed Subscription
   */
  async subscribe(
    userId: string,
    url: string,
    categoryId: string,
    refreshInterval: '15m' | '1h' | '1d' = '1h',
    customTitle?: string
  ) {
    const category = await feedCategoryRepository.findById(categoryId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
    if (category.userId && category.userId.toString() !== userId) {
      throw new AppError('Unauthorized access to category', 403);
    }

    const existingFeed = await feedRepository.findOne({ userId: new mongoose.Types.ObjectId(userId), url });
    if (existingFeed) {
      throw new AppError('You are already subscribed to this feed URL', 400);
    }

    let parsedFeed;
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Monetely RSS Reader/1.0' },
      });
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const xml = await response.text();
      parsedFeed = await parser.parseString(xml);
    } catch (err: any) {
      logger.error(`Failed to parse RSS feed from ${url}:`, err);
      throw new AppError(`Invalid RSS feed URL: ${err.message || err}`, 400);
    }

    const feedTitle = customTitle || parsedFeed.title || 'Untitled Feed';
    const siteUrl = parsedFeed.link || '';
    const description = parsedFeed.description || '';
    const iconUrl = parsedFeed.image?.url || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;

    const feed = await feedRepository.create({
      url,
      title: feedTitle,
      description,
      siteUrl,
      iconUrl,
      categoryId: new mongoose.Types.ObjectId(categoryId) as any,
      userId: new mongoose.Types.ObjectId(userId) as any,
      refreshInterval,
      enabled: true,
      lastFetched: new Date(),
    });

    if (parsedFeed.items && parsedFeed.items.length > 0) {
      await this.saveParsedArticles(feed._id.toString(), parsedFeed.items, feedTitle);
    }

    await cacheService.invalidatePrefix(`rss:feeds:${userId}`);

    return feed;
  }

  /**
   * Edit Feed Subscription
   */
  async updateSubscription(userId: string, feedId: string, updateData: { title?: string; categoryId?: string; refreshInterval?: '15m' | '1h' | '1d'; enabled?: boolean }) {
    const feed = await feedRepository.findById(feedId);
    if (!feed || feed.userId.toString() !== userId) {
      throw new AppError('Feed subscription not found', 404);
    }

    if (updateData.categoryId) {
      const category = await feedCategoryRepository.findById(updateData.categoryId);
      if (!category) {
        throw new AppError('Category not found', 404);
      }
      if (category.userId && category.userId.toString() !== userId) {
        throw new AppError('Unauthorized category access', 403);
      }
    }

    const updated = await feedRepository.updateById(feedId, updateData);
    await cacheService.invalidatePrefix(`rss:feeds:${userId}`);
    return updated;
  }

  /**
   * Delete Feed Subscription
   */
  async deleteSubscription(userId: string, feedId: string) {
    const feed = await feedRepository.findById(feedId);
    if (!feed || feed.userId.toString() !== userId) {
      throw new AppError('Feed subscription not found', 404);
    }

    await articleRepository.deleteByFeedId(feedId);

    const collections = await feedCollectionRepository.findByUserId(userId);
    for (const coll of collections) {
      if (coll.feeds.some(f => f._id.toString() === feedId)) {
        const updatedFeeds = coll.feeds.filter(f => f._id.toString() !== feedId).map(f => f._id);
        await feedCollectionRepository.updateById(coll._id.toString(), { feeds: updatedFeeds });
      }
    }

    await feedRepository.deleteById(feedId);

    await cacheService.invalidatePrefix(`rss:feeds:${userId}`);
    await cacheService.invalidatePrefix(`rss:collections:${userId}`);
  }

  /**
   * Refresh a feed subscription manually
   */
  async refreshFeed(userId: string, feedId: string): Promise<number> {
    const feed = await feedRepository.findById(feedId);
    if (!feed || feed.userId.toString() !== userId) {
      throw new AppError('Feed subscription not found', 404);
    }

    const newArticles = await this.fetchAndSyncFeed(feed);
    return newArticles.length;
  }

  /**
   * Refresh and sync feed URL, caching and returning new articles
   */
  async fetchAndSyncFeed(feed: any): Promise<any[]> {
    const headers: Record<string, string> = {
      'User-Agent': 'Monetely RSS Reader/1.0',
    };

    if (feed.etag) {
      headers['If-None-Match'] = feed.etag;
    }
    if (feed.lastModified) {
      headers['If-Modified-Since'] = feed.lastModified;
    }

    try {
      const response = await fetch(feed.url, { headers });
      
      if (response.status === 304) {
        logger.info(`Feed unchanged (304 Not Modified): ${feed.url}`);
        await feedRepository.updateById(feed._id.toString(), { lastFetched: new Date() });
        return [];
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      const parsedFeed = await parser.parseString(xml);

      const etag = response.headers.get('etag') || undefined;
      const lastModified = response.headers.get('last-modified') || undefined;

      await feedRepository.updateById(feed._id.toString(), {
        lastFetched: new Date(),
        etag,
        lastModified,
        description: feed.description || parsedFeed.description || '',
      });

      if (parsedFeed.items && parsedFeed.items.length > 0) {
        return await this.saveParsedArticles(feed._id.toString(), parsedFeed.items, feed.title);
      }
    } catch (err: any) {
      logger.error(`Error fetching and syncing feed ${feed.url}:`, err);
    }
    return [];
  }

  /**
   * Helper to write feed items to Article collection, estimating reading time and extracting thumbnails
   */
  private async saveParsedArticles(feedId: string, items: any[], feedTitle: string): Promise<any[]> {
    const newArticles: any[] = [];

    for (const item of items) {
      try {
        const guid = item.guid || item.id || item.link;
        if (!guid) continue;

        const existing = await articleRepository.findOne({ feedId: new mongoose.Types.ObjectId(feedId), guid });
        if (existing) continue;

        const title = item.title || 'Untitled';
        const link = item.link || '';
        const author = item.creator || item.author || '';
        const description = item.contentSnippet || item.summary || '';
        const content = item.content || '';
        const pubDate = item.pubDate || item.isoDate ? new Date(item.pubDate || item.isoDate) : new Date();

        const wordCountText = (content + ' ' + description).replace(/<[^>]*>/g, '');
        const words = wordCountText.split(/\s+/).filter(w => w.length > 0).length;
        const readingTime = Math.max(1, Math.round(words / 200)); 

        let thumbnailUrl = undefined;
        if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image/')) {
          thumbnailUrl = item.enclosure.url;
        } else if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
          thumbnailUrl = item.mediaContent.$.url;
        } else {
          const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
          const match = imgRegex.exec(content || description);
          if (match) {
            thumbnailUrl = match[1];
          }
        }

        const article = await articleRepository.create({
          feedId: new mongoose.Types.ObjectId(feedId) as any,
          guid,
          title,
          link,
          author,
          source: feedTitle,
          pubDate,
          thumbnailUrl,
          description,
          content,
          readingTime,
        });

        newArticles.push(article);
      } catch (err: any) {
        logger.error(`Error saving feed item ${item.title}:`, err.message || err);
      }
    }

    return newArticles;
  }

  /**
   * Get filtered, paginated articles with user state flags (read, saved, favorite, archived)
   */
  async getArticles(userId: string, query: GetArticlesQuery) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 20));
    const skip = (page - 1) * limit;

    let targetFeedIds: string[] = [];

    if (query.feedId) {
      const feed = await feedRepository.findById(query.feedId);
      if (!feed || feed.userId.toString() !== userId) {
        throw new AppError('Feed not found', 404);
      }
      targetFeedIds = [feed._id.toString()];
    } else if (query.categoryId) {
      const feeds = await feedRepository.find({
        userId: new mongoose.Types.ObjectId(userId),
        categoryId: new mongoose.Types.ObjectId(query.categoryId),
      });
      targetFeedIds = feeds.map(f => f._id.toString());
    } else if (query.collectionId) {
      const coll = await feedCollectionRepository.findById(query.collectionId);
      if (!coll || coll.userId.toString() !== userId) {
        throw new AppError('Collection not found', 404);
      }
      targetFeedIds = coll.feeds.map(f => f.toString());
    } else {
      const feeds = await feedRepository.find({ userId: new mongoose.Types.ObjectId(userId) });
      targetFeedIds = feeds.map(f => f._id.toString());
    }
    if (targetFeedIds.length === 0) {
      return { articles: [], page, limit, total: 0 };
    }

    const articleFilter: any = { feedId: { $in: targetFeedIds.map(id => new mongoose.Types.ObjectId(id)) } };

    if (query.search) {
      articleFilter.$text = { $search: query.search };
    }

    if (query.read !== undefined) {
      const readHistories = await readingHistoryRepository.find({ userId: new mongoose.Types.ObjectId(userId) });
      const readArticleIds = readHistories.map(h => h.articleId.toString());

      if (query.read) {
        articleFilter._id = { $in: readArticleIds.map(id => new mongoose.Types.ObjectId(id)) };
      } else {
        articleFilter._id = { $nin: readArticleIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    if (query.saved !== undefined || query.favorite !== undefined || query.archived !== undefined) {
      const saveFilter: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (query.favorite !== undefined) saveFilter.isFavorite = query.favorite;
      if (query.archived !== undefined) saveFilter.isArchived = query.archived;

      const savedArticles = await savedArticleRepository.find(saveFilter);
      const savedArticleIds = savedArticles.map(s => s.articleId.toString());

      if (query.saved !== false) {
        if (articleFilter._id) {
          const currentIds = articleFilter._id.$in || [];
          const intersection = currentIds.filter((id: any) => savedArticleIds.includes(id.toString()));
          articleFilter._id = { $in: intersection };
        } else {
          articleFilter._id = { $in: savedArticleIds.map(id => new mongoose.Types.ObjectId(id)) };
        }
      }
    }

    const total = await articleRepository.count(articleFilter);
    let articles: any[] = [];
    
    if (query.search) {
      articles = await Article.find(articleFilter)
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .populate('feedId')
        .exec();
    } else {
      articles = await Article.find(articleFilter)
        .sort({ pubDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('feedId')
        .exec();
    }

    const articleIds = articles.map(a => a._id);
    const [readStates, bookmarkStates] = await Promise.all([
      readingHistoryRepository.find({ userId: new mongoose.Types.ObjectId(userId), articleId: { $in: articleIds } }),
      savedArticleRepository.find({ userId: new mongoose.Types.ObjectId(userId), articleId: { $in: articleIds } }),
    ]);

    const readMap = new Map(readStates.map(r => [r.articleId.toString(), true]));
    const bookmarkMap = new Map(bookmarkStates.map(b => [b.articleId.toString(), b]));

    const decoratedArticles = articles.map(art => {
      const artObj = art.toObject();
      const savedInfo = bookmarkMap.get(art._id.toString());
      return {
        ...artObj,
        read: readMap.has(art._id.toString()),
        saved: !!savedInfo,
        isFavorite: savedInfo?.isFavorite || false,
        isArchived: savedInfo?.isArchived || false,
      };
    });

    return {
      articles: decoratedArticles,
      page,
      limit,
      total,
    };
  }

  /**
   * Get single article details (including cached snapshot)
   */
  async getArticleDetails(userId: string, articleId: string) {
    const article = await articleRepository.findById(articleId);
    if (!article) {
      throw new AppError('Article not found', 404);
    }

    const feed = await feedRepository.findById(article.feedId.toString());
    if (!feed || feed.userId.toString() !== userId) {
      throw new AppError('Unauthorized access to article', 403);
    }

    let fullContent = article.content;
    try {
      fullContent = await readabilityService.fetchAndExtract(articleId);
    } catch (err: any) {
      logger.error(`Error in getArticleDetails fetchAndExtract: ${err.message || err}`);
    }

    const [readState, savedState] = await Promise.all([
      readingHistoryRepository.findByUserAndArticle(userId, articleId),
      savedArticleRepository.findOneSaved(userId, articleId),
    ]);

    return {
      ...article.toObject(),
      content: fullContent,
      read: !!readState,
      saved: !!savedState,
      isFavorite: savedState?.isFavorite || false,
      isArchived: savedState?.isArchived || false,
    };
  }
}

export const rssService = new RssService();
