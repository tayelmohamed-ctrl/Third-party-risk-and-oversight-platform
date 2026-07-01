import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ControlStatus } from '@prisma/client';

const FATF_RECS: Record<string, string> = {
  'R.1': 'Risk assessment & risk-based approach', 'R.6': 'TFS — terrorism/TF', 'R.7': 'TFS — proliferation',
  'R.10': 'Customer due diligence', 'R.11': 'Record-keeping', 'R.12': 'Politically exposed persons',
  'R.15': 'New technologies', 'R.16': 'Wire transfers (Travel Rule)', 'R.17': 'Reliance on third parties',
  'R.18': 'Internal controls', 'R.20': 'Reporting of suspicious transactions', 'R.21': 'Tipping-off & confidentiality',
  'R.26': 'Regulation & supervision', 'R.34': 'Guidance & feedback',
};
const score = (s: ControlStatus) => (s === 'OPERATING' ? 100 : s === 'PARTIAL' ? 50 : 0);

@Injectable()
export class CrosswalkService {
  constructor(private prisma: PrismaService) {}

  async coverage(framework: 'BSA' | 'FATF' | 'WOLFSBERG') {
    const controls = await this.prisma.control.findMany();
    const buckets: Record<string, typeof controls> = {};
    for (const c of controls) {
      const keys = framework === 'BSA' ? [c.bsaPillar] : framework === 'FATF' ? c.fatf : [c.wolfsberg];
      for (const k of keys) (buckets[k] = buckets[k] || []).push(c);
    }
    const rows = Object.entries(buckets).map(([k, cs]) => ({
      key: k,
      title: framework === 'FATF' ? `${k} · ${FATF_RECS[k] ?? ''}` : k,
      controls: cs.map((c) => ({ id: c.id, status: c.status })),
      count: cs.length,
      health: Math.round(cs.reduce((s, c) => s + score(c.status), 0) / cs.length),
      gaps: cs.filter((c) => c.status === 'GAP' || c.status === 'NOT_IMPLEMENTED').length,
    })).sort((a, b) => a.health - b.health);
    const overall = Math.round(controls.reduce((s, c) => s + score(c.status), 0) / controls.length);
    return { framework, requirements: rows.length, overall, rows };
  }
}
