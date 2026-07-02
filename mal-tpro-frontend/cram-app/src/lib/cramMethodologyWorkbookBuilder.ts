/**
 * Mal CRAM methodology Excel workbooks — country, customer, channel, investigation, review.
 */
import type ExcelJS from "exceljs";
import countryRows from "../data/country_risk_full.json";
import sanctionsProgramme from "../data/sanctions_programme.json";
import {
  BEHAVIOUR_TRIGGERS,
  LP_PROFILE_PARAMETERS,
  NP_PROFILE_PARAMETERS,
  OUTCOME_MAPPING,
} from "../config/cramMethodologyDocument";
import { INITIATION_CHANNELS, DELIVERY_CHANNELS } from "../config/channelRisk";
import { SANCTIONS_COUNTRY_FLOORS } from "../config/sanctionsCountryRegistry";
import {
  addBrandHeader,
  addRateConditionalFormatting,
  addRatingScale,
  addReadmeSheet,
  addScoreValidation,
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

const BASEL_SCORE_MAP = [
  { label: "Low (1)", rawFrom: 1.0, rawTo: 3.99, cramScore: 1 },
  { label: "Medium (2)", rawFrom: 4.0, rawTo: 6.99, cramScore: 2 },
  { label: "High (3)", rawFrom: 7.0, rawTo: 10.0, cramScore: 3 },
];

const FATF_STATUS_MAP = [
  { status: "Normal / member jurisdiction", score: 1, note: "Not on increased monitoring or call for action" },
  { status: "Increased monitoring (Grey List)", score: 2, note: "FATF grey-list equivalent — firm floor may apply" },
  { status: "Call for action / Black List", score: 3, note: "Countermeasures or strategic deficiencies" },
];

const INVESTIGATION_MATRIX = [
  { label: "0", rating: 0 },
  { label: "upto 2", rating: 2 },
  { label: "3 and above", rating: 3 },
];

const STR_MATRIX = [
  { label: "0", rating: 0 },
  { label: "1 and above", rating: 3 },
];

const REVIEW_ROWS = [
  { rating: "High Risk", malMonths: 12, cbuaeMaxMonths: 12 },
  { rating: "Medium Risk", malMonths: 36, cbuaeMaxMonths: 24 },
  { rating: "Low Risk", malMonths: 60, cbuaeMaxMonths: 36 },
];

function styleDataCell(cell: ExcelJS.Cell, bg = BRAND.white) {
  cell.border = thinBorder();
  cell.fill = fillSolid(bg);
}

function riskRateFromScoreFormula(cellRef: string): string {
  return `=IF(${cellRef}<=1,"Low",IF(${cellRef}<=2,"Medium","High"))`;
}

function addWeightLegend(ws: ExcelJS.Worksheet, row: number, lastCol: number) {
  ws.mergeCells(row, 1, row, lastCol);
  ws.getCell(row, 1).value = `Country composite = FATF×${COUNTRY_PILLAR_WEIGHTS.fatf * 100}% + Basel×${COUNTRY_PILLAR_WEIGHTS.basel * 100}% + Sanctions×${COUNTRY_PILLAR_WEIGHTS.sanctions * 100}% + Safe Haven×${COUNTRY_PILLAR_WEIGHTS.safeHaven * 100}%`;
  ws.getCell(row, 1).font = { bold: true, size: 10, color: { argb: BRAND.ink } };
}

export async function buildCountryRiskWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM Country Risk");
  const ws = wb.addWorksheet("Country Risk");
  const lastCol = 10;
  addBrandHeader(ws, wb, logo, "AML Country Risk Rating — §8 Geography Pillar", lastCol);
  addRatingScale(ws, 6, 1);
  addWeightLegend(ws, 10, lastCol);

  const hdr = 12;
  const headers = [
    "Country", "FATF (30%)", "Basel (35%)", "Sanctions (30%)", "Safe Haven (5%)",
    "Overall Country Rating", "Overall Country Ranking", "Firm Override Reason", "Firm Score Override", "Firm Override Ranking",
  ];
  headers.forEach((h, i) => {
    styleHeaderCell(ws.getCell(hdr, i + 1));
    ws.getCell(hdr, i + 1).value = h;
  });

  const dataStart = hdr + 1;
  COUNTRIES.forEach((c, i) => {
    const r = dataStart + i;
    ws.getRow(r).height = 18;
    ws.getCell(r, 1).value = c.country;
    ws.getCell(r, 2).value = c.fatf;
    ws.getCell(r, 3).value = c.basel;
    ws.getCell(r, 4).value = c.sanctions;
    ws.getCell(r, 5).value = c.safe_haven;
    [2, 3, 4, 5].forEach((col) => {
      ws.getCell(r, col).fill = fillSolid("FFFFFBEB");
      ws.getCell(r, col).alignment = { horizontal: "center" };
    });

    ws.getCell(r, 6).value = { formula: `=ROUND(B${r}*0.3+C${r}*0.35+D${r}*0.3+E${r}*0.05,2)` };
    ws.getCell(r, 6).numFmt = "0.00";
    ws.getCell(r, 6).font = { bold: true };
    ws.getCell(r, 7).value = { formula: firmBandFormula("F", r) };
    ws.getCell(r, 7).alignment = { horizontal: "center" };

    const floor = SANCTIONS_COUNTRY_FLOORS.find((f) => f.countries.includes(c.country));
    ws.getCell(r, 8).value = floor ? `${floor.category ? `Category ${floor.category}` : "Programme"} — ${floor.rationale.slice(0, 50)}` : "";
    ws.getCell(r, 9).value = c.firm_score;
    ws.getCell(r, 9).numFmt = "0.00";
    ws.getCell(r, 9).font = { bold: true, color: { argb: BRAND.purple } };
    ws.getCell(r, 10).value = { formula: firmBandFormula("I", r) };
    ws.getCell(r, 10).alignment = { horizontal: "center" };

    for (let col = 1; col <= lastCol; col += 1) {
      if (![2, 3, 4, 5].includes(col)) styleDataCell(ws.getCell(r, col), i % 2 === 0 ? BRAND.white : BRAND.panel);
    }
  });

  addScoreValidation(ws, `B${dataStart}:E${dataStart + COUNTRIES.length - 1}`);
  addRateConditionalFormatting(ws, `G${dataStart}:G${dataStart + COUNTRIES.length - 1}`);
  addRateConditionalFormatting(ws, `J${dataStart}:J${dataStart + COUNTRIES.length - 1}`);
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: hdr, topLeftCell: "B13" }];
  [36, 10, 10, 12, 12, 14, 14, 28, 12, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  addReadmeSheet(wb, logo, "Country Risk Workbook", [
    ["Formula", "Overall = ROUND(FATF×30% + Basel×35% + Sanctions×30% + Safe Haven×5%, 2)"],
    ["Firm override", "Column I holds library firm_score including sanctions floors and grey-list overrides"],
    ["Edit", "Yellow pillar cells (B–E) recalculate overall rating; compare with firm override column"],
  ], ["Country Risk", "Readme"]);
  return wb;
}

