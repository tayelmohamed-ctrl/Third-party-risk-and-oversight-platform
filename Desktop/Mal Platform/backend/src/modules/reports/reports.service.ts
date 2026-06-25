import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ControlsService } from '../controls/controls.service';
import { CasesService } from '../cases/cases.service';
import { RegChangeService } from '../reg-change/reg-change.service';

const RISK_W: Record<string, number> = { Critical: 3, High: 2, Medium: 1.5, Low: 1 };

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private controls: ControlsService,
    private cases: CasesService,
    private reg: RegChangeService,
  ) {}

  /** Read-only data-room snapshot for an examiner/auditor. */
  async examinerRoom(period: string) {
    const dash = await this.controls.dashboard();
    const queue = await this.cases.queue();
    const sars = await this.cases.sars();
    const regSum = await this.reg.summary();
    const ev = await this.prisma.evidence.count();
    return {
      period,
      scope: 'Read-only. Production: time-boxed credentials, watermarked exports, access logged.',
      programme: {
        entity: 'Mal Money Inc. (FinCEN MSB)', mlro: 'Tayel Mohamed',
        co: 'Jason Mullen', director: 'Abdallah Abu Sheikh', corridor: 'US → Pakistan (SwiftX)',
      },
      controls: dash,
      evidenceItems: ev,
      cases: queue,
      sarsFiled: sars.length,
      regChange: regSum,
    };
  }

  /** One-click quarterly Board pack assembled from live data (Doc 2.1 MI spec). */
  async boardPack(period: string) {
    const controls = await this.prisma.control.findMany({ include: { evidence: true } });
    const dash = await this.controls.dashboard();
    const queue = await this.cases.queue();
    const sars = await this.cases.sars();
    const regSum = await this.reg.summary();
    const wavg = (arr: typeof controls) => {
      const tw = arr.reduce((s, c) => s + (RISK_W[c.risk] || 1), 0) || 1;
      const sc = (st: string) => (st === 'OPERATING' ? 100 : st === 'PARTIAL' ? 50 : 0);
      return Math.round(arr.reduce((s, c) => s + sc(c.status) * (RISK_W[c.risk] || 1), 0) / tw);
    };
    const dom = (d: string) => wavg(controls.filter((c) => c.domain === d));
    const topGaps = controls
      .filter((c) => c.status === 'GAP' || c.status === 'NOT_IMPLEMENTED')
      .sort((a, b) => (RISK_W[b.risk] || 1) - (RISK_W[a.risk] || 1))
      .slice(0, 6)
      .map((c) => ({ id: c.id, requirement: c.requirement, status: c.status, risk: c.risk }));
    return {
      period,
      preparedBy: 'CO (Jason Mullen) / MLRO (Tayel Mohamed)',
      executiveSummary: {
        controlHealth: dash.health, operating: dash.status.OPERATING, total: dash.total,
        openGaps: dash.status.GAP + dash.status.NOT_IMPLEMENTED, overdueTests: dash.freshness.Overdue,
        sarsFiled: sars.length, openCases: queue.open, p1: queue.p1, awaitingQA: queue.pendingQA,
        regTasksOpen: regSum.open, regTasksOverdue: regSum.overdue,
      },
      controlHealthAndTesting: dash,
      sanctionsTrainingAudit: { sanctions: dom('SANC'), training: dom('TRN'), independentTesting: dom('AUD') },
      regulatoryChange: regSum,
      keyRisksAndRemediation: topGaps,
    };
  }
}
