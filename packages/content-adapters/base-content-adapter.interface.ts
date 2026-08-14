/**
 * Base interface untuk Content Adapter.
 * Setiap jenis konten (film, short-film, documentary, dll) mengimplementasikan interface ini
 * untuk menentukan aturan produksi spesifik jenis konten tersebut.
 *
 * Prinsip: Content Adapter mempengaruhi bagaimana Scene, Storyboard, dan Continuity diterapkan,
 * bukan menjadi tahap terpisah dalam pipeline.
 */
export interface ContentAdapter {
  /** Identitas unik jenis konten (harus match dengan ContentType di packages/schema) */
  readonly contentType: string;

  /** Nama tampilan jenis konten */
  readonly displayName: string;

  /**
   * Ambang toleransi continuity untuk jenis konten ini.
   * Nilai lebih tinggi = toleransi lebih longgar terhadap variasi visual.
   * Contoh: UGC punya toleransi lebih tinggi daripada Short Film.
   */
  readonly continuityTolerance: 'strict' | 'moderate' | 'loose';

  /**
   * Aturan produksi spesifik yang mempengaruhi Scene.
   * Dapat berisi constraint tambahan atau modifikasi perilaku default.
   */
  getSceneRules(): Record<string, unknown>;

  /**
   * Aturan produksi spesifik yang mempengaruhi Storyboard/Shot.
   */
  getStoryboardRules(): Record<string, unknown>;

  /**
   * Aturan produksi spesifik yang mempengaruhi Continuity check.
   */
  getContinuityRules(): Record<string, unknown>;
}