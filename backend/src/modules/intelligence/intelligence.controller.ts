import { Controller, Get, Post, Query } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';

@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly svc: IntelligenceService) {}

  @Get('feed')
  getFeed(
    @Query('country')  country?: string,
    @Query('category') category?: string,
    @Query('severity') severity?: string,
    @Query('limit')    limit?: string,
  ) {
    return { items: this.svc.getFeed(country, category, severity, limit ? +limit : 100) };
  }

  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  @Post('refresh')
  async refresh() {
    return this.svc.triggerRefresh();
  }
}
