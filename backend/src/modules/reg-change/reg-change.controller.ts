import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { RegChangeService } from './reg-change.service';
import { Roles } from '../../common/auth/roles.decorator';
import { TaskStatus } from '@prisma/client';

@Controller('reg-changes')
export class RegChangeController {
  constructor(private svc: RegChangeService) {}
  @Get() list() { return this.svc.list(); }
  @Get('summary') summary() { return this.svc.summary(); }
  @Get('impact-map') map() { return this.svc.controlImpactMap(); }
  @Patch(':id/task') @Roles('SUPERVISOR', 'CO', 'MLRO', 'ANALYST')
  setTask(@Param('id') id: string, @Body('status') status: TaskStatus) { return this.svc.setTask(id, status); }
}
