import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ControlsService } from './controls.service';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/auth/current-user.decorator';
import { ControlStatus } from '@prisma/client';

@Controller('controls')
export class ControlsController {
  constructor(private svc: ControlsService) {}

  @Get() list() { return this.svc.list(); }
  @Get('dashboard') dashboard() { return this.svc.dashboard(); }

  @Patch(':id/status') @Roles('SUPERVISOR', 'CO', 'MLRO')
  setStatus(@Param('id') id: string, @Body('status') status: ControlStatus) {
    return this.svc.setStatus(id, status);
  }

  @Post(':id/test') @Roles('SUPERVISOR', 'CO', 'MLRO', 'ANALYST')
  test(@Param('id') id: string, @Body('result') result: ControlStatus, @CurrentUser() u: AuthUser) {
    return this.svc.addTest(id, u.name, result);
  }

  @Post(':id/evidence') @Roles('SUPERVISOR', 'CO', 'MLRO', 'ANALYST')
  evidence(@Param('id') id: string, @Body() b: { name: string; type: string; uri?: string }, @CurrentUser() u: AuthUser) {
    return this.svc.addEvidence(id, b.name, b.type, u.name, b.uri);
  }
}
