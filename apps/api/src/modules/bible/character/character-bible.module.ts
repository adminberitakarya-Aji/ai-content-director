import { Module } from '@nestjs/common';
import { CharacterBibleController } from './character-bible.controller';
import { CharacterBibleService } from './character-bible.service';
import { ContinuityModule } from '../../continuity/continuity.module';

@Module({
  imports: [ContinuityModule],
  controllers: [CharacterBibleController],
  providers: [CharacterBibleService],
  exports: [CharacterBibleService],
})
export class CharacterBibleModule {}