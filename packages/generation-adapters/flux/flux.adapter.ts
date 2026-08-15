/**
 * Flux Generation Adapter — Image Generation.
 *
 * Mengimplementasikan GenerationAdapter interface untuk model Flux.
 * Lihat docs/knowledge/11_generation_adapters.md untuk spesifikasi.
 *
 * Prinsip:
 * - Menerima Image Prompt konseptual, menerjemahkan ke format prompt Flux
 * - Mendukung image-to-image / reference-image conditioning
 * - validateConstraints dan estimateCost WAJIB dipanggil sebelum submit
 */
import {
  GenerationAdapter,
  ValidationResult,
  CostEstimate,
  GenerationResult,
} from '../base-generation-adapter.interface';

/** Rate structure untuk Flux (image generation) */
export interface FluxRateStructure {
  unit: 'per_image';
  baseRate: number;
  resolutionMultipliers?: Record<string, number>;
}

/** Payload untuk Flux generation */
export interface FluxPayload {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  referenceImages?: string[];
}

/** Constraint teknis Flux */
const FLUX_CONSTRAINTS = {
  maxWidth: 2048,
  maxHeight: 2048,
  minWidth: 256,
  minHeight: 256,
  maxInferenceSteps: 50,
  supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
};

/** Resolusi default per aspect ratio */
const ASPECT_RATIO_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '1:1': { width: 1024, height: 1024 },
  '4:3': { width: 1152, height: 896 },
  '3:4': { width: 896, height: 1152 },
  '21:9': { width: 1536, height: 640 },
};

export class FluxAdapter implements GenerationAdapter {
  readonly name = 'flux';
  readonly type = 'image' as const;

  private apiKey: string;
  private apiEndpoint: string;
  private pricingRate: FluxRateStructure | null = null;
  private currency = 'USD';

  constructor(options: { apiKey?: string; apiEndpoint?: string } = {}) {
    this.apiKey = options.apiKey || process.env.FLUX_API_KEY || '';
    this.apiEndpoint =
      options.apiEndpoint ||
      process.env.FLUX_API_ENDPOINT ||
      'https://api.blackforestlabs.ai/v1';
  }

  /**
   * Set pricing rate dari AdapterPricingRate (dipanggil oleh BudgetService).
   * Rate tidak boleh hardcoded di adapter — harus dari database.
   */
  setPricingRate(rateStructure: unknown, currency: string): void {
    this.pricingRate = rateStructure as FluxRateStructure;
    this.currency = currency;
  }

  /**
   * Menerjemahkan prompt konseptual menjadi payload Flux.
   *
   * Prompt konseptual (dari ai-service) berisi struktur netral:
   * subject, environment, composition, lighting, camera, style,
   * referenceInstructions, constraints.
   *
   * Flux adapter menyusun ini menjadi prompt text yang optimal untuk Flux.
   */
  async buildPrompt(
    conceptualPrompt: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const sections: string[] = [];

    // === Subject ===
    const subjects = (conceptualPrompt.subject as Array<Record<string, unknown>>) || [];
    for (const subject of subjects) {
      if (subject.type === 'character') {
        sections.push(this.buildCharacterDescription(subject));
      } else if (subject.type === 'prop') {
        sections.push(this.buildPropDescription(subject));
      }
    }

    // === Environment ===
    const environment = conceptualPrompt.environment as Record<string, unknown>;
    if (environment) {
      sections.push(this.buildEnvironmentDescription(environment));
    }

    // === Composition & Camera ===
    const composition = conceptualPrompt.composition as Record<string, unknown>;
    const camera = conceptualPrompt.camera as Record<string, unknown>;
    if (composition && camera) {
      sections.push(this.buildCameraDescription(composition, camera));
    }

    // === Lighting ===
    const lighting = conceptualPrompt.lighting as Record<string, unknown>;
    if (lighting) {
      sections.push(this.buildLightingDescription(lighting));
    }

    // === Style ===
    const style = conceptualPrompt.style as Record<string, unknown>;
    if (style) {
      sections.push(this.buildStyleDescription(style));
    }

    // === Scene Context (action) ===
    const sceneContext = conceptualPrompt.sceneContext as Record<string, unknown>;
    if (sceneContext?.action) {
      sections.push(String(sceneContext.action));
    }

    const prompt = sections.filter(Boolean).join('. ');

    // === Constraints: aspect ratio → resolusi ===
    const constraints = conceptualPrompt.constraints as Record<string, unknown>;
    const aspectRatio = (constraints?.aspectRatio as string) || '16:9';
    const resolution =
      ASPECT_RATIO_RESOLUTIONS[aspectRatio] || ASPECT_RATIO_RESOLUTIONS['16:9'];

    // === Reference Images ===
    const referenceInstructions =
      (conceptualPrompt.referenceInstructions as Array<Record<string, unknown>>) || [];
    const referenceImages = referenceInstructions
      .map((r) => r.imageUrl as string)
      .filter(Boolean);

    const payload: FluxPayload = {
      prompt,
      width: resolution.width,
      height: resolution.height,
      numInferenceSteps: 28,
      guidanceScale: 7.5,
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
    };

    return payload as unknown as Record<string, unknown>;
  }

