import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('audit')
export class AuditController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}
  @Get() @Roles('SUPERVISOR', 'CO', 'MLRO')
  async list(@Query('take') take = '100') {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { id: 'desc' }, take: Number(take) });
    return rows.map((r) => ({ ...r, id: r.id.toString() }));
  }
  @Get('verify') @Roles('SUPERVISOR', 'CO', 'MLRO')
  async verify() { const v = await this.audit.verify(); return { ...v, brokenAt: v.brokenAt?.toString() }; }
}
