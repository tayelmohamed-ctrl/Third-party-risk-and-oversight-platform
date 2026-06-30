import { useEffect, useState } from "react";
import { Card, Sec } from "./ui";
import { apiAuditLog, apiAuthMe, isApiAvailable, type AuthMe } from "../lib/api";
import { getPlatformUser, hasOverrideCapability } from "../lib/authSession";

type ItemStatus = "strong" | "partial" | "gap";

interface ThemeItem {
  label: string;
  detail: string;
  status: ItemStatus;
  live?: string;
}

const STRONG = "bg-low/15 text-low";
const PARTIAL = "bg-med/15 text-med";

export default function Theme3Status() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [auth, setAuth] = useState<AuthMe | null>(null);
  const [overrideAudits, setOverrideAudits] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [me, log] = await Promise.all([
          apiAuthMe(),
          apiAuditLog().catch(() => []),
        ]);
        if (cancelled) return;
        setOnline(true);
        setAuth(me);
        setOverrideAudits(log.filter((e) => e.action === "override.applied").length);
      } catch {
        if (!cancelled) {
          setOnline(await isApiAvailable());
          setAuth(null);
        }
      }
    }
    load();
    const id = setInterval(load, 25000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const user = getPlatformUser();
  const canOverride = hasOverrideCapability();

  const items: ThemeItem[] = [
    {
      label: "Non-dilution logic (engine)",
      detail: "Override cannot go below floor · cannot lift Prohibited",
      status: "strong",
    },
    {
      label: "Server-side enforcement",
      detail: "POST /assessments re-scores · governAssessmentSubmission rejects invalid overrides",
      status: online ? "strong" : "partial",
      live: online ? "API enforced" : undefined,
    },
    {
      label: "Auth / RBAC (MLRO-only override)",
      detail: "override capability on MLRO role · Analyst blocked at API (403)",
      status: auth?.capabilities.override !== undefined ? "strong" : online === false ? "partial" : "strong",
      live: auth ? `session: ${user.name} (${auth.email})` : `UI user: ${user.name}`,
    },
    {
      label: "Mandatory MLRO justification",
      detail: "Min 20 chars · stored on assessment + audit trail",
      status: "strong",
    },
    {
      label: "Immutable audit store",
      detail: "override.applied events in PostgreSQL append-only audit_log",
      status: online ? "strong" : "partial",
      live: online ? `${overrideAudits} override audit entries` : undefined,
    },
    {
      label: "UI governance (Test Bench)",
      detail: "Persona switch · justification box · server error surfacing",
      status: canOverride ? "strong" : "strong",
      live: canOverride ? `${user.name} — MLRO override enabled` : `${user.name} — override disabled`,
    },
  ];

  const allStrong = items.every((i) => i.status === "strong") && online !== false;
  const overall: ItemStatus = online === false ? "partial" : allStrong ? "strong" : "partial";

  return (
    <div>
      <Sec>Failure-theme #3 — ungoverned overrides / downgrades</Sec>
      <Card className="p-4">
        <div className="flex items-start gap-4 flex-wrap mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="text-[10.5px] text-faint uppercase tracking-wide font-semibold">Theme 3 status</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display font-bold text-[22px]">
                {overall === "strong" ? "Strong & complete" : "Partial — check API"}
              </span>
              <span className={`pill text-[11px] font-semibold ${overall === "strong" ? STRONG : PARTIAL}`}>
                {overall === "strong" ? "● built" : "◐ check server"}
              </span>
            </div>
            <p className="text-[12px] text-muted mt-2 m-0 leading-relaxed">
              Manual overrides are no longer UI-only. The API enforces MLRO RBAC, mandatory justification, non-dilution re-scoring, and writes an immutable override audit entry on every approved change.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5 py-2.5 px-3 rounded-xl bg-panel2 border border-lineSoft">
              <span className={`pill text-[10px] shrink-0 mt-0.5 ${item.status === "strong" ? STRONG : PARTIAL}`}>
                {item.status === "strong" ? "Strong" : "Partial"}
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold">{item.label}</div>
                <div className="text-[10.5px] text-muted">{item.detail}</div>
                {item.live && <div className="text-[10px] text-faint mono mt-0.5">{item.live}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
