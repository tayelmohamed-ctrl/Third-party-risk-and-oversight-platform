import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

/** Writes one audit row for every mutating request after it succeeds. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const mutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
    return next.handle().pipe(
      tap(async () => {
        if (!mutating) return;
        const user = req.user ?? { id: 'unknown', role: 'SUPERVISOR' };
        await this.audit.append({
          actor: user.id, role: user.role,
          action: `${req.method} ${req.route?.path ?? req.url}`,
          entity: (req.baseUrl || req.path).split('/')[1] || 'unknown',
          entityId: req.params?.id ?? '-',
          payload: req.body ?? {},
        }).catch(() => undefined);
      }),
    );
  }
}
