import { z } from 'zod';
export declare const addFeedSchema: z.ZodObject<{
    body: z.ZodObject<{
        url: z.ZodString;
        categoryId: z.ZodString;
        refreshInterval: z.ZodDefault<z.ZodEnum<["15m", "1h", "1d"]>>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        categoryId: string;
        refreshInterval: "15m" | "1h" | "1d";
        title?: string | undefined;
    }, {
        url: string;
        categoryId: string;
        refreshInterval?: "15m" | "1h" | "1d" | undefined;
        title?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        url: string;
        categoryId: string;
        refreshInterval: "15m" | "1h" | "1d";
        title?: string | undefined;
    };
}, {
    body: {
        url: string;
        categoryId: string;
        refreshInterval?: "15m" | "1h" | "1d" | undefined;
        title?: string | undefined;
    };
}>;
export type AddFeedInput = z.infer<typeof addFeedSchema>['body'];
export declare const updateFeedSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        categoryId: z.ZodOptional<z.ZodString>;
        refreshInterval: z.ZodOptional<z.ZodEnum<["15m", "1h", "1d"]>>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        categoryId?: string | undefined;
        refreshInterval?: "15m" | "1h" | "1d" | undefined;
        title?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        categoryId?: string | undefined;
        refreshInterval?: "15m" | "1h" | "1d" | undefined;
        title?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        enabled?: boolean | undefined;
        categoryId?: string | undefined;
        refreshInterval?: "15m" | "1h" | "1d" | undefined;
        title?: string | undefined;
    };
}, {
    body: {
        enabled?: boolean | undefined;
        categoryId?: string | undefined;
        refreshInterval?: "15m" | "1h" | "1d" | undefined;
        title?: string | undefined;
    };
}>;
export type UpdateFeedInput = z.infer<typeof updateFeedSchema>['body'];
export declare const createCategorySchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
    }, {
        name: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
    };
}, {
    body: {
        name: string;
    };
}>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export declare const createCollectionSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        feedIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        feedIds: string[];
    }, {
        name: string;
        feedIds?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        feedIds: string[];
    };
}, {
    body: {
        name: string;
        feedIds?: string[] | undefined;
    };
}>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>['body'];
export declare const updateCollectionSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        feedIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        feedIds: string[];
    }, {
        name: string;
        feedIds: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        feedIds: string[];
    };
}, {
    body: {
        name: string;
        feedIds: string[];
    };
}>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>['body'];
//# sourceMappingURL=rss.schema.d.ts.map