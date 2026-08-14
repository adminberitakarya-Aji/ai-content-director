import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        contentType: dto.contentType,
        genre: dto.genre,
        tone: dto.tone,
        audience: dto.audience,
        platform: dto.platform,
        duration: dto.duration,
        aspectRatio: dto.aspectRatio,
        status: dto.status ?? 'draft',
      },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        stories: true,
        characterBibles: true,
        locationBibles: true,
        propBibles: true,
        styleBibles: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project dengan id ${id} tidak ditemukan`);
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        contentType: dto.contentType,
        genre: dto.genre,
        tone: dto.tone,
        audience: dto.audience,
        platform: dto.platform,
        duration: dto.duration,
        aspectRatio: dto.aspectRatio,
        status: dto.status,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.project.delete({
      where: { id },
    });
  }
}