import type { ReactNode } from "react";

export const CHART = {
  low: "#2FD8A6",
  med: "#F6A623",
  hi: "#FF5C77",
  proh: "#B23A5B",
  muted: "#6E72A6",
  ink: "#F8F6FE",
  line: "#26285C",
  panel: "#10103C",
} as const;

export function scoreColor(score: number): string {
  if (score >= 2.15) return CHART.hi;
  if (score >= 1.5) return CHART.med;
  return CHART.low;
}

export function bandColor(band: string): string {
  return ({ Low: CHART.low, Medium: CHART.med, High: CHART.hi, Prohibited: CHART.proh } as Record<string, string>)[band] ?? CHART.med;
}

interface BarRow {
  label: string;
  value: number;
  max?: number;
  color?: string;
  suffix?: string;
}

export function HorizontalBarChart({
  title,
  caption,
  rows,
  max,
  height = 14,
}: {
  title: string;
  caption?: string;
  rows: BarRow[];
  max?: number;
  height?: number;
}) {
  const peak = max ?? Math.max(...rows.map((r) => r.value), 0.01);
  return (
    <div>
      <ChartTitle title={title} caption={caption} />
      <div className="space-y-2 mt-2">
        {rows.map((r) => {
          const pct = Math.min(100, (r.value / peak) * 100);
          return (
            <div key={r.label}>
              <div className="flex justify-between text-[10px] mb-0.5 gap-2">
                <span className="text-muted truncate">{r.label}</span>
                <span className="mono text-ink shrink-0">
                  {r.value.toFixed(r.value < 1 ? 3 : 2)}{r.suffix ?? ""}
                </span>
              </div>
              <div className="h-[var(--bar-h)] rounded bg-panel2 overflow-hidden" style={{ ["--bar-h" as string]: `${height}px` }}>
                <div
                  className="h-full rounded transition-all duration-300"
                  style={{ width: `${pct}%`, background: r.color ?? scoreColor(r.value) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RiskGauge({
  score,
  rating,
  label = "Composite score",
}: {
  score: number;
  rating: string;
  label?: string;
}) {
  const cx = 80;
  const cy = 78;
  const r = 58;
  const start = Math.PI;
  const end = 0;
  const pct = Math.min(1, Math.max(0, score / 3));
  const needleAngle = start + (end - start) * pct;
  const nx = cx + (r - 8) * Math.cos(needleAngle);
  const ny = cy + (r - 8) * Math.sin(needleAngle);

  const arc = (from: number, to: number, color: string) => {
    const x1 = cx + r * Math.cos(from);
    const y1 = cy + r * Math.sin(from);
    const x2 = cx + r * Math.cos(to);
    const y2 = cy + r * Math.sin(to);
    const large = to - from > Math.PI ? 1 : 0;
    return (
      <path
        key={`${from}-${color}`}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="butt"
      />
    );
  };

  const lowEnd = start + (end - start) * (1.5 / 3);
  const medEnd = start + (end - start) * (2.15 / 3);

  return (
    <div className="text-center">
      <svg viewBox="0 0 160 96" className="w-full max-w-[180px] mx-auto" aria-label={`${label}: ${score.toFixed(2)} out of 3`}>
        {arc(start, lowEnd, CHART.low)}
        {arc(lowEnd, medEnd, CHART.med)}
        {arc(medEnd, end, CHART.hi)}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={CHART.ink} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill={CHART.ink} />
        <text x={cx} y={cy + 22} textAnchor="middle" fill={CHART.ink} fontSize={18} fontFamily="JetBrains Mono, monospace" fontWeight={600}>
          {score.toFixed(2)}
        </text>
        <text x={cx} y={cy + 34} textAnchor="middle" fill={CHART.muted} fontSize={9}>
          / 3.00
        </text>
      </svg>
      <div className="text-[10px] text-muted uppercase tracking-wide">{label}</div>
      <div className="text-[12px] font-semibold mt-0.5" style={{ color: bandColor(rating) }}>{rating}</div>
      <div className="flex justify-center gap-3 mt-2 text-[9px] text-faint">
        <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: CHART.low }} />Low ≤1.50</span>
        <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: CHART.med }} />Med ≤2.15</span>
        <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: CHART.hi }} />High</span>
      </div>
    </div>
  );
}

export function RadarChart({
  title,
  caption,
  axes,
}: {
  title: string;
  caption?: string;
  axes: { label: string; value: number; max?: number }[];
}) {
  const n = axes.length;
  const cx = 100;
  const cy = 100;
  const maxR = 72;
  const levels = [1, 2, 3];

  const point = (i: number, v: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (v / 3) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const poly = axes.map((a, i) => point(i, a.value));
  const polyStr = poly.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div>
      <ChartTitle title={title} caption={caption} />
      <svg viewBox="0 0 200 200" className="w-full mt-1" aria-label={title}>
        {levels.map((lv) => {
          const pts = axes.map((_, i) => point(i, lv));
          return (
            <polygon
              key={lv}
              points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={CHART.line}
              strokeWidth={lv === 3 ? 1.2 : 0.6}
              opacity={0.7}
            />
          );
        })}
        {axes.map((a, i) => {
          const outer = point(i, 3);
          return (
            <line key={a.label} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke={CHART.line} strokeWidth={0.6} />
          );
        })}
        <polygon points={polyStr} fill="rgba(169,83,223,0.22)" stroke={CHART.med} strokeWidth={1.5} />
        {poly.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={scoreColor(axes[i].value)} />
        ))}
        {axes.map((a, i) => {
          const lbl = point(i, 3.55);
          return (
            <text key={`lbl-${a.label}`} x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="middle" fill={CHART.muted} fontSize={8}>
              {a.label.length > 12 ? `${a.label.slice(0, 11)}…` : a.label}
            </text>
          );
        })}
      </svg>
      <div className="text-[9px] text-faint text-center mt-0.5">Factor score (1–3) · axes = CRA six-factor model</div>
    </div>
  );
}

