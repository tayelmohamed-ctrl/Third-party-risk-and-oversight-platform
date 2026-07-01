import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CasesService } from './cases.service';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/auth/current-user.decorator';
import { Disposition } from '@prisma/client';

@Controller('cases')
export class CasesController {
  constructor(private svc: CasesService) {}

  @Get() list() { return this.svc.list(); }
  @Get('queue') queue() { return this.svc.queue(); }
  @Get('sars') sars() { return this.svc.sars(); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }

  @Post() @Roles('SUPERVISOR', 'CO', 'MLRO', 'ANALYST')
  create(@Body() b: any, @CurrentUser() u: AuthUser) { return this.svc.create(b, u); }

  @Post(':id/dpl') @Roles('SUPERVISOR', 'CO', 'MLRO', 'ANALYST')
  dpl(@Param('id') id: string, @Body() b: { action: string; note: string }, @CurrentUser() u: AuthUser) {
    return this.svc.addDpl(id, b.action, b.note, u);
  }

  @Post(':id/disposition') @Roles('SUPERVISOR', 'CO', 'MLRO', 'ANALYST')
  propose(@Param('id') id: string, @Body() b: { disposition: Disposition; rationale: string }, @CurrentUser() u: AuthUser) {
    return this.svc.propose(id, b.disposition, b.rationale, u);
  }

  @Post(':id/approve') @Roles('CO', 'MLRO')
  approve(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.svc.approve(id, u); }

  @Post(':id/sar') @Roles('SUPERVISOR', 'CO', 'MLRO')
  fileSar(@Param('id') id: string, @Body('narrative') narrative: string, @CurrentUser() u: AuthUser) {
    return this.svc.fileSar(id, narrative, u);
  }
}
