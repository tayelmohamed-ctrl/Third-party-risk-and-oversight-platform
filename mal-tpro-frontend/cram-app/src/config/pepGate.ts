/**
 * PEP gate — categorical control trigger (excluded from composite; floors via OVR-008 / OVR-016).
 * mal_bank → CBUAE Art. 15(14) · global_account → FinCEN/BSA PEP requirements.
 */
import type { CompliancePerimeter } from "./perimeters";
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
  /** Regulatory citation for audit trail */
  regulatoryBasis: string;
  /** @deprecated use regulatoryBasis */
  cbuaeBasis: string;
}

export interface PepGateContext {
  mathBand: Band;
  input: ScoreInput;
}

export function hasCrossBorderExposure(input: ScoreInput): boolean {
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  const sofMismatch = !!(input.sofName && input.residenceName && norm(input.sofName) !== norm(input.residenceName));
  const natMismatch = !!(input.nationalityName && input.residenceName && norm(input.nationalityName) !== norm(input.residenceName));
  return input.serviceScore >= 3 || input.productScore >= 3 || sofMismatch || natMismatch;
}

export function isPepHighRiskRelationship(pep: PepStatus, mathBand: Band, crossBorder: boolean): boolean {
  if (pep !== "Domestic" && pep !== "IO") return false;
  return mathBand !== "Low" || crossBorder;
}

export function pepTriggersEnhancedMeasures(
  pep: PepStatus,
  mathBand: Band,
  input: ScoreInput,
  perimeter: CompliancePerimeter = "mal_bank",
): boolean {
  if (pep === "Foreign") return true;
  if (perimeter === "global_account") {
    // US BaaS — enhanced due diligence for all PEP categories
    return pep === "Domestic" || pep === "IO";
  }
  if (pep === "Domestic" || pep === "IO") {
    return isPepHighRiskRelationship(pep, mathBand, hasCrossBorderExposure(input));
  }
  return false;
}

const NONE: Omit<PepGateDef, "relationshipHighRisk" | "crossBorderExposure" | "regulatoryBasis" | "cbuaeBasis"> = {
  score: 1,
  gateType: "clear",
  overrideHigh: false,
  mediumFloor: false,
  overrideId: null,
  eddTrigger: false,
  approvalNote: "Standard pathway",
};

const FOREIGN_HIGH: Omit<PepGateDef, "relationshipHighRisk" | "crossBorderExposure" | "regulatoryBasis" | "cbuaeBasis"> = {
  score: 3,
  gateType: "override",
  overrideHigh: true,
  mediumFloor: false,
  overrideId: "OVR-008",
  eddTrigger: true,
  approvalNote: "Foreign PEP · High floor · MLRO approval · EDD mandatory",
};

function withBasis(
  def: Omit<PepGateDef, "regulatoryBasis" | "cbuaeBasis"> & { status: PepStatus },
  regulatoryBasis: string,
): PepGateDef & { status: PepStatus } {
  return {
    ...def,
    relationshipHighRisk: def.relationshipHighRisk ?? false,
    crossBorderExposure: def.crossBorderExposure ?? false,
    regulatoryBasis,
    cbuaeBasis: regulatoryBasis,
  };
}

function resolveMalBankPep(pep: PepStatus, ctx?: PepGateContext): PepGateDef & { status: PepStatus } {
  const crossBorder = ctx ? hasCrossBorderExposure(ctx.input) : false;
  const mathBand = ctx?.mathBand ?? "Low";

  if (pep === "None") {
    return { status: pep, ...NONE, relationshipHighRisk: false, crossBorderExposure: false, regulatoryBasis: "Not a PEP", cbuaeBasis: "Not a PEP" };
  }

  if (pep === "Foreign") {
    return withBasis(
      { status: pep, ...FOREIGN_HIGH, relationshipHighRisk: true, crossBorderExposure: crossBorder, approvalNote: "Foreign PEP · High floor · MLRO approval · EDD mandatory (Art. 15 First)" },
      "CBUAE Art. 15(14) First — Foreign PEP · automatic enhanced measures",
    );
  }

  const ioLabel = pep === "IO" ? "International-organization" : "Domestic";
  const highRiskRel = isPepHighRiskRelationship(pep, mathBand, crossBorder);

  if (highRiskRel) {
    return withBasis(
      {
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
      },
      "CBUAE Art. 15(14) Second — enhanced measures apply (high-risk business relationship)",
    );
  }

  return withBasis(
    {
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
    },
    "CBUAE Art. 15(14) Second — identification only; no automatic High/Medium floor",
  );
}

