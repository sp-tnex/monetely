"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSettlementSchema = exports.updateGroupSchema = exports.updateMemberRoleSchema = exports.addMemberSchema = exports.createGroupSchema = void 0;
const zod_1 = require("zod");
exports.createGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(3).max(50),
        description: zod_1.z.string().optional(),
        currency: zod_1.z.string().default('USD'),
        monthlyBudget: zod_1.z.number().nonnegative().optional(),
        allowUpiSharing: zod_1.z.boolean().optional(),
        allowDirectSettlement: zod_1.z.boolean().optional(),
        showUpiToMembers: zod_1.z.boolean().optional(),
        settlementRemindersEnabled: zod_1.z.boolean().optional(),
        webhookUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')).optional(),
        webhookEnabled: zod_1.z.boolean().optional(),
        reminderSchedule: zod_1.z.enum(['monthly', 'weekly', 'custom']).optional(),
        reminderDay: zod_1.z.number().optional()
    })
});
exports.addMemberSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        role: zod_1.z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER')
    })
});
exports.updateMemberRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        role: zod_1.z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
    })
});
exports.updateGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(3).max(50).optional(),
        description: zod_1.z.string().optional(),
        currency: zod_1.z.string().optional(),
        monthlyBudget: zod_1.z.number().nonnegative().optional(),
        allowUpiSharing: zod_1.z.boolean().optional(),
        allowDirectSettlement: zod_1.z.boolean().optional(),
        showUpiToMembers: zod_1.z.boolean().optional(),
        settlementRemindersEnabled: zod_1.z.boolean().optional(),
        webhookUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')).optional(),
        webhookEnabled: zod_1.z.boolean().optional(),
        reminderSchedule: zod_1.z.enum(['monthly', 'weekly', 'custom']).optional(),
        reminderDay: zod_1.z.number().optional()
    })
});
exports.recordSettlementSchema = zod_1.z.object({
    body: zod_1.z.object({
        payerId: zod_1.z.string(),
        recipientId: zod_1.z.string(),
        amount: zod_1.z.number().positive(),
        notes: zod_1.z.string().optional()
    })
});
//# sourceMappingURL=group.schema.js.map