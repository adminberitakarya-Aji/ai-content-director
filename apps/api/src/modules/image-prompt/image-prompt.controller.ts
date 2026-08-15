import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ImagePromptService } from './image-prompt.service';

/**
 * Image Prompt Controller — endpoint untuk compile, approve, dan submit image generation.
 *
 * Endpoint:
 * - POST /projects/:projectId/image-prompt/shots/:shotId/compile — preview prompt konseptual
 * - POST /projects/:projectId/image-prompt/shots/:shotId/jobs — buat generation job + estimasi biaya
 * - PATCH /projects/:projectId/image-prompt/jobs/:jobId/approve — approve estimasi biaya
 * - PATCH /projects/:projectId/image-prompt/jobs/:jobId/reject — reject job
 * - POST /projects/:projectId/image-prompt/jobs/:jobId/submit — submit ke adapter (wajib approved)
 * - GET /projects/:projectId/image-prompt/shots/:shotId/jobs — lihat jobs per shot
 * - GET /projects/:projectId/image-prompt/jobs — lihat semua jobs project
 * - GET /projects/:projectId/image-prompt/jobs/:jobId — detail job
 */
@Controller('projects/:projectId/image-prompt')
export class ImagePromptController {
  constructor(private readonly imagePromptService: ImagePromptService) {}

  /**
   * Preview prompt konseptual untuk sebuah Shot.
   * Tidak membuat job — hanya untuk melihat prompt sebelum commit.
   */
  @Post('shots/:shotId/compile')
  compilePrompt(@Param('shotId') shotId: string) {
    return this.imagePromptService.compilePrompt(shotId);
  }

  /**
   * Buat Generation Job untuk sebuah Shot.
   * Mengembalikan job dengan status pending + estimasi biaya.
   * User harus approve dulu sebelum bisa submit.
   */
  @Post('shots/:shotId/jobs')
  createJob(@Param('shotId') shotId: string) {
    return this.imagePromptService.createGenerationJob(shotId);
  }

  /**
   * Approve estimasi biaya untuk job.
   * Ini adalah approval eksplisit user (Budget Guard).
   */
  @Patch('jobs/:jobId/approve')
  approveJob(@Param('jobId') jobId: string) {
    return this.imagePromptService.approveJob(jobId);
  }

  /**
   * Reject job.
   */
  @Patch('jobs/:jobId/reject')
  rejectJob(@Param('jobId') jobId: string) {
    return this.imagePromptService.rejectJob(jobId);
  }

  /**
   * Submit job ke adapter (Flux).
   * WAJIB sudah approved — jika tidak, akan ditolak oleh Budget Guard.
   */
  @Post('jobs/:jobId/submit')
  submitJob(@Param('jobId') jobId: string) {
    return this.imagePromptService.submitJob(jobId);
  }

  /**
   * Lihat semua generation jobs untuk sebuah Shot.
   */
  @Get('shots/:shotId/jobs')
  getJobsByShot(@Param('shotId') shotId: string) {
    return this.imagePromptService.getJobsByShot(shotId);
  }

  /**
   * Lihat semua generation jobs untuk Project.
   */
  @Get('jobs')
  getJobsByProject(@Param('projectId') projectId: string) {
    return this.imagePromptService.getJobsByProject(projectId);
  }

  /**
   * Detail satu generation job.
   */
  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string) {
    return this.imagePromptService.getJob(jobId);
  }
}