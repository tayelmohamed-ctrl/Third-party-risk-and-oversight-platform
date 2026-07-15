/** Official CRAM methodology documents — served from Vite public/. */
import type { CompliancePerimeter } from "../config/perimeters";

export interface CramMethodologyDoc {
  url: string;
  filename: string;
  modelVersionId: string;
  label: string;
}

export const CRAM_METHODOLOGY_UAE: CramMethodologyDoc = {
  url: "/Mal_Customer_Risk_Assessment_Methodology_CBUAE_v1_1.pdf",
  filename: "Mal_Customer_Risk_Assessment_Methodology_CBUAE_v1_1.pdf",
  modelVersionId: "CRAM-CBUAE-2026-05-FREEZE-01",
  label: "CBUAE Digital Bank CRAM · Mal-MTH-CRA-01 v1.1",
};

export const CRAM_METHODOLOGY_US: CramMethodologyDoc = {
  url: "/Mal-CRAM-US-01_Customer_Risk_Assessment_Methodology_US_v1.0.pdf",
  filename: "Mal-CRAM-US-01_Customer_Risk_Assessment_Methodology_US_v1.0.pdf",
  modelVersionId: "CRAM-US-2026-07-FREEZE-03",
  label: "US MSB CRAM · Mal-CRAM-US-01 v1.0 (FREEZE-03)",
};

/** @deprecated Use CRAM_METHODOLOGY_UAE — kept for backward-compatible imports */
export const CRAM_METHODOLOGY_DOCX_URL = CRAM_METHODOLOGY_UAE.url;
/** @deprecated Use CRAM_METHODOLOGY_UAE — kept for backward-compatible imports */
export const CRAM_METHODOLOGY_DOCX_FILENAME = CRAM_METHODOLOGY_UAE.filename;

export function cramMethodologyDocForPerimeter(perimeter: CompliancePerimeter): CramMethodologyDoc {
  return perimeter === "global_account" ? CRAM_METHODOLOGY_US : CRAM_METHODOLOGY_UAE;
}

export async function exportCramMethodologyDocument(
  perimeter: CompliancePerimeter = "mal_bank",
): Promise<void> {
  const { url, filename } = cramMethodologyDocForPerimeter(perimeter);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Methodology document not found (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
