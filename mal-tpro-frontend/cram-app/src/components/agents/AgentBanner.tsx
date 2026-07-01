import { ReactNode } from "react";
import { AGENTS, type AgentId } from "../../config/agents";
import AgentAvatar from "./AgentAvatar";

interface AgentBannerProps {
  agent: AgentId;
  title?: string;
  children: ReactNode;
}

/** Context strip — shows which agent prepared content on a page. */
export default function AgentBanner({ agent, title, children }: AgentBannerProps) {
  const p = AGENTS[agent];
  return (
    <div
      className="rounded-2xl p-4 mb-4 flex gap-4 items-start"
      style={{
        background: `linear-gradient(135deg, ${p.color}18, transparent)`,
        border: `1px solid ${p.color}45`,
      }}
    >
      <AgentAvatar agent={agent} size="md" active className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="font-display font-semibold text-sm flex items-center gap-2 flex-wrap">
          <span>{title ?? `${p.name} — ${p.role}`}</span>
          <span className="text-[10px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-panel2 text-faint border border-lineSoft">
            AI prepares · you decide
          </span>
        </div>
        <div className="text-[12.5px] text-muted mt-1.5 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
