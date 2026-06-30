import { ReactNode } from "react";
import { AGENTS, type AgentId } from "../../config/agents";
import AgentAvatar from "./AgentAvatar";

/** Inline tag with agent character + label — replaces plain AiTag where agent is named. */
export default function AgentAiTag({ agent, children }: { agent: AgentId; children: ReactNode }) {
  const p = AGENTS[agent];
  return (
    <span
      className="inline-flex items-center gap-2 font-semibold rounded-full pl-1 pr-2.5 py-1 text-[10px]"
      style={{ color: "#e8e0ff", background: `${p.color}22`, border: `1px solid ${p.color}40` }}
    >
      <AgentAvatar agent={agent} size="xs" />
      <span>{children}</span>
    </span>
  );
}
