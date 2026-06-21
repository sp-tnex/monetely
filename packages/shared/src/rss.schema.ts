import { z } from 'zod';

export const addFeedSchema = z.object({
  body: z.object({
    url: z.string().url('Please enter a valid URL'),
    categoryId: z.string().min(1, 'Category is required'),
    refreshInterval: z.enum(['15m', '1h', '1d']).default('1h'),
    title: z.string().max(255).optional(),
  }),
});

export type AddFeedInput = z.infer<typeof addFeedSchema>['body'];

export const updateFeedSchema = z.object({
  body: z.object({
    title: z.string().max(255).optional(),
    categoryId: z.string().min(1).optional(),
    refreshInterval: z.enum(['15m', '1h', '1d']).optional(),
    enabled: z.boolean().optional(),
  }),
});

export type UpdateFeedInput = z.infer<typeof updateFeedSchema>['body'];

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required').max(50),
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];

export const createCollectionSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Collection name is required').max(100),
    feedIds: z.array(z.string()).optional().default([]),
  }),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>['body'];

export const updateCollectionSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Collection name is required').max(100),
    feedIds: z.array(z.string()),
  }),
});

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>['body'];
