import { describe, expect, it } from "vitest";
import {
  CRAM_METHODOLOGY_DOCX_FILENAME,
  CRAM_METHODOLOGY_DOCX_URL,
} from "../src/lib/cramMethodologyExport";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CRAM methodology document export", () => {
  it("points at bundled public docx asset", () => {
    expect(CRAM_METHODOLOGY_DOCX_URL).toBe("/Mal_Customer_Risk_Assessment_Methodology_v1_0.docx");
    expect(CRAM_METHODOLOGY_DOCX_FILENAME).toBe("Mal_Customer_Risk_Assessment_Methodology_v1_0.docx");
  });

  it("public docx file exists and is non-empty", () => {
    const path = resolve(process.cwd(), "public", CRAM_METHODOLOGY_DOCX_FILENAME);
    expect(existsSync(path)).toBe(true);
    const stat = readFileSync(path);
    expect(stat.byteLength).toBeGreaterThan(10_000);
  });
});
