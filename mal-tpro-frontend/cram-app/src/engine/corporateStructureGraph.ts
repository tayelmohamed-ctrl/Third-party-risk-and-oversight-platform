/**
 * Corporate structure & UBO graph — supporting evidence only (no scoring impact).
 * Generates nodes/edges from entity capture fields already on the CRAM test bench.
 */
import type { PepStatus, ScreenResult, AdverseResult } from "./types";
import type { UboVerificationStatus } from "./activityProfile";
import type { KycQualityContext } from "./dataQualityGate";
import {
  holdingRiskBand, scanUboNetwork, type OnlineSearchHit, type UboNetworkScan,
} from "./uboNetworkIntel";

export type StructureNodeKind = "company" | "person";
export type StructureEdgeKind = "OWNS" | "PARENT_OF" | "BENEFICIAL_OWNER_OF" | "CONTROLS";

export type StructureRiskBand = "Low" | "Medium" | "High";

export interface StructureNode {
  id: string;
  kind: StructureNodeKind;
  name: string;
  role: string;
  country: string;
  tier: number;
  riskBand: StructureRiskBand;
  customerEntity?: boolean;
  ownershipPct?: number;
  entityType?: string;
  customerId?: string;
  customerType?: string;
  kycStatus?: string;
  verificationStatus?: string;
  screeningSummary?: string;
  lastReviewed?: string;
  pepStatus?: string;
  linkCount?: number;
  collapsible?: boolean;
  parentId?: string;
  /** External registry / OSINT company (not part of assessed entity tree) */
  externalHolding?: boolean;
  onlineHits?: OnlineSearchHit[];
  uboOwnerId?: string;
}

export interface StructureEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: StructureEdgeKind;
  pct?: number;
}

export interface CorporateStructureGraph {
  nodes: StructureNode[];
  edges: StructureEdge[];
  layers: number;
  complexityLabel: string;
  uboSummary: string;
  /** UBO cross-company network from registry / online search (evidence only) */
  networkScan: UboNetworkScan;
}

export interface EntityStructureInput {
  customerId: string;
  customerName: string;
  entityType: string;
  segment: string;
  lifecycle: "New" | "Existing";
  ownership: string;
  uboStatus: UboVerificationStatus;
  uboCountry: string;
  incorpCountry: string;
  opcoCountry: string;
  pep: PepStatus;
  sanctions: ScreenResult;
  watchlist: "Clear" | "True Match";
  adverse: AdverseResult;
  kyc: KycQualityContext;
  lastReviewDate?: string | null;
}

export interface PositionedNode extends StructureNode {
  x: number;
  y: number;
}

const PERSON_NAMES: Record<string, { primary: string; secondary?: string; nominee?: string }> = {
  "Direct — 1 layer": { primary: "Ahmed Hassan Al-Mansoori" },
  "2 layers": { primary: "Sarah Chen", secondary: "Rajesh Mehta" },
  "3+ layers (complex)": { primary: "Michael Ali Black", secondary: "Jane Smith" },
  "Nominee / opaque": { primary: "Emily X Whit", nominee: "Gulf Nominees Ltd" },
};

function uboRiskBand(status: UboVerificationStatus, country: string): StructureRiskBand {
  if (status === "refused" || status === "complex_pending") return "High";
  if (status === "verified") return country.includes("Emirates") ? "Low" : "Medium";
  return "Medium";
}

function screeningLabel(s: ScreenResult, w: string, a: AdverseResult): string {
  const parts: string[] = [];
  parts.push(s === "Clear" ? "Sanctions clear" : `Sanctions: ${s}`);
  parts.push(w === "Clear" ? "Watchlist clear" : "Watchlist hit");
  if (a !== "None") parts.push(`Adverse: ${a}`);
  return parts.join(" · ");
}

function kycLabel(kyc: KycQualityContext): string {
  if (!kyc.identityVerified) return "Identity unverified";
  return kyc.livenessPass ? "KYC verified · liveness pass" : "KYC verified";
}

function verificationLabel(status: UboVerificationStatus): string {
  const m: Record<UboVerificationStatus, string> = {
    verified: "Verified",
    complex_pending: "Pending — complex structure",
    refused: "Refused / unable to verify",
    listed_exempt: "Listed / exempt",
    na: "N/A",
  };
  return m[status] ?? status;
}

function personNode(
  id: string,
  name: string,
  role: string,
  country: string,
  tier: number,
  risk: StructureRiskBand,
  meta: Partial<StructureNode>,
): StructureNode {
  return { id, kind: "person", name, role, country, tier, riskBand: risk, ...meta };
}

function companyNode(
  id: string,
  name: string,
  role: string,
  country: string,
  tier: number,
  meta: Partial<StructureNode>,
): StructureNode {
  return { id, kind: "company", name, role, country, tier, riskBand: "Low", ...meta };
}

