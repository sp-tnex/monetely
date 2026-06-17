import { Router } from 'express';
import { settlementController } from './settlement.controller';
import { requireAuth } from '../../core/middlewares/auth';
import { requireGroupPermission } from '../../core/middlewares/rbac';
import { validate } from '../../core/middlewares/validate';
import { recordSettlementSchema } from '@monetely/shared';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.route('/')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(settlementController.getSettlements.bind(settlementController)))
  .post(requireGroupPermission('RECORD_SETTLEMENT'), validate(recordSettlementSchema), asyncHandler(settlementController.recordSettlement.bind(settlementController)));

router.route('/history')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(settlementController.getSettlementsHistory.bind(settlementController)));

export default router;
