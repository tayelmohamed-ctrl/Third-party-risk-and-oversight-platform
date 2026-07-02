/**
 * Mal-branded CRAM product/service risk Excel workbooks — formulas, validation, styling.
 */
import ExcelJS from "exceljs";
import {
  MAL_SME_PRODUCT_ASSESSMENTS,
  MAL_SME_SERVICE_ASSESSMENTS,
  PRODUCT_RISK_DRIVERS,
  PRODUCT_RISK_TREATMENT_RULES,
  PRODUCT_SERVICE_RATING_BANDS,
  SERVICE_RISK_DRIVERS,
  WORKBOOK_META,
  type ProductRiskAssessment,
  type RiskDriverDefinition,
  type ServiceRiskAssessment,
} from "../config/malProductServiceRiskLibraries";
import { getMalLogoPngBuffer } from "./malLogoAsset";

const BRAND = {
  navy: "FF0C1233",
  navyLight: "FF141B36",
  purple: "FFA953DF",
  cyan: "FF39B9ED",
  ink: "FF1A1F36",
  muted: "FF64748B",
  line: "FFE2E8F0",
  panel: "FFF8F9FC",
  low: "FFDCFCE7",
  lowText: "FF166534",
  med: "FFFEF3C7",
  medText: "FFB45309",
  high: "FFFEE2E2",
  highText: "FFB91C1C",
  white: "FFFFFFFF",
};

const DATA_START_ROW = 15;
const TEMPLATE_BLANK_ROWS = 8;
const WEIGHT_ROW = 13;
const HEADER_ROW = 12;
const SUBHEADER_ROW = 14;

function colLetter(n: number): string {
  let s = "";
  let num = n;
  while (num > 0) {
    const m = (num - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

function scoreColIndex(driverIndex: number): number {
  return 6 + driverIndex * 2; // F, H, J …
}

function weightedScoreFormula(drivers: RiskDriverDefinition[], dataRow: number): string {
  const terms = drivers.map((_, i) => {
    const c = colLetter(scoreColIndex(i));
    return `${c}$${WEIGHT_ROW}*${c}${dataRow}`;
  });
  return `=ROUND(${terms.join("+")},2)`;
}

function riskRateFormula(dataRow: number): string {
  return `=IF(C${dataRow}<=1,"Low",IF(C${dataRow}<=2,"Medium","High"))`;
}

function fillSolid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function thinBorder(color = BRAND.line): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: color } };
  return { top: side, left: side, bottom: side, right: side };
}

async function loadLogoBuffer(): Promise<ArrayBuffer> {
  try {
    if (typeof fetch !== "undefined") {
      const res = await fetch("/mal-logo.png");
      if (res.ok) return res.arrayBuffer();
    }
  } catch {
    /* fallback */
  }
  try {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const pngPath = join(here, "../../public/mal-logo.png");
    return readFileSync(pngPath).buffer as ArrayBuffer;
  } catch {
    return getMalLogoPngBuffer(128);
  }
}

function styleHeaderCell(cell: ExcelJS.Cell, argb = BRAND.navy) {
  cell.fill = fillSolid(argb);
  cell.font = { bold: true, color: { argb: BRAND.white }, size: 10 };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = thinBorder("FF334155");
}

