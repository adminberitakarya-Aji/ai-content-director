import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { StyleBibleService, CreateStyleBibleInput } from './style-bible.service';

@Controller('projects/:projectId/styles')
export class StyleBibleController {
  constructor(private readonly styleBibleService: StyleBibleService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() input: CreateStyleBibleInput,
  ) {
    return this.styleBibleService.createStyle(projectId, input);
  }

  @Get()
  findActive(@Param('projectId') projectId: string) {
    return this.styleBibleService.findActive(projectId);
  }

  @Get('versions')
  findAllVersions(@Param('projectId') projectId: string) {
    return this.styleBibleService.findAllVersions(projectId);
  }

  @Get(':id')
  findVersion(@Param('id') id: string) {
    return this.styleBibleService.findVersion(id);
  }

  @Post(':id/versions')
  createNewVersion(
    @Param('id') id: string,
    @Body() input: Partial<CreateStyleBibleInput>,
    @Body('isMinorRevision') isMinorRevision?: boolean,
  ) {
    return this.styleBibleService.createNewVersion(id, input, isMinorRevision);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.styleBibleService.updateStatus(id, status);
  }
}