export async function buildCrFatfWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM CR FATF");
  const ws = wb.addWorksheet("CR FATF");
  addBrandHeader(ws, wb, logo, "CR FATF — AML/CFT Deficient Country Membership (30% weight)", 5);

  let r = 6;
  ws.mergeCells(r, 1, r, 5);
  ws.getCell(r, 1).value = "FATF status → CRAM score mapping";
  ws.getCell(r, 1).font = { bold: true, size: 11 };
  r += 1;
  ["FATF status", "CRAM score", "Implementation note"].forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  r += 1;
  FATF_STATUS_MAP.forEach((row) => {
    ws.getCell(r, 1).value = row.status;
    ws.getCell(r, 2).value = row.score;
    ws.mergeCells(r, 3, r, 5);
    ws.getCell(r, 3).value = row.note;
    for (let c = 1; c <= 5; c += 1) styleDataCell(ws.getCell(r, c));
    r += 1;
  });

  r += 2;
  ws.mergeCells(r, 1, r, 5);
  ws.getCell(r, 1).value = "Countries with elevated FATF pillar (edit column C to test)";
  ws.getCell(r, 1).font = { bold: true };
  r += 1;
  ["Country", "Library score", "Test score", "Overall country (linked)", "FATF band"].forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  const hdr = r;
  const greyList = COUNTRIES.filter((c) => c.fatf >= 2).slice(0, 40);
  greyList.forEach((c, i) => {
    const row = hdr + 1 + i;
    ws.getCell(row, 1).value = c.country;
    ws.getCell(row, 2).value = c.fatf;
    ws.getCell(row, 3).value = c.fatf;
    ws.getCell(row, 3).fill = fillSolid("FFFFFBEB");
    ws.getCell(row, 4).value = { formula: `=ROUND(C${row}*0.3+${c.basel}*0.35+${c.sanctions}*0.3+${c.safe_haven}*0.05,2)` };
    ws.getCell(row, 5).value = { formula: riskRateFromScoreFormula(`D${row}`) };
    for (let col = 1; col <= 5; col += 1) styleDataCell(ws.getCell(row, col));
  });
  addScoreValidation(ws, `C${hdr + 1}:C${hdr + greyList.length}`);
  [32, 12, 12, 16, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  addReadmeSheet(wb, logo, "CR FATF Workbook", [
    ["Weight", "30% of country composite"],
    ["Scores", "1 = normal · 2 = grey list · 3 = call for action"],
  ], ["CR FATF", "Readme"]);
  return wb;
}

