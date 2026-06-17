import { z } from 'zod';

export const createInviteSchema = z.object({
  body: z.object({
    type: z.enum(['EMAIL', 'USERNAME', 'LINK']),
    email: z.string().email().optional(),
    username: z.string().min(3).max(30).optional(),
    expiresInDays: z.number().int().min(1).max(365).optional(),
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional()
  })
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>['body'];