export function DonutChart({
  title,
  caption,
  segments,
}: {
  title: string;
  caption?: string;
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const cx = 80;
  const cy = 80;
  const r = 52;
  const ir = 32;
  let angle = -Math.PI / 2;

  const slices = segments.map((s) => {
    const sweep = (s.value / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const ix1 = cx + ir * Math.cos(angle - sweep);
    const iy1 = cy + ir * Math.sin(angle - sweep);
    const ix2 = cx + ir * Math.cos(angle);
    const iy2 = cy + ir * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`;
    return { ...s, d };
  });

  return (
    <div>
      <ChartTitle title={title} caption={caption} />
      <div className="flex items-center gap-3 mt-2">
        <svg viewBox="0 0 160 160" className="w-[120px] shrink-0" aria-label={title}>
          {slices.map((s) => (
            <path key={s.label} d={s.d} fill={s.color} />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fill={CHART.ink} fontSize={16} fontWeight={700} fontFamily="Outfit, sans-serif">
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill={CHART.muted} fontSize={9}>customers</text>
        </svg>
        <div className="flex-1 space-y-1.5 min-w-0">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-[10px]">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
              <span className="text-muted truncate flex-1">{s.label}</span>
              <span className="mono text-ink">{s.value}</span>
              <span className="text-faint">({((s.value / total) * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GroupedBars({
  title,
  caption,
  groups,
  series,
}: {
  title: string;
  caption?: string;
  groups: string[];
  series: { name: string; values: number[]; color: string }[];
}) {
  const max = Math.max(...series.flatMap((s) => s.values), 0.01);
  const barW = 12;
  const gap = 4;
  const groupW = series.length * (barW + gap);
  const chartW = groups.length * (groupW + 16);

  return (
    <div>
      <ChartTitle title={title} caption={caption} />
      <svg viewBox={`0 0 ${chartW} 120`} className="w-full mt-2" aria-label={title}>
        {groups.map((g, gi) => {
          const gx = gi * (groupW + 16) + 8;
          return (
            <g key={g}>
              {series.map((s, si) => {
                const v = s.values[gi] ?? 0;
                const h = (v / max) * 80;
                const x = gx + si * (barW + gap);
                const y = 90 - h;
                return (
                  <rect key={s.name} x={x} y={y} width={barW} height={h} fill={s.color} rx={2} />
                );
              })}
              <text x={gx + groupW / 2} y={108} textAnchor="middle" fill={CHART.muted} fontSize={9}>{g}</text>
            </g>
          );
        })}
        <text x={4} y={12} fill={CHART.muted} fontSize={8}>Rate (%)</text>
      </svg>
      <div className="flex gap-3 mt-1 flex-wrap">
        {series.map((s) => (
          <span key={s.name} className="text-[9px] text-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />{s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChartTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <>
      <div className="text-[10px] uppercase tracking-wide text-faint font-semibold">{title}</div>
      {caption && <div className="text-[9px] text-faint mt-0.5">{caption}</div>}
    </>
  );
}

export function ChartGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">{children}</div>;
}
