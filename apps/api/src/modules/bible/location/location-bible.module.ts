import { Module } from '@nestjs/common';
import { LocationBibleController } from './location-bible.controller';
import { LocationBibleService } from './location-bible.service';

@Module({
  controllers: [LocationBibleController],
  providers: [LocationBibleService],
  exports: [LocationBibleService],
})
export class LocationBibleModule {}