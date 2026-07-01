import { Link } from "react-router-dom";
import DriveLink from "./DriveLink";
import {
  CRAM_CATALOGUE,
  lineageBreadcrumb,
  lineageForRegulation,
  STATUS_STYLE,
  type ControlEntry,
  type EvidenceEntry,
  type WorkflowEntry,
} from "../../config/cramDriveCatalogue";

const EFFECT_COLOR: Record<string, string> = {
  strong: "#2FD8A6",
  partial: "#F6A623",
  weak: "#FF5C77",
};

const STAGES = [
  {
    key: "regulation",
    title: "Regulation",
    subtitle: "What is required?",
    icon: RegulationIcon,
    accent: "#39B9ED",
    connector: null as string | null,
  },
  {
    key: "control",
    title: "Control",
    subtitle: "How do we mitigate?",
    icon: ControlIcon,
    accent: "#F6A623",
    connector: "Obligation mapping",
  },
  {
    key: "workflow",
    title: "Workflow / Module",
    subtitle: "How is it executed?",
    icon: WorkflowIcon,
    accent: "#A953DF",
    connector: "Implementation layer",
  },
  {
    key: "evidence",
    title: "Evidence",
    subtitle: "How is it proven?",
    icon: EvidenceIcon,
    accent: "#2FD8A6",
    connector: "Assurance layer",
  },
] as const;

