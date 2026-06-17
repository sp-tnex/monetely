import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30),
    email: z.string().email(),
    password: z.string().min(8),
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  })
});

export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1),
  }),
  body: z.object({
    password: z.string().min(8),
  })
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    theme: z.enum(['light', 'dark']).optional(),
    gravatarEmail: z.string().email().optional().or(z.literal('')),
    darkPalette: z.enum(['midnight', 'charcoal', 'forest', 'amethyst', 'custom']).optional(),
    customColors: z.object({
      background: z.string(),
      card: z.string(),
      border: z.string(),
      primary: z.string(),
    }).partial().optional(),
    defaultCurrency: z.string().min(1).max(10).optional(),
    timezone: z.string().min(1).max(50).optional(),
    language: z.string().min(1).max(10).optional(),
    notificationPreferences: z.object({
      push: z.boolean(),
      system: z.boolean(),
    }).partial().optional(),
    webhook: z.object({
      url: z.string().url().optional().or(z.literal('')),
      enabled: z.boolean(),
      secret: z.string().optional(),
    }).partial().optional(),
  })
});

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  })
});

export const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required to delete your account'),
  })
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>['body'];
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>['body'];

