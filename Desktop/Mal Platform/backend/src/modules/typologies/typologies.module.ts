import { Controller, Get, Module, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('typologies')
class TypologiesController {
  constructor(private prisma: PrismaService) {}
  @Get() list() { return this.prisma.typology.findMany({ orderBy: { id: 'asc' } }); }
  @Get(':id') get(@Param('id') id: string) { return this.prisma.typology.findUnique({ where: { id } }); }
}
@Module({ controllers: [TypologiesController] })
export class TypologiesModule {}
