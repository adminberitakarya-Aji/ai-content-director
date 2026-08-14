import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';

@Injectable()
export class StoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStoryDto) {
    // Validasi project ada
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project dengan id ${dto.projectId} tidak ditemukan`);
    }

    return this.prisma.story.create({
      data: {
        projectId: dto.projectId,
        concept: dto.concept,
        premise: dto.premise,
        synopsis: dto.synopsis,
        structure: dto.structure,
        timeline: dto.timeline,
        creativeDirection: dto.creativeDirection,
      },
    });
  }

  async findAll() {
    return this.prisma.story.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByProject(projectId: string) {
    return this.prisma.story.findMany({
      where: { projectId },
    });
  }

  async findOne(id: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!story) {
      throw new NotFoundException(`Story dengan id ${id} tidak ditemukan`);
    }

    return story;
  }

  async update(id: string, dto: UpdateStoryDto) {
    await this.findOne(id);

    return this.prisma.story.update({
      where: { id },
      data: {
        concept: dto.concept,
        premise: dto.premise,
        synopsis: dto.synopsis,
        structure: dto.structure,
        timeline: dto.timeline,
        creativeDirection: dto.creativeDirection,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.story.delete({
      where: { id },
    });
  }
}