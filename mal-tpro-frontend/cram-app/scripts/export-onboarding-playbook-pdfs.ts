/**
 * CLI: export Individual + SME Global Account onboarding playbook PDFs.
 * Usage:
 *   npx tsx scripts/export-onboarding-playbook-pdfs.ts [output-dir]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildIndividualOnboardingPlaybookPdf } from "../src/lib/onboardingIndividualPlaybookPdf";
import { buildSmeOnboardingPlaybookPdf } from "../src/lib/onboardingSmePlaybookPdf";

const date = new Date().toISOString().slice(0, 10);
const outDir = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(process.env.HOME ?? ".", "Downloads");

mkdirSync(outDir, { recursive: true });

const individualPath = resolve(outDir, `Mal-GA-Individual-Onboarding-Playbook-v1.0-${date}.pdf`);
const smePath = resolve(outDir, `Mal-GA-SME-Onboarding-Playbook-v1.0-${date}.pdf`);

const individual = await buildIndividualOnboardingPlaybookPdf();
const individualBuf = Buffer.from(individual.output("arraybuffer"));
writeFileSync(individualPath, individualBuf);
console.log(`Wrote ${individualPath} (${individualBuf.length} bytes)`);

const sme = await buildSmeOnboardingPlaybookPdf();
const smeBuf = Buffer.from(sme.output("arraybuffer"));
writeFileSync(smePath, smeBuf);
console.log(`Wrote ${smePath} (${smeBuf.length} bytes)`);
