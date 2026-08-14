import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { ReviewService, ReviewableType } from './review.service';

@Controller('projects/:projectId/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  findPendingReviews(@Param('projectId') projectId: string) {
    return this.reviewService.findPendingReviews(projectId);
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