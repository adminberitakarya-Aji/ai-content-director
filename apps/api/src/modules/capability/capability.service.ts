import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Capability Service — toggle kemampuan AI per Project.
 *
 * V1: toggle Image Generation dan Video Generation on/off per Project.
 * Jika off, semua endpoint image-prompt/video-prompt/generation untuk project ini ditolak.
 */
@Injectable()
export class CapabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cek apakah image generation aktif untuk project.
   * Default: aktif (true) jika belum pernah di-set.
   */
  async isImageGenerationEnabled(projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} tidak ditemukan`);
    }

    // V1: gunakan field status project sebagai proxy sederhana.
    // Project dengan status 'archived' tidak boleh generate.
    // Ke depan bisa ditambah field capabilities JSON di Project.
    return project.status !== 'archived';
  }

  /**
   * Cek apakah video generation aktif untuk project.
   * Default: aktif (true) jika belum pernah di-set.
   */
  async isVideoGenerationEnabled(projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} tidak ditemukan`);
    }

    // V1: gunakan field status project sebagai proxy sederhana.
    // Project dengan status 'archived' tidak boleh generate.
    return project.status !== 'archived';
  }

  /**
   * Toggle image generation untuk project.
   * V1: implementasi sederhana via status project.
   */
  async setImageGenerationEnabled(
    projectId: string,
    enabled: boolean
  ): Promise<{ projectId: string; imageGenerationEnabled: boolean }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} tidak ditemukan`);
    }

    // Jika disable, set status archived; jika enable, set active
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: enabled ? 'active' : 'archived' },
    });

    return { projectId, imageGenerationEnabled: enabled };
  }
}