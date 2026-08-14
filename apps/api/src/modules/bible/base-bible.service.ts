import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContinuityService } from '../continuity/continuity.service';

export type PrismaDelegate = {
  create: (args: any) => Promise<any>;
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
};

/**
 * Transisi status review yang valid — dipakai bersama oleh
 * BaseBibleService dan ReviewService agar aturan konsisten.
 */
export const VALID_BIBLE_TRANSITIONS: Record<string, string[]> = {
  draft: ['review', 'rejected'],
  review: ['approved', 'rejected', 'draft'],
  approved: ['draft', 'rejected'],
  rejected: ['draft', 'review'],
};

export function assertValidStatusTransition(
  currentStatus: string,
  newStatus: string,
): void {
  const allowed = VALID_BIBLE_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new BadRequestException(
      `Transisi status invalid: ${currentStatus} → ${newStatus}. ` +
        `Transisi yang diizinkan: ${allowed.join(', ') || 'none'}`,
    );
  }
}

export type BibleEntityType = 'character' | 'location' | 'prop' | 'style';

@Injectable()
export abstract class BaseBibleService<
  TDelegate extends PrismaDelegate,
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly delegate: TDelegate,
    /**
     * Nama field ID entitas di model Prisma
     * ('characterId' | 'locationId' | 'propId').
     * Untuk Style Bible (satu gaya per project, tanpa ID entitas) gunakan undefined.
     */
    protected readonly entityIdField?: string,
    protected readonly continuityService?: ContinuityService,
  ) {}

  /**
   * Membuat entitas Bible versi 1 (versi pertama).
   * Data field terstruktur diterima sebagai object.
   */
  async create(
    projectId: string,
    data: Record<string, unknown>,
    status = 'draft',
  ): Promise<any> {
    // Cek project ada
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project dengan id ${projectId} tidak ditemukan`);
    }

    if (status !== 'draft' && status !== 'review') {
      throw new BadRequestException(
        'Status awal Bible harus "draft" atau "review", bukan ' + status,
      );
    }

    return this.delegate.create({
      data: {
        ...data,
        projectId,
        version: 1,
        status,
      },
    });
  }

  /**
   * Mendapatkan semua versi dari satu entitas Bible.
   * Untuk Style Bible (tanpa entityIdField), kembalikan semua versi project.
   */
  async findAllVersions(projectId: string, entityId?: string): Promise<any[]> {
    const where: Record<string, unknown> = { projectId };
    if (this.entityIdField && entityId) {
      where[this.entityIdField] = entityId;
    }

    return this.delegate.findMany({
      where,
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Mendapatkan semua entitas Bible (versi active/terbaru per entity).
   * Untuk Style Bible, kembalikan versi terbaru saja (array 0/1 item).
   */
  async findAllActive(projectId: string): Promise<any[]> {
    const allVersions = await this.delegate.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    if (!this.entityIdField) {
      // Style Bible: satu entitas per project — versi terbaru saja.
      return allVersions.length > 0 ? [allVersions[0]] : [];
    }

    const activeMap = new Map<string, any>();
    for (const version of allVersions) {
      const key = version[this.entityIdField];
      if (key !== undefined && key !== null && !activeMap.has(key)) {
        activeMap.set(key, version);
      }
    }

    return Array.from(activeMap.values());
  }

  /**
   * Mendapatkan versi spesifik dari entitas Bible.
   */
  async findVersion(
    id: string,
  ): Promise<any> {
    const entity = await this.delegate.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException(`Bible dengan id ${id} tidak ditemukan`);
    }

    return entity;
  }

  /**
   * Membuat versi baru dari entitas Bible.
   * Versi lama TIDAK ditimpa — disimpan sebagai versi baru dengan previousVersionId.
   */
  async createNewVersion(
    previousVersionId: string,
    data: Record<string, unknown>,
    isMinorRevision = false,
  ): Promise<any> {
    // Ambil versi lama untuk mendapatkan projectId, entityId, dan version number
    const previousVersion = await this.delegate.findUnique({
      where: { id: previousVersionId },
    });

    if (!previousVersion) {
      throw new NotFoundException(`Bible versi ${previousVersionId} tidak ditemukan`);
    }

    const newVersionNumber = previousVersion['version'] + 1;

    const created = await this.delegate.create({
      data: {
        ...data,
        projectId: previousVersion['projectId'],
        version: newVersionNumber,
        previousVersionId,
        isMinorRevision,
        status: 'draft', // versi baru selalu draft dulu
      },
    });

    // Item 5: trigger continuity re-check terhadap Scene yang mereferensikan
    // entitas Bible ini (kecuali minor revision yang tidak mengubah visual).
    if (!isMinorRevision) {
      await this.triggerContinuityRecheck(previousVersion['projectId']);
    }

    return created;
  }

  /**
   * Mengubah status review entitas Bible — dengan validasi transisi (item 3).
   */
  async updateStatus(id: string, status: string): Promise<any> {
    const entity = await this.findVersion(id);

    assertValidStatusTransition(entity.status, status);

    return this.delegate.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Menemukan Scene yang mereferensikan entitas Bible tertentu, lalu
   * menjalankan continuity check untuk masing-masing.
   *
   * Sub-class memanggil ini setelah createNewVersion (kecuali minor revision)
   * agar perubahan Bible memicu re-validasi Scene terkait.
   */
  protected async triggerContinuityRecheck(
    projectId: string,
    entityType?: BibleEntityType,
    entityId?: string,
  ): Promise<void> {
    if (!this.continuityService) return;

    const scenes = await this.prisma.scene.findMany({
      where: { projectId },
      select: { id: true, characterIds: true, locationId: true, propIds: true },
    });

    for (const scene of scenes) {
      let matches = false;

      if (entityType === 'character' && entityId) {
        const characterIds = (scene.characterIds as string[]) || [];
        matches = characterIds.includes(entityId);
      } else if (entityType === 'location' && entityId) {
        matches = scene.locationId === entityId;
      } else if (entityType === 'prop' && entityId) {
        const propIds = (scene.propIds as string[]) || [];
        matches = propIds.includes(entityId);
      } else {
        // style (atau tanpa type) → validasi ulang semua Scene di project.
        matches = true;
      }

      if (matches) {
        await this.continuityService.runCheck(scene.id);
      }
    }
  }
}
