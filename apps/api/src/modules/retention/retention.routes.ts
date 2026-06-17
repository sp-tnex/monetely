import { Router } from 'express';
import { requireAuth } from '../../core/middlewares/auth';
import { retentionController } from './retention.controller';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.route('/')
  .get(asyncHandler(retentionController.getSettings.bind(retentionController)))
  .patch(asyncHandler(retentionController.updateSettings.bind(retentionController)));

router.post('/archive', asyncHandler(retentionController.archiveData.bind(retentionController)));
router.post('/restore', asyncHandler(retentionController.restoreData.bind(retentionController)));
router.delete('/archive', asyncHandler(retentionController.deleteArchivedData.bind(retentionController)));

router.get('/export', asyncHandler(retentionController.exportData.bind(retentionController)));
router.get('/warnings', asyncHandler(retentionController.getWarnings.bind(retentionController)));
router.post('/warnings/:warningId/action', asyncHandler(retentionController.handleWarningAction.bind(retentionController)));

export default router;
