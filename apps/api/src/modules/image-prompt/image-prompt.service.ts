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
  FluxAdapter,
  CostEstimate,
} from '@ai-content-director/generation-adapters';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Image Prompt Service — orkestrasi compile prompt → budget check → submit.
 *
 * Alur (IMPLEMENTATION_PLAN.md 4.8):
 * image-prompt → budget (wajib lolos estimasi) → generation-adapters/flux (submit)
 *   → simpan GenerationJob dengan hasil
 *
 * Prinsip:
 * - Tidak ada submit tanpa lolos budget check (Budget Guard wajib)
 * - Setiap GenerationJob mencatat versi prompt & Bible yang dipakai
 */
@Injectable()
export class ImagePromptService {
  private fluxAdapter: FluxAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetService: BudgetService,
    private readonly capabilityService: CapabilityService
  ) {
    this.fluxAdapter = new FluxAdapter();
  }

  /**
   * Compile Image Prompt untuk sebuah Shot (preview).
   * Memanggil ai-service untuk menyusun prompt konseptual.
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

    // Cek capability image generation
    const enabled =
      await this.capabilityService.isImageGenerationEnabled(projectId);
    if (!enabled) {
      throw new ForbiddenException(
        'Image generation tidak aktif untuk project ini'
      );
    }

    // Cek continuity flags unresolved untuk shot ini
    const unresolvedFlags = await this.prisma.continuityFlag.findMany({
      where: { shotId, status: 'unresolved' },
    });

    // Ambil Bible data
    const characterIds = (scene.characterIds as string[]) || [];
    const characters = await this.getApprovedCharacterBibles(
      projectId,
      characterIds
    );

    const location = await this.getApprovedLocationBible(
      projectId,
      scene.locationId as string
    );

    const propIds = (scene.propIds as string[]) || [];
    const props = await this.getApprovedPropBibles(projectId, propIds);

    const style = await this.getApprovedStyleBible(projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    // Panggil ai-service untuk compile prompt
    const response = await fetch(`${AI_SERVICE_URL}/compile-image-prompt`, {
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
        props,
        style,
        aspectRatio: project?.aspectRatio || '16:9',
        unresolvedFlags: unresolvedFlags.map((f: { flagType: string; description: string }) => ({
          flagType: f.flagType,
          description: f.description,
        })),
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
        `Compile prompt gagal: ${result.errors.join('; ')}`
      );
    }

    return {
      shotId,
      conceptualPrompt: result.prompt,
      warnings: result.warnings,
      bibleVersions: result.bibleVersions,
    };
  }

  /**
   * Buat Generation Job dengan estimasi biaya.
   * Status awal: pending — menunggu approval user.
   */
  async createGenerationJob(shotId: string) {
    const compiled = await this.compilePrompt(shotId);

    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
    });
    if (!shot) {
      throw new NotFoundException(`Shot ${shotId} tidak ditemukan`);
    }

    // Build prompt final via Flux adapter
    const payload = await this.fluxAdapter.buildPrompt(
      compiled.conceptualPrompt as Record<string, unknown>
    );

    // Validasi constraints adapter
    const validation = await this.fluxAdapter.validateConstraints(payload);
    if (!validation.valid) {
      throw new BadRequestException(
        `Validasi adapter gagal: ${validation.errors.join('; ')}`
      );
    }

    // Estimasi biaya via BudgetService (rate dari database)
    const p = payload as { width?: number; height?: number };
    const estimate = await this.budgetService.estimateCost('flux', 'image', {
      width: p.width,
      height: p.height,
    });

    // Set pricing rate ke adapter
    const rate = await this.budgetService.getActiveRate('flux', 'image');
    if (rate) {
      this.fluxAdapter.setPricingRate(rate.rateStructure, rate.currency);
    }

    // Hitung prompt version (increment jika sudah ada job sebelumnya untuk shot ini)
    const existingJobs = await this.prisma.generationJob.count({
      where: { shotId, type: 'image' },
    });

    // Buat GenerationJob dengan status pending
    const job = await this.prisma.generationJob.create({
      data: {
        projectId: shot.projectId,
        shotId,
        type: 'image',
        adapterName: 'flux',
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
    };
  }

  /**
   * Approve Generation Job (user menyetujui estimasi biaya).
   * Ini adalah approval eksplisit — tidak ada auto-approve.
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
   * Reject Generation Job.
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
   * Submit Generation Job ke adapter.
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

    // Cek capability
    const enabled = await this.capabilityService.isImageGenerationEnabled(
      job.projectId
    );
    if (!enabled) {
      throw new ForbiddenException(
        'Image generation tidak aktif untuk project ini'
      );
    }

    // Set pricing rate ke adapter
    const rate = await this.budgetService.getActiveRate('flux', 'image');
    if (rate) {
      this.fluxAdapter.setPricingRate(rate.rateStructure, rate.currency);
    }

    // Update status ke submitted
    await this.prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'submitted' },
    });

    try {
      const payload = JSON.parse(job.promptFinal || '{}');
      const approvedCost: CostEstimate = {
        adapterName: job.adapterName,
        estimatedCost: job.costEstimate,
        currency: job.currency,
        breakdown: {},
      };

      const result = await this.fluxAdapter.submit(payload, approvedCost);

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
   * Ambil semua Generation Job untuk sebuah Shot.
   */
  async getJobsByShot(shotId: string) {
    return this.prisma.generationJob.findMany({
      where: { shotId, type: 'image' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Ambil semua Generation Job untuk sebuah Project.
   */
  async getJobsByProject(projectId: string) {
    return this.prisma.generationJob.findMany({
      where: { projectId, type: 'image' },
      orderBy: { createdAt: 'desc' },
      include: { shot: true },
    });
  }

  /**
   * Ambil satu Generation Job.
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

  // ===== Private: Bible helpers =====

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
          faceShape: bible.faceShape,
          eyeColor: bible.eyeColor,
          skinColor: bible.skinColor,
          distinctiveFeatures: bible.distinctiveFeatures,
          defaultExpression: bible.defaultExpression,
          height: bible.height,
          build: bible.build,
          posture: bible.posture,
          hairColor: bible.hairColor,
          hairLength: bible.hairLength,
          hairTexture: bible.hairTexture,
          hairDefaultStyle: bible.hairDefaultStyle,
          wardrobes: bible.wardrobes,
          referenceImages: bible.referenceImages,
        });
      }
    }
    return characters;
  }

  private async getApprovedLocationBible(projectId: string, locationId: string) {
    const bible = await this.prisma.locationBible.findFirst({
      where: { projectId, locationId, status: 'approved' },
      orderBy: { version: 'desc' },
    });

    if (!bible) return null;

    return {
      locationId: bible.locationId,
      version: bible.version,
      name: bible.name,
      exterior: bible.exterior,
      interior: bible.interior,
      architecture: bible.architecture,
      lighting: bible.lighting,
      atmosphere: bible.atmosphere,
      referenceImages: bible.referenceImages,
    };
  }

  private async getApprovedPropBibles(projectId: string, propIds: string[]) {
    const props = [];
    for (const propId of propIds) {
      const bible = await this.prisma.propBible.findFirst({
        where: { projectId, propId, status: 'approved' },
        orderBy: { version: 'desc' },
      });
      if (bible) {
        props.push({
          propId: bible.propId,
          version: bible.version,
          name: bible.name,
          appearance: bible.appearance,
          referenceImages: bible.referenceImages,
        });
      }
    }
    return props;
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
      colorPalette: bible.colorPalette,
      colorSaturation: bible.colorSaturation,
      colorContrast: bible.colorContrast,
      lightingApproach: bible.lightingApproach,
      lightingTendency: bible.lightingTendency,
      texture: bible.texture,
    };
  }
}