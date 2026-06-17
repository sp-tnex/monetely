"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
exports.createExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        amount: zod_1.z.number().positive(),
        description: zod_1.z.string().min(1).max(255),
        category: zod_1.z.string().default('general'),
        date: zod_1.z.string().datetime().optional(),
        notes: zod_1.z.string().optional(),
        paidBy: zod_1.z.string(),
        splits: zod_1.z.array(zod_1.z.object({
            userId: zod_1.z.string(),
            amountOwed: zod_1.z.number().nonnegative(),
            percentage: zod_1.z.number().min(0).max(100).optional(),
        })).min(1)
    }).refine((data) => {
        const totalSplit = data.splits.reduce((acc, split) => acc + split.amountOwed, 0);
        return Math.abs(totalSplit - data.amount) < 0.01;
    }, { message: "Splits must sum up to the total amount", path: ["splits"] })
});
exports.updateExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        amount: zod_1.z.number().positive().optional(),
        description: zod_1.z.string().min(1).max(255).optional(),
        category: zod_1.z.string().optional(),
        date: zod_1.z.string().datetime().optional(),
        notes: zod_1.z.string().optional(),
        paidBy: zod_1.z.string().optional(),
        splits: zod_1.z.array(zod_1.z.object({
            userId: zod_1.z.string(),
            amountOwed: zod_1.z.number().nonnegative(),
            percentage: zod_1.z.number().min(0).max(100).optional(),
        })).min(1).optional()
    }).refine((data) => {
        if (data.amount !== undefined && data.splits !== undefined) {
            const totalSplit = data.splits.reduce((acc, split) => acc + split.amountOwed, 0);
            return Math.abs(totalSplit - data.amount) < 0.01;
        }
        return true;
    }, { message: "Splits must sum up to the total amount", path: ["splits"] })
});
//# sourceMappingURL=expense.schema.js.map