import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { VideoPromptService } from './video-prompt.service';

/**
 * Video Prompt Controller — endpoint untuk compile, approve, dan submit video generation.
 *
 * Endpoint:
 * - POST /projects/:projectId/video-prompt/shots/:shotId/compile — preview prompt konseptual video
 * - POST /projects/:projectId/video-prompt/shots/:shotId/jobs — buat generation job + estimasi biaya
 * - PATCH /projects/:projectId/video-prompt/jobs/:jobId/approve — approve estimasi biaya
 * - PATCH /projects/:projectId/video-prompt/jobs/:jobId/reject — reject job
 * - POST /projects/:projectId/video-prompt/jobs/:jobId/submit — submit ke adapter Seedance (wajib approved)
 * - GET /projects/:projectId/video-prompt/shots/:shotId/jobs — lihat jobs video per shot
 * - GET /projects/:projectId/video-prompt/jobs — lihat semua jobs video project
 * - GET /projects/:projectId/video-prompt/jobs/:jobId — detail job
 */
@Controller('projects/:projectId/video-prompt')
export class VideoPromptController {
  constructor(private readonly videoPromptService: VideoPromptService) {}

  /**
   * Preview video prompt konseptual untuk sebuah Shot.
   * Tidak membuat job — hanya untuk melihat prompt sebelum commit.
   * Memerlukan Image Prompt yang sudah ada untuk Shot yang sama.
   */
  @Post('shots/:shotId/compile')
  compilePrompt(@Param('shotId') shotId: string) {
    return this.videoPromptService.compilePrompt(shotId);
  }

  /**
   * Buat Generation Job video untuk sebuah Shot.
   * Mengembalikan job dengan status pending + estimasi biaya.
   * User harus approve dulu sebelum bisa submit (Budget Guard).
   */
  @Post('shots/:shotId/jobs')
  createJob(@Param('shotId') shotId: string) {
    return this.videoPromptService.createGenerationJob(shotId);
  }

  /**
   * Approve estimasi biaya untuk job video.
   * Ini adalah approval eksplisit user (Budget Guard).
   */
  @Patch('jobs/:jobId/approve')
  approveJob(@Param('jobId') jobId: string) {
    return this.videoPromptService.approveJob(jobId);
  }

  /**
   * Reject job video.
   */
  @Patch('jobs/:jobId/reject')
  rejectJob(@Param('jobId') jobId: string) {
    return this.videoPromptService.rejectJob(jobId);
  }

  /**
   * Submit job ke adapter (Seedance).
   * WAJIB sudah approved — jika tidak, akan ditolak oleh Budget Guard.
   */
  @Post('jobs/:jobId/submit')
  submitJob(@Param('jobId') jobId: string) {
    return this.videoPromptService.submitJob(jobId);
  }

  /**
   * Lihat semua generation jobs video untuk sebuah Shot.
   */
  @Get('shots/:shotId/jobs')
  getJobsByShot(@Param('shotId') shotId: string) {
    return this.videoPromptService.getJobsByShot(shotId);
  }

  /**
   * Lihat semua generation jobs video untuk Project.
   */
  @Get('jobs')
  getJobsByProject(@Param('projectId') projectId: string) {
    return this.videoPromptService.getJobsByProject(projectId);
  }

  /**
   * Detail satu generation job video.
   */
  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string) {
    return this.videoPromptService.getJob(jobId);
  }
}