import { useEffect, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { OnboardingCycleDemo } from "../../../config/onboardingCycleDemos";
import { exportIndividualOnboardingPlaybookPdf } from "../../../lib/onboardingIndividualPlaybookPdf";
import { exportSmeOnboardingPlaybookPdf } from "../../../lib/onboardingSmePlaybookPdf";

type Props = {
  demo: OnboardingCycleDemo | null;
  onClose: () => void;
};

const LANE_STYLES = {
  green: "bg-low/15 text-low border-low/30",
  amber: "bg-med/15 text-med border-med/30",
  red: "bg-hi/15 text-hi border-hi/30",
} as const;

export default function OnboardingCycleDemoModal({ demo, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    setStep(0);
    setPlaying(true);
  }, [demo?.kind]);

  useEffect(() => {
    if (!demo || !playing) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % demo.beats.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [demo, playing]);

  useEffect(() => {
    if (!demo) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (!demo) return;
      if (e.key === "ArrowRight") {
        setPlaying(false);
        setStep((s) => (s + 1) % demo.beats.length);
      }
      if (e.key === "ArrowLeft") {
        setPlaying(false);
        setStep((s) => (s - 1 + demo.beats.length) % demo.beats.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demo, onClose]);

  if (!demo) return null;

  const beat = demo.beats[step];

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      if (demo!.kind === "sme") await exportSmeOnboardingPlaybookPdf();
      else await exportIndividualOnboardingPlaybookPdf();
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-demo-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-line bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-5 py-4 border-b border-lineSoft flex items-start justify-between gap-3"
          style={{
            background: `linear-gradient(135deg, ${demo.accent}18 0%, #0A1130 55%)`,
          }}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
                style={{ background: `${demo.accent}28`, color: demo.accent }}
              >
                Interactive demo
              </span>
              <span className="mono text-[10px] text-faint">{demo.documentId}</span>
            </div>
            <h2 id="onb-demo-title" className="m-0 font-display text-[20px] text-ink">
              {demo.title}
            </h2>
            <p className="text-[12px] text-muted mt-1 mb-0">{demo.promise}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-lg border border-line bg-panel2 text-muted hover:text-ink grid place-items-center cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Before → After */}
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="rounded-xl border border-lineSoft bg-med/5 px-3 py-2.5">
              <div className="text-[9px] font-bold tracking-wider text-med uppercase mb-1">Before</div>
              <p className="text-[11.5px] text-muted m-0">{demo.before}</p>
            </div>
            <div className="rounded-xl border border-lineSoft px-3 py-2.5" style={{ background: `${demo.accent}10` }}>
              <div className="text-[9px] font-bold tracking-wider uppercase mb-1" style={{ color: demo.accent }}>
                After
              </div>
              <p className="text-[11.5px] text-muted m-0">{demo.after}</p>
            </div>
          </div>

          {/* Journey strip */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[10px] uppercase tracking-wider text-faint font-semibold">
                Six-beat cycle
              </div>
              <button
                type="button"
                className="text-[10px] font-semibold px-2 py-1 rounded-md border border-line bg-panel2 text-muted cursor-pointer hover:text-ink"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? "Pause" : "Play"}
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1.5 max-sm:grid-cols-3">
              {demo.beats.map((b, i) => {
                const on = i === step;
                const done = i < step;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setStep(i);
                    }}
                    className="rounded-lg border px-1.5 py-2 text-center cursor-pointer transition"
                    style={{
                      borderColor: on ? demo.accent : "var(--line, #26285C)",
                      background: on ? `${demo.accent}22` : done ? `${demo.accent}0d` : "transparent",
                    }}
                  >
                    <div
                      className="mono text-[10px] font-bold"
                      style={{ color: on || done ? demo.accent : "#6E72A6" }}
                    >
                      {b.n}
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-tight ${on ? "text-ink font-semibold" : "text-muted"}`}>
                      {b.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active beat stage */}
          <div
            className="rounded-2xl border border-lineSoft p-4"
            style={{
              background: `radial-gradient(ellipse 70% 60% at 100% 0%, ${demo.accent}18, transparent 50%), #0A1130`,
            }}
          >
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="w-9 h-9 rounded-full grid place-items-center mono text-sm font-bold"
                style={{ background: `${demo.accent}28`, color: demo.accent, border: `1px solid ${demo.accent}` }}
              >
                {beat.n}
              </span>
              <div>
                <div className="font-display font-semibold text-[16px] text-ink">{beat.label}</div>
                <div className="text-[10px] text-faint">{beat.feel}</div>
              </div>
            </div>
            <p className="text-[13px] text-ink mt-2 mb-3">{beat.detail}</p>
            <div className="flex flex-wrap gap-1.5">
              {beat.docs.map((d) => (
                <span
                  key={d}
                  className="text-[10px] px-2 py-1 rounded-md border border-lineSoft bg-panel2 text-muted"
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                className="w-8 h-8 rounded-lg border border-line bg-panel2 text-muted grid place-items-center cursor-pointer"
                onClick={() => {
                  setPlaying(false);
                  setStep((s) => (s - 1 + demo.beats.length) % demo.beats.length);
                }}
                aria-label="Previous beat"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-lg border border-line bg-panel2 text-muted grid place-items-center cursor-pointer"
                onClick={() => {
                  setPlaying(false);
                  setStep((s) => (s + 1) % demo.beats.length);
                }}
                aria-label="Next beat"
              >
                <ChevronRight size={16} />
              </button>
              <span className="text-[10px] text-faint mono ml-1">
                {step + 1} / {demo.beats.length} · ← → keys
              </span>
            </div>
          </div>

          {/* Lanes */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-faint font-semibold mb-2">
              Activation lanes
            </div>
            <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
              {demo.lanes.map((lane) => (
                <div
                  key={lane.id}
                  className={`rounded-xl border px-3 py-2.5 ${LANE_STYLES[lane.id]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold">{lane.label}</span>
                    <span className="mono text-[10px] opacity-80">{lane.target}</span>
                  </div>
                  <p className="text-[10.5px] mt-1.5 mb-0 opacity-90">{lane.entry}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Example */}
          <div className="rounded-xl border border-lineSoft bg-panel2 px-3 py-2.5">
            <div className="text-[9px] font-bold tracking-wider text-faint uppercase mb-1">
              Worked example
            </div>
            <p className="text-[12px] text-ink m-0">{demo.example}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              className="btn flex items-center gap-1.5 text-[12px]"
              disabled={pdfBusy}
              onClick={() => void downloadPdf()}
            >
              <Download size={14} />
              {pdfBusy ? "Preparing PDF…" : "Download playbook PDF"}
            </button>
            <button type="button" className="btn btn-ghost text-[12px]" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
