/**
 * PEP gate — categorical control trigger (CBUAE/FATF).
 * PEP does not contribute to customer-type composite; floors via OVR-008 / OVR-016 only.
 */
import type { PepStatus, Score } from "../engine/types";

export type PepGateType = "clear" | "enhanced" | "override";

export interface PepGateDef {
  score: Score;
  gateType: PepGateType;
  overrideHigh: boolean;
  mediumFloor: boolean;
  overrideId: "OVR-008" | "OVR-016" | null;
  eddTrigger: boolean;
  approvalNote: string;
}

const PEP_GATE: Record<PepStatus, PepGateDef> = {
  None: {
    score: 1,
    gateType: "clear",
    overrideHigh: false,
    mediumFloor: false,
    overrideId: null,
    eddTrigger: false,
    approvalNote: "Standard pathway",
  },
  Domestic: {
    score: 2,
    gateType: "enhanced",
    overrideHigh: false,
    mediumFloor: true,
    overrideId: "OVR-016",
    eddTrigger: true,
    approvalNote: "Medium floor · enhanced PEP controls",
  },
  Foreign: {
    score: 3,
    gateType: "override",
    overrideHigh: true,
    mediumFloor: false,
    overrideId: "OVR-008",
    eddTrigger: true,
    approvalNote: "High floor · MLRO approval · EDD mandatory",
  },
  IO: {
    score: 3,
    gateType: "override",
    overrideHigh: true,
    mediumFloor: false,
    overrideId: "OVR-008",
    eddTrigger: true,
    approvalNote: "High floor · MLRO approval · EDD mandatory",
  },
};

export function resolvePepGate(pep: PepStatus): PepGateDef & { status: PepStatus } {
  const def = PEP_GATE[pep] ?? PEP_GATE.None;
  return { status: pep, ...def };
}

/** Hypothetical composite share if PEP were still weighted — audit transparency only. */
export function pepAuditShare(pep: PepStatus, mode: "individual" | "entity"): number {
  const legacyWeight = mode === "individual" ? 0.18 : 0.16;
  const def = PEP_GATE[pep] ?? PEP_GATE.None;
  return def.score * legacyWeight * 0.25;
}
