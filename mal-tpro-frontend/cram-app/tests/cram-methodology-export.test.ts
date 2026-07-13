import { describe, expect, it } from "vitest";
import {
  CRAM_METHODOLOGY_DOCX_FILENAME,
  CRAM_METHODOLOGY_DOCX_URL,
  CRAM_METHODOLOGY_UAE,
  CRAM_METHODOLOGY_US,
  cramMethodologyDocForPerimeter,
} from "../src/lib/cramMethodologyExport";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CRAM methodology document export", () => {
  it("UAE methodology constants point at bundled public asset (v1.1 PDF)", () => {
    expect(CRAM_METHODOLOGY_DOCX_URL).toBe(CRAM_METHODOLOGY_UAE.url);
    expect(CRAM_METHODOLOGY_DOCX_FILENAME).toBe(CRAM_METHODOLOGY_UAE.filename);
    expect(CRAM_METHODOLOGY_UAE.url).toBe("/Mal_Customer_Risk_Assessment_Methodology_CBUAE_v1_1.pdf");
  });

  it("selects US methodology for Global Account perimeter", () => {
    const doc = cramMethodologyDocForPerimeter("global_account");
    expect(doc.modelVersionId).toBe("Mal-CRAM-US-01");
    expect(doc.filename).toBe("Mal-CRAM-US-01_Customer_Risk_Assessment_Methodology_US_v1.0.docx");
  });

  it("selects UAE methodology for MAL Bank perimeter", () => {
    const doc = cramMethodologyDocForPerimeter("mal_bank");
    expect(doc.modelVersionId).toBe("CRAM-CBUAE-2026-05-FREEZE-01");
    expect(doc.filename).toBe("Mal_Customer_Risk_Assessment_Methodology_CBUAE_v1_1.pdf");
  });

  it("public UAE methodology file exists and is non-empty", () => {
    const path = resolve(process.cwd(), "public", CRAM_METHODOLOGY_UAE.filename);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path).byteLength).toBeGreaterThan(10_000);
  });

  it("public US docx file exists and is non-empty", () => {
    const path = resolve(process.cwd(), "public", CRAM_METHODOLOGY_US.filename);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path).byteLength).toBeGreaterThan(10_000);
  });
});
