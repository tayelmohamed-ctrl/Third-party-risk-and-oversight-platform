/**
 * A-1 — Band boundary precision tests.
 * UAE Methodology §3.1 / US Methodology §3.1:
 *   Low ≤ 1.5000 · Medium 1.5001–2.1500 · High > 2.1500
 * Threshold decisions use the unrounded raw score. Display rounding must never drive the final rating.
 */
import { describe, expect, it } from "vitest";
import { bandFromScore } from "../src/config/bandBoundaries";

describe("Band boundaries — precision at threshold crossings (A-1)", () => {
  // ── Low band ──────────────────────────────────────────────────────────────────
  it("1.4999 → Low", () => {
    expect(bandFromScore(1.4999, "cram")).toBe("Low");
  });
  it("1.5000 → Low (inclusive upper edge)", () => {
    expect(bandFromScore(1.5000, "cram")).toBe("Low");
  });
  it("1.50005 → Medium (above Low boundary — more than 4dp precision)", () => {
    expect(bandFromScore(1.50005, "cram")).toBe("Medium");
  });
  it("1.5001 → Medium", () => {
    expect(bandFromScore(1.5001, "cram")).toBe("Medium");
  });

  // ── Medium/High boundary ──────────────────────────────────────────────────────
  it("2.1499 → Medium", () => {
    expect(bandFromScore(2.1499, "cram")).toBe("Medium");
  });
  it("2.1500 → Medium (inclusive upper edge)", () => {
    expect(bandFromScore(2.1500, "cram")).toBe("Medium");
  });
  it("2.15005 → High (above Medium boundary — more than 4dp precision)", () => {
    expect(bandFromScore(2.15005, "cram")).toBe("High");
  });
  it("2.1501 → High", () => {
    expect(bandFromScore(2.1501, "cram")).toBe("High");
  });

  // ── calculator boundary mirrors cram ──────────────────────────────────────────
  it("calculator boundary matches cram boundary at all crossings", () => {
    const testValues = [1.4999, 1.5000, 1.5001, 2.1499, 2.1500, 2.1501];
    for (const v of testValues) {
      expect(bandFromScore(v, "calculator")).toBe(bandFromScore(v, "cram"));
    }
  });
});
