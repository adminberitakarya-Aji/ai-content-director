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

    const scene = await this.prisma.scene.create({
      data: {
        projectId,
        sceneNumber: input.sceneNumber,
        title: input.title,
        episodeId: input.episodeId,
        characterIds: input.characterIds,
        locationId: input.locationId,
        propIds: input.propIds,
        time: input.time,
        action: input.action,
        emotions: input.emotions,
        dialogues: input.dialogues,
      },
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

    const updated = await this.prisma.scene.update({
      where: { id },
      data: {
        sceneNumber: input.sceneNumber,
        title: input.title,
        episodeId: input.episodeId,
        characterIds: input.characterIds,
        locationId: input.locationId,
        propIds: input.propIds,
        time: input.time,
        action: input.action,
        emotions: input.emotions,
        dialogues: input.dialogues,
      },
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
}