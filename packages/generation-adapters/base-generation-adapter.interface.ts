/**
 * Base interface untuk Generation Adapter.
 * Setiap model generatif (Flux, Seedance, Veo, Kling, Wan, Runway) mengimplementasikan interface ini.
 *
 * Prinsip kunci:
 * - Model adalah mesin yang dapat diganti, bukan pusat sistem.
 * - Tidak ada adapter yang boleh mengimplementasikan jalur langsung dari buildPrompt ke submit
 *   tanpa melalui validateConstraints dan estimateCost (Budget Guard wajib).
 */
export interface GenerationAdapter {
  /** Nama adapter (harus match dengan adapterName di GenerationJob) */
  readonly name: string;

  /** Jenis generation: image atau video */
  readonly type: 'image' | 'video';

  /**
   * Menerjemahkan prompt konseptual menjadi payload sesuai format model.
   * Prompt konseptual bersifat netral terhadap model (lihat docs/instructions/07_prompt_rules.md).
   */
  buildPrompt(conceptualPrompt: Record<string, unknown>): Promise<Record<string, unknown>>;

  /**
   * Memvalidasi payload terhadap batasan teknis model (resolusi, durasi, dst).
   * Harus dipanggil sebelum estimateCost dan submit.
   */
  validateConstraints(payload: Record<string, unknown>): Promise<ValidationResult>;

  /**
   * Menghitung estimasi biaya berdasarkan AdapterPricingRate.
   * WAJIB dipanggil sebelum submit — tidak boleh dilewati (Budget Guard).
   */
  estimateCost(payload: Record<string, unknown>): Promise<CostEstimate>;

  /**
   * Mengeksekusi permintaan generation ke model.
   * HANYA boleh dipanggil setelah estimasi biaya disetujui pengguna.
   */
  submit(payload: Record<string, unknown>, approvedCost: CostEstimate): Promise<GenerationResult>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CostEstimate {
  adapterName: string;
  estimatedCost: number;
  currency: string;
  breakdown: Record<string, number>;
}

export interface GenerationResult {
  success: boolean;
  outputAssetUrl?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}