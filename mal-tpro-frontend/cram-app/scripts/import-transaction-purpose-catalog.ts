/**
 * Import Mal_Transaction_Purpose_Code_Catalog_v1.xlsx → transaction_purpose_code_catalog.json
 * Usage: npx tsx scripts/import-transaction-purpose-catalog.ts [path-to-xlsx]
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const input = process.argv[2]
  ?? resolve(process.env.HOME ?? "", "Downloads/Mal_Transaction_Purpose_Code_Catalog_v1.xlsx");
const output = resolve(import.meta.dirname, "../src/data/transaction_purpose_code_catalog.json");

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(input);

const out: {
  version: string;
  sourceFile: string;
  importedAt: string;
  readme: string[];
  flows: Record<string, { title: string; subtitle: string; headers: string[]; entries: Record<string, string>[] }>;
} = {
  version: "1.0",
  sourceFile: input.split("/").pop() ?? "Mal_Transaction_Purpose_Code_Catalog_v1.xlsx",
  importedAt: new Date().toISOString(),
  readme: [],
  flows: {},
};

const readme = wb.getWorksheet("README");
readme?.eachRow((row) => {
  const v = row.getCell(1).value;
  if (v) out.readme.push(String(v).replace(/\n/g, " ").trim());
});

for (const name of ["C2C", "C2B", "B2C", "B2B", "Mal2Mal"]) {
  const ws = wb.getWorksheet(name);
  if (!ws) continue;
  const headerRow = 4;
  const headers: string[] = [];
  ws.getRow(headerRow).eachCell({ includeEmpty: true }, (c, col) => {
    headers[col - 1] = String(c.value ?? "").trim();
  });
  const slug = (h: string) =>
    h.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase();
  const entries: Record<string, string>[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = row.getCell(1).value;
    if (!code || String(code).trim() === "") continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (!h) return;
      obj[slug(h)] = String(row.getCell(i + 1).value ?? "").trim();
    });
    entries.push(obj);
  }
  out.flows[name] = {
    title: String(ws.getRow(1).getCell(1).value ?? name),
    subtitle: String(ws.getRow(2).getCell(1).value ?? ""),
    headers,
    entries,
  };
}

writeFileSync(output, `${JSON.stringify(out, null, 2)}\n`);
const total = Object.values(out.flows).reduce((n, f) => n + f.entries.length, 0);
console.log(`Imported ${total} purpose codes → ${output}`);
