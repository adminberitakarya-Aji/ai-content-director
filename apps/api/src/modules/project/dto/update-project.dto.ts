import { z } from 'zod';
import { UpdateProjectSchema } from '@ai-content-director/schema';

export const UpdateProjectDto = UpdateProjectSchema;
export type UpdateProjectDto = z.infer<typeof UpdateProjectDto>;