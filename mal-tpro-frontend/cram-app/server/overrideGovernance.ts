import { scoreCustomer } from "../src/engine/cram";
import type { Assessment, OverrideGovernanceRecord } from "../src/engine/rerating";
import type { Band, FinalRating } from "../src/engine/types";
import type { AuthUser } from "./auth/rbac";
import { hasCapability } from "./auth/rbac";

const ORDER: Record<Band | FinalRating, number> = { Low: 1, Medium: 2, High: 3, Prohibited: 4 };
const MIN_JUSTIFICATION = 20;

export type { OverrideGovernanceRecord };

export type GovernResult =
  | { ok: true; assessment: Assessment }
  | { ok: false; status: number; error: string; detail?: string };

function mandatoryFloorBand(floor: ReturnType<typeof scoreCustomer>["floor"]): Band {
  if (floor === "HIGH") return "High";
  if (floor === "MEDIUM") return "Medium";
  return "Low";
}

/** Server-side re-score + RBAC + non-dilution enforcement for manual MLRO overrides. */
export function governAssessmentSubmission(
  raw: Assessment & { overrideJustification?: string },
  user: AuthUser,
): GovernResult {
  const justification = (raw.overrideJustification ?? "").trim();
  const requested = raw.input?.manualOverride ?? "";
  const wantsOverride = requested !== "" && requested !== undefined;

  if (wantsOverride && !hasCapability(user.roles, "override")) {
    return {
      ok: false,
      status: 403,
      error: "forbidden",
      detail: "Manual override requires MLRO role (override capability)",
    };
  }

  if (wantsOverride && justification.length < MIN_JUSTIFICATION) {
    return {
      ok: false,
      status: 400,
      error: "justification_required",
      detail: `MLRO justification required (minimum ${MIN_JUSTIFICATION} characters)`,
    };
  }

  const fresh = scoreCustomer(raw.input, raw.boundary ?? "calculator");
  const floorBand = mandatoryFloorBand(fresh.floor);

  if (wantsOverride && fresh.finalRating === "Prohibited") {
    return {
      ok: false,
      status: 422,
      error: "non_dilution",
      detail: "Manual override cannot lift a Prohibited outcome or go below a prohibition floor",
    };
  }

  if (wantsOverride && ORDER[requested as Band] < ORDER[floorBand]) {
    return {
      ok: false,
      status: 422,
      error: "non_dilution",
      detail: `Override ${requested} is below mandatory floor ${floorBand} — downgrade blocked`,
    };
  }

  let finalRating: FinalRating = fresh.finalRating;
  let governance: OverrideGovernanceRecord | undefined;

  if (wantsOverride) {
    finalRating = requested as Band;
    governance = {
      requestedBand: requested as Band,
      appliedRating: finalRating,
      mathBand: fresh.mathBand,
      floor: fresh.floor,
      justification,
      approvedBy: user.email,
      roles: [...user.roles],
      nonDilutionEnforced: true,
      at: new Date().toISOString(),
    };
  }

  const assessment: Assessment = {
    ...raw,
    rating: finalRating,
    composite: fresh.composite,
    mathBand: fresh.mathBand,
    overrides: fresh.overrides,
    boundary: fresh.boundary,
    overrideJustification: wantsOverride ? justification : undefined,
    governance,
    actor: raw.actor?.includes("test bench") ? `${user.email} (test bench)` : user.email,
    input: { ...raw.input, manualOverride: wantsOverride ? (requested as Band) : "" },
  };

  return { ok: true, assessment };
}
