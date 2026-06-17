import { z } from 'zod';
export declare const createGroupSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        currency: z.ZodDefault<z.ZodString>;
        monthlyBudget: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        currency: string;
        description?: string | undefined;
        monthlyBudget?: number | undefined;
    }, {
        name: string;
        description?: string | undefined;
        currency?: string | undefined;
        monthlyBudget?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        currency: string;
        description?: string | undefined;
        monthlyBudget?: number | undefined;
    };
}, {
    body: {
        name: string;
        description?: string | undefined;
        currency?: string | undefined;
        monthlyBudget?: number | undefined;
    };
}>;
export declare const addMemberSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        role: z.ZodDefault<z.ZodEnum<["OWNER", "ADMIN", "MEMBER", "VIEWER"]>>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    }, {
        email: string;
        role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    };
}, {
    body: {
        email: string;
        role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | undefined;
    };
}>;
export declare const updateMemberRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        role: z.ZodEnum<["OWNER", "ADMIN", "MEMBER", "VIEWER"]>;
    }, "strip", z.ZodTypeAny, {
        role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    }, {
        role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    };
}, {
    body: {
        role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    };
}>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>['body'];
export type AddMemberInput = z.infer<typeof addMemberSchema>['body'];
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>['body'];
export declare const updateGroupSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        currency: z.ZodOptional<z.ZodString>;
        monthlyBudget: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        name?: string | undefined;
        currency?: string | undefined;
        monthlyBudget?: number | undefined;
    }, {
        description?: string | undefined;
        name?: string | undefined;
        currency?: string | undefined;
        monthlyBudget?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        description?: string | undefined;
        name?: string | undefined;
        currency?: string | undefined;
        monthlyBudget?: number | undefined;
    };
}, {
    body: {
        description?: string | undefined;
        name?: string | undefined;
        currency?: string | undefined;
        monthlyBudget?: number | undefined;
    };
}>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>['body'];
export declare const recordSettlementSchema: z.ZodObject<{
    body: z.ZodObject<{
        payerId: z.ZodString;
        recipientId: z.ZodString;
        amount: z.ZodNumber;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        payerId: string;
        recipientId: string;
        notes?: string | undefined;
    }, {
        amount: number;
        payerId: string;
        recipientId: string;
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        amount: number;
        payerId: string;
        recipientId: string;
        notes?: string | undefined;
    };
}, {
    body: {
        amount: number;
        payerId: string;
        recipientId: string;
        notes?: string | undefined;
    };
}>;
export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>['body'];
//# sourceMappingURL=group.schema.d.ts.map