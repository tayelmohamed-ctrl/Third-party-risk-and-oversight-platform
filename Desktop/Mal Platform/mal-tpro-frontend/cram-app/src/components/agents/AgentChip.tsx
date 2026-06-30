import { Link } from "react-router-dom";
import { AGENTS, type AgentId } from "../../config/agents";
import AgentAvatar from "./AgentAvatar";

interface AgentChipProps {
  agent: AgentId;
  /** Show one-line role under name */
  compact?: boolean;
  link?: boolean;
  active?: boolean;
}

export default function AgentChip({ agent, compact = false, link = false, active = false }: AgentChipProps) {
  const p = AGENTS[agent];
  const inner = (
    <>
      <AgentAvatar agent={agent} size="xs" active={active} />
      <span className="min-w-0">
        <span className="block font-semibold text-[11px] text-ink leading-tight">{p.name}</span>
        {!compact && (
          <span className="block text-[9.5px] text-faint leading-tight truncate">{p.tagline}</span>
        )}
      </span>
    </>
  );

  const cls = "flex items-center gap-2 py-1.5 px-1 rounded-lg transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ai";

  if (link) {
    return (
      <Link to={p.to} className={cls} aria-label={`Open ${p.name} workspace — ${p.role}`}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}
