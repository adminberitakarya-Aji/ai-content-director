import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PropBibleService, CreatePropBibleInput } from './prop-bible.service';

@Controller('projects/:projectId/props')
export class PropBibleController {
  constructor(private readonly propBibleService: PropBibleService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() input: CreatePropBibleInput,
  ) {
    return this.propBibleService.createProp(projectId, input);
  }

  @Get()
  findAllActive(@Param('projectId') projectId: string) {
    return this.propBibleService.findAllActive(projectId);
  }

  @Get('versions/:propId')
  findAllVersions(
    @Param('projectId') projectId: string,
    @Param('propId') propId: string,
  ) {
    return this.propBibleService.findAllVersions(projectId, propId);
  }

  @Get(':id')
  findVersion(@Param('id') id: string) {
    return this.propBibleService.findVersion(id);
  }

  @Post(':id/versions')
  createNewVersion(
    @Param('id') id: string,
    @Body() input: Partial<CreatePropBibleInput>,
    @Body('isMinorRevision') isMinorRevision?: boolean,
  ) {
    return this.propBibleService.createNewVersion(id, input, isMinorRevision);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.propBibleService.updateStatus(id, status);
  }
}