/**
 * Mal CRAM reference-list Excel workbooks — nature of business & country risk lists.
 * Used from CRAM Risk Test Bench methodology panel (Individual + Legal person).
 */
import type ExcelJS from "exceljs";
import type { CustomerMode } from "../config/activityRiskConfig";
import highRiskIsic from "../data/isic_high_risk_classes.json";
import prohibitedIsic from "../data/isic_prohibited_activities.json";
import countryRows from "../data/country_risk_full.json";
import {
  SANCTIONS_COUNTRY_FLOORS,
  sanctionsFloorForCountry,
} from "../config/sanctionsCountryRegistry";
import {
  addBrandHeader,
  addRateConditionalFormatting,
  addReadmeSheet,
  BRAND,
  COUNTRY_PILLAR_WEIGHTS,
  downloadWorkbook,
  exportFilename,
  fillSolid,
  firmBandFormula,
  loadLogoBuffer,
  newWorkbook,
  styleHeaderCell,
  thinBorder,
  type CountryRiskRow,
} from "./cramWorkbookShared";

const COUNTRIES = countryRows as CountryRiskRow[];

type IsicHighRow = {
  isic_code: string;
  isic_level: string;
  section: string;
  activity_title: string;
  aml_rating: string;
  risk_score: string;
  risk_theme: string;
  risk_drivers: string;
  cdd_edd: string;
  controls: string;
  rule_id: string;
  rule_basis: string;
  notes: string;
  source_url: string;
};

type ProhibitedRow = {
  activity: string;
  cramScore: number;
  amlRating: string;
  isicCode: string;
  isicTitle: string;
  override: string;
  regulatoryBasis: string;
  rationale: string;
  cddEdd: string;
  source: string;
};

function styleDataCell(cell: ExcelJS.Cell, bg = BRAND.white) {
  cell.border = thinBorder();
  cell.fill = fillSolid(bg);
  cell.alignment = { vertical: "top", wrapText: true };
}

function sectionBanner(ws: ExcelJS.Worksheet, row: number, title: string, subtitle: string, lastCol: number, tone: "high" | "prohibited") {
  ws.mergeCells(row, 1, row, lastCol);
  const cell = ws.getCell(row, 1);
  cell.value = title;
  cell.font = { bold: true, size: 12, color: { argb: tone === "prohibited" ? "FF7F1D1D" : BRAND.highText } };
  cell.fill = fillSolid(tone === "prohibited" ? "FFFCA5A5" : BRAND.high);
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(row).height = 22;
  ws.mergeCells(row + 1, 1, row + 1, lastCol);
  ws.getCell(row + 1, 1).value = subtitle;
  ws.getCell(row + 1, 1).font = { size: 9, italic: true, color: { argb: BRAND.muted } };
  ws.getCell(row + 1, 1).alignment = { wrapText: true };
  ws.getRow(row + 1).height = 28;
  return row + 2;
}

function programmeScores(country: string, libSanctions: number) {
  const floor = sanctionsFloorForCountry(country);
  let un = 1;
  let uae = 1;
  let ofac = Math.min(libSanctions || 1, 3);
  if (floor) {
    const elevated = floor.firmFloor >= 4 ? 3 : 2;
    if (floor.sources.includes("UN")) un = elevated;
    if (floor.sources.includes("UAE_TFS")) uae = elevated;
    if (floor.sources.includes("US_OFAC")) ofac = Math.max(ofac, elevated);
  }
  return { un, uae, ofac };
}

function sanctionsCategoryLabel(country: string): string {
  const floor = sanctionsFloorForCountry(country);
  if (!floor?.category) return floor ? "Programme" : "—";
  return `Category ${floor.category}`;
}

function sanctionsRationale(country: string): string {
  const floor = sanctionsFloorForCountry(country);
  return floor?.rationale ?? "No Mal sanctions-programme floor — library composite only";
}

