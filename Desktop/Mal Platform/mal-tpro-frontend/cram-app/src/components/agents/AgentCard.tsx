import { useNavigate } from "react-router-dom";
import type { AgentProfile } from "../../config/agents";
import AgentAvatar from "./AgentAvatar";

export default function AgentCard({ agent }: { agent: AgentProfile }) {
  const nav = useNavigate();
  return (
    <button
      type="button"
      onClick={() => nav(agent.to)}
      className="relative overflow-hidden rounded-2xl p-4 border border-line bg-panel text-left w-full cursor-pointer transition hover:-translate-y-0.5 hover:border-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai group"
      aria-label={`Open ${agent.name} — ${agent.role}. ${agent.desc}`}
    >
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-40 motion-safe:group-hover:opacity-55 transition"
        style={{ background: agent.color }}
      />
      <div className="flex items-start gap-3 relative">
        <AgentAvatar agent={agent.id} size="lg" active />
        <div className="min-w-0 pt-1">
          <div className="font-display font-bold text-base">{agent.name}</div>
          <div className="text-[10.5px] text-muted uppercase tracking-[0.08em] font-semibold">{agent.role}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {agent.capabilities.slice(0, 3).map((c) => (
              <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-md bg-panel2 text-faint border border-lineSoft">{c}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-[12px] text-muted mt-3 leading-relaxed relative min-h-[54px]">{agent.desc}</p>
      <div className="flex items-center gap-2 mt-3 text-[11px] relative">
        <span className="w-[7px] h-[7px] rounded-full motion-safe:animate-pulse2 shrink-0" style={{ background: agent.color }} />
        <span className="text-muted truncate">{agent.stat}</span>
      </div>
    </button>
  );
}
