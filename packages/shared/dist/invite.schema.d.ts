import { z } from 'zod';
export declare const createInviteSchema: z.ZodObject<{
    body: z.ZodObject<{
        type: z.ZodEnum<["EMAIL", "USERNAME", "LINK"]>;
        email: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
        expiresInDays: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<["OWNER", "ADMIN", "MEMBER", "VIEWER"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "EMAIL" | "USERNAME" | "LINK";
        username?: string | undefined;
        email?: string | undefined;
        role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | undefined;
        expiresInDays?: number | undefined;
    }, {
        type: "EMAIL" | "USERNAME" | "LINK";
        username?: string | undefined;
        email?: string | undefined;
        role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | undefined;
        expiresInDays?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        type: "EMAIL" | "USERNAME" | "LINK";
        username?: string | undefined;
        email?: string | undefined;
        role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | undefined;
        expiresInDays?: number | undefined;
    };
}, {
    body: {
        type: "EMAIL" | "USERNAME" | "LINK";
        username?: string | undefined;
        email?: string | undefined;
        role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | undefined;
        expiresInDays?: number | undefined;
    };
}>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>['body'];
//# sourceMappingURL=invite.schema.d.ts.map