function resolveUsPep(pep: PepStatus, ctx?: PepGateContext): PepGateDef & { status: PepStatus } {
  const crossBorder = ctx ? hasCrossBorderExposure(ctx.input) : false;
  const mathBand = ctx?.mathBand ?? "Low";

  if (pep === "None") {
    return { status: pep, ...NONE, relationshipHighRisk: false, crossBorderExposure: false, regulatoryBasis: "Not a PEP", cbuaeBasis: "Not a PEP" };
  }

  if (pep === "Foreign") {
    return withBasis(
      {
        status: pep,
        ...FOREIGN_HIGH,
        approvalNote: "Foreign PEP · High floor · EDD mandatory · FinCEN SAR review",
        relationshipHighRisk: true,
        crossBorderExposure: crossBorder,
      },
      "FinCEN CDD Rule · 31 CFR 1010.520 — foreign PEP requires enhanced due diligence",
    );
  }

  const label = pep === "IO" ? "International-organization PEP" : "Domestic PEP";
  const highRiskRel = mathBand !== "Low" || crossBorder;

  if (highRiskRel) {
    return withBasis(
      {
        status: pep,
        score: 2,
        gateType: "enhanced",
        overrideHigh: false,
        mediumFloor: true,
        overrideId: "OVR-016",
        eddTrigger: true,
        approvalNote: `${label} · enhanced due diligence · US MSB programme`,
        relationshipHighRisk: true,
        crossBorderExposure: crossBorder,
      },
      "FinCEN CDD Rule · domestic/IO PEP — enhanced due diligence when high-risk relationship or cross-border nexus",
    );
  }

  return withBasis(
    {
      status: pep,
      score: 1,
      gateType: "identify",
      overrideHigh: false,
      mediumFloor: false,
      overrideId: null,
      eddTrigger: true,
      approvalNote: `${label} identified · enhanced monitoring · EDD per Zenus programme`,
      relationshipHighRisk: false,
      crossBorderExposure: crossBorder,
    },
    "FinCEN CDD Rule · PEP identification — enhanced due diligence and ongoing monitoring",
  );
}

export function resolvePepGate(
  pep: PepStatus,
  ctx?: PepGateContext,
  perimeter: CompliancePerimeter = "mal_bank",
): PepGateDef & { status: PepStatus } {
  return perimeter === "global_account" ? resolveUsPep(pep, ctx) : resolveMalBankPep(pep, ctx);
}

export function pepOverrideRationale(
  pep: PepStatus,
  relationshipHighRisk: boolean,
  perimeter: CompliancePerimeter,
): string {
  if (pep === "Foreign") {
    return perimeter === "global_account"
      ? "Foreign PEP — FinCEN CDD Rule · automatic enhanced measures"
      : "Foreign PEP — CBUAE Art. 15(14) First · automatic enhanced measures";
  }
  if ((pep === "Domestic" || pep === "IO") && relationshipHighRisk) {
    const label = pep === "IO" ? "International-organization PEP" : "Domestic PEP";
    return perimeter === "global_account"
      ? `${label} — high-risk relationship (FinCEN CDD Rule)`
      : `${label} — high-risk business relationship (CBUAE Art. 15 Second)`;
  }
  return "";
}

export function pepAuditShare(pep: PepStatus, mode: "individual" | "entity", gateScore?: Score): number {
  const legacyWeight = mode === "individual" ? 0.18 : 0.16;
  const def = resolvePepGate(pep);
  const score = gateScore ?? def.score;
  return score * legacyWeight * 0.25;
}
