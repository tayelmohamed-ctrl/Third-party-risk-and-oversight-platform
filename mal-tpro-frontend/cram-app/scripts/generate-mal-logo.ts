/** One-shot: render Mal logomark SVG → public/mal-logo.png for PDF/Excel exports. */
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const petals = Array.from({ length: 10 }, (_, k) => k * 36);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100">
  <defs><linearGradient id="malg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#A953DF"/><stop offset="1" stop-color="#39B9ED"/>
  </linearGradient></defs>
  ${petals.map((deg) => `<g transform="rotate(${deg} 50 50)"><rect x="45.5" y="5" width="9" height="24" rx="4.5" fill="url(#malg)"/></g>`).join("")}
</svg>`;

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../public");
mkdirSync(outDir, { recursive: true });
const png = new Resvg(svg, { fitTo: { mode: "width", value: 256 } }).render().asPng();
const outPath = join(outDir, "mal-logo.png");
writeFileSync(outPath, png);
console.log(`Wrote ${outPath} (${png.length} bytes)`);
