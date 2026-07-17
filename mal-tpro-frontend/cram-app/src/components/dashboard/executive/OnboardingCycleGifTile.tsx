import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import type { OnboardingCycleDemo } from "../../../config/onboardingCycleDemos";

type Props = {
  demo: OnboardingCycleDemo;
  onOpen: () => void;
};

/**
 * Clickable GIF-style looping preview of an onboarding cycle.
 * CSS frame animation (no binary .gif asset) — opens full demo on click.
 */
export default function OnboardingCycleGifTile({ demo, onOpen }: Props) {
  const [frame, setFrame] = useState(0);
  const frames = demo.gifFrames;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 900);
    return () => window.clearInterval(id);
  }, [frames.length]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="onb-gif-tile group text-left border-none bg-transparent p-0 cursor-pointer w-full"
      aria-label={`Play ${demo.title} onboarding cycle demo`}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-line bg-panel transition group-hover:border-ai/45 group-hover:shadow-[0_0_0_1px_rgba(169,83,223,0.25)]"
        style={{ borderColor: undefined }}
      >
        {/* Animated “GIF” stage */}
        <div
          className="onb-gif-stage relative h-[148px] px-4 pt-4 pb-3"
          style={{
            background: `radial-gradient(ellipse 90% 80% at 20% 0%, ${demo.accent}22, transparent 55%), linear-gradient(165deg, #0A1130 0%, #060d22 100%)`,
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
              style={{ background: `${demo.accent}28`, color: demo.accent }}
            >
              GIF · DEMO
            </span>
            <span className="text-[9px] mono text-faint">
              {String(frame + 1).padStart(2, "0")}/{String(frames.length).padStart(2, "0")}
            </span>
          </div>

          <div className="flex gap-1.5 mb-3">
            {frames.map((label, i) => (
              <div
                key={label}
                className="flex-1 h-1 rounded-full overflow-hidden bg-white/10"
                title={label}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: i <= frame ? "100%" : "0%",
                    background: demo.accent,
                    opacity: i === frame ? 1 : 0.45,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-end justify-between gap-3 min-h-[72px]">
            <div className="min-w-0">
              <div
                key={frame}
                className="onb-gif-frame-pop"
              >
                <div className="text-[10px] mono text-faint mb-0.5">
                  Beat {String(frame + 1).padStart(2, "0")}
                </div>
                <div
                  className="font-display font-bold text-[22px] leading-tight tracking-tight truncate"
                  style={{ color: demo.accent }}
                >
                  {frames[frame]}
                </div>
                <p className="text-[11px] text-muted mt-1 mb-0 line-clamp-2">
                  {demo.beats[frame]?.detail}
                </p>
              </div>
            </div>
            <div
              className="shrink-0 w-11 h-11 rounded-full grid place-items-center border transition group-hover:scale-105"
              style={{
                background: `${demo.accent}22`,
                borderColor: `${demo.accent}66`,
                color: demo.accent,
              }}
            >
              <Play size={18} fill="currentColor" className="ml-0.5" />
            </div>
          </div>

          {/* Film grain / scanline hint */}
          <div className="pointer-events-none absolute inset-0 onb-gif-scan" aria-hidden />
        </div>

        <div className="px-4 py-3 border-t border-lineSoft">
          <div className="font-display font-semibold text-[14px] text-ink">{demo.title}</div>
          <div className="text-[11px] text-muted mt-0.5">{demo.subtitle}</div>
          <div className="text-[10px] text-faint mt-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse2" style={{ background: demo.accent }} />
            Click to open interactive cycle · {demo.beats.length} beats
          </div>
        </div>
      </div>
    </button>
  );
}
