import { Module } from '@nestjs/common';
import { CrosswalkController } from './crosswalk.controller';
import { CrosswalkService } from './crosswalk.service';
@Module({ controllers: [CrosswalkController], providers: [CrosswalkService] })
export class CrosswalkModule {}
