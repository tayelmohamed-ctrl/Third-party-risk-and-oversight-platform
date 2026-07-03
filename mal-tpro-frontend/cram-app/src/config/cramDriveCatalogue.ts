/**
 * CRAM lineage catalogue — regulations, controls, workflows, evidence
 * linked to Mal Google Drive master repository.
 */
import catalogue from "../data/cram_lineage_catalogue.json";

export type DriveFolderKey = "regulations" | "controlsWorkflows" | "evidenceRisk";

export interface DriveFolder {
  id: string;
  label: string;
  url: string;
  description: string;
}

export interface RegulationEntry {
  id: string;
  name: string;
  ref: string;
  jurisdiction: string;
  driveFolder: DriveFolderKey;
  driveDoc: string;
  status: "mapped" | "gap" | "partial";
  controls: string[];
}

export interface ControlEntry {
  id: string;
  name: string;
  tests: string;
  status: "effective" | "gap" | "partial" | "planned";
  effectiveness: "strong" | "partial" | "weak";
  owner: string;
  driveFolder: DriveFolderKey;
  driveDoc: string;
  regulations: string[];
  workflows: string[];
  moduleRoute: string;
}

export interface WorkflowEntry {
  id: string;
  name: string;
  module: string;
  route: string;
  status: "live" | "planned" | "shadow";
  driveFolder: DriveFolderKey;
  driveDoc: string;
  controls: string[];
  evidenceTypes: string[];
}

export interface EvidenceEntry {
  id: string;
  name: string;
  type: string;
  status: string;
  customerId: string | null;
  driveFolder: DriveFolderKey;
  driveDoc: string;
  linkedControl: string;
  linkedWorkflow: string;
  freshness: string;
}

export interface CramLineageCatalogue {
  version: string;
  updated: string;
  source: string;
  driveFolders: Record<DriveFolderKey, DriveFolder>;
  regulations: RegulationEntry[];
  controls: ControlEntry[];
  workflows: WorkflowEntry[];
  evidence: EvidenceEntry[];
  heatMap: {
    title: string;
    methodologyDriveFolder: DriveFolderKey;
    methodologyDriveDoc: string;
    snapshotDriveFolder: DriveFolderKey;
    snapshotDriveDoc: string;
    matrix: {
      rows: string[];
      cols: string[];
      cells: number[][];
      cellDriveFolder: DriveFolderKey;
      interpretation: string;
    };
  };
  coverage: {
    obligations: number;
    covered: number;
    partial: number;
    uncovered: number;
    controlsTotal: number;
    controlsEffective: number;
    controlsGap: number;
  };
}

export const CRAM_CATALOGUE = catalogue as CramLineageCatalogue;

export const DRIVE_FOLDERS = CRAM_CATALOGUE.driveFolders;

export function driveFolderUrl(key: DriveFolderKey): string {
  return DRIVE_FOLDERS[key].url;
}

/** Human-readable path hint for auditors (folder + doc path within Drive). */
export function driveDocPath(key: DriveFolderKey, doc: string): string {
  return `${DRIVE_FOLDERS[key].label} / ${doc}`;
}

export function regulationById(id: string): RegulationEntry | undefined {
  return CRAM_CATALOGUE.regulations.find((r) => r.id === id);
}

export function controlById(id: string): ControlEntry | undefined {
  return CRAM_CATALOGUE.controls.find((c) => c.id === id);
}

export function workflowById(id: string): WorkflowEntry | undefined {
  return CRAM_CATALOGUE.workflows.find((w) => w.id === id);
}

export function evidenceById(id: string): EvidenceEntry | undefined {
  return CRAM_CATALOGUE.evidence.find((e) => e.id === id);
}

/** Full lineage chain for a regulation id. */
export function lineageForRegulation(regId: string) {
  const reg = regulationById(regId);
  if (!reg) return null;
  const controls = reg.controls.map((cid) => controlById(cid)).filter(Boolean) as ControlEntry[];
  const workflowIds = new Set(controls.flatMap((c) => c.workflows));
  const workflows = [...workflowIds].map((wid) => workflowById(wid)).filter(Boolean) as WorkflowEntry[];
  const evidence = CRAM_CATALOGUE.evidence.filter(
    (e) => reg.controls.includes(e.linkedControl) || workflows.some((w) => w.id === e.linkedWorkflow),
  );
  return { regulation: reg, controls, workflows, evidence };
}

/** Breadcrumb string for UI. */
export function lineageBreadcrumb(regId: string): string {
  const chain = lineageForRegulation(regId);
  if (!chain) return "";
  const ctl = chain.controls[0]?.id ?? "—";
  const wf = chain.workflows[0]?.module ?? "—";
  const ev = chain.evidence[0]?.name ?? "—";
  return `${chain.regulation.name} → ${ctl} → ${wf} → ${ev}`;
}

export const DRIVE_FOLDER_ORDER: DriveFolderKey[] = ["regulations", "controlsWorkflows", "evidenceRisk"];

export const STATUS_STYLE: Record<string, string> = {
  mapped: "bg-low/15 text-low",
  effective: "bg-low/15 text-low",
  live: "bg-low/15 text-low",
  verified: "bg-low/15 text-low",
  clear: "bg-low/15 text-low",
  current: "bg-low/15 text-low",
  approved: "bg-low/15 text-low",
  ready: "bg-low/15 text-low",
  gap: "bg-hi/15 text-hi",
  partial: "bg-med/15 text-med",
  planned: "bg-faint/15 text-faint",
  open: "bg-med/15 text-med",
  in_review: "bg-med/15 text-med",
  draft: "bg-faint/15 text-faint",
};

export function heatCellColor(inherentIdx: number, controlIdx: number, value: number): string {
  if (inherentIdx === 0 && controlIdx === 0) return "#FF5C77";
  if (inherentIdx === 0 && controlIdx === 1) return "#F6A623";
  if (value >= 20) return "#2FD8A6";
  if (value >= 10) return "#F6A623";
  return "#FF5C77";
}
