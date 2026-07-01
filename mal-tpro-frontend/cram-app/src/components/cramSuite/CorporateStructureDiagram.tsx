import { useCallback, useMemo, useRef, useState, type WheelEvent } from "react";
import { AlertTriangle, Building2, ChevronDown, ChevronRight, Globe, Maximize2, Minus, Plus, Search, User, X, ZoomIn } from "lucide-react";
import { Card } from "../ui";
import {
  buildEntityStructureGraph,
  layoutStructureGraph,
  STRUCTURE_LAYOUT,
  type EntityStructureInput,
  type PositionedNode,
  type StructureEdge,
  type StructureNode,
  type StructureRiskBand,
} from "../../engine/corporateStructureGraph";
import type { OnlineSearchHit } from "../../engine/uboNetworkIntel";

const RISK_RING: Record<StructureRiskBand, string> = {
  Low: "#F6A623",
  Medium: "#FF8FAB",
  High: "#FF5C77",
};

const RISK_FILL: Record<StructureRiskBand, string> = {
  Low: "rgba(246,166,35,.12)",
  Medium: "rgba(255,143,171,.14)",
  High: "rgba(255,92,119,.16)",
};

const COMPANY_FILL = "rgba(57,185,237,.14)";
const COMPANY_RING = "#39B9ED";
const EXTERNAL_RING = "#FF8FAB";
const EXTERNAL_FILL = "rgba(255,143,171,.12)";
const HIT_RING = "#FF5C77";

