import { z } from 'zod';

export const SceneSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  episodeId: z.string().uuid().nullable().optional(),
  sceneNumber: z.number().int().positive(),
  title: z.string().optional(),
  characterIds: z.array(z.string()).min(1, 'Minimal satu karakter wajib direferensikan'),
  locationId: z.string().min(1, 'Location ID wajib direferensikan'),
  propIds: z.array(z.string()).optional(),
  time: z.string().min(1, 'Waktu dalam timeline cerita wajib diisi'),
  action: z.string().min(1, 'Urutan kejadian konkret wajib diisi'),
  emotions: z
    .array(
      z.object({
        characterId: z.string(),
        emotion: z.string().min(1, 'State emosi wajib diisi'),
      })
    )
    .min(1, 'State emosi tiap karakter wajib diisi'),
  dialogues: z
    .array(
      z.object({
        characterId: z.string(),
        line: z.string(),
        order: z.number().int().positive(),
      })
    )
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Scene = z.infer<typeof SceneSchema>;

export const CreateSceneSchema = SceneSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateScene = z.infer<typeof CreateSceneSchema>;

export const UpdateSceneSchema = CreateSceneSchema.partial();

export type UpdateScene = z.infer<typeof UpdateSceneSchema>;