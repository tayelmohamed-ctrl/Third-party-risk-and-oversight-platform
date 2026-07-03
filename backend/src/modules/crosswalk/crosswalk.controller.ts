import { Controller, Get, Query } from '@nestjs/common';
import { CrosswalkService } from './crosswalk.service';
@Controller('crosswalk')
export class CrosswalkController {
  constructor(private svc: CrosswalkService) {}
  @Get() coverage(@Query('framework') f: 'BSA' | 'FATF' | 'WOLFSBERG' = 'BSA') { return this.svc.coverage(f); }
}
