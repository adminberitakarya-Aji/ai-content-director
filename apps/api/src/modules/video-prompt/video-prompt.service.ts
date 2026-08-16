import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BudgetService } from '../budget/budget.service';
import { CapabilityService } from '../capability/capability.service';
import {
  SeedanceAdapter,
  CostEstimate,
} from '@ai-content-director/generation-adapters';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Video Prompt Service — orkestrasi compile video prompt → budget check → submit.
 *
 * Alur (IMPLEMENTATION_PLAN.md Fase 5):
 * video-prompt → budget (wajib lolos estimasi) → generation-adapters/seedance (submit)
 *   → simpan GenerationJob (type: video) dengan hasil
 *
 * Prinsip:
 * - Video Prompt dibangun di atas Image Prompt Shot yang sama — wajib ada
 *   Image Prompt (idealnya job image yang sudah completed sebagai starting frame).
 * - Tidak ada submit tanpa lolos budget check (Budget Guard wajib)
 * - Setiap GenerationJob mencatat versi prompt & Bible yang dipakai
 * - Normalisasi output Flux → input Seedance adalah tanggung jawab adapter Seedance
 */
@Injectable()
export class VideoPromptService {
  private seedanceAdapter: SeedanceAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetService: BudgetService,
    private readonly capabilityService: CapabilityService
  ) {
    this.seedanceAdapter = new SeedanceAdapter();
  }

  /**
   * Compile Video Prompt untuk sebuah Shot (preview).
   * Memanggil ai-service untuk menyusun prompt konseptual video di atas Image Prompt.
   */
  async compilePrompt(shotId: string) {
    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
      include: { scene: true },
    });

    if (!shot) {
      throw new NotFoundException(`Shot ${shotId} tidak ditemukan`);
    }

    const scene = shot.scene;
    const projectId = shot.projectId;

    // Cek capability video generation
    const enabled =
      await this.capabilityService.isVideoGenerationEnabled(projectId);
    if (!enabled) {
      throw new ForbiddenException(
        'Video generation tidak aktif untuk project ini'
      );
    }

    // Video Prompt dibangun di atas Image Prompt — ambil job image terbaru untuk shot ini.
    // Prioritas: job image yang sudah completed (ada output gambar sebagai starting frame).
    // Jika belum ada yang completed, pakai job image terbaru yang punya promptFinal
    // (starting frame belum tersedia — akan divalidasi saat submit).
    const imageJob = await this.getBaseImageJob(shotId);
    if (!imageJob) {
      throw new BadRequestException(
        'Video Prompt dibangun di atas Image Prompt — belum ada Generation Job image untuk Shot ini. ' +
          'Buat image generation job terlebih dahulu di Image Prompt Engine.'
      );
    }

    let imagePrompt: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(imageJob.promptConceptual || '{}');
      imagePrompt = parsed && Object.keys(parsed).length > 0 ? parsed : null;
    } catch {
      imagePrompt = null;
    }

    if (!imagePrompt) {
      throw new BadRequestException(
        'Image Prompt konseptual untuk Shot ini tidak ditemukan pada job image yang ada. ' +
          'Compile Image Prompt terlebih dahulu.'
      );
    }

    // URL gambar hasil generation (output Flux) sebagai starting frame — bisa null saat preview
    const sourceImageUrl = imageJob.outputAssetUrl || null;

    // Cek continuity flags unresolved untuk shot ini
    const unresolvedFlags = await this.prisma.continuityFlag.findMany({
      where: { shotId, status: 'unresolved' },
    });

    // Ambil Bible data (untuk character motion & konteks environment)
    const characterIds = (scene.characterIds as string[]) || [];
    const characters = await this.getApprovedCharacterBibles(
      projectId,
      characterIds
    );

    const location = await this.getApprovedLocationBible(
      projectId,
      scene.locationId as string
    );

    const style = await this.getApprovedStyleBible(projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    // Panggil ai-service untuk compile video prompt
    const response = await fetch(`${AI_SERVICE_URL}/compile-video-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shotId: shot.id,
        shotNumber: shot.shotNumber,
        shotType: shot.shotType,
        framing: shot.framing,
        composition: shot.composition,
        cameraPosition: shot.cameraPosition,
        lens: shot.lens,
        cameraMovement: shot.cameraMovement,
        characterBlocking: shot.characterBlocking || [],
        visualBeat: shot.visualBeat,
        sceneTime: scene.time,
        sceneAction: scene.action,
        sceneEmotions: scene.emotions || [],
        characters,
        location,
        style,
        imagePrompt,
        sourceImageUrl,
        durationSeconds: null, // V1: durasi default dari adapter; bisa diperluas via Content Adapter
        aspectRatio: project?.aspectRatio || '16:9',
        unresolvedFlags: unresolvedFlags.map(
          (f: { flagType: string; description: string }) => ({
            flagType: f.flagType,
            description: f.description,
          })
        ),
      }),
    });

    if (!response.ok) {
      throw new BadRequestException(
        `AI Service error: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as {
      success: boolean;
      prompt: Record<string, unknown> | null;
      errors: string[];
      warnings: string[];
      bibleVersions: Record<string, unknown>;
    };

    if (!result.success) {
      throw new BadRequestException(
        `Compile video prompt gagal: ${result.errors.join('; ')}`
      );
    }

    return {
      shotId,
      conceptualPrompt: result.prompt,
      warnings: result.warnings,
      bibleVersions: result.bibleVersions,
      baseImageJobId: imageJob.id,
      hasSourceImage: Boolean(sourceImageUrl),
    };
  }

  /**
   * Buat Generation Job video dengan estimasi biaya.
   * Status awal: pending — menunggu approval user (Budget Guard).
   */
  async createGenerationJob(shotId: string) {
    const compiled = await this.compilePrompt(shotId);

    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
    });
    if (!shot) {
      throw new NotFoundException(`Shot ${shotId} tidak ditemukan`);
    }

    // Build prompt final via Seedance adapter
    const payload = await this.seedanceAdapter.buildPrompt(
      compiled.conceptualPrompt as Record<string, unknown>
    );

    // Validasi constraints adapter (durasi, resolusi, imageUrl, prompt length)
    const validation = await this.seedanceAdapter.validateConstraints(payload);
    if (!validation.valid) {
      throw new BadRequestException(
        `Validasi adapter gagal: ${validation.errors.join('; ')}`
      );
    }

    // Estimasi biaya via BudgetService (rate dari database)
    const p = payload as {
      width?: number;
      height?: number;
      durationSeconds?: number;
    };
    const estimate = await this.budgetService.estimateCost(
      'seedance',
      'video',
      {
        width: p.width,
        height: p.height,
        durationSeconds: p.durationSeconds,
      }
    );

    // Set pricing rate ke adapter
    const rate = await this.budgetService.getActiveRate('seedance', 'video');
    if (rate) {
      this.seedanceAdapter.setPricingRate(rate.rateStructure, rate.currency);
    }

    // Hitung prompt version (increment jika sudah ada job video sebelumnya untuk shot ini)
    const existingJobs = await this.prisma.generationJob.count({
      where: { shotId, type: 'video' },
    });

    // Buat GenerationJob dengan status pending
    const job = await this.prisma.generationJob.create({
      data: {
        projectId: shot.projectId,
        shotId,
        type: 'video',
        adapterName: 'seedance',
        status: 'pending',
        promptConceptual: JSON.stringify(compiled.conceptualPrompt),
        promptFinal: JSON.stringify(payload),
        promptVersion: existingJobs + 1,
        bibleVersions: compiled.bibleVersions as any,
        costEstimate: estimate.estimatedCost,
        currency: estimate.currency,
      },
    });

    return {
      job,
      estimate,
      warnings: compiled.warnings,
      baseImageJobId: compiled.baseImageJobId,
      hasSourceImage: compiled.hasSourceImage,
    };
  }

  /**
   * Approve Generation Job video (user menyetujui estimasi biaya).
   * Ini adalah approval eksplisit — tidak ada auto-approve (Budget Guard).
   */
  async approveJob(jobId: string) {
    const job = await this.prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Generation job ${jobId} tidak ditemukan`);
    }

    if (job.status !== 'pending') {
      throw new BadRequestException(
        `Job dengan status ${job.status} tidak bisa di-approve. Hanya job pending yang bisa di-approve.`
      );
    }

    return this.prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'approved' },
    });
  }

  /**
   * Reject Generation Job video.
   */
  async rejectJob(jobId: string) {
    const job = await this.prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Generation job ${jobId} tidak ditemukan`);
    }

    if (!['pending', 'approved'].includes(job.status)) {
      throw new BadRequestException(
        `Job dengan status ${job.status} tidak bisa di-reject`
      );
    }

    return this.prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'rejected' },
    });
  }

  /**
   * Submit Generation Job video ke adapter Seedance.
   * WAJIB sudah approved (Budget Guard) — jika tidak, ditolak.
   */
  async submitJob(jobId: string) {
    const job = await this.prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Generation job ${jobId} tidak ditemukan`);
    }

    // === BUDGET GUARD: validasi approval ===
    // Ini gate wajib — tidak ada jalur submit yang melewati ini
    this.budgetService.validateBudgetApproval(job);

    // Cek capability video generation
    const enabled = await this.capabilityService.isVideoGenerationEnabled(
      job.projectId
    );
    if (!enabled) {
      throw new ForbiddenException(
        'Video generation tidak aktif untuk project ini'
      );
    }

    // Set pricing rate ke adapter
    const rate = await this.budgetService.getActiveRate('seedance', 'video');
    if (rate) {
      this.seedanceAdapter.setPricingRate(rate.rateStructure, rate.currency);
    }

    // Update status ke submitted
    await this.prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'submitted' },
    });

    try {
      const payload = JSON.parse(job.promptFinal || '{}');

      // Normalisasi output Flux → input Seedance (tanggung jawab adapter).
      // Jika imageUrl belum tersedia (job image belum completed), submit akan
      // gagal di validasi adapter dengan pesan yang jelas.
      const project = await this.prisma.project.findUnique({
        where: { id: job.projectId },
      });
      const normalization = this.seedanceAdapter.normalizeFluxOutput(
        payload.imageUrl || '',
        project?.aspectRatio || '16:9'
      );
      payload.imageUrl = normalization.normalizedUrl;

      const approvedCost: CostEstimate = {
        adapterName: job.adapterName,
        estimatedCost: job.costEstimate,
        currency: job.currency,
        breakdown: {},
      };

      const result = await this.seedanceAdapter.submit(payload, approvedCost);

      if (result.success) {
        return this.prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            outputAssetUrl: result.outputAssetUrl,
            costActual: job.costEstimate,
            metadata: result.metadata as any,
          },
        });
      } else {
        return this.prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            errorMessage: result.errorMessage,
          },
        });
      }
    } catch (error) {
      return this.prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Ambil semua Generation Job video untuk sebuah Shot.
   */
  async getJobsByShot(shotId: string) {
    return this.prisma.generationJob.findMany({
      where: { shotId, type: 'video' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Ambil semua Generation Job video untuk sebuah Project.
   */
  async getJobsByProject(projectId: string) {
    return this.prisma.generationJob.findMany({
      where: { projectId, type: 'video' },
      orderBy: { createdAt: 'desc' },
      include: { shot: true },
    });
  }

  /**
   * Ambil satu Generation Job video.
   */
  async getJob(jobId: string) {
    const job = await this.prisma.generationJob.findUnique({
      where: { id: jobId },
      include: { shot: true },
    });

    if (!job) {
      throw new NotFoundException(`Generation job ${jobId} tidak ditemukan`);
    }

    return job;
  }

  // ===== Private helpers =====

  /**
   * Ambil job image yang menjadi dasar Video Prompt untuk shot ini.
   * Prioritas: job image completed (ada output gambar), lalu job image terbaru.
   */
  private async getBaseImageJob(shotId: string) {
    // Prioritas 1: job image yang sudah completed (starting frame tersedia)
    const completedJob = await this.prisma.generationJob.findFirst({
      where: { shotId, type: 'image', status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });
    if (completedJob) return completedJob;

    // Prioritas 2: job image terbaru dengan promptConceptual (untuk preview)
    return this.prisma.generationJob.findFirst({
      where: { shotId, type: 'image' },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getApprovedCharacterBibles(
    projectId: string,
    characterIds: string[]
  ) {
    const characters = [];
    for (const characterId of characterIds) {
      const bible = await this.prisma.characterBible.findFirst({
        where: { projectId, characterId, status: 'approved' },
        orderBy: { version: 'desc' },
      });
      if (bible) {
        characters.push({
          characterId: bible.characterId,
          version: bible.version,
          name: bible.name,
          identityDesc: bible.identityDesc,
          defaultExpression: bible.defaultExpression,
        });
      }
    }
    return characters;
  }

  private async getApprovedLocationBible(
    projectId: string,
    locationId: string
  ) {
    const bible = await this.prisma.locationBible.findFirst({
      where: { projectId, locationId, status: 'approved' },
      orderBy: { version: 'desc' },
    });

    if (!bible) return null;

    return {
      locationId: bible.locationId,
      version: bible.version,
      name: bible.name,
      atmosphere: bible.atmosphere,
    };
  }

  private async getApprovedStyleBible(projectId: string) {
    const bible = await this.prisma.styleBible.findFirst({
      where: { projectId, status: 'approved' },
      orderBy: { version: 'desc' },
    });

    if (!bible) return null;

    return {
      version: bible.version,
      visualStyle: bible.visualStyle,
    };
  }
}