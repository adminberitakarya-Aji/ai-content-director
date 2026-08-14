import { z } from 'zod';

// ===== Review Status (dipakai semua Bible) =====
export const ReviewStatus = z.enum(['draft', 'review', 'approved', 'rejected']);

export type ReviewStatus = z.infer<typeof ReviewStatus>;

// ===== Character Bible =====
export const CharacterIdentitySchema = z.object({
  name: z.string().min(1, 'Nama karakter wajib diisi'),
  role: z.string().min(1, 'Peran/fungsi karakter wajib diisi'),
  age: z.string().min(1, 'Usia atau rentang usia wajib diisi'),
  gender: z.string().min(1, 'Gender wajib diisi'),
  description: z.string().min(1, 'Deskripsi identitas wajib diisi'),
});

export const CharacterFaceSchema = z.object({
  faceShape: z.string().min(1, 'Bentuk wajah wajib diisi'),
  eyeColor: z.string().min(1, 'Warna mata wajib diisi'),
  skinColor: z.string().min(1, 'Warna/tekstur kulit wajib diisi'),
  distinctiveFeatures: z.string().optional(),
  defaultExpression: z.string().min(1, 'Ekspresi default wajib diisi'),
});

export const CharacterBodySchema = z.object({
  height: z.string().min(1, 'Tinggi/proporsi tubuh wajib diisi'),
  build: z.string().min(1, 'Bentuk tubuh wajib diisi'),
  posture: z.string().optional(),
});

export const CharacterHairSchema = z.object({
  color: z.string().min(1, 'Warna rambut wajib diisi'),
  length: z.string().min(1, 'Panjang rambut wajib diisi'),
  texture: z.string().min(1, 'Tekstur rambut wajib diisi'),
  defaultStyle: z.string().min(1, 'Model rambut default wajib diisi'),
  variations: z
    .array(
      z.object({
        description: z.string(),
        timelinePoint: z.string(),
      })
    )
    .optional(),
});

export const WardrobeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nama wardrobe wajib diisi'),
  clothingType: z.string().min(1, 'Jenis pakaian wajib diisi'),
  colors: z.array(z.string()).min(1, 'Warna pakaian wajib diisi'),
  accessories: z.array(z.string()).optional(),
  isDefault: z.boolean().default(false),
});

export const CharacterPersonalitySchema = z.object({
  traits: z.array(z.string()).optional(),
  speechPattern: z.string().optional(),
  habits: z.array(z.string()).optional(),
});

export const CharacterBibleSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  characterId: z.string().min(1, 'Character ID wajib diisi (mis. A01)'),
  version: z.number().int().positive(),
  identity: CharacterIdentitySchema,
  face: CharacterFaceSchema,
  body: CharacterBodySchema,
  hair: CharacterHairSchema,
  wardrobes: z.array(WardrobeSchema).min(1, 'Minimal satu set wardrobe default'),
  personality: CharacterPersonalitySchema.optional(),
  referenceImages: z
    .array(
      z.object({
        url: z.string().url(),
        type: z.enum(['face', 'wardrobe', 'pose', 'other']),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
  status: ReviewStatus.default('draft'),
  isMinorRevision: z.boolean().default(false),
  previousVersionId: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CharacterBible = z.infer<typeof CharacterBibleSchema>;

// ===== Location Bible =====
export const LocationExteriorSchema = z.object({
  buildingExterior: z.string().min(1, 'Tampilan luar bangunan wajib diisi'),
  materials: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  scale: z.string().optional(),
  surroundings: z.string().min(1, 'Lingkungan sekitar wajib diisi'),
});

export const LocationInteriorSchema = z.object({
  layout: z.string().min(1, 'Tata ruang wajib diisi'),
  fixedDecor: z.array(z.string()).optional(),
  signatureFurniture: z.array(z.string()).optional(),
  keyColors: z.array(z.string()).optional(),
});

export const LocationArchitectureSchema = z.object({
  style: z.string().min(1, 'Gaya arsitektur wajib diisi'),
  details: z.string().optional(),
});

export const LocationLightingSchema = z.object({
  primarySource: z.enum(['natural', 'artificial', 'mixed']),
  direction: z.string().min(1, 'Arah cahaya wajib diisi'),
  color: z.enum(['warm', 'cool', 'neutral']),
  commonTimeOfDay: z.string().min(1, 'Waktu hari paling umum wajib diisi'),
  variations: z
    .array(
      z.object({
        timeOfDay: z.string(),
        mood: z.string(),
        description: z.string(),
      })
    )
    .optional(),
});

export const LocationBibleSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  locationId: z.string().min(1, 'Location ID wajib diisi (mis. L01)'),
  version: z.number().int().positive(),
  name: z.string().min(1, 'Nama lokasi wajib diisi'),
  exterior: LocationExteriorSchema.optional(),
  interior: LocationInteriorSchema.optional(),
  architecture: LocationArchitectureSchema.optional(),
  lighting: LocationLightingSchema,
  atmosphere: z.string().min(1, 'Atmosfer/suasana wajib diisi'),
  referenceImages: z
    .array(
      z.object({
        url: z.string().url(),
        type: z.enum(['exterior', 'interior', 'other']),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
  status: ReviewStatus.default('draft'),
  isMinorRevision: z.boolean().default(false),
  previousVersionId: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LocationBible = z.infer<typeof LocationBibleSchema>;

// ===== Prop Bible =====
export const PropAppearanceSchema = z.object({
  shape: z.string().min(1, 'Bentuk prop wajib diisi'),
  size: z.string().min(1, 'Ukuran prop wajib diisi'),
  colors: z.array(z.string()).min(1, 'Warna prop wajib diisi'),
  material: z.string().min(1, 'Material prop wajib diisi'),
  condition: z.string().min(1, 'Kondisi prop wajib diisi'),
  distinctiveDetails: z.string().optional(),
});

export const PropContinuitySchema = z.object({
  conditionStages: z
    .array(
      z.object({
        stage: z.string(),
        timelinePoint: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  staticCondition: z.string().optional(),
  associatedCharacterId: z.string().optional(),
});

export const PropBibleSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  propId: z.string().min(1, 'Prop ID wajib diisi (mis. O01)'),
  version: z.number().int().positive(),
  name: z.string().min(1, 'Nama prop wajib diisi'),
  appearance: PropAppearanceSchema,
  function: z.string().min(1, 'Fungsi prop dalam cerita wajib diisi'),
  continuity: PropContinuitySchema,
  referenceImages: z
    .array(
      z.object({
        url: z.string().url(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
  status: ReviewStatus.default('draft'),
  isMinorRevision: z.boolean().default(false),
  previousVersionId: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PropBible = z.infer<typeof PropBibleSchema>;

// ===== Style Bible =====
export const StyleBibleSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  version: z.number().int().positive(),
  visualStyle: z.string().min(1, 'Gaya visual wajib diisi'),
  color: z.object({
    palette: z.string().min(1, 'Palet warna wajib diisi'),
    saturation: z.enum(['low', 'medium', 'high']),
    contrast: z.enum(['low', 'medium', 'high']),
  }),
  lighting: z.object({
    approach: z.string().min(1, 'Pendekatan pencahayaan wajib diisi'),
    tendency: z.enum(['natural', 'dramatic', 'soft', 'mixed']),
  }),
  texture: z.string().optional(),
  cinematography: z.object({
    framingPreference: z.string().min(1, 'Preferensi framing wajib diisi'),
    lensPreference: z.string().optional(),
    cameraMovementTendency: z.enum(['static', 'dynamic', 'mixed']),
  }),
  motionStyle: z
    .object({
      speed: z.enum(['slow', 'medium', 'fast']),
      smoothness: z.enum(['smooth', 'staccato', 'mixed']),
      realism: z.enum(['realistic', 'stylized', 'mixed']),
    })
    .optional(),
  status: ReviewStatus.default('draft'),
  isMinorRevision: z.boolean().default(false),
  previousVersionId: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type StyleBible = z.infer<typeof StyleBibleSchema>;