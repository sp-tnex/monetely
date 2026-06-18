import { Router } from 'express';
import { requireAuth } from '../../core/middlewares/auth';
import { requireGroupPermission } from '../../core/middlewares/rbac';
import { exportController } from './export.controller';

const router = Router();

router.use(requireAuth);

router.get('/user', exportController.exportUserReport);
router.get('/group/:groupId', requireGroupPermission('VIEW_GROUP'), exportController.exportGroupReport);

export default router;
