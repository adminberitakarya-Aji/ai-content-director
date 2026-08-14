import { Module } from '@nestjs/common';
import { SceneController } from './scene.controller';
import { SceneService } from './scene.service';
import { ContinuityModule } from '../continuity/continuity.module';

@Module({
  imports: [ContinuityModule],
  controllers: [SceneController],
  providers: [SceneService],
  exports: [SceneService],
})
export class SceneModule {}
