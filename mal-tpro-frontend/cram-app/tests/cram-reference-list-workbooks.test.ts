import { describe, expect, it } from "vitest";
import {
  buildCountryRiskListWorkbook,
  buildNatureOfBusinessListWorkbook,
  REFERENCE_LIST_EXPORTS,
} from "../src/lib/cramReferenceListWorkbookBuilder";
import highRiskIsic from "../src/data/isic_high_risk_classes.json";
import prohibitedIsic from "../src/data/isic_prohibited_activities.json";

function hasFormula(cell: unknown): boolean {
  return typeof cell === "object" && cell !== null && "formula" in cell;
}

describe("CRAM reference list Excel workbooks", () => {
  it("registers nature of business and country list exports", () => {
    expect(REFERENCE_LIST_EXPORTS.map((e) => e.kind)).toEqual(["nob-list", "country-list"]);
  });

  it("nature of business workbook has high-risk and prohibited sections", async () => {
    const wb = await buildNatureOfBusinessListWorkbook("individual");
    const ws = wb.getWorksheet("Nature of Business")!;
    let highBanner = false;
    let prohibBanner = false;
    ws.eachRow((row) => {
      const v = row.getCell(1).value;
      if (typeof v === "string" && v.includes("Section A — High-risk")) highBanner = true;
      if (typeof v === "string" && v.includes("Section B — Prohibited")) prohibBanner = true;
    });
    expect(highBanner).toBe(true);
    expect(prohibBanner).toBe(true);
    expect(highRiskIsic.length).toBeGreaterThanOrEqual(38);
    expect(prohibitedIsic.length).toBe(7);
  });

  it("entity nature of business workbook builds successfully", async () => {
    const wb = await buildNatureOfBusinessListWorkbook("entity");
    expect(wb.getWorksheet("Nature of Business")).toBeTruthy();
    expect(wb.getWorksheet("Readme")).toBeTruthy();
  });

  it("country risk list workbook has composite formula and prohibited countries", async () => {
    const wb = await buildCountryRiskListWorkbook();
    const ws = wb.getWorksheet("Country Risk Lists")!;
    let iranRow = 0;
    ws.eachRow((row, n) => {
      if (row.getCell(2).value === "Iran") iranRow = n;
    });
    expect(iranRow).toBeGreaterThan(0);
    expect(hasFormula(ws.getCell(iranRow, 10).value)).toBe(true);
    expect(ws.getCell(iranRow, 15).value).toBe("OVR-002");
    let highSection = false;
    ws.eachRow((row) => {
      if (row.getCell(1).value === "Section A — High-risk countries (firm score ≥ 3 · EDD · OVR-011 where applicable)") {
        highSection = true;
      }
    });
    expect(highSection).toBe(true);
  });
});