function addBrandHeader(
  ws: ExcelJS.Worksheet,
  wb: ExcelJS.Workbook,
  logoBuffer: ArrayBuffer,
  title: string,
  lastCol: number,
) {
  ws.getRow(1).height = 28;
  ws.getRow(2).height = 22;
  ws.getRow(3).height = 16;
  ws.getRow(4).height = 16;

  const logoId = wb.addImage({ buffer: logoBuffer, extension: "png" });
  ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 52, height: 52 } });

  ws.mergeCells(1, 3, 1, lastCol);
  const titleCell = ws.getCell(1, 3);
  titleCell.value = "Mal FinCrime OS";
  titleCell.font = { bold: true, size: 16, color: { argb: BRAND.purple } };
  titleCell.alignment = { vertical: "middle" };

  ws.mergeCells(2, 3, 2, lastCol);
  const subCell = ws.getCell(2, 3);
  subCell.value = title;
  subCell.font = { bold: true, size: 12, color: { argb: BRAND.ink } };
  subCell.alignment = { vertical: "middle" };

  ws.mergeCells(3, 1, 3, lastCol);
  ws.getCell(3, 1).value = WORKBOOK_META.methodologyRef;
  ws.getCell(3, 1).font = { size: 9, color: { argb: BRAND.muted } };

  ws.mergeCells(4, 1, 4, lastCol);
  ws.getCell(4, 1).value = `${WORKBOOK_META.modelVersionId} · Generated ${new Date().toLocaleString()} · Edit yellow Score cells (1–3) to test your product`;
  ws.getCell(4, 1).font = { size: 9, italic: true, color: { argb: BRAND.muted } };
}

function addRatingScale(ws: ExcelJS.Worksheet, startRow = 6) {
  const headers = ["Ranking", "From", "To"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(startRow, i + 1);
    cell.value = h;
    styleHeaderCell(cell, BRAND.navyLight);
  });
  PRODUCT_SERVICE_RATING_BANDS.forEach((b, i) => {
    const r = startRow + 1 + i;
    ws.getCell(r, 1).value = b.rating;
    ws.getCell(r, 2).value = b.from;
    ws.getCell(r, 3).value = b.to;
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 2).numFmt = "0.00";
    ws.getCell(r, 3).numFmt = "0.00";
    const bg = b.rating === "High" ? BRAND.high : b.rating === "Medium" ? BRAND.med : BRAND.low;
    const fg = b.rating === "High" ? BRAND.highText : b.rating === "Medium" ? BRAND.medText : BRAND.lowText;
    ws.getCell(r, 1).fill = fillSolid(bg);
    ws.getCell(r, 1).font = { bold: true, color: { argb: fg } };
    [1, 2, 3].forEach((c) => { ws.getCell(r, c).border = thinBorder(); });
  });
}

