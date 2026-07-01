import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CaseStatus, Disposition, Severity } from '@prisma/client';
import { AuthUser } from '../../common/auth/current-user.decorator';

const HR = 3_600_000, DAY = 86_400_000;
const RESP_SLA: Record<Severity, number> = { P1: 4, P2: 24, P3: 48 };
const OPEN: CaseStatus[] = ['OPEN', 'INVESTIGATING', 'PENDING_QA', 'ESCALATED'];

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  private clocks(c: any) {
    const respDue = c.openedAt.getTime() + (RESP_SLA[c.severity] || 24) * HR;
    const respLeftH = Math.round((respDue - Date.now()) / HR);
    const sar = c.sarClockStart && !c.sar
      ? { daysLeft: Math.round((c.sarClockStart.getTime() + 30 * DAY - Date.now()) / DAY) }
      : null;
    return {
      response: OPEN.includes(c.status) && c.status !== 'PENDING_QA'
        ? { hoursLeft: respLeftH, overdue: respLeftH < 0 } : null,
      sar,
    };
  }

  async list() {
    const rows = await this.prisma.case.findMany({ orderBy: { openedAt: 'desc' }, include: { sar: true } });
    return rows.map((c) => ({ ...c, clocks: this.clocks(c) }));
  }

  async get(id: string) {
    const c = await this.prisma.case.findUnique({ where: { id }, include: { dpl: { orderBy: { at: 'asc' } }, sar: true } });
    if (!c) throw new NotFoundException(`Case ${id} not found`);
    return { ...c, clocks: this.clocks(c) };
  }

  async queue() {
    const cases = await this.prisma.case.findMany({ include: { sar: true } });
    const open = cases.filter((c) => OPEN.includes(c.status));
    return {
      open: open.length,
      p1: open.filter((c) => c.severity === 'P1').length,
      pendingQA: cases.filter((c) => c.status === 'PENDING_QA').length,
      sarClocksRunning: cases.filter((c) => c.sarClockStart && !c.sar).length,
      slaBreaches: open.filter((c) => { const k = this.clocks(c).response; return k && k.overdue; }).length,
    };
  }

  async create(b: any, u: AuthUser) {
    const last = await this.prisma.case.findFirst({ orderBy: { id: 'desc' } });
    const seq = last ? parseInt(last.id.slice(-4)) + 1 : 1;
    const id = `CASE-2026-${String(seq).padStart(4, '0')}`;
    const c = await this.prisma.case.create({
      data: {
        id, title: b.title, severity: b.severity as Severity, source: b.source,
        customerRef: b.customerRef, corridor: b.corridor, amount: b.amount ?? 0,
        typologyId: b.typologyId ?? null, controls: b.controls ?? [], status: 'OPEN',
        dpl: { create: { who: 'System', action: 'Case opened', note: b.note ?? `Opened from ${b.source}.` } },
      },
    });
    return c;
  }

  async addDpl(id: string, action: string, note: string, u: AuthUser) {
    const c = await this.get(id);
    await this.prisma.dplEntry.create({ data: { caseId: id, who: u.name, action, note } });
    if (c.status === 'OPEN') await this.prisma.case.update({ where: { id }, data: { status: 'INVESTIGATING' } });
    return this.get(id);
  }

  async propose(id: string, disposition: Disposition, rationale: string, u: AuthUser) {
    const c = await this.get(id);
    if (!rationale?.trim()) throw new BadRequestException('Rationale required');
    await this.prisma.dplEntry.create({ data: { caseId: id, who: u.name, action: 'Disposition proposed', note: `${disposition} — ${rationale}` } });
    return this.prisma.case.update({
      where: { id },
      data: {
        status: 'PENDING_QA', disposition, rationale,
        sarClockStart: disposition === 'SAR' && !c.sarClockStart ? new Date() : c.sarClockStart,
      },
    });
  }

  /** FOUR-EYES / MAKER-CHECKER — enforced here, not in the UI. */
  async approve(id: string, reviewer: AuthUser) {
    const c = await this.get(id);
    if (c.status !== 'PENDING_QA') throw new BadRequestException('No disposition awaiting review');
    if (c.assigneeId && c.assigneeId === reviewer.id)
      throw new ForbiddenException('Four-eyes: reviewer must differ from the investigator');
    if (!['CO', 'MLRO'].includes(reviewer.role))
      throw new ForbiddenException('Four-eyes approval requires CO or MLRO');
    const next: CaseStatus =
      c.disposition === 'SAR' ? 'PENDING_QA' : c.disposition === 'ESCALATE' ? 'ESCALATED' : 'CLOSED_NO_SAR';
    await this.prisma.dplEntry.create({ data: { caseId: id, who: reviewer.name, action: 'Four-eyes approved', note: `Disposition ${c.disposition} approved.` } });
    return this.prisma.case.update({ where: { id }, data: { status: next, reviewerId: reviewer.id, reviewerName: reviewer.name, approvedAt: new Date() } });
  }

  async fileSar(id: string, narrative: string, u: AuthUser) {
    const c = await this.get(id);
    if (c.disposition !== 'SAR') throw new BadRequestException('Case disposition is not SAR');
    if (!c.reviewerId) throw new ForbiddenException('SAR locked until four-eyes approval');
    if (c.sar) throw new BadRequestException('SAR already filed');
    const count = await this.prisma.sar.count();
    const sid = `SAR-2026-${String(7 + count).padStart(4, '0')}`;
    await this.prisma.sar.create({ data: { id: sid, caseId: id, subject: c.customerRef, typology: c.typologyId ?? '-', narrative: narrative || c.narrative || '', amount: c.amount } });
    await this.prisma.dplEntry.create({ data: { caseId: id, who: u.name, action: 'SAR filed', note: `Filed via BSA E-Filing (${sid}).` } });
    return this.prisma.case.update({ where: { id }, data: { status: 'SAR_FILED', narrative } });
  }

  async sars() { return this.prisma.sar.findMany({ orderBy: { filedAt: 'desc' } }); }
}