export default function RegulatoryLineageFlow({
  selReg,
  onSelectReg,
}: {
  selReg: string;
  onSelectReg: (id: string) => void;
}) {
  const chain = lineageForRegulation(selReg);

  return (
    <section className="lineage-flow mb-4">
      <div className="lineage-flow__header">
        <h3 className="m-0 text-sm font-display text-ink">
          Regulatory lineage — Regulation → Control → Workflow → Evidence
        </h3>
        <span className="lineage-flow__crumb">{lineageBreadcrumb(selReg)}</span>
      </div>

      <div className="lineage-flow__canvas">
        {STAGES.map((stage, idx) => (
          <div key={stage.key} className="lineage-flow__segment">
            {stage.connector && (
              <div className="lineage-flow__connector" aria-hidden>
                <span className="lineage-flow__connector-label">{stage.connector}</span>
                <svg viewBox="0 0 40 24" className="lineage-flow__arrow">
                  <path d="M0 12 H28 M22 6 L28 12 L22 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <div
              className={`lineage-flow__stage ${stage.key === "regulation" ? "lineage-flow__stage--active" : ""}`}
              style={{ "--stage-accent": stage.accent } as React.CSSProperties}
            >
              <div className="lineage-flow__stage-head">
                <div className="lineage-flow__stage-title">{stage.title}</div>
                <div className="lineage-flow__stage-sub">{stage.subtitle}</div>
                <div className="lineage-flow__stage-icon">
                  <stage.icon color={stage.accent} />
                </div>
              </div>

              <div className="lineage-flow__stage-body">
                {stage.key === "regulation" &&
                  CRAM_CATALOGUE.regulations.map((r) => (
                    <LineageNode
                      key={r.id}
                      active={selReg === r.id}
                      onClick={() => onSelectReg(r.id)}
                      title={r.name}
                      subtitle={r.ref}
                      badge={r.status}
                      footer={<DriveLink folderKey={r.driveFolder} docPath={r.driveDoc} compact label="Drive" />}
                    />
                  ))}

                {stage.key === "control" &&
                  (chain?.controls.length ? (
                    chain.controls.map((c) => <ControlNode key={c.id} control={c} />)
                  ) : (
                    <EmptyCol hint="Select a regulation" />
                  ))}

                {stage.key === "workflow" &&
                  (chain?.workflows.length ? (
                    chain.workflows.map((w) => <WorkflowNode key={w.id} workflow={w} />)
                  ) : (
                    <EmptyCol hint="No workflows mapped" />
                  ))}

                {stage.key === "evidence" &&
                  (chain?.evidence.length ? (
                    chain.evidence.map((e) => <EvidenceNode key={e.id} evidence={e} />)
                  ) : (
                    <EmptyCol hint="No evidence linked yet" />
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="lineage-flow__footer">
        Every obligation traces from legal basis to operational proof — regulators expect the full chain, not isolated controls.
      </p>
    </section>
  );
}

function ControlNode({ control: c }: { control: ControlEntry }) {
  return (
    <LineageNode
      dotColor={EFFECT_COLOR[c.effectiveness]}
      title={`${c.id} · ${c.name}`}
      subtitle={c.tests}
      badge={c.status}
      footer={
        <div className="flex flex-wrap gap-2">
          <DriveLink folderKey={c.driveFolder} docPath={c.driveDoc} compact label="Drive" />
          <Link to={c.moduleRoute} className="text-[10px] text-ai hover:underline">Module →</Link>
        </div>
      }
    />
  );
}

function WorkflowNode({ workflow: w }: { workflow: WorkflowEntry }) {
  return (
    <LineageNode
      title={w.module}
      subtitle={w.name}
      badge={w.status}
      footer={
        <div className="flex flex-wrap gap-2">
          <DriveLink folderKey={w.driveFolder} docPath={w.driveDoc} compact label="SOP" />
          <Link to={w.route} className="text-[10px] text-ai hover:underline">Open →</Link>
        </div>
      }
    />
  );
}

function EvidenceNode({ evidence: e }: { evidence: EvidenceEntry }) {
  return (
    <LineageNode
      title={e.name}
      subtitle={`${e.type} · ${e.freshness}`}
      badge={e.status}
      footer={<DriveLink folderKey={e.driveFolder} docPath={e.driveDoc} compact label="Evidence" />}
    />
  );
}

function LineageNode({
  active, onClick, title, subtitle, badge, footer, dotColor,
}: {
  active?: boolean;
  onClick?: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  footer?: React.ReactNode;
  dotColor?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`lineage-flow__node ${onClick ? "lineage-flow__node--clickable" : ""} ${active ? "lineage-flow__node--active" : ""}`}
    >
      {dotColor && <span className="lineage-flow__node-dot" style={{ background: dotColor }} />}
      {badge && (
        <span className={`pill text-[9px] mb-1 inline-block ${STATUS_STYLE[badge] ?? "bg-panel2 text-muted"}`}>{badge}</span>
      )}
      <div className="font-semibold pr-4 text-[12px]">{title}</div>
      {subtitle && <div className="text-muted text-[10.5px] mt-0.5">{subtitle}</div>}
      {footer && <div className="mt-1.5">{footer}</div>}
    </div>
  );
}

function EmptyCol({ hint }: { hint: string }) {
  return <div className="lineage-flow__empty">{hint}</div>;
}

function RegulationIcon({ color }: { color: string }) {
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden>
      <rect x="8" y="4" width="40" height="36" rx="3" stroke={color} strokeWidth="2" fill={`${color}18`} />
      <line x1="14" y1="14" x2="42" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="22" x2="36" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="14" y1="30" x2="30" y2="30" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function ControlIcon({ color }: { color: string }) {
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden>
      <path d="M28 6 L46 16 V28 C46 34 28 40 28 40 C28 40 10 34 10 28 V16 Z" stroke={color} strokeWidth="2" fill={`${color}18`} />
      <path d="M22 22 L26 26 L34 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WorkflowIcon({ color }: { color: string }) {
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden>
      <circle cx="14" cy="22" r="6" stroke={color} strokeWidth="2" fill={`${color}18`} />
      <circle cx="28" cy="22" r="6" stroke={color} strokeWidth="2" fill={`${color}18`} />
      <circle cx="42" cy="22" r="6" stroke={color} strokeWidth="2" fill={`${color}18`} />
      <path d="M20 22 H22 M34 22 H36" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function EvidenceIcon({ color }: { color: string }) {
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden>
      <circle cx="28" cy="22" r="14" stroke={color} strokeWidth="2" fill={`${color}18`} />
      <circle cx="28" cy="22" r="6" stroke={color} strokeWidth="2" />
      <line x1="28" y1="22" x2="28" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="22" x2="36" y2="26" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