export function buildEntityStructureGraph(input: EntityStructureInput): CorporateStructureGraph {
  const nodes: StructureNode[] = [];
  const edges: StructureEdge[] = [];
  const names = PERSON_NAMES[input.ownership] ?? PERSON_NAMES["Direct — 1 layer"];
  const uboRisk = uboRiskBand(input.uboStatus, input.uboCountry);
  const sharedMeta = {
    customerId: input.customerId,
    customerType: `Entity · ${input.segment}`,
    kycStatus: kycLabel(input.kyc),
    verificationStatus: verificationLabel(input.uboStatus),
    screeningSummary: screeningLabel(input.sanctions, input.watchlist, input.adverse),
    lastReviewed: input.lastReviewDate ?? input.kyc.lastKycRefreshAt?.slice(0, 10) ?? "—",
    pepStatus: input.pep,
  };

  const customer = companyNode("customer", input.customerName, "Customer entity (assessed)", input.incorpCountry, 2, {
    customerEntity: true,
    entityType: input.entityType,
    linkCount: 2,
    ...sharedMeta,
  });
  nodes.push(customer);

  if (input.ownership === "Direct — 1 layer") {
    const ubo = personNode("ubo-1", names.primary, "Ultimate beneficial owner", input.uboCountry, 3, uboRisk, {
      ownershipPct: 100,
      linkCount: 1,
      ...sharedMeta,
    });
    nodes.push(ubo);
    edges.push({ id: "e-ubo-cust", from: "ubo-1", to: "customer", label: "BENEFICIAL_OWNER_OF · 100%", kind: "BENEFICIAL_OWNER_OF", pct: 100 });
  } else if (input.ownership === "2 layers") {
    const holding = companyNode("holding-1", `${input.customerName.split(" ")[0] ?? "Gulf"} Holdings Ltd`, "Intermediate holding", input.incorpCountry, 1, {
      entityType: "Holding Company",
      collapsible: true,
      linkCount: 2,
      ...sharedMeta,
    });
    nodes.push(holding);
    edges.push({ id: "e-h-c", from: "holding-1", to: "customer", label: "OWNS · 100%", kind: "OWNS", pct: 100 });
    edges.push({ id: "e-h-p", from: "holding-1", to: "customer", label: "PARENT_OF", kind: "PARENT_OF" });

    const ubo = personNode("ubo-1", names.primary, "Ultimate beneficial owner", input.uboCountry, 3, uboRisk, {
      ownershipPct: 100,
      linkCount: 1,
      ...sharedMeta,
    });
    nodes.push(ubo);
    edges.push({ id: "e-ubo-h", from: "ubo-1", to: "holding-1", label: "BENEFICIAL_OWNER_OF · 100%", kind: "BENEFICIAL_OWNER_OF", pct: 100 });
  } else if (input.ownership === "3+ layers (complex)") {
    const parent = companyNode("parent-1", "XYZ Holdings Ltd", "Parent / group", "United Kingdom", 0, {
      entityType: "Holding Company",
      collapsible: true,
      linkCount: 2,
      ...sharedMeta,
    });
    const mid = companyNode("holding-1", "ABC Intermediate FZE", "Intermediate holding · free zone", input.incorpCountry, 1, {
      entityType: "Commercial Free Zone Establishment (FZE / FZ-LLC)",
      collapsible: true,
      parentId: "parent-1",
      linkCount: 2,
      ...sharedMeta,
    });
    nodes.push(parent, mid);
    edges.push({ id: "e-p-m", from: "parent-1", to: "holding-1", label: "OWNS · 80%", kind: "OWNS", pct: 80 });
    edges.push({ id: "e-m-c", from: "holding-1", to: "customer", label: "OWNS · 100%", kind: "OWNS", pct: 100 });
    edges.push({ id: "e-p-p", from: "parent-1", to: "holding-1", label: "PARENT_OF", kind: "PARENT_OF" });

    const ubo1 = personNode("ubo-1", names.primary, "Ultimate beneficial owner", input.uboCountry, 3, "High", {
      ownershipPct: 60,
      linkCount: 1,
      ...sharedMeta,
    });
    const ubo2 = personNode("ubo-2", names.secondary ?? "Jane Smith", "Co-beneficial owner", "United Arab Emirates", 3, "Medium", {
      ownershipPct: 25,
      linkCount: 1,
      ...sharedMeta,
    });
    nodes.push(ubo1, ubo2);
    edges.push({ id: "e-u1-p", from: "ubo-1", to: "parent-1", label: "BENEFICIAL_OWNER_OF · 60%", kind: "BENEFICIAL_OWNER_OF", pct: 60 });
    edges.push({ id: "e-u2-p", from: "ubo-2", to: "parent-1", label: "BENEFICIAL_OWNER_OF · 25%", kind: "BENEFICIAL_OWNER_OF", pct: 25 });
    edges.push({ id: "e-c1", from: "ubo-1", to: "customer", label: "CONTROLS", kind: "CONTROLS" });
  } else {
    const nominee = companyNode("nominee-1", names.nominee ?? "Registered Nominee Ltd", "Nominee shareholder", input.incorpCountry, 2, {
      entityType: "Nominee company",
      linkCount: 2,
      ...sharedMeta,
    });
    const ubo = personNode("ubo-1", names.primary, "Ultimate beneficial owner (behind nominee)", input.uboCountry, 3, "High", {
      ownershipPct: 100,
      linkCount: 1,
      ...sharedMeta,
    });
    nodes.push(nominee, ubo);
    edges.push({ id: "e-n-c", from: "nominee-1", to: "customer", label: "OWNS · 100%", kind: "OWNS", pct: 100 });
    edges.push({ id: "e-u-c", from: "ubo-1", to: "customer", label: "BENEFICIAL_OWNER_OF · 100%", kind: "BENEFICIAL_OWNER_OF", pct: 100 });
    edges.push({ id: "e-u-n", from: "ubo-1", to: "nominee-1", label: "CONTROLS", kind: "CONTROLS" });
  }

  const uboPersons = nodes.filter((n) => n.kind === "person").map((n) => ({ id: n.id, name: n.name }));
  const networkScan = scanUboNetwork({
    uboPersons,
    ownership: input.ownership,
    sanctions: input.sanctions,
    watchlist: input.watchlist,
    adverse: input.adverse,
  });

  const EXTERNAL_TIER = 4;
  for (const ctx of networkScan.contexts) {
    for (const holding of ctx.holdings) {
      const risk = holdingRiskBand(holding);
      nodes.push(companyNode(holding.id, holding.company, holding.role, holding.country, EXTERNAL_TIER, {
        entityType: "External holding (OSINT)",
        externalHolding: true,
        ownershipPct: holding.ownershipPct,
        onlineHits: holding.hits,
        uboOwnerId: ctx.uboNodeId,
        riskBand: risk,
        linkCount: holding.hits.length,
        screeningSummary: holding.hits.length
          ? holding.hits.map((h) => h.summary).slice(0, 2).join(" · ")
          : "Registry link — no OSINT hits",
      }));
      edges.push({
        id: `e-ext-${ctx.uboNodeId}-${holding.id}`,
        from: ctx.uboNodeId,
        to: holding.id,
        label: `OWNS · ${holding.ownershipPct}%`,
        kind: "OWNS",
        pct: holding.ownershipPct,
      });
      if (holding.parentOf) {
        edges.push({
          id: `e-ext-parent-${holding.id}-${holding.parentOf}`,
          from: holding.id,
          to: holding.parentOf,
          label: "PARENT_OF",
          kind: "PARENT_OF",
        });
      }
    }
  }

  const layers = Math.max(...nodes.map((n) => n.tier)) + 1;
  const uboNames = uboPersons.map((p) => p.name).join(", ");
  const complexityLabel = input.ownership;

  return {
    nodes,
    edges,
    layers,
    complexityLabel,
    uboSummary: uboNames || "—",
    networkScan,
  };
}

