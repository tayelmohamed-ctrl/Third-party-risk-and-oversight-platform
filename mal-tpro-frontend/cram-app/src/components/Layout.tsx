import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, Network, Scale, ScrollText, Crosshair, Flag, FileText, Settings, RefreshCw, ShieldCheck, ClipboardList, GraduationCap, ClipboardCheck, Package, Archive } from "lucide-react";
import MalLogo from "./MalLogo";
import AgentChip from "./agents/AgentChip";
import AgentAvatar from "./agents/AgentAvatar";
import UserAccessSwitcher from "./UserAccessSwitcher";
import PlatformChrome from "./PlatformChrome";
import { agentForRoute } from "../config/agents";
import { apiValidationGovernance } from "../lib/api";

const NAV = [
  { section: "Oversight", items: [
    { to: "/", label: "Executive Dashboard", icon: LayoutDashboard, end: true },
    { to: "/cram", label: "CRAM Workspace", icon: Network, agent: "sayed" as const },
    { to: "/regulatory", label: "Regulatory Management", icon: ScrollText, agent: "sayed" as const },
  ]},
  { section: "Operate", items: [
    { to: "/test-bench", label: "CRAM Risk Test Bench", icon: Scale, agent: "sayed" as const },
    { to: "/kyb-checklist", label: "KYB Document Checklists", icon: ClipboardCheck, agent: "sayed" as const },
    { to: "/rerating", label: "Re-rating & Reviews", icon: RefreshCw, agent: "mohsen" as const },
    { to: "/feeds", label: "Signal Feeds", icon: Crosshair, agent: "sayed" as const },
    { to: "/screening", label: "Screening & Monitoring", icon: ShieldCheck, agent: "sayed" as const },
    { to: "/transaction-monitoring", label: "Transaction Monitoring", icon: Crosshair, agent: "mohsen" as const },
    { to: "/investigation", label: "Investigation Hub", icon: Flag, agent: "mohsen" as const },
    { to: "/reporting", label: "Reporting Centre", icon: FileText, agent: "jana" as const },
    { to: "/exam-pack", label: "Examination Pack", icon: Package, agent: "jana" as const },
  ]},
  { section: "Control", items: [
    { to: "/activity-register", label: "Activity Register", icon: ScrollText, agent: "sayed" as const },
    { to: "/validation", label: "Model Validation", icon: Scale, agent: "sayed" as const },
    { to: "/audit", label: "Audit Log", icon: ClipboardList },
    { to: "/retention", label: "Records & Retention", icon: Archive },
    { to: "/training", label: "AML Training", icon: GraduationCap },
    { to: "/examination", label: "FFIEC Examination", icon: ClipboardCheck },
    { to: "/governance", label: "Governance & Admin", icon: Settings },
  ]},
];

const TITLES: Record<string, [string, string]> = {
  "/": ["Executive Dashboard", "What needs the MLRO this morning"],
  "/cram": ["CRAM Workspace", "The brain — kept current by Sayed"],
  "/regulatory": ["Regulatory Management", "Sayed · browse · track · impact · remediation"],
  "/test-bench": ["CRAM Risk Test Bench", "Individual & entity · golden thread · TM deploy"],
  "/rerating": ["Re-rating & Reviews", "Theme #1 strong — dynamic re-rating + scheduler + feeds"],
  "/feeds": ["Signal Feeds", "Real-time trigger pipeline — feeds auto-drive re-rating"],
  "/screening": ["Screening & Monitoring", "Vital4 disposition queue · SLA tracking"],
  "/investigation": ["Investigation Hub", "Mohsen prepares · MLRO decides"],
  "/transaction-monitoring": ["Transaction Monitoring & Screening", "Oscilar rules · transfers & cards · investigator guide"],
  "/reporting": ["Reporting Centre", "Jana drafts · UAE goAML · US FinCEN SAR & CTR Form 104 · MLRO approves & files"],
  "/exam-pack": ["CBUAE Examination Pack", "25-customer sample · CRAM evidence · &lt; 2h target"],
  "/governance": ["Governance & Admin", "RBAC · config · model versions · audit"],
  "/audit": ["Audit Log", "Append-only trail · overrides · cases · TM · screening"],
  "/retention": ["Records & Retention", "5-year policy · legal hold · governed export · scheduler"],
  "/training": ["AML Training Register", "Staff completion · examiner evidence · CBUAE & FFIEC"],
  "/examination": ["FFIEC Examination Matrix", "Procedure readiness · live evidence · audit pack prep"],
  "/validation": ["Model Validation", "Independent validation · back-test · outcome analysis"],
  "/activity-register": ["Activity Register", "Account type · searchable activity · corridor-aware ISIC risk score"],
};

