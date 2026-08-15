import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CharacterBibleService } from './character-bible.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ContinuityService } from '../../continuity/continuity.service';

describe('CharacterBibleService', () => {
  let service: CharacterBibleService;

  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
    },
    characterBible: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    character: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    scene: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockContinuityService = {
    runCheck: jest.fn().mockResolvedValue({ sceneId: 'scene-1', flags: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharacterBibleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ContinuityService, useValue: mockContinuityService },
      ],
    }).compile();

    service = module.get<CharacterBibleService>(CharacterBibleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCharacter', () => {
    it('should create character version 1 and create new Character identity if not exists', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'project-1' });
      mockPrisma.character.findFirst.mockResolvedValue(null); // identity belum ada
      mockPrisma.character.create.mockResolvedValue({
        id: 'entity-uuid-1',
        projectId: 'project-1',
        characterId: 'A01',
      });
      mockPrisma.characterBible.create.mockResolvedValue({
        id: 'char-1',
        projectId: 'project-1',
        characterEntityId: 'entity-uuid-1',
        characterId: 'A01',
        version: 1,
        name: 'Andi',
        status: 'draft',
      });

      const input = {
        characterId: 'A01',
        name: 'Andi',
        role: 'Protagonis',
        age: '25',
        gender: 'Pria',
        identityDesc: 'Pemuda desa',
        faceShape: 'Bulat',
        eyeColor: 'Coklat',
        skinColor: 'Sawo matang',
        defaultExpression: 'Tenang',
        height: '170cm',
        build: 'Rata-rata',
        hairColor: 'Hitam',
        hairLength: 'Pendek',
        hairTexture: 'Lurus',
        hairDefaultStyle: 'Rapi',
        wardrobes: [],
      };

      const result = await service.createCharacter('project-1', input);

      expect(result.version).toBe(1);
      expect(result.characterId).toBe('A01');
      // Identity belum ada → harus dibuat baru
      expect(mockPrisma.character.create).toHaveBeenCalledWith({
        data: { projectId: 'project-1', characterId: 'A01' },
      });
      // characterEntityId dari identity yang baru dibuat harus ikut ke data create Bible
      expect(mockPrisma.characterBible.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ characterEntityId: 'entity-uuid-1' }),
        }),
      );
    });

    it('should reuse existing Character identity instead of creating a duplicate', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'project-1' });
      mockPrisma.character.findFirst.mockResolvedValue({
        id: 'entity-uuid-existing',
        projectId: 'project-1',
        characterId: 'A01',
      });
      mockPrisma.characterBible.create.mockResolvedValue({
        id: 'char-2',
        projectId: 'project-1',
        characterEntityId: 'entity-uuid-existing',
        characterId: 'A01',
        version: 1,
        status: 'draft',
      });

      const input = {
        characterId: 'A01',
        name: 'Andi',
        role: 'Protagonis',
        age: '25',
        gender: 'Pria',
        identityDesc: 'Pemuda desa',
        faceShape: 'Bulat',
        eyeColor: 'Coklat',
        skinColor: 'Sawo matang',
        defaultExpression: 'Tenang',
        height: '170cm',
        build: 'Rata-rata',
        hairColor: 'Hitam',
        hairLength: 'Pendek',
        hairTexture: 'Lurus',
        hairDefaultStyle: 'Rapi',
        wardrobes: [],
      };

      await service.createCharacter('project-1', input);

      // Identity sudah ada → TIDAK boleh membuat identity baru (cegah duplikat)
      expect(mockPrisma.character.create).not.toHaveBeenCalled();
      expect(mockPrisma.characterBible.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ characterEntityId: 'entity-uuid-existing' }),
        }),
      );
    });
  });

  describe('createNewVersion', () => {
    it('should create version 2 without overwriting version 1', async () => {
      const previousVersion = {
        id: 'char-1',
        projectId: 'project-1',
        characterId: 'A01',
        version: 1,
        name: 'Andi',
        role: 'Protagonis',
        age: '25',
        gender: 'Pria',
        identityDesc: 'Pemuda desa',
        faceShape: 'Bulat',
        eyeColor: 'Coklat',
        skinColor: 'Sawo matang',
        defaultExpression: 'Tenang',
        height: '170cm',
        build: 'Rata-rata',
        hairColor: 'Hitam',
        hairLength: 'Pendek',
        hairTexture: 'Lurus',
        hairDefaultStyle: 'Rapi',
        wardrobes: [],
        status: 'approved',
      };

      mockPrisma.characterBible.findUnique.mockResolvedValue(previousVersion);
      mockPrisma.characterBible.create.mockResolvedValue({
        ...previousVersion,
        id: 'char-2',
        version: 2,
        name: 'Andi Wijaya',
        previousVersionId: 'char-1',
        status: 'draft',
      });

      const result = await service.createNewVersion('char-1', { name: 'Andi Wijaya' });

      // Versi baru harus version 2, bukan menimpa version 1
      expect(result.version).toBe(2);
      expect(result.previousVersionId).toBe('char-1');
      expect(result.name).toBe('Andi Wijaya');
      expect(result.status).toBe('draft');
    });

    it('should reject changing characterId via createNewVersion (identitas permanen)', async () => {
      const previousVersion = {
        id: 'char-1',
        projectId: 'project-1',
        characterId: 'A01',
        characterEntityId: 'entity-uuid-1',
        version: 1,
        name: 'Andi',
        status: 'approved',
      };

      mockPrisma.characterBible.findUnique.mockResolvedValue(previousVersion);

      // User mencoba mengubah characterId dari "A01" jadi "B01" lewat createNewVersion
      await expect(
        service.createNewVersion('char-1', { characterId: 'B01', name: 'Andi' } as any),
      ).rejects.toThrow(BadRequestException);

      // Karena ditolak di awal, TIDAK BOLEH ada row baru yang sempat dibuat
      expect(mockPrisma.characterBible.create).not.toHaveBeenCalled();
    });

    it('should allow createNewVersion when characterId sent matches the current value (no-op, tidak dianggap perubahan)', async () => {
      const previousVersion = {
        id: 'char-1',
        projectId: 'project-1',
        characterId: 'A01',
        characterEntityId: 'entity-uuid-1',
        version: 1,
        name: 'Andi',
        status: 'approved',
      };

      mockPrisma.characterBible.findUnique.mockResolvedValue(previousVersion);
      mockPrisma.characterBible.create.mockResolvedValue({
        ...previousVersion,
        id: 'char-2',
        version: 2,
        name: 'Andi Wijaya',
        status: 'draft',
      });

      // characterId dikirim tapi nilainya SAMA dengan yang sekarang — bukan
      // percobaan mengubah, jadi tidak boleh ditolak.
      const result = await service.createNewVersion('char-1', {
        characterId: 'A01',
        name: 'Andi Wijaya',
      } as any);

      expect(result.characterId).toBe('A01');
      expect(mockPrisma.characterBible.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            characterId: 'A01',
            characterEntityId: 'entity-uuid-1',
          }),
        }),
      );
    });
  });

  describe('findAllActive', () => {
    it('should return only latest version per character', async () => {
      mockPrisma.characterBible.findMany.mockResolvedValue([
        { id: 'char-2', characterId: 'A01', version: 2, name: 'Andi Wijaya' },
        { id: 'char-1', characterId: 'A01', version: 1, name: 'Andi' },
        { id: 'char-3', characterId: 'A02', version: 1, name: 'Budi' },
      ]);

      const result = await service.findAllActive('project-1');
      expect(result).toHaveLength(2);
      expect(result[0].characterId).toBe('A01');
      expect(result[0].version).toBe(2);
    });
  });
});
