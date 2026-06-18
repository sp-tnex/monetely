"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccountSchema = exports.updatePasswordSchema = exports.updateProfileSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        username: zod_1.z.string().min(3).max(30),
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8),
    })
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(1),
    })
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
    })
});
exports.resetPasswordSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1),
    }),
    body: zod_1.z.object({
        password: zod_1.z.string().min(8),
    })
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        username: zod_1.z.string().min(3).max(30).optional(),
        avatarUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
        theme: zod_1.z.enum(['light', 'dark']).optional(),
        gravatarEmail: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
        darkPalette: zod_1.z.enum(['midnight', 'charcoal', 'forest', 'amethyst', 'custom']).optional(),
        customColors: zod_1.z.object({
            background: zod_1.z.string(),
            card: zod_1.z.string(),
            border: zod_1.z.string(),
            primary: zod_1.z.string(),
        }).partial().optional(),
        defaultCurrency: zod_1.z.string().min(1).max(10).optional(),
        timezone: zod_1.z.string().min(1).max(50).optional(),
        language: zod_1.z.string().min(1).max(10).optional(),
        notificationPreferences: zod_1.z.object({
            push: zod_1.z.boolean(),
            system: zod_1.z.boolean(),
        }).partial().optional(),
        webhook: zod_1.z.object({
            url: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
            enabled: zod_1.z.boolean(),
            secret: zod_1.z.string().optional(),
        }).partial().optional(),
        upiId: zod_1.z.string().regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Invalid UPI ID format. Standard formats: username@bank').optional().or(zod_1.z.literal('')),
        upiName: zod_1.z.string().max(100).optional().or(zod_1.z.literal('')),
        upiVisibility: zod_1.z.enum(['Visible To Everyone', 'Visible To Group Members', 'Visible Only During Settlement', 'Hidden']).optional(),
        upiInstructions: zod_1.z.string().max(500).optional().or(zod_1.z.literal('')),
        upiQrUrl: zod_1.z.string().optional().or(zod_1.z.literal('')),
    })
});
exports.updatePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1),
        newPassword: zod_1.z.string().min(8),
    })
});
exports.deleteAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        password: zod_1.z.string().min(1, 'Password is required to delete your account'),
    })
});
//# sourceMappingURL=auth.schema.js.map