export default function Layout() {
  const loc = useLocation();
  const [title, sub] = TITLES[loc.pathname] || ["Mal FinCrime OS", ""];
  const pageAgent = agentForRoute(loc.pathname);
  const [modelStatus, setModelStatus] = useState<"draft" | "frozen">("draft");

  useEffect(() => {
    void apiValidationGovernance()
      .then((g) => setModelStatus(g.status))
      .catch(() => setModelStatus("draft"));
  }, [loc.pathname]);

  return (
    <div className="grid grid-cols-[236px_1fr] min-h-screen max-md:grid-cols-1">
      <aside className="bg-gradient-to-b from-[#06091c] to-[#0b0c2e] border-r border-line p-4 sticky top-0 h-screen flex flex-col overflow-y-auto max-md:hidden">
        <div className="flex items-center gap-2.5 px-2 pb-3.5">
          <MalLogo size={30} />
          <div className="font-display font-bold text-[15px] leading-tight">
            Mal FinCrime OS
            <small className="block font-body font-medium text-[9.5px] tracking-[0.16em] text-faint uppercase mt-0.5">CRAM Console</small>
          </div>
        </div>
        {NAV.map((grp) => (
          <div key={grp.section}>
            <div className="text-[9.5px] tracking-[0.14em] uppercase text-faint font-semibold px-2.5 pt-3 pb-1.5">{grp.section}</div>
            <nav className="flex flex-col gap-0.5" aria-label={`${grp.section} navigation`}>
              {grp.items.map((it) => {
                const Icon = it.icon;
                const agent = "agent" in it ? it.agent : undefined;
                return (
                  <NavLink key={it.to} to={it.to} end={(it as { end?: boolean }).end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ai ${
                        isActive ? "bg-ai/15 text-white shadow-[inset_2px_0_0_#A953DF]" : "text-muted hover:bg-panel2 hover:text-ink"
                      }`}>
                    {agent ? (
                      <AgentAvatar agent={agent} size="xs" />
                    ) : (
                      <Icon size={16} className="opacity-85 shrink-0" aria-hidden />
                    )}
                    <span className="truncate">{it.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
        <div className="mt-auto text-[10.5px] text-faint border-t border-line pt-3">
          <div className="mb-2 text-muted font-semibold">AI agents · powered by Claude</div>
          <div className="space-y-0.5">
            <AgentChip agent="sayed" link />
            <AgentChip agent="mohsen" link />
            <AgentChip agent="jana" link />
          </div>
          <div className="mt-3 pt-2 border-t border-lineSoft text-faint">
            Model <span className="text-muted font-semibold">CRAM-CBUAE-2026-05</span> · {modelStatus === "frozen" ? "Frozen" : "Draft freeze"}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-6 py-3 border-b border-line bg-panel/60 backdrop-blur sticky top-0 z-10 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {pageAgent && (
              <AgentAvatar agent={pageAgent} size="sm" active className="max-md:hidden" />
            )}
            <div className="min-w-0">
              <h2 className="m-0 text-[17px] font-display truncate">{title}</h2>
              <div className="text-muted text-[11.5px] mt-0.5 truncate">{sub}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <PlatformChrome variant="cram" />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-line bg-panel2 text-muted max-lg:hidden">
              <span className="w-1.5 h-1.5 rounded-full bg-low motion-safe:animate-pulse2" aria-hidden /> CRAM health <b className="text-low ml-0.5">92%</b>
            </span>
            <UserAccessSwitcher />
          </div>
        </header>
        <main className="p-6 pb-16 max-w-[1340px] w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
