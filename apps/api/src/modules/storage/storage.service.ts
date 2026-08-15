import { Injectable, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve, relative, isAbsolute } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export interface UploadedFile {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class StorageService {
  /**
   * Simpan file upload ke storage lokal.
   * Struktur: uploads/{projectId}/{uuid}_{originalname}
   */
  async saveFile(
    projectId: string,
    file: {
      originalname: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    },
  ): Promise<UploadedFile> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File kosong atau invalid');
    }

    // Validasi jenis file (hanya gambar)
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Hanya file gambar yang diwajib (image/*)');
    }

    const projectDir = join(UPLOAD_DIR, projectId);
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }

    const ext = this.getExtension(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const filePath = join(projectDir, filename);

    // Simpan file
    writeFileSync(filePath, file.buffer);

    return {
      url: `/uploads/${projectId}/${filename}`,
      filename,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Mendapatkan path file dari URL.
   */
  /**
   * Mendapatkan path file dari URL.
   * Memvalidasi bahwa path hasil resolve tetap berada di dalam UPLOAD_DIR —
   * mencegah path traversal lewat "../" di url (mis. "/uploads/../../etc/passwd").
   */
  getFilePath(url: string): string {
    if (!url.startsWith('/uploads/')) {
      throw new BadRequestException('URL invalid');
    }

    const relativePath = url.replace(/^\/uploads\//, '');
    const resolvedPath = resolve(UPLOAD_DIR, relativePath);
    const rel = relative(UPLOAD_DIR, resolvedPath);

    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new BadRequestException('URL invalid');
    }

    return resolvedPath;
  }

  /**
   * Cek file exists.
   */
  fileExists(url: string): boolean {
    return existsSync(this.getFilePath(url));
  }

  private getExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1) return '';
    return filename.substring(dotIndex).toLowerCase();
  }
}