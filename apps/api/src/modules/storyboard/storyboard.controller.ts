import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { StoryboardService, CreateShotInput } from './storyboard.service';

@Controller('projects/:projectId/storyboard')
export class StoryboardController {
  constructor(private readonly storyboardService: StoryboardService) {}

  @Post('scenes/:sceneId/shots')
  createShot(
    @Param('sceneId') sceneId: string,
    @Body() input: CreateShotInput,
  ) {
    return this.storyboardService.createShot(sceneId, input);
  }

  @Get('scenes/:sceneId/shots')
  findShotsByScene(@Param('sceneId') sceneId: string) {
    return this.storyboardService.findShotsByScene(sceneId);
  }

  @Get('shots')
  findShotsByProject(@Param('projectId') projectId: string) {
    return this.storyboardService.findShotsByProject(projectId);
  }

  @Get('shots/:id')
  findOne(@Param('id') id: string) {
    return this.storyboardService.findOne(id);
  }

  @Patch('shots/:id')
  updateShot(@Param('id') id: string, @Body() input: Partial<CreateShotInput>) {
    return this.storyboardService.updateShot(id, input);
  }

  @Put('scenes/:sceneId/shots/reorder')
  reorderShots(
    @Param('sceneId') sceneId: string,
    @Body('orderedIds') orderedIds: string[],
  ) {
    return this.storyboardService.reorderShots(sceneId, orderedIds);
  }

  @Delete('shots/:id')
  removeShot(@Param('id') id: string) {
    return this.storyboardService.removeShot(id);
  }
}