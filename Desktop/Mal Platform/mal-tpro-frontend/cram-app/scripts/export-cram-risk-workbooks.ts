/** Export all Mal CRAM methodology workbooks to Downloads for review. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  buildProductRiskWorkbook,
  buildServiceRiskWorkbook,
} from "../src/lib/cramRiskWorkbookBuilder";
import {
  buildMethodologyWorkbook,
  METHODOLOGY_EXCEL_EXPORTS,
} from "../src/lib/cramMethodologyWorkbookBuilder";
import { WORKBOOK_META } from "../src/config/malProductServiceRiskLibraries";

const date = new Date().toISOString().slice(0, 10);
const outDir = join(homedir(), "Downloads");

async function writeWb(wb: Awaited<ReturnType<typeof buildProductRiskWorkbook>>, slug: string) {
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const path = join(outDir, `Mal-CRAM-${slug}-${WORKBOOK_META.modelVersionId}-${date}.xlsx`);
  writeFileSync(path, buf);
  console.log(path, `(${(buf.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  await writeWb(await buildProductRiskWorkbook(), "Product-Risk-SME");
  await writeWb(await buildServiceRiskWorkbook(), "Service-Risk-SME");
  for (const meta of METHODOLOGY_EXCEL_EXPORTS) {
    await writeWb(await buildMethodologyWorkbook(meta.kind), meta.slug);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
