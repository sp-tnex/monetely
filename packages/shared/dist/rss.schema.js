"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCollectionSchema = exports.createCollectionSchema = exports.createCategorySchema = exports.updateFeedSchema = exports.addFeedSchema = void 0;
const zod_1 = require("zod");
exports.addFeedSchema = zod_1.z.object({
    body: zod_1.z.object({
        url: zod_1.z.string().url('Please enter a valid URL'),
        categoryId: zod_1.z.string().min(1, 'Category is required'),
        refreshInterval: zod_1.z.enum(['15m', '1h', '1d']).default('1h'),
        title: zod_1.z.string().max(255).optional(),
    }),
});
exports.updateFeedSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().max(255).optional(),
        categoryId: zod_1.z.string().min(1).optional(),
        refreshInterval: zod_1.z.enum(['15m', '1h', '1d']).optional(),
        enabled: zod_1.z.boolean().optional(),
    }),
});
exports.createCategorySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Category name is required').max(50),
    }),
});
exports.createCollectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Collection name is required').max(100),
        feedIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    }),
});
exports.updateCollectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Collection name is required').max(100),
        feedIds: zod_1.z.array(zod_1.z.string()),
    }),
});
//# sourceMappingURL=rss.schema.js.map