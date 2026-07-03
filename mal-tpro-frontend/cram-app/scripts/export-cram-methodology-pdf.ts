/**
 * CLI: export CRAM methodology PDF (no browser required).
 * Usage: npx tsx scripts/export-cram-methodology-pdf.ts [output-path]
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCramMethodologyPdf } from "../src/lib/cramMethodologyPdf";

const defaultOut = resolve(
  process.env.HOME ?? ".",
  "Downloads",
  `Mal-CRAM-Methodology-${new Date().toISOString().slice(0, 10)}.pdf`,
);
const outPath = process.argv[2] ? resolve(process.argv[2]) : defaultOut;

const doc = await buildCramMethodologyPdf();
const buf = Buffer.from(doc.output("arraybuffer"));
writeFileSync(outPath, buf);
console.log(`Wrote ${outPath} (${buf.length} bytes)`);
