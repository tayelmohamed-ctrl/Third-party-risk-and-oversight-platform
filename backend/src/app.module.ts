import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { ControlsModule } from './modules/controls/controls.module';
import { CasesModule } from './modules/cases/cases.module';
import { RegChangeModule } from './modules/reg-change/reg-change.module';
import { CrosswalkModule } from './modules/crosswalk/crosswalk.module';
import { TypologiesModule } from './modules/typologies/typologies.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditControllerModule } from './modules/audit/audit-controller.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';

@Controller()
class HealthController {
  @Get('health') health() { return { ok: true, service: 'mal-tpro-api', ts: new Date().toISOString() }; }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    ControlsModule,
    CasesModule,
    RegChangeModule,
    CrosswalkModule,
    TypologiesModule,
    ReportsModule,
    AuditControllerModule,
    IntelligenceModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