  /**
   * Validasi payload terhadap batasan teknis Flux.
   * Harus dipanggil sebelum estimateCost dan submit.
   */
  async validateConstraints(
    payload: Record<string, unknown>
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const p = payload as unknown as FluxPayload;

    if (!p.prompt || p.prompt.trim().length === 0) {
      errors.push('Prompt tidak boleh kosong');
    }

    if (p.prompt && p.prompt.length > 5000) {
      errors.push('Prompt melebihi 5000 karakter');
    }

    if (p.width < FLUX_CONSTRAINTS.minWidth || p.width > FLUX_CONSTRAINTS.maxWidth) {
      errors.push(
        `Width harus antara ${FLUX_CONSTRAINTS.minWidth} dan ${FLUX_CONSTRAINTS.maxWidth}`
      );
    }

    if (
      p.height < FLUX_CONSTRAINTS.minHeight ||
      p.height > FLUX_CONSTRAINTS.maxHeight
    ) {
      errors.push(
        `Height harus antara ${FLUX_CONSTRAINTS.minHeight} dan ${FLUX_CONSTRAINTS.maxHeight}`
      );
    }

    if (
      p.numInferenceSteps &&
      p.numInferenceSteps > FLUX_CONSTRAINTS.maxInferenceSteps
    ) {
      errors.push(
        `numInferenceSteps maksimum ${FLUX_CONSTRAINTS.maxInferenceSteps}`
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
   */
  async estimateCost(payload: Record<string, unknown>): Promise<CostEstimate> {
    if (!this.pricingRate) {
      throw new Error(
        'Pricing rate belum diset. Panggil setPricingRate() dengan data dari AdapterPricingRate terlebih dahulu.'
      );
    }

    const p = payload as unknown as FluxPayload;
    const baseRate = this.pricingRate.baseRate;

    // Cek resolution multiplier jika ada
    let multiplier = 1;
    if (this.pricingRate.resolutionMultipliers) {
      const resolutionKey = `${p.width}x${p.height}`;
      multiplier = this.pricingRate.resolutionMultipliers[resolutionKey] || 1;
    }

    const estimatedCost = baseRate * multiplier;

    return {
      adapterName: this.name,
      estimatedCost,
      currency: this.currency,
      breakdown: {
        baseRate,
        resolutionMultiplier: multiplier,
        total: estimatedCost,
      },
    };
  }

  /**
   * Eksekusi generation ke Flux.
   * HANYA boleh dipanggil setelah estimasi biaya disetujui pengguna.
   */
  async submit(
    payload: Record<string, unknown>,
    approvedCost: CostEstimate
  ): Promise<GenerationResult> {
    const p = payload as unknown as FluxPayload;

    // Validasi bahwa cost yang disetujui match dengan estimasi
    const currentEstimate = await this.estimateCost(payload);
    if (Math.abs(currentEstimate.estimatedCost - approvedCost.estimatedCost) > 0.01) {
      return {
        success: false,
        errorMessage:
          'Estimasi biaya berubah sejak approval. Silakan review ulang estimasi biaya.',
      };
    }

    try {
      // Panggil Flux API
      const response = await this.callFluxApi(p);

      if (response.success) {
        return {
          success: true,
          outputAssetUrl: response.imageUrl,
          metadata: {
            seed: response.seed,
            width: p.width,
            height: p.height,
            numInferenceSteps: p.numInferenceSteps,
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
          error instanceof Error ? error.message : 'Unknown error saat submit ke Flux',
      };
    }
  }

  // ===== Private Methods =====

  private buildCharacterDescription(character: Record<string, unknown>): string {
    const parts: string[] = [];

    if (character.name) parts.push(String(character.name));
    if (character.identity) parts.push(String(character.identity));

    const face = character.face as Record<string, unknown>;
    if (face) {
      if (face.shape) parts.push(`${face.shape} face`);
      if (face.eyeColor) parts.push(`${face.eyeColor} eyes`);
      if (face.skinColor) parts.push(`${face.skinColor} skin`);
      if (face.expression) parts.push(`${face.expression} expression`);
      if (face.distinctiveFeatures) parts.push(String(face.distinctiveFeatures));
    }

    const hair = character.hair as Record<string, unknown>;
    if (hair) {
      const hairDesc = [hair.color, hair.length, hair.texture, hair.style]
        .filter(Boolean)
        .join(' ');
      if (hairDesc) parts.push(`${hairDesc} hair`);
    }

    const body = character.body as Record<string, unknown>;
    if (body) {
      if (body.height) parts.push(String(body.height));
      if (body.build) parts.push(`${body.build} build`);
    }

    const wardrobe = character.wardrobe as Record<string, unknown>;
    if (wardrobe) {
      if (wardrobe.clothingType) parts.push(`wearing ${wardrobe.clothingType}`);
      const colors = wardrobe.colors as string[];
      if (colors?.length) parts.push(`in ${colors.join(', ')}`);
    }

    const blocking = character.blocking as Record<string, unknown>;
    if (blocking) {
      if (blocking.position) parts.push(`positioned ${blocking.position}`);
      if (blocking.orientation) parts.push(`facing ${blocking.orientation}`);
    }

    return parts.join(', ');
  }

  private buildPropDescription(prop: Record<string, unknown>): string {
    const parts: string[] = [];

    if (prop.name) parts.push(String(prop.name));

    const appearance = prop.appearance as Record<string, unknown>;
    if (appearance) {
      if (appearance.shape) parts.push(String(appearance.shape));
      if (appearance.size) parts.push(String(appearance.size));
      const colors = appearance.colors as string[];
      if (colors?.length) parts.push(colors.join(', '));
      if (appearance.material) parts.push(`made of ${appearance.material}`);
      if (appearance.condition) parts.push(`in ${appearance.condition} condition`);
    }

    return parts.join(', ');
  }

  private buildEnvironmentDescription(
    environment: Record<string, unknown>
  ): string {
    const parts: string[] = [];

    if (environment.name) parts.push(String(environment.name));
    if (environment.atmosphere) parts.push(`${environment.atmosphere} atmosphere`);

    const context = environment.context as Record<string, unknown>;
    if (context) {
      if (context.surroundings) parts.push(String(context.surroundings));
      if (context.layout) parts.push(String(context.layout));
    }

    const architecture = environment.architecture as Record<string, unknown>;
    if (architecture?.style) {
      parts.push(`${architecture.style} architecture`);
    }

    return parts.join(', ');
  }

  private buildCameraDescription(
    composition: Record<string, unknown>,
    camera: Record<string, unknown>
  ): string {
    const parts: string[] = [];

    if (camera.shotType) parts.push(`${camera.shotType} shot`);
    if (camera.position) parts.push(`${camera.position} angle`);
    if (camera.lens) parts.push(`${camera.lens} lens`);
    if (composition.framing) parts.push(`${composition.framing} framing`);
    if (composition.composition) parts.push(String(composition.composition));

    return parts.join(', ');
  }

  private buildLightingDescription(lighting: Record<string, unknown>): string {
    const parts: string[] = [];

    const location = lighting.location as Record<string, unknown>;
    if (location) {
      if (location.primarySource) parts.push(`${location.primarySource} lighting`);
      if (location.direction) parts.push(`light from ${location.direction}`);
      if (location.color) parts.push(`${location.color} light tone`);
    }

    const style = lighting.style as Record<string, unknown>;
    if (style) {
      if (style.approach) parts.push(String(style.approach));
      if (style.tendency) parts.push(`${style.tendency} lighting style`);
    }

    return parts.join(', ');
  }

  private buildStyleDescription(style: Record<string, unknown>): string {
    const parts: string[] = [];

    if (style.visualStyle) parts.push(String(style.visualStyle));

    const color = style.color as Record<string, unknown>;
    if (color) {
      if (color.palette) parts.push(`${color.palette} color palette`);
      if (color.saturation) parts.push(`${color.saturation} saturation`);
      if (color.contrast) parts.push(`${color.contrast} contrast`);
    }

    if (style.texture) parts.push(`${style.texture} texture`);

    return parts.join(', ');
  }

  private async callFluxApi(payload: FluxPayload): Promise<{
    success: boolean;
    imageUrl?: string;
    seed?: number;
    error?: string;
  }> {
    // Implementasi API call ke Flux
    // Untuk V1, ini bisa menggunakan Black Forest Labs API atau provider lain
    if (!this.apiKey) {
      return {
        success: false,
        error:
          'FLUX_API_KEY belum dikonfigurasi. Set environment variable FLUX_API_KEY.',
      };
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: payload.prompt,
          width: payload.width,
          height: payload.height,
          num_inference_steps: payload.numInferenceSteps || 28,
          guidance_scale: payload.guidanceScale || 7.5,
          seed: payload.seed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `Flux API error: ${response.status} - ${
            (errorData as Record<string, unknown>).error || response.statusText
          }`,
        };
      }

      const data = (await response.json()) as {
        images?: Array<{ url: string }>;
        seed?: number;
      };

      if (data.images && data.images.length > 0) {
        return {
          success: true,
          imageUrl: data.images[0].url,
          seed: data.seed,
        };
      }

      return {
        success: false,
        error: 'Flux API tidak mengembalikan gambar',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}