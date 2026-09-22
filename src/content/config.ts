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
    image: z.string().default("https://sc02.alicdn.com/kf/A87f819b98dd94207818e182094f27463Q.png"),
    tech_image: z.string().default("https://sc02.alicdn.com/kf/A365140e7e0044004be9c5b64de4d6234X.png"),
    description: z.string().optional(),
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

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.date(),
    author: z.string(),
    image: z.string(),
    tags: z.array(z.string()),
  }),
});

export const collections = { products, blog };
