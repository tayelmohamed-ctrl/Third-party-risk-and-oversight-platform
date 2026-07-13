import { useMemo, useState, useEffect } from "react";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import { Card } from "../components/ui";
import { Crown, ClipboardList, Bot, ShieldCheck, RotateCcw, Search, MessageSquare, Globe, Handshake, Gavel, Megaphone, Scale, ClipboardCheck, Lock, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  EXEC_PEOPLE, EXEC_TASKS, EXEC_AGENTS, LINE_LABELS, STATUS_META,
  tasksForOwner,
  type Line, type Phase, type TaskStatus, type Person,
} from "../config/executionPlan";

const STORAGE_KEY = "mal-exec-plan-status";
const STATUS_CYCLE: TaskStatus[] = ["not_started", "in_progress", "done", "blocked"];

const LINE_ACCENT: Record<Line, string> = {
  "1st": "#39B9ED", "2nd": "#A953DF", "3rd": "#FF5C77", Support: "#F6A623",
};

const PHASES: Phase[] = ["0", "1", "2", "3", "4", "Ongoing"];

const PRIORITY_PILL: Record<string, string> = {
  P0: "bg-hi/15 text-hi", P1: "bg-med/15 text-med", P2: "bg-ai/15 text-ai", Ongoing: "bg-panel2 text-muted",
};

// Coach view order: coach first, then 1st line, 2nd line, support, 3rd line.
const LINE_ORDER: Line[] = ["1st", "2nd", "Support", "3rd"];

