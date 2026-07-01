import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui";
import { PLATFORM_USERS } from "../config/platformUsers";
import { TRAINING_COURSES } from "../config/trainingCatalogue";
import {
  apiAssignTraining,
  apiCompleteTraining,
  apiListTraining,
  apiTrainingStats,
  apiUpdateTraining,
  type TrainingRecord,
  type TrainingStats,
} from "../lib/api";
import { getPlatformUser, hasOverrideCapability } from "../lib/authSession";

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-low/15 text-low",
  in_progress: "bg-ai/15 text-[#c9b6f5]",
  assigned: "bg-panel2 text-muted",
  overdue: "bg-hi/15 text-hi",
  waived: "bg-med/15 text-med",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Training() {
  const user = getPlatformUser();
  const canAssign = hasOverrideCapability();
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "overdue">("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [assignEmail, setAssignEmail] = useState(PLATFORM_USERS[0]?.email ?? "");
  const [assignCourse, setAssignCourse] = useState(TRAINING_COURSES[0]?.id ?? "");

  const refresh = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([
        apiTrainingStats(),
        apiListTraining(
          filter === "mine"
            ? { userEmail: user.email }
            : filter === "overdue"
              ? { status: "overdue" }
              : undefined,
        ),
      ]);
      setStats(s);
      setRecords(list.records);
    } catch {
      setStats(null);
      setRecords([]);
    }
  }, [filter, user.email]);

  useEffect(() => { void refresh(); }, [refresh]);

  const filteredRecords = useMemo(() => {
    if (filter !== "overdue") return records;
    return records.filter((r) => r.status === "overdue");
  }, [records, filter]);

  async function handleAssign() {
    if (!assignEmail || !assignCourse) return;
    setBusy(true);
    setMsg("");
    try {
      const u = PLATFORM_USERS.find((p) => p.email === assignEmail);
      await apiAssignTraining({
        userEmail: assignEmail,
        userName: u?.name,
        courseId: assignCourse,
      });
      setMsg("Training assigned");
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 3500);
    }
  }

  async function handleComplete(id: string) {
    setBusy(true);
    try {
      await apiCompleteTraining(id);
      await refresh();
      setMsg("Marked complete");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 3500);
    }
  }

  async function handleStart(id: string) {
    setBusy(true);
    try {
      await apiUpdateTraining(id, { status: "in_progress" });
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-panel2 border-lineSoft">
        <p className="text-[12px] text-muted m-0">
          AML training register for examiner evidence — CBUAE & FFIEC BSA/AML programme requirements.
          Assignments are audit-logged. Completion attestation recorded with actor email.
        </p>
      </Card>

      {msg && <Card className="p-3 text-[12px]">{msg}</Card>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Completion rate", value: stats ? `${stats.completionPct}%` : "—", tone: "text-low" },
          { label: "Overdue", value: stats?.overdue ?? "—", tone: stats?.overdue ? "text-hi" : "text-muted" },
          { label: "Due ≤ 30 days", value: stats?.dueWithin30Days ?? "—", tone: "text-med" },
          { label: "Total assignments", value: stats?.total ?? "—", tone: "text-ink" },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="text-[10px] text-faint uppercase">{s.label}</div>
            <div className={`text-xl font-display font-bold mt-1 ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "mine", "overdue"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
              filter === f ? "bg-ai/20 border-ai" : "border-line text-muted"
            }`}
          >
            {f === "all" ? "All staff" : f === "mine" ? "My training" : "Overdue"}
          </button>
        ))}
        <Link to="/audit" className="btn btn-ghost text-[11px] ml-auto">Audit log →</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-panel2 text-[10px] uppercase text-faint font-semibold">
            Training records · {filteredRecords.length}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-faint border-b border-lineSoft text-left">
                  <th className="px-4 py-2 font-semibold">Staff</th>
                  <th className="px-4 py-2 font-semibold">Course</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Due</th>
                  <th className="px-4 py-2 font-semibold">Completed</th>
                  <th className="px-4 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="border-b border-lineSoft hover:bg-panel2/50">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold">{r.userName ?? r.userEmail.split("@")[0]}</div>
                      <div className="text-faint mono text-[9px]">{r.userEmail}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="mono text-[9px] text-faint">{r.courseId}</div>
                      <div>{r.courseName}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`pill text-[9px] ${STATUS_STYLE[r.status] ?? ""}`}>{r.status.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-2.5">{fmtDate(r.dueAt)}</td>
                    <td className="px-4 py-2.5">
                      {r.completedAt ? (
                        <>
                          {fmtDate(r.completedAt)}
                          {r.attestedBy && <div className="text-[9px] text-faint">by {r.attestedBy}</div>}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {r.status === "assigned" || r.status === "overdue" ? (
                          <button type="button" className="btn btn-ghost text-[10px] py-0.5 px-2" disabled={busy}
                            onClick={() => void handleStart(r.id)}>Start</button>
                        ) : null}
                        {r.status !== "completed" && r.status !== "waived" ? (
                          <button type="button" className="btn text-[10px] py-0.5 px-2" disabled={busy}
                            onClick={() => void handleComplete(r.id)}>Complete</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredRecords.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted">No training records</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          {canAssign && (
            <Card className="p-4">
              <div className="text-[10px] text-faint uppercase font-semibold mb-3">Assign training</div>
              <label className="block text-[11px] mb-2">
                <span className="text-faint">Staff member</span>
                <select className="input w-full mt-1 text-[12px]" value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)}>
                  {PLATFORM_USERS.map((u) => (
                    <option key={u.email} value={u.email}>{u.name} · {u.roles.join(", ")}</option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] mb-3">
                <span className="text-faint">Course</span>
                <select className="input w-full mt-1 text-[12px]" value={assignCourse} onChange={(e) => setAssignCourse(e.target.value)}>
                  {TRAINING_COURSES.map((c) => (
                    <option key={c.id} value={c.id}>{c.id} — {c.name}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn w-full text-[11px]" disabled={busy} onClick={() => void handleAssign()}>
                Assign course
              </button>
            </Card>
          )}

          <Card className="p-4">
            <div className="text-[10px] text-faint uppercase font-semibold mb-2">Course catalogue</div>
            <ul className="space-y-2 m-0 p-0 list-none">
              {TRAINING_COURSES.map((c) => (
                <li key={c.id} className="text-[11px] border-b border-lineSoft pb-2 last:border-0">
                  <div className="mono text-[9px] text-faint">{c.id}</div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-muted text-[10px] mt-0.5">{c.description}</div>
                  <div className="text-[9px] text-faint mt-1">{c.regulatorRef} · every {c.frequencyMonths}mo</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
