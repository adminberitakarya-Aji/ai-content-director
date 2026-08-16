import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReviewableEntityType,
  assertValidReviewTransition,
  PENDING_REVIEW_STATUS,
} from './review-transitions';

/**
 * Alias backward-compatible — tipe lama hanya mencakup Bible,
 * tipe baru (ReviewableEntityType) mencakup shot & generation-job juga.
 */
export type ReviewableType = ReviewableEntityType;

const BIBLE_TYPES = ['character', 'location', 'prop', 'style'] as const;

/**
 * Review Service — approval gate terpusat untuk semua entitas produksi.
 *
 * Fase 6 (IMPLEMENTATION_PLAN.md 6.1): Review Workflow Menyeluruh.
 * Semua keputusan approve/reject — Bible, Storyboard (Shot), dan hasil
 * GenerationJob — mengalir melalui satu module terpusat ini, sehingga:
 * - Aturan transisi status konsisten di satu tempat (review-transitions.ts)
 * - Antrean review bisa disajikan dalam satu halaman (findPendingReviews)
 * - Efek samping reject (mis. Shot kembali ke draft) terjamin terjadi
 *
 * Prinsip (docs/instructions/02_decision_rules.md):
 * Wewenang approval selalu di tangan manusia. Sistem hanya memvalidasi
 * transisi dan menjalankan efek samping — tidak pernah auto-approve.
 */
