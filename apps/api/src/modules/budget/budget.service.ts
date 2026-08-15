import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Budget Guard Service — kontrol biaya generation.
 *
 * Prinsip (PRD.md 10.3, CLAUDE.md, docs/instructions/02_decision_rules.md):
 * - WAJIB untuk setiap Generation Job, tanpa terkecuali
 * - Rate disimpan di AdapterPricingRate (bukan hardcoded, bukan fetch live)
 * - Estimasi harus disetujui pengguna sebelum submit (approval eksplisit)
 */

export interface RateStructure {
  unit: 'per_image' | 'per_second' | 'per_resolution';
  baseRate: number;
  resolutionMultipliers?: Record<string, number>;
  durationRate?: number;
}

export interface CreatePricingRateInput {
  adapterName: string;
  generationType: 'image' | 'video';
  rateStructure: RateStructure;
  currency?: string;
  effectiveDate?: Date;
}

export interface CostEstimateResult {
  adapterName: string;
  generationType: string;
  estimatedCost: number;
  currency: string;
  breakdown: Record<string, number>;
  rateId: string;
}

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ambil rate aktif untuk adapter + generation type.
   * Rate diambil yang isActive=true, diurutkan berdasarkan effectiveDate desc.
   */
  async getActiveRate(adapterName: string, generationType: string) {
    const rate = await this.prisma.adapterPricingRate.findFirst({
      where: {
        adapterName,
        generationType,
        isActive: true,
      },
      orderBy: { effectiveDate: 'desc' },
    });

    return rate;
  }

  /**
   * Hitung estimasi biaya untuk sebuah generation job.
   * WAJIB dipanggil sebelum submit ke adapter.
   *
   * @param adapterName - nama adapter (flux, seedance, dst)
   * @param generationType - image atau video
   * @param params - parameter generation (resolution, duration, dst)
   */
  async estimateCost(
    adapterName: string,
    generationType: string,
    params: { width?: number; height?: number; durationSeconds?: number } = {}
  ): Promise<CostEstimateResult> {
    const rate = await this.getActiveRate(adapterName, generationType);

    if (!rate) {
      throw new NotFoundException(
        `Rate harga untuk adapter ${adapterName} (${generationType}) belum dikonfigurasi. ` +
          'Hubungi admin untuk mengatur AdapterPricingRate.'
      );
    }

    const rateStructure = rate.rateStructure as unknown as RateStructure;
    const baseRate = rateStructure.baseRate || 0;

    let estimatedCost = baseRate;
    const breakdown: Record<string, number> = { baseRate };

    // Resolution multiplier untuk image
    if (generationType === 'image' && params.width && params.height) {
      const resolutionKey = `${params.width}x${params.height}`;
      const multiplier = rateStructure.resolutionMultipliers?.[resolutionKey] || 1;
      estimatedCost *= multiplier;
      breakdown.resolutionMultiplier = multiplier;
    }

    // Duration rate untuk video
    if (generationType === 'video' && params.durationSeconds) {
      const durationRate = rateStructure.durationRate || baseRate;
      estimatedCost = durationRate * params.durationSeconds;
      breakdown.durationSeconds = params.durationSeconds;
      breakdown.durationRate = durationRate;
    }

    breakdown.total = estimatedCost;

    return {
      adapterName,
      generationType,
      estimatedCost,
      currency: rate.currency,
      breakdown,
      rateId: rate.id,
    };
  }

  /**
   * Validasi bahwa estimasi biaya sudah disetujui.
   * Dipanggil sebelum submit — jika belum approved, throw ForbiddenException.
   *
   * Ini adalah gate wajib Budget Guard — TIDAK ADA jalur submit yang melewati ini.
   */
  validateBudgetApproval(job: {
    status: string;
    costEstimate: number;
  }): void {
    if (job.status !== 'approved') {
      throw new ForbiddenException(
        'Generation job belum disetujui. Estimasi biaya harus di-approve terlebih dahulu sebelum submit ke adapter. ' +
          '(Budget Guard — wajib, tanpa terkecuali)'
      );
    }
  }

  // ===== Admin: CRUD AdapterPricingRate =====

  /**
   * Buat rate harga baru (admin).
   * Rate lama tetap ada (tidak ditimpa) — untuk riwayat harga.
   */
  async createPricingRate(input: CreatePricingRateInput) {
    // Validasi adapterName dan generationType
    const validAdapters = ['flux', 'seedance', 'veo', 'kling', 'wan', 'runway'];
    if (!validAdapters.includes(input.adapterName)) {
      throw new BadRequestException(
        `Adapter ${input.adapterName} tidak valid. Pilihan: ${validAdapters.join(', ')}`
      );
    }

    if (!['image', 'video'].includes(input.generationType)) {
      throw new BadRequestException('generationType harus image atau video');
    }

    if (!input.rateStructure.baseRate || input.rateStructure.baseRate <= 0) {
      throw new BadRequestException('baseRate harus lebih dari 0');
    }

    // Nonaktifkan rate lama untuk adapter+type yang sama
    await this.prisma.adapterPricingRate.updateMany({
      where: {
        adapterName: input.adapterName,
        generationType: input.generationType,
        isActive: true,
      },
      data: { isActive: false },
    });

    // Buat rate baru
    return this.prisma.adapterPricingRate.create({
      data: {
        adapterName: input.adapterName,
        generationType: input.generationType,
        rateStructure: input.rateStructure as any,
        currency: input.currency || 'USD',
        effectiveDate: input.effectiveDate || new Date(),
        isActive: true,
      },
    });
  }

  /**
   * Ambil semua rate (admin dashboard).
   */
  async findAllPricingRates(adapterName?: string) {
    return this.prisma.adapterPricingRate.findMany({
      where: adapterName ? { adapterName } : undefined,
      orderBy: [{ adapterName: 'asc' }, { effectiveDate: 'desc' }],
    });
  }

  /**
   * Update rate (admin) — hanya bisa ubah isActive atau rateStructure.
   */
  async updatePricingRate(
    id: string,
    input: { rateStructure?: RateStructure; isActive?: boolean; currency?: string }
  ) {
    const rate = await this.prisma.adapterPricingRate.findUnique({
      where: { id },
    });

    if (!rate) {
      throw new NotFoundException(`Rate dengan id ${id} tidak ditemukan`);
    }

    return this.prisma.adapterPricingRate.update({
      where: { id },
      data: {
        rateStructure: input.rateStructure as any,
        isActive: input.isActive,
        currency: input.currency,
      },
    });
  }

  /**
   * Hapus rate (admin) — hanya untuk rate yang tidak aktif.
   */
  async deletePricingRate(id: string) {
    const rate = await this.prisma.adapterPricingRate.findUnique({
      where: { id },
    });

    if (!rate) {
      throw new NotFoundException(`Rate dengan id ${id} tidak ditemukan`);
    }

    if (rate.isActive) {
      throw new BadRequestException(
        'Rate aktif tidak bisa dihapus. Nonaktifkan terlebih dahulu.'
      );
    }

    return this.prisma.adapterPricingRate.delete({ where: { id } });
  }
}