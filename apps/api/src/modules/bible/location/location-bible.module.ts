import { Module } from '@nestjs/common';
import { LocationBibleController } from './location-bible.controller';
import { LocationBibleService } from './location-bible.service';
import { ContinuityModule } from '../../continuity/continuity.module';

@Module({
  imports: [ContinuityModule],
  controllers: [LocationBibleController],
  providers: [LocationBibleService],
  exports: [LocationBibleService],
})
export class LocationBibleModule {}