import { ContentAdapter } from './base-content-adapter.interface';

/**
 * Base class abstrak untuk Content Adapter.
 * Menyediakan implementasi default yang bisa di-override oleh adapter spesifik.
 *
 * Prinsip (docs/instructions/01_production_workflow.md):
 * Content Adapter mempengaruhi bagaimana Scene, Storyboard, dan Continuity diterapkan,
 * bukan menjadi tahap terpisah dalam pipeline.
 */
export abstract class BaseContentAdapter implements ContentAdapter {
  abstract readonly contentType: string;
  abstract readonly displayName: string;
  abstract readonly continuityTolerance: 'strict' | 'moderate' | 'loose';

  /**
   * Aturan produksi spesifik yang mempengaruhi Scene.
   * Default: tidak ada aturan tambahan di luar aturan dasar.
   */
  getSceneRules(): Record<string, unknown> {
    return {
      // Apakah Scene wajib memiliki dialog terstruktur
      requireStructuredDialogue: false,
      // Apakah Scene wajib memiliki emotion untuk setiap karakter
      requireEmotionPerCharacter: true,
      // Toleransi terhadap perpindahan lokasi dalam satu Scene
      allowMultipleLocationsPerScene: false,
      // Panduan pacing naratif
      narrativePacing: 'standard',
    };
  }

  /**
   * Aturan produksi spesifik yang mempengaruhi Storyboard/Shot.
   * Default: aturan standar.
   */
  getStoryboardRules(): Record<string, unknown> {
    return {
      // Jumlah shot minimum yang disarankan per Scene
      suggestedMinShotsPerScene: 1,
      // Jumlah shot maksimum yang disarankan per Scene
      suggestedMaxShotsPerScene: 12,
      // Apakah camera movement wajib dicatat
      requireCameraMovement: false,
      // Apakah lens wajib dicatat
      requireLens: false,
      // Preferensi aspect ratio (null = mengikuti Project)
      preferredAspectRatios: null as string[] | null,
      // Panduan shot type yang disarankan
      shotTypeGuidance: 'standard',
    };
  }

  /**
   * Aturan produksi spesifik yang mempengaruhi Continuity check.
   * Default: toleransi berdasarkan continuityTolerance adapter.
   */
  getContinuityRules(): Record<string, unknown> {
    return {
      // Ambang toleransi continuity
      tolerance: this.continuityTolerance,
      // Apakah wardrobe variation dianggap pelanggaran
      strictWardrobeCheck: this.continuityTolerance === 'strict',
      // Apakah time/lighting mismatch dianggap pelanggaran
      strictTimeCheck: this.continuityTolerance === 'strict',
      // Apakah blocking position mismatch dianggap pelanggaran
      strictBlockingCheck: this.continuityTolerance !== 'loose',
      // Apakah style deviation dianggap pelanggaran
      strictStyleCheck: this.continuityTolerance === 'strict',
    };
  }
}