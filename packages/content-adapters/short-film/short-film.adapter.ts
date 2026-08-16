import { BaseContentAdapter } from '../base-content-adapter';

/**
 * Content Adapter untuk Short Film.
 *
 * Karakteristik (docs/knowledge/01_content_types.md):
 * - Struktur naratif jelas dengan awal-tengah-akhir
 * - Kontrol shot dan continuity ketat (mendekati standar produksi film konvensional)
 * - Toleransi continuity: strict
 */
export class ShortFilmAdapter extends BaseContentAdapter {
  readonly contentType = 'short-film';
  readonly displayName = 'Short Film';
  readonly continuityTolerance = 'strict' as const;

  override getSceneRules(): Record<string, unknown> {
    return {
      ...super.getSceneRules(),
      // Short film butuh struktur naratif jelas — dialog wajib terstruktur
      requireStructuredDialogue: true,
      // Emotion wajib dicatat untuk setiap karakter (kontrol ketat)
      requireEmotionPerCharacter: true,
      // Satu Scene satu lokasi — sesuai prinsip Scene Rules
      allowMultipleLocationsPerScene: false,
      // Pacing naratif terstruktur untuk film pendek
      narrativePacing: 'structured-three-act',
      // Durasi maksimum yang disarankan per Scene (detik)
      suggestedMaxSceneDurationSeconds: 180,
    };
  }

  override getStoryboardRules(): Record<string, unknown> {
    return {
      ...super.getStoryboardRules(),
      // Short film cenderung punya shot list lebih banyak dan detail
      suggestedMinShotsPerScene: 2,
      suggestedMaxShotsPerScene: 15,
      // Camera movement wajib dicatat untuk kontrol visual ketat
      requireCameraMovement: true,
      // Lens wajib dicatat (standar produksi film)
      requireLens: true,
      // Aspect ratio standar film
      preferredAspectRatios: ['16:9', '21:9'],
      // Panduan shot type untuk naratif film
      shotTypeGuidance: 'narrative-driven',
      // Blocking wajib dicatat untuk continuity ketat
      requireCharacterBlocking: true,
    };
  }

  override getContinuityRules(): Record<string, unknown> {
    return {
      ...super.getContinuityRules(),
      // Semua check ketat untuk short film
      strictWardrobeCheck: true,
      strictTimeCheck: true,
      strictBlockingCheck: true,
      strictStyleCheck: true,
      // Variasi kecil antar-shot dianggap pelanggaran
      toleranceThreshold: 'low',
    };
  }
}