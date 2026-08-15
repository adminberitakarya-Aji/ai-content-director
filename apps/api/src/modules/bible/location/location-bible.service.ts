import { Injectable } from '@nestjs/common';
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
    super(
      prisma,
      prisma.locationBible,
      'locationId',
      continuityService,
      prisma.location,
      'locationEntityId',
    );
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
   * Versi lama TIDAK ditimpa. Field yang tidak disertakan di `input` otomatis
   * diwarisi dari versi sebelumnya (lihat BaseBibleService.createNewVersion).
   */
  async createNewVersion(
    previousVersionId: string,
    input: Partial<CreateLocationBibleInput>,
    isMinorRevision = false,
  ) {
    return super.createNewVersion(previousVersionId, input, isMinorRevision, 'location');
  }
}