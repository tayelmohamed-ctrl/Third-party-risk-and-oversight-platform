import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ControlsModule } from '../controls/controls.module';
import { CasesModule } from '../cases/cases.module';
import { RegChangeModule } from '../reg-change/reg-change.module';
@Module({
  imports: [ControlsModule, CasesModule, RegChangeModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