export default function ExecutionDashboard() {
  const [status, setStatus] = useState<Record<string, TaskStatus>>({});
  const [phaseFilter, setPhaseFilter] = useState<Phase | "all">("all");
  const [pitchSel, setPitchSel] = useState<string | null>("tayel");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStatus(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function statusOf(id: string): TaskStatus {
    return status[id] ?? "not_started";
  }
  function cycle(id: string) {
    setStatus((prev) => {
      const cur = prev[id] ?? "not_started";
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
      const updated = { ...prev, [id]: next };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }
  function reset() {
    setStatus({});
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  const visibleTasks = useMemo(
    () => (phaseFilter === "all" ? EXEC_TASKS : EXEC_TASKS.filter((t) => t.phase === phaseFilter)),
    [phaseFilter],
  );

  const kpis = useMemo(() => {
    const total = EXEC_TASKS.length;
    const done = EXEC_TASKS.filter((t) => statusOf(t.id) === "done").length;
    const inProg = EXEC_TASKS.filter((t) => statusOf(t.id) === "in_progress").length;
    const blocked = EXEC_TASKS.filter((t) => statusOf(t.id) === "blocked").length;
    const p0open = EXEC_TASKS.filter((t) => t.priority === "P0" && statusOf(t.id) !== "done").length;
    return { total, done, inProg, blocked, p0open, pct: Math.round((done / total) * 100) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const coach = EXEC_PEOPLE.find((p) => p.id === "tayel")!;
  const others = EXEC_PEOPLE.filter((p) => p.id !== "tayel");

  return (
    <div>
      <StartingElevenPitch selected={pitchSel} onSelect={setPitchSel} statusOf={statusOf} cycle={cycle} />

      <AgentBanner agent="sayed" title="Execution Dashboard — FinCrime AI Operating Model (v2)">
        The coach's oversight of the whole roster. Every human owner has their tasks, the report you ask from them, and the
        AI agent their feedback fine-tunes. Click a task to cycle its status — your tracker is saved on this device.
      </AgentBanner>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mt-4 mb-4 max-md:grid-cols-2">
        <Kpi n={String(kpis.total)} l="Tasks (T01–T46)" />
        <Kpi n={`${kpis.pct}%`} l="Complete" c={kpis.pct === 100 ? "text-low" : "text-ai"} />
        <Kpi n={String(kpis.p0open)} l="P0 open" c={kpis.p0open ? "text-hi" : "text-low"} />
        <Kpi n={String(kpis.inProg)} l="In progress" c="text-ai" />
        <Kpi n={String(kpis.blocked)} l="Blocked" c={kpis.blocked ? "text-hi" : "text-muted"} />
      </div>

      {/* Overall progress */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full bg-panel2 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${kpis.pct}%`, background: kpis.pct === 100 ? "#2FD8A6" : "#39B9ED" }} />
          </div>
          <span className="mono text-[12px] text-muted shrink-0">{kpis.done}/{kpis.total}</span>
          <button type="button" className="btn btn-ghost text-[11px] px-2 py-1 flex items-center gap-1" onClick={reset}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <span className="text-[10px] text-faint uppercase tracking-wide mr-1">Phase</span>
          <FilterChip label="All" active={phaseFilter === "all"} onClick={() => setPhaseFilter("all")} />
          {PHASES.map((p) => (
            <FilterChip key={p} label={p === "Ongoing" ? "Ongoing" : `Phase ${p}`} active={phaseFilter === p} onClick={() => setPhaseFilter(p)} />
          ))}
        </div>
      </Card>

      {/* The Coach */}
      <Card className="p-4 mb-4" >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: "#A953DF22", border: "1px solid #A953DF", color: "#c9b6f5" }}>
            <Crown size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="m-0 text-sm font-display">{coach.name} — {coach.role}</h3>
              <span className="pill bg-ai/15 text-ai text-[10px]">Coach · oversight of all lines</span>
              <span className="pill bg-med/15 text-med text-[10px]">Interim 2LOD + QA · sunset required</span>
            </div>
            <p className="text-[11px] text-muted mt-1 mb-0">
              Schwerpunkt: <b className="text-ink">accountable ownership + independence</b>. Scale is only an advantage if a
              qualified human owns each disposition and an independent function can prove the system works.
            </p>
          </div>
        </div>
        <PersonTasks person={coach} tasks={tasksForOwner("tayel").filter((t) => phaseFilter === "all" || t.phase === phaseFilter)} statusOf={statusOf} cycle={cycle} />
        <ReportBox person={coach} />
      </Card>

      {/* Roster grouped by line */}
      {LINE_ORDER.map((line) => {
        const people = others.filter((p) => p.line === line);
        if (!people.length) return null;
        return (
          <div key={line} className="mb-2">
            <div className="flex items-center gap-2 mb-2 mt-3">
              <span className="w-2 h-2 rounded-full" style={{ background: LINE_ACCENT[line] }} />
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: LINE_ACCENT[line] }}>{LINE_LABELS[line]}</span>
              <div className="h-px flex-1 bg-[#1e2156]" />
            </div>
            <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
              {people.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  tasks={tasksForOwner(p.id).filter((t) => phaseFilter === "all" || t.phase === phaseFilter)}
                  accent={LINE_ACCENT[line]}
                  statusOf={statusOf}
                  cycle={cycle}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* AI agent fine-tuning loop */}
      <div className="flex items-center gap-2 mb-2 mt-5">
        <Bot size={15} className="text-ai" />
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-ai">AI agent fine-tuning loop</span>
        <div className="h-px flex-1 bg-[#1e2156]" />
      </div>
      <Card className="p-4 mb-2">
        <p className="text-[11px] text-muted mt-0 mb-3">
          Human feedback flows into each agent — but never straight from a junior label into the model. Every fine-tune is a
          model change and passes the same governance: <b className="text-ink">annotation → senior calibration → golden set → MRM gate → fine-tune → monitored</b>.
        </p>
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          {EXEC_AGENTS.map((a) => (
            <div key={a.id} className="p-3 rounded-lg bg-panel2 border border-lineSoft">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: `${a.color}22`, border: `1px solid ${a.color}`, color: a.color }}>
                  <Bot size={14} />
                </span>
                <span className="font-semibold text-[13px]">{a.name}</span>
                <span className="pill bg-panel2 text-muted text-[9px]">{a.focus}</span>
              </div>
              <div className="text-[11px] text-muted mt-2 space-y-1">
                <div><span className="text-faint">Human owner:</span> <b className="text-ink">{a.ownerLabel}</b></div>
                <div><span className="text-faint">Feedback signal:</span> {a.feedback}</div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-low shrink-0" />
                  <span><span className="text-faint">Gate:</span> {a.gate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 mt-2 text-[11px] text-muted">
        <b className="text-ink">Coach's note (read to the board):</b> the interim MLRO 2LOD+QA dual-hat is a deliberate,
        bounded over-rotation toward speed. It ends when the sunset trigger fires (EDD volume crosses the set threshold,
        Phase 4 begins, or an independent QA hire lands). Independent internal audit (3rd line) and model validation stay
        separate from the MLRO — those lines do not move. An unbounded version is the finding.
      </Card>
    </div>
  );
}

function PersonCard({ person, tasks, accent, statusOf, cycle }: {
  person: Person; tasks: typeof EXEC_TASKS; accent: string;
  statusOf: (id: string) => TaskStatus; cycle: (id: string) => void;
}) {
  const done = tasks.filter((t) => statusOf(t.id) === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <Card className="p-4" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-start gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="m-0 text-sm font-display">{person.name}</h3>
            {person.interim && <span className="pill bg-med/15 text-med text-[9px]">interim</span>}
            {person.independent && <span className="pill bg-hi/15 text-hi text-[9px]">independent</span>}
          </div>
          <div className="text-[11px] text-muted">{person.role}</div>
        </div>
        {person.ownsAgents.map((ag) => (
          <span key={ag} className="pill bg-ai/15 text-ai text-[9px] flex items-center gap-1"><Bot size={10} /> {agName(ag)}</span>
        ))}
      </div>

      {/* Responsibilities */}
      <div className="mt-2.5">
        <div className="text-[9px] font-semibold tracking-[0.12em] uppercase text-faint mb-1">Accountable for</div>
        <ul className="text-[11px] text-muted m-0 pl-4 space-y-0.5">
          {person.accountable.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </div>

      {/* Tasks tracker */}
      {tasks.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1.5">
            <ClipboardList size={12} className="text-faint" />
            <span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-faint">Tasks</span>
            <div className="flex-1 h-1.5 rounded-full bg-panel2 overflow-hidden ml-1">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "#2FD8A6" : accent }} />
            </div>
            <span className="mono text-[10px] text-muted">{done}/{tasks.length}</span>
          </div>
          <div className="space-y-1">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} status={statusOf(t.id)} onClick={() => cycle(t.id)} />
            ))}
          </div>
        </div>
      )}

      <ReportBox person={person} />
    </Card>
  );
}

function PersonTasks({ person, tasks, statusOf, cycle }: {
  person: Person; tasks: typeof EXEC_TASKS; statusOf: (id: string) => TaskStatus; cycle: (id: string) => void;
}) {
  const done = tasks.filter((t) => statusOf(t.id) === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  if (!tasks.length) return null;
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-1.5">
        <ClipboardList size={12} className="text-faint" />
        <span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-faint">Non-delegable tasks</span>
        <div className="flex-1 h-1.5 rounded-full bg-panel2 overflow-hidden ml-1">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "#2FD8A6" : "#A953DF" }} />
        </div>
        <span className="mono text-[10px] text-muted">{done}/{tasks.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 max-md:grid-cols-1">
        {tasks.map((t) => <TaskRow key={t.id} task={t} status={statusOf(t.id)} onClick={() => cycle(t.id)} />)}
      </div>
      <div className="text-[10px] text-faint italic mt-1">{person.note}</div>
    </div>
  );
}

function TaskRow({ task, status, onClick }: { task: (typeof EXEC_TASKS)[number]; status: TaskStatus; onClick: () => void }) {
  const meta = STATUS_META[status];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${task.acceptance} · ${task.tool} · ${task.control} · ${task.timeline}`}
      className="w-full text-left flex items-start gap-2 p-2 rounded-lg bg-panel2 border border-lineSoft hover:border-line transition"
    >
      <span className="mono text-[9px] text-faint shrink-0 mt-0.5">{task.id}</span>
      <span className={`pill text-[8px] shrink-0 ${PRIORITY_PILL[task.priority]}`}>{task.priority}</span>
      <span className={`text-[11px] flex-1 ${status === "done" ? "text-faint line-through" : "text-ink"}`}>{task.task}</span>
      <span className={`pill text-[8px] shrink-0 ${meta.pill}`}>{meta.label}</span>
    </button>
  );
}

function ReportBox({ person }: { person: Person }) {
  return (
    <div className="mt-3 rounded-lg border border-ai/25 bg-ai/5 p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <AgentAiTag agent="sayed">Report to coach</AgentAiTag>
        <span className="text-[10px] text-muted">{person.report.title} · <b className="text-ink">{person.report.cadence}</b></span>
      </div>
      <ul className="text-[11px] text-muted m-0 pl-4 space-y-0.5">
        {person.report.asks.map((a) => <li key={a}>{a}</li>)}
      </ul>
      {person.feeds.length > 0 && (
        <div className="mt-2 pt-2 border-t border-lineSoft text-[10px] text-muted flex items-start gap-1.5">
          <Bot size={11} className="text-ai shrink-0 mt-0.5" />
          <span>
            <span className="text-faint">Fine-tunes:</span>{" "}
            {person.feeds.map((f) => <span key={f.agentId}><b className="text-ink">{f.agentId === "all" ? "all agents" : agName(f.agentId)}</b> — {f.signal}. </span>)}
          </span>
        </div>
      )}
    </div>
  );
}

function agName(id: string): string {
  return EXEC_AGENTS.find((a) => a.id === id)?.name ?? id;
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${active ? "bg-ai/20 border-ai text-ai" : "border-line text-muted hover:bg-panel2"}`}
    >
      {label}
    </button>
  );
}

function Kpi({ n, l, c }: { n: string; l: string; c?: string }) {
  return (
    <Card className="p-3">
      <div className={`font-display text-xl font-bold ${c ?? ""}`}>{n}</div>
      <div className="text-[11px] text-muted">{l}</div>
    </Card>
  );
}

// ─── The interactive "Starting Eleven" pitch ────────────────────────────────
interface PitchNode {
  key: string;
  name: string;
  sub: string;
  icon: LucideIcon;
  color: string;
  personId: string;   // whose tasks to show
  agentId?: string;   // if this node is an AI agent
  corridor?: string;  // if this node is a corridor pod
  x: number;          // % position on the pitch
  y: number;
}

const PITCH_NODES: PitchNode[] = [
  // First line — AI agents (forwards)
  { key: "sayed",  name: "Sayed",  sub: "KYB / CRAM",        icon: ShieldCheck,   color: "#39B9ED", personId: "dinesh", agentId: "sayed",  x: 24, y: 16 },
  { key: "mohsen", name: "Mohsen", sub: "Investigation",     icon: Search,        color: "#A953DF", personId: "fiu",    agentId: "mohsen", x: 50, y: 12 },
  { key: "jana",   name: "Jana",   sub: "Reporting",         icon: MessageSquare, color: "#7C6CF7", personId: "jason",  agentId: "jana",   x: 76, y: 16 },
  // Midfield — Corridor Investigation Pool
  { key: "cor-us", name: "US",     sub: "Market context",    icon: Globe, color: "#2FD8A6", personId: "cip", corridor: "US", x: 30, y: 45 },
  { key: "cor-pk", name: "PK",     sub: "Market context",    icon: Globe, color: "#2FD8A6", personId: "cip", corridor: "PK", x: 42, y: 47 },
  { key: "cor-eg", name: "EG",     sub: "Market context",    icon: Globe, color: "#2FD8A6", personId: "cip", corridor: "EG", x: 53, y: 47 },
  { key: "cor-bd", name: "BD",     sub: "Market context",    icon: Globe, color: "#2FD8A6", personId: "cip", corridor: "BD", x: 64, y: 47 },
  { key: "cor-de", name: "DE",     sub: "Market context",    icon: Globe, color: "#2FD8A6", personId: "cip", corridor: "DE", x: 74, y: 45 },
  // Captains — human accountable owners
  { key: "dinesh", name: "Dinesh", sub: "Onboarding",        icon: Handshake,  color: "#39B9ED", personId: "dinesh", x: 28, y: 80 },
  { key: "terani", name: "Terani", sub: "Sanctions",         icon: Gavel,      color: "#2FD8A6", personId: "terani", x: 50, y: 82 },
  { key: "jason",  name: "Jason",  sub: "Reporting ops",     icon: Megaphone,  color: "#7C6CF7", personId: "jason",  x: 72, y: 80 },
];

const NODE_LABELS: Record<string, { title: string; kicker: string }> = {
  sayed:  { title: "Sayed · AI agent (KYB / CRAM)", kicker: "Owned by Dinesh · fine-tuned from CRAM overrides" },
  mohsen: { title: "Mohsen · AI agent (Investigation)", kicker: "Owned by FIU Lead · fine-tuned via the governed flywheel" },
  jana:   { title: "Jana · AI agent (Reporting)", kicker: "Owned by Jason · fine-tuned from filing & RFI outcomes" },
  cip:    { title: "Corridor Investigation Pool", kicker: "L1 gatherers — feed Mohsen via calibration + MRM gate" },
};

function StartingElevenPitch({ selected, onSelect, statusOf, cycle }: {
  selected: string | null;
  onSelect: (k: string | null) => void;
  statusOf: (id: string) => TaskStatus;
  cycle: (id: string) => void;
}) {
  // Resolve the selection to a person + optional agent/corridor context.
  const node = PITCH_NODES.find((n) => n.key === selected);
  const sideSel: Record<string, { personId: string; label: string; kicker: string }> = {
    tayel: { personId: "tayel", label: "Tayel (MLRO) — The Head Coach", kicker: "Strategy & risk appetite · owns exam posture · separate from the build team" },
    mrm:   { personId: "mrm",   label: "Model Risk Management", kicker: "Independent oversight — must operate independently of the players" },
    audit: { personId: "audit", label: "Internal Audit", kicker: "Independent referee — this line never moves" },
    legal: { personId: "legal", label: "Legal / Privacy", kicker: "Cross-cutting support — cross-border PII & contracts" },
  };
  const resolved = node
    ? { personId: node.personId, label: NODE_LABELS[node.agentId ?? (node.corridor ? "cip" : node.key)]?.title ?? node.name, kicker: NODE_LABELS[node.agentId ?? (node.corridor ? "cip" : node.key)]?.kicker ?? "", corridor: node.corridor }
    : selected && sideSel[selected]
      ? { ...sideSel[selected], corridor: undefined }
      : null;
  const tasks = resolved ? tasksForOwner(resolved.personId) : [];
  const person = resolved ? EXEC_PEOPLE.find((p) => p.id === resolved.personId) : undefined;

  return (
    <Card className="p-0 overflow-hidden mb-4">
      {/* Title */}
      <div className="px-4 py-3 border-b border-line flex items-center gap-2 flex-wrap">
        <Crown size={16} className="text-ai" />
        <h2 className="m-0 text-[15px] font-display font-bold">The FinCrime AI "Starting Eleven"</h2>
        <span className="text-[11px] text-muted">— a leadership playbook for global AML · click any player or icon</span>
      </div>

      <div className="p-3 grid grid-cols-[150px_1fr_190px] gap-3 max-lg:grid-cols-1">
        {/* Left column — Coach + Independent oversight */}
        <div className="space-y-2">
          <SideChip k="tayel" active={selected === "tayel"} onClick={onSelect} icon={Crown} color="#A953DF"
            title="Tayel (MLRO)" sub="The Head Coach" />
          <div className="rounded-xl border border-[#3a2d5c] bg-[#1a1330] p-2">
            <div className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[#9b8fd0] mb-1.5">Independent oversight</div>
            <div className="space-y-1.5">
              <SideChip k="mrm" active={selected === "mrm"} onClick={onSelect} icon={Scale} color="#c9b6f5" title="Model Risk Mgmt" sub="independent" small />
              <SideChip k="audit" active={selected === "audit"} onClick={onSelect} icon={ClipboardCheck} color="#c9b6f5" title="Internal Audit" sub="never moves" small />
            </div>
          </div>
        </div>

        {/* The pitch */}
        <div className="overflow-x-auto">
          <div className="relative min-w-[520px] rounded-xl overflow-hidden border border-[#2f6b3f]"
            style={{ background: "linear-gradient(165deg,#1f5c33,#123f22)", height: 340 }}>
            {/* field markings */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" style={{ opacity: 0.28 }}>
              <rect x="2" y="3" width="96" height="94" fill="none" stroke="#eafff0" strokeWidth="0.4" />
              <line x1="2" y1="50" x2="98" y2="50" stroke="#eafff0" strokeWidth="0.4" />
              <circle cx="50" cy="50" r="10" fill="none" stroke="#eafff0" strokeWidth="0.4" />
              <rect x="32" y="3" width="36" height="14" fill="none" stroke="#eafff0" strokeWidth="0.4" />
              <rect x="32" y="83" width="36" height="14" fill="none" stroke="#eafff0" strokeWidth="0.4" />
            </svg>
            {/* line labels */}
            <div className="absolute left-3 top-2 text-[8.5px] font-semibold uppercase tracking-wide text-[#bfeecb]">First line · build &amp; field ops</div>
            <div className="absolute left-1/2 top-[38%] -translate-x-1/2 text-[8.5px] font-semibold uppercase tracking-wide text-[#bfeecb]">Corridor pool · midfield</div>
            <div className="absolute left-1/2 bottom-2 -translate-x-1/2 text-[8.5px] font-semibold uppercase tracking-wide text-[#bfeecb]">Human accountable owners · captains</div>
            {/* player nodes */}
            {PITCH_NODES.map((n) => (
              <PlayerChip key={n.key} node={n} active={selected === n.key} onClick={() => onSelect(selected === n.key ? null : n.key)} />
            ))}
          </div>
        </div>

        {/* Right column — command table + referees + support */}
        <div className="space-y-2">
          <div className="rounded-xl border border-[#5c2f2f] bg-[#2a1616] p-2">
            <div className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[#f0a9a9] mb-1.5">Command decision ownership</div>
            <div className="space-y-1.5">
              <CmdRow role="Head Coach" who="Tayel (MLRO)" out="Policy, risk appetite, exam posture" />
              <CmdRow role="Defensive Lead" who="FIU Lead / Mohsen" out="Case disposition & high-risk approvals" />
              <CmdRow role="Offensive Lead" who="Jason / Jana" out="SAR/CTR filing & global reporting" />
            </div>
          </div>
          <SideChip k="legal" active={selected === "legal"} onClick={onSelect} icon={Lock} color="#F6A623" title="Legal / Privacy" sub="cross-cutting support" small />
          <div className="rounded-xl border border-[#5c2f2f] bg-[#2a1616] p-2 text-[9px] text-[#f0a9a9]">
            <b>The independent referees</b> — MRM &amp; Audit. Ensuring compliance and survival of regulatory exams.
          </div>
        </div>
      </div>

      {/* Selected detail — tasks to follow up */}
      {resolved && person ? (
        <div className="border-t border-line p-4">
          <div className="flex items-start gap-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="m-0 text-sm font-display">{resolved.label}</h3>
                {resolved.corridor && <span className="pill bg-low/15 text-low text-[10px]">{resolved.corridor} pod</span>}
                {person.interim && <span className="pill bg-med/15 text-med text-[9px]">interim</span>}
                {person.independent && <span className="pill bg-hi/15 text-hi text-[9px]">independent</span>}
              </div>
              {resolved.kicker && <div className="text-[11px] text-muted mt-0.5">{resolved.kicker}</div>}
            </div>
            <button type="button" className="btn btn-ghost text-[11px] px-2 py-1 flex items-center gap-1" onClick={() => onSelect(null)}>
              <X size={12} /> Close
            </button>
          </div>
          {tasks.length > 0 ? (
            <div className="mt-3 space-y-1">
              <div className="text-[9px] font-semibold tracking-[0.12em] uppercase text-faint mb-1">
                Tasks to follow up · {tasks.filter((t) => statusOf(t.id) === "done").length}/{tasks.length} done
              </div>
              {tasks.map((t) => <TaskRow key={t.id} task={t} status={statusOf(t.id)} onClick={() => cycle(t.id)} />)}
            </div>
          ) : (
            <div className="mt-3 text-[11px] text-muted">No discrete tasks on the register — see accountable outcomes in the roster below.</div>
          )}
        </div>
      ) : (
        <div className="border-t border-line p-3 text-[11px] text-muted text-center">Select a player or icon to see their tasks to follow up.</div>
      )}
    </Card>
  );
}

function PlayerChip({ node, active, onClick }: { node: PitchNode; active: boolean; onClick: () => void }) {
  const Icon = node.icon;
  const isCorridor = !!node.corridor;
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex flex-col items-center gap-0.5 group"
      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%,-50%)" }}
    >
      <span
        className={`rounded-full grid place-items-center transition ${isCorridor ? "w-8 h-8" : "w-11 h-11"} ${active ? "ring-2 ring-white scale-110" : "group-hover:scale-105"}`}
        style={{ background: `${node.color}`, boxShadow: active ? "0 0 0 3px rgba(255,255,255,.35)" : "0 2px 6px rgba(0,0,0,.4)", color: "#0b1120" }}
      >
        <Icon size={isCorridor ? 14 : 18} strokeWidth={2.4} />
      </span>
      <span className={`px-1.5 py-0.5 rounded ${isCorridor ? "text-[9px]" : "text-[10px]"} font-bold leading-none text-white`} style={{ background: "rgba(11,17,32,.7)" }}>{node.name}</span>
      {!isCorridor && <span className="text-[8px] text-[#dff0e4] leading-none">{node.sub}</span>}
    </button>
  );
}

function SideChip({ k, active, onClick, icon: Icon, color, title, sub, small }: {
  k: string; active: boolean; onClick: (k: string) => void; icon: LucideIcon; color: string; title: string; sub: string; small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(active ? "" : k)}
      className={`w-full flex items-center gap-2 rounded-xl border p-2 text-left transition ${active ? "border-ai bg-ai/10" : "border-line bg-panel2 hover:border-line"}`}
    >
      <span className={`rounded-lg grid place-items-center shrink-0 ${small ? "w-7 h-7" : "w-9 h-9"}`} style={{ background: `${color}22`, border: `1px solid ${color}`, color }}>
        <Icon size={small ? 14 : 17} />
      </span>
      <div className="min-w-0">
        <div className={`font-semibold ${small ? "text-[11px]" : "text-[12px]"} truncate`}>{title}</div>
        <div className="text-[9.5px] text-muted truncate">{sub}</div>
      </div>
    </button>
  );
}

function CmdRow({ role, who, out }: { role: string; who: string; out: string }) {
  return (
    <div className="border-t border-[#4a2626] first:border-0 pt-1.5 first:pt-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[#f0a9a9]">{role}</span>
        <span className="text-[10px] font-semibold text-white text-right">{who}</span>
      </div>
      <div className="text-[9.5px] text-[#e8c4c4] leading-snug mt-0.5">{out}</div>
    </div>
  );
}
