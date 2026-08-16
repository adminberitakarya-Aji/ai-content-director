/**
 * Seedance Generation Adapter — Video Generation (Image-to-Video).
 *
 * Mengimplementasikan GenerationAdapter interface untuk model Seedance.
 * Lihat docs/knowledge/11_generation_adapters.md untuk spesifikasi.
 *
 * Prinsip:
 * - Menerima Video Prompt konseptual + output gambar dari Flux sebagai starting frame
 * - **Tanggung jawab normalisasi**: adapter ini yang menyesuaikan format/resolusi
 *   output Flux agar sesuai spesifikasi input Seedance — bukan tanggung jawab
 *   Image Prompt Engine atau Video Prompt Engine
 * - Constraint teknis (durasi maksimum, resolusi yang didukung) divalidasi di
 *   lapisan adapter ini sebelum submit
 * - validateConstraints dan estimateCost WAJIB dipanggil sebelum submit (Budget Guard)
 */
import {
  GenerationAdapter,
  ValidationResult,
  CostEstimate,
  GenerationResult,
} from '../base-generation-adapter.interface';

/** Rate structure untuk Seedance (video generation) */
export interface SeedanceRateStructure {
  unit: 'per_second';
  baseRate: number;
  /** Biaya per detik durasi video */
  durationRate: number;
  /** Multiplier untuk resolusi premium (opsional) */
  resolutionMultipliers?: Record<string, number>;
}

/** Payload untuk Seedance generation */
export interface SeedancePayload {
  /** Prompt text untuk gerakan/aksi video */
  prompt: string;
  /** URL gambar starting frame (output dari Flux) */
  imageUrl: string;
  /** Durasi video dalam detik */
  durationSeconds: number;
  /** Resolusi output video */
  width: number;
  height: number;
  /** Aspect ratio target */
  aspectRatio?: string;
  /** Seed untuk reproducibility (opsional) */
  seed?: number;
  /** Guidance scale untuk kontrol prompt (opsional) */
  guidanceScale?: number;
}

/** Constraint teknis Seedance */
const SEEDANCE_CONSTRAINTS = {
  /** Durasi maksimum video dalam detik */
  maxDurationSeconds: 10,
  /** Durasi minimum video dalam detik */
  minDurationSeconds: 1,
  /** Resolusi yang didukung */
  supportedResolutions: [
    { width: 1280, height: 720 },   // 720p landscape
    { width: 720, height: 1280 },   // 720p portrait
    { width: 1920, height: 1080 },  // 1080p landscape
    { width: 1080, height: 1920 },  // 1080p portrait
    { width: 960, height: 960 },    // Square
  ],
  /** Aspect ratio yang didukung */
  supportedAspectRatios: ['16:9', '9:16', '1:1'],
  /** Maximum prompt length */
  maxPromptLength: 3000,
};

/** Resolusi default per aspect ratio untuk Seedance */
const SEEDANCE_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 960, height: 960 },
};

export class SeedanceAdapter implements GenerationAdapter {
  readonly name = 'seedance';
  readonly type = 'video' as const;

  private apiKey: string;
  private apiEndpoint: string;
  private pricingRate: SeedanceRateStructure | null = null;
  private currency = 'USD';

  constructor(options: { apiKey?: string; apiEndpoint?: string } = {}) {
    this.apiKey = options.apiKey || process.env.SEEDANCE_API_KEY || '';
    this.apiEndpoint =
      options.apiEndpoint ||
      process.env.SEEDANCE_API_ENDPOINT ||
      'https://api.seedance.ai/v1';
  }

  /**
   * Set pricing rate dari AdapterPricingRate (dipanggil oleh BudgetService).
   * Rate tidak boleh hardcoded di adapter — harus dari database.
   */
  setPricingRate(rateStructure: unknown, currency: string): void {
    this.pricingRate = rateStructure as SeedanceRateStructure;
    this.currency = currency;
  }

