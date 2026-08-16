import { Module } from '@nestjs/common';
import { VideoPromptController } from './video-prompt.controller';
import { VideoPromptService } from './video-prompt.service';
import { BudgetModule } from '../budget/budget.module';
import { CapabilityModule } from '../capability/capability.module';

@Module({
  imports: [BudgetModule, CapabilityModule],
  controllers: [VideoPromptController],
  providers: [VideoPromptService],
  exports: [VideoPromptService],
})
export class VideoPromptModule {}