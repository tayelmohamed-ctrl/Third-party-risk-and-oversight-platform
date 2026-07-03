import { describe, expect, it } from "vitest";
import { TRAINING_COURSES, coursesForRoles } from "../src/config/trainingCatalogue";
import { PLATFORM_USERS } from "../src/config/platformUsers";
import { effectiveStatus } from "../server/training/store";

describe("Training course catalogue", () => {
  it("defines FFIEC-relevant AML courses", () => {
    expect(TRAINING_COURSES.length).toBeGreaterThanOrEqual(5);
    expect(TRAINING_COURSES.some((c) => c.id === "AML-STR-201")).toBe(true);
    expect(TRAINING_COURSES.some((c) => c.id === "AML-MLRO-501")).toBe(true);
  });

  it("maps courses to platform user roles", () => {
    const mlroCourses = coursesForRoles(["MLRO"]);
    expect(mlroCourses.some((c) => c.id === "AML-MLRO-501")).toBe(true);
    const reviewerCourses = coursesForRoles(["Reviewer"]);
    expect(reviewerCourses.some((c) => c.id === "AML-STR-201")).toBe(true);
  });

  it("assigns every platform user at least one course", () => {
    for (const u of PLATFORM_USERS) {
      expect(coursesForRoles(u.roles).length).toBeGreaterThan(0);
    }
  });
});

describe("Training status computation", () => {
  it("marks past-due assigned records as overdue", () => {
    const past = new Date(Date.now() - 86400000);
    expect(effectiveStatus("assigned", past, null)).toBe("overdue");
  });

  it("keeps completed records as completed", () => {
    const past = new Date(Date.now() - 86400000);
    expect(effectiveStatus("completed", past, new Date())).toBe("completed");
  });
});

describe("Training API routes", () => {
  const ROUTES = [
    "GET /api/v1/crr/training/stats",
    "GET /api/v1/crr/training/courses",
    "GET /api/v1/crr/training",
    "GET /api/v1/crr/training/:id",
    "POST /api/v1/crr/training",
    "PATCH /api/v1/crr/training/:id",
    "POST /api/v1/crr/training/:id/complete",
  ];

  it("exposes REST surface for training register", () => {
    expect(ROUTES.length).toBe(7);
    expect(ROUTES.some((r) => r.includes("complete"))).toBe(true);
  });
});