  /**
   * Menerjemahkan Video Prompt konseptual menjadi payload Seedance.
   *
   * Video Prompt konseptual (dari ai-service) berisi struktur netral:
   * baseImagePrompt, sourceImageUrl, subjectReference, action, shotFocus,
   * characterMotion, cameraMotion, environmentMotion, physics, temporalLogic,
   * cinematography, constraints.
   *
   * Seedance adapter menyusun ini menjadi prompt text yang fokus pada gerakan,
   * karena starting frame (gambar) sudah menyediakan konteks visual statis.
   */
  async buildPrompt(
    conceptualPrompt: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const sections: string[] = [];

    // === Action (inti dari video prompt) ===
    const action = conceptualPrompt.action as string;
    if (action) {
      sections.push(action);
    }

    // === Shot Focus (memperjelas porsi shot ini) ===
    const shotFocus = conceptualPrompt.shotFocus as string;
    if (shotFocus) {
      sections.push(`Focus: ${shotFocus}`);
    }

    // === Character Motion ===
    const characterMotion = (conceptualPrompt.characterMotion as Array<Record<string, unknown>>) || [];
    for (const motion of characterMotion) {
      if (motion.motion) {
        sections.push(String(motion.motion));
      }
    }

    // === Camera Motion ===
    const cameraMotion = conceptualPrompt.cameraMotion as Record<string, unknown>;
    if (cameraMotion?.instruction) {
      sections.push(String(cameraMotion.instruction));
    }

    // === Environment Motion ===
    const environmentMotion = conceptualPrompt.environmentMotion as Record<string, unknown>;
    if (environmentMotion?.note) {
      sections.push(String(environmentMotion.note));
    }

    // === Physics ===
    const physics = conceptualPrompt.physics as Record<string, unknown>;
    if (physics?.instruction) {
      sections.push(String(physics.instruction));
    }

    // === Temporal Logic (urutan kejadian) ===
    const temporalLogic = conceptualPrompt.temporalLogic as Record<string, unknown>;
    if (temporalLogic?.beats) {
      const beats = temporalLogic.beats as Array<Record<string, unknown>>;
      const beatDescriptions = beats
        .map((b) => b.description)
        .filter(Boolean)
        .join(' → ');
      if (beatDescriptions) {
        sections.push(`Sequence: ${beatDescriptions}`);
      }
    }

    const prompt = sections.filter(Boolean).join('. ');

    // === Constraints: aspect ratio → resolusi, durasi ===
    const constraints = conceptualPrompt.constraints as Record<string, unknown>;
    const aspectRatio = (constraints?.aspectRatio as string) || '16:9';
    const resolution =
      SEEDANCE_RESOLUTIONS[aspectRatio] || SEEDANCE_RESOLUTIONS['16:9'];

    // Durasi dari constraints, default 5 detik jika tidak ada
    const durationSeconds = (constraints?.durationSeconds as number) || 5;

    // === Source Image URL (starting frame dari Flux) ===
    const sourceImageUrl = conceptualPrompt.sourceImageUrl as string;

    const payload: SeedancePayload = {
      prompt,
      imageUrl: sourceImageUrl || '',
      durationSeconds,
      width: resolution.width,
      height: resolution.height,
      aspectRatio,
      guidanceScale: 7.5,
    };

    return payload as unknown as Record<string, unknown>;
  }

  /**
   * Normalisasi output Flux agar sesuai spesifikasi input Seedance.
   *
   * Ini adalah tanggung jawab adapter Seedance, bukan Image Prompt Engine
   * atau Video Prompt Engine (lihat docs/knowledge/11_generation_adapters.md).
   *
   * Normalisasi mencakup:
   * - Validasi bahwa imageUrl ada (wajib untuk image-to-video)
   * - Penyesuaian resolusi target berdasarkan aspect ratio
   * - Validasi format URL
   */
  normalizeFluxOutput(fluxOutputUrl: string, targetAspectRatio: string): {
    normalizedUrl: string;
    targetResolution: { width: number; height: number };
    warnings: string[];
  } {
    const warnings: string[] = [];
    const resolution =
      SEEDANCE_RESOLUTIONS[targetAspectRatio] || SEEDANCE_RESOLUTIONS['16:9'];

    // Validasi URL format
    if (!fluxOutputUrl || fluxOutputUrl.trim().length === 0) {
      warnings.push('URL gambar starting frame kosong — image-to-video memerlukan starting frame');
    } else if (!fluxOutputUrl.startsWith('http://') && !fluxOutputUrl.startsWith('https://')) {
      warnings.push('URL gambar starting frame bukan URL valid (harus http/https)');
    }

    return {
      normalizedUrl: fluxOutputUrl,
      targetResolution: resolution,
      warnings,
    };
  }

