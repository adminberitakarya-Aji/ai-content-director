import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseBibleService } from '../base-bible.service';

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
  constructor(prisma: PrismaService) {
    super(prisma, prisma.styleBible);
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
    return this.prisma.styleBible.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    });
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
    const entity = await this.prisma.styleBible.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException(`Style Bible dengan id ${id} tidak ditemukan`);
    }

    return entity;
  }

  /**
   * Membuat versi baru dari Style Bible.
   * Versi lama TIDAK ditimpa.
   */
  async createNewVersion(
    previousVersionId: string,
    input: Partial<CreateStyleBibleInput>,
    isMinorRevision = false,
  ) {
    const previous = await this.prisma.styleBible.findUnique({
      where: { id: previousVersionId },
    });

    if (!previous) {
      throw new NotFoundException(`Style Bible versi ${previousVersionId} tidak ditemukan`);
    }

    return this.prisma.styleBible.create({
      data: {
        projectId: previous.projectId,
        version: previous.version + 1,
        visualStyle: input.visualStyle ?? previous.visualStyle,
        colorPalette: input.colorPalette ?? previous.colorPalette,
        colorSaturation: input.colorSaturation ?? previous.colorSaturation,
        colorContrast: input.colorContrast ?? previous.colorContrast,
        lightingApproach: input.lightingApproach ?? previous.lightingApproach,
        lightingTendency: input.lightingTendency ?? previous.lightingTendency,
        texture: input.texture ?? previous.texture,
        framingPreference: input.framingPreference ?? previous.framingPreference,
        lensPreference: input.lensPreference ?? previous.lensPreference,
        cameraMovementTendency: input.cameraMovementTendency ?? previous.cameraMovementTendency,
        motionStyle: (input.motionStyle ?? previous.motionStyle) as any,
        previousVersionId,
        isMinorRevision,
        status: 'draft',
      },
    });
  }

  /**
   * Mengubah status review Style Bible.
   */
  async updateStatus(id: string, status: string) {
    await this.findVersion(id);

    return this.prisma.styleBible.update({
      where: { id },
      data: { status },
    });
  }
}