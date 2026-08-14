import { z } from 'zod';
import { CreateProjectSchema } from '@ai-content-director/schema';

export const CreateProjectDto = CreateProjectSchema;
export type CreateProjectDto = z.infer<typeof CreateProjectDto>;