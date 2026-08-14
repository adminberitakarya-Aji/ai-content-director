import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SceneService, CreateSceneInput } from './scene.service';

@Controller('projects/:projectId/scenes')
export class SceneController {
  constructor(private readonly sceneService: SceneService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() input: CreateSceneInput,
  ) {
    return this.sceneService.create(projectId, input);
  }

  @Get()
  findAll(@Param('projectId') projectId: string) {
    return this.sceneService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sceneService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: Partial<CreateSceneInput>) {
    return this.sceneService.update(id, input);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sceneService.remove(id);
  }
}