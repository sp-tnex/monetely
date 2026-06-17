import { z } from 'zod';

export const createExpenseSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    description: z.string().min(1).max(255),
    category: z.string().default('general'),
    date: z.string().datetime().optional(),
    notes: z.string().optional(),
    paidBy: z.string(),
    splits: z.array(z.object({
      userId: z.string(),
      amountOwed: z.number().nonnegative(),
      percentage: z.number().min(0).max(100).optional(),
    })).min(1)
  }).refine((data) => {
    const totalSplit = data.splits.reduce((acc, split) => acc + split.amountOwed, 0);
    return Math.abs(totalSplit - data.amount) < 0.01;
  }, { message: "Splits must sum up to the total amount", path: ["splits"] })
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];

export const updateExpenseSchema = z.object({
  body: z.object({
    amount: z.number().positive().optional(),
    description: z.string().min(1).max(255).optional(),
    category: z.string().optional(),
    date: z.string().datetime().optional(),
    notes: z.string().optional(),
    paidBy: z.string().optional(),
    splits: z.array(z.object({
      userId: z.string(),
      amountOwed: z.number().nonnegative(),
      percentage: z.number().min(0).max(100).optional(),
    })).min(1).optional()
  }).refine((data) => {
    if (data.amount !== undefined && data.splits !== undefined) {
      const totalSplit = data.splits.reduce((acc, split) => acc + split.amountOwed, 0);
      return Math.abs(totalSplit - data.amount) < 0.01;
    }
    return true;
  }, { message: "Splits must sum up to the total amount", path: ["splits"] })
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>['body'];
