import { z } from 'zod';
import { CreateStorySchema } from '@ai-content-director/schema';

export const CreateStoryDto = CreateStorySchema;
export type CreateStoryDto = z.infer<typeof CreateStoryDto>;