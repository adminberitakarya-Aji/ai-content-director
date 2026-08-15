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
 * Delegate minimal untuk tabel identity (Character/Location/Prop) —
 * dipakai BaseBibleService.create() untuk find-or-create row identity
 * sebelum membuat versi pertama Bible-nya.
 */
export type IdentityDelegate = {
  findFirst: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
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
    /**
     * Delegate tabel identity (Character/Location/Prop) — jika diisi, create()
     * akan otomatis find-or-create row identity sebelum membuat versi 1 Bible.
     * Kosongkan untuk Style Bible (tidak punya tabel identity terpisah).
     */
    protected readonly identityDelegate?: IdentityDelegate,
    /**
     * Nama field FK ke tabel identity di model Bible
     * ('characterEntityId' | 'locationEntityId' | 'propEntityId').
     */
    protected readonly entityRelationField?: string,
  ) {}

  /**
   * Membuat entitas Bible versi 1 (versi pertama).
   * Data field terstruktur diterima sebagai object.
   *
   * Jika identityDelegate diisi (Character/Location/Prop, bukan Style), akan
   * find-or-create row identity terlebih dulu berdasarkan `data[entityIdField]`
   * (business ID, mis. "A01"), lalu isi `entityRelationField` dengan id UUID
   * stabilnya — inilah FK sungguhan yang dipakai Scene/SceneCharacter/SceneProp.
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

    let entityRelationData: Record<string, unknown> = {};

    if (this.identityDelegate && this.entityRelationField && this.entityIdField) {
      const businessId = data[this.entityIdField] as string | undefined;

      if (!businessId) {
        throw new BadRequestException(`${this.entityIdField} wajib diisi`);
      }

      let identity = await this.identityDelegate.findFirst({
        where: { projectId, [this.entityIdField]: businessId },
      });

      if (!identity) {
        identity = await this.identityDelegate.create({
          data: { projectId, [this.entityIdField]: businessId },
        });
      }

      entityRelationData = { [this.entityRelationField]: identity.id };
    }

    return this.delegate.create({
      data: {
        ...data,
        ...entityRelationData,
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
   *
   * Field yang tidak disertakan di `data` otomatis diwarisi dari versi sebelumnya
   * (partial update semantics) — subclass hanya perlu meneruskan field yang berubah.
   *
   * `entityType` WAJIB diteruskan oleh subclass ('character' | 'location' | 'prop' | 'style')
   * agar triggerContinuityRecheck hanya me-recheck Scene yang benar-benar mereferensikan
   * entitas ini (bukan seluruh Scene di project setiap kali).
   */
  async createNewVersion(
    previousVersionId: string,
    data: Record<string, unknown>,
    isMinorRevision = false,
    entityType?: BibleEntityType,
  ): Promise<any> {
    const previousVersion = await this.delegate.findUnique({
      where: { id: previousVersionId },
    });

    if (!previousVersion) {
      throw new NotFoundException(`Bible versi ${previousVersionId} tidak ditemukan`);
    }

    const newVersionNumber = previousVersion['version'] + 1;
    const entityId = this.entityIdField
      ? previousVersion[this.entityIdField]
      : undefined;

    // Warisi seluruh field dari versi sebelumnya, lalu timpa dengan field yang
    // eksplisit diberikan di `data`. Field kontrol (id, timestamp, status, versi,
    // relasi) selalu dihapus dari hasil warisan karena diisi ulang secara eksplisit
    // di bawah — mencegah id lama ikut terbawa ke record baru.
    const inherited: Record<string, unknown> = { ...previousVersion, ...data };
    delete inherited.id;
    delete inherited.createdAt;
    delete inherited.updatedAt;
    delete inherited.previousVersionId;
    delete inherited.nextVersion;
    delete inherited.previousVersion;
    delete inherited.version;
    delete inherited.status;
    delete inherited.isMinorRevision;
    delete inherited.projectId;

    const created = await this.delegate.create({
      data: {
        ...inherited,
        projectId: previousVersion['projectId'],
        version: newVersionNumber,
        previousVersionId,
        isMinorRevision,
        status: 'draft', // versi baru selalu draft dulu
      },
    });

    // Trigger continuity re-check HANYA terhadap Scene yang mereferensikan
    // entitas Bible spesifik ini (kecuali minor revision yang tidak mengubah visual).
    if (!isMinorRevision) {
      await this.triggerContinuityRecheck(
        previousVersion['projectId'],
        entityType,
        entityId,
      );
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
