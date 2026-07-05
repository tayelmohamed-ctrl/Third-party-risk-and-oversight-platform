/**
 * Bridge legacy CRAM Test Bench capture → RBM multi-factor assessment.
 * Uses Master Risk Registry Service as single source of truth.
 */
import type { CompliancePerimeter, CorridorFilter } from "../config/perimeters";
import type { AssessmentCapture } from "../engine/dataQualityGate";
import { scoreFromActivityRegister } from "../engine/rbm/scoreRbm";
import {
  lookupProductById,
  lookupProduct,
} from "../registries/master/registryService";
import { corridorFilterToRegistryId } from "./rbmCorridorMap";
import { inferKybProductsFromProductName } from "../config/kybDocumentMatrix";

/** Map Test Bench product dropdown → Master Registry product ID. */
export function rbmProductIdFromCapture(productName: string, perimeter: CompliancePerimeter): string {
  const direct = lookupProduct(productName, perimeter);
  if (direct) return direct.entry.id;

  const name = productName.toLowerCase();
  if (perimeter === "global_account") return "PRD-GLOBAL-ACCOUNT";
  if (name.includes("international") || name.includes("remittance") || name.includes("virtual")) {
    return "PRD-INTL-TRANSFER";
  }
  const kyb = inferKybProductsFromProductName(productName);
  if (kyb.includes("global_account")) return "PRD-GLOBAL-ACCOUNT";
  return "PRD-UAE-CURRENT";
}

export function inferUseCaseId(capture: AssessmentCapture): string {
  if (capture.useCaseId) return capture.useCaseId;
  const blob = `${capture.product} ${capture.activity} ${capture.service}`.toLowerCase();
  if (blob.includes("payroll") || blob.includes("salary")) return "payroll";
  if (blob.includes("trade finance") || blob.includes("invoice") || blob.includes("import") || blob.includes("export")) return "trade_finance";
  if (blob.includes("merchant") || blob.includes("marketplace") || blob.includes("gateway")) return "marketplace_settlement";
  if (blob.includes("investment") || blob.includes("treasury")) return "investment_treasury";
  return "operating_expenses";
}

export function legacyProductScoreFromRbm(productName: string, perimeter: CompliancePerimeter): 1 | 2 | 3 {
  const match = lookupProduct(productName, perimeter);
  if (match) return match.jurisdiction.cramScore as 1 | 2 | 3;
  const id = rbmProductIdFromCapture(productName, perimeter);
  const byId = lookupProductById(id, perimeter);
  const score = byId?.jurisdiction.cramScore ?? 2;
  if (score >= 3) return 3;
  if (score >= 2) return 2;
  return 1;
}

export function scoreCaptureWithRbm(
  capture: AssessmentCapture,
  perimeter: CompliancePerimeter,
  corridor: CorridorFilter = "all",
  useCaseId?: string,
) {
  const productId = rbmProductIdFromCapture(capture.product, perimeter);
  const corridorId = capture.corridorId ?? corridorFilterToRegistryId(perimeter, corridor);
  const resolvedUseCase = useCaseId ?? capture.useCaseId ?? inferUseCaseId(capture);

  return scoreFromActivityRegister({
    perimeter,
    mode: capture.mode,
    activityLabel: capture.activity,
    isicCode: capture.providedIsicCode || undefined,
    useCaseId: resolvedUseCase,
    corridorId,
    productId,
  });
}
