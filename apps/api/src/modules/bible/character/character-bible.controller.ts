import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CharacterBibleService, CreateCharacterBibleInput } from './character-bible.service';

@Controller('projects/:projectId/characters')
export class CharacterBibleController {
  constructor(private readonly characterBibleService: CharacterBibleService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() input: CreateCharacterBibleInput,
  ) {
    return this.characterBibleService.createCharacter(projectId, input);
  }

  @Get()
  findAllActive(@Param('projectId') projectId: string) {
    return this.characterBibleService.findAllActive(projectId);
  }

  @Get('versions/:characterId')
  findAllVersions(
    @Param('projectId') projectId: string,
    @Param('characterId') characterId: string,
  ) {
    return this.characterBibleService.findAllVersions(projectId, characterId);
  }

  @Get(':id')
  findVersion(@Param('id') id: string) {
    return this.characterBibleService.findVersion(id);
  }

  @Post(':id/versions')
  createNewVersion(
    @Param('id') id: string,
    @Body() input: Partial<CreateCharacterBibleInput>,
    @Body('isMinorRevision') isMinorRevision?: boolean,
  ) {
    return this.characterBibleService.createNewVersion(id, input, isMinorRevision);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.characterBibleService.updateStatus(id, status);
  }
}