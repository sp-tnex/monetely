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

router.route('/request')
  .post(requireGroupPermission('VIEW_GROUP'), asyncHandler(settlementController.requestSettlement.bind(settlementController)));

router.route('/:settlementId')
  .delete(requireGroupPermission('RECORD_SETTLEMENT'), asyncHandler(settlementController.deleteSettlement.bind(settlementController)));

router.route('/:settlementId/pay')
  .patch(requireGroupPermission('VIEW_GROUP'), asyncHandler(settlementController.markAsPaid.bind(settlementController)));

router.route('/:settlementId/confirm')
  .patch(requireGroupPermission('VIEW_GROUP'), asyncHandler(settlementController.confirmSettlement.bind(settlementController)));

router.route('/:settlementId/dispute')
  .patch(requireGroupPermission('VIEW_GROUP'), asyncHandler(settlementController.disputeSettlement.bind(settlementController)));

router.route('/:settlementId/resolve')
  .patch(requireGroupPermission('VIEW_GROUP'), asyncHandler(settlementController.resolveDispute.bind(settlementController)));

router.route('/collect')
  .post(requireGroupPermission('VIEW_GROUP'), asyncHandler(settlementController.initiateCollectionCycle.bind(settlementController)));

router.route('/broadcast')
  .post(requireGroupPermission('VIEW_GROUP'), asyncHandler(settlementController.broadcastOwnerReminders.bind(settlementController)));

export default router;
