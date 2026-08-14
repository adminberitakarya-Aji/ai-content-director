import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ContinuityService } from './continuity.service';

@Controller('projects/:projectId/continuity')
export class ContinuityController {
  constructor(private readonly continuityService: ContinuityService) {}

  @Post('scenes/:sceneId/check')
  runCheck(@Param('sceneId') sceneId: string) {
    return this.continuityService.runCheck(sceneId);
  }

  @Get('scenes/:sceneId/flags')
  getFlagsForScene(@Param('sceneId') sceneId: string) {
    return this.continuityService.getFlagsForScene(sceneId);
  }

  @Get('flags/unresolved')
  getUnresolvedFlags(@Param('projectId') projectId: string) {
    return this.continuityService.getUnresolvedFlags(projectId);
  }

  @Patch('flags/:id/resolve')
  resolveFlag(
    @Param('id') id: string,
    @Body('status') status: 'resolved(fixed)' | 'resolved(accepted)',
    @Body('note') note?: string,
  ) {
    return this.continuityService.resolveFlag(id, status, note);
  }
}