import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VideoPromptService } from './video-prompt.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BudgetService } from '../budget/budget.service';
import { CapabilityService } from '../capability/capability.service';

describe('VideoPromptService', () => {
  let service: VideoPromptService;

  const mockPrisma = {
    generationJob: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  };

  const mockBudgetService = {
    validateBudgetApproval: jest.fn(),
    getActiveRate: jest.fn(),
  };

  const mockCapabilityService = {
    isVideoGenerationEnabled: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoPromptService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BudgetService, useValue: mockBudgetService },
        { provide: CapabilityService, useValue: mockCapabilityService },
      ],
    }).compile();

    service = module.get<VideoPromptService>(VideoPromptService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitJob — Budget Guard end-to-end', () => {
    it('should throw NotFoundException when job does not exist', async () => {
      mockPrisma.generationJob.findUnique.mockResolvedValue(null);

      await expect(service.submitJob('job-x')).rejects.toThrow(NotFoundException);
    });

    it('should call budgetService.validateBudgetApproval BEFORE touching the adapter', async () => {
      mockPrisma.generationJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'pending', // belum approved
        costEstimate: 1.0,
        projectId: 'project-1',
        promptFinal: '{}',
        adapterName: 'seedance',
        currency: 'USD',
      });

      // Simulasikan Budget Guard menolak (job belum approved)
      mockBudgetService.validateBudgetApproval.mockImplementation(() => {
        throw new ForbiddenException('belum approved');
      });

      await expect(service.submitJob('job-1')).rejects.toThrow(ForbiddenException);

      // Karena Budget Guard menolak di awal, status job TIDAK BOLEH berubah
      // ke 'submitted' dan capability TIDAK BOLEH dicek — proses harus berhenti
      // total di titik ini, bukan lanjut ke langkah berikutnya.
      expect(mockPrisma.generationJob.update).not.toHaveBeenCalled();
      expect(mockCapabilityService.isVideoGenerationEnabled).not.toHaveBeenCalled();
    });

    it('should proceed to capability check and submit only when job is approved', async () => {
      const job = {
        id: 'job-1',
        status: 'approved',
        costEstimate: 1.0,
        projectId: 'project-1',
        promptFinal: JSON.stringify({
          prompt: 'test prompt',
          imageUrl: 'https://example.com/img.png',
          durationSeconds: 5,
          width: 1280,
          height: 720,
        }),
        adapterName: 'seedance',
        currency: 'USD',
      };
      mockPrisma.generationJob.findUnique.mockResolvedValue(job);
      mockBudgetService.validateBudgetApproval.mockImplementation(() => undefined); // lolos
      mockCapabilityService.isVideoGenerationEnabled.mockResolvedValue(true);
      mockBudgetService.getActiveRate.mockResolvedValue(null);
      mockPrisma.project.findUnique.mockResolvedValue({ aspectRatio: '16:9' });
      mockPrisma.generationJob.update.mockResolvedValue({ ...job, status: 'submitted' });

      // Mock instance seedanceAdapter yang dibuat internal di constructor
      const submitSpy = jest
        .spyOn((service as any).seedanceAdapter, 'submit')
        .mockResolvedValue({ success: true, outputAssetUrl: 'https://example.com/video.mp4' });

      await service.submitJob('job-1');

      expect(mockBudgetService.validateBudgetApproval).toHaveBeenCalledWith(job);
      expect(submitSpy).toHaveBeenCalled();
      // Status harus transisi ke 'submitted' sebelum hasil akhir diproses
      expect(mockPrisma.generationJob.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'submitted' } }),
      );
    });

    it('should throw ForbiddenException when video generation capability is disabled, even if job is approved', async () => {
      mockPrisma.generationJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'approved',
        costEstimate: 1.0,
        projectId: 'project-1',
        promptFinal: '{}',
        adapterName: 'seedance',
        currency: 'USD',
      });
      mockBudgetService.validateBudgetApproval.mockImplementation(() => undefined);
      mockCapabilityService.isVideoGenerationEnabled.mockResolvedValue(false);

      await expect(service.submitJob('job-1')).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.generationJob.update).not.toHaveBeenCalled();
    });
  });

  describe('approveJob', () => {
    it('should only allow approving a job with status "pending"', async () => {
      mockPrisma.generationJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'submitted',
      });

      await expect(service.approveJob('job-1')).rejects.toThrow();
    });

    it('should transition pending -> approved', async () => {
      mockPrisma.generationJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'pending',
      });
      mockPrisma.generationJob.update.mockResolvedValue({
        id: 'job-1',
        status: 'approved',
      });

      const result = await service.approveJob('job-1');
      expect(result.status).toBe('approved');
    });
  });
});