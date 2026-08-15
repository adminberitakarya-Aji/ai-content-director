import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseBibleService } from '../base-bible.service';
import { ContinuityService } from '../../continuity/continuity.service';

export interface CreateStyleBibleInput {
  visualStyle: string;
  colorPalette: string;
  colorSaturation: string;
  colorContrast: string;
  lightingApproach: string;
  lightingTendency: string;
  texture?: string;
  framingPreference: string;
  lensPreference?: string;
  cameraMovementTendency: string;
  motionStyle?: Record<string, unknown>;
}

@Injectable()
export class StyleBibleService extends BaseBibleService<any> {
  constructor(prisma: PrismaService, continuityService: ContinuityService) {
    // Style Bible tidak punya ID entitas — entityIdField undefined.
    super(prisma, prisma.styleBible, undefined, continuityService);
  }

  /**
   * Membuat Style Bible versi pertama.
   */
  async createStyle(projectId: string, input: CreateStyleBibleInput, status = 'draft') {
    return super.create(projectId, {
      visualStyle: input.visualStyle,
      colorPalette: input.colorPalette,
      colorSaturation: input.colorSaturation,
      colorContrast: input.colorContrast,
      lightingApproach: input.lightingApproach,
      lightingTendency: input.lightingTendency,
      texture: input.texture,
      framingPreference: input.framingPreference,
      lensPreference: input.lensPreference,
      cameraMovementTendency: input.cameraMovementTendency,
      motionStyle: input.motionStyle,
    }, status);
  }

  /**
   * Mendapatkan semua versi Style Bible untuk project.
   */
  async findAllVersions(projectId: string) {
    return super.findAllVersions(projectId);
  }

  /**
   * Mendapatkan Style Bible aktif (versi terbaru).
   */
  async findActive(projectId: string) {
    const all = await this.prisma.styleBible.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    return all[0] || null;
  }

  /**
   * Mendapatkan versi spesifik Style Bible.
   */
  async findVersion(id: string) {
    return super.findVersion(id);
  }

  /**
   * Membuat versi baru dari Style Bible.
   * Versi lama TIDAK ditimpa. Field yang tidak disertakan di `input` otomatis
   * diwarisi dari versi sebelumnya (lihat BaseBibleService.createNewVersion).
   * Style Bible berlaku global per project — entityType 'style' tanpa entityId
   * membuat triggerContinuityRecheck me-recheck semua Scene di project.
   */
  async createNewVersion(
    previousVersionId: string,
    input: Partial<CreateStyleBibleInput>,
    isMinorRevision = false,
  ) {
    return super.createNewVersion(previousVersionId, input, isMinorRevision, 'style');
  }
}