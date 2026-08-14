import { Module } from '@nestjs/common';
import { PropBibleController } from './prop-bible.controller';
import { PropBibleService } from './prop-bible.service';

@Module({
  controllers: [PropBibleController],
  providers: [PropBibleService],
  exports: [PropBibleService],
})
export class PropBibleModule {}