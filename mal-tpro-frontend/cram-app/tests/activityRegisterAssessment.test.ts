import { describe, expect, it } from "vitest";
import { assessActivityRegister } from "../src/lib/activityRegisterAssessment";
import { getActivityById, searchActivities } from "../src/lib/activityRegisterIndex";

describe("Activity Register assessment", () => {
  it("resolves MAL Bank RAKEZ activity with UAE perimeter", () => {
    const hits = searchActivities("7412", "mal_bank", 5);
    const activity = hits.find((h) => h.rakezCode?.includes("7412")) ?? hits[0];
    expect(activity).toBeTruthy();

    const a = assessActivityRegister({
      perimeter: "mal_bank",
      corridor: "UAE",
      mode: "entity",
      applicability: "business_operates",
      activity: activity!,
    });

    expect(a.corridor).toBe("UAE");
    expect(a.finalScore).toBeGreaterThanOrEqual(2);
    expect(a.methodologyNotes.some((n) => n.includes("RAKEZ") || n.includes("7412"))).toBe(true);
  });

  it("applies corridor uplift for Global Account PK", () => {
    const activity = getActivityById("typology:Money services businesses");
    expect(activity).toBeTruthy();

    const a = assessActivityRegister({
      perimeter: "global_account",
      corridor: "PK",
      mode: "entity",
      applicability: "intended_use",
      activity: activity!,
    });

    expect(a.corridorOverlay.scoreUplift).toBeGreaterThan(0);
    expect(a.finalScore).toBeGreaterThanOrEqual(a.baseScore);
  });

  it("excludes RAKEZ from Global Account search pool", () => {
    const hits = searchActivities("514111", "global_account", 20);
    expect(hits.every((h) => h.source !== "rakez")).toBe(true);
  });

  it("includes RAKEZ in MAL Bank search pool", () => {
    const hits = searchActivities("Diesel Fuel", "mal_bank", 10);
    expect(hits.some((h) => h.source === "rakez")).toBe(true);
  });
});
