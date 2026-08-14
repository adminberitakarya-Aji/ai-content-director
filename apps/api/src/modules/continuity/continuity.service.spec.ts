import { Test, TestingModule } from '@nestjs/testing';
import { ContinuityService } from './continuity.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ContinuityService', () => {
  let service: ContinuityService;

  const mockPrisma = {
    scene: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    characterBible: {
      findFirst: jest.fn(),
    },
    locationBible: {
      findFirst: jest.fn(),
    },
    propBible: {
      findFirst: jest.fn(),
    },
    styleBible: {
      findFirst: jest.fn(),
    },
    continuityFlag: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContinuityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContinuityService>(ContinuityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkScene', () => {
    it('should return no flags when all references are approved', async () => {
      // Scene dengan karakter dan lokasi yang valid
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: 'scene-1',
        projectId: 'project-1',
        characterIds: ['A01'],
        locationId: 'L01',
        propIds: [],
        time: 'Pagi hari',
      });

      // Semua Bible approved
      mockPrisma.characterBible.findFirst.mockResolvedValue({ id: 'char-1', status: 'approved' });
      mockPrisma.locationBible.findFirst.mockResolvedValue({
        id: 'loc-1',
        status: 'approved',
        lighting: { commonTimeOfDay: 'Pagi' },
      });
      mockPrisma.styleBible.findFirst.mockResolvedValue({ id: 'style-1', status: 'approved' });

      const result = await service.checkScene('scene-1');
      expect(result.flags).toHaveLength(0);
    });

    it('should return flag when character not approved', async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: 'scene-1',
        projectId: 'project-1',
        characterIds: ['A01', 'A09'],
        locationId: 'L01',
        propIds: [],
        time: 'Pagi hari',
      });

      mockPrisma.characterBible.findFirst.mockResolvedValue(null); // A09 tidak ditemukan
      mockPrisma.locationBible.findFirst.mockResolvedValue({
        id: 'loc-1',
        status: 'approved',
        lighting: { commonTimeOfDay: 'Pagi' },
      });
      mockPrisma.styleBible.findFirst.mockResolvedValue({ id: 'style-1', status: 'approved' });

      const result = await service.checkScene('scene-1');
      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.flags[0].flagType).toBe('character_id');
    });

    it('should return flag when location not approved', async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: 'scene-1',
        projectId: 'project-1',
        characterIds: ['A01'],
        locationId: 'L99',
        propIds: [],
        time: 'Malam hari',
      });

      mockPrisma.characterBible.findFirst.mockResolvedValue({ id: 'char-1', status: 'approved' });
      mockPrisma.locationBible.findFirst.mockResolvedValue(null); // L99 tidak ditemukan
      mockPrisma.styleBible.findFirst.mockResolvedValue({ id: 'style-1', status: 'approved' });

      const result = await service.checkScene('scene-1');
      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.flags.some((f) => f.flagType === 'location_id')).toBe(true);
    });

    it('should return flag when time does not match location lighting', async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: 'scene-1',
        projectId: 'project-1',
        characterIds: ['A01'],
        locationId: 'L01',
        propIds: [],
        time: 'Malam hari', // Lighting lokasi kata "Pagi"
      });

      mockPrisma.characterBible.findFirst.mockResolvedValue({ id: 'char-1', status: 'approved' });
      mockPrisma.locationBible.findFirst.mockResolvedValue({
        id: 'loc-1',
        status: 'approved',
        lighting: { commonTimeOfDay: 'Pagi' },
      });
      mockPrisma.styleBible.findFirst.mockResolvedValue({ id: 'style-1', status: 'approved' });

      const result = await service.checkScene('scene-1');
      expect(result.flags.some((f) => f.flagType === 'time')).toBe(true);
    });

    it('should return flag when no style bible approved', async () => {
      mockPrisma.scene.findUnique.mockResolvedValue({
        id: 'scene-1',
        projectId: 'project-1',
        characterIds: ['A01'],
        locationId: 'L01',
        propIds: [],
        time: 'Pagi hari',
      });

      mockPrisma.characterBible.findFirst.mockResolvedValue({ id: 'char-1', status: 'approved' });
      mockPrisma.locationBible.findFirst.mockResolvedValue({
        id: 'loc-1',
        status: 'approved',
        lighting: { commonTimeOfDay: 'Pagi' },
      });
      mockPrisma.styleBible.findFirst.mockResolvedValue(null); // Tidak ada style approved

      const result = await service.checkScene('scene-1');
      expect(result.flags.some((f) => f.flagType === 'style')).toBe(true);
    });
  });
});