export async function buildNatureOfBusinessListWorkbook(mode: CustomerMode) {
  const logo = await loadLogoBuffer();
  const modeLabel = mode === "entity" ? "Legal person (LP/MER)" : "Natural person (NP)";
  const wb = newWorkbook(`Mal CRAM Nature of Business — ${modeLabel}`);
  const ws = wb.addWorksheet("Nature of Business");
  const lastCol = 11;
  addBrandHeader(ws, wb, logo, `Nature of Business List — ${modeLabel} · ISIC Rev.5`, lastCol);

  ws.mergeCells(6, 1, 6, lastCol);
  ws.getCell(6, 1).value = "Authoritative high-risk and prohibited activities from ISIC Rev.5 AML mapping + CRAM prohibition layer (nature_of_business score 4). Applies to profession/self-employed activity (NP) and registered business activity (LP/MER).";
  ws.getCell(6, 1).font = { size: 9, color: { argb: BRAND.muted } };
  ws.getCell(6, 1).alignment = { wrapText: true };
  ws.getRow(6).height = 36;

  let r = 8;
  r = sectionBanner(
    ws, r,
    "Section A — High-risk nature of business (CRAM score 3 · EDD path · OVR-012 floor)",
    "ISIC Rev.5 Class-level entries with inherent High rating — FATF RBA sector guidance · CBUAE customer risk assessment · FinCEN CDD Rule 31 C.F.R. § 1010.210 where applicable.",
    lastCol, "high",
  );

  const highHeaders = [
    "#", "ISIC Code", "Section", "Activity title", "CRAM Score", "AML Rating", "Risk theme",
    "Risk drivers", "CDD / EDD", "Rule ID", "Regulatory basis / source",
  ];
  highHeaders.forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  r += 1;
  const highStart = r;
  (highRiskIsic as IsicHighRow[]).forEach((row, i) => {
    const dataRow = r + i;
    ws.getRow(dataRow).height = 42;
    ws.getCell(dataRow, 1).value = i + 1;
    ws.getCell(dataRow, 2).value = row.isic_code;
    ws.getCell(dataRow, 3).value = row.section;
    ws.getCell(dataRow, 4).value = row.activity_title;
    ws.getCell(dataRow, 5).value = Number(row.risk_score);
    ws.getCell(dataRow, 6).value = row.aml_rating;
    ws.getCell(dataRow, 7).value = row.risk_theme;
    ws.getCell(dataRow, 8).value = row.risk_drivers;
    ws.getCell(dataRow, 9).value = row.cdd_edd;
    ws.getCell(dataRow, 10).value = row.rule_id;
    ws.getCell(dataRow, 11).value = `${row.rule_basis} · ${row.source_url}`;
    for (let c = 1; c <= lastCol; c += 1) {
      styleDataCell(ws.getCell(dataRow, c), i % 2 === 0 ? BRAND.white : BRAND.panel);
    }
    ws.getCell(dataRow, 5).alignment = { horizontal: "center", vertical: "top" };
    ws.getCell(dataRow, 6).fill = fillSolid(BRAND.high);
    ws.getCell(dataRow, 6).font = { bold: true, color: { argb: BRAND.highText } };
  });
  r = highStart + (highRiskIsic as IsicHighRow[]).length + 2;

  r = sectionBanner(
    ws, r,
    "Section B — Prohibited nature of business (CRAM score 4 · OVR-002 Reject/Exit)",
    "Policy prohibition layer — not averaged into composite. MAL-CMP-AML-01 §8 · UAE Federal Decree-Law No. 20/2018 · US BSA/FinCEN where applicable.",
    lastCol, "prohibited",
  );

  const prohibHeaders = [
    "#", "Mal prohibited activity", "ISIC Code", "ISIC title", "CRAM Score", "Override",
    "Regulatory basis", "Rationale", "Treatment", "Source",
  ];
  prohibHeaders.forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  r += 1;
  (prohibitedIsic as ProhibitedRow[]).forEach((row, i) => {
    const dataRow = r + i;
    ws.getRow(dataRow).height = 48;
    ws.getCell(dataRow, 1).value = i + 1;
    ws.getCell(dataRow, 2).value = row.activity;
    ws.getCell(dataRow, 3).value = row.isicCode;
    ws.getCell(dataRow, 4).value = row.isicTitle;
    ws.getCell(dataRow, 5).value = row.cramScore;
    ws.getCell(dataRow, 6).value = row.override;
    ws.getCell(dataRow, 7).value = row.regulatoryBasis;
    ws.getCell(dataRow, 8).value = row.rationale;
    ws.getCell(dataRow, 9).value = row.cddEdd;
    ws.getCell(dataRow, 10).value = row.source;
    for (let c = 1; c <= 10; c += 1) {
      styleDataCell(ws.getCell(dataRow, c), "FFFEF2F2");
    }
    ws.getCell(dataRow, 5).font = { bold: true, color: { argb: "FF7F1D1D" } };
    ws.getCell(dataRow, 5).alignment = { horizontal: "center" };
  });

  ws.views = [{ state: "frozen", xSplit: 2, ySplit: highStart - 1, topLeftCell: "C9" }];
  [5, 10, 8, 36, 10, 12, 22, 32, 18, 10, 40].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  addReadmeSheet(wb, logo, `Nature of Business — ${modeLabel}`, [
    ["High risk", `${(highRiskIsic as IsicHighRow[]).length} ISIC Class entries · score 3 · triggers OVR-012 High floor`],
    ["Prohibited", `${(prohibitedIsic as ProhibitedRow[]).length} Mal prohibited activities · score 4 · OVR-002 hard stop`],
    ["Library", "ISIC-REV5-AML-2026-05 · seed/data/isic_aml_mapping.csv"],
    ["NP vs LP", mode === "entity" ? "Primary driver: registered business activity (22% of customer-type factor)" : "Applies when self-employed / business-owner declares ISIC activity"],
  ], ["Nature of Business", "Readme"]);
  return wb;
}

