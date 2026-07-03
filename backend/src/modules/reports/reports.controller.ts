import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}
  @Get('examiner-room') @Roles('SUPERVISOR', 'CO', 'MLRO')
  examiner(@Query('period') period = 'Q2 2026') { return this.svc.examinerRoom(period); }
  @Get('board-pack') @Roles('SUPERVISOR', 'CO', 'MLRO')
  board(@Query('period') period = 'Q2 2026') { return this.svc.boardPack(period); }
}
