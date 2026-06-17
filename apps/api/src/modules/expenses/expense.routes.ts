import { Router } from 'express';
import { expenseController } from './expense.controller';
import { requireAuth } from '../../core/middlewares/auth';
import { requireGroupPermission } from '../../core/middlewares/rbac';
import { validate } from '../../core/middlewares/validate';
import { createExpenseSchema, updateExpenseSchema } from '@monetely/shared';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.route('/')
  .post(requireGroupPermission('RECORD_EXPENSE'), validate(createExpenseSchema), asyncHandler(expenseController.addExpense.bind(expenseController)))
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(expenseController.getGroupExpenses.bind(expenseController)));

router.route('/:id')
  .get(requireGroupPermission('VIEW_GROUP'), asyncHandler(expenseController.getExpenseDetails.bind(expenseController)))
  .put(requireGroupPermission('RECORD_EXPENSE'), validate(updateExpenseSchema), asyncHandler(expenseController.updateExpense.bind(expenseController)))
  .delete(requireGroupPermission('RECORD_EXPENSE'), asyncHandler(expenseController.deleteExpense.bind(expenseController)));

export default router;
