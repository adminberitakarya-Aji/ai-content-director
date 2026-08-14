import { z } from 'zod';

export const StorySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  concept: z.string().min(1, 'Konsep cerita wajib diisi'),
  premise: z.string().min(1, 'Premis wajib diisi'),
  synopsis: z.string().min(1, 'Sinopsis wajib diisi'),
  structure: z.string().optional(),
  timeline: z.string().optional(),
  creativeDirection: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Story = z.infer<typeof StorySchema>;

export const CreateStorySchema = StorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateStory = z.infer<typeof CreateStorySchema>;

export const UpdateStorySchema = CreateStorySchema.partial();

export type UpdateStory = z.infer<typeof UpdateStorySchema>;