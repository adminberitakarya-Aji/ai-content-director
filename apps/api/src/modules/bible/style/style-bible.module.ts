import { Module } from '@nestjs/common';
import { StyleBibleController } from './style-bible.controller';
import { StyleBibleService } from './style-bible.service';
import { ContinuityModule } from '../../continuity/continuity.module';

@Module({
  imports: [ContinuityModule],
  controllers: [StyleBibleController],
  providers: [StyleBibleService],
  exports: [StyleBibleService],
})
export class StyleBibleModule {}