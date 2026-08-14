import { z } from 'zod';
import { UpdateStorySchema } from '@ai-content-director/schema';

export const UpdateStoryDto = UpdateStorySchema;
export type UpdateStoryDto = z.infer<typeof UpdateStoryDto>;