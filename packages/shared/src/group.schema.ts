import { z } from 'zod';

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(50),
    description: z.string().optional(),
    currency: z.string().default('USD'),
    monthlyBudget: z.number().nonnegative().optional(),
    allowUpiSharing: z.boolean().optional(),
    allowDirectSettlement: z.boolean().optional(),
    showUpiToMembers: z.boolean().optional(),
    settlementRemindersEnabled: z.boolean().optional(),
    webhookUrl: z.string().url().optional().or(z.literal('')).optional(),
    webhookEnabled: z.boolean().optional(),
    reminderSchedule: z.enum(['monthly', 'weekly', 'custom']).optional(),
    reminderDay: z.number().optional()
  })
});

export const addMemberSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER')
  })
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
  })
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>['body'];
export type AddMemberInput = z.infer<typeof addMemberSchema>['body'];
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>['body'];

export const updateGroupSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(50).optional(),
    description: z.string().optional(),
    currency: z.string().optional(),
    monthlyBudget: z.number().nonnegative().optional(),
    allowUpiSharing: z.boolean().optional(),
    allowDirectSettlement: z.boolean().optional(),
    showUpiToMembers: z.boolean().optional(),
    settlementRemindersEnabled: z.boolean().optional(),
    webhookUrl: z.string().url().optional().or(z.literal('')).optional(),
    webhookEnabled: z.boolean().optional(),
    reminderSchedule: z.enum(['monthly', 'weekly', 'custom']).optional(),
    reminderDay: z.number().optional()
  })
});

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>['body'];

export const recordSettlementSchema = z.object({
  body: z.object({
    payerId: z.string(),
    recipientId: z.string(),
    amount: z.number().positive(),
    notes: z.string().optional()
  })
});

export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>['body'];
