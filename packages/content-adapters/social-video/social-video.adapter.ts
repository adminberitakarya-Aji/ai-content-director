import { BaseContentAdapter } from '../base-content-adapter';

/**
 * Content Adapter untuk Social Video.
 *
 * Karakteristik (docs/knowledge/01_content_types.md):
 * - Format pendek, dioptimalkan untuk platform media sosial
 * - Vertical/square aspect ratio umum
 * - Pacing cepat, shot list cenderung lebih sedikit dan padat dibanding Short Film
 * - Toleransi continuity: moderate
 */
export class SocialVideoAdapter extends BaseContentAdapter {
  readonly contentType = 'social-video';
  readonly displayName = 'Social Video';
  readonly continuityTolerance = 'moderate' as const;

  override getSceneRules(): Record<string, unknown> {
    return {
      ...super.getSceneRules(),
      // Social video cepat — dialog tidak wajib terstruktur ketat
      requireStructuredDialogue: false,
      // Emotion penting untuk engagement tapi tidak wajib per karakter
      requireEmotionPerCharacter: false,
      // Social video sering potong lokasi cepat
      allowMultipleLocationsPerScene: true,
      // Pacing cepat untuk media sosial
      narrativePacing: 'fast-paced-hook-first',
      // Durasi pendek per Scene (detik) — social video biasanya singkat
      suggestedMaxSceneDurationSeconds: 60,
    };
  }

  override getStoryboardRules(): Record<string, unknown> {
    return {
      ...super.getStoryboardRules(),
      // Shot list lebih sedikit dan padat
      suggestedMinShotsPerScene: 1,
      suggestedMaxShotsPerScene: 6,
      // Camera movement tidak wajib detail
      requireCameraMovement: false,
      // Lens tidak wajib
      requireLens: false,
      // Vertical/square umum untuk platform sosial
      preferredAspectRatios: ['9:16', '1:1'],
      // Panduan shot type untuk engagement cepat
      shotTypeGuidance: 'hook-driven-fast-cut',
      // Blocking dicatat untuk konsistensi moderate
      requireCharacterBlocking: true,
    };
  }

  override getContinuityRules(): Record<string, unknown> {
    return {
      ...super.getContinuityRules(),
      // Moderate — karakter harus konsisten, detail kecil boleh bervariasi
      strictWardrobeCheck: false,
      strictTimeCheck: false,
      strictBlockingCheck: true,
      strictStyleCheck: true,
      // Toleransi sedang
      toleranceThreshold: 'medium',
    };
  }
}