function OnlineHitsList({ hits }: { hits: OnlineSearchHit[] }) {
  if (!hits.length) return null;
  return (
    <div className="mt-3 pt-2 border-t border-lineSoft">
      <div className="text-[10px] uppercase text-faint mb-2 flex items-center gap-1">
        <Search size={11} /> Online search hits
      </div>
      <div className="space-y-2">
        {hits.map((h, i) => (
          <div key={i} className="rounded-lg bg-panel2 border border-lineSoft p-2 text-[10px]">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={11} style={{ color: h.severity === "High" ? HIT_RING : h.severity === "Medium" ? EXTERNAL_RING : RISK_RING.Low }} />
              <span className="font-semibold text-ink capitalize">{h.kind.replace(/_/g, " ")}</span>
              <span className="pill text-[9px] ml-auto" style={{ color: h.severity === "High" ? HIT_RING : undefined }}>{h.severity}</span>
            </div>
            <div className="text-muted leading-snug">{h.summary}</div>
            <div className="text-faint mt-1 flex items-center gap-1"><Globe size={10} /> {h.source}{h.at ? ` · ${h.at}` : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function edgePath(from: PositionedNode, to: PositionedNode): string {
  const { NODE_W, NODE_H } = STRUCTURE_LAYOUT;
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function DetailRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-lineSoft text-[11px] last:border-0">
      <span className="text-muted shrink-0">{k}</span>
      <span className="text-ink text-right font-medium">{v}</span>
    </div>
  );
}

function OwnershipDetailPanel({ node, onClose }: { node: StructureNode; onClose: () => void }) {
  return (
    <div className="absolute top-0 right-0 bottom-0 w-[min(100%,280px)] bg-panel border-l border-line shadow-2xl z-20 flex flex-col">
      <div className="flex items-start justify-between gap-2 p-3 border-b border-lineSoft">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-faint">{node.kind === "company" ? "Legal entity" : "Natural person"}</div>
          <div className="font-display font-semibold text-[13px] text-ink mt-0.5 leading-snug">{node.name}</div>
          <div className="text-[10px] text-muted mt-1">{node.role}</div>
        </div>
        <button type="button" className="p-1 rounded-md hover:bg-panel2 text-muted" onClick={onClose} aria-label="Close panel">
          <X size={16} />
        </button>
      </div>
      <div className="p-3 overflow-y-auto flex-1 space-y-1">
        <DetailRow k="Country" v={node.country} />
        {node.ownershipPct != null && <DetailRow k="Ownership" v={`${node.ownershipPct}%`} />}
        {node.entityType && <DetailRow k="Entity type" v={node.entityType} />}
        {node.externalHolding && <DetailRow k="Network link" v="External holding · OSINT / registry" />}
        {node.customerType && <DetailRow k="Customer type" v={node.customerType} />}
        {node.customerId && <DetailRow k="Linked profile" v={node.customerId} />}
        {node.kycStatus && <DetailRow k="KYC status" v={node.kycStatus} />}
        {node.verificationStatus && <DetailRow k="Verification" v={node.verificationStatus} />}
        {node.screeningSummary && <DetailRow k="Screening" v={node.screeningSummary} />}
        {node.pepStatus && <DetailRow k="PEP (entity)" v={node.pepStatus} />}
        {node.lastReviewed && <DetailRow k="Last reviewed" v={node.lastReviewed} />}
        <OnlineHitsList hits={node.onlineHits ?? []} />
        <div className="mt-3 pt-2 border-t border-lineSoft">
          <div className="text-[10px] uppercase text-faint mb-1">Risk band (visual only)</div>
          <span className="pill text-[10px]" style={{ color: RISK_RING[node.riskBand], background: RISK_FILL[node.riskBand] }}>
            {node.riskBand}
          </span>
        </div>
      </div>
      <div className="p-3 border-t border-lineSoft text-[10px] text-faint">
        Supporting evidence · does not affect CRAM composite score
      </div>
    </div>
  );
}

export default function CorporateStructureDiagram({ input }: { input: EntityStructureInput }) {
  const graph = useMemo(() => buildEntityStructureGraph(input), [input]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const layout = useMemo(() => layoutStructureGraph(graph, collapsed), [graph, collapsed]);
  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null;

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setTransform((t) => ({ ...t, scale: Math.min(2.2, Math.max(0.45, t.scale + delta)) }));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setTransform((t) => ({
      ...t,
      x: dragRef.current!.tx + (e.clientX - dragRef.current!.x),
      y: dragRef.current!.ty + (e.clientY - dragRef.current!.y),
    }));
  };

  const onPointerUp = () => { dragRef.current = null; };

  const fitView = () => setTransform({ x: 0, y: 0, scale: 1 });
  const zoom = (d: number) => setTransform((t) => ({ ...t, scale: Math.min(2.2, Math.max(0.45, t.scale + d)) }));

  const { NODE_W, NODE_H } = STRUCTURE_LAYOUT;

  return (
    <Card className="p-0 overflow-hidden relative">
      <div className="px-4 pt-4 pb-2 border-b border-lineSoft">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-semibold">Corporate structure & UBO diagram</div>
            <div className="text-[12px] text-muted mt-0.5">
              Supporting evidence for MLRO / audit · <span className="text-ai">does not affect risk score</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="px-2 py-1 rounded-full bg-panel2 border border-lineSoft text-muted">{graph.complexityLabel}</span>
            <span className="px-2 py-1 rounded-full bg-panel2 border border-lineSoft text-muted">{graph.layers} tiers</span>
            {graph.networkScan.enabled && (
              <span className="px-2 py-1 rounded-full bg-hi/10 border border-hi/30 text-hi flex items-center gap-1">
                <Search size={10} />
                {graph.networkScan.totalExternalCompanies} linked cos
                {graph.networkScan.totalHits > 0 && ` · ${graph.networkScan.totalHits} hit(s)`}
              </span>
            )}
          </div>
        </div>
        {graph.networkScan.enabled && (
          <div className="mt-2 text-[10px] text-muted flex items-start gap-1.5 rounded-lg bg-panel2/80 border border-lineSoft px-2.5 py-2">
            <Globe size={12} className="shrink-0 mt-0.5 text-ai" />
            <span>
              <b className="text-ink">UBO network intelligence:</b> {graph.networkScan.reason}.
              {graph.networkScan.highSeverityHits > 0 && (
                <span className="text-hi"> {graph.networkScan.highSeverityHits} high-severity OSINT hit(s) — review connected structures.</span>
              )}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2" style={{ borderColor: COMPANY_RING, background: COMPANY_FILL }} /> Company</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-hi bg-hi/15" /> Person · High</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-med bg-med/15" /> Medium</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2" style={{ borderColor: EXTERNAL_RING, background: EXTERNAL_FILL }} /> External holding (OSINT)</span>
        </div>
      </div>

      <div className={`relative ${graph.networkScan.totalExternalCompanies > 0 ? "h-[520px]" : "h-[420px]"} bg-[#060e22] cursor-grab active:cursor-grabbing`}>
        <svg
          ref={svgRef}
          className="w-full h-full touch-none"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#5a6478" />
            </marker>
          </defs>
          <g transform={`translate(${transform.x + 24}, ${transform.y + 16}) scale(${transform.scale})`}>
            {layout.edges.map((edge: StructureEdge) => {
              const from = layout.nodes.find((n) => n.id === edge.from);
              const to = layout.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              const mx = (from.x + to.x) / 2 + NODE_W / 2;
              const my = (from.y + to.y) / 2 + NODE_H / 2;
              return (
                <g key={edge.id}>
                  <path
                    d={edgePath(from, to)}
                    fill="none"
                    stroke="#3d4a63"
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                  />
                  <text x={mx} y={my} textAnchor="middle" className="fill-[#8F9BAA] text-[9px] font-medium">
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {layout.nodes.map((node) => {
              const isCompany = node.kind === "company";
              const isExternal = node.externalHolding;
              const hitCount = node.onlineHits?.length ?? 0;
              const ring = node.customerEntity
                ? "#A953DF"
                : isExternal
                  ? (hitCount > 0 ? HIT_RING : EXTERNAL_RING)
                  : isCompany
                    ? COMPANY_RING
                    : RISK_RING[node.riskBand];
              const fill = node.customerEntity
                ? "rgba(169,83,223,.18)"
                : isExternal
                  ? (hitCount > 0 ? "rgba(255,92,119,.14)" : EXTERNAL_FILL)
                  : isCompany
                    ? COMPANY_FILL
                    : RISK_FILL[node.riskBand];
              const selectedRing = selectedId === node.id ? "#A953DF" : ring;
              return (
                <g
                  key={node.id}
                  data-node
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                >
                  <rect
                    x={0} y={0} width={NODE_W} height={NODE_H} rx={36}
                    fill={fill}
                    stroke={selectedRing}
                    strokeWidth={selectedId === node.id ? 2.5 : hitCount > 0 ? 2 : 1.5}
                    strokeDasharray={isExternal ? "4 2" : undefined}
                  />
                  <foreignObject x={NODE_W / 2 - 14} y={10} width={28} height={28}>
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-panel/80">
                      {isCompany ? <Building2 size={16} className={isExternal ? "text-hi" : "text-[#39B9ED]"} /> : <User size={16} style={{ color: RISK_RING[node.riskBand] }} />}
                    </div>
                  </foreignObject>
                  {hitCount > 0 && (
                    <g transform={`translate(${NODE_W - 20}, 4)`}>
                      <circle r={9} cx={9} cy={9} fill={HIT_RING} />
                      <text x={9} y={12} textAnchor="middle" className="fill-white text-[8px] font-bold">{hitCount}</text>
                    </g>
                  )}
                  {node.linkCount != null && node.linkCount > 0 && hitCount === 0 && (
                    <g transform={`translate(${NODE_W - 18}, 6)`}>
                      <circle r={9} cx={9} cy={9} fill={node.customerEntity ? "#A953DF" : "#39B9ED"} />
                      <text x={9} y={12} textAnchor="middle" className="fill-white text-[9px] font-bold">{node.linkCount}</text>
                    </g>
                  )}
                  {node.collapsible && (
                    <g
                      transform={`translate(6, ${NODE_H / 2 - 8})`}
                      onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                      className="cursor-pointer"
                    >
                      {collapsed.has(node.id)
                        ? <ChevronRight size={14} className="text-muted" />
                        : <ChevronDown size={14} className="text-muted" />}
                    </g>
                  )}
                  <text x={NODE_W / 2} y={48} textAnchor="middle" className="fill-ink text-[10px] font-semibold">
                    {node.name.length > 18 ? `${node.name.slice(0, 16)}…` : node.name}
                  </text>
                  <text x={NODE_W / 2} y={62} textAnchor="middle" className="fill-[#8F9BAA] text-[8.5px]">
                    {node.customerEntity ? "Customer entity" : isExternal ? "External · OSINT" : node.role.split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-panel/95 border border-line rounded-lg p-1 shadow-lg">
          <button type="button" className="p-2 hover:bg-panel2 rounded-md text-muted" onClick={() => zoom(0.12)} title="Zoom in"><Plus size={14} /></button>
          <button type="button" className="p-2 hover:bg-panel2 rounded-md text-muted" onClick={() => zoom(-0.12)} title="Zoom out"><Minus size={14} /></button>
          <button type="button" className="p-2 hover:bg-panel2 rounded-md text-muted" onClick={fitView} title="Reset view"><Maximize2 size={14} /></button>
        </div>

        <div className="absolute bottom-3 left-3 text-[10px] text-faint flex items-center gap-1">
          <ZoomIn size={12} /> Drag to pan · scroll to zoom · click node for details
        </div>

        {selected && <OwnershipDetailPanel node={selected} onClose={() => setSelectedId(null)} />}
      </div>

      <div className="px-4 py-3 border-t border-lineSoft bg-panel2/40 text-[11px] text-muted flex flex-wrap gap-x-4 gap-y-1">
        <span><b className="text-ink">UBOs:</b> {graph.uboSummary}</span>
        <span><b className="text-ink">Verification:</b> {input.uboStatus.replace("_", " ")}</span>
        <span><b className="text-ink">Incorporation:</b> {input.incorpCountry}</span>
      </div>
    </Card>
  );
}