export async function buildCrBaselWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM CR BASEL");
  const ws = wb.addWorksheet("CR BASEL");
  addBrandHeader(ws, wb, logo, "CR BASEL — Basel AML Index mapping (35% weight)", 6);

  let r = 6;
  ["Basel raw score", "From", "To", "CRAM score (1–3)"].forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  r += 1;
  BASEL_SCORE_MAP.forEach((row) => {
    ws.getCell(r, 1).value = row.label;
    ws.getCell(r, 2).value = row.rawFrom;
    ws.getCell(r, 3).value = row.rawTo;
    ws.getCell(r, 4).value = row.cramScore;
    for (let c = 1; c <= 4; c += 1) styleDataCell(ws.getCell(r, c));
    r += 1;
  });

  r += 2;
  ws.mergeCells(r, 1, r, 6);
  ws.getCell(r, 1).value = "Country Basel pillar — edit column D to test";
  ws.getCell(r, 1).font = { bold: true };
  r += 1;
  ["Country", "Library band", "Basel library", "Test score", "Country composite", "Band"].forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  const hdr = r;
  const sample = [...COUNTRIES].sort((a, b) => b.basel - a.basel).slice(0, 50);
  sample.forEach((c, i) => {
    const row = hdr + 1 + i;
    ws.getCell(row, 1).value = c.country;
    ws.getCell(row, 2).value = c.band;
    ws.getCell(row, 3).value = c.basel;
    ws.getCell(row, 4).value = c.basel;
    ws.getCell(row, 4).fill = fillSolid("FFFFFBEB");
    ws.getCell(row, 5).value = { formula: `=ROUND(${c.fatf}*0.3+D${row}*0.35+${c.sanctions}*0.3+${c.safe_haven}*0.05,2)` };
    ws.getCell(row, 6).value = { formula: riskRateFromScoreFormula(`E${row}`) };
    for (let col = 1; col <= 6; col += 1) styleDataCell(ws.getCell(row, col));
  });
  addScoreValidation(ws, `D${hdr + 1}:D${hdr + sample.length}`);
  [32, 12, 12, 12, 14, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  addReadmeSheet(wb, logo, "CR BASEL Workbook", [
    ["Weight", "35% of country composite"],
    ["Mapping", "Basel AML Index raw 1–3.99→1 · 4–6.99→2 · 7–10→3 (pre-mapped in library)"],
  ], ["CR BASEL", "Readme"]);
  return wb;
}

