import { z } from 'zod';

export const ContentType = z.enum([
  'film',
  'short-film',
  'documentary',
  'vlog',
  'ugc',
  'advertisement',
  'music-video',
  'live-action',
  'animation',
  'cartoon',
  'anime',
  'social-video',
]);

export type ContentType = z.infer<typeof ContentType>;

export const AspectRatio = z.enum(['16:9', '9:16', '1:1', '4:3', '21:9']);

export type AspectRatio = z.infer<typeof AspectRatio>;

export const ProjectStatus = z.enum(['draft', 'active', 'archived']);

export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nama project wajib diisi'),
  description: z.string().optional(),
  contentType: ContentType,
  genre: z.string().min(1, 'Genre wajib diisi'),
  tone: z.string().min(1, 'Tone wajib diisi'),
  audience: z.string().min(1, 'Target audiens wajib diisi'),
  platform: z.string().min(1, 'Platform wajib diisi'),
  duration: z.number().positive().optional(),
  aspectRatio: AspectRatio,
  status: ProjectStatus.default('draft'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProject = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();

export type UpdateProject = z.infer<typeof UpdateProjectSchema>;