@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mengubah status review entitas (Bible | Shot | GenerationJob).
   *
   * Efek samping penting (IMPLEMENTATION_PLAN.md 6.7):
   * Reject hasil GenerationJob di tahap Review (review → review_rejected)
   * memicu Shot terkait kembali ke status 'draft' agar direvisi — dijalankan
   * dalam satu transaksi supaya tidak ada kondisi setengah-jadi.
   */
  async updateStatus(
    type: ReviewableEntityType,
    id: string,
    newStatus: string,
  ): Promise<any> {
    if (this.isBibleType(type)) {
      return this.updateBibleStatus(type, id, newStatus);
    }

    if (type === 'shot') {
      return this.updateShotStatus(id, newStatus);
    }

    if (type === 'generation-job') {
      return this.updateGenerationJobStatus(id, newStatus);
    }

    throw new BadRequestException(`Jenis entitas review invalid: ${type}`);
  }

  /**
   * Antrean review terpusat untuk sebuah Project.
   *
   * Mengumpulkan semua entitas berstatus 'review' (menunggu keputusan manusia):
   * - Bible (character/location/prop/style)
   * - Shot (Storyboard) — disertai jumlah unresolved continuity flags sebagai
   *   bahan pertimbangan reviewer (bukan pemblokir — keputusan tetap di manusia)
   * - GenerationJob (hasil image/video) — hanya yang sudah masuk tahap review
   *
   * Filter opsional per jenis entitas (IMPLEMENTATION_PLAN.md 6.2 — halaman
   * Review terpusat dengan filter).
   */
  async findPendingReviews(
    projectId: string,
    typeFilter?: ReviewableEntityType,
  ): Promise<any[]> {
    const items: any[] = [];

    const wantBible =
      !typeFilter || this.isBibleType(typeFilter as ReviewableEntityType);
    const wantShot = !typeFilter || typeFilter === 'shot';
    const wantJob = !typeFilter || typeFilter === 'generation-job';

    if (wantBible) {
      const [characters, locations, props, styles] = await Promise.all([
        this.prisma.characterBible.findMany({
          where: { projectId, status: PENDING_REVIEW_STATUS },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.locationBible.findMany({
          where: { projectId, status: PENDING_REVIEW_STATUS },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.propBible.findMany({
          where: { projectId, status: PENDING_REVIEW_STATUS },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.styleBible.findMany({
          where: { projectId, status: PENDING_REVIEW_STATUS },
          orderBy: { updatedAt: 'desc' },
        }),
      ]);

      items.push(
        ...characters.map((e: Record<string, unknown>) => ({
          ...e,
          entityType: 'character',
          reviewLabel: `Character Bible ${e.characterId} v${e.version} — ${e.name}`,
        })),
        ...locations.map((e: Record<string, unknown>) => ({
          ...e,
          entityType: 'location',
          reviewLabel: `Location Bible ${e.locationId} v${e.version} — ${e.name}`,
        })),
        ...props.map((e: Record<string, unknown>) => ({
          ...e,
          entityType: 'prop',
          reviewLabel: `Prop Bible ${e.propId} v${e.version} — ${e.name}`,
        })),
        ...styles.map((e: Record<string, unknown>) => ({
          ...e,
          entityType: 'style',
          reviewLabel: `Style Bible v${e.version} — ${e.visualStyle}`,
        })),
      );
    }

    if (wantShot) {
      const shots = await this.prisma.shot.findMany({
        where: { projectId, status: PENDING_REVIEW_STATUS },
        orderBy: { updatedAt: 'desc' },
        include: {
          scene: { select: { sceneNumber: true, title: true } },
          _count: {
            select: {
              continuityFlags: { where: { status: 'unresolved' } },
            },
          },
        },
      });

      items.push(
        ...shots.map((s: any) => ({
          ...s,
          entityType: 'shot',
          reviewLabel: `Shot ${s.shotNumber} (Scene ${s.scene?.sceneNumber ?? '?'}) — ${s.shotType}`,
          unresolvedFlagCount: s._count?.continuityFlags ?? 0,
        })),
      );
    }

    if (wantJob) {
      const jobs = await this.prisma.generationJob.findMany({
        where: { projectId, status: PENDING_REVIEW_STATUS },
        orderBy: { updatedAt: 'desc' },
        include: {
          shot: { select: { shotNumber: true, sceneId: true } },
        },
      });

      items.push(
        ...jobs.map((j: any) => ({
          ...j,
          entityType: 'generation-job',
          reviewLabel: `Hasil ${j.type} (${j.adapterName}) — Shot ${j.shot?.shotNumber ?? '?'}`,
        })),
      );
    }

    // Urutkan keseluruhan berdasarkan updatedAt terbaru
    items.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return items;
  }

  // ===== Bible =====

  private isBibleType(type: string): boolean {
    return (BIBLE_TYPES as readonly string[]).includes(type);
  }

  private async updateBibleStatus(
    type: string,
    id: string,
    newStatus: string,
  ): Promise<any> {
    const delegate = this.getBibleDelegate(type);
    const entity = await delegate.findUnique({ where: { id } });

    if (!entity) {
      throw new NotFoundException(
        `${type} Bible dengan id ${id} tidak ditemukan`,
      );
    }

    assertValidReviewTransition(
      type as ReviewableEntityType,
      entity.status,
      newStatus,
    );

    return delegate.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  private getBibleDelegate(type: string): any {
    switch (type) {
      case 'character':
        return this.prisma.characterBible as any;
      case 'location':
        return this.prisma.locationBible as any;
      case 'prop':
        return this.prisma.propBible as any;
      case 'style':
        return this.prisma.styleBible as any;
      default:
        throw new BadRequestException(`Jenis Bible invalid: ${type}`);
    }
  }

  // ===== Shot (Storyboard) =====

  private async updateShotStatus(id: string, newStatus: string): Promise<any> {
    const shot = await this.prisma.shot.findUnique({ where: { id } });

    if (!shot) {
      throw new NotFoundException(`Shot dengan id ${id} tidak ditemukan`);
    }

    assertValidReviewTransition('shot', shot.status, newStatus);

    return this.prisma.shot.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  // ===== GenerationJob (Review hasil generation) =====

  /**
   * Update status GenerationJob di tahap Review hasil.
   *
   * Efek samping reject (IMPLEMENTATION_PLAN.md 6.7):
   * review → review_rejected dijalankan dalam transaksi bersama pengembalian
   * Shot terkait ke 'draft', sehingga hasil yang ditolak selalu memicu revisi
   * pada Shot — tidak ada kondisi di mana job ditolak tapi Shot tetap
   * seolah-olah siap produksi.
   */
  private async updateGenerationJobStatus(
    id: string,
    newStatus: string,
  ): Promise<any> {
    const job = await this.prisma.generationJob.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException(
        `Generation job dengan id ${id} tidak ditemukan`,
      );
    }

    assertValidReviewTransition('generation-job', job.status, newStatus);

    if (newStatus === 'review_rejected') {
      // Reject hasil generation → Shot terkait kembali ke draft (revisi)
      const [updatedJob] = await this.prisma.$transaction([
        this.prisma.generationJob.update({
          where: { id },
          data: { status: newStatus },
        }),
        this.prisma.shot.update({
          where: { id: job.shotId },
          data: { status: 'draft' },
        }),
      ]);
      return updatedJob;
    }

    return this.prisma.generationJob.update({
      where: { id },
      data: { status: newStatus },
    });
  }
}