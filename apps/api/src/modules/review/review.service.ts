import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertValidStatusTransition } from '../bible/base-bible.service';

export type ReviewableType = 'character' | 'location' | 'prop' | 'style';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mengubah status review entitas Bible.
   * Validasi transisi status: draft → review → approved → rejected.
   */
  async updateStatus(
    type: ReviewableType,
    id: string,
    newStatus: string,
  ): Promise<any> {
    const delegate = this.getDelegate(type);
    const entity = await delegate.findUnique({ where: { id } });

    if (!entity) {
      throw new BadRequestException(`${type} Bible dengan id ${id} tidak ditemukan`);
    }

    const currentStatus = entity.status;
    assertValidStatusTransition(currentStatus, newStatus);

    return delegate.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  /**
   * Mendapatkan semua entitas Bible yang berstatus review.
   */
  async findPendingReviews(projectId: string): Promise<any[]> {
    const [characters, locations, props, styles] = await Promise.all([
      this.prisma.characterBible.findMany({
        where: { projectId, status: 'review' },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.locationBible.findMany({
        where: { projectId, status: 'review' },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.propBible.findMany({
        where: { projectId, status: 'review' },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.styleBible.findMany({
        where: { projectId, status: 'review' },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return [
      ...characters.map((e) => ({ ...e, entityType: 'character' })),
      ...locations.map((e) => ({ ...e, entityType: 'location' })),
      ...props.map((e) => ({ ...e, entityType: 'prop' })),
      ...styles.map((e) => ({ ...e, entityType: 'style' })),
    ];
  }

  private getDelegate(type: ReviewableType): any {
    switch (type) {
      case 'character':
        return this.prisma.characterBible as any;
      case 'location':
        return this.prisma.locationBible as any;
      case 'prop':
        return this.prisma.propBible as any;
      case 'style':
        return this.prisma.styleBible as any;
      default:
        throw new BadRequestException(`Jenis entitas invalid: ${type}`);
    }
  }
}