export async function buildCrSanctionsWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM CR Sanctions");
  const ws = wb.addWorksheet("CR Sanctions Program");
  addBrandHeader(ws, wb, logo, "Directive concerning Sanctions — Mal Bank Programme", 4);

  let r = 6;
  ws.getCell(r, 1).value = "Country Specific Sanction Programme";
  ws.getCell(r, 1).font = { bold: true, size: 12, color: { argb: BRAND.ink } };
  r += 2;
  ["Category", "Affected country", "Firm floor", "Rule"].forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  r += 1;
  SANCTIONS_COUNTRY_FLOORS.forEach((entry) => {
    entry.countries.forEach((country) => {
      ws.getCell(r, 1).value = entry.category ?? "Programme";
      ws.getCell(r, 2).value = country;
      ws.getCell(r, 3).value = entry.firmFloor >= 4 ? "Prohibited (4)" : "High (3)";
      ws.getCell(r, 4).value = entry.rationale;
      ws.getCell(r, 4).alignment = { wrapText: true };
      ws.getRow(r).height = 36;
      for (let c = 1; c <= 4; c += 1) styleDataCell(ws.getCell(r, c), BRAND.panel);
      r += 1;
    });
  });

  [12, 32, 14, 56].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  addReadmeSheet(wb, logo, "CR Sanctions Programme", [
    ["Category A", "Prohibited — Iran, North Korea, Syria"],
    ["Category B/C", "High geography floor (3) — currency or targeted restrictions"],
    ["Engine", "applySanctionsCountryFloor() never scores below programme floor"],
  ], ["CR Sanctions Program", "Readme"]);
  return wb;
}

export async function buildCrSafeHavenWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM CR Safe Haven");
  const ws = wb.addWorksheet("CR Safe Heaven");
  addBrandHeader(ws, wb, logo, "Terrorist Safe Havens — 5% country pillar weight", 4);

  ws.mergeCells(6, 1, 6, 4);
  ws.getCell(6, 1).value = "Terrorist safe havens — ungoverned or ill-governed areas (Mal CRAM §8). Score = 3 when listed.";
  ws.getCell(6, 1).font = { size: 9, italic: true, color: { argb: BRAND.muted } };
  ws.getCell(6, 1).alignment = { wrapText: true };
  ws.getRow(6).height = 32;

  let r = 8;
  ["#", "Country (alphabetical)", "Safe haven score", "Library value"].forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  r += 1;
  const list = [...sanctionsProgramme.safe_haven_countries].sort();
  list.forEach((name, i) => {
    const row = r + i;
    const lib = COUNTRIES.find((c) => c.country.toLowerCase() === name.toLowerCase());
    ws.getCell(row, 1).value = i + 1;
    ws.getCell(row, 2).value = name;
    ws.getCell(row, 3).value = 3;
    ws.getCell(row, 3).fill = fillSolid(BRAND.high);
    ws.getCell(row, 3).font = { bold: true, color: { argb: BRAND.highText } };
    ws.getCell(row, 3).alignment = { horizontal: "center" };
    ws.getCell(row, 4).value = lib?.safe_haven ?? 1;
    for (let c = 1; c <= 4; c += 1) styleDataCell(ws.getCell(row, c));
  });

  [6, 28, 14, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  addReadmeSheet(wb, logo, "CR Safe Haven Workbook", [
    ["Weight", "5% of country composite"],
    ["Score", "Listed jurisdictions score 3; others default to 1 in library"],
  ], ["CR Safe Heaven", "Readme"]);
  return wb;
}

export async function buildCustomerTypeRiskWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM Customer Type Risk");

  for (const [sheetName, profile, modeLabel] of [
    ["Individual (NP)", NP_PROFILE_PARAMETERS, "Natural Person"],
    ["Entity (LP)", LP_PROFILE_PARAMETERS, "Legal Person / SME"],
  ] as const) {
    const ws = wb.addWorksheet(sheetName.slice(0, 31));
    addBrandHeader(ws, wb, logo, `Customer Type Risk — ${modeLabel}`, 7);
    addRatingScale(ws);

    let r = 10;
    ws.mergeCells(r, 1, r, 7);
    ws.getCell(r, 1).value = `${modeLabel} — weighted customer-type score (PEP excluded — gate only)`;
    ws.getCell(r, 1).font = { bold: true, size: 10 };
    r += 1;

    profile.headers.forEach((h, i) => {
      styleHeaderCell(ws.getCell(r, i + 1));
      ws.getCell(r, i + 1).value = h;
    });
    const hdr = r;
    profile.rows.forEach((row, i) => {
      const dataRow = hdr + 1 + i;
      const [param, weight, low, med, high] = row;
      ws.getRow(dataRow).height = 40;
      ws.getCell(dataRow, 1).value = param;
      ws.getCell(dataRow, 2).value = weight;
      ws.getCell(dataRow, 3).value = low;
      ws.getCell(dataRow, 4).value = med;
      ws.getCell(dataRow, 5).value = high;
      ws.getCell(dataRow, 6).value = 2;
      ws.getCell(dataRow, 6).fill = fillSolid("FFFFFBEB");
      ws.getCell(dataRow, 6).alignment = { horizontal: "center" };
      const pct = parseFloat(String(weight).replace("%", "")) / 100;
      ws.getCell(dataRow, 7).value = { formula: `=F${dataRow}*${pct}` };
      ws.getCell(dataRow, 7).numFmt = "0.000";
      for (let c = 1; c <= 7; c += 1) {
        ws.getCell(dataRow, c).alignment = { wrapText: true, vertical: "top" };
        styleDataCell(ws.getCell(dataRow, c), i % 2 === 0 ? BRAND.white : BRAND.panel);
      }
    });

    const sumRow = hdr + profile.rows.length + 2;
    ws.getCell(sumRow, 1).value = "Customer type score";
    ws.getCell(sumRow, 1).font = { bold: true };
    ws.getCell(sumRow, 6).value = { formula: `=ROUND(SUM(G${hdr + 1}:G${hdr + profile.rows.length}),2)` };
    ws.getCell(sumRow, 6).numFmt = "0.00";
    ws.getCell(sumRow, 6).font = { bold: true, color: { argb: BRAND.purple } };
    ws.getCell(sumRow, 7).value = { formula: riskRateFromScoreFormula(`F${sumRow}`) };

    addScoreValidation(ws, `F${hdr + 1}:F${hdr + profile.rows.length}`);
    [28, 10, 24, 24, 24, 10, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  }

  addReadmeSheet(wb, logo, "Customer Type Risk Workbook", [
    ["NP", "8 parameters — employment, segment, PEP, SoF, SoW, residency, adverse intel, cooperation"],
    ["LP", "8 parameters — legal form, UBO, activity, history, licensing, related-party, transparency, merchant"],
    ["Formula", "Score = Σ(parameter_score × weight)"],
  ], ["Individual (NP)", "Entity (LP)", "Readme"]);
  return wb;
}

export async function buildDeliveryChannelRiskWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM Delivery Channel Risk");
  const ws = wb.addWorksheet("Delivery Channel Risk");
  addBrandHeader(ws, wb, logo, "Delivery Channel Risk — max(initiation, delivery)", 6);
  addRatingScale(ws);

  const addChannelTable = (title: string, startRow: number, channels: readonly { label: string; score: number }[]) => {
    ws.mergeCells(startRow, 1, startRow, 6);
    ws.getCell(startRow, 1).value = title;
    ws.getCell(startRow, 1).font = { bold: true, size: 11, color: { argb: BRAND.ink } };
    ws.getCell(startRow, 1).fill = fillSolid(BRAND.peach);
    const hdr = startRow + 1;
    ["Sl No.", "Channel", "Overall Score", "Overall Risk Rate", "Option", "Score"].forEach((h, i) => {
      styleHeaderCell(ws.getCell(hdr, i + 1));
      ws.getCell(hdr, i + 1).value = h;
    });
    channels.forEach((ch, i) => {
      const row = hdr + 1 + i;
      ws.getCell(row, 1).value = i + 1;
      ws.getCell(row, 2).value = ch.label;
      ws.getCell(row, 5).value = ch.label.split("·")[0]?.trim() ?? ch.label;
      ws.getCell(row, 6).value = ch.score;
      ws.getCell(row, 6).fill = fillSolid("FFFFFBEB");
      ws.getCell(row, 3).value = { formula: `=F${row}` };
      ws.getCell(row, 4).value = { formula: riskRateFromScoreFormula(`F${row}`) };
      for (let c = 1; c <= 6; c += 1) styleDataCell(ws.getCell(row, c));
    });
    return hdr + channels.length;
  };

  const initHdr = 11;
  const initLast = addChannelTable("Relationship Initiation Method (Mal BaaS)", 10, INITIATION_CHANNELS);
  const delHdr = initLast + 4;
  const delLast = addChannelTable("Delivery Method", initLast + 3, DELIVERY_CHANNELS);

  const sumRow = delLast + 3;
  const initFirst = initHdr + 1;
  const delFirst = delHdr + 1;
  ws.getCell(sumRow, 1).value = "CRAM channel pillar (max score)";
  ws.getCell(sumRow, 1).font = { bold: true };
  ws.getCell(sumRow, 3).value = { formula: `=MAX(C${initFirst}:C${initLast},C${delFirst}:C${delLast})` };
  ws.getCell(sumRow, 3).font = { bold: true, color: { argb: BRAND.purple } };
  ws.getCell(sumRow, 4).value = { formula: riskRateFromScoreFormula(`C${sumRow}`) };

  addScoreValidation(ws, `F12:F${delLast}`);
  [8, 36, 14, 14, 24, 8].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  addReadmeSheet(wb, logo, "Delivery Channel Risk", [
    ["Logic", "Engine uses max(initiation, delivery) — non-dilution rule"],
    ["Mal default", "E Channel initiation (1) · Mobile delivery (2) → pillar = 2 Medium"],
  ], ["Delivery Channel Risk", "Readme"]);
  return wb;
}

