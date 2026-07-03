/**
 * PEP gate — categorical control trigger (CBUAE Art. 15(14) · FATF Rec. 12).
 * PEP does not contribute to customer-type composite; floors via OVR-008 / OVR-016 only.
 *
 * CBUAE Art. 15(14) First — Foreign PEPs: enhanced measures apply automatically.
 * CBUAE Art. 15(14) Second — Domestic PEPs and international-organization PEPs:
 *   identify the person first; Art. 15(b–d) measures only when a high-risk business relationship exists.
 */
import type { Band, PepStatus, Score, ScoreInput } from "../engine/types";

export type PepGateType = "clear" | "identify" | "enhanced" | "override";

export interface PepGateDef {
  score: Score;
  gateType: PepGateType;
  overrideHigh: boolean;
  mediumFloor: boolean;
  overrideId: "OVR-008" | "OVR-016" | null;
  eddTrigger: boolean;
  approvalNote: string;
  relationshipHighRisk: boolean;
  crossBorderExposure: boolean;
  cbuaeBasis: string;
}

export interface PepGateContext {
  mathBand: Band;
  input: ScoreInput;
}

/** Cross-border nexus — elevates domestic/IO PEP to high-risk relationship per CBUAE Art. 15 Second + FATF cross-border guidance. */
export function hasCrossBorderExposure(input: ScoreInput): boolean {
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  const sofMismatch = !!(input.sofName && input.residenceName && norm(input.sofName) !== norm(input.residenceName));
  const natMismatch = !!(input.nationalityName && input.residenceName && norm(input.nationalityName) !== norm(input.residenceName));
  return input.serviceScore >= 3 || input.productScore >= 3 || sofMismatch || natMismatch;
}

/** Domestic / IO PEP — enhanced measures only when composite or cross-border indicates high-risk relationship. */
export function isPepHighRiskRelationship(pep: PepStatus, mathBand: Band, crossBorder: boolean): boolean {
  if (pep !== "Domestic" && pep !== "IO") return false;
  return mathBand !== "Low" || crossBorder;
}

export function pepTriggersEnhancedMeasures(pep: PepStatus, mathBand: Band, input: ScoreInput): boolean {
  if (pep === "Foreign") return true;
  if (pep === "Domestic" || pep === "IO") return isPepHighRiskRelationship(pep, mathBand, hasCrossBorderExposure(input));
  return false;
}

const NONE: Omit<PepGateDef, "relationshipHighRisk" | "crossBorderExposure" | "cbuaeBasis"> = {
  score: 1,
  gateType: "clear",
  overrideHigh: false,
  mediumFloor: false,
  overrideId: null,
  eddTrigger: false,
  approvalNote: "Standard pathway",
};

const FOREIGN: Omit<PepGateDef, "relationshipHighRisk" | "crossBorderExposure" | "cbuaeBasis"> = {
  score: 3,
  gateType: "override",
  overrideHigh: true,
  mediumFloor: false,
  overrideId: "OVR-008",
  eddTrigger: true,
  approvalNote: "Foreign PEP · High floor · MLRO approval · EDD mandatory (Art. 15 First)",
};

export function resolvePepGate(pep: PepStatus, ctx?: PepGateContext): PepGateDef & { status: PepStatus } {
  const crossBorder = ctx ? hasCrossBorderExposure(ctx.input) : false;
  const mathBand = ctx?.mathBand ?? "Low";

  if (pep === "None") {
    return { status: pep, ...NONE, relationshipHighRisk: false, crossBorderExposure: false, cbuaeBasis: "Not a PEP" };
  }

  if (pep === "Foreign") {
    return {
      status: pep,
      ...FOREIGN,
      relationshipHighRisk: true,
      crossBorderExposure: crossBorder,
      cbuaeBasis: "CBUAE Art. 15(14) First — Foreign PEP · automatic enhanced measures",
    };
  }

  const ioLabel = pep === "IO" ? "International-organization" : "Domestic";
  const highRiskRel = isPepHighRiskRelationship(pep, mathBand, crossBorder);

  if (highRiskRel) {
    return {
      status: pep,
      score: 2,
      gateType: "enhanced",
      overrideHigh: false,
      mediumFloor: true,
      overrideId: "OVR-016",
      eddTrigger: true,
      approvalNote: `${ioLabel} PEP · high-risk relationship${crossBorder ? " · cross-border" : ""} · Art. 15(b–d)`,
      relationshipHighRisk: true,
      crossBorderExposure: crossBorder,
      cbuaeBasis: "CBUAE Art. 15(14) Second — enhanced measures apply (high-risk business relationship)",
    };
  }

  return {
    status: pep,
    score: 1,
    gateType: "identify",
    overrideHigh: false,
    mediumFloor: false,
    overrideId: null,
    eddTrigger: false,
    approvalNote: `${ioLabel} PEP identified · not presumed high risk — standard CDD unless relationship escalates`,
    relationshipHighRisk: false,
    crossBorderExposure: crossBorder,
    cbuaeBasis: "CBUAE Art. 15(14) Second — identification only; no automatic High/Medium floor",
  };
}

/** Hypothetical composite share if PEP were still weighted — audit transparency only. */
export function pepAuditShare(pep: PepStatus, mode: "individual" | "entity", gateScore?: Score): number {
  const legacyWeight = mode === "individual" ? 0.18 : 0.16;
  const def = resolvePepGate(pep);
  const score = gateScore ?? def.score;
  return score * legacyWeight * 0.25;
}
