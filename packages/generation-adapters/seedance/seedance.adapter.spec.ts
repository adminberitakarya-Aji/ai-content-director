/**
 * Tests untuk Seedance Adapter (Fase 5).
 *
 * Menguji:
 * - buildPrompt: konversi Video Prompt konseptual → payload Seedance
 * - normalizeFluxOutput: normalisasi output Flux → input Seedance
 * - validateConstraints: validasi durasi, resolusi, imageUrl, prompt length
 * - estimateCost: estimasi biaya dengan pricing rate (durationRate × durasi, selaras BudgetService)
 * - submit: menolak submit tanpa approved cost yang match (Budget Guard)
 */

import { SeedanceAdapter } from './seedance.adapter';
import type { CostEstimate } from '../base-generation-adapter.interface';

describe('SeedanceAdapter', () => {
  let adapter: SeedanceAdapter;

  beforeEach(() => {
    adapter = new SeedanceAdapter();
    adapter.setPricingRate(
      {
        unit: 'per_second',
        baseRate: 0.1,
        durationRate: 0.2,
        resolutionMultipliers: {
          '1280x720': 1.0,
          '1920x1080': 1.5,
        },
      },
      'USD'
    );
  });

  describe('buildPrompt', () => {
    it('membangun payload dari Video Prompt konseptual lengkap', async () => {
      const conceptual = {
        baseImagePrompt: { subject: [], environment: {} },
        sourceImageUrl: 'https://example.com/flux-output.png',
        subjectReference: { subjects: [] },
        action: 'Rina berjalan masuk ke kantor polisi',
        shotFocus: 'Rina menyadari sesuatu dan menoleh',
        characterMotion: [
          {
            characterId: 'A01',
            name: 'Rina',
            position: 'center',
            orientation: 'camera',
            emotion: 'curious',
            motion: 'Rina berjalan masuk, berada di center, dengan emosi curious',
          },
        ],
        cameraMotion: {
          movement: 'tracking',
          shotType: 'medium',
          position: 'eye-level',
          instruction: 'Kamera tracking mengikuti pergerakan karakter (medium shot, eye-level angle)',
        },
        environmentMotion: {
          atmosphere: 'busy',
          time: 'day',
          elements: [],
          note: "Atmosfer lokasi 'busy' menjadi konteks gerak lingkungan.",
        },
        physics: {
          mode: 'realistic',
          instruction: 'Semua elemen bergerak taat pada logika dunia nyata.',
        },
        temporalLogic: {
          beats: [
            { phase: 'beginning', description: 'Shot dibuka' },
            { phase: 'middle', description: 'Aksi utama' },
            { phase: 'end', description: 'Beat tercapai' },
          ],
        },
        cinematography: { shotType: 'medium', movement: 'tracking' },
        constraints: { aspectRatio: '16:9', durationSeconds: 5 },
      };

      const payload = (await adapter.buildPrompt(conceptual)) as {
        prompt: string;
        imageUrl: string;
        durationSeconds: number;
        width: number;
        height: number;
      };

      expect(payload.prompt).toBeDefined();
      expect(typeof payload.prompt).toBe('string');
      expect(payload.prompt.length).toBeGreaterThan(0);

      // Prompt harus memuat elemen-elemen kunci gerakan
      expect(payload.prompt).toContain('Rina berjalan masuk');
      expect(payload.prompt).toContain('tracking');

      // Source image URL diteruskan sebagai starting frame
      expect(payload.imageUrl).toBe('https://example.com/flux-output.png');

      // Durasi dari constraints
      expect(payload.durationSeconds).toBe(5);

      // Aspect ratio 16:9 → resolusi landscape
      expect(payload.width).toBeGreaterThan(payload.height);
    });

    it('menggunakan durasi default 5 detik jika tidak ada di constraints', async () => {
      const conceptual = {
        action: 'Karakter berjalan',
        constraints: { aspectRatio: '16:9' },
        sourceImageUrl: 'https://example.com/img.png',
      };

      const payload = (await adapter.buildPrompt(conceptual)) as {
        durationSeconds: number;
      };

      expect(payload.durationSeconds).toBe(5);
    });
  });

  describe('normalizeFluxOutput', () => {
    it('menormalisasi URL Flux yang valid tanpa warning', () => {
      const result = adapter.normalizeFluxOutput(
        'https://example.com/flux-output.png',
        '16:9'
      );

      expect(result.normalizedUrl).toBe('https://example.com/flux-output.png');
      expect(result.targetResolution).toEqual({ width: 1280, height: 720 });
      expect(result.warnings).toHaveLength(0);
    });

    it('memberi warning untuk URL kosong', () => {
      const result = adapter.normalizeFluxOutput('', '16:9');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('kosong');
    });

    it('memberi warning untuk URL bukan http/https', () => {
      const result = adapter.normalizeFluxOutput('file://local/image.png', '16:9');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('bukan URL valid');
    });

    it('memilih resolusi target sesuai aspect ratio', () => {
      const portrait = adapter.normalizeFluxOutput('https://x.com/a.png', '9:16');
      expect(portrait.targetResolution).toEqual({ width: 720, height: 1280 });

      const square = adapter.normalizeFluxOutput('https://x.com/a.png', '1:1');
      expect(square.targetResolution).toEqual({ width: 960, height: 960 });
    });
  });

  describe('validateConstraints', () => {
    const validPayload = {
      prompt: 'A valid prompt',
      imageUrl: 'https://example.com/img.png',
      durationSeconds: 5,
      width: 1280,
      height: 720,
    };

    it('meloloskan payload valid', async () => {
      const result = await adapter.validateConstraints(validPayload);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('menolak prompt kosong', async () => {
      const result = await adapter.validateConstraints({
        ...validPayload,
        prompt: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes('prompt'))).toBe(true);
    });

    it('menolak prompt terlalu panjang', async () => {
      const result = await adapter.validateConstraints({
        ...validPayload,
        prompt: 'x'.repeat(5000),
      });

      expect(result.valid).toBe(false);
    });

    it('menolak payload tanpa imageUrl (wajib untuk image-to-video)', async () => {
      const result = await adapter.validateConstraints({
        ...validPayload,
        imageUrl: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('imageUrl'))).toBe(true);
    });

    it('menolak durasi di atas maksimum', async () => {
      const result = await adapter.validateConstraints({
        ...validPayload,
        durationSeconds: 15,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('maksimum'))).toBe(true);
    });

    it('menolak durasi di bawah minimum', async () => {
      const result = await adapter.validateConstraints({
        ...validPayload,
        durationSeconds: 0.5,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('minimum'))).toBe(true);
    });

    it('menolak resolusi yang tidak didukung', async () => {
      const result = await adapter.validateConstraints({
        ...validPayload,
        width: 800,
        height: 600,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Resolusi'))).toBe(true);
    });
  });

  describe('estimateCost', () => {
    it('menghitung biaya durationRate × durasi (selaras dengan BudgetService)', async () => {
      const estimate = await adapter.estimateCost({
        prompt: 'test',
        imageUrl: 'https://example.com/img.png',
        durationSeconds: 5,
        width: 1280,
        height: 720,
      });

      // 0.2 × 5 = 1.0 (selaras dengan BudgetService.estimateCost untuk video)
      expect(estimate.estimatedCost).toBeCloseTo(1.0);
      expect(estimate.currency).toBe('USD');
      expect(estimate.breakdown.durationSeconds).toBe(5);
    });

    it('menggunakan baseRate sebagai fallback jika durationRate tidak diset', async () => {
      const adapterNoDuration = new SeedanceAdapter();
      adapterNoDuration.setPricingRate(
        { unit: 'per_second', baseRate: 0.3 },
        'USD'
      );

      const estimate = await adapterNoDuration.estimateCost({
        prompt: 'test',
        imageUrl: 'https://example.com/img.png',
        durationSeconds: 4,
        width: 1280,
        height: 720,
      });

      // fallback: baseRate 0.3 × 4 = 1.2
      expect(estimate.estimatedCost).toBeCloseTo(1.2);
    });

    it('melempar error jika pricing rate belum diset', async () => {
      const freshAdapter = new SeedanceAdapter();

      await expect(
        freshAdapter.estimateCost({
          prompt: 'test',
          imageUrl: 'https://example.com/img.png',
          durationSeconds: 5,
          width: 1280,
          height: 720,
        })
      ).rejects.toThrow('Pricing rate belum diset');
    });
  });

  describe('submit — Budget Guard', () => {
    it('menolak submit dengan approved cost di bawah estimasi (cost berubah)', async () => {
      const lowCost: CostEstimate = {
        adapterName: 'seedance',
        estimatedCost: 0.001,
        currency: 'USD',
        breakdown: {},
      };

      const result = await adapter.submit(
        {
          prompt: 'test',
          imageUrl: 'https://example.com/img.png',
          durationSeconds: 5,
          width: 1280,
          height: 720,
        },
        lowCost
      );

      // Budget Guard di adapter: estimasi berubah sejak approval → gagal
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Estimasi biaya berubah');
    });

    it('menolak submit ketika pricing rate belum diset', async () => {
      const freshAdapter = new SeedanceAdapter();
      const cost: CostEstimate = {
        adapterName: 'seedance',
        estimatedCost: 1.1,
        currency: 'USD',
        breakdown: {},
      };

      await expect(
        freshAdapter.submit(
          {
            prompt: 'test',
            imageUrl: 'https://example.com/img.png',
            durationSeconds: 5,
            width: 1280,
            height: 720,
          },
          cost
        )
      ).rejects.toThrow('Pricing rate belum diset');
    });
  });
});