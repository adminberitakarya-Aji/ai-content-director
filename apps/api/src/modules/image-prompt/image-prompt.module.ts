import { Module } from '@nestjs/common';
import { ImagePromptController } from './image-prompt.controller';
import { ImagePromptService } from './image-prompt.service';
import { BudgetModule } from '../budget/budget.module';
import { CapabilityModule } from '../capability/capability.module';

@Module({
  imports: [BudgetModule, CapabilityModule],
  controllers: [ImagePromptController],
  providers: [ImagePromptService],
  exports: [ImagePromptService],
})
export class ImagePromptModule {}