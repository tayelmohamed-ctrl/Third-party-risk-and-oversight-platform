/** Convert seed/data/country_risk.csv → src/data/country_risk_full.json for Excel exports. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csv = readFileSync(join(root, "seed/data/country_risk.csv"), "utf8");
const lines = csv.trim().split("\n");
const headers = lines[0].split(",");

const rows = lines.slice(1).map((line) => {
  const parts = line.split(",");
  const row: Record<string, string | number> = {};
  headers.forEach((h, i) => {
    const v = parts[i];
    row[h.trim()] = ["fatf", "basel", "sanctions", "safe_haven", "overall", "firm_score"].includes(h.trim())
      ? parseFloat(v)
      : v;
  });
  return row;
});

writeFileSync(
  join(root, "src/data/country_risk_full.json"),
  `${JSON.stringify(rows, null, 0)}\n`,
);
console.log(`Wrote ${rows.length} countries → src/data/country_risk_full.json`);
