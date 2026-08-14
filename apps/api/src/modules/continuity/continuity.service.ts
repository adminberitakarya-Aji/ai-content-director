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

@Injectable()
export class ContinuityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Continuity Lapis 1 — Data Consistency.
   * Memeriksa Scene terhadap versi Bible aktif (approved terbaru):
   * - Character ID: karakter ada & approved
   * - Location ID: lokasi ada & approved
   * - Prop ID: prop ada & approved
   * - Time: waktu Scene selaras dengan lighting Location Bible
   * - Style: Scene tidak menyimpang dari Style Bible
   */
  async checkScene(sceneId: string): Promise<ContinuityCheckResult> {
    const scene = await this.prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      return { sceneId, flags: [] };
    }

    const flags: ContinuityCheckResult['flags'] = [];

    // 1. Validasi Character ID
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

    return { sceneId, flags };
  }

  /**
   * Menyimpan ContinuityFlag ke database.
   * Flag lama yang unresolved dihapus dulu, lalu dibuat ulang berdasarkan hasil check terbaru.
   */
  async saveFlags(result: ContinuityCheckResult): Promise<void> {
    // Hapus flag lama yang unresolved untuk scene ini
    await this.prisma.continuityFlag.deleteMany({
      where: {
        sceneId: result.sceneId,
        status: 'unresolved',
      },
    });

    // Buat flag baru
    for (const flag of result.flags) {
      const scene = await this.prisma.scene.findUnique({
        where: { id: result.sceneId },
      });

      if (!scene) continue;

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