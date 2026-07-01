import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ControlStatus } from '@prisma/client';

const DAY = 86_400_000;
const RISK_W: Record<string, number> = { Critical: 3, High: 2, Medium: 1.5, Low: 1 };
const score = (s: ControlStatus) => (s === 'OPERATING' ? 100 : s === 'PARTIAL' ? 50 : 0);

export function freshness(lastTested: Date | null, cadenceMo: number) {
  if (!lastTested) return { state: 'Never tested', days: null as number | null };
  const due = lastTested.getTime() + cadenceMo * 30 * DAY;
  const days = Math.round((due - Date.now()) / DAY);
  return { state: days < 0 ? 'Overdue' : days <= 30 ? 'Due soon' : 'Current', days };
}

@Injectable()
export class ControlsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.control.findMany({ include: { evidence: true }, orderBy: { id: 'asc' } });
    return rows.map((c) => ({ ...c, freshness: freshness(c.lastTested, c.cadenceMo) }));
  }

  async dashboard() {
    const rows = await this.prisma.control.findMany({ include: { evidence: true } });
    const tw = rows.reduce((s, c) => s + (RISK_W[c.risk] || 1), 0) || 1;
    const health = Math.round(rows.reduce((s, c) => s + score(c.status) * (RISK_W[c.risk] || 1), 0) / tw);
    const by = (st: ControlStatus) => rows.filter((c) => c.status === st).length;
    const fr = rows.map((c) => freshness(c.lastTested, c.cadenceMo).state);
    return {
      health,
      status: { OPERATING: by('OPERATING'), PARTIAL: by('PARTIAL'), GAP: by('GAP'), NOT_IMPLEMENTED: by('NOT_IMPLEMENTED') },
      freshness: {
        Current: fr.filter((x) => x === 'Current').length,
        'Due soon': fr.filter((x) => x === 'Due soon').length,
        Overdue: fr.filter((x) => x === 'Overdue').length,
        'Never tested': fr.filter((x) => x === 'Never tested').length,
      },
      evidenced: rows.filter((c) => c.evidence.length > 0).length,
      total: rows.length,
    };
  }

  async setStatus(id: string, status: ControlStatus) {
    await this.exists(id);
    return this.prisma.control.update({ where: { id }, data: { status } });
  }

  async addTest(id: string, testedBy: string, result: ControlStatus) {
    await this.exists(id);
    const now = new Date();
    await this.prisma.controlTest.create({ data: { controlId: id, testedBy, result } });
    return this.prisma.control.update({ where: { id }, data: { status: result, lastTested: now } });
  }

  async addEvidence(id: string, name: string, type: string, addedBy: string, uri?: string) {
    await this.exists(id);
    await this.prisma.evidence.create({ data: { controlId: id, name, type, uri, addedBy } });
    return this.prisma.control.update({ where: { id }, data: { lastTested: new Date() } });
  }

  private async exists(id: string) {
    const c = await this.prisma.control.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Control ${id} not found`);
  }
}
