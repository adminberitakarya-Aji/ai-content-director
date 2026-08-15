import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve file yang diupload StorageService (reference image Bible) di /uploads/*.
  // URL yang dikembalikan StorageService.saveFile() adalah "/uploads/{projectId}/{filename}",
  // jadi prefix di sini harus match persis — dan dipasang SEBELUM setGlobalPrefix('api')
  // supaya tidak ikut ter-prefix jadi /api/uploads.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API server running on http://localhost:${port}/api`);
  console.log(`Uploaded files served at http://localhost:${port}/uploads`);
}

bootstrap();