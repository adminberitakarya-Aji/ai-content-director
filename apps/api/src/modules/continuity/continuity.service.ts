import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ContinuityCheckResult {
  sceneId: string;
  flags: {
    flagType: string;
    fieldName: string;
    expectedValue: string;
    actualValue: string;
    description: string;
  }[];
}

export interface ShotContinuityCheckResult {
  shotId: string;
  flags: {
    flagType: string;
    fieldName: string;
    expectedValue: string;
    actualValue: string;
    description: string;
  }[];
}

@Injectable()
export class ContinuityService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Continuity Lapis 1 — Data Consistency.
   * Memeriksa Scene terhadap versi Bible aktif (approved terbaru):
   * - Character ID: karakter ada & approved
   * - Wardrobe: karakter punya minimal satu set wardrobe default
   * - Location ID: lokasi ada & approved
   * - Prop ID: prop ada & approved
   * - Time: waktu Scene selaras dengan lighting Location Bible
   * - Style: Scene tidak menyimpang dari Style Bible
   * - Scene relationship: Scene berurutan di waktu sama berbagi karakter
   */
  async checkScene(sceneId: string): Promise<ContinuityCheckResult> {
    const scene = await this.prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      return { sceneId, flags: [] };
    }

    const flags: ContinuityCheckResult['flags'] = [];

    // 1. Validasi Character ID + Wardrobe
    const characterIds = scene.characterIds as string[];
    for (const characterId of characterIds) {
      const character = await this.prisma.characterBible.findFirst({
        where: {
          projectId: scene.projectId,
          characterId,
          status: 'approved',
        },
        orderBy: { version: 'desc' },
      });

      if (!character) {
        flags.push({
          flagType: 'character_id',
          fieldName: 'characterIds',
          expectedValue: `Karakter ${characterId} approved di Bible`,
          actualValue: `Karakter ${characterId} tidak ditemukan/belum approved`,
          description: `Karakter ${characterId} direferensikan di Scene tapi tidak ada versi approved di Character Bible`,
        });
      } else {
        // Item 4a: Wardrobe consistency — wajib minimal satu set default.
        const wardrobes = (character.wardrobes as any[]) || [];
        const hasDefaultSet = wardrobes.some((w) => w?.isDefault === true);
        if (wardrobes.length === 0 || !hasDefaultSet) {
          flags.push({
            flagType: 'wardrobe',
            fieldName: 'wardrobes',
            expectedValue: `Karakter ${characterId} memiliki minimal satu set wardrobe default (isDefault: true)`,
            actualValue: `Karakter ${characterId} tidak punya wardrobe default terdaftar`,
            description: `Karakter ${characterId} tidak memiliki wardrobe default di Character Bible — tambahkan minimal satu set dengan isDefault: true`,
          });
        }
      }
    }

    // 2. Validasi Location ID
    const location = await this.prisma.locationBible.findFirst({
      where: {
        projectId: scene.projectId,
        locationId: scene.locationId,
        status: 'approved',
      },
      orderBy: { version: 'desc' },
    });

    if (!location) {
      flags.push({
        flagType: 'location_id',
        fieldName: 'locationId',
        expectedValue: `Lokasi ${scene.locationId} approved di Bible`,
        actualValue: `Lokasi ${scene.locationId} tidak ditemukan/belum approved`,
        description: `Lokasi ${scene.locationId} direferensikan di Scene tapi tidak ada versi approved di Location Bible`,
      });
    }

    // 3. Validasi Prop ID
    const propIds = (scene.propIds as string[]) || [];
    for (const propId of propIds) {
      const prop = await this.prisma.propBible.findFirst({
        where: {
          projectId: scene.projectId,
          propId,
          status: 'approved',
        },
        orderBy: { version: 'desc' },
      });

      if (!prop) {
        flags.push({
          flagType: 'prop_id',
          fieldName: 'propIds',
          expectedValue: `Prop ${propId} approved di Bible`,
          actualValue: `Prop ${propId} tidak ditemukan/belum approved`,
          description: `Prop ${propId} direferensikan di Scene tapi tidak ada versi approved di Prop Bible`,
        });
      }
    }

    // 4. Validasi Time vs Lighting Location Bible
    if (location) {
      const lighting = location.lighting as any;
      const commonTime = lighting?.commonTimeOfDay || '';
      if (commonTime && !scene.time.toLowerCase().includes(commonTime.toLowerCase())) {
        flags.push({
          flagType: 'time',
          fieldName: 'time',
          expectedValue: `Waktu Scene selaras dengan lighting Location Bible (${commonTime})`,
          actualValue: scene.time,
          description: `Waktu Scene "${scene.time}" tidak selaras dengan waktu umum lokasi "${commonTime}" di Location Bible`,
        });
      }
    }

    // 5. Validasi Style Bible ada
    const style = await this.prisma.styleBible.findFirst({
      where: {
        projectId: scene.projectId,
        status: 'approved',
      },
      orderBy: { version: 'desc' },
    });

    if (!style) {
      flags.push({
        flagType: 'style',
        fieldName: 'styleBible',
        expectedValue: 'Style Bible approved untuk Project',
        actualValue: 'Tidak ada Style Bible approved',
        description: 'Project belum memiliki Style Bible berstatus approved — Scene tidak bisa divalidasi terhadap gaya visual',
      });
    }

    // 6. Validasi Scene relationship (item 4b)
    const sceneRelationshipFlags = await this.checkSceneRelationship(scene);
    flags.push(...sceneRelationshipFlags);

    return { sceneId, flags };
  }

  /**
   * Scene relationship — validasi sederhana antar Scene berurutan.
   *
   * Jika dua Scene yang berurutan langsung (sceneNumber berdekatan) berbagi
   * waktu yang sama persis (time string identik) tetapi tidak memiliki
   * karakter yang sama, ini indikasi potensi inkonsistensi — karakter yang
   * muncul hilang/berganti tanpa penjelasan naratif pada waktu yang sama.
   */
  private async checkSceneRelationship(
    scene: {
      id: string;
      projectId: string;
      sceneNumber: number;
      characterIds: unknown;
      time: string;
    },
  ): Promise<ContinuityCheckResult['flags']> {
    const flags: ContinuityCheckResult['flags'] = [];

    const neighbors = await this.prisma.scene.findMany({
      where: {
        projectId: scene.projectId,
        sceneNumber: {
          in: [scene.sceneNumber - 1, scene.sceneNumber + 1],
        },
      },
    });

    const currentCharacters = new Set(scene.characterIds as string[]);
    const currentTime = scene.time.trim().toLowerCase();

    for (const neighbor of neighbors) {
      const neighborCharacters = new Set(neighbor.characterIds as string[]);
      const shareCharacter = [...currentCharacters].some((id) =>
        neighborCharacters.has(id),
      );

      const sameTime =
        currentTime.length > 0 &&
        neighbor.time.trim().toLowerCase() === currentTime;

      if (sameTime && !shareCharacter && neighborCharacters.size > 0) {
        const neighborCharacterList = [...neighborCharacters].join(', ');
        const currentCharacterList =
          [...currentCharacters].join(', ') || '(tidak ada)';

        flags.push({
          flagType: 'scene_relationship',
          fieldName: 'characterIds',
          expectedValue: `Scene berurutan dengan waktu yang sama (${scene.time}) harus berbagi karakter`,
          actualValue: `Scene ${neighbor.sceneNumber} (${neighborCharacterList}) vs Scene ${scene.sceneNumber} (${currentCharacterList})`,
          description: `Scene ${neighbor.sceneNumber} dan Scene ${scene.sceneNumber} terjadi pada waktu yang sama persis ("${scene.time}") namun tidak ada karakter yang sama — periksa apakah ini transisi yang disengaja`,
        });
      }
    }

    return flags;
  }

  /**
   * Menyimpan ContinuityFlag ke database.
   * Flag lama yang unresolved dihapus dulu, lalu dibuat ulang berdasarkan hasil check terbaru —
   * KECUALI pelanggaran yang sama persis sudah pernah ditandai resolved(accepted) oleh pengguna
   * (lihat docs/instructions/03_continuity_rules.md: penyimpangan yang diterima tidak boleh
   * memblokir proses lagi). Flag resolved(accepted) tidak pernah dihapus di sini.
   */
  async saveFlags(result: ContinuityCheckResult): Promise<void> {
    // Hapus flag lama yang unresolved untuk scene ini
    await this.prisma.continuityFlag.deleteMany({
      where: {
        sceneId: result.sceneId,
        status: 'unresolved',
      },
    });

    if (result.flags.length === 0) return;

    const scene = await this.prisma.scene.findUnique({
      where: { id: result.sceneId },
    });

    if (!scene) return;

    // Ambil pelanggaran yang sudah pernah diterima pengguna untuk Scene ini,
    // supaya tidak dibuat ulang sebagai flag unresolved yang memblokir proses.
    const acceptedFlags = await this.prisma.continuityFlag.findMany({
      where: {
        sceneId: result.sceneId,
        status: 'resolved(accepted)',
      },
    });

    const isAlreadyAccepted = (flag: ContinuityCheckResult['flags'][number]) =>
      acceptedFlags.some(
        (f: { flagType: string; fieldName: string; expectedValue: string; actualValue: string }) =>
          f.flagType === flag.flagType &&
          f.fieldName === flag.fieldName &&
          f.expectedValue === flag.expectedValue &&
          f.actualValue === flag.actualValue,
      );

    for (const flag of result.flags) {
      if (isAlreadyAccepted(flag)) continue;

      await this.prisma.continuityFlag.create({
        data: {
          sceneId: result.sceneId,
          projectId: scene.projectId,
          flagType: flag.flagType,
          fieldName: flag.fieldName,
          expectedValue: flag.expectedValue,
          actualValue: flag.actualValue,
          description: flag.description,
          status: 'unresolved',
        },
      });
    }
  }

  /**
   * Menjalankan continuity check dan menyimpan hasilnya.
   */
  async runCheck(sceneId: string): Promise<ContinuityCheckResult> {
    const result = await this.checkScene(sceneId);
    await this.saveFlags(result);
    return result;
  }

  /**
   * Mendapatkan semua ContinuityFlag untuk sebuah Scene.
   */
  async getFlagsForScene(sceneId: string) {
    return this.prisma.continuityFlag.findMany({
      where: { sceneId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mendapatkan semua ContinuityFlag unresolved untuk sebuah Project.
   */
  async getUnresolvedFlags(projectId: string) {
    return this.prisma.continuityFlag.findMany({
      where: { projectId, status: 'unresolved' },
      orderBy: { createdAt: 'desc' },
      include: { scene: true },
    });
  }

  /**
   * Continuity Lapis 1 — Data Consistency di level Shot.
   *
   * Memeriksa Shot terhadap Scene induk dan Shot lain dalam Scene yang sama:
   * - Character Blocking: setiap karakter yang diblokir harus terdaftar di Scene
   * - Blocking consistency: posisi karakter di Shot ini harus konsisten dengan
   *   Shot sebelumnya dalam Scene yang sama, kecuali ada pergerakan eksplisit
   *   yang dicatat di Camera Movement atau Action.
   */
  async checkShot(shotId: string): Promise<ShotContinuityCheckResult> {
    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
      include: { scene: true },
    });

    if (!shot) {
      return { shotId, flags: [] };
    }

    const flags: ShotContinuityCheckResult['flags'] = [];

    // 1. Validasi Character Blocking terhadap Scene induk
    const sceneCharacterIds = new Set(shot.scene.characterIds as string[]);
    const blocking = (shot.characterBlocking as any[]) || [];

    for (const b of blocking) {
      if (!sceneCharacterIds.has(b.characterId)) {
        flags.push({
          flagType: 'shot_blocking',
          fieldName: 'characterBlocking',
          expectedValue: `Karakter ${b.characterId} terdaftar di Scene induk`,
          actualValue: `Karakter ${b.characterId} tidak ada di Scene ${shot.scene.sceneNumber}`,
          description: `Shot ${shot.shotNumber} memblokir karakter ${b.characterId} yang tidak terdaftar di Scene induk`,
        });
      }
    }

    // 2. Validasi blocking consistency dengan Shot sebelumnya dalam Scene yang sama
    const previousShot = await this.prisma.shot.findFirst({
      where: {
        sceneId: shot.sceneId,
        shotNumber: shot.shotNumber - 1,
      },
    });

    if (previousShot) {
      const prevBlocking = (previousShot.characterBlocking as any[]) || [];
      const prevBlockingMap = new Map(
        prevBlocking.map((b) => [b.characterId, b]),
      );

      for (const b of blocking) {
        const prev = prevBlockingMap.get(b.characterId);
        if (prev && prev.position !== b.position) {
          // Posisi berbeda tanpa pergerakan eksplisit → potensi inkonsistensi
          const hasExplicitMovement =
            shot.cameraMovement && shot.cameraMovement !== 'static' ||
            shot.scene.action.toLowerCase().includes('bergerak') ||
            shot.scene.action.toLowerCase().includes('berjalan') ||
            shot.scene.action.toLowerCase().includes('pindah');

          if (!hasExplicitMovement) {
            flags.push({
              flagType: 'shot_blocking',
              fieldName: 'characterBlocking',
              expectedValue: `Posisi ${b.characterId} konsisten dengan Shot ${previousShot.shotNumber} (${prev.position})`,
              actualValue: `Posisi ${b.characterId} di Shot ${shot.shotNumber} adalah ${b.position}`,
              description: `Karakter ${b.characterId} berpindah posisi dari "${prev.position}" (Shot ${previousShot.shotNumber}) ke "${b.position}" (Shot ${shot.shotNumber}) tanpa pergerakan eksplisit yang dicatat`,
            });
          }
        }
      }
    }

    return { shotId, flags };
  }

  /**
   * Menyimpan ContinuityFlag untuk Shot ke database.
   * Flag lama yang unresolved untuk shot ini dihapus dulu, lalu dibuat ulang —
   * KECUALI pelanggaran yang sama persis sudah pernah ditandai resolved(accepted)
   * oleh pengguna (pola sama seperti saveFlags di level Scene, lihat
   * docs/instructions/03_continuity_rules.md).
   */
  async saveShotFlags(result: ShotContinuityCheckResult): Promise<void> {
    // Hapus flag lama yang unresolved untuk shot ini
    await this.prisma.continuityFlag.deleteMany({
      where: {
        shotId: result.shotId,
        status: 'unresolved',
      },
    });

    if (result.flags.length === 0) return;

    const shot = await this.prisma.shot.findUnique({
      where: { id: result.shotId },
    });

    if (!shot) return;

    const acceptedFlags = await this.prisma.continuityFlag.findMany({
      where: {
        shotId: result.shotId,
        status: 'resolved(accepted)',
      },
    });

    const isAlreadyAccepted = (flag: ShotContinuityCheckResult['flags'][number]) =>
      acceptedFlags.some(
        (f: { flagType: string; fieldName: string; expectedValue: string; actualValue: string }) =>
          f.flagType === flag.flagType &&
          f.fieldName === flag.fieldName &&
          f.expectedValue === flag.expectedValue &&
          f.actualValue === flag.actualValue,
      );

    for (const flag of result.flags) {
      if (isAlreadyAccepted(flag)) continue;

      await this.prisma.continuityFlag.create({
        data: {
          sceneId: shot.sceneId,
          shotId: shot.id,
          projectId: shot.projectId,
          flagType: flag.flagType,
          fieldName: flag.fieldName,
          expectedValue: flag.expectedValue,
          actualValue: flag.actualValue,
          description: flag.description,
          status: 'unresolved',
        },
      });
    }
  }

  /**
   * Menjalankan continuity check di level Shot dan menyimpan hasilnya.
   */
  async runShotCheck(shotId: string): Promise<ShotContinuityCheckResult> {
    const result = await this.checkShot(shotId);
    await this.saveShotFlags(result);
    return result;
  }

  /**
   * Mendapatkan semua ContinuityFlag untuk sebuah Shot.
   */
  async getFlagsForShot(shotId: string) {
    return this.prisma.continuityFlag.findMany({
      where: { shotId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Menyelesaikan ContinuityFlag (fixed atau accepted).
   */
  async resolveFlag(id: string, status: 'resolved(fixed)' | 'resolved(accepted)', note?: string) {
    return this.prisma.continuityFlag.update({
      where: { id },
      data: {
        status,
        resolutionNote: note,
      },
    });
  }
}
