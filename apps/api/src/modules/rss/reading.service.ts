import mongoose from 'mongoose';
import { readingHistoryRepository } from './reading-history.repository';
import { savedArticleRepository } from './saved-article.repository';
import { articleRepository } from './article.repository';
import { feedRepository } from './feed.repository';
import { AppError } from '../../core/errors/AppError';
import logger from '../../utils/logger';

export class ReadingService {
  /**
   * Mark article as Read, recording reading duration
   */
  async markAsRead(userId: string, articleId: string, readingTime = 0) {
    const article = await articleRepository.findById(articleId);
    if (!article) {
      throw new AppError('Article not found', 404);
    }

    const existing = await readingHistoryRepository.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      articleId: new mongoose.Types.ObjectId(articleId),
    });

    if (existing) {
      await readingHistoryRepository.updateById(existing._id.toString(), {
        readingTime: existing.readingTime + readingTime,
        readAt: new Date(),
      });
      return existing;
    }

    const newHistory = await readingHistoryRepository.create({
      userId: new mongoose.Types.ObjectId(userId) as any,
      articleId: new mongoose.Types.ObjectId(articleId) as any,
      readAt: new Date(),
      readingTime,
      completed: true,
    });

    return newHistory;
  }

  /**
   * Mark article as Unread
   */
  async markAsUnread(userId: string, articleId: string) {
    const record = await readingHistoryRepository.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      articleId: new mongoose.Types.ObjectId(articleId),
    });

    if (record) {
      await readingHistoryRepository.deleteById(record._id.toString());
    }
  }

  /**
   * Bookmark/Save article for later
   */
  async saveForLater(userId: string, articleId: string, options: { isFavorite?: boolean; isArchived?: boolean } = {}) {
    const article = await articleRepository.findById(articleId);
    if (!article) {
      throw new AppError('Article not found', 404);
    }

    const existing = await savedArticleRepository.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      articleId: new mongoose.Types.ObjectId(articleId),
    });

    if (existing) {
      const updates: any = {};
      if (options.isFavorite !== undefined) updates.isFavorite = options.isFavorite;
      if (options.isArchived !== undefined) updates.isArchived = options.isArchived;

      return await savedArticleRepository.updateById(existing._id.toString(), updates);
    }

    return await savedArticleRepository.create({
      userId: new mongoose.Types.ObjectId(userId) as any,
      articleId: new mongoose.Types.ObjectId(articleId) as any,
      savedAt: new Date(),
      isFavorite: options.isFavorite || false,
      isArchived: options.isArchived || false,
    });
  }

  /**
   * Unsave / Remove article bookmark
   */
  async unsave(userId: string, articleId: string) {
    const record = await savedArticleRepository.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      articleId: new mongoose.Types.ObjectId(articleId),
    });

    if (record) {
      await savedArticleRepository.deleteById(record._id.toString());
    }
  }

  /**
   * Toggle favorite state
   */
  async toggleFavorite(userId: string, articleId: string, isFavorite: boolean) {
    return this.saveForLater(userId, articleId, { isFavorite });
  }

  /**
   * Toggle archive state
   */
  async toggleArchive(userId: string, articleId: string, isArchived: boolean) {
    return this.saveForLater(userId, articleId, { isArchived });
  }

  /**
   * Get metadata for sharing an article
   */
  async getShareDetails(userId: string, articleId: string) {
    const article = await articleRepository.findById(articleId);
    if (!article) {
      throw new AppError('Article not found', 404);
    }

    return {
      title: article.title,
      link: article.link,
      source: article.source,
      description: article.description,
      shareMessage: `Check out this article: "${article.title}" from ${article.source || 'RSS Reader'} - ${article.link}`,
    };
  }

  /**
   * Compile user reading analytics and statistics
   */
  async getReadingAnalytics(userId: string) {
    // 1. Fetch reading logs populated with article details
    const history = await readingHistoryRepository.findHistoryForAnalytics(userId);

    const totalRead = history.length;
    let totalReadingTimeSeconds = 0;
    const sourceCount: Record<string, { count: number; iconUrl?: string }> = {};

    for (const record of history) {
      totalReadingTimeSeconds += record.readingTime;

      const article: any = record.articleId;
      if (article) {
        const sourceName = article.source || 'Unknown Source';
        if (!sourceCount[sourceName]) {
          sourceCount[sourceName] = { count: 0 };
        }
        sourceCount[sourceName].count += 1;
      }
    }

    const userFeeds = await feedRepository.findByUserId(userId);
    for (const feed of userFeeds) {
      if (sourceCount[feed.title]) {
        sourceCount[feed.title].iconUrl = feed.iconUrl;
      }
    }

    const favoriteSources = Object.entries(sourceCount)
      .map(([name, data]) => ({
        sourceName: name,
        count: data.count,
        iconUrl: data.iconUrl,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    let streak = 0;
    if (totalRead > 0) {
      const dates = history.map(h => h.readAt.toISOString().split('T')[0]);
      const uniqueDates = Array.from(new Set(dates));

      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
        streak = 1;
        let currentIdx = 0;

        while (currentIdx < uniqueDates.length - 1) {
          const current = new Date(uniqueDates[currentIdx]);
          const next = new Date(uniqueDates[currentIdx + 1]);
          
          const diffTime = Math.abs(current.getTime() - next.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            streak++;
            currentIdx++;
          } else if (diffDays === 0) {
            currentIdx++;
          } else {
            break;
          }
        }
      }
    }

    return {
      articlesRead: totalRead,
      totalReadingTimeMinutes: Math.round(totalReadingTimeSeconds / 60),
      favoriteSources,
      readingStreak: streak,
    };
  }
}

export const readingService = new ReadingService();
