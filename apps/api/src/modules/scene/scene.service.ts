import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContinuityService } from '../continuity/continuity.service';

export interface CreateSceneInput {
  sceneNumber: number;
  title?: string;
  episodeId?: string;
  characterIds: string[];
  locationId: string;
  propIds?: string[];
  time: string;
  action: string;
  emotions: { characterId: string; emotion: string }[];
  dialogues?: { characterId: string; line: string; order: number }[];
}

@Injectable()
export class SceneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly continuityService: ContinuityService,
  ) {}

  /**
   * Membuat Scene baru dengan validasi:
   * - Project ada
   * - Semua Character ID terdaftar di Bible dan berstatus approved
   * - Location ID terdaftar di Bible dan berstatus approved
   * - Semua Prop ID terdaftar di Bible dan berstatus approved
   */
  async create(projectId: string, input: CreateSceneInput) {
    // Validasi project ada
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project dengan id ${projectId} tidak ditemukan`);
    }

    // Validasi karakter approved
    await this.validateCharacters(projectId, input.characterIds);

    // Validasi lokasi approved
    await this.validateLocation(projectId, input.locationId);

    // Validasi prop approved
    if (input.propIds && input.propIds.length > 0) {
      await this.validateProps(projectId, input.propIds);
    }

    // Resolve id identity (Character/Location/Prop) untuk FK sungguhan —
    // dijamin ada karena validate*() di atas sudah memastikan Bible approved
    // ada, dan create Bible versi 1 selalu membuat row identity lebih dulu.
    const locationEntity = await this.resolveLocationEntity(projectId, input.locationId);
    const characterEntities = await this.resolveCharacterEntities(projectId, input.characterIds);
    const propEntities = input.propIds?.length
      ? await this.resolvePropEntities(projectId, input.propIds)
      : [];

    const scene = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.scene.create({
        data: {
          projectId,
          sceneNumber: input.sceneNumber,
          title: input.title,
          episodeId: input.episodeId,
          characterIds: input.characterIds,
          locationId: input.locationId,
          locationEntityId: locationEntity.id,
          propIds: input.propIds,
          time: input.time,
          action: input.action,
          emotions: input.emotions,
          dialogues: input.dialogues,
        },
      });

      if (characterEntities.length > 0) {
        await tx.sceneCharacter.createMany({
          data: characterEntities.map((c: { id: string }) => ({
            sceneId: created.id,
            characterEntityId: c.id,
          })),
        });
      }

      if (propEntities.length > 0) {
        await tx.sceneProp.createMany({
          data: propEntities.map((p: { id: string }) => ({
            sceneId: created.id,
            propEntityId: p.id,
          })),
        });
      }

      return created;
    });

    // Trigger continuity check otomatis
    await this.continuityService.runCheck(scene.id);

    return scene;
  }

  async findAll(projectId: string) {
    return this.prisma.scene.findMany({
      where: { projectId },
      orderBy: { sceneNumber: 'asc' },
      include: { continuityFlags: true },
    });
  }

  async findOne(id: string) {
    const scene = await this.prisma.scene.findUnique({
      where: { id },
      include: { continuityFlags: true },
    });

    if (!scene) {
      throw new NotFoundException(`Scene dengan id ${id} tidak ditemukan`);
    }

    return scene;
  }

  async update(id: string, input: Partial<CreateSceneInput>) {
    const scene = await this.findOne(id);

    // Validasi ulang jika ada perubahan referensi
    if (input.characterIds) {
      await this.validateCharacters(scene.projectId, input.characterIds);
    }
    if (input.locationId) {
      await this.validateLocation(scene.projectId, input.locationId);
    }
    if (input.propIds && input.propIds.length > 0) {
      await this.validateProps(scene.projectId, input.propIds);
    }

    const locationEntity = input.locationId
      ? await this.resolveLocationEntity(scene.projectId, input.locationId)
      : undefined;
    const characterEntities = input.characterIds
      ? await this.resolveCharacterEntities(scene.projectId, input.characterIds)
      : undefined;
    const propEntities = input.propIds
      ? await this.resolvePropEntities(scene.projectId, input.propIds)
      : undefined;

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const result = await tx.scene.update({
        where: { id },
        data: {
          sceneNumber: input.sceneNumber,
          title: input.title,
          episodeId: input.episodeId,
          characterIds: input.characterIds,
          locationId: input.locationId,
          locationEntityId: locationEntity?.id,
          propIds: input.propIds,
          time: input.time,
          action: input.action,
          emotions: input.emotions,
          dialogues: input.dialogues,
        },
      });

      // Sinkronkan ulang join table HANYA jika field terkait memang diubah —
      // hapus lalu buat ulang (lebih sederhana & aman daripada diff manual).
      if (characterEntities) {
        await tx.sceneCharacter.deleteMany({ where: { sceneId: id } });
        if (characterEntities.length > 0) {
          await tx.sceneCharacter.createMany({
            data: characterEntities.map((c: { id: string }) => ({
              sceneId: id,
              characterEntityId: c.id,
            })),
          });
        }
      }

      if (propEntities) {
        await tx.sceneProp.deleteMany({ where: { sceneId: id } });
        if (propEntities.length > 0) {
          await tx.sceneProp.createMany({
            data: propEntities.map((p: { id: string }) => ({
              sceneId: id,
              propEntityId: p.id,
            })),
          });
        }
      }

      return result;
    });

    // Trigger continuity check otomatis
    await this.continuityService.runCheck(id);

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.scene.delete({ where: { id } });
  }

  private async validateCharacters(projectId: string, characterIds: string[]) {
    for (const characterId of characterIds) {
      const character = await this.prisma.characterBible.findFirst({
        where: {
          projectId,
          characterId,
          status: 'approved',
        },
        orderBy: { version: 'desc' },
      });

      if (!character) {
        throw new BadRequestException(
          `Karakter ${characterId} tidak ditemukan atau belum berstatus approved di Bible`,
        );
      }
    }
  }

  private async validateLocation(projectId: string, locationId: string) {
    const location = await this.prisma.locationBible.findFirst({
      where: {
        projectId,
        locationId,
        status: 'approved',
      },
      orderBy: { version: 'desc' },
    });

    if (!location) {
      throw new BadRequestException(
        `Lokasi ${locationId} tidak ditemukan atau belum berstatus approved di Bible`,
      );
    }
  }

  private async validateProps(projectId: string, propIds: string[]) {
    for (const propId of propIds) {
      const prop = await this.prisma.propBible.findFirst({
        where: {
          projectId,
          propId,
          status: 'approved',
        },
        orderBy: { version: 'desc' },
      });

      if (!prop) {
        throw new BadRequestException(
          `Prop ${propId} tidak ditemukan atau belum berstatus approved di Bible`,
        );
      }
    }
  }

  /**
   * Resolve business ID lokasi (mis. "L01") ke row identity Location (id UUID stabil).
   * Dijamin ada karena validateLocation() sudah memastikan Bible-nya approved,
   * dan create Bible versi 1 selalu membuat row identity lebih dulu — kalau
   * sampai tidak ketemu di sini, itu indikasi inkonsistensi data yang harus
   * diketahui, bukan disembunyikan.
   */
  private async resolveLocationEntity(projectId: string, locationId: string) {
    const entity = await this.prisma.location.findFirst({
      where: { projectId, locationId },
    });

    if (!entity) {
      throw new BadRequestException(
        `Location identity untuk ${locationId} tidak ditemukan — data tidak konsisten`,
      );
    }

    return entity;
  }

  private async resolveCharacterEntities(projectId: string, characterIds: string[]) {
    const entities = await this.prisma.character.findMany({
      where: { projectId, characterId: { in: characterIds } },
    });

    if (entities.length !== characterIds.length) {
      const found = new Set(entities.map((e: { characterId: string }) => e.characterId));
      const missing = characterIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Character identity untuk ${missing.join(', ')} tidak ditemukan — data tidak konsisten`,
      );
    }

    return entities;
  }

  private async resolvePropEntities(projectId: string, propIds: string[]) {
    const entities = await this.prisma.prop.findMany({
      where: { projectId, propId: { in: propIds } },
    });

    if (entities.length !== propIds.length) {
      const found = new Set(entities.map((e: { propId: string }) => e.propId));
      const missing = propIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Prop identity untuk ${missing.join(', ')} tidak ditemukan — data tidak konsisten`,
      );
    }

    return entities;
  }
}