function addAssessmentTable(
  ws: ExcelJS.Worksheet,
  kind: "product" | "service",
  drivers: RiskDriverDefinition[],
  assessments: ProductRiskAssessment[] | ServiceRiskAssessment[],
) {
  const lastCol = 4 + drivers.length * 2;
  const itemLabel = kind === "product" ? "Products" : "Service";
  const scoreLabel = kind === "product" ? "Overall Product Score" : "Overall Service Score";
  const rateLabel = kind === "product" ? "Overall Product Risk Rate" : "Overall Service Risk Rate";

  ws.mergeCells(10, 1, 10, lastCol);
  ws.getCell(10, 1).value = kind === "product"
    ? "§9 Product Risk Assessment — weighted score = Σ(weight × score). Highest product score drives CRAM product pillar."
    : "Service Risk Assessment — weighted score for SME servicing layer.";
  ws.getCell(10, 1).font = { bold: true, size: 10, color: { argb: BRAND.ink } };

  // Row 12 — main headers
  const h12 = ws.getRow(HEADER_ROW);
  h12.height = 36;
  [1, 2, 3, 4].forEach((c, i) => {
    const labels = ["Sl No.", itemLabel, scoreLabel, rateLabel];
    const cell = ws.getCell(HEADER_ROW, c);
    cell.value = labels[i];
    styleHeaderCell(cell);
  });
  drivers.forEach((drv, i) => {
    const c0 = scoreColIndex(i) - 1;
    ws.mergeCells(HEADER_ROW, c0, HEADER_ROW, c0 + 1);
    const cell = ws.getCell(HEADER_ROW, c0);
    cell.value = `${drv.name}\n${drv.question}`;
    styleHeaderCell(cell, "FF1E293B");
  });

  // Row 13 — weights (hidden decimals for formulas)
  ws.getRow(WEIGHT_ROW).height = 18;
  ws.getCell(WEIGHT_ROW, 1).value = "";
  ws.getCell(WEIGHT_ROW, 2).value = "Driver weights →";
  ws.getCell(WEIGHT_ROW, 2).font = { bold: true, size: 9, color: { argb: BRAND.muted } };
  drivers.forEach((drv, i) => {
    const optCol = scoreColIndex(i) - 1;
    const scoreCol = scoreColIndex(i);
    ws.mergeCells(WEIGHT_ROW, optCol, WEIGHT_ROW, scoreCol);
    const cell = ws.getCell(WEIGHT_ROW, optCol);
    cell.value = drv.weight;
    cell.numFmt = "0%";
    cell.font = { bold: true, size: 9, color: { argb: BRAND.purple } };
    cell.alignment = { horizontal: "center" };
    cell.fill = fillSolid("FFF3E8FF");
    cell.border = thinBorder();
  });

  // Row 14 — subheaders
  ws.getRow(SUBHEADER_ROW).height = 16;
  [1, 2, 3, 4].forEach((c) => {
    const cell = ws.getCell(SUBHEADER_ROW, c);
    cell.fill = fillSolid(BRAND.panel);
    cell.border = thinBorder();
  });
  drivers.forEach((_, i) => {
    const optCol = scoreColIndex(i) - 1;
    const scoreCol = scoreColIndex(i);
    ws.getCell(SUBHEADER_ROW, optCol).value = "Option";
    ws.getCell(SUBHEADER_ROW, scoreCol).value = "Score";
    [optCol, scoreCol].forEach((c) => {
      const cell = ws.getCell(SUBHEADER_ROW, c);
      cell.font = { bold: true, size: 9, color: { argb: BRAND.muted } };
      cell.fill = fillSolid(BRAND.panel);
      cell.alignment = { horizontal: "center" };
      cell.border = thinBorder();
    });
  });

  const totalRows = assessments.length + TEMPLATE_BLANK_ROWS;
  const lastDataRow = DATA_START_ROW + totalRows - 1;

  // Data rows — seeded + blank templates
  for (let i = 0; i < totalRows; i += 1) {
    const row = DATA_START_ROW + i;
    const item = assessments[i];
    ws.getRow(row).height = 28;

    ws.getCell(row, 1).value = item ? i + 1 : "";
    ws.getCell(row, 1).alignment = { horizontal: "center" };
    ws.getCell(row, 2).value = item?.name ?? "";
    if (item && "segment" in item) {
      ws.getCell(row, 2).note = item.segment;
    }

    // Formula columns
    ws.getCell(row, 3).value = { formula: weightedScoreFormula(drivers, row) } as ExcelJS.CellFormulaValue;
    ws.getCell(row, 3).numFmt = "0.00";
    ws.getCell(row, 3).font = { bold: true };

    ws.getCell(row, 4).value = { formula: riskRateFormula(row) } as ExcelJS.CellFormulaValue;
    ws.getCell(row, 4).font = { bold: true };
    ws.getCell(row, 4).alignment = { horizontal: "center" };

    drivers.forEach((drv, di) => {
      const optCol = scoreColIndex(di) - 1;
      const scoreCol = scoreColIndex(di);
      const picked = item?.drivers[drv.id];
      ws.getCell(row, optCol).value = picked?.option ?? "";
      ws.getCell(row, optCol).alignment = { wrapText: true, vertical: "top" };
      ws.getCell(row, scoreCol).value = picked?.score ?? "";
      ws.getCell(row, scoreCol).alignment = { horizontal: "center" };
      ws.getCell(row, scoreCol).fill = fillSolid("FFFFFBEB");
    });

    // Zebra + borders
    const bg = i % 2 === 0 ? BRAND.white : BRAND.panel;
    for (let c = 1; c <= lastCol; c += 1) {
      const cell = ws.getCell(row, c);
      const isScoreCol = drivers.some((_, di) => scoreColIndex(di) === c);
      if (!isScoreCol) {
        cell.fill = fillSolid(bg);
      }
      cell.border = thinBorder();
    }
  }

  // Score validation 1–3 on all score columns
  drivers.forEach((_, i) => {
    const scoreCol = colLetter(scoreColIndex(i));
    ws.dataValidations.add(`${scoreCol}${DATA_START_ROW}:${scoreCol}${lastDataRow}`, {
      type: "list",
      allowBlank: true,
      formulae: ['"1,2,3"'],
      showErrorMessage: true,
      errorTitle: "Invalid score",
      error: "Enter 1 (Low), 2 (Medium) or 3 (High)",
    });
  });

  // Conditional formatting on rate column
  ws.addConditionalFormatting({
    ref: `D${DATA_START_ROW}:D${lastDataRow}`,
    rules: [
      {
        type: "containsText",
        operator: "containsText",
        priority: 1,
        text: "Low",
        style: { fill: fillSolid(BRAND.low), font: { bold: true, color: { argb: BRAND.lowText } } },
      },
      {
        type: "containsText",
        operator: "containsText",
        priority: 2,
        text: "Medium",
        style: { fill: fillSolid(BRAND.med), font: { bold: true, color: { argb: BRAND.medText } } },
      },
      {
        type: "containsText",
        operator: "containsText",
        priority: 3,
        text: "High",
        style: { fill: fillSolid(BRAND.high), font: { bold: true, color: { argb: BRAND.highText } } },
      },
    ],
  });

  // Freeze header + first columns
  ws.views = [{
    state: "frozen",
    xSplit: 4,
    ySplit: SUBHEADER_ROW,
    topLeftCell: `E${DATA_START_ROW}`,
    activeCell: `E${DATA_START_ROW}`,
  }];

  // Column widths
  ws.getColumn(1).width = 7;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  drivers.forEach((_, i) => {
    ws.getColumn(scoreColIndex(i) - 1).width = 24;
    ws.getColumn(scoreColIndex(i)).width = 8;
  });

  // Summary — max score drives CRAM product/service pillar
  const summaryRow = lastDataRow + 2;
  ws.mergeCells(summaryRow, 1, summaryRow, 2);
  ws.getCell(summaryRow, 1).value = kind === "product"
    ? "CRAM product pillar (highest product score)"
    : "CRAM service pillar (highest service score)";
  ws.getCell(summaryRow, 1).font = { bold: true, size: 10, color: { argb: BRAND.ink } };
  ws.getCell(summaryRow, 1).alignment = { vertical: "middle" };
  ws.getCell(summaryRow, 3).value = {
    formula: `=MAX(C${DATA_START_ROW}:C${lastDataRow})`,
  } as ExcelJS.CellFormulaValue;
  ws.getCell(summaryRow, 3).numFmt = "0.00";
  ws.getCell(summaryRow, 3).font = { bold: true, size: 11, color: { argb: BRAND.purple } };
  ws.getCell(summaryRow, 3).fill = fillSolid("FFF3E8FF");
  ws.getCell(summaryRow, 3).border = thinBorder();
  ws.getCell(summaryRow, 4).value = {
    formula: `=IF(C${summaryRow}<=1,"Low",IF(C${summaryRow}<=2,"Medium","High"))`,
  } as ExcelJS.CellFormulaValue;
  ws.getCell(summaryRow, 4).font = { bold: true };
  ws.getCell(summaryRow, 4).alignment = { horizontal: "center" };
  ws.getCell(summaryRow, 4).border = thinBorder();

  // Instructions block below summary
  const noteRow = summaryRow + 2;
  ws.mergeCells(noteRow, 1, noteRow, lastCol);
  ws.getCell(noteRow, 1).value = "Instructions: (1) Edit Option text and Score (1–3) in yellow cells — overall score and risk rate recalculate automatically. (2) Add new products in blank rows below seeded examples. (3) CRAM pillar uses the highest score in column C. (4) See Driver Library sheet for Low/Medium/High definitions.";
  ws.getCell(noteRow, 1).font = { size: 9, color: { argb: BRAND.muted }, italic: true };
  ws.getCell(noteRow, 1).alignment = { wrapText: true };
  ws.getRow(noteRow).height = 36;
}

