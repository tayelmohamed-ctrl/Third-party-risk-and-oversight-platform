import { describe, expect, it } from "vitest";
import {
  PLATFORM_USERS,
  canOverride,
  canApproveConfig,
  canProposeConfig,
  getPlatformUser,
} from "../src/config/platformUsers";

describe("Platform user access profiles", () => {
  it("defines three executive users", () => {
    expect(PLATFORM_USERS).toHaveLength(3);
    expect(PLATFORM_USERS.map((u) => u.email)).toEqual([
      "tayel.mohamed@mal.ae",
      "walid.elsheikha@mal.ae",
      "david.henry@mal.ae",
    ]);
  });

  it("grants MLRO override to Head of Financial Crimes and Head of Compliance", () => {
    const tayel = getPlatformUser("tayel_mohamed");
    const walid = getPlatformUser("walid_elsheikha");
    const david = getPlatformUser("david_henry");
    expect(canOverride(tayel)).toBe(true);
    expect(canOverride(walid)).toBe(true);
    expect(canOverride(david)).toBe(false);
  });

  it("grants config approval to Head of Compliance only among executives", () => {
    expect(canApproveConfig(getPlatformUser("walid_elsheikha"))).toBe(true);
    expect(canApproveConfig(getPlatformUser("tayel_mohamed"))).toBe(true);
    expect(canApproveConfig(getPlatformUser("david_henry"))).toBe(false);
  });

  it("grants config propose to Chief of Product", () => {
    expect(canProposeConfig(getPlatformUser("david_henry"))).toBe(true);
  });
});
