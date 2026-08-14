import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseBibleService } from '../base-bible.service';

export interface CreatePropBibleInput {
  propId: string;
  name: string;
  appearance: Record<string, unknown>;
  function: string;
  continuity: Record<string, unknown>;
  referenceImages?: Record<string, unknown>[];
}

@Injectable()
export class PropBibleService extends BaseBibleService<any> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.propBible);
  }

  /**
   * Membuat Prop Bible versi pertama.
   */
  async createProp(projectId: string, input: CreatePropBibleInput, status = 'draft') {
    return super.create(projectId, {
      propId: input.propId,
      name: input.name,
      appearance: input.appearance,
      function: input.function,
      continuity: input.continuity,
      referenceImages: input.referenceImages,
    }, status);
  }

  /**
   * Mendapatkan semua versi dari satu prop.
   */
  async findAllVersions(projectId: string, propId: string) {
    return this.prisma.propBible.findMany({
      where: { projectId, propId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Mendapatkan semua prop aktif (versi terbaru per propId).
   */
  async findAllActive(projectId: string) {
    const all = await this.prisma.propBible.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    const activeMap = new Map<string, any>();
    for (const version of all) {
      if (!activeMap.has(version.propId)) {
        activeMap.set(version.propId, version);
      }
    }

    return Array.from(activeMap.values());
  }

  /**
   * Mendapatkan versi spesifik Prop Bible.
   */
  async findVersion(id: string) {
    const entity = await this.prisma.propBible.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException(`Prop Bible dengan id ${id} tidak ditemukan`);
    }

    return entity;
  }

  /**
   * Membuat versi baru dari Prop Bible.
   * Versi lama TIDAK ditimpa.
   */
  async createNewVersion(
    previousVersionId: string,
    input: Partial<CreatePropBibleInput>,
    isMinorRevision = false,
  ) {
    const previous = await this.prisma.propBible.findUnique({
      where: { id: previousVersionId },
    });

    if (!previous) {
      throw new NotFoundException(`Prop Bible versi ${previousVersionId} tidak ditemukan`);
    }

    return this.prisma.propBible.create({
      data: {
        projectId: previous.projectId,
        propId: previous.propId,
        version: previous.version + 1,
        name: input.name ?? previous.name,
        appearance: (input.appearance ?? previous.appearance) as any,
        function: input.function ?? previous.function,
        continuity: (input.continuity ?? previous.continuity) as any,
        referenceImages: (input.referenceImages ?? previous.referenceImages) as any,
        previousVersionId,
        isMinorRevision,
        status: 'draft',
      },
    });
  }

  /**
   * Mengubah status review Prop Bible.
   */
  async updateStatus(id: string, status: string) {
    await this.findVersion(id);

    return this.prisma.propBible.update({
      where: { id },
      data: { status },
    });
  }
}