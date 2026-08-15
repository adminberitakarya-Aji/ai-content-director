/**
 * Tests untuk Flux Adapter (Fase 4).
 *
 * Menguji:
 * - buildPrompt: konversi prompt konseptual → payload Flux
 * - validateConstraints: validasi resolusi, aspect ratio, prompt length
 * - estimateCost: estimasi biaya dengan pricing rate
 * - submit: menolak submit tanpa approved cost (Budget Guard)
 */

import { FluxAdapter } from './flux.adapter';
import type { CostEstimate } from '../base-generation-adapter.interface';

describe('FluxAdapter', () => {
  let adapter: FluxAdapter;

  beforeEach(() => {
    adapter = new FluxAdapter();
    adapter.setPricingRate(
      {
        unit: 'per_image',
        baseRate: 0.03,
        resolutionMultipliers: {
          '1024x1024': 1.0,
          '1920x1080': 1.5,
        },
      },
      'USD'
    );
  });

  describe('buildPrompt', () => {
    it('membangun payload dari prompt konseptual lengkap', async () => {
      const conceptual = {
        subject: [
          {
            type: 'character',
            id: 'A01',
            name: 'Rina',
            identity: 'Detektif muda',
            face: {
              shape: 'oval',
              eyeColor: 'brown',
              skinColor: 'tan',
              expression: 'serious',
            },
            hair: { color: 'black', length: 'shoulder', style: 'ponytail' },
            wardrobe: { clothingType: 'blazer', colors: ['navy'] },
          },
        ],
        environment: {
          name: 'Kantor Polisi',
          atmosphere: 'busy',
          context: { layout: 'open space' },
        },
        composition: {
          framing: 'centered',
          composition: 'rule of thirds',
          visualBeat: 'menyadari sesuatu',
        },
        lighting: {
          location: { primarySource: 'fluorescent', direction: 'overhead' },
          style: { approach: 'motivated lighting' },
        },
        camera: {
          shotType: 'medium',
          position: 'eye-level',
          lens: '50mm',
          movement: 'static',
        },
        style: {
          visualStyle: 'cinematic realism',
          color: { palette: 'teal and orange', saturation: 'medium' },
        },
        constraints: { aspectRatio: '16:9' },
      };

      const payload = (await adapter.buildPrompt(conceptual)) as {
        prompt: string;
        width: number;
        height: number;
      };

      expect(payload.prompt).toBeDefined();
      expect(typeof payload.prompt).toBe('string');
      expect(payload.prompt.length).toBeGreaterThan(0);

      // Prompt harus memuat elemen-elemen kunci
      expect(payload.prompt).toContain('Rina');
      expect(payload.prompt).toContain('Kantor Polisi');
      expect(payload.prompt).toContain('cinematic realism');

      // Aspect ratio 16:9 → resolusi landscape
      expect(payload.width).toBeGreaterThan(payload.height);
    });

    it('menangani prompt konseptual tanpa karakter (environment only)', async () => {
      const conceptual = {
        subject: [],
        environment: { name: 'Hutan', atmosphere: 'misty' },
        composition: { framing: 'wide', composition: 'symmetrical' },
        lighting: { location: { primarySource: 'natural' } },
        camera: { shotType: 'wide', position: 'eye-level' },
        style: { visualStyle: 'documentary' },
        constraints: { aspectRatio: '16:9' },
      };

      const payload = (await adapter.buildPrompt(conceptual)) as { prompt: string };
      expect(payload.prompt).toContain('Hutan');
    });
  });

  describe('validateConstraints', () => {
    it('meloloskan payload valid', async () => {
      const result = await adapter.validateConstraints({
        prompt: 'A valid prompt',
        width: 1024,
        height: 1024,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('menolak prompt kosong', async () => {
      const result = await adapter.validateConstraints({
        prompt: '',
        width: 1024,
        height: 1024,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes('prompt'))).toBe(
        true
      );
    });

    it('menolak prompt terlalu panjang', async () => {
      const result = await adapter.validateConstraints({
        prompt: 'x'.repeat(20000),
        width: 1024,
        height: 1024,
      });

      expect(result.valid).toBe(false);
    });

    it('menolak resolusi di luar batas', async () => {
      const result = await adapter.validateConstraints({
        prompt: 'valid prompt',
        width: 100,
        height: 100,
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('estimateCost', () => {
    it('menghitung biaya base rate untuk resolusi default', async () => {
      const estimate = await adapter.estimateCost({
        prompt: 'test',
        width: 1024,
        height: 1024,
      });

      expect(estimate.estimatedCost).toBeCloseTo(0.03);
      expect(estimate.currency).toBe('USD');
    });

    it('mengalikan biaya untuk resolusi premium', async () => {
      const estimate = await adapter.estimateCost({
        prompt: 'test',
        width: 1920,
        height: 1080,
      });

      expect(estimate.estimatedCost).toBeCloseTo(0.045); // 0.03 * 1.5
    });
  });

  describe('submit — Budget Guard', () => {
    it('menolak submit dengan approved cost di bawah estimasi (cost berubah)', async () => {
      const lowCost: CostEstimate = {
        adapterName: 'flux',
        estimatedCost: 0.001,
        currency: 'USD',
        breakdown: {},
      };

      const result = await adapter.submit(
        { prompt: 'test', width: 1024, height: 1024 },
        lowCost
      );

      // Budget Guard di adapter: estimasi berubah sejak approval → gagal
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Estimasi biaya berubah');
    });

    it('menolak submit ketika pricing rate belum diset', async () => {
      const freshAdapter = new FluxAdapter();
      const cost: CostEstimate = {
        adapterName: 'flux',
        estimatedCost: 0.03,
        currency: 'USD',
        breakdown: {},
      };

      // estimateCost throw karena pricing rate belum diset → submit ikut reject
      await expect(
        freshAdapter.submit({ prompt: 'test', width: 1024, height: 1024 }, cost)
      ).rejects.toThrow('Pricing rate belum diset');
    });
  });
});