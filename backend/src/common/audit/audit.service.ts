import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/** Append-only, tamper-evident audit log with a prevHash -> hash chain. */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async append(entry: {
    actor: string; role: string; action: string; entity: string; entityId: string; payload: any;
  }) {
    const prev = await this.prisma.auditLog.findFirst({ orderBy: { id: 'desc' } });
    const prevHash = prev?.hash ?? null;
    const body = JSON.stringify({
      at: new Date().toISOString(), actor: entry.actor, role: entry.role,
      action: entry.action, entity: entry.entity, entityId: entry.entityId, payload: entry.payload,
    });
    const hash = createHash('sha256').update((prevHash ?? '') + body).digest('hex');
    return this.prisma.auditLog.create({
      data: { ...entry, role: entry.role as any, prevHash, hash },
    });
  }

  /** Re-walk the chain to prove nothing was altered. */
  async verify(): Promise<{ ok: boolean; brokenAt?: bigint }> {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { id: 'asc' } });
    let prevHash: string | null = null;
    for (const r of rows) {
      const body = JSON.stringify({
        at: r.at.toISOString(), actor: r.actor, role: r.role, action: r.action,
        entity: r.entity, entityId: r.entityId, payload: r.payload,
      });
      const expect = createHash('sha256').update((prevHash ?? '') + body).digest('hex');
      if (expect !== r.hash) return { ok: false, brokenAt: r.id };
      prevHash = r.hash;
    }
    return { ok: true };
  }
}