function addDriverLibrarySheet(wb: ExcelJS.Workbook, logoBuffer: ArrayBuffer) {
  const ws = wb.addWorksheet("Driver Library §9.1", {
    views: [{ showGridLines: true }],
  });
  addBrandHeader(ws, wb, logoBuffer, "§9.1 Product Risk Driver Library · §9.2 Treatment Rules", 6);

  let r = 6;
  ["Driver", "Weight", "Low = 1", "Medium = 2", "High = 3", "Implementation rule"].forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    styleHeaderCell(cell);
  });
  r += 1;
  PRODUCT_RISK_DRIVERS.forEach((d) => {
    ws.getRow(r).height = 40;
    ws.getCell(r, 1).value = d.name;
    ws.getCell(r, 2).value = `${d.weightPct}%`;
    ws.getCell(r, 3).value = d.lowLabel;
    ws.getCell(r, 4).value = d.mediumLabel;
    ws.getCell(r, 5).value = d.highLabel;
    ws.getCell(r, 6).value = d.implementationRule;
    for (let c = 1; c <= 6; c += 1) {
      ws.getCell(r, c).alignment = { wrapText: true, vertical: "top" };
      ws.getCell(r, c).border = thinBorder();
    }
    r += 1;
  });
  r += 1;
  ws.mergeCells(r, 1, r, 6);
  ws.getCell(r, 1).value = "§9.2 Product risk treatment rules";
  ws.getCell(r, 1).font = { bold: true, size: 11, color: { argb: BRAND.ink } };
  r += 1;
  PRODUCT_RISK_TREATMENT_RULES.forEach((rule, i) => {
    ws.mergeCells(r, 1, r, 6);
    ws.getCell(r, 1).value = `${i + 1}. ${rule}`;
    ws.getCell(r, 1).alignment = { wrapText: true };
    ws.getRow(r).height = 28;
    r += 1;
  });
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 28;
  ws.getColumn(6).width = 48;
}

