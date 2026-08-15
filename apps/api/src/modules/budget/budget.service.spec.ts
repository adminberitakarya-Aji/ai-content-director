import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BudgetService', () => {
  let service: BudgetService;

  const mockPrisma = {
    adapterPricingRate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BudgetService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBudgetApproval — Budget Guard wajib, tanpa terkecuali', () => {
    it('should throw ForbiddenException when job status is "pending" (belum approved)', () => {
      expect(() =>
        service.validateBudgetApproval({ status: 'pending', costEstimate: 10 }),
      ).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when job status is "draft"', () => {
      expect(() =>
        service.validateBudgetApproval({ status: 'draft', costEstimate: 10 }),
      ).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when job status is "rejected"', () => {
      expect(() =>
        service.validateBudgetApproval({ status: 'rejected', costEstimate: 10 }),
      ).toThrow(ForbiddenException);
    });

    it('should NOT throw when job status is "approved"', () => {
      expect(() =>
        service.validateBudgetApproval({ status: 'approved', costEstimate: 10 }),
      ).not.toThrow();
    });
  });

  describe('estimateCost', () => {
    it('should throw NotFoundException when no active rate is configured', async () => {
      mockPrisma.adapterPricingRate.findFirst.mockResolvedValue(null);

      await expect(service.estimateCost('flux', 'image', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should compute cost with resolution multiplier for image', async () => {
      mockPrisma.adapterPricingRate.findFirst.mockResolvedValue({
        id: 'rate-1',
        adapterName: 'flux',
        generationType: 'image',
        currency: 'USD',
        rateStructure: {
          unit: 'per_image',
          baseRate: 0.05,
          resolutionMultipliers: { '1024x1024': 1, '1920x1080': 2 },
        },
      });

      const result = await service.estimateCost('flux', 'image', {
        width: 1920,
        height: 1080,
      });

      expect(result.estimatedCost).toBeCloseTo(0.1); // 0.05 * 2
      expect(result.rateId).toBe('rate-1');
    });

    it('should compute cost with duration rate for video', async () => {
      mockPrisma.adapterPricingRate.findFirst.mockResolvedValue({
        id: 'rate-2',
        adapterName: 'seedance',
        generationType: 'video',
        currency: 'USD',
        rateStructure: { unit: 'per_second', baseRate: 0.1, durationRate: 0.2 },
      });

      const result = await service.estimateCost('seedance', 'video', {
        durationSeconds: 5,
      });

      expect(result.estimatedCost).toBeCloseTo(1.0); // 0.2 * 5
    });
  });

  describe('createPricingRate', () => {
    it('should reject unknown adapterName', async () => {
      await expect(
        service.createPricingRate({
          adapterName: 'unknown-adapter',
          generationType: 'image',
          rateStructure: { unit: 'per_image', baseRate: 1 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject baseRate <= 0', async () => {
      await expect(
        service.createPricingRate({
          adapterName: 'flux',
          generationType: 'image',
          rateStructure: { unit: 'per_image', baseRate: 0 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should deactivate old active rate before creating a new one (riwayat harga tetap ada)', async () => {
      mockPrisma.adapterPricingRate.create.mockResolvedValue({ id: 'rate-new' });

      await service.createPricingRate({
        adapterName: 'flux',
        generationType: 'image',
        rateStructure: { unit: 'per_image', baseRate: 0.05 },
      });

      expect(mockPrisma.adapterPricingRate.updateMany).toHaveBeenCalledWith({
        where: { adapterName: 'flux', generationType: 'image', isActive: true },
        data: { isActive: false },
      });
      expect(mockPrisma.adapterPricingRate.create).toHaveBeenCalled();
    });
  });

  describe('deletePricingRate', () => {
    it('should reject deleting an active rate', async () => {
      mockPrisma.adapterPricingRate.findUnique.mockResolvedValue({
        id: 'rate-1',
        isActive: true,
      });

      await expect(service.deletePricingRate('rate-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow deleting an inactive rate', async () => {
      mockPrisma.adapterPricingRate.findUnique.mockResolvedValue({
        id: 'rate-1',
        isActive: false,
      });
      mockPrisma.adapterPricingRate.delete.mockResolvedValue({ id: 'rate-1' });

      await expect(service.deletePricingRate('rate-1')).resolves.toEqual({ id: 'rate-1' });
    });
  });
});