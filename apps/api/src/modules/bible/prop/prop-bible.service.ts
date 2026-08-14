import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseBibleService } from '../base-bible.service';
import { ContinuityService } from '../../continuity/continuity.service';

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
  constructor(prisma: PrismaService, continuityService: ContinuityService) {
    super(prisma, prisma.propBible, 'propId', continuityService);
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
    return super.findAllVersions(projectId, propId);
  }

  /**
   * Mendapatkan semua prop aktif (versi terbaru per propId).
   */
  async findAllActive(projectId: string) {
    return super.findAllActive(projectId);
  }

  /**
   * Mendapatkan versi spesifik Prop Bible.
   */
  async findVersion(id: string) {
    return super.findVersion(id);
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

    const created = await this.prisma.propBible.create({
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

    // Item 5: re-check Scene yang mereferensikan prop ini ketika
    // versi baru dibuat (kecuali minor revision).
    if (!isMinorRevision) {
      await this.triggerContinuityRecheck(
        previous.projectId,
        'prop',
        previous.propId,
      );
    }

    return created;
  }
}