function addServiceDriverSheet(wb: ExcelJS.Workbook, logoBuffer: ArrayBuffer) {
  const ws = wb.addWorksheet("Service Drivers", {});
  addBrandHeader(ws, wb, logoBuffer, "Mal Bank SME — Service Risk Driver Library", 6);
  let r = 6;
  ["Driver", "Weight", "Low = 1", "Medium = 2", "High = 3", "Implementation rule"].forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    styleHeaderCell(cell);
  });
  r += 1;
  SERVICE_RISK_DRIVERS.forEach((d) => {
    ws.getRow(r).height = 36;
    ws.getCell(r, 1).value = d.name;
    ws.getCell(r, 2).value = `${d.weightPct}%`;
    ws.getCell(r, 3).value = d.lowLabel;
    ws.getCell(r, 4).value = d.mediumLabel;
    ws.getCell(r, 5).value = d.highLabel;
    ws.getCell(r, 6).value = d.implementationRule;
    for (let c = 1; c <= 6; c += 1) {
      ws.getCell(r, c).alignment = { wrapText: true, vertical: "top" };
      ws.getCell(r, c).border = thinBorder();
    }
    r += 1;
  });
  [28, 10, 28, 28, 28, 48].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

function addReadmeSheet(wb: ExcelJS.Workbook, logoBuffer: ArrayBuffer, sheets: string[]) {
  const ws = wb.addWorksheet("Readme", {});
  addBrandHeader(ws, wb, logoBuffer, WORKBOOK_META.title, 4);
  const lines: [string, string][] = [
    ["Purpose", "Interactive CRAM §9 product/service risk workbook for Mal Bank SME product team."],
    ["Products", "UAE IBAN · Global Account (Zenus) · Financing · Domestic Payments · Debit Card"],
    ["Formula", "Overall score = ROUND(Σ driver_weight × driver_score, 2)"],
    ["Rating bands", "Low ≤ 1.00 · Medium 1.01–2.00 · High ≥ 2.01"],
    ["Edit cells", "Yellow Score columns accept 1, 2 or 3 only. Option column is free text."],
    ["Portal", "Product & service pillars use max(product, service) in six-factor CRAM composite."],
  ];
  let r = 6;
  lines.forEach(([k, v]) => {
    ws.getCell(r, 1).value = k;
    ws.getCell(r, 1).font = { bold: true, color: { argb: BRAND.ink } };
    ws.mergeCells(r, 2, r, 4);
    ws.getCell(r, 2).value = v;
    ws.getCell(r, 2).alignment = { wrapText: true };
    ws.getRow(r).height = 22;
    r += 1;
  });
  r += 1;
  ws.getCell(r, 1).value = "Sheets in this workbook";
  ws.getCell(r, 1).font = { bold: true };
  r += 1;
  sheets.forEach((s) => {
    ws.getCell(r, 1).value = `• ${s}`;
    r += 1;
  });
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 72;
}

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function buildProductRiskWorkbook(): Promise<ExcelJS.Workbook> {
  const logoBuffer = await loadLogoBuffer();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mal FinCrime OS";
  wb.created = new Date();
  wb.title = WORKBOOK_META.title;

  const ws = wb.addWorksheet("Product Risk", { properties: { defaultRowHeight: 18 } });
  const lastCol = 4 + PRODUCT_RISK_DRIVERS.length * 2;
  addBrandHeader(ws, wb, logoBuffer, "Product Risk — Mal Bank SME (UAE IBAN · Global Account · Financing)", lastCol);
  addRatingScale(ws);
  addAssessmentTable(ws, "product", PRODUCT_RISK_DRIVERS, MAL_SME_PRODUCT_ASSESSMENTS);
  addDriverLibrarySheet(wb, logoBuffer);
  addReadmeSheet(wb, logoBuffer, ["Product Risk (interactive)", "Driver Library §9.1", "Readme"]);
  wb.views = [{ activeTab: 0, firstSheet: 0, visibility: "visible" }];
  return wb;
}

