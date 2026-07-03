/** Build ISIC high-risk (Class) and prohibited activity JSON for methodology Excel exports. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const csv = readFileSync(join(root, "seed/data/isic_aml_mapping.csv"), "utf8");
const lines = csv.trim().split("\n");
const headers = parseCsvLine(lines[0]);

const highRiskClasses = lines.slice(1).map((line) => {
  const cols = parseCsvLine(line);
  const row: Record<string, string> = {};
  headers.forEach((h, i) => { row[h.trim()] = cols[i] ?? ""; });
  return row;
}).filter((r) => r.isic_level === "Class" && Number(r.risk_score) >= 3);

const nob = JSON.parse(readFileSync(join(root, "src/data/nature_of_business.json"), "utf8")) as { activity: string; score: number }[];
const lookup = JSON.parse(readFileSync(join(root, "src/data/isic_activity_lookup.json"), "utf8")) as {
  activity: string; primary_isic: string; primary_isic_title: string; rationale: string; controls: string;
}[];

const PROHIBITED_ENRICHMENT: Record<string, {
  isicCode: string; isicTitle: string; override: string; regulatoryBasis: string; rationale: string;
}> = {
  "Bail and Bond Payment Providers": {
    isicCode: "6619",
    isicTitle: "Other activities auxiliary to financial services",
    override: "OVR-002",
    regulatoryBasis: "MAL-CMP-AML-01 §8 · FinCEN MSB Rule 31 C.F.R. § 1022.380 · CBUAE AML/CFT customer risk assessment",
    rationale: "Third-party payment of bail/bonds — high ML/TF abuse typology; restricted appetite without licensed MSB status.",
  },
  "Casinos, Gambling, Betting and Adult Entertainment": {
    isicCode: "9200",
    isicTitle: "Gambling and betting activities",
    override: "OVR-002",
    regulatoryBasis: "MAL-CMP-AML-01 §8 · FATF R.12 · Wolfsberg gambling sector guidance · US UIGEA (where applicable)",
    rationale: "Mal prohibited category — gambling/adult entertainment outside licensed appetite; ISIC 9200 inherent High but policy = Prohibited.",
  },
  "Dating and Escort Services": {
    isicCode: "9609",
    isicTitle: "Other personal service activities n.e.c.",
    override: "OVR-002",
    regulatoryBasis: "MAL-CMP-AML-01 §8 · UAE Federal Decree-Law No. 20/2018 (AML/CFT prohibited business categories)",
    rationale: "Escort/adult services — reputational, trafficking and ML typology risk; outside Mal digital-bank appetite.",
  },
  "Firearms and Ammunition (including Guns) - Shops & Clubs": {
    isicCode: "2520",
    isicTitle: "Manufacture of weapons and ammunition",
    override: "OVR-002 / OVR-006",
    regulatoryBasis: "ISIC rule VH02 · US ITAR/EAR export controls · UN sanctions dual-use · CBUAE proliferation financing controls",
    rationale: "Defense-sensitive goods — prohibition unless government-licensed exception; minimum High + export-control screening.",
  },
  Narcotics: {
    isicCode: "—",
    isicTitle: "Controlled substances (non-medical)",
    override: "OVR-002",
    regulatoryBasis: "UAE Federal Law on narcotics · US Controlled Substances Act · FATF PF/ML typologies",
    rationale: "Illegal controlled substances — absolute prohibition.",
  },
  "Political Groups (including Fund raising organizations)": {
    isicCode: "9492",
    isicTitle: "Activities of political organizations",
    override: "OVR-002",
    regulatoryBasis: "MAL-CMP-AML-01 §8 · FATF R.8 (NPO/charity abuse) · FinCEN political organization guidance",
    rationale: "Political fundraising — TF/sanctions evasion typology; outside retail digital-bank appetite.",
  },
  "Unregulated Money Service Business": {
    isicCode: "6619",
    isicTitle: "Other activities auxiliary to financial services (MSB)",
    override: "OVR-002 / OVR-006",
    regulatoryBasis: "FinCEN MSB registration 31 C.F.R. § 1022.380 · CBUAE payment services / hawala licensing · FATF R.14",
    rationale: "Unlicensed MSB/remittance — cannot onboard; regulated MSB may be High (ISIC 6619) with EDD.",
  },
};

const prohibitedActivities = nob.filter((n) => n.score >= 4).map((n) => {
  const enrich = PROHIBITED_ENRICHMENT[n.activity] ?? {
    isicCode: "—",
    isicTitle: "—",
    override: "OVR-002",
    regulatoryBasis: "MAL-CMP-AML-01 §8 · OVR-002 prohibited customer/activity",
    rationale: "CRAM prohibited nature-of-business (score 4) — not dilutable.",
  };
  const typo = lookup.find((l) => n.activity.toLowerCase().includes(l.activity.toLowerCase().split(" ")[0]));
  return {
    activity: n.activity,
    cramScore: 4,
    amlRating: "Prohibited",
    isicCode: enrich.isicCode !== "—" ? enrich.isicCode : typo?.primary_isic ?? enrich.isicCode,
    isicTitle: enrich.isicTitle !== "—" ? enrich.isicTitle : typo?.primary_isic_title ?? enrich.isicTitle,
    override: enrich.override,
    regulatoryBasis: enrich.regulatoryBasis,
    rationale: enrich.rationale,
    cddEdd: "Reject / Exit — no onboarding",
    source: "nature_of_business.csv + ISIC Rev.5 typology lookup",
  };
});

writeFileSync(
  join(root, "src/data/isic_high_risk_classes.json"),
  `${JSON.stringify(highRiskClasses, null, 2)}\n`,
);
writeFileSync(
  join(root, "src/data/isic_prohibited_activities.json"),
  `${JSON.stringify(prohibitedActivities, null, 2)}\n`,
);
console.log(`Wrote ${highRiskClasses.length} high-risk ISIC classes, ${prohibitedActivities.length} prohibited activities`);
