/**
 * Seed — ports the EXACT platform datasets (56 controls, 55 typologies,
 * 14 reg-changes) from the chat into Postgres, plus demo users and a few
 * worked cases so the API returns real data on first run.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DAY = 86_400_000;
const read = (f: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data', f), 'utf8'));

async function main() {
  const controlsData = read('controls.json');
  const typologies = read('typologies.json');
  const regChanges = read('regChanges.json');

  // --- Users (demo; replace with your IdP once auth is unstubbed) ---
  const users = [
    { id: 'u-sup', email: 'supervisor@mal.example', name: 'Supervisor', role: 'SUPERVISOR' as const },
    { id: 'u-co', email: 'jason.mullen@mal.example', name: 'Jason Mullen (CO)', role: 'CO' as const },
    { id: 'u-mlro', email: 'tayel.mohamed@mal.example', name: 'Tayel Mohamed (MLRO)', role: 'MLRO' as const },
    { id: 'u-analyst', email: 'analyst@mal.example', name: 'Analyst', role: 'ANALYST' as const },
  ];
  for (const u of users) await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });

  // --- Controls + evidence (status/lastTested deterministic, matches the UI demo) ---
  for (const c of controlsData.controls) {
    const lastTested =
      c.lastTestedMonthsAgo == null ? null : new Date(Date.now() - c.lastTestedMonthsAgo * 30 * DAY);
    await prisma.control.upsert({
      where: { id: c.id },
      update: {
        domain: c.domain, requirement: c.requirement, expected: c.expected, citation: c.citation,
        risk: c.risk, owner: c.owner, cadenceMo: c.cadenceMo, status: c.status, lastTested,
        bsaPillar: c.bsaPillar, fatf: c.fatf, wolfsberg: c.wolfsberg,
      },
      create: {
        id: c.id, domain: c.domain, requirement: c.requirement, expected: c.expected,
        citation: c.citation, risk: c.risk, owner: c.owner, cadenceMo: c.cadenceMo,
        status: c.status, lastTested, bsaPillar: c.bsaPillar, fatf: c.fatf, wolfsberg: c.wolfsberg,
      },
    });
    await prisma.evidence.deleteMany({ where: { controlId: c.id } });
    for (const e of c.evidence ?? []) {
      await prisma.evidence.create({
        data: { controlId: c.id, name: e.name, type: e.type, at: lastTested ?? new Date() },
      });
    }
  }

  // --- Typologies ---
  for (const t of typologies) {
    await prisma.typology.upsert({
      where: { id: t.id },
      update: t,
      create: t,
    });
  }

  // --- Reg-changes + auto-raised impact tasks ---
  for (const r of regChanges) {
    await prisma.regChange.upsert({
      where: { id: r.id },
      update: {
        source: r.source, type: r.type, jurisdiction: r.jurisdiction, date: r.date, impact: r.impact,
        title: r.title, summary: r.summary, action: r.action, owner: r.owner,
        controls: r.controls, typologies: r.typologies,
      },
      create: {
        id: r.id, source: r.source, type: r.type, jurisdiction: r.jurisdiction, date: r.date,
        impact: r.impact, title: r.title, summary: r.summary, action: r.action, owner: r.owner,
        controls: r.controls, typologies: r.typologies,
      },
    });
    const published = Date.now() - r.publishedDaysAgo * DAY;
    const dueAt = new Date(published + r.slaDays * DAY);
    const overdue = dueAt.getTime() < Date.now();
    await prisma.impactTask.upsert({
      where: { regChangeId: r.id },
      update: { dueAt, owner: r.owner },
      create: {
        regChangeId: r.id, owner: r.owner, dueAt,
        status: overdue ? 'OPEN' : 'IN_PROGRESS',
      },
    });
  }

  // --- A couple of worked demo cases (pseudonymous) ---
  const mkCase = async (data: any, dpl: any[]) => {
    await prisma.case.upsert({ where: { id: data.id }, update: data, create: data });
    await prisma.dplEntry.deleteMany({ where: { caseId: data.id } });
    for (const d of dpl) await prisma.dplEntry.create({ data: { ...d, caseId: data.id } });
  };
  await mkCase(
    { id: 'CASE-2026-0001', title: 'Hawala layering — many senders to one beneficiary', severity: 'P2',
      status: 'INVESTIGATING', source: 'Oscilar TM', customerRef: 'CUST-8842', corridor: 'US → Pakistan',
      amount: 9400, typologyId: '28', controls: ['TM-1', 'TPO-4', 'OM-3'], assigneeId: 'u-analyst' },
    [{ who: 'System', action: 'Case opened', note: 'Promoted from Oscilar alert (many-to-one + rapid cash-out).' }],
  );
  await mkCase(
    { id: 'CASE-2026-0002', title: 'Pig-butchering inbound — mule pass-through', severity: 'P2',
      status: 'PENDING_QA', source: 'Oscilar TM', customerRef: 'CUST-4471', corridor: 'US → Philippines',
      amount: 18250, typologyId: '35', controls: ['TM-1', 'DOB-3'], assigneeId: 'u-analyst',
      disposition: 'SAR', rationale: 'Funds from 9 unrelated payers forwarded within hours.',
      sarClockStart: new Date(Date.now() - 4 * DAY) },
    [{ who: 'System', action: 'Case opened', note: 'Rapid in-out, unrelated payers.' },
     { who: 'Analyst', action: 'Disposition proposed', note: 'SAR — investment-scam mule pass-through.' }],
  );

  const counts = {
    users: await prisma.user.count(), controls: await prisma.control.count(),
    evidence: await prisma.evidence.count(), typologies: await prisma.typology.count(),
    regChanges: await prisma.regChange.count(), tasks: await prisma.impactTask.count(),
    cases: await prisma.case.count(),
  };
  console.log('Seed complete:', counts);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