export async function buildServiceRiskWorkbook(): Promise<ExcelJS.Workbook> {
  const logoBuffer = await loadLogoBuffer();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mal FinCrime OS";
  wb.created = new Date();
  wb.title = WORKBOOK_META.title;

  const ws = wb.addWorksheet("Service Risk", { properties: { defaultRowHeight: 18 } });
  const lastCol = 4 + SERVICE_RISK_DRIVERS.length * 2;
  addBrandHeader(ws, wb, logoBuffer, "Service Risk — Mal Bank SME", lastCol);
  addRatingScale(ws);
  addAssessmentTable(ws, "service", SERVICE_RISK_DRIVERS, MAL_SME_SERVICE_ASSESSMENTS);
  addServiceDriverSheet(wb, logoBuffer);
  addReadmeSheet(wb, logoBuffer, ["Service Risk (interactive)", "Service Drivers", "Readme"]);
  wb.views = [{ activeTab: 0, firstSheet: 0, visibility: "visible" }];
  return wb;
}

export async function exportMalProductRiskWorkbook(): Promise<void> {
  const wb = await buildProductRiskWorkbook();
  await downloadWorkbook(
    wb,
    `Mal-CRAM-Product-Risk-SME-${WORKBOOK_META.modelVersionId}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export async function exportMalServiceRiskWorkbook(): Promise<void> {
  const wb = await buildServiceRiskWorkbook();
  await downloadWorkbook(
    wb,
    `Mal-CRAM-Service-Risk-SME-${WORKBOOK_META.modelVersionId}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

/** Test helper — verify formulas exist in generated workbook buffer. */
export async function verifyWorkbookFormulas(kind: "product" | "service"): Promise<boolean> {
  const wb = kind === "product" ? await buildProductRiskWorkbook() : await buildServiceRiskWorkbook();
  const ws = wb.getWorksheet(kind === "product" ? "Product Risk" : "Service Risk")!;
  const scoreCell = ws.getCell(DATA_START_ROW, 3);
  const rateCell = ws.getCell(DATA_START_ROW, 4);
  return typeof scoreCell.value === "object" && scoreCell.value !== null && "formula" in scoreCell.value
    && typeof rateCell.value === "object" && rateCell.value !== null && "formula" in rateCell.value;
}
