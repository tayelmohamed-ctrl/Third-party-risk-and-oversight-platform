export {
  exportMalProductRiskWorkbook,
  exportMalServiceRiskWorkbook,
  buildProductRiskWorkbook,
  buildServiceRiskWorkbook,
  verifyWorkbookFormulas,
} from "./cramRiskWorkbookBuilder";

export {
  exportMethodologyWorkbook,
  buildMethodologyWorkbook,
  METHODOLOGY_EXCEL_EXPORTS,
  type MethodologyWorkbookKind,
} from "./cramMethodologyWorkbookBuilder";

export {
  exportReferenceListWorkbook,
  buildReferenceListWorkbook,
  REFERENCE_LIST_EXPORTS,
  type ReferenceListWorkbookKind,
} from "./cramReferenceListWorkbookBuilder";

/** Combined export (product + service in one file). */
export async function exportMalProductServiceRiskWorkbook(): Promise<void> {
  const { buildProductRiskWorkbook, buildServiceRiskWorkbook } = await import("./cramRiskWorkbookBuilder");
  const ExcelJS = (await import("exceljs")).default;
  const productWb = await buildProductRiskWorkbook();
  const serviceWb = await buildServiceRiskWorkbook();

  const combined = new ExcelJS.Workbook();
  combined.creator = "Mal FinCrime OS";
  combined.created = new Date();

  for (const src of [productWb, serviceWb]) {
    for (const sheet of src.worksheets) {
      if (combined.getWorksheet(sheet.name)) continue;
      const dest = combined.addWorksheet(sheet.name);
      await copySheet(sheet, dest);
    }
  }

  const buffer = await combined.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Mal-CRAM-Product-Service-Risk-SME-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copySheet(src: import("exceljs").Worksheet, dest: import("exceljs").Worksheet) {
  src.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const destRow = dest.getRow(rowNumber);
    destRow.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const destCell = destRow.getCell(colNumber);
      destCell.value = cell.value;
      destCell.style = { ...cell.style };
      if (cell.note) destCell.note = cell.note;
    });
    destRow.commit();
  });
  src.columns.forEach((col, i) => {
    if (col.width) dest.getColumn(i + 1).width = col.width;
  });
  if (src.views) dest.views = [...src.views];
}
