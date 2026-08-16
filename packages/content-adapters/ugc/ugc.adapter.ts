import { BaseContentAdapter } from '../base-content-adapter';

/**
 * Content Adapter untuk UGC (User Generated Content).
 *
 * Karakteristik (docs/knowledge/01_content_types.md):
 * - Gaya visual kasual, sering handheld/personal
 * - Toleransi continuity lebih tinggi (variasi kecil antar-shot dianggap wajar,
 *   bukan pelanggaran)
 * - Toleransi continuity: loose
 */
export class UgcAdapter extends BaseContentAdapter {
  readonly contentType = 'ugc';
  readonly displayName = 'UGC — User Generated Content';
  readonly continuityTolerance = 'loose' as const;

  override getSceneRules(): Record<string, unknown> {
    return {
      ...super.getSceneRules(),
      // UGC kasual — dialog tidak wajib terstruktur ketat
      requireStructuredDialogue: false,
      // Emotion tetap dicatat tapi tidak wajib per karakter
      requireEmotionPerCharacter: false,
      // UGC sering berpindah lokasi cepat dalam satu "scene"
      allowMultipleLocationsPerScene: true,
      // Pacing kasual/personal
      narrativePacing: 'casual-personal',
      // Tidak ada batasan durasi Scene yang ketat
      suggestedMaxSceneDurationSeconds: null,
    };
  }

  override getStoryboardRules(): Record<string, unknown> {
    return {
      ...super.getStoryboardRules(),
      // UGC cenderung lebih sedikit shot, lebih spontan
      suggestedMinShotsPerScene: 1,
      suggestedMaxShotsPerScene: 8,
      // Camera movement tidak wajib dicatat detail (handheld sering implisit)
      requireCameraMovement: false,
      // Lens tidak wajib (sering pakai kamera HP/kasual)
      requireLens: false,
      // Aspect ratio fleksibel — sering vertical untuk platform sosial
      preferredAspectRatios: ['9:16', '1:1', '16:9'],
      // Panduan shot type kasual
      shotTypeGuidance: 'casual-handheld',
      // Blocking tidak wajib dicatat ketat
      requireCharacterBlocking: false,
    };
  }

  override getContinuityRules(): Record<string, unknown> {
    return {
      ...super.getContinuityRules(),
      // Toleransi longgar — variasi kecil dianggap wajar
      strictWardrobeCheck: false,
      strictTimeCheck: false,
      strictBlockingCheck: false,
      strictStyleCheck: false,
      // Hanya pelanggaran besar yang ditandai
      toleranceThreshold: 'high',
    };
  }
}