import { useMemo, useState, type ReactNode } from "react";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import { Card } from "../components/ui";
import { ModuleCard, ModuleGrid } from "../components/modern/ModernUI";
import { Building2, Package, Globe } from "lucide-react";
import KybChecklistPanel from "../components/cram/KybChecklistPanel";
import { KYB_DEMO_CASES, type KybCaseContext } from "../lib/kybChecklistBuilder";
import { MAL_KYB_GUIDELINES } from "../config/kybDocumentMatrix";

const KYB_CASE_HINTS: Record<string, string> = {
  ACT00033: "Standard UAE business account — simple checklist.",
  ACT00021: "Same core KYB, plus financing + EDD for metals/DMCC.",
  "ACT-US-8812": "Same EDD depth, but driven by Zenus/global account + foreign branch structure.",
};

const KYB_CASE_CARDS: Record<string, { icon: ReactNode; iconBg: string; badge: string }> = {
  ACT00033:    { icon: <Building2 size={20} />, iconBg: "#39B9ED", badge: "UAE" },
  ACT00021:    { icon: <Package size={20} />,   iconBg: "#F6A623", badge: "DMCC" },
  "ACT-US-8812": { icon: <Globe size={20} />,   iconBg: "#A953DF", badge: "US" },
};

export default function KybChecklistCentre() {
  const [activeId, setActiveId] = useState(KYB_DEMO_CASES[0]?.customerId ?? "");
  const active = useMemo(
    () => KYB_DEMO_CASES.find((c) => c.customerId === activeId) ?? KYB_DEMO_CASES[0],
    [activeId],
  );

  return (
    <div>
      <AgentBanner agent="sayed" title="Sayed — KYB Document Checklists">
        Per-case KYB packs derived from live CRAM scoring, the SME document matrix (UAE IBAN · Global Accounts · Financing),
        and Mal CDD/EDD policies. Export a branded PDF for your team or auditors.
      </AgentBanner>

      <div className="grid grid-cols-4 gap-3 mt-4 mb-4 max-md:grid-cols-2">
        <Stat n={String(KYB_DEMO_CASES.length)} l="Example cases" />
        <Stat n="3" l="Product columns" />
        <Stat n="24" l="Entity-type rules" />
        <Stat n="PDF" l="Mal-branded export" c="text-ai" />
      </div>

      <Card className="p-3 mb-4">
        <AgentAiTag agent="sayed">Mal guideline alignment</AgentAiTag>
        <ul className="text-[11px] text-muted mt-2 mb-0 pl-4 space-y-1">
          {MAL_KYB_GUIDELINES.policyBasis.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <p className="text-[10px] text-faint mt-2 mb-0">{MAL_KYB_GUIDELINES.footerNotice}</p>
      </Card>

      <ModuleGrid cols={3}>
        {KYB_DEMO_CASES.map((c) => {
          const card = KYB_CASE_CARDS[c.customerId] ?? { icon: <Building2 size={20} />, iconBg: "#39B9ED", badge: "KYB" };
          return (
            <ModuleCard
              key={c.customerId}
              icon={card.icon}
              iconBg={card.iconBg}
              title={c.customerName}
              desc={KYB_CASE_HINTS[c.customerId] ?? ""}
              meta={c.customerId}
              badge={card.badge}
              badgeVariant="cyan"
              active={active?.customerId === c.customerId}
              onClick={() => setActiveId(c.customerId)}
            />
          );
        })}
      </ModuleGrid>

      {active && <KybChecklistPanel context={active} />}

      <Card className="p-4 mt-4">
        <h3 className="m-0 text-sm font-display">Live cases</h3>
        <p className="text-[12px] text-muted mt-2 mb-0">
          Open the{" "}
          <a href="/test-bench" className="text-ai hover:underline">CRAM Risk Test Bench</a>
          {" "}in Entity mode — after scoring, the KYB checklist appears in the sidebar with the same export controls,
          wired to the active customer profile.
        </p>
      </Card>
    </div>
  );
}

function Stat({ n, l, c }: { n: string; l: string; c?: string }) {
  return (
    <Card className="p-3">
      <div className={`font-display text-xl font-bold ${c ?? ""}`}>{n}</div>
      <div className="text-[11px] text-muted">{l}</div>
    </Card>
  );
}

function CaseTab({ label, hint, active, onClick }: { label: string; hint: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={hint}
      aria-describedby={hint ? `kyb-hint-${label.replace(/\s+/g, "-")}` : undefined}
      className={`group relative px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
        active ? "bg-ai/20 border-ai text-ai" : "border-line text-muted hover:bg-panel2"
      }`}
      onClick={onClick}
    >
      {label}
      {hint && (
        <span
          id={`kyb-hint-${label.replace(/\s+/g, "-")}`}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 bottom-[calc(100%+10px)] z-30 w-max max-w-[260px] -translate-x-1/2 rounded-xl border border-line bg-[#0c1233] px-3 py-2 text-[11px] font-normal leading-snug text-white shadow-[0_10px_30px_rgba(0,0,0,.35)] opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0"
        >
          {hint}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-[#0c1233]" aria-hidden />
        </span>
      )}
    </button>
  );
}