export async function buildTransactionInvestigationWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM Transaction Investigation");
  const ws = wb.addWorksheet("Transaction Investigation");
  addBrandHeader(ws, wb, logo, "Transaction Investigation Risk — investigations & STR drivers", 5);

  const addLookupTable = (title: string, startRow: number, rows: { label: string; rating: number }[]) => {
    ws.mergeCells(startRow, 1, startRow, 5);
    ws.getCell(startRow, 1).value = title;
    ws.getCell(startRow, 1).font = { bold: true, size: 11 };
    const hdr = startRow + 1;
    ["S.no", "Number", "Rating", "Override To", "Notes"].forEach((h, i) => {
      styleHeaderCell(ws.getCell(hdr, i + 1));
      ws.getCell(hdr, i + 1).value = h;
    });
    rows.forEach((row, i) => {
      const rowNum = hdr + 1 + i;
      ws.getCell(rowNum, 1).value = i + 1;
      ws.getCell(rowNum, 2).value = row.label;
      ws.getCell(rowNum, 3).value = row.rating;
      ws.getCell(rowNum, 4).fill = fillSolid("FFFCE7F3");
      ws.getCell(rowNum, 5).value = row.rating >= 3 ? "OVR-010 may apply" : "";
      for (let c = 1; c <= 5; c += 1) styleDataCell(ws.getCell(rowNum, c));
    });
    return hdr + rows.length;
  };

  let last = addLookupTable("Number of investigations carried out in last year", 6, INVESTIGATION_MATRIX);
  last = addLookupTable("Number of STR filed in last year", last + 3, STR_MATRIX);

  const calcRow = last + 3;
  ws.getCell(calcRow, 1).value = "Enter counts →";
  ws.getCell(calcRow, 2).value = 0;
  ws.getCell(calcRow, 2).fill = fillSolid("FFFFFBEB");
  ws.getCell(calcRow, 3).value = 0;
  ws.getCell(calcRow, 3).fill = fillSolid("FFFFFBEB");
  ws.getCell(calcRow + 1, 1).value = "Investigation score";
  ws.getCell(calcRow + 1, 2).value = { formula: `=IF(B${calcRow}=0,0,IF(B${calcRow}<=2,2,3))` };
  ws.getCell(calcRow + 2, 1).value = "STR score";
  ws.getCell(calcRow + 2, 2).value = { formula: `=IF(C${calcRow}=0,0,3)` };
  ws.getCell(calcRow + 3, 1).value = "Transaction factor component";
  ws.getCell(calcRow + 3, 1).font = { bold: true };
  ws.getCell(calcRow + 3, 2).value = { formula: `=MAX(B${calcRow + 1},B${calcRow + 2})` };
  ws.getCell(calcRow + 3, 2).font = { bold: true, color: { argb: BRAND.purple } };

  let br = calcRow + 6;
  BEHAVIOUR_TRIGGERS.headers.forEach((h, i) => {
    styleHeaderCell(ws.getCell(br, i + 1));
    ws.getCell(br, i + 1).value = h;
  });
  br += 1;
  BEHAVIOUR_TRIGGERS.rows.forEach((row) => {
    row.forEach((v, i) => {
      ws.getCell(br, i + 1).value = v;
      styleDataCell(ws.getCell(br, i + 1));
      ws.getCell(br, i + 1).alignment = { wrapText: true };
    });
    ws.getRow(br).height = 28;
    br += 1;
  });

  [36, 14, 10, 14, 24].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  addReadmeSheet(wb, logo, "Transaction Investigation Risk", [
    ["Engine", "transaction = max(TM band, investigations, STR, behaviour uplift)"],
    ["Override", "Investigations/STR ≥ 3 triggers OVR-010 review path"],
  ], ["Transaction Investigation", "Readme"]);
  return wb;
}

