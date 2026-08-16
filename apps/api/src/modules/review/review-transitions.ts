import { BadRequestException } from '@nestjs/common';

/**
 * Aturan transisi status review terpusat untuk semua jenis entitas.
 *
 * Fase 6 (IMPLEMENTATION_PLAN.md 6.1): approval gate menyeluruh — Bible,
 * Storyboard (Shot), GenerationJob (image & video) dalam satu module terpusat.
 *
 * Prinsip (docs/instructions/02_decision_rules.md):
 * - Wewenang approval selalu di tangan manusia. Sistem hanya menyiapkan,
 *   memvalidasi, dan menyajikan informasi.
 * - Reject di tahap Review memicu status kembali ke draft/revisi pada entitas
 *   terkait (IMPLEMENTATION_PLAN.md 6.7) — bukan cuma flag tanpa efek.
 */

/** Jenis entitas yang bisa direview secara terpusat. */
export type ReviewableEntityType =
  | 'character'
  | 'location'
  | 'prop'
  | 'style'
  | 'shot'
  | 'generation-job';

/**
 * Transisi status untuk Bible (character/location/prop/style).
 * Sama dengan VALID_BIBLE_TRANSITIONS di base-bible.service agar konsisten.
 */
export const BIBLE_TRANSITIONS: Record<string, string[]> = {
  draft: ['review', 'rejected'],
  review: ['approved', 'rejected', 'draft'],
  approved: ['draft', 'rejected'],
  rejected: ['draft', 'review'],
};

/**
 * Transisi status untuk Shot (Storyboard).
 * - draft → review: shot diajukan ke review
 * - review → approved: shot disetujui, siap untuk prompt engine
 * - review → rejected: shot ditolak, harus revisi
 * - rejected → draft: shot dikembalikan ke draft untuk direvisi
 * - approved → draft: shot yang sudah approved bisa direvisi kembali
 */
export const SHOT_TRANSITIONS: Record<string, string[]> = {
  draft: ['review'],
  review: ['approved', 'rejected'],
  approved: ['draft'],
  rejected: ['draft'],
};

/**
 * Transisi status untuk GenerationJob pada tahap Review hasil.
 *
 * Alur generation (Fase 4/5): pending → approved (budget) → submitted → completed.
 * Setelah completed, hasil masuk tahap Review (docs/instructions/01_production_workflow.md):
 * - completed → review: hasil generation diajukan ke review
 * - review → final: hasil disetujui sebagai final
 * - review → review_rejected: hasil ditolak, memicu revisi Shot terkait
 */
export const GENERATION_JOB_REVIEW_TRANSITIONS: Record<string, string[]> = {
  completed: ['review'],
  review: ['final', 'review_rejected'],
  final: [],
  review_rejected: [],
};

/**
 * Ambil tabel transisi untuk jenis entitas tertentu.
 */
export function getTransitionsForType(
  type: ReviewableEntityType,
): Record<string, string[]> {
  switch (type) {
    case 'character':
    case 'location':
    case 'prop':
    case 'style':
      return BIBLE_TRANSITIONS;
    case 'shot':
      return SHOT_TRANSITIONS;
    case 'generation-job':
      return GENERATION_JOB_REVIEW_TRANSITIONS;
    default:
      throw new BadRequestException(`Jenis entitas review invalid: ${type}`);
  }
}

/**
 * Validasi transisi status. Melempar BadRequestException jika transisi
 * tidak diizinkan — memberi pesan eksplisit ke pengguna (bukan diam-diam gagal).
 */
export function assertValidReviewTransition(
  type: ReviewableEntityType,
  currentStatus: string,
  newStatus: string,
): void {
  const transitions = getTransitionsForType(type);
  const allowed = transitions[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw new BadRequestException(
      `Transisi status review invalid untuk ${type}: ${currentStatus} → ${newStatus}. ` +
        `Transisi yang diizinkan: ${allowed.join(', ') || 'tidak ada'}`,
    );
  }
}

/**
 * Status yang menandakan entitas sedang menunggu review manusia.
 * Dipakai oleh findPendingReviews untuk mengumpulkan antrean review terpusat.
 */
export const PENDING_REVIEW_STATUS = 'review';