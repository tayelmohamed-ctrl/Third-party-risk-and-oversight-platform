import { describe, expect, it } from "vitest";
import {
  MAL_SME_PRODUCT_ASSESSMENTS,
  MAL_SME_SERVICE_ASSESSMENTS,
  PRODUCT_RISK_DRIVERS,
  SERVICE_RISK_DRIVERS,
  assessProduct,
  assessService,
  riskRateFromScore,
  weightedRiskScore,
} from "../src/config/malProductServiceRiskLibraries";

import { verifyWorkbookFormulas } from "../src/lib/cramRiskWorkbookBuilder";

describe("Mal product/service risk libraries", () => {
  it("product driver weights sum to 100%", () => {
    const sum = PRODUCT_RISK_DRIVERS.reduce((a, d) => a + d.weightPct, 0);
    expect(sum).toBe(100);
  });

  it("service driver weights sum to 100%", () => {
    const sum = SERVICE_RISK_DRIVERS.reduce((a, d) => a + d.weightPct, 0);
    expect(sum).toBe(100);
  });

  it("rates UAE IBAN as Medium and Global Account as High", () => {
    const uae = assessProduct(MAL_SME_PRODUCT_ASSESSMENTS.find((p) => p.id === "sme_uae_iban")!);
    const global = assessProduct(MAL_SME_PRODUCT_ASSESSMENTS.find((p) => p.id === "global_account_zenus")!);
    expect(uae.rate).toBe("Medium");
    expect(uae.score).toBeGreaterThan(1.0);
    expect(uae.score).toBeLessThanOrEqual(2.0);
    expect(global.rate).toBe("High");
    expect(global.score).toBeGreaterThan(2.0);
  });

  it("rates financing as Medium", () => {
    const fin = assessProduct(MAL_SME_PRODUCT_ASSESSMENTS.find((p) => p.id === "sme_financing")!);
    expect(fin.rate).toBe("Medium");
  });

  it("risk bands match workbook convention", () => {
    expect(riskRateFromScore(1.0)).toBe("Low");
    expect(riskRateFromScore(1.01)).toBe("Medium");
    expect(riskRateFromScore(2.0)).toBe("Medium");
    expect(riskRateFromScore(2.01)).toBe("High");
  });

  it("computes weighted score deterministically", () => {
    const item = MAL_SME_SERVICE_ASSESSMENTS[0];
    const a = weightedRiskScore(SERVICE_RISK_DRIVERS, item.drivers);
    const b = assessService(item).score;
    expect(a).toBe(b);
  });

  it("builds Excel workbooks with live formulas", async () => {
    expect(await verifyWorkbookFormulas("product")).toBe(true);
    expect(await verifyWorkbookFormulas("service")).toBe(true);
  });
});