const NODE_W = 132;
const NODE_H = 72;
const ROW_GAP = 108;
const COL_GAP = 48;
const PAD = 40;

export function layoutStructureGraph(
  graph: CorporateStructureGraph,
  collapsed: ReadonlySet<string>,
): { nodes: PositionedNode[]; edges: StructureEdge[]; width: number; height: number } {
  const hidden = new Set<string>();
  for (const id of collapsed) {
    hidden.add(id);
    const hideOwners = (nodeId: string) => {
      graph.edges.filter((e) => e.to === nodeId).forEach((e) => {
        if (!hidden.has(e.from)) {
          hidden.add(e.from);
          hideOwners(e.from);
        }
      });
    };
    hideOwners(id);
  }

  const visibleNodes = graph.nodes.filter((n) => !hidden.has(n.id));
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = graph.edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to));

  const tiers = [...new Set(visibleNodes.map((n) => n.tier))].sort((a, b) => a - b);
  const positioned: PositionedNode[] = [];

  for (const tier of tiers) {
    const row = visibleNodes.filter((n) => n.tier === tier);
    const rowW = row.length * NODE_W + (row.length - 1) * COL_GAP;
    row.forEach((n, i) => {
      positioned.push({
        ...n,
        x: PAD + i * (NODE_W + COL_GAP) + (Math.max(0, (3 - row.length)) * (NODE_W + COL_GAP)) / 2,
        y: PAD + tier * ROW_GAP,
      });
    });
  }

  const maxTier = tiers.length ? Math.max(...tiers) : 0;
  const maxRow = Math.max(...tiers.map((t) => visibleNodes.filter((n) => n.tier === t).length), 1);
  const width = Math.max(PAD * 2 + maxRow * NODE_W + (maxRow - 1) * COL_GAP, 520);
  const height = PAD * 2 + maxTier * ROW_GAP + NODE_H + 20;

  return { nodes: positioned, edges: visibleEdges, width, height };
}

export const STRUCTURE_LAYOUT = { NODE_W, NODE_H, ROW_GAP, COL_GAP, PAD };
