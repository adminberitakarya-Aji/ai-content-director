import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseBibleService } from '../base-bible.service';
import { ContinuityService } from '../../continuity/continuity.service';

export interface CreateLocationBibleInput {
  locationId: string;
  name: string;
  exterior?: Record<string, unknown>;
  interior?: Record<string, unknown>;
  architecture?: Record<string, unknown>;
  lighting: Record<string, unknown>;
  atmosphere: string;
  referenceImages?: Record<string, unknown>[];
}

@Injectable()
export class LocationBibleService extends BaseBibleService<any> {
  constructor(prisma: PrismaService, continuityService: ContinuityService) {
    super(prisma, prisma.locationBible, 'locationId', continuityService);
  }

  /**
   * Membuat Location Bible versi pertama.
   */
  async createLocation(projectId: string, input: CreateLocationBibleInput, status = 'draft') {
    return super.create(projectId, {
      locationId: input.locationId,
      name: input.name,
      exterior: input.exterior,
      interior: input.interior,
      architecture: input.architecture,
      lighting: input.lighting,
      atmosphere: input.atmosphere,
      referenceImages: input.referenceImages,
    }, status);
  }

  /**
   * Mendapatkan semua versi dari satu lokasi.
   */
  async findAllVersions(projectId: string, locationId: string) {
    return super.findAllVersions(projectId, locationId);
  }

  /**
   * Mendapatkan semua lokasi aktif (versi terbaru per locationId).
   */
  async findAllActive(projectId: string) {
    return super.findAllActive(projectId);
  }

  /**
   * Mendapatkan versi spesifik Location Bible.
   */
  async findVersion(id: string) {
    return super.findVersion(id);
  }

  /**
   * Membuat versi baru dari Location Bible.
   * Versi lama TIDAK ditimpa.
   */
  async createNewVersion(
    previousVersionId: string,
    input: Partial<CreateLocationBibleInput>,
    isMinorRevision = false,
  ) {
    const previous = await this.prisma.locationBible.findUnique({
      where: { id: previousVersionId },
    });

    if (!previous) {
      throw new NotFoundException(`Location Bible versi ${previousVersionId} tidak ditemukan`);
    }

    const created = await this.prisma.locationBible.create({
      data: {
        projectId: previous.projectId,
        locationId: previous.locationId,
        version: previous.version + 1,
        name: input.name ?? previous.name,
        exterior: (input.exterior ?? previous.exterior) as any,
        interior: (input.interior ?? previous.interior) as any,
        architecture: (input.architecture ?? previous.architecture) as any,
        lighting: (input.lighting ?? previous.lighting) as any,
        atmosphere: input.atmosphere ?? previous.atmosphere,
        referenceImages: (input.referenceImages ?? previous.referenceImages) as any,
        previousVersionId,
        isMinorRevision,
        status: 'draft',
      },
    });

    // Item 5: re-check Scene yang mereferensikan lokasi ini ketika
    // versi baru dibuat (kecuali minor revision).
    if (!isMinorRevision) {
      await this.triggerContinuityRecheck(
        previous.projectId,
        'location',
        previous.locationId,
      );
    }

    return created;
  }
}