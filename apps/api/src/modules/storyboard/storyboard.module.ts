import { Module } from '@nestjs/common';
import { StoryboardController } from './storyboard.controller';
import { StoryboardService } from './storyboard.service';
import { ContinuityModule } from '../continuity/continuity.module';

@Module({
  imports: [ContinuityModule],
  controllers: [StoryboardController],
  providers: [StoryboardService],
  exports: [StoryboardService],
})
export class StoryboardModule {}