import { Module } from '@nestjs/common';
import { PropBibleController } from './prop-bible.controller';
import { PropBibleService } from './prop-bible.service';
import { ContinuityModule } from '../../continuity/continuity.module';

@Module({
  imports: [ContinuityModule],
  controllers: [PropBibleController],
  providers: [PropBibleService],
  exports: [PropBibleService],
})
export class PropBibleModule {}