export async function buildReviewPeriodicityWorkbook() {
  const logo = await loadLogoBuffer();
  const wb = newWorkbook("Mal CRAM Review Periodicity");
  const ws = wb.addWorksheet("Review Periodicity");
  addBrandHeader(ws, wb, logo, "Review Periodicity — Mal golden thread vs CBUAE maximum", 5);

  let r = 6;
  ws.getCell(r, 1).value = "Review Periodicity";
  ws.getCell(r, 1).font = { bold: true, size: 14 };
  r += 2;
  ["Final risk rating", "Mal operational (months)", "CBUAE maximum (months)", "Next review (from today)", "Monitoring intensity"].forEach((h, i) => {
    styleHeaderCell(ws.getCell(r, i + 1));
    ws.getCell(r, i + 1).value = h;
  });
  r += 1;
  REVIEW_ROWS.forEach((row) => {
    ws.getCell(r, 1).value = row.rating;
    ws.getCell(r, 2).value = row.malMonths;
    ws.getCell(r, 3).value = row.cbuaeMaxMonths;
    ws.getCell(r, 4).value = { formula: `=EDATE(TODAY(),B${r})` };
    ws.getCell(r, 4).numFmt = "dd-mmm-yyyy";
    const outcome = OUTCOME_MAPPING.rows.find((o) => o[0].toLowerCase().includes(row.rating.split(" ")[0].toLowerCase()));
    ws.getCell(r, 5).value = outcome?.[4] ?? "";
    ws.getCell(r, 5).alignment = { wrapText: true };
    ws.getRow(r).height = 28;
    for (let c = 1; c <= 5; c += 1) styleDataCell(ws.getCell(r, c));
    r += 1;
  });

  r += 2;
  ws.mergeCells(r, 1, r, 5);
  ws.getCell(r, 1).value = "Note: Mal FinCrime OS uses 60/36/12 months in golden thread; CBUAE methodology cites 36/24/12 as maximum review frequencies.";
  ws.getCell(r, 1).font = { italic: true, size: 9, color: { argb: BRAND.muted } };

  [18, 18, 18, 16, 40].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  addReadmeSheet(wb, logo, "Review Periodicity Workbook", [
    ["Mal OS", "Low 60 mo · Medium 36 mo · High 12 mo"],
    ["CBUAE max", "Low 36 mo · Medium 24 mo · High 12 mo"],
  ], ["Review Periodicity", "Readme"]);
  return wb;
}

export type MethodologyWorkbookKind =
  | "country"
  | "cr-fatf"
  | "cr-basel"
  | "cr-sanctions"
  | "cr-safe-haven"
  | "customer-type"
  | "delivery-channel"
  | "transaction-investigation"
  | "review-periodicity";

const BUILDERS: Record<MethodologyWorkbookKind, () => Promise<ExcelJS.Workbook>> = {
  country: buildCountryRiskWorkbook,
  "cr-fatf": buildCrFatfWorkbook,
  "cr-basel": buildCrBaselWorkbook,
  "cr-sanctions": buildCrSanctionsWorkbook,
  "cr-safe-haven": buildCrSafeHavenWorkbook,
  "customer-type": buildCustomerTypeRiskWorkbook,
  "delivery-channel": buildDeliveryChannelRiskWorkbook,
  "transaction-investigation": buildTransactionInvestigationWorkbook,
  "review-periodicity": buildReviewPeriodicityWorkbook,
};

export const METHODOLOGY_EXCEL_EXPORTS: {
  kind: MethodologyWorkbookKind;
  label: string;
  slug: string;
  group: "country" | "customer" | "operations" | "product";
}[] = [
  { kind: "country", label: "Country risk", slug: "Country-Risk", group: "country" },
  { kind: "cr-fatf", label: "CR FATF", slug: "CR-FATF", group: "country" },
  { kind: "cr-basel", label: "CR BASEL", slug: "CR-BASEL", group: "country" },
  { kind: "cr-sanctions", label: "CR Sanctions", slug: "CR-Sanctions-Program", group: "country" },
  { kind: "cr-safe-haven", label: "CR Safe Haven", slug: "CR-Safe-Haven", group: "country" },
  { kind: "customer-type", label: "Customer type", slug: "Customer-Type-Risk", group: "customer" },
  { kind: "delivery-channel", label: "Delivery channel", slug: "Delivery-Channel-Risk", group: "customer" },
  { kind: "transaction-investigation", label: "Transaction investigation", slug: "Transaction-Investigation-Risk", group: "operations" },
  { kind: "review-periodicity", label: "Review periodicity", slug: "Review-Periodicity", group: "operations" },
];

export async function buildMethodologyWorkbook(kind: MethodologyWorkbookKind) {
  return BUILDERS[kind]();
}

export async function exportMethodologyWorkbook(kind: MethodologyWorkbookKind) {
  const meta = METHODOLOGY_EXCEL_EXPORTS.find((e) => e.kind === kind);
  const wb = await buildMethodologyWorkbook(kind);
  await downloadWorkbook(wb, exportFilename(meta?.slug ?? kind));
}
