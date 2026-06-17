"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInviteSchema = void 0;
const zod_1 = require("zod");
exports.createInviteSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: zod_1.z.enum(['EMAIL', 'USERNAME', 'LINK']),
        email: zod_1.z.string().email().optional(),
        username: zod_1.z.string().min(3).max(30).optional(),
        expiresInDays: zod_1.z.number().int().min(1).max(365).optional(),
        role: zod_1.z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional()
    })
});
//# sourceMappingURL=invite.schema.js.map