import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class RegChangeService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.regChange.findMany({ include: { task: true } });
    // attach live status of each impacted control
    const ctls = await this.prisma.control.findMany({ select: { id: true, status: true, requirement: true } });
    const cmap = Object.fromEntries(ctls.map((c) => [c.id, c]));
    return rows
      .map((r) => ({
        ...r,
        controlStatuses: r.controls.map((id) => ({ id, status: cmap[id]?.status ?? 'UNKNOWN', requirement: cmap[id]?.requirement ?? id })),
        overdue: r.task ? r.task.status !== 'DONE' && r.task.dueAt.getTime() < Date.now() : false,
      }))
      .sort((a, b) => (a.task?.dueAt.getTime() ?? 0) - (b.task?.dueAt.getTime() ?? 0));
  }

  async summary() {
    const rows = await this.prisma.regChange.findMany({ include: { task: true } });
    const open = rows.filter((r) => r.task && r.task.status !== 'DONE');
    const overdue = open.filter((r) => r.task!.dueAt.getTime() < Date.now());
    const ctlSet = new Set(rows.flatMap((r) => r.controls));
    return { changes: rows.length, high: rows.filter((r) => r.impact === 'high').length, open: open.length, overdue: overdue.length, controlsImpacted: ctlSet.size };
  }

  /** Which controls are under the most regulatory pressure (+ live status). */
  async controlImpactMap() {
    const rows = await this.prisma.regChange.findMany();
    const map: Record<string, string[]> = {};
    rows.forEach((r) => r.controls.forEach((id) => (map[id] = map[id] || []).push(r.id)));
    const ctls = await this.prisma.control.findMany({ select: { id: true, status: true, domain: true, requirement: true } });
    const cmap = Object.fromEntries(ctls.map((c) => [c.id, c]));
    return Object.entries(map)
      .map(([id, changes]) => ({ id, n: changes.length, changes, status: cmap[id]?.status ?? 'UNKNOWN', requirement: cmap[id]?.requirement ?? id }))
      .sort((a, b) => b.n - a.n);
  }

  async setTask(regChangeId: string, status: TaskStatus) {
    const t = await this.prisma.impactTask.findUnique({ where: { regChangeId } });
    if (!t) throw new NotFoundException(`No task for ${regChangeId}`);
    return this.prisma.impactTask.update({ where: { regChangeId }, data: { status } });
  }
}
