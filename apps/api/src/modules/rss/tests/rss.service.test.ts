import { rssService } from '../rss.service';
import { readingService } from '../reading.service';
import { feedRepository } from '../feed.repository';
import { feedCategoryRepository } from '../feed-category.repository';
import { readingHistoryRepository } from '../reading-history.repository';
import { articleRepository } from '../article.repository';
import mongoose from 'mongoose';

jest.mock('../feed.repository', () => ({
  feedRepository: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
    findByUserId: jest.fn(),
  },
}));

jest.mock('../article.repository', () => ({
  articleRepository: {
    findById: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../feed-category.repository', () => ({
  feedCategoryRepository: {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));


jest.mock('../reading-history.repository', () => ({
  readingHistoryRepository: {
    findOne: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    findHistoryForAnalytics: jest.fn(),
  },
}));

describe('RSS and Reading Services', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const categoryId = new mongoose.Types.ObjectId().toString();
  const articleId = new mongoose.Types.ObjectId().toString();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RssService - subscribe', () => {
    it('should throw an error if category does not exist', async () => {
      (feedCategoryRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        rssService.subscribe(userId, 'https://example.com/rss', categoryId)
      ).rejects.toThrow('Category not found');
    });

    it('should throw an error if user already subscribed to this feed', async () => {
      (feedCategoryRepository.findById as jest.Mock).mockResolvedValue({ _id: categoryId });
      (feedRepository.findOne as jest.Mock).mockResolvedValue({ _id: 'feed123' });

      await expect(
        rssService.subscribe(userId, 'https://example.com/rss', categoryId)
      ).rejects.toThrow('You are already subscribed to this feed URL');
    });
  });

  describe('ReadingService - markAsRead', () => {
    it('should create new history log if not read before', async () => {
      (articleRepository.findById as jest.Mock).mockResolvedValue({ _id: articleId });
      (readingHistoryRepository.findOne as jest.Mock).mockResolvedValue(null);
      (readingHistoryRepository.create as jest.Mock).mockResolvedValue({ _id: 'history123' });

      const res = await readingService.markAsRead(userId, articleId, 45);
      
      expect(readingHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(Object),
          articleId: expect.any(Object),
          readingTime: 45,
          completed: true,
        })
      );
      expect(res).toBeDefined();
    });

    it('should update existing reading history log if read before', async () => {
      (articleRepository.findById as jest.Mock).mockResolvedValue({ _id: articleId });
      const mockHistory = { _id: 'history123', readingTime: 10 };
      (readingHistoryRepository.findOne as jest.Mock).mockResolvedValue(mockHistory);
      (readingHistoryRepository.updateById as jest.Mock).mockResolvedValue({ ...mockHistory, readingTime: 30 });

      await readingService.markAsRead(userId, articleId, 20);


      expect(readingHistoryRepository.updateById).toHaveBeenCalledWith(
        'history123',
        expect.objectContaining({
          readingTime: 30,
        })
      );
    });
  });

  describe('ReadingService - getReadingAnalytics', () => {
    it('should calculate reading stats and active streak successfully', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockHistory = [
        {
          readAt: today,
          readingTime: 60,
          articleId: { source: 'TechCrunch', readingTime: 2 },
        },
        {
          readAt: yesterday,
          readingTime: 120,
          articleId: { source: 'HackerNews', readingTime: 3 },
        },
      ];

      (readingHistoryRepository.findHistoryForAnalytics as jest.Mock).mockResolvedValue(mockHistory);
      (feedRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      const stats = await readingService.getReadingAnalytics(userId);

      expect(stats.articlesRead).toBe(2);
      expect(stats.totalReadingTimeMinutes).toBe(3); // 180 seconds = 3 minutes
      expect(stats.readingStreak).toBe(2); // today and yesterday
      expect(stats.favoriteSources).toContainEqual(
        expect.objectContaining({ sourceName: 'TechCrunch', count: 1 })
      );
    });
  });
});
