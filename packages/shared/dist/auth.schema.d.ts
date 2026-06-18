import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        username: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        username: string;
        email: string;
        password: string;
    }, {
        username: string;
        email: string;
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        username: string;
        email: string;
        password: string;
    };
}, {
    body: {
        username: string;
        email: string;
        password: string;
    };
}>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        password: string;
    };
}, {
    body: {
        email: string;
        password: string;
    };
}>;
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export declare const forgotPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
    }, {
        email: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
    };
}, {
    body: {
        email: string;
    };
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    params: z.ZodObject<{
        token: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
    }, {
        token: string;
    }>;
    body: z.ZodObject<{
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
    }, {
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        token: string;
    };
    body: {
        password: string;
    };
}, {
    params: {
        token: string;
    };
    body: {
        password: string;
    };
}>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export declare const updateProfileSchema: z.ZodObject<{
    body: z.ZodObject<{
        username: z.ZodOptional<z.ZodString>;
        avatarUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        gravatarEmail: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        darkPalette: z.ZodOptional<z.ZodEnum<["midnight", "charcoal", "forest", "amethyst", "custom"]>>;
        customColors: z.ZodOptional<z.ZodObject<{
            background: z.ZodOptional<z.ZodString>;
            card: z.ZodOptional<z.ZodString>;
            border: z.ZodOptional<z.ZodString>;
            primary: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            background?: string | undefined;
            card?: string | undefined;
            border?: string | undefined;
            primary?: string | undefined;
        }, {
            background?: string | undefined;
            card?: string | undefined;
            border?: string | undefined;
            primary?: string | undefined;
        }>>;
        defaultCurrency: z.ZodOptional<z.ZodString>;
        timezone: z.ZodOptional<z.ZodString>;
        language: z.ZodOptional<z.ZodString>;
        notificationPreferences: z.ZodOptional<z.ZodObject<{
            push: z.ZodOptional<z.ZodBoolean>;
            system: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            push?: boolean | undefined;
            system?: boolean | undefined;
        }, {
            push?: boolean | undefined;
            system?: boolean | undefined;
        }>>;
        webhook: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
            enabled: z.ZodOptional<z.ZodBoolean>;
            secret: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            enabled?: boolean | undefined;
            secret?: string | undefined;
        }, {
            url?: string | undefined;
            enabled?: boolean | undefined;
            secret?: string | undefined;
        }>>;
        upiId: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        upiName: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        upiVisibility: z.ZodOptional<z.ZodEnum<["Visible To Everyone", "Visible To Group Members", "Visible Only During Settlement", "Hidden"]>>;
        upiInstructions: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        upiQrUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        username?: string | undefined;
        avatarUrl?: string | undefined;
        theme?: "light" | "dark" | undefined;
        gravatarEmail?: string | undefined;
        darkPalette?: "custom" | "midnight" | "charcoal" | "forest" | "amethyst" | undefined;
        customColors?: {
            background?: string | undefined;
            card?: string | undefined;
            border?: string | undefined;
            primary?: string | undefined;
        } | undefined;
        defaultCurrency?: string | undefined;
        timezone?: string | undefined;
        language?: string | undefined;
        notificationPreferences?: {
            push?: boolean | undefined;
            system?: boolean | undefined;
        } | undefined;
        webhook?: {
            url?: string | undefined;
            enabled?: boolean | undefined;
            secret?: string | undefined;
        } | undefined;
        upiId?: string | undefined;
        upiName?: string | undefined;
        upiVisibility?: "Visible To Everyone" | "Visible To Group Members" | "Visible Only During Settlement" | "Hidden" | undefined;
        upiInstructions?: string | undefined;
        upiQrUrl?: string | undefined;
    }, {
        username?: string | undefined;
        avatarUrl?: string | undefined;
        theme?: "light" | "dark" | undefined;
        gravatarEmail?: string | undefined;
        darkPalette?: "custom" | "midnight" | "charcoal" | "forest" | "amethyst" | undefined;
        customColors?: {
            background?: string | undefined;
            card?: string | undefined;
            border?: string | undefined;
            primary?: string | undefined;
        } | undefined;
        defaultCurrency?: string | undefined;
        timezone?: string | undefined;
        language?: string | undefined;
        notificationPreferences?: {
            push?: boolean | undefined;
            system?: boolean | undefined;
        } | undefined;
        webhook?: {
            url?: string | undefined;
            enabled?: boolean | undefined;
            secret?: string | undefined;
        } | undefined;
        upiId?: string | undefined;
        upiName?: string | undefined;
        upiVisibility?: "Visible To Everyone" | "Visible To Group Members" | "Visible Only During Settlement" | "Hidden" | undefined;
        upiInstructions?: string | undefined;
        upiQrUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        username?: string | undefined;
        avatarUrl?: string | undefined;
        theme?: "light" | "dark" | undefined;
        gravatarEmail?: string | undefined;
        darkPalette?: "custom" | "midnight" | "charcoal" | "forest" | "amethyst" | undefined;
        customColors?: {
            background?: string | undefined;
            card?: string | undefined;
            border?: string | undefined;
            primary?: string | undefined;
        } | undefined;
        defaultCurrency?: string | undefined;
        timezone?: string | undefined;
        language?: string | undefined;
        notificationPreferences?: {
            push?: boolean | undefined;
            system?: boolean | undefined;
        } | undefined;
        webhook?: {
            url?: string | undefined;
            enabled?: boolean | undefined;
            secret?: string | undefined;
        } | undefined;
        upiId?: string | undefined;
        upiName?: string | undefined;
        upiVisibility?: "Visible To Everyone" | "Visible To Group Members" | "Visible Only During Settlement" | "Hidden" | undefined;
        upiInstructions?: string | undefined;
        upiQrUrl?: string | undefined;
    };
}, {
    body: {
        username?: string | undefined;
        avatarUrl?: string | undefined;
        theme?: "light" | "dark" | undefined;
        gravatarEmail?: string | undefined;
        darkPalette?: "custom" | "midnight" | "charcoal" | "forest" | "amethyst" | undefined;
        customColors?: {
            background?: string | undefined;
            card?: string | undefined;
            border?: string | undefined;
            primary?: string | undefined;
        } | undefined;
        defaultCurrency?: string | undefined;
        timezone?: string | undefined;
        language?: string | undefined;
        notificationPreferences?: {
            push?: boolean | undefined;
            system?: boolean | undefined;
        } | undefined;
        webhook?: {
            url?: string | undefined;
            enabled?: boolean | undefined;
            secret?: string | undefined;
        } | undefined;
        upiId?: string | undefined;
        upiName?: string | undefined;
        upiVisibility?: "Visible To Everyone" | "Visible To Group Members" | "Visible Only During Settlement" | "Hidden" | undefined;
        upiInstructions?: string | undefined;
        upiQrUrl?: string | undefined;
    };
}>;
export declare const updatePasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currentPassword: string;
        newPassword: string;
    }, {
        currentPassword: string;
        newPassword: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        currentPassword: string;
        newPassword: string;
    };
}, {
    body: {
        currentPassword: string;
        newPassword: string;
    };
}>;
export declare const deleteAccountSchema: z.ZodObject<{
    body: z.ZodObject<{
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
    }, {
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        password: string;
    };
}, {
    body: {
        password: string;
    };
}>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>['body'];
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>['body'];
//# sourceMappingURL=auth.schema.d.ts.map