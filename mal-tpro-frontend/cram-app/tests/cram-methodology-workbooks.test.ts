import { describe, expect, it } from "vitest";
import {
  buildCountryRiskWorkbook,
  buildCrBaselWorkbook,
  buildCrFatfWorkbook,
  buildCrSafeHavenWorkbook,
  buildCrSanctionsWorkbook,
  buildCustomerTypeRiskWorkbook,
  buildDeliveryChannelRiskWorkbook,
  buildReviewPeriodicityWorkbook,
  buildTransactionInvestigationWorkbook,
  METHODOLOGY_EXCEL_EXPORTS,
} from "../src/lib/cramMethodologyWorkbookBuilder";

function hasFormula(cell: unknown): boolean {
  return typeof cell === "object" && cell !== null && "formula" in cell;
}

describe("CRAM methodology Excel workbooks", () => {
  it("registers all pillar exports", () => {
    expect(METHODOLOGY_EXCEL_EXPORTS.length).toBe(9);
    expect(METHODOLOGY_EXCEL_EXPORTS.map((e) => e.kind)).toContain("country");
    expect(METHODOLOGY_EXCEL_EXPORTS.map((e) => e.kind)).toContain("review-periodicity");
  });

  it("country risk workbook has composite formula on UAE row", async () => {
    const wb = await buildCountryRiskWorkbook();
    const ws = wb.getWorksheet("Country Risk")!;
    const uaeRow = 13;
    expect(ws.getCell(uaeRow, 1).value).toBe("United Arab Emirates");
    expect(hasFormula(ws.getCell(uaeRow, 6).value)).toBe(true);
    const f = (ws.getCell(uaeRow, 6).value as { formula: string }).formula;
    expect(f).toContain("ROUND(B13*0.3");
  });

  it("CR FATF workbook includes mapping and test scores", async () => {
    const wb = await buildCrFatfWorkbook();
    const ws = wb.getWorksheet("CR FATF")!;
    expect(ws.getCell(8, 1).value).toMatch(/Normal/);
    expect(hasFormula(ws.getCell(15, 4).value)).toBe(true);
  });

  it("CR BASEL workbook includes score bands", async () => {
    const wb = await buildCrBaselWorkbook();
    const ws = wb.getWorksheet("CR BASEL")!;
    expect(ws.getCell(7, 4).value).toBe(1);
    expect(ws.getCell(9, 4).value).toBe(3);
  });

  it("CR Sanctions lists Category A countries", async () => {
    const wb = await buildCrSanctionsWorkbook();
    const ws = wb.getWorksheet("CR Sanctions Program")!;
    const names = new Set<string>();
    ws.eachRow((row) => {
      const v = row.getCell(2).value;
      if (typeof v === "string") names.add(v);
    });
    expect(names.has("Iran")).toBe(true);
    expect(names.has("North Korea")).toBe(true);
  });

  it("CR Safe Haven lists 25 jurisdictions at score 3", async () => {
    const wb = await buildCrSafeHavenWorkbook();
    const ws = wb.getWorksheet("CR Safe Heaven")!;
    let count = 0;
    ws.eachRow((row, n) => {
      if (n >= 9 && row.getCell(3).value === 3) count += 1;
    });
    expect(count).toBe(25);
  });

  it("customer type workbook sums NP parameters", async () => {
    const wb = await buildCustomerTypeRiskWorkbook();
    const ws = wb.getWorksheet("Individual (NP)")!;
    let sumRow = 0;
    ws.eachRow((row, n) => {
      if (row.getCell(1).value === "Customer type score") sumRow = n;
    });
    expect(sumRow).toBeGreaterThan(0);
    expect(hasFormula(ws.getCell(sumRow, 6).value)).toBe(true);
  });

  it("delivery channel uses MAX pillar formula", async () => {
    const wb = await buildDeliveryChannelRiskWorkbook();
    const ws = wb.getWorksheet("Delivery Channel Risk")!;
    let sumRow = 0;
    ws.eachRow((row, n) => {
      if (row.getCell(1).value === "CRAM channel pillar (max score)") sumRow = n;
    });
    const f = (ws.getCell(sumRow, 3).value as { formula: string }).formula;
    expect(f).toMatch(/^=MAX\(/);
  });

  it("transaction investigation calculates from counts", async () => {
    const wb = await buildTransactionInvestigationWorkbook();
    const ws = wb.getWorksheet("Transaction Investigation")!;
    let calcRow = 0;
    ws.eachRow((row, n) => {
      if (row.getCell(1).value === "Enter counts →") calcRow = n;
    });
    expect(hasFormula(ws.getCell(calcRow + 1, 2).value)).toBe(true);
    expect(hasFormula(ws.getCell(calcRow + 3, 2).value)).toBe(true);
  });

  it("review periodicity includes EDATE formulas", async () => {
    const wb = await buildReviewPeriodicityWorkbook();
    const ws = wb.getWorksheet("Review Periodicity")!;
    expect(hasFormula(ws.getCell(9, 4).value)).toBe(true);
    expect(ws.getCell(9, 2).value).toBe(12);
    expect(ws.getCell(11, 2).value).toBe(60);
  });
});
