import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseBibleService } from '../base-bible.service';

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
  constructor(prisma: PrismaService) {
    super(prisma, prisma.locationBible);
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
    return this.prisma.locationBible.findMany({
      where: { projectId, locationId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Mendapatkan semua lokasi aktif (versi terbaru per locationId).
   */
  async findAllActive(projectId: string) {
    const all = await this.prisma.locationBible.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    const activeMap = new Map<string, any>();
    for (const version of all) {
      if (!activeMap.has(version.locationId)) {
        activeMap.set(version.locationId, version);
      }
    }

    return Array.from(activeMap.values());
  }

  /**
   * Mendapatkan versi spesifik Location Bible.
   */
  async findVersion(id: string) {
    const entity = await this.prisma.locationBible.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException(`Location Bible dengan id ${id} tidak ditemukan`);
    }

    return entity;
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

    return this.prisma.locationBible.create({
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
  }

  /**
   * Mengubah status review Location Bible.
   */
  async updateStatus(id: string, status: string) {
    await this.findVersion(id);

    return this.prisma.locationBible.update({
      where: { id },
      data: { status },
    });
  }
}