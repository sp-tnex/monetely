import { Router } from 'express';
import { rssController } from './rss.controller';
import { requireAuth } from '../../core/middlewares/auth';
import { validate } from '../../core/middlewares/validate';
import {
  addFeedSchema,
  updateFeedSchema,
  createCategorySchema,
  createCollectionSchema,
  updateCollectionSchema,
} from '@monetely/shared';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.post('/feeds', validate(addFeedSchema), asyncHandler(rssController.addFeed.bind(rssController)));
router.get('/feeds', asyncHandler(rssController.getFeeds.bind(rssController)));
router.patch('/feeds/:id', validate(updateFeedSchema), asyncHandler(rssController.updateFeed.bind(rssController)));
router.delete('/feeds/:id', asyncHandler(rssController.deleteFeed.bind(rssController)));
router.post('/feeds/:id/refresh', asyncHandler(rssController.refreshFeed.bind(rssController)));

router.get('/categories', asyncHandler(rssController.getCategories.bind(rssController)));
router.post('/categories', validate(createCategorySchema), asyncHandler(rssController.createCategory.bind(rssController)));
router.delete('/categories/:id', asyncHandler(rssController.deleteCategory.bind(rssController)));

router.get('/collections', asyncHandler(rssController.getCollections.bind(rssController)));
router.post('/collections', validate(createCollectionSchema), asyncHandler(rssController.createCollection.bind(rssController)));
router.put('/collections/:id', validate(updateCollectionSchema), asyncHandler(rssController.updateCollection.bind(rssController)));
router.delete('/collections/:id', asyncHandler(rssController.deleteCollection.bind(rssController)));

router.get('/articles', asyncHandler(rssController.getArticles.bind(rssController)));
router.get('/articles/:id', asyncHandler(rssController.getArticleDetails.bind(rssController)));

router.post('/articles/:id/read', asyncHandler(rssController.markAsRead.bind(rssController)));
router.post('/articles/:id/unread', asyncHandler(rssController.markAsUnread.bind(rssController)));
router.post('/articles/:id/save', asyncHandler(rssController.saveArticle.bind(rssController)));
router.post('/articles/:id/unsave', asyncHandler(rssController.unsaveArticle.bind(rssController)));
router.post('/articles/:id/favorite', asyncHandler(rssController.toggleFavorite.bind(rssController)));
router.post('/articles/:id/archive', asyncHandler(rssController.toggleArchive.bind(rssController)));
router.get('/articles/:id/share', asyncHandler(rssController.shareArticle.bind(rssController)));

router.get('/analytics', asyncHandler(rssController.getReadingAnalytics.bind(rssController)));

export default router;
