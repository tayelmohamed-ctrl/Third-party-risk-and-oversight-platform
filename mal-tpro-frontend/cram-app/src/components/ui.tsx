import { ReactNode, type CSSProperties } from "react";

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`bg-panel border border-line rounded-2xl ${className}`} style={style}>{children}</div>;
}

export function Sec({ children }: { children: ReactNode }) {
  return <div className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-faint my-5 mx-0.5">{children}</div>;
}

export function RatingPill({ rating }: { rating: string }) {
  const map: Record<string, string> = {
    Low: "bg-low/15 text-low", Medium: "bg-med/15 text-med",
    High: "bg-hi/15 text-hi", Prohibited: "bg-proh/25 text-[#ff7ea0]",
  };
  return <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full px-2.5 py-1 text-[10.5px] ${map[rating] || map.Medium}`}>{rating}</span>;
}

export function AiTag({ color = "#A953DF", children }: { color?: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold rounded-full px-2.5 py-1 text-[10px]" style={{ color: "#c9b6f5", background: "rgba(169,83,223,.16)" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} /> {children}
    </span>
  );
}

export function ratingColor(r: string) {
  return ({ Low: "#2FD8A6", Medium: "#F6A623", High: "#FF5C77", Prohibited: "#B23A5B" } as Record<string, string>)[r] || "#F6A623";
}
