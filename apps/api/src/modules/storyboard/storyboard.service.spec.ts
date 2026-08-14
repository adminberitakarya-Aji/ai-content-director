import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StoryboardService } from './storyboard.service';
import { ContinuityService } from '../continuity/continuity.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StoryboardService', () => {
  let service: StoryboardService;
  let prisma: any;
  let continuityService: any;

  const mockScene = {
    id: 'scene-1',
    projectId: 'project-1',
    sceneNumber: 1,
    characterIds: ['A01', 'A02'],
    locationId: 'L01',
    time: 'Pagi',
    action: 'Karakter A berjalan ke jendela',
  };

  const mockShot = {
    id: 'shot-1',
    sceneId: 'scene-1',
    projectId: 'project-1',
    shotNumber: 1,
    shotType: 'medium',
    framing: 'rule of thirds',
    composition: 'foreground: meja, background: jendela',
    cameraPosition: 'eye-level',
    lens: null,
    cameraMovement: 'static',
    characterBlocking: [{ characterId: 'A01', position: 'kiri frame', orientation: 'menghadap kamera' }],
    visualBeat: 'Karakter A menatap ke luar jendela',
    status: 'draft',
  };

  beforeEach(async () => {
    prisma = {
      scene: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      shot: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    continuityService = {
      runShotCheck: jest.fn().mockResolvedValue({ shotId: 'shot-1', flags: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContinuityService, useValue: continuityService },
      ],
    }).compile();

    service = module.get<StoryboardService>(StoryboardService);
  });

  describe('createShot', () => {
    it('harus membuat Shot baru dan trigger continuity check', async () => {
      prisma.scene.findUnique.mockResolvedValue(mockScene);
      prisma.shot.findUnique.mockResolvedValue(null);
      prisma.shot.create.mockResolvedValue(mockShot);

      const result = await service.createShot('scene-1', {
        shotNumber: 1,
        shotType: 'medium',
        framing: 'rule of thirds',
        composition: 'foreground: meja, background: jendela',
        cameraPosition: 'eye-level',
        cameraMovement: 'static',
        characterBlocking: [{ characterId: 'A01', position: 'kiri frame', orientation: 'menghadap kamera' }],
        visualBeat: 'Karakter A menatap ke luar jendela',
      });

      expect(prisma.shot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sceneId: 'scene-1',
          projectId: 'project-1',
          shotNumber: 1,
          shotType: 'medium',
        }),
      });
      expect(continuityService.runShotCheck).toHaveBeenCalledWith('shot-1');
      expect(result).toEqual(mockShot);
    });

    it('harus menolak jika Scene tidak ditemukan', async () => {
      prisma.scene.findUnique.mockResolvedValue(null);

      await expect(
        service.createShot('scene-tidak-ada', {
          shotNumber: 1,
          shotType: 'medium',
          framing: 'rule of thirds',
          composition: 'test',
          cameraPosition: 'eye-level',
          visualBeat: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus menolak jika shotNumber sudah ada di Scene', async () => {
      prisma.scene.findUnique.mockResolvedValue(mockScene);
      prisma.shot.findUnique.mockResolvedValue(mockShot);

      await expect(
        service.createShot('scene-1', {
          shotNumber: 1,
          shotType: 'medium',
          framing: 'rule of thirds',
          composition: 'test',
          cameraPosition: 'eye-level',
          visualBeat: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus menolak jika field wajib kosong', async () => {
      prisma.scene.findUnique.mockResolvedValue(mockScene);
      prisma.shot.findUnique.mockResolvedValue(null);

      await expect(
        service.createShot('scene-1', {
          shotNumber: 1,
          shotType: '',
          framing: '',
          composition: '',
          cameraPosition: '',
          visualBeat: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus menolak jika character blocking mereferensikan karakter yang tidak ada di Scene', async () => {
      prisma.scene.findUnique.mockResolvedValue(mockScene);
      prisma.shot.findUnique.mockResolvedValue(null);

      await expect(
        service.createShot('scene-1', {
          shotNumber: 1,
          shotType: 'medium',
          framing: 'rule of thirds',
          composition: 'test',
          cameraPosition: 'eye-level',
          characterBlocking: [{ characterId: 'A99', position: 'kiri', orientation: 'menghadap' }],
          visualBeat: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findShotsByScene', () => {
    it('harus mengembalikan Shot terurut berdasarkan shotNumber', async () => {
      prisma.scene.findUnique.mockResolvedValue(mockScene);
      prisma.shot.findMany.mockResolvedValue([mockShot]);

      const result = await service.findShotsByScene('scene-1');

      expect(prisma.shot.findMany).toHaveBeenCalledWith({
        where: { sceneId: 'scene-1' },
        orderBy: { shotNumber: 'asc' },
        include: { continuityFlags: true },
      });
      expect(result).toEqual([mockShot]);
    });

    it('harus menolak jika Scene tidak ditemukan', async () => {
      prisma.scene.findUnique.mockResolvedValue(null);

      await expect(service.findShotsByScene('scene-tidak-ada')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorderShots', () => {
    it('harus mengubah urutan Shot sesuai orderedIds', async () => {
      const shot1 = { ...mockShot, id: 'shot-1', shotNumber: 1 };
      const shot2 = { ...mockShot, id: 'shot-2', shotNumber: 2 };

      prisma.scene.findUnique.mockResolvedValue(mockScene);
      prisma.shot.findMany.mockResolvedValue([shot1, shot2]);
      prisma.$transaction.mockResolvedValue([{ ...shot2, shotNumber: 1 }, { ...shot1, shotNumber: 2 }]);
      prisma.shot.findMany.mockResolvedValueOnce([shot1, shot2]).mockResolvedValueOnce([
        { ...shot2, shotNumber: 1 },
        { ...shot1, shotNumber: 2 },
      ]);

      const result = await service.reorderShots('scene-1', ['shot-2', 'shot-1']);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('harus menolak jika jumlah orderedIds tidak sesuai', async () => {
      prisma.scene.findUnique.mockResolvedValue(mockScene);
      prisma.shot.findMany.mockResolvedValue([mockShot]);

      await expect(
        service.reorderShots('scene-1', ['shot-1', 'shot-2']),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus menolak jika ada id yang tidak ada di Scene', async () => {
      prisma.scene.findUnique.mockResolvedValue(mockScene);
      prisma.shot.findMany.mockResolvedValue([mockShot]);

      await expect(
        service.reorderShots('scene-1', ['shot-tidak-ada']),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateShot', () => {
    it('harus mengupdate Shot dan trigger continuity check', async () => {
      prisma.shot.findUnique.mockResolvedValue(mockShot);
      prisma.shot.update.mockResolvedValue({ ...mockShot, framing: 'center framing' });

      const result = await service.updateShot('shot-1', { framing: 'center framing' });

      expect(prisma.shot.update).toHaveBeenCalledWith({
        where: { id: 'shot-1' },
        data: expect.objectContaining({ framing: 'center framing' }),
      });
      expect(continuityService.runShotCheck).toHaveBeenCalledWith('shot-1');
      expect(result.framing).toBe('center framing');
    });

    it('harus menolak jika Shot tidak ditemukan', async () => {
      prisma.shot.findUnique.mockResolvedValue(null);

      await expect(
        service.updateShot('shot-tidak-ada', { framing: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeShot', () => {
    it('harus menghapus Shot', async () => {
      prisma.shot.findUnique.mockResolvedValue(mockShot);
      prisma.shot.delete.mockResolvedValue(mockShot);

      const result = await service.removeShot('shot-1');

      expect(prisma.shot.delete).toHaveBeenCalledWith({ where: { id: 'shot-1' } });
      expect(result).toEqual(mockShot);
    });

    it('harus menolak jika Shot tidak ditemukan', async () => {
      prisma.shot.findUnique.mockResolvedValue(null);

      await expect(service.removeShot('shot-tidak-ada')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});