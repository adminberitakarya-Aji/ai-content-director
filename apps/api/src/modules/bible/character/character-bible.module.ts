import { Module } from '@nestjs/common';
import { CharacterBibleController } from './character-bible.controller';
import { CharacterBibleService } from './character-bible.service';

@Module({
  controllers: [CharacterBibleController],
  providers: [CharacterBibleService],
  exports: [CharacterBibleService],
})
export class CharacterBibleModule {}