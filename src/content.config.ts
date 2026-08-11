import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const evidenceSchema = z.object({
  type: z.enum([
    'repository',
    'live-project',
    'release',
    'certificate',
    'event-page',
    'download',
  ]),
  label: z.string().min(1),
  url: z.url(),
});

const work = defineCollection({
  loader: glob({ base: './src/content/work', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      summary: z.string().min(1),
      type: z.enum(['security-tooling', 'deployed-software', 'experiment']),
      date: z.coerce.date(),
      featured: z.boolean().default(false),
      status: z.enum(['maintained', 'completed', 'in-progress', 'archived']),
      role: z.string().min(1),
      skills: z.array(z.string().min(1)),
      evidence: z.array(evidenceSchema).default([]),
      draft: z.boolean().default(true),
      repository: z.url().optional(),
      liveUrl: z.url().optional(),
      event: z.string().optional(),
      heroImage: image().optional(),
      technologies: z.array(z.string().min(1)).default([]),
      securityTopics: z.array(z.string().min(1)).default([]),
      order: z.number().int().optional(),
    }),
});

const labs = defineCollection({
  loader: glob({ base: './src/content/labs', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      summary: z.string().min(1),
      date: z.coerce.date(),
      environment: z.string().min(1),
      topics: z.array(z.string().min(1)),
      status: z.enum(['planned', 'in-progress', 'completed', 'archived']),
      draft: z.boolean().default(true),
      tools: z.array(z.string().min(1)).default([]),
      heroImage: image().optional(),
      repository: z.url().optional(),
      references: z.array(z.url()).default([]),
    }),
});

export const collections = { work, labs };
