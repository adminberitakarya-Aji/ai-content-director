import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ReviewService, ReviewableType } from './review.service';

/**
 * Review Controller — endpoint approval gate terpusat (Fase 6).
 *
 * GET  /projects/:projectId/reviews?type=...  → antrean review terpusat
 * PATCH /projects/:projectId/reviews/:type/:id/status → ubah status review
 *
 * :type mencakup Bible (character/location/prop/style), shot (Storyboard),
 * dan generation-job (hasil image/video).
 */
@Controller('projects/:projectId/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  findPendingReviews(
    @Param('projectId') projectId: string,
    @Query('type') type?: ReviewableType,
  ) {
    return this.reviewService.findPendingReviews(projectId, type);
  }

  @Patch(':type/:id/status')
  updateStatus(
    @Param('type') type: ReviewableType,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.reviewService.updateStatus(type, id, status);
  }
}