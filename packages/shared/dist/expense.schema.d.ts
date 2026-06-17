import { z } from 'zod';
export declare const createExpenseSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        amount: z.ZodNumber;
        description: z.ZodString;
        category: z.ZodDefault<z.ZodString>;
        date: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
        paidBy: z.ZodString;
        splits: z.ZodArray<z.ZodObject<{
            userId: z.ZodString;
            amountOwed: z.ZodNumber;
            percentage: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }, {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        description: string;
        category: string;
        paidBy: string;
        splits: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[];
        date?: string | undefined;
        notes?: string | undefined;
    }, {
        amount: number;
        description: string;
        paidBy: string;
        splits: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[];
        date?: string | undefined;
        category?: string | undefined;
        notes?: string | undefined;
    }>, {
        amount: number;
        description: string;
        category: string;
        paidBy: string;
        splits: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[];
        date?: string | undefined;
        notes?: string | undefined;
    }, {
        amount: number;
        description: string;
        paidBy: string;
        splits: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[];
        date?: string | undefined;
        category?: string | undefined;
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        amount: number;
        description: string;
        category: string;
        paidBy: string;
        splits: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[];
        date?: string | undefined;
        notes?: string | undefined;
    };
}, {
    body: {
        amount: number;
        description: string;
        paidBy: string;
        splits: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[];
        date?: string | undefined;
        category?: string | undefined;
        notes?: string | undefined;
    };
}>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];
export declare const updateExpenseSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        amount: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        date: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
        paidBy: z.ZodOptional<z.ZodString>;
        splits: z.ZodOptional<z.ZodArray<z.ZodObject<{
            userId: z.ZodString;
            amountOwed: z.ZodNumber;
            percentage: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }, {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        date?: string | undefined;
        amount?: number | undefined;
        description?: string | undefined;
        category?: string | undefined;
        notes?: string | undefined;
        paidBy?: string | undefined;
        splits?: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[] | undefined;
    }, {
        date?: string | undefined;
        amount?: number | undefined;
        description?: string | undefined;
        category?: string | undefined;
        notes?: string | undefined;
        paidBy?: string | undefined;
        splits?: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[] | undefined;
    }>, {
        date?: string | undefined;
        amount?: number | undefined;
        description?: string | undefined;
        category?: string | undefined;
        notes?: string | undefined;
        paidBy?: string | undefined;
        splits?: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[] | undefined;
    }, {
        date?: string | undefined;
        amount?: number | undefined;
        description?: string | undefined;
        category?: string | undefined;
        notes?: string | undefined;
        paidBy?: string | undefined;
        splits?: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        date?: string | undefined;
        amount?: number | undefined;
        description?: string | undefined;
        category?: string | undefined;
        notes?: string | undefined;
        paidBy?: string | undefined;
        splits?: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[] | undefined;
    };
}, {
    body: {
        date?: string | undefined;
        amount?: number | undefined;
        description?: string | undefined;
        category?: string | undefined;
        notes?: string | undefined;
        paidBy?: string | undefined;
        splits?: {
            userId: string;
            amountOwed: number;
            percentage?: number | undefined;
        }[] | undefined;
    };
}>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>['body'];
//# sourceMappingURL=expense.schema.d.ts.map