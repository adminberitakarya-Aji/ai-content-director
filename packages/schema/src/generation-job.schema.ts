import { z } from 'zod';

export const GenerationType = z.enum(['image', 'video']);

export type GenerationType = z.infer<typeof GenerationType>;

export const GenerationStatus = z.enum([
  'pending',
  'approved',
  'submitted',
  'processing',
  'completed',
  'failed',
  'rejected',
  'cancelled',
]);

export type GenerationStatus = z.infer<typeof GenerationStatus>;

export const GenerationJobSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  shotId: z.string().uuid(),
  type: GenerationType,
  adapterName: z.string().min(1, 'Nama adapter wajib diisi'),
  status: GenerationStatus.default('pending'),
  promptConceptual: z.string().min(1, 'Prompt konseptual wajib diisi'),
  promptFinal: z.string().optional(),
  promptVersion: z.number().int().positive(),
  bibleVersion: z.string().min(1, 'Versi Bible yang dipakai wajib dicatat'),
  costEstimate: z.number().nonnegative(),
  costActual: z.number().nonnegative().optional(),
  outputAssetUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type GenerationJob = z.infer<typeof GenerationJobSchema>;

export const CreateGenerationJobSchema = GenerationJobSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateGenerationJob = z.infer<typeof CreateGenerationJobSchema>;

export const UpdateGenerationJobSchema = GenerationJobSchema.partial();

export type UpdateGenerationJob = z.infer<typeof UpdateGenerationJobSchema>;