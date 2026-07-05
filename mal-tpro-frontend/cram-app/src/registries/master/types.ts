/**
 * Master Risk Registry — single source of truth types.
 * Regulations → ERA → Methodology → Master Registries → CRAM Engine
 */
import type { CompliancePerimeter } from "../../config/perimeters";
import type { Score } from "../../engine/types";

export type RegistryApprovalStatus = "approved" | "draft" | "retired";
export type RiskRatingLabel = "Very High" | "High" | "Medium" | "Low" | "Prohibited";

export interface RegistryAuditMeta {
  version: string;
  effectiveDate: string;
  approvalStatus: RegistryApprovalStatus;
  lastModified: string;
  approvedBy: string;
  sourceDocument: string;
  reviewDate: string;
}

export interface JurisdictionRisk {
  rating: RiskRatingLabel;
  /** CRAM engine score 1–3 (Low/Medium/High) */
  cramScore: Score;
  eddRequired: boolean;
  rationale: string;
}

export interface MasterBusinessActivity {
  id: string;
  activityName: string;
  isicCodes: string[];
  keywords: string[];
  uae: JurisdictionRisk;
  us: JurisdictionRisk;
  riskRationale: string;
  version: string;
  effectiveDate: string;
  approvalStatus: RegistryApprovalStatus;
  lastReviewDate: string;
  approvedBy: string;
  sourceDocument: string;
}

export interface MasterProduct {
  id: string;
  productName: string;
  uae: JurisdictionRisk;
  us: JurisdictionRisk;
  weight?: number;
  version: string;
  effectiveDate: string;
  approvalStatus: RegistryApprovalStatus;
  lastModified: string;
  approvedBy: string;
  sourceDocument: string;
  reviewDate: string;
}

export interface MasterUseCase {
  id: string;
  useCaseName: string;
  uae: JurisdictionRisk;
  us: JurisdictionRisk;
  version: string;
  effectiveDate: string;
  approvalStatus: RegistryApprovalStatus;
  lastModified: string;
  approvedBy: string;
  sourceDocument: string;
  reviewDate: string;
}

export interface MasterCorridor {
  id: string;
  originCountry: string;
  destinationCountry: string;
  fatfStatus: string;
  sanctionsStatus: string;
  uae: JurisdictionRisk;
  us: JurisdictionRisk;
  version: string;
  effectiveDate: string;
  approvalStatus: RegistryApprovalStatus;
  lastModified: string;
  approvedBy: string;
  sourceDocument: string;
  reviewDate: string;
}

export interface MasterCustomerType {
  id: string;
  segment: string;
  mode: "individual" | "entity" | "both";
  uae: JurisdictionRisk;
  us: JurisdictionRisk;
  version: string;
  effectiveDate: string;
  approvalStatus: RegistryApprovalStatus;
  lastModified: string;
  approvedBy: string;
  sourceDocument: string;
  reviewDate: string;
}

export interface RegistryLookupResult<T> {
  entry: T;
  jurisdiction: JurisdictionRisk;
  perimeter: CompliancePerimeter;
  matchType: "id" | "name" | "isic" | "keyword" | "default";
  matchDetail: string;
}

export interface MasterRegistryBundle {
  meta: RegistryAuditMeta;
  businessActivities: MasterBusinessActivity[];
  products: MasterProduct[];
  useCases: MasterUseCase[];
  corridors: MasterCorridor[];
  customerTypes: MasterCustomerType[];
}
