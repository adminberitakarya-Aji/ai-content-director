import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  BudgetService,
  CreatePricingRateInput,
  RateStructure,
} from './budget.service';

/**
 * Budget Controller — endpoint untuk estimasi biaya dan admin rate management.
 *
 * Endpoint:
 * - POST /budget/estimate — hitung estimasi biaya (dipanggil sebelum submit)
 * - GET /budget/rates — lihat semua rate (admin)
 * - POST /budget/rates — buat rate baru (admin)
 * - PATCH /budget/rates/:id — update rate (admin)
 * - DELETE /budget/rates/:id — hapus rate non-aktif (admin)
 */
@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  /**
   * Hitung estimasi biaya untuk generation job.
   * WAJIB dipanggil sebelum submit ke adapter.
   */
  @Post('estimate')
  estimateCost(
    @Body()
    body: {
      adapterName: string;
      generationType: 'image' | 'video';
      width?: number;
      height?: number;
      durationSeconds?: number;
    }
  ) {
    return this.budgetService.estimateCost(body.adapterName, body.generationType, {
      width: body.width,
      height: body.height,
      durationSeconds: body.durationSeconds,
    });
  }

  /**
   * Ambil rate aktif untuk adapter tertentu.
   */
  @Get('rates/active')
  getActiveRate(
    @Query('adapterName') adapterName: string,
    @Query('generationType') generationType: string
  ) {
    return this.budgetService.getActiveRate(adapterName, generationType);
  }

  /**
   * Ambil semua rate (admin dashboard).
   */
  @Get('rates')
  findAllRates(@Query('adapterName') adapterName?: string) {
    return this.budgetService.findAllPricingRates(adapterName);
  }

  /**
   * Buat rate baru (admin).
   */
  @Post('rates')
  createRate(@Body() input: CreatePricingRateInput) {
    return this.budgetService.createPricingRate(input);
  }

  /**
   * Update rate (admin).
   */
  @Patch('rates/:id')
  updateRate(
    @Param('id') id: string,
    @Body()
    input: { rateStructure?: RateStructure; isActive?: boolean; currency?: string }
  ) {
    return this.budgetService.updatePricingRate(id, input);
  }

  /**
   * Hapus rate non-aktif (admin).
   */
  @Delete('rates/:id')
  deleteRate(@Param('id') id: string) {
    return this.budgetService.deletePricingRate(id);
  }
}