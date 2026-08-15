import { Injectable } from '@nestjs/common';
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
    super(
      prisma,
      prisma.propBible,
      'propId',
      continuityService,
      prisma.prop,
      'propEntityId',
    );
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
   * Versi lama TIDAK ditimpa. Field yang tidak disertakan di `input` otomatis
   * diwarisi dari versi sebelumnya (lihat BaseBibleService.createNewVersion).
   */
  async createNewVersion(
    previousVersionId: string,
    input: Partial<CreatePropBibleInput>,
    isMinorRevision = false,
  ) {
    return super.createNewVersion(previousVersionId, input, isMinorRevision, 'prop');
  }
}