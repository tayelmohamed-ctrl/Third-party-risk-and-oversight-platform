/**
 * Shared Mal-branded Excel workbook utilities for CRAM methodology exports.
 */
import ExcelJS from "exceljs";
import { getMalLogoPngBuffer } from "./malLogoAsset";
import { WORKBOOK_META } from "../config/malProductServiceRiskLibraries";

export { WORKBOOK_META };

type WorksheetWithValidations = ExcelJS.Worksheet & {
  dataValidations: { add: (ref: string, rule: ExcelJS.DataValidation) => void };
};

export function addListValidation(ws: ExcelJS.Worksheet, ref: string, rule: ExcelJS.DataValidation) {
  (ws as WorksheetWithValidations).dataValidations.add(ref, rule);
}

export const BRAND = {
  navy: "FF0C1233",
  navyLight: "FF141B36",
  purple: "FFA953DF",
  cyan: "FF39B9ED",
  ink: "FF1A1F36",
  muted: "FF64748B",
  line: "FFE2E8F0",
  panel: "FFF8F9FC",
  peach: "FFFDE8D8",
  low: "FFDCFCE7",
  lowText: "FF166534",
  med: "FFFEF3C7",
  medText: "FFB45309",
  high: "FFFEE2E2",
  highText: "FFB91C1C",
  white: "FFFFFFFF",
};

export const COUNTRY_PILLAR_WEIGHTS = {
  fatf: 0.3,
  basel: 0.35,
  sanctions: 0.3,
  safeHaven: 0.05,
} as const;

export const PRODUCT_SERVICE_RATING_BANDS = [
  { rating: "High" as const, from: 2.01, to: 3.0 },
  { rating: "Medium" as const, from: 1.01, to: 2.0 },
  { rating: "Low" as const, from: 0.0, to: 1.0 },
];

export function colLetter(n: number): string {
  let s = "";
  let num = n;
  while (num > 0) {
    const m = (num - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

export function fillSolid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

export function thinBorder(color = BRAND.line): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: color } };
  return { top: side, left: side, bottom: side, right: side };
}

export function styleHeaderCell(cell: ExcelJS.Cell, argb = BRAND.navy) {
  cell.fill = fillSolid(argb);
  cell.font = { bold: true, color: { argb: BRAND.white }, size: 10 };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = thinBorder("FF334155");
}

export function riskRateFormula(scoreCol: string, row: number): string {
  return `=IF(${scoreCol}${row}<=1,"Low",IF(${scoreCol}${row}<=2,"Medium","High"))`;
}

export function firmBandFormula(scoreCol: string, row: number): string {
  return `=IF(${scoreCol}${row}>=4,"Prohibited",IF(${scoreCol}${row}>2.15,"High",IF(${scoreCol}${row}>1.5,"Medium","Low")))`;
}

export async function loadLogoBuffer(): Promise<ArrayBuffer> {
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

export function addBrandHeader(
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
  ws.getCell(1, 3).value = "Mal FinCrime OS";
  ws.getCell(1, 3).font = { bold: true, size: 16, color: { argb: BRAND.purple } };
  ws.getCell(1, 3).alignment = { vertical: "middle" };

  ws.mergeCells(2, 3, 2, lastCol);
  ws.getCell(2, 3).value = title;
  ws.getCell(2, 3).font = { bold: true, size: 12, color: { argb: BRAND.ink } };
  ws.getCell(2, 3).alignment = { vertical: "middle" };

  ws.mergeCells(3, 1, 3, lastCol);
  ws.getCell(3, 1).value = WORKBOOK_META.methodologyRef;
  ws.getCell(3, 1).font = { size: 9, color: { argb: BRAND.muted } };

  ws.mergeCells(4, 1, 4, lastCol);
  ws.getCell(4, 1).value = `${WORKBOOK_META.modelVersionId} · Generated ${new Date().toLocaleString()} · Edit yellow cells to test scenarios`;
  ws.getCell(4, 1).font = { size: 9, italic: true, color: { argb: BRAND.muted } };
}

export function addRatingScale(ws: ExcelJS.Worksheet, startRow = 6, startCol = 1) {
  ["Ranking", "From", "To"].forEach((h, i) => {
    styleHeaderCell(ws.getCell(startRow, startCol + i), BRAND.navyLight);
    ws.getCell(startRow, startCol + i).value = h;
  });
  PRODUCT_SERVICE_RATING_BANDS.forEach((b, i) => {
    const r = startRow + 1 + i;
    ws.getCell(r, startCol).value = b.rating;
    ws.getCell(r, startCol + 1).value = b.from;
    ws.getCell(r, startCol + 2).value = b.to;
    ws.getCell(r, startCol + 1).numFmt = "0.00";
    ws.getCell(r, startCol + 2).numFmt = "0.00";
    const bg = b.rating === "High" ? BRAND.high : b.rating === "Medium" ? BRAND.med : BRAND.low;
    const fg = b.rating === "High" ? BRAND.highText : b.rating === "Medium" ? BRAND.medText : BRAND.lowText;
    ws.getCell(r, startCol).fill = fillSolid(bg);
    ws.getCell(r, startCol).font = { bold: true, color: { argb: fg } };
    for (let c = startCol; c <= startCol + 2; c += 1) ws.getCell(r, c).border = thinBorder();
  });
}

export function addRateConditionalFormatting(ws: ExcelJS.Worksheet, ref: string) {
  ws.addConditionalFormatting({
    ref,
    rules: [
      { type: "containsText", operator: "containsText", priority: 1, text: "Low", style: { fill: fillSolid(BRAND.low), font: { bold: true, color: { argb: BRAND.lowText } } } },
      { type: "containsText", operator: "containsText", priority: 2, text: "Medium", style: { fill: fillSolid(BRAND.med), font: { bold: true, color: { argb: BRAND.medText } } } },
      { type: "containsText", operator: "containsText", priority: 3, text: "High", style: { fill: fillSolid(BRAND.high), font: { bold: true, color: { argb: BRAND.highText } } } },
      { type: "containsText", operator: "containsText", priority: 4, text: "Prohibited", style: { fill: fillSolid("FFFCA5A5"), font: { bold: true, color: { argb: "FF7F1D1D" } } } },
    ],
  });
}

export function addScoreValidation(ws: ExcelJS.Worksheet, ref: string) {
  addListValidation(ws, ref, {
    type: "list",
    allowBlank: true,
    formulae: ['"1,2,3"'],
    showErrorMessage: true,
    errorTitle: "Invalid score",
    error: "Enter 1 (Low), 2 (Medium) or 3 (High)",
  });
}

export function addReadmeSheet(
  wb: ExcelJS.Workbook,
  logoBuffer: ArrayBuffer,
  title: string,
  lines: [string, string][],
  sheets: string[],
) {
  const ws = wb.addWorksheet("Readme", {});
  addBrandHeader(ws, wb, logoBuffer, title, 4);
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
  ws.getCell(r, 1).value = "Sheets";
  ws.getCell(r, 1).font = { bold: true };
  r += 1;
  sheets.forEach((s) => { ws.getCell(r, 1).value = `• ${s}`; r += 1; });
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 72;
}

export async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
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

export function newWorkbook(title: string): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mal FinCrime OS";
  wb.created = new Date();
  wb.title = title;
  return wb;
}

export function exportFilename(slug: string): string {
  return `Mal-CRAM-${slug}-${WORKBOOK_META.modelVersionId}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

export interface CountryRiskRow {
  country: string;
  fatf: number;
  basel: number;
  sanctions: number;
  safe_haven: number;
  overall: number;
  band: string;
  firm_score: number;
}
