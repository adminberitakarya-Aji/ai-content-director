import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { LocationBibleService, CreateLocationBibleInput } from './location-bible.service';

@Controller('projects/:projectId/locations')
export class LocationBibleController {
  constructor(private readonly locationBibleService: LocationBibleService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() input: CreateLocationBibleInput,
  ) {
    return this.locationBibleService.createLocation(projectId, input);
  }

  @Get()
  findAllActive(@Param('projectId') projectId: string) {
    return this.locationBibleService.findAllActive(projectId);
  }

  @Get('versions/:locationId')
  findAllVersions(
    @Param('projectId') projectId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.locationBibleService.findAllVersions(projectId, locationId);
  }

  @Get(':id')
  findVersion(@Param('id') id: string) {
    return this.locationBibleService.findVersion(id);
  }

  @Post(':id/versions')
  createNewVersion(
    @Param('id') id: string,
    @Body() input: Partial<CreateLocationBibleInput>,
    @Body('isMinorRevision') isMinorRevision?: boolean,
  ) {
    return this.locationBibleService.createNewVersion(id, input, isMinorRevision);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.locationBibleService.updateStatus(id, status);
  }
}