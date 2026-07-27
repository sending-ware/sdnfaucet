import { defineCollection, z } from "astro:content";

const products = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.enum([
      "kitchen-faucets",
      "basin-faucets",
      "shower-systems",
      "bath-mixers",
      "accessories",
    ]),
    model: z.string(),
    featured: z.boolean().default(false),
    publishDate: z.date(),
    specs: z
      .object({
        material: z.string().optional(),
        finish: z.string().optional(),
        type: z.string().optional(),
        features: z.array(z.string()).default([]),
      })
      .optional(),
  }),
});

export const collections = { products };
