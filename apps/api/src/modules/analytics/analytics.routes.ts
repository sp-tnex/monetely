import { Router } from 'express';
import { requireAuth } from '../../core/middlewares/auth';
import { requireGroupPermission } from '../../core/middlewares/rbac';
import { analyticsController } from './analytics.controller';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// Analytics routes
router.get('/summary', requireGroupPermission('VIEW_GROUP'), asyncHandler(analyticsController.getMonthlySummary.bind(analyticsController)));
router.get('/user', requireGroupPermission('VIEW_GROUP'), asyncHandler(analyticsController.getUserAnalytics.bind(analyticsController)));
router.get('/group', requireGroupPermission('VIEW_GROUP'), asyncHandler(analyticsController.getGroupAnalytics.bind(analyticsController)));
router.get('/categories', requireGroupPermission('VIEW_GROUP'), asyncHandler(analyticsController.getCategoryAnalytics.bind(analyticsController)));
router.get('/trends', requireGroupPermission('VIEW_GROUP'), asyncHandler(analyticsController.getTrendData.bind(analyticsController)));
router.get('/financial-year', requireGroupPermission('VIEW_GROUP'), asyncHandler(analyticsController.getFinancialYearAnalytics.bind(analyticsController)));

// Month Closing routes
router.get('/closing/statuses', requireGroupPermission('VIEW_GROUP'), asyncHandler(analyticsController.getClosingStatuses.bind(analyticsController)));
router.get('/closing/snapshot', requireGroupPermission('VIEW_GROUP'), asyncHandler(analyticsController.getSnapshot.bind(analyticsController)));
router.post('/closing/close', requireGroupPermission('MANAGE_SETTINGS'), asyncHandler(analyticsController.closeMonth.bind(analyticsController)));
router.post('/closing/reopen', requireGroupPermission('MANAGE_SETTINGS'), asyncHandler(analyticsController.reopenMonth.bind(analyticsController)));
router.post('/closing/lock', requireGroupPermission('MANAGE_SETTINGS'), asyncHandler(analyticsController.lockMonth.bind(analyticsController)));

export default router;
