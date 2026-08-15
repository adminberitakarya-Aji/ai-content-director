import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { CapabilityService } from './capability.service';

/**
 * Capability Controller — toggle kemampuan AI per Project.
 *
 * Endpoint:
 * - GET /projects/:projectId/capabilities — lihat status capability
 * - PUT /projects/:projectId/capabilities/image-generation — toggle image generation
 */
@Controller('projects/:projectId/capabilities')
export class CapabilityController {
  constructor(private readonly capabilityService: CapabilityService) {}

  @Get()
  async getCapabilities(@Param('projectId') projectId: string) {
    const imageGenerationEnabled =
      await this.capabilityService.isImageGenerationEnabled(projectId);
    return {
      projectId,
      imageGenerationEnabled,
    };
  }

  @Put('image-generation')
  setImageGeneration(
    @Param('projectId') projectId: string,
    @Body('enabled') enabled: boolean
  ) {
    return this.capabilityService.setImageGenerationEnabled(projectId, enabled);
  }
}