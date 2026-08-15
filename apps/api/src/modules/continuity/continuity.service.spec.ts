import { Test, TestingModule } from '@nestjs/testing';
import { ContinuityService } from './continuity.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ContinuityService (Shot-level)', () => {
  let service: ContinuityService;
  let prisma: any;

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
    composition: 'test',
    cameraPosition: 'eye-level',
    cameraMovement: 'static',
    characterBlocking: [{ characterId: 'A01', position: 'kiri frame', orientation: 'menghadap kamera' }],
    visualBeat: 'test',
    scene: mockScene,
  };

  beforeEach(async () => {
    prisma = {
      shot: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      continuityFlag: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContinuityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ContinuityService>(ContinuityService);
  });

  describe('checkShot', () => {
    it('harus mengembalikan flag jika character blocking mereferensikan karakter yang tidak ada di Scene', async () => {
      const shotWithInvalidBlocking = {
        ...mockShot,
        characterBlocking: [
          { characterId: 'A99', position: 'kiri', orientation: 'menghadap' },
        ],
      };
      prisma.shot.findUnique.mockResolvedValue(shotWithInvalidBlocking);

      const result = await service.checkShot('shot-1');

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].flagType).toBe('shot_blocking');
      expect(result.flags[0].fieldName).toBe('characterBlocking');
      expect(result.flags[0].description).toContain('A99');
    });

    it('harus mengembalikan flag jika posisi karakter berubah tanpa pergerakan eksplisit', async () => {
      const shot2 = {
        ...mockShot,
        id: 'shot-2',
        shotNumber: 2,
        characterBlocking: [
          { characterId: 'A01', position: 'kanan frame', orientation: 'menghadap kamera' },
        ],
        scene: {
          ...mockScene,
          action: 'Karakter A menatap ke luar jendela',
        },
      };
      const prevShot = {
        ...mockShot,
        id: 'shot-1',
        shotNumber: 1,
        characterBlocking: [
          { characterId: 'A01', position: 'kiri frame', orientation: 'menghadap kamera' },
        ],
      };

      prisma.shot.findUnique.mockResolvedValue(shot2);
      prisma.shot.findFirst.mockResolvedValue(prevShot);

      const result = await service.checkShot('shot-2');

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].flagType).toBe('shot_blocking');
      expect(result.flags[0].description).toContain('berpindah posisi');
    });

    it('tidak boleh mengembalikan flag jika posisi karakter konsisten', async () => {
      const shot2 = {
        ...mockShot,
        id: 'shot-2',
        shotNumber: 2,
        characterBlocking: [
          { characterId: 'A01', position: 'kiri frame', orientation: 'menghadap kamera' },
        ],
      };
      const prevShot = {
        ...mockShot,
        id: 'shot-1',
        shotNumber: 1,
        characterBlocking: [
          { characterId: 'A01', position: 'kiri frame', orientation: 'menghadap kamera' },
        ],
      };

      prisma.shot.findUnique.mockResolvedValue(shot2);
      prisma.shot.findFirst.mockResolvedValue(prevShot);

      const result = await service.checkShot('shot-2');

      expect(result.flags).toHaveLength(0);
    });

    it('tidak boleh mengembalikan flag jika ada pergerakan eksplisit di Action Scene', async () => {
      const shot2 = {
        ...mockShot,
        id: 'shot-2',
        shotNumber: 2,
        characterBlocking: [
          { characterId: 'A01', position: 'kanan frame', orientation: 'menghadap kamera' },
        ],
        scene: {
          ...mockScene,
          action: 'Karakter A berjalan dari kiri ke kanan ruangan',
        },
      };
      const prevShot = {
        ...mockShot,
        id: 'shot-1',
        shotNumber: 1,
        characterBlocking: [
          { characterId: 'A01', position: 'kiri frame', orientation: 'menghadap kamera' },
        ],
      };

      prisma.shot.findUnique.mockResolvedValue(shot2);
      prisma.shot.findFirst.mockResolvedValue(prevShot);

      const result = await service.checkShot('shot-2');

      expect(result.flags).toHaveLength(0);
    });

    it('harus mengembalikan flags kosong jika Shot tidak ditemukan', async () => {
      prisma.shot.findUnique.mockResolvedValue(null);

      const result = await service.checkShot('shot-tidak-ada');

      expect(result.flags).toHaveLength(0);
    });
  });

  describe('saveShotFlags', () => {
    it('harus menghapus flag lama unresolved dan membuat flag baru', async () => {
      prisma.shot.findUnique.mockResolvedValue(mockShot);
      prisma.continuityFlag.create.mockResolvedValue({});

      await service.saveShotFlags({
        shotId: 'shot-1',
        flags: [
          {
            flagType: 'shot_blocking',
            fieldName: 'characterBlocking',
            expectedValue: 'test',
            actualValue: 'test',
            description: 'test flag',
          },
        ],
      });

      expect(prisma.continuityFlag.deleteMany).toHaveBeenCalledWith({
        where: { shotId: 'shot-1', status: 'unresolved' },
      });
      expect(prisma.continuityFlag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sceneId: 'scene-1',
          shotId: 'shot-1',
          projectId: 'project-1',
          flagType: 'shot_blocking',
          status: 'unresolved',
        }),
      });
    });

    it('tidak boleh membuat ulang flag Shot yang sudah pernah resolved(accepted)', async () => {
      prisma.shot.findUnique.mockResolvedValue(mockShot);
      prisma.continuityFlag.findMany.mockResolvedValue([
        {
          flagType: 'shot_blocking',
          fieldName: 'characterBlocking',
          expectedValue: 'test',
          actualValue: 'test',
          status: 'resolved(accepted)',
        },
      ]);

      await service.saveShotFlags({
        shotId: 'shot-1',
        flags: [
          {
            flagType: 'shot_blocking',
            fieldName: 'characterBlocking',
            expectedValue: 'test',
            actualValue: 'test',
            description: 'test flag',
          },
        ],
      });

      expect(prisma.continuityFlag.create).not.toHaveBeenCalled();
    });
  });

  describe('runShotCheck', () => {
    it('harus menjalankan check dan menyimpan flags', async () => {
      prisma.shot.findUnique.mockResolvedValue(mockShot);
      prisma.shot.findFirst.mockResolvedValue(null);
      prisma.continuityFlag.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.runShotCheck('shot-1');

      expect(result.shotId).toBe('shot-1');
      expect(prisma.continuityFlag.deleteMany).toHaveBeenCalled();
    });
  });

  describe('getFlagsForShot', () => {
    it('harus mengembalikan flags untuk shot', async () => {
      const flags = [{ id: 'flag-1', shotId: 'shot-1', status: 'unresolved' }];
      prisma.continuityFlag.findMany.mockResolvedValue(flags);

      const result = await service.getFlagsForShot('shot-1');

      expect(prisma.continuityFlag.findMany).toHaveBeenCalledWith({
        where: { shotId: 'shot-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(flags);
    });
  });
});