export async function buildCountryRiskListWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM Country Risk Lists");
  const ws = wb.addWorksheet("Country Risk Lists");
  const lastCol = 15;
  addBrandHeader(ws, wb, logo, "High-risk & Prohibited Countries — Geography Pillar", lastCol);

  ws.mergeCells(6, 1, 6, lastCol);
  ws.getCell(6, 1).value = `Composite = ROUND(CR FATF×${COUNTRY_PILLAR_WEIGHTS.fatf * 100}% + CR Basel×${COUNTRY_PILLAR_WEIGHTS.basel * 100}% + Sanctions×${COUNTRY_PILLAR_WEIGHTS.sanctions * 100}% + Safe Haven×${COUNTRY_PILLAR_WEIGHTS.safeHaven * 100}%, 2). Firm score applies Mal sanctions-programme floors (UN · UAE TFS · OFAC).`;
  ws.getCell(6, 1).font = { size: 9, color: { argb: BRAND.muted } };
  ws.getCell(6, 1).alignment = { wrapText: true };
  ws.getRow(6).height = 32;

  const prohibCountries = COUNTRIES.filter((c) => c.firm_score >= 4).sort((a, b) => a.country.localeCompare(b.country));
  const highCountries = COUNTRIES.filter((c) => c.firm_score >= 3 && c.firm_score < 4).sort((a, b) => a.country.localeCompare(b.country));

  let r = 8;
  r = sectionBanner(
    ws, r,
    "Section A — High-risk countries (firm score ≥ 3 · EDD · OVR-011 where applicable)",
    "Non-prohibited jurisdictions with elevated geography floor — enhanced due diligence and periodic review.",
    lastCol, "high",
  );

  const headers = [
    "#", "Country", "CR FATF", "CR Basel", "UN", "UAE TFS", "OFAC", "Safe Haven",
    "Sanctions pillar", "Overall composite", "Firm score", "Firm rating", "Programme category", "Rationale", "Override",
  ];
  headers.forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  r += 1;
  const highStart = r;

  const writeCountryRow = (c: CountryRiskRow, idx: number, dataRow: number) => {
    const prog = programmeScores(c.country, c.sanctions);
    ws.getRow(dataRow).height = 36;
    ws.getCell(dataRow, 1).value = idx + 1;
    ws.getCell(dataRow, 2).value = c.country;
    ws.getCell(dataRow, 3).value = c.fatf;
    ws.getCell(dataRow, 4).value = c.basel;
    ws.getCell(dataRow, 5).value = prog.un;
    ws.getCell(dataRow, 6).value = prog.uae;
    ws.getCell(dataRow, 7).value = prog.ofac;
    ws.getCell(dataRow, 8).value = c.safe_haven;
    ws.getCell(dataRow, 9).value = c.sanctions;
    ws.getCell(dataRow, 10).value = { formula: `=ROUND(C${dataRow}*0.3+D${dataRow}*0.35+I${dataRow}*0.3+H${dataRow}*0.05,2)` };
    ws.getCell(dataRow, 10).numFmt = "0.00";
    ws.getCell(dataRow, 11).value = c.firm_score;
    ws.getCell(dataRow, 11).numFmt = "0.00";
    ws.getCell(dataRow, 12).value = { formula: firmBandFormula("K", dataRow) };
    ws.getCell(dataRow, 13).value = sanctionsCategoryLabel(c.country);
    ws.getCell(dataRow, 14).value = sanctionsRationale(c.country);
    ws.getCell(dataRow, 15).value = c.firm_score >= 4 ? "OVR-002" : c.firm_score >= 3 ? "OVR-011" : "—";
    for (let col = 1; col <= lastCol; col += 1) {
      styleDataCell(ws.getCell(dataRow, col), idx % 2 === 0 ? BRAND.white : BRAND.panel);
    }
    [3, 4, 5, 6, 7, 8, 9].forEach((col) => {
      ws.getCell(dataRow, col).alignment = { horizontal: "center", vertical: "top" };
    });
    ws.getCell(dataRow, 11).font = { bold: true, color: { argb: BRAND.purple } };
  };

  highCountries.forEach((c, i) => writeCountryRow(c, i, r + i));
  r = highStart + highCountries.length + 2;

  r = sectionBanner(
    ws, r,
    "Section B — Prohibited countries (firm score ≥ 4 · Category A · OVR-002 Reject/Exit)",
    `Comprehensive embargo / call-for-action — ${SANCTIONS_COUNTRY_FLOORS.filter((f) => f.category === "A").map((f) => f.countries.join(", ")).join("; ")}.`,
    lastCol, "prohibited",
  );
  headers.forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  r += 1;
  prohibCountries.forEach((c, i) => {
    const dataRow = r + i;
    writeCountryRow(c, i, dataRow);
    for (let col = 1; col <= lastCol; col += 1) ws.getCell(dataRow, col).fill = fillSolid("FFFEF2F2");
    ws.getCell(dataRow, 12).fill = fillSolid("FFFCA5A5");
    ws.getCell(dataRow, 12).font = { bold: true, color: { argb: "FF7F1D1D" } };
  });

  addRateConditionalFormatting(ws, `L${highStart}:L${highStart + highCountries.length + prohibCountries.length - 1}`);
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: highStart - 1, topLeftCell: "C9" }];
  [5, 28, 8, 8, 6, 8, 8, 10, 10, 12, 10, 12, 14, 36, 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  addReadmeSheet(wb, logo, "Country Risk Lists", [
    ["High risk", `${highCountries.length} countries · firm score 3 · OVR-011 EDD floor`],
    ["Prohibited", `${prohibCountries.length} countries · firm score 4 · OVR-002 hard stop`],
    ["Pillars", "CR FATF 30% · CR Basel 35% · Sanctions 30% · Safe Haven 5%"],
    ["Programme", `${SANCTIONS_COUNTRY_FLOORS.length} Mal sanctions floor groups · UN · US OFAC · UAE TFS`],
  ], ["Country Risk Lists", "Readme"]);
  return wb;
}

export type ReferenceListWorkbookKind = "nob-list" | "country-list";

export const REFERENCE_LIST_EXPORTS: {
  kind: ReferenceListWorkbookKind;
  label: string;
  slug: string;
  group: "customer" | "country";
}[] = [
  { kind: "nob-list", label: "Nature of business list", slug: "Nature-of-Business-List", group: "customer" },
  { kind: "country-list", label: "Country risk lists", slug: "Country-Risk-Lists", group: "country" },
];

export async function buildReferenceListWorkbook(kind: ReferenceListWorkbookKind, mode: CustomerMode = "individual") {
  if (kind === "nob-list") return buildNatureOfBusinessListWorkbook(mode);
  return buildCountryRiskListWorkbook();
}

export async function exportReferenceListWorkbook(kind: ReferenceListWorkbookKind, mode: CustomerMode = "individual") {
  const meta = REFERENCE_LIST_EXPORTS.find((e) => e.kind === kind);
  const suffix = kind === "nob-list" ? (mode === "entity" ? "-LP-MER" : "-NP") : "";
  const wb = await buildReferenceListWorkbook(kind, mode);
  await downloadWorkbook(wb, exportFilename(`${meta?.slug ?? kind}${suffix}`));
}
