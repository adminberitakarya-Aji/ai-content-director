import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SceneService } from './scene.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ContinuityService } from '../continuity/continuity.service';

describe('SceneService', () => {
    let service: SceneService;

    const mockTx = {
        scene: { create: jest.fn(), update: jest.fn() },
        sceneCharacter: { createMany: jest.fn(), deleteMany: jest.fn() },
        sceneProp: { createMany: jest.fn(), deleteMany: jest.fn() },
    };

    const mockPrisma = {
        project: { findUnique: jest.fn() },
        scene: { findUnique: jest.fn() },
        characterBible: { findFirst: jest.fn() },
        locationBible: { findFirst: jest.fn() },
        propBible: { findFirst: jest.fn() },
        character: { findMany: jest.fn() },
        location: { findFirst: jest.fn() },
        prop: { findMany: jest.fn() },
        $transaction: jest.fn((callback: any) => callback(mockTx)),
    };

    const mockContinuityService = {
        runCheck: jest.fn().mockResolvedValue({ sceneId: 'scene-1', flags: [] }),
    };

    const baseInput = {
        sceneNumber: 1,
        characterIds: ['A01'],
        locationId: 'L01',
        propIds: ['O01'],
        time: 'Pagi',
        action: 'Karakter berjalan',
        emotions: [{ characterId: 'A01', emotion: 'tenang' }],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SceneService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: ContinuityService, useValue: mockContinuityService },
            ],
        }).compile();

        service = module.get<SceneService>(SceneService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should throw if project not found', async () => {
            mockPrisma.project.findUnique.mockResolvedValue(null);

            await expect(service.create('project-x', baseInput)).rejects.toThrow(NotFoundException);
        });

        it('should throw if a referenced character is not approved', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ id: 'project-1' });
            mockPrisma.characterBible.findFirst.mockResolvedValue(null);

            await expect(service.create('project-1', baseInput)).rejects.toThrow(BadRequestException);
        });

        it('should resolve entities and sync SceneCharacter/SceneProp/locationEntityId in a transaction', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ id: 'project-1' });
            mockPrisma.characterBible.findFirst.mockResolvedValue({ id: 'cb-1', status: 'approved' });
            mockPrisma.locationBible.findFirst.mockResolvedValue({ id: 'lb-1', status: 'approved' });
            mockPrisma.propBible.findFirst.mockResolvedValue({ id: 'pb-1', status: 'approved' });

            mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-entity-1', locationId: 'L01' });
            mockPrisma.character.findMany.mockResolvedValue([{ id: 'char-entity-1', characterId: 'A01' }]);
            mockPrisma.prop.findMany.mockResolvedValue([{ id: 'prop-entity-1', propId: 'O01' }]);

            mockTx.scene.create.mockResolvedValue({ id: 'scene-1', projectId: 'project-1' });

            const result = await service.create('project-1', baseInput);

            expect(result.id).toBe('scene-1');

            // locationEntityId dari resolve harus ikut ke data create Scene
            expect(mockTx.scene.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ locationEntityId: 'loc-entity-1' }),
                }),
            );

            // SceneCharacter dan SceneProp harus disinkronkan sesuai entity yang di-resolve
            expect(mockTx.sceneCharacter.createMany).toHaveBeenCalledWith({
                data: [{ sceneId: 'scene-1', characterEntityId: 'char-entity-1' }],
            });
            expect(mockTx.sceneProp.createMany).toHaveBeenCalledWith({
                data: [{ sceneId: 'scene-1', propEntityId: 'prop-entity-1' }],
            });

            // Continuity check tetap terpicu otomatis
            expect(mockContinuityService.runCheck).toHaveBeenCalledWith('scene-1');
        });

        it('should throw if a validated character has no matching identity row (data inconsistency)', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ id: 'project-1' });
            mockPrisma.characterBible.findFirst.mockResolvedValue({ id: 'cb-1', status: 'approved' });
            mockPrisma.locationBible.findFirst.mockResolvedValue({ id: 'lb-1', status: 'approved' });
            mockPrisma.propBible.findFirst.mockResolvedValue({ id: 'pb-1', status: 'approved' });
            mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-entity-1', locationId: 'L01' });

            // Bible approved ada, tapi identity Character somehow tidak ketemu — inkonsistensi data
            mockPrisma.character.findMany.mockResolvedValue([]);

            await expect(service.create('project-1', baseInput)).rejects.toThrow(BadRequestException);
        });
    });

    describe('update', () => {
        it('should only re-sync SceneCharacter/SceneProp when the related field actually changes', async () => {
            mockPrisma.scene.findUnique.mockResolvedValue({
                id: 'scene-1',
                projectId: 'project-1',
                continuityFlags: [],
            });
            mockTx.scene.update.mockResolvedValue({ id: 'scene-1' });

            // Hanya update `time`, tidak menyentuh characterIds/locationId/propIds
            await service.update('scene-1', { time: 'Malam' });

            expect(mockTx.sceneCharacter.deleteMany).not.toHaveBeenCalled();
            expect(mockTx.sceneProp.deleteMany).not.toHaveBeenCalled();
            expect(mockContinuityService.runCheck).toHaveBeenCalledWith('scene-1');
        });

        it('should re-sync SceneCharacter when characterIds changes', async () => {
            mockPrisma.scene.findUnique.mockResolvedValue({
                id: 'scene-1',
                projectId: 'project-1',
                continuityFlags: [],
            });
            mockPrisma.characterBible.findFirst.mockResolvedValue({ id: 'cb-1', status: 'approved' });
            mockPrisma.character.findMany.mockResolvedValue([{ id: 'char-entity-2', characterId: 'A02' }]);
            mockTx.scene.update.mockResolvedValue({ id: 'scene-1' });

            await service.update('scene-1', { characterIds: ['A02'] });

            expect(mockTx.sceneCharacter.deleteMany).toHaveBeenCalledWith({ where: { sceneId: 'scene-1' } });
            expect(mockTx.sceneCharacter.createMany).toHaveBeenCalledWith({
                data: [{ sceneId: 'scene-1', characterEntityId: 'char-entity-2' }],
            });
        });
    });
});