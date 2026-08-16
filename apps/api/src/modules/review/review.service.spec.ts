import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Fase 6.7 — Test: reject di Review memicu status kembali ke draft.
 *
 * Mencakup seluruh jalur ReviewService:
 * - Reject hasil GenerationJob (review → review_rejected) WAJIB mengembalikan
 *   Shot terkait ke 'draft' dalam satu transaksi
 * - Approve hasil GenerationJob (review → final) tidak menyentuh Shot
 * - Transisi invalid ditolak dengan BadRequestException
 * - Reject Shot dan Bible berjalan sesuai tabel transisi
 * - findPendingReviews mengumpulkan antrean dari semua jenis entitas
 */
describe('ReviewService', () => {
  let service: ReviewService;

  const mockPrisma = {
    characterBible: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    locationBible: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    propBible: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    styleBible: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    shot: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    generationJob: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GenerationJob review — reject memicu Shot kembali ke draft (6.7)', () => {
    it('reject hasil generation (review → review_rejected) mengembalikan Shot terkait ke draft dalam satu transaksi', async () => {
      const job = {
        id: 'job-1',
        shotId: 'shot-1',
        status: 'review',
        type: 'image',
        adapterName: 'flux',
      };
      mockPrisma.generationJob.findUnique.mockResolvedValue(job);

      const updatedJob = { ...job, status: 'review_rejected' };
      mockPrisma.generationJob.update.mockResolvedValue(updatedJob);
      mockPrisma.shot.update.mockResolvedValue({ id: 'shot-1', status: 'draft' });
      mockPrisma.$transaction.mockImplementation(async (ops: any[]) =>
        Promise.all(ops),
      );

      const result = await service.updateStatus('generation-job', 'job-1', 'review_rejected');

      expect(result.status).toBe('review_rejected');
      // Transisi dijalankan dalam transaksi atomik
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // Shot terkait dikembalikan ke draft
      expect(mockPrisma.shot.update).toHaveBeenCalledWith({
        where: { id: 'shot-1' },
        data: { status: 'draft' },
      });
    });

    it('approve hasil generation (review → final) TIDAK mengubah status Shot', async () => {
      const job = {
        id: 'job-1',
        shotId: 'shot-1',
        status: 'review',
        type: 'video',
        adapterName: 'seedance',
      };
      mockPrisma.generationJob.findUnique.mockResolvedValue(job);
      mockPrisma.generationJob.update.mockResolvedValue({ ...job, status: 'final' });

      const result = await service.updateStatus('generation-job', 'job-1', 'final');

      expect(result.status).toBe('final');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.shot.update).not.toHaveBeenCalled();
    });

    it('menolak transisi invalid: pending → final', async () => {
      mockPrisma.generationJob.findUnique.mockResolvedValue({
        id: 'job-1',
        shotId: 'shot-1',
        status: 'pending',
      });

      await expect(
        service.updateStatus('generation-job', 'job-1', 'final'),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak approve untuk job yang sudah review_rejected (keputusan final)', async () => {
      mockPrisma.generationJob.findUnique.mockResolvedValue({
        id: 'job-1',
        shotId: 'shot-1',
        status: 'review_rejected',
      });

      await expect(
        service.updateStatus('generation-job', 'job-1', 'final'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throw NotFoundException jika job tidak ada', async () => {
      mockPrisma.generationJob.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('generation-job', 'missing', 'final'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Shot review (Storyboard)', () => {
    it('approve shot (review → approved) berhasil', async () => {
      mockPrisma.shot.findUnique.mockResolvedValue({ id: 'shot-1', status: 'review' });
      mockPrisma.shot.update.mockResolvedValue({ id: 'shot-1', status: 'approved' });

      const result = await service.updateStatus('shot', 'shot-1', 'approved');

      expect(result.status).toBe('approved');
      expect(mockPrisma.shot.update).toHaveBeenCalledWith({
        where: { id: 'shot-1' },
        data: { status: 'approved' },
      });
    });

    it('reject shot (review → rejected) berhasil', async () => {
      mockPrisma.shot.findUnique.mockResolvedValue({ id: 'shot-1', status: 'review' });
      mockPrisma.shot.update.mockResolvedValue({ id: 'shot-1', status: 'rejected' });

      const result = await service.updateStatus('shot', 'shot-1', 'rejected');

      expect(result.status).toBe('rejected');
    });

    it('menolak approve shot yang masih draft (harus diajukan ke review dulu)', async () => {
      mockPrisma.shot.findUnique.mockResolvedValue({ id: 'shot-1', status: 'draft' });

      await expect(
        service.updateStatus('shot', 'shot-1', 'approved'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Bible review', () => {
    it('approve character bible (review → approved) berhasil', async () => {
      mockPrisma.characterBible.findUnique.mockResolvedValue({
        id: 'cb-1',
        status: 'review',
      });
      mockPrisma.characterBible.update.mockResolvedValue({
        id: 'cb-1',
        status: 'approved',
      });

      const result = await service.updateStatus('character', 'cb-1', 'approved');

      expect(result.status).toBe('approved');
    });

    it('reject style bible (review → rejected) berhasil', async () => {
      mockPrisma.styleBible.findUnique.mockResolvedValue({
        id: 'sb-1',
        status: 'review',
      });
      mockPrisma.styleBible.update.mockResolvedValue({
        id: 'sb-1',
        status: 'rejected',
      });

      const result = await service.updateStatus('style', 'sb-1', 'rejected');

      expect(result.status).toBe('rejected');
    });

    it('menolak transisi invalid bible: draft → approved', async () => {
      mockPrisma.locationBible.findUnique.mockResolvedValue({
        id: 'lb-1',
        status: 'draft',
      });

      await expect(
        service.updateStatus('location', 'lb-1', 'approved'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findPendingReviews — antrean review terpusat', () => {
    it('mengumpulkan entitas review dari semua jenis dengan entityType dan reviewLabel', async () => {
      mockPrisma.characterBible.findMany.mockResolvedValue([
        {
          id: 'cb-1',
          characterId: 'A01',
          version: 2,
          name: 'Budi',
          status: 'review',
          updatedAt: new Date('2026-01-03'),
        },
      ]);
      mockPrisma.locationBible.findMany.mockResolvedValue([]);
      mockPrisma.propBible.findMany.mockResolvedValue([]);
      mockPrisma.styleBible.findMany.mockResolvedValue([]);
      mockPrisma.shot.findMany.mockResolvedValue([
        {
          id: 'shot-1',
          shotNumber: 1,
          shotType: 'medium',
          status: 'review',
          updatedAt: new Date('2026-01-04'),
          scene: { sceneNumber: 1, title: 'Pembuka' },
          _count: { continuityFlags: 2 },
        },
      ]);
      mockPrisma.generationJob.findMany.mockResolvedValue([
        {
          id: 'job-1',
          type: 'image',
          adapterName: 'flux',
          status: 'review',
          updatedAt: new Date('2026-01-05'),
          shot: { shotNumber: 1, sceneId: 'sc-1' },
        },
      ]);

      const items = await service.findPendingReviews('proj-1');

      expect(items).toHaveLength(3);
      // Terurut berdasarkan updatedAt terbaru
      expect(items[0].entityType).toBe('generation-job');
      expect(items[1].entityType).toBe('shot');
      expect(items[2].entityType).toBe('character');
      // Shot membawa jumlah unresolved flag sebagai bahan pertimbangan reviewer
      expect(items[1].unresolvedFlagCount).toBe(2);
      // Setiap item punya label siap tampil
      items.forEach((item: any) => expect(item.reviewLabel).toBeTruthy());
    });

    it('filter per jenis entitas hanya mengambil jenis tersebut', async () => {
      mockPrisma.shot.findMany.mockResolvedValue([]);

      const items = await service.findPendingReviews('proj-1', 'shot');

      expect(mockPrisma.shot.findMany).toHaveBeenCalled();
      expect(mockPrisma.characterBible.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.generationJob.findMany).not.toHaveBeenCalled();
      expect(items).toEqual([]);
    });
  });
});