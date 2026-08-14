import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './modules/project/project.module';
import { StoryModule } from './modules/story/story.module';
import { CharacterBibleModule } from './modules/bible/character/character-bible.module';
import { LocationBibleModule } from './modules/bible/location/location-bible.module';
import { PropBibleModule } from './modules/bible/prop/prop-bible.module';
import { StyleBibleModule } from './modules/bible/style/style-bible.module';
import { ReviewModule } from './modules/review/review.module';
import { StorageModule } from './modules/storage/storage.module';
import { SceneModule } from './modules/scene/scene.module';
import { ContinuityModule } from './modules/continuity/continuity.module';

@Module({
  imports: [
    PrismaModule,
    ProjectModule,
    StoryModule,
    CharacterBibleModule,
    LocationBibleModule,
    PropBibleModule,
    StyleBibleModule,
    ReviewModule,
    StorageModule,
    SceneModule,
    ContinuityModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
