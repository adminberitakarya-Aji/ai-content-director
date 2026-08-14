import { Module } from '@nestjs/common';
import { StyleBibleController } from './style-bible.controller';
import { StyleBibleService } from './style-bible.service';

@Module({
  controllers: [StyleBibleController],
  providers: [StyleBibleService],
  exports: [StyleBibleService],
})
export class StyleBibleModule {}