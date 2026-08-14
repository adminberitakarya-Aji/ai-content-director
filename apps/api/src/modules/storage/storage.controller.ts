import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('projects/:projectId/uploads')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('projectId') projectId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('File wajib diupload');
    }

    return this.storageService.saveFile(projectId, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    });
  }
}