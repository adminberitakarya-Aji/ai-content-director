import { z } from 'zod';

export const ShotType = z.enum([
  'extreme-wide',
  'wide',
  'medium',
  'close-up',
  'extreme-close-up',
  'over-the-shoulder',
  'pov',
]);

export type ShotType = z.infer<typeof ShotType>;

export const CameraPosition = z.enum([
  'eye-level',
  'high-angle',
  'low-angle',
  'birds-eye',
  'worms-eye',
]);

export type CameraPosition = z.infer<typeof CameraPosition>;

export const CameraMovement = z.enum([
  'static',
  'pan',
  'tilt',
  'dolly',
  'tracking',
  'handheld',
  'crane',
  'zoom',
]);

export type CameraMovement = z.infer<typeof CameraMovement>;

export const CharacterBlockingSchema = z.object({
  characterId: z.string().min(1, 'Character ID wajib diisi'),
  position: z.string().min(1, 'Posisi karakter dalam frame wajib diisi'),
  orientation: z.string().min(1, 'Orientasi/arah hadap karakter wajib diisi'),
});

export type CharacterBlocking = z.infer<typeof CharacterBlockingSchema>;

export const ShotSchema = z.object({
  id: z.string().uuid(),
  sceneId: z.string().uuid(),
  projectId: z.string().uuid(),
  shotNumber: z.number().int().positive(),
  shotType: ShotType,
  framing: z.string().min(1, 'Framing wajib diisi'),
  composition: z.string().min(1, 'Komposisi wajib diisi'),
  cameraPosition: CameraPosition,
  lens: z.string().optional(),
  cameraMovement: CameraMovement.optional(),
  characterBlocking: z.array(CharacterBlockingSchema).optional(),
  visualBeat: z.string().min(1, 'Visual beat wajib diisi'),
  status: z.string().default('draft'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Shot = z.infer<typeof ShotSchema>;

export const CreateShotSchema = ShotSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateShot = z.infer<typeof CreateShotSchema>;

export const UpdateShotSchema = CreateShotSchema.partial();

export type UpdateShot = z.infer<typeof UpdateShotSchema>;