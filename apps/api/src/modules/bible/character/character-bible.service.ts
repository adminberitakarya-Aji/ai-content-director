import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseBibleService } from '../base-bible.service';
import { ContinuityService } from '../../continuity/continuity.service';

export interface CreateCharacterBibleInput {
  characterId: string;
  name: string;
  role: string;
  age: string;
  gender: string;
  identityDesc: string;
  faceShape: string;
  eyeColor: string;
  skinColor: string;
  distinctiveFeatures?: string;
  defaultExpression: string;
  height: string;
  build: string;
  posture?: string;
  hairColor: string;
  hairLength: string;
  hairTexture: string;
  hairDefaultStyle: string;
  personality?: Record<string, unknown>;
  wardrobes: Record<string, unknown>[];
  referenceImages?: Record<string, unknown>[];
}

@Injectable()
export class CharacterBibleService extends BaseBibleService<any> {
  constructor(prisma: PrismaService, continuityService: ContinuityService) {
    super(
      prisma,
      prisma.characterBible,
      'characterId',
      continuityService,
      prisma.character,
      'characterEntityId',
    );
  }

  /**
   * Membuat Character Bible versi pertama.
   */
  async createCharacter(projectId: string, input: CreateCharacterBibleInput, status = 'draft') {
    return super.create(projectId, {
      characterId: input.characterId,
      name: input.name,
      role: input.role,
      age: input.age,
      gender: input.gender,
      identityDesc: input.identityDesc,
      faceShape: input.faceShape,
      eyeColor: input.eyeColor,
      skinColor: input.skinColor,
      distinctiveFeatures: input.distinctiveFeatures,
      defaultExpression: input.defaultExpression,
      height: input.height,
      build: input.build,
      posture: input.posture,
      hairColor: input.hairColor,
      hairLength: input.hairLength,
      hairTexture: input.hairTexture,
      hairDefaultStyle: input.hairDefaultStyle,
      personality: input.personality,
      wardrobes: input.wardrobes,
      referenceImages: input.referenceImages,
    }, status);
  }

  /**
   * Mendapatkan semua versi dari satu karakter.
   */
  async findAllVersions(projectId: string, characterId: string) {
    return super.findAllVersions(projectId, characterId);
  }

  /**
   * Mendapatkan semua karakter aktif (versi terbaru per characterId).
   */
  async findAllActive(projectId: string) {
    return super.findAllActive(projectId);
  }

  /**
   * Mendapatkan versi spesifik Character Bible.
   */
  async findVersion(id: string) {
    return super.findVersion(id);
  }

  /**
   * Membuat versi baru dari Character Bible.
   * Versi lama TIDAK ditimpa. Field yang tidak disertakan di `input` otomatis
   * diwarisi dari versi sebelumnya (lihat BaseBibleService.createNewVersion).
   */
  async createNewVersion(
    previousVersionId: string,
    input: Partial<CreateCharacterBibleInput>,
    isMinorRevision = false,
  ) {
    return super.createNewVersion(previousVersionId, input, isMinorRevision, 'character');
  }
}