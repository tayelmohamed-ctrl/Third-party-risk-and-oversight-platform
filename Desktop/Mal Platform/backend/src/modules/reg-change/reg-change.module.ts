import { Module } from '@nestjs/common';
import { RegChangeController } from './reg-change.controller';
import { RegChangeService } from './reg-change.service';
@Module({ controllers: [RegChangeController], providers: [RegChangeService], exports: [RegChangeService] })
export class RegChangeModule {}
