import { describe, expect, it } from "vitest";
import {
  CRAM_CATALOGUE, DRIVE_FOLDERS, DRIVE_FOLDER_ORDER,
  driveDocPath, driveFolderUrl, lineageBreadcrumb, lineageForRegulation,
} from "../src/config/cramDriveCatalogue";

describe("CRAM lineage catalogue — Google Drive linkage", () => {
  it("defines three Google Drive master folders", () => {
    expect(DRIVE_FOLDER_ORDER).toHaveLength(3);
    expect(DRIVE_FOLDERS.regulations.url).toContain("0ABopRvbIQ6pFUk9PVA");
    expect(DRIVE_FOLDERS.controlsWorkflows.url).toContain("0AEl7ykvShEaOUk9PVA");
    expect(DRIVE_FOLDERS.evidenceRisk.url).toContain("0AMIvYfdjtIPBUk9PVA");
  });

  it("every regulation links to a drive folder and controls", () => {
    for (const r of CRAM_CATALOGUE.regulations) {
      expect(driveFolderUrl(r.driveFolder)).toMatch(/^https:\/\/drive\.google\.com/);
      expect(r.driveDoc.length).toBeGreaterThan(0);
      expect(r.controls.length).toBeGreaterThan(0);
    }
  });

  it("every control links regulations, workflows, module route, and drive", () => {
    for (const c of CRAM_CATALOGUE.controls) {
      expect(c.regulations.length).toBeGreaterThan(0);
      expect(c.workflows.length).toBeGreaterThan(0);
      expect(c.moduleRoute).toMatch(/^\//);
      expect(driveDocPath(c.driveFolder, c.driveDoc)).toContain(DRIVE_FOLDERS[c.driveFolder].label);
    }
  });

  it("every workflow links controls, evidence types, route, and drive SOP", () => {
    for (const w of CRAM_CATALOGUE.workflows) {
      expect(w.controls.length).toBeGreaterThan(0);
      expect(w.evidenceTypes.length).toBeGreaterThan(0);
      expect(w.route).toMatch(/^\//);
      expect(driveFolderUrl(w.driveFolder)).toMatch(/^https:\/\/drive\.google\.com/);
    }
  });

  it("every evidence item links control, workflow, and drive", () => {
    for (const e of CRAM_CATALOGUE.evidence) {
      expect(e.linkedControl).toMatch(/^C-/);
      expect(e.linkedWorkflow).toMatch(/^WF-/);
      expect(e.driveDoc.length).toBeGreaterThan(0);
    }
  });

  it("builds lineage chain for CBUAE AML regulation", () => {
    const chain = lineageForRegulation("REG-CBUAE-AML");
    expect(chain).not.toBeNull();
    expect(chain!.regulation.name).toContain("CBUAE");
    expect(chain!.controls.some((c) => c.id === "C-104")).toBe(true);
    expect(chain!.workflows.length).toBeGreaterThan(0);
    expect(lineageBreadcrumb("REG-CBUAE-AML")).toContain("→");
  });

  it("heat map references drive methodology and snapshot", () => {
    const { heatMap } = CRAM_CATALOGUE;
    expect(heatMap.matrix.cells).toHaveLength(3);
    expect(driveFolderUrl(heatMap.methodologyDriveFolder)).toMatch(/^https:\/\/drive\.google\.com/);
    expect(driveFolderUrl(heatMap.snapshotDriveFolder)).toMatch(/^https:\/\/drive\.google\.com/);
  });
});
