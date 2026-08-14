import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type PrismaDelegate = {
  create: (args: any) => Promise<any>;
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
};

@Injectable()
export abstract class BaseBibleService<
  TDelegate extends PrismaDelegate,
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly delegate: TDelegate,
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
   */
  async findAllVersions(projectId: string, entityId: string): Promise<any[]> {
    return this.delegate.findMany({
      where: {
        projectId,
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Mendapatkan semua entitas Bible (versi active/terbaru per entityId).
   * Pola: ambil semua, lalu filter versi terbaru per entity.
   */
  async findAllActive(projectId: string): Promise<any[]> {
    const allVersions = await this.delegate.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    // Ambil versi terbaru per entity
    const activeMap = new Map<string, any>();
    for (const version of allVersions) {
      const key = version['entityId'] || 'default';
      if (!activeMap.has(key)) {
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

    return this.delegate.create({
      data: {
        ...data,
        projectId: previousVersion['projectId'],
        version: newVersionNumber,
        previousVersionId,
        isMinorRevision,
        status: 'draft', // versi baru selalu draft dulu
      },
    });
  }

  /**
   * Mengubah status review entitas Bible.
   */
  async updateStatus(id: string, status: string): Promise<any> {
    await this.findVersion(id);

    return this.delegate.update({
      where: { id },
      data: { status },
    });
  }
}