  /**
   * Validasi payload terhadap batasan teknis Seedance.
   * Harus dipanggil sebelum estimateCost dan submit.
   */
  async validateConstraints(
    payload: Record<string, unknown>
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const p = payload as unknown as SeedancePayload;

    // Prompt wajib ada
    if (!p.prompt || p.prompt.trim().length === 0) {
      errors.push('Prompt tidak boleh kosong');
    }

    // Prompt length limit
    if (p.prompt && p.prompt.length > SEEDANCE_CONSTRAINTS.maxPromptLength) {
      errors.push(`Prompt melebihi ${SEEDANCE_CONSTRAINTS.maxPromptLength} karakter`);
    }

    // Image URL wajib ada untuk image-to-video
    if (!p.imageUrl || p.imageUrl.trim().length === 0) {
      errors.push('imageUrl (starting frame) wajib ada untuk image-to-video generation');
    }

    // Duration validation
    if (p.durationSeconds < SEEDANCE_CONSTRAINTS.minDurationSeconds) {
      errors.push(
        `Durasi minimum ${SEEDANCE_CONSTRAINTS.minDurationSeconds} detik`
      );
    }
    if (p.durationSeconds > SEEDANCE_CONSTRAINTS.maxDurationSeconds) {
      errors.push(
        `Durasi maksimum ${SEEDANCE_CONSTRAINTS.maxDurationSeconds} detik`
      );
    }

    // Resolution validation
    const isSupportedResolution = SEEDANCE_CONSTRAINTS.supportedResolutions.some(
      (r) => r.width === p.width && r.height === p.height
    );
    if (!isSupportedResolution) {
      errors.push(
        `Resolusi ${p.width}x${p.height} tidak didukung. Resolusi yang didukung: ` +
        SEEDANCE_CONSTRAINTS.supportedResolutions.map((r) => `${r.width}x${r.height}`).join(', ')
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Hitung estimasi biaya berdasarkan AdapterPricingRate.
   * WAJIB dipanggil sebelum submit (Budget Guard).
   *
   * Rumus HARUS selaras dengan BudgetService.estimateCost untuk generationType 'video'
   * (lihat apps/api/src/modules/budget/budget.service.ts):
   *   biaya video = durationRate × durasi
   * dengan durationRate fallback ke baseRate jika tidak diset.
   *
   * Konsistensi ini penting: saat submit, Budget Guard membandingkan estimasi adapter
   * dengan costEstimate yang disimpan job (hasil BudgetService). Jika rumus berbeda,
   * submit akan selalu ditolak karena "estimasi berubah".
   */
  async estimateCost(payload: Record<string, unknown>): Promise<CostEstimate> {
    if (!this.pricingRate) {
      throw new Error(
        'Pricing rate belum diset. Panggil setPricingRate() dengan data dari AdapterPricingRate terlebih dahulu.'
      );
    }

    const p = payload as unknown as SeedancePayload;
    const baseRate = this.pricingRate.baseRate;
    const durationRate = this.pricingRate.durationRate || baseRate;
    const estimatedCost = durationRate * p.durationSeconds;

    return {
      adapterName: this.name,
      estimatedCost,
      currency: this.currency,
      breakdown: {
        baseRate,
        durationRate,
        durationSeconds: p.durationSeconds,
        total: estimatedCost,
      },
    };
  }

  /**
   * Eksekusi generation ke Seedance.
   * HANYA boleh dipanggil setelah estimasi biaya disetujui pengguna.
   */
  async submit(
    payload: Record<string, unknown>,
    approvedCost: CostEstimate
  ): Promise<GenerationResult> {
    const p = payload as unknown as SeedancePayload;

    // Validasi bahwa cost yang disetujui match dengan estimasi (Budget Guard)
    const currentEstimate = await this.estimateCost(payload);
    if (Math.abs(currentEstimate.estimatedCost - approvedCost.estimatedCost) > 0.01) {
      return {
        success: false,
        errorMessage:
          'Estimasi biaya berubah sejak approval. Silakan review ulang estimasi biaya.',
      };
    }

    try {
      // Panggil Seedance API
      const response = await this.callSeedanceApi(p);

      if (response.success) {
        return {
          success: true,
          outputAssetUrl: response.videoUrl,
          metadata: {
            seed: response.seed,
            width: p.width,
            height: p.height,
            durationSeconds: p.durationSeconds,
            guidanceScale: p.guidanceScale,
          },
        };
      }

      return {
        success: false,
        errorMessage: response.error || 'Generation gagal tanpa pesan error',
      };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error saat submit ke Seedance',
      };
    }
  }

  // ===== Private Methods =====

  private async callSeedanceApi(payload: SeedancePayload): Promise<{
    success: boolean;
    videoUrl?: string;
    seed?: number;
    error?: string;
  }> {
    // Implementasi API call ke Seedance
    if (!this.apiKey) {
      return {
        success: false,
        error:
          'SEEDANCE_API_KEY belum dikonfigurasi. Set environment variable SEEDANCE_API_KEY.',
      };
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/video/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: payload.prompt,
          image_url: payload.imageUrl,
          duration: payload.durationSeconds,
          width: payload.width,
          height: payload.height,
          aspect_ratio: payload.aspectRatio,
          seed: payload.seed,
          guidance_scale: payload.guidanceScale,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `Seedance API error: ${response.status} - ${
            (errorData as Record<string, unknown>).error || response.statusText
          }`,
        };
      }

      const data = (await response.json()) as {
        videos?: Array<{ url: string }>;
        seed?: number;
      };

      if (data.videos && data.videos.length > 0) {
        return {
          success: true,
          videoUrl: data.videos[0].url,
          seed: data.seed,
        };
      }

      return {
        success: false,
        error: 'Seedance API tidak mengembalikan video',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}