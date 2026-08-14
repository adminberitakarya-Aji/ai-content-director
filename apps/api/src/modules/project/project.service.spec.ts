import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockPrisma = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a project', async () => {
      const dto = {
        name: 'Test Project',
        contentType: 'short-film' as const,
        genre: 'Drama',
        tone: 'Hangat',
        audience: 'Remaja',
        platform: 'YouTube',
        aspectRatio: '16:9' as const,
        status: 'draft' as const,
      };

      mockPrisma.project.create.mockResolvedValue({
        id: 'uuid-1',
        ...dto,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Test Project');
    });
  });

  describe('findAll', () => {
    it('should return list of projects', async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow();
    });
  });
});