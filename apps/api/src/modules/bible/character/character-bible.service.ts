import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseBibleService } from '../base-bible.service';

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
  constructor(prisma: PrismaService) {
    super(prisma, prisma.characterBible);
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
    return this.prisma.characterBible.findMany({
      where: {
        projectId,
        characterId,
      },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Mendapatkan semua karakter aktif (versi terbaru per characterId).
   */
  async findAllActive(projectId: string) {
    const all = await this.prisma.characterBible.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    const activeMap = new Map<string, any>();
    for (const version of all) {
      if (!activeMap.has(version.characterId)) {
        activeMap.set(version.characterId, version);
      }
    }

    return Array.from(activeMap.values());
  }

  /**
   * Mendapatkan versi spesifik Character Bible.
   */
  async findVersion(id: string) {
    const entity = await this.prisma.characterBible.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException(`Character Bible dengan id ${id} tidak ditemukan`);
    }

    return entity;
  }

  /**
   * Membuat versi baru dari Character Bible.
   * Versi lama TIDAK ditimpa.
   */
  async createNewVersion(
    previousVersionId: string,
    input: Partial<CreateCharacterBibleInput>,
    isMinorRevision = false,
  ) {
    const previous = await this.prisma.characterBible.findUnique({
      where: { id: previousVersionId },
    });

    if (!previous) {
      throw new NotFoundException(`Character Bible versi ${previousVersionId} tidak ditemukan`);
    }

    return this.prisma.characterBible.create({
      data: {
        projectId: previous.projectId,
        characterId: previous.characterId,
        version: previous.version + 1,
        name: input.name ?? previous.name,
        role: input.role ?? previous.role,
        age: input.age ?? previous.age,
        gender: input.gender ?? previous.gender,
        identityDesc: input.identityDesc ?? previous.identityDesc,
        faceShape: input.faceShape ?? previous.faceShape,
        eyeColor: input.eyeColor ?? previous.eyeColor,
        skinColor: input.skinColor ?? previous.skinColor,
        distinctiveFeatures: input.distinctiveFeatures ?? previous.distinctiveFeatures,
        defaultExpression: input.defaultExpression ?? previous.defaultExpression,
        height: input.height ?? previous.height,
        build: input.build ?? previous.build,
        posture: input.posture ?? previous.posture,
        hairColor: input.hairColor ?? previous.hairColor,
        hairLength: input.hairLength ?? previous.hairLength,
        hairTexture: input.hairTexture ?? previous.hairTexture,
        hairDefaultStyle: input.hairDefaultStyle ?? previous.hairDefaultStyle,
        personality: (input.personality ?? previous.personality) as any,
        wardrobes: (input.wardrobes ?? previous.wardrobes) as any,
        referenceImages: (input.referenceImages ?? previous.referenceImages) as any,
        previousVersionId,
        isMinorRevision,
        status: 'draft',
      },
    });
  }

  /**
   * Mengubah status review Character Bible.
   */
  async updateStatus(id: string, status: string) {
    await this.findVersion(id);

    return this.prisma.characterBible.update({
      where: { id },
      data: { status },
    });
  }
}