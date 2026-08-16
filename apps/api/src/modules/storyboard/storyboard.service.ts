import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContinuityService } from '../continuity/continuity.service';
import {
  getContentAdapter,
  ContentAdapter,
} from '@ai-content-director/content-adapters';

export interface CharacterBlockingInput {
  characterId: string;
  position: string;
  orientation: string;
}

export interface CreateShotInput {
  shotNumber: number;
  shotType: string;
  framing: string;
  composition: string;
  cameraPosition: string;
  lens?: string;
  cameraMovement?: string;
  characterBlocking?: CharacterBlockingInput[];
  visualBeat: string;
}

@Injectable()
export class StoryboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly continuityService: ContinuityService,
  ) { }

  /**
   * Ambil Content Adapter aktif untuk Project (Fase 6 — Wiring Content Type).
   *
   * Prinsip (docs/knowledge/01_content_types.md): jenis konten yang adapternya
   * belum aktif tetap diproses dengan aturan default — mengembalikan undefined
   * berarti validasi memakai aturan dasar tanpa aturan spesifik jenis konten.
   */
  private async getContentAdapterForProject(
    projectId: string,
  ): Promise<ContentAdapter | undefined> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { contentType: true },
    });

    if (!project) return undefined;
    return getContentAdapter(project.contentType);
  }

  /**
   * Membuat Shot baru di dalam Scene.
   * Validasi:
   * - Scene ada
   * - shotNumber unik dalam Scene
   * - Semua Character ID di characterBlocking terdaftar di Scene
   * - Shot type, framing, composition, camera position, visual beat wajib
   */
  async createShot(sceneId: string, input: CreateShotInput) {
    const scene = await this.prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      throw new NotFoundException(`Scene dengan id ${sceneId} tidak ditemukan`);
    }

    // Validasi field wajib
    this.validateRequiredFields(input);

    // Validasi shotNumber unik dalam Scene
    const existing = await this.prisma.shot.findUnique({
      where: {
        sceneId_shotNumber: {
          sceneId,
          shotNumber: input.shotNumber,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Shot nomor ${input.shotNumber} sudah ada di Scene ini`,
      );
    }

    // Validasi character blocking hanya berisi karakter yang ada di Scene
    this.validateBlockingCharacters(scene, input.characterBlocking);

    // Validasi aturan Storyboard sesuai Content Adapter (Fase 6)
    const adapter = await this.getContentAdapterForProject(scene.projectId);
    this.validateAgainstAdapter(input, adapter);

    const shot = await this.prisma.shot.create({
      data: {
        sceneId,
        projectId: scene.projectId,
        shotNumber: input.shotNumber,
        shotType: input.shotType,
        framing: input.framing,
        composition: input.composition,
        cameraPosition: input.cameraPosition,
        lens: input.lens,
        cameraMovement: input.cameraMovement,
        characterBlocking: input.characterBlocking as any,
        visualBeat: input.visualBeat,
      },
    });

    // Trigger continuity check di level Shot
    await this.continuityService.runShotCheck(shot.id);

    return shot;
  }

  /**
   * Mendapatkan semua Shot dalam sebuah Scene, diurutkan berdasarkan shotNumber.
   */
  async findShotsByScene(sceneId: string) {
    const scene = await this.prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      throw new NotFoundException(`Scene dengan id ${sceneId} tidak ditemukan`);
    }

    return this.prisma.shot.findMany({
      where: { sceneId },
      orderBy: { shotNumber: 'asc' },
      include: { continuityFlags: true },
    });
  }

  /**
   * Mendapatkan semua Shot dalam sebuah Project.
   */
  async findShotsByProject(projectId: string) {
    return this.prisma.shot.findMany({
      where: { projectId },
      orderBy: [{ sceneId: 'asc' }, { shotNumber: 'asc' }],
      include: { continuityFlags: true },
    });
  }

  /**
   * Mendapatkan satu Shot beserta Scene induknya.
   */
  async findOne(id: string) {
    const shot = await this.prisma.shot.findUnique({
      where: { id },
      include: {
        continuityFlags: true,
        scene: true,
      },
    });

    if (!shot) {
      throw new NotFoundException(`Shot dengan id ${id} tidak ditemukan`);
    }

    return shot;
  }

  /**
   * Mengupdate Shot.
   * Validasi ulang character blocking dan trigger continuity check.
   */
  async updateShot(id: string, input: Partial<CreateShotInput>) {
    const shot = await this.findOne(id);

    // Validasi field wajib jika diubah
    if (input.shotType || input.framing || input.composition || input.cameraPosition || input.visualBeat) {
      this.validateRequiredFields({
        shotNumber: shot.shotNumber,
        shotType: input.shotType ?? shot.shotType,
        framing: input.framing ?? shot.framing,
        composition: input.composition ?? shot.composition,
        cameraPosition: input.cameraPosition ?? shot.cameraPosition,
        visualBeat: input.visualBeat ?? shot.visualBeat,
      });
    }

    // Validasi shotNumber unik jika diubah
    if (input.shotNumber && input.shotNumber !== shot.shotNumber) {
      const existing = await this.prisma.shot.findUnique({
        where: {
          sceneId_shotNumber: {
            sceneId: shot.sceneId,
            shotNumber: input.shotNumber,
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Shot nomor ${input.shotNumber} sudah ada di Scene ini`,
        );
      }
    }

    // Validasi character blocking jika diubah
    if (input.characterBlocking) {
      const scene = await this.prisma.scene.findUnique({
        where: { id: shot.sceneId },
      });
      if (scene) {
        this.validateBlockingCharacters(scene, input.characterBlocking);
      }
    }

    // Validasi aturan Storyboard sesuai Content Adapter (Fase 6)
    const adapter = await this.getContentAdapterForProject(shot.projectId);
    this.validateAgainstAdapter(
      {
        shotNumber: input.shotNumber ?? shot.shotNumber,
        shotType: input.shotType ?? shot.shotType,
        framing: input.framing ?? shot.framing,
        composition: input.composition ?? shot.composition,
        cameraPosition: input.cameraPosition ?? shot.cameraPosition,
        lens: input.lens ?? shot.lens ?? undefined,
        cameraMovement: input.cameraMovement ?? shot.cameraMovement ?? undefined,
        characterBlocking:
          input.characterBlocking ??
          ((shot.characterBlocking as unknown as CharacterBlockingInput[]) ||
            undefined),
        visualBeat: input.visualBeat ?? shot.visualBeat,
      },
      adapter,
    );

    const updated = await this.prisma.shot.update({
      where: { id },
      data: {
        shotNumber: input.shotNumber,
        shotType: input.shotType,
        framing: input.framing,
        composition: input.composition,
        cameraPosition: input.cameraPosition,
        lens: input.lens,
        cameraMovement: input.cameraMovement,
        characterBlocking: input.characterBlocking as any,
        visualBeat: input.visualBeat,
      },
    });

    // Trigger continuity check di level Shot
    await this.continuityService.runShotCheck(id);

    return updated;
  }

  /**
   * Mengubah urutan Shot dalam Scene (reorder).
   * Menerima array { id, shotNumber } dan mengupdate semuanya dalam transaksi.
   *
   * Setelah reorder, continuity check di-jalankan ulang untuk semua Shot di Scene ini —
   * karena ContinuityService.checkShot menentukan "Shot sebelumnya" berdasarkan
   * shotNumber - 1, jadi reorder mengubah pasangan Shot yang dibandingkan untuk
   * validasi blocking consistency (lihat docs/instructions/06_storyboard_rules.md).
   */
  async reorderShots(sceneId: string, orderedIds: string[]) {
    const scene = await this.prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      throw new NotFoundException(`Scene dengan id ${sceneId} tidak ditemukan`);
    }

    const shots = await this.prisma.shot.findMany({
      where: { sceneId },
    });

    if (shots.length !== orderedIds.length) {
      throw new BadRequestException(
        'Jumlah shot dalam urutan tidak sesuai dengan jumlah shot di Scene',
      );
    }

    const shotMap = new Map(shots.map((s: { id: string }) => [s.id, s]));
    for (const id of orderedIds) {
      if (!shotMap.has(id)) {
        throw new BadRequestException(`Shot ${id} tidak ada di Scene ini`);
      }
    }

    // Update shotNumber sesuai urutan baru dalam transaksi
    const updates = orderedIds.map((id, index) =>
      this.prisma.shot.update({
        where: { id },
        data: { shotNumber: index + 1 },
      }),
    );

    await this.prisma.$transaction(updates);

    // Re-check continuity untuk semua Shot di Scene ini — urutan baru berarti
    // pasangan "Shot vs Shot sebelumnya" berubah untuk validasi blocking.
    for (const id of orderedIds) {
      await this.continuityService.runShotCheck(id);
    }

    return this.findShotsByScene(sceneId);
  }

  /**
   * Menghapus Shot.
   */
  async removeShot(id: string) {
    await this.findOne(id);
    return this.prisma.shot.delete({ where: { id } });
  }

  /**
   * Validasi field wajib Shot sesuai Storyboard Rules:
   * shot type, framing, composition, camera position, visual beat.
   */
  private validateRequiredFields(input: CreateShotInput) {
    if (!input.shotType) {
      throw new BadRequestException('Shot type wajib diisi');
    }
    if (!input.framing) {
      throw new BadRequestException('Framing wajib diisi');
    }
    if (!input.composition) {
      throw new BadRequestException('Composition wajib diisi');
    }
    if (!input.cameraPosition) {
      throw new BadRequestException('Camera position wajib diisi');
    }
    if (!input.visualBeat) {
      throw new BadRequestException('Visual beat wajib diisi');
    }
  }

  /**
   * Validasi Shot terhadap aturan Storyboard dari Content Adapter (Fase 6).
   *
   * Jika adapter belum aktif untuk jenis konten ini (undefined), validasi
   * memakai aturan dasar saja — sesuai prinsip docs/knowledge/01_content_types.md:
   * jenis konten tanpa adapter tetap diproses dengan aturan default.
   *
   * Aturan adapter yang divalidasi (dari getStoryboardRules):
   * - requireCameraMovement: camera movement wajib diisi
   * - requireLens: lens wajib diisi
   * - requireCharacterBlocking: character blocking wajib diisi
   */
  private validateAgainstAdapter(
    input: CreateShotInput,
    adapter?: ContentAdapter,
  ) {
    if (!adapter) return;

    const rules = adapter.getStoryboardRules() as {
      requireCameraMovement?: boolean;
      requireLens?: boolean;
      requireCharacterBlocking?: boolean;
    };

    if (rules.requireCameraMovement && !input.cameraMovement) {
      throw new BadRequestException(
        `Camera movement wajib diisi untuk jenis konten ${adapter.displayName}`,
      );
    }

    if (rules.requireLens && !input.lens) {
      throw new BadRequestException(
        `Lens wajib diisi untuk jenis konten ${adapter.displayName}`,
      );
    }

    if (
      rules.requireCharacterBlocking &&
      (!input.characterBlocking || input.characterBlocking.length === 0)
    ) {
      throw new BadRequestException(
        `Character blocking wajib diisi untuk jenis konten ${adapter.displayName}`,
      );
    }
  }

  /**
   * Validasi character blocking — setiap karakter yang diblokir
   * harus terdaftar di Scene induk.
   */
  private validateBlockingCharacters(
    scene: { characterIds: unknown },
    blocking?: CharacterBlockingInput[],
  ) {
    if (!blocking || blocking.length === 0) return;

    const sceneCharacterIds = new Set(scene.characterIds as string[]);

    for (const b of blocking) {
      if (!sceneCharacterIds.has(b.characterId)) {
        throw new BadRequestException(
          `Karakter ${b.characterId} di character blocking tidak terdaftar di Scene ini`,
        );
      }
    }
  }
}