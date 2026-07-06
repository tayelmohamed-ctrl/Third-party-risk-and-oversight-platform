/**
 * Transaction Monitoring & Screening — downloadable Excel workbooks.
 * Two independent builders: Global Account (US / FinCEN / BSA) and Mal Bank (UAE / CBUAE).
 */
import ExcelJS from "exceljs";
import {
  BRAND, newWorkbook, addBrandHeader, downloadWorkbook,
  styleHeaderCell, fillSolid, thinBorder, addRateConditionalFormatting, loadLogoBuffer,
} from "./cramWorkbookShared";
import {
  TXN_SCREENING_PROGRAMME, TXN_SCREENING_SCORING, TXN_SCREENING_WORKFLOW,
  TXN_SCREENING_CASE_MGMT, OSCILAR_RULE_CATEGORIES,
} from "../config/oscilarProgramme";
import { SCREENING_AUTHORITY, SCREENING_SLA, FIU_ROUTING } from "../config/partnerIntegration";
import { TRANSACTION_PURPOSE_CATALOG, FLOW_IDS, FLOW_LABELS, allCatalogEntries } from "../config/transactionPurposeCatalog";
import ruleLibraryJson from "../data/oscilar_rule_library.json";

type RuleRow = (typeof ruleLibraryJson.rules)[number];

const RULE_LIBRARY: RuleRow[] = ruleLibraryJson.rules as RuleRow[];

// ─── helpers ────────────────────────────────────────────────────────────────

function hdr(ws: ExcelJS.Worksheet, row: number, cols: string[], bg = BRAND.navy) {
  cols.forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h;
    styleHeaderCell(c, bg);
  });
}

function dataRow(ws: ExcelJS.Worksheet, row: number, vals: (string | number | null | undefined)[]) {
  vals.forEach((v, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = v ?? "";
    c.alignment = { vertical: "top", wrapText: true };
    c.border = thinBorder();
    c.font = { size: 9, color: { argb: BRAND.ink } };
  });
}

function severityBg(sev: string): string {
  if (sev === "critical") return BRAND.high;
  if (sev === "high") return "FFFEE2E2";
  if (sev === "medium") return BRAND.med;
  return BRAND.low;
}

function severityFg(sev: string): string {
  if (sev === "critical") return "FF7F1D1D";
  if (sev === "high") return BRAND.highText;
  if (sev === "medium") return BRAND.medText;
  return BRAND.lowText;
}

function sectionTitle(ws: ExcelJS.Worksheet, row: number, cols: number, text: string) {
  ws.mergeCells(row, 1, row, cols);
  const c = ws.getCell(row, 1);
  c.value = text;
  c.font = { bold: true, size: 10, color: { argb: BRAND.white } };
  c.fill = fillSolid(BRAND.navyLight);
  c.alignment = { vertical: "middle" };
  ws.getRow(row).height = 18;
}

// ─── sheet builders ──────────────────────────────────────────────────────────

function addReadmeSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const perimeter = isUae ? "Mal Bank — UAE (CBUAE)" : "Global Account — US (FinCEN / BSA / OFAC)";
  const title = isUae
    ? "Mal Bank – Transaction Monitoring & Screening Library"
    : "Global Account – Transaction Monitoring & Screening Library";

  const ws = wb.addWorksheet("Readme");
  addBrandHeader(ws, wb, logo, title, 4);
  ws.columns = [{ width: 30 }, { width: 55 }, { width: 25 }, { width: 25 }];

  const rows: [string, string][] = [
    ["Perimeter", perimeter],
    ["Regulatory framework", isUae
      ? "CBUAE AML Regulation 2019 · UAE Federal AML Law (No. 20/2018) · FATF Recommendations"
      : "BSA 31 U.S.C. §5311 · FinCEN CDD Rule · OFAC SDN · USA PATRIOT Act §326"],
    ["TM vendor", "Oscilar (transaction monitoring & real-time payment decisions)"],
    ["Screening vendor", "Vital4 (sanctions / PEP / watchlist — sole disposition authority)"],
    ["Identity / KYB", "Shufti Pro (identity only; AML fields ignored) · AiPrise (KYB)"],
    ["FIU reporting", isUae ? `${FIU_ROUTING.UAE.system} → ${FIU_ROUTING.UAE.regulator}` : `${FIU_ROUTING.US.system} → ${FIU_ROUTING.US.regulator}`],
    ["SLA — potential match", `${SCREENING_SLA.potentialMatchHours}h`],
    ["SLA — pending", `${SCREENING_SLA.pendingHours}h`],
    ["SLA — sanctions true match", String(SCREENING_SLA.sanctionsTrueMatch)],
    ["Rule library version", ruleLibraryJson.version],
    ["Workbook generated", new Date().toISOString().slice(0, 10)],
    ["Confidentiality", "Internal use only — do not distribute externally"],
  ];

  let r = 6;
  rows.forEach(([k, v]) => {
    ws.getCell(r, 1).value = k;
    ws.getCell(r, 1).font = { bold: true, color: { argb: BRAND.ink }, size: 9 };
    ws.mergeCells(r, 2, r, 4);
    ws.getCell(r, 2).value = v;
    ws.getCell(r, 2).font = { size: 9 };
    ws.getCell(r, 2).border = thinBorder();
    ws.getCell(r, 1).border = thinBorder();
    r += 1;
  });

  r += 1;
  sectionTitle(ws, r, 4, "Worksheets in this workbook");
  r += 1;
  const sheets = [
    "TM Rule Library", "Corridor-Based Monitoring Rules", "Screening Programme",
    "Transaction Risk Scoring", "Monitoring Workflow", "Alerts & Case Mgmt",
    "Purpose Codes", "Customer Txn Types", "Corridor Guidance",
    "Country Typologies", "Readiness Checklist",
  ];
  sheets.forEach((name, i) => {
    ws.getCell(r + i, 1).value = `${i + 1}.`;
    ws.getCell(r + i, 2).value = name;
    ws.getCell(r + i, 1).font = { size: 9, bold: true, color: { argb: BRAND.purple } };
    ws.getCell(r + i, 2).font = { size: 9 };
  });
}

function addRuleLibrarySheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("TM Rule Library");
  addBrandHeader(ws, wb, logo, "Transaction Monitoring Rule Library", 12);

  // Filter rules relevant to perimeter
  const rules = isUae
    ? RULE_LIBRARY // all rules are relevant to UAE (primary perimeter)
    : RULE_LIBRARY.filter((r) => !["OS-TM-031","OS-TM-032","OS-TM-033","OS-TM-034","OS-TM-035","OS-TM-036","OS-TM-037","OS-TM-038","OS-TM-039","OS-TM-040"].includes(r.id)
        || ["OS-TM-009"].includes(r.id)); // US keeps US BaaS rule; excludes PK-specific to UAE

  ws.columns = [
    { key: "id", width: 13 },
    { key: "name", width: 36 },
    { key: "category", width: 28 },
    { key: "channel", width: 12 },
    { key: "typology", width: 22 },
    { key: "description", width: 48 },
    { key: "trigger", width: 48 },
    { key: "thresholds", width: 32 },
    { key: "severity", width: 12 },
    { key: "action", width: 40 },
    { key: "cramRef", width: 14 },
    { key: "status", width: 10 },
  ];

  const COLS = ["Rule ID","Name","Category","Channel","Typology","Description","Trigger","Thresholds","Severity","Action","CRAM Ref","Status"];
  hdr(ws, 5, COLS);

  rules.forEach((rule, i) => {
    const r = 6 + i;
    dataRow(ws, r, [
      rule.id, rule.name, rule.category, rule.channel, rule.typology,
      rule.description, rule.trigger, rule.thresholds, rule.severity,
      rule.action, (rule as RuleRow & { cramRef?: string }).cramRef ?? "",
      rule.status,
    ]);
    const sevCell = ws.getCell(r, 9);
    sevCell.fill = fillSolid(severityBg(rule.severity));
    sevCell.font = { bold: true, size: 9, color: { argb: severityFg(rule.severity) } };

    const statusCell = ws.getCell(r, 12);
    statusCell.fill = fillSolid(rule.status === "active" ? BRAND.low : rule.status === "tuning" ? BRAND.med : "FFE2E8F0");
    statusCell.font = { bold: true, size: 9, color: { argb: rule.status === "active" ? BRAND.lowText : rule.status === "tuning" ? BRAND.medText : BRAND.muted } };
  });

  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: 12 } };
  ws.views = [{ state: "frozen", ySplit: 5 }];
}

function addCorridorSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Corridor-Based Monitoring Rules");
  addBrandHeader(ws, wb, logo, "Corridor-Based Monitoring Rules", 8);

  ws.columns = [
    { width: 14 }, { width: 30 }, { width: 16 }, { width: 20 }, { width: 32 }, { width: 28 }, { width: 20 }, { width: 14 },
  ];

  const corridors = isUae
    ? [
        { code: "AE", name: "UAE (domestic)", riskTier: "Low", regime: "CBUAE", threshold: "AED 50,000", note: "Standard monitoring; PEP applies", rule: "OS-TM-005" },
        { code: "PK", name: "Pakistan", riskTier: "High", regime: "FATF Grey", threshold: "AED 10,000", note: "Hawala/IVTS typologies; OS-TM-031–040 corridor pack", rule: "OS-TM-031/032/033" },
        { code: "IN", name: "India", riskTier: "Medium", regime: "FATF Member", threshold: "AED 25,000", note: "Remittance velocity; corridor watch", rule: "OS-TM-030" },
        { code: "BD", name: "Bangladesh", riskTier: "Medium", regime: "FATF Monitored", threshold: "AED 20,000", note: "Remittance velocity monitoring", rule: "OS-TM-030" },
        { code: "EG", name: "Egypt", riskTier: "Medium", regime: "FATF Member", threshold: "AED 25,000", note: "SoF consistency required for high-value", rule: "OS-TM-030" },
        { code: "TR", name: "Turkey", riskTier: "High", regime: "FATF Monitored", threshold: "AED 15,000", note: "Enhanced corridor documentation", rule: "OS-TM-008" },
        { code: "GCC", name: "GCC region", riskTier: "Low-Medium", regime: "CBUAE", threshold: "AED 50,000", note: "GCC rails; corridor-specific rules apply", rule: "OS-TM-005/008" },
        { code: "EU", name: "European Union", riskTier: "Low", regime: "FATF Member", threshold: "AED 100,000", note: "SEPA-aligned; standard rules", rule: "OS-TM-005" },
        { code: "US", name: "United States", riskTier: "Low", regime: "FinCEN", threshold: "AED 100,000", note: "BSA-aligned monitoring", rule: "OS-TM-009" },
        { code: "PH", name: "Philippines", riskTier: "Medium", regime: "FATF Monitored", threshold: "AED 20,000", note: "Remittance velocity monitoring", rule: "OS-TM-030" },
        { code: "MA", name: "Morocco", riskTier: "Medium", regime: "FATF Member", threshold: "AED 25,000", note: "Cross-border corridor watch", rule: "OS-TM-008" },
        { code: "SY/IR/KP", name: "Syria / Iran / DPRK", riskTier: "Prohibited", regime: "OFAC/UNSC", threshold: "Any", note: "Auto-block; OVR-002 Prohibited path; Vital4 mirror", rule: "OS-TM-010/OVR-002" },
      ]
    : [
        { code: "US", name: "United States (domestic)", riskTier: "Low", regime: "FinCEN / OFAC", threshold: "USD 3,000", note: "BSA travel rule applies ≥$3k", rule: "OS-TM-009" },
        { code: "MX", name: "Mexico", riskTier: "High", regime: "FATF Member", threshold: "USD 500", note: "Cartel typologies; lower threshold applies", rule: "OS-TM-008" },
        { code: "CN", name: "China", riskTier: "Medium", regime: "FATF Member", threshold: "USD 1,000", note: "Capital controls; purpose code required", rule: "OS-TM-008" },
        { code: "IN", name: "India", riskTier: "Low", regime: "FATF Member", threshold: "USD 3,000", note: "Remittance velocity; documentation above threshold", rule: "OS-TM-030" },
        { code: "PH", name: "Philippines", riskTier: "Medium", regime: "FATF Monitored", threshold: "USD 1,000", note: "Remittance velocity monitoring", rule: "OS-TM-030" },
        { code: "AF/KP/IR", name: "Afghanistan / DPRK / Iran", riskTier: "Prohibited", regime: "OFAC SDN / UNSC", threshold: "Any", note: "Auto-block; OVR-002; FinCEN SAR required", rule: "OS-TM-010/OVR-002" },
        { code: "RU", name: "Russia", riskTier: "High", regime: "OFAC / FATF Warning", threshold: "USD 100", note: "OFAC alerts; enhanced screening required", rule: "OS-TM-010/008" },
        { code: "CU", name: "Cuba", riskTier: "Prohibited", regime: "OFAC Cuba Sanctions", threshold: "Any", note: "Prohibited under OFAC Cuba program", rule: "OVR-002" },
        { code: "EU", name: "European Union", riskTier: "Low", regime: "FATF Member", threshold: "USD 10,000", note: "SEPA equivalent; standard monitoring", rule: "OS-TM-005" },
        { code: "AE", name: "United Arab Emirates", riskTier: "Low-Medium", regime: "FATF Member", threshold: "USD 5,000", note: "Corridor documentation; purpose code required", rule: "OS-TM-008" },
      ];

  hdr(ws, 5, ["ISO Code","Corridor / Country","Risk Tier","Regulatory Regime","Alert Threshold","Monitoring Note","Rule Refs","Status"]);

  corridors.forEach((c, i) => {
    const r = 6 + i;
    dataRow(ws, r, [c.code, c.name, c.riskTier, c.regime, c.threshold, c.note, c.rule, c.riskTier === "Prohibited" ? "BLOCKED" : "Active"]);

    const tierCell = ws.getCell(r, 3);
    if (c.riskTier === "Prohibited") {
      tierCell.fill = fillSolid(BRAND.high); tierCell.font = { bold: true, size: 9, color: { argb: BRAND.highText } };
    } else if (c.riskTier === "High") {
      tierCell.fill = fillSolid("FFFEE2E2"); tierCell.font = { bold: true, size: 9, color: { argb: BRAND.highText } };
    } else if (c.riskTier.startsWith("Medium") || c.riskTier === "Low-Medium") {
      tierCell.fill = fillSolid(BRAND.med); tierCell.font = { bold: true, size: 9, color: { argb: BRAND.medText } };
    } else {
      tierCell.fill = fillSolid(BRAND.low); tierCell.font = { bold: true, size: 9, color: { argb: BRAND.lowText } };
    }
  });

  ws.views = [{ state: "frozen", ySplit: 5 }];
}

function addScreeningProgrammeSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Screening Programme");
  addBrandHeader(ws, wb, logo, "Transaction Screening Programme", 5);
  ws.columns = [{ width: 26 }, { width: 52 }, { width: 18 }, { width: 18 }, { width: 18 }];

  let r = 6;
  TXN_SCREENING_PROGRAMME.forEach((sec) => {
    sectionTitle(ws, r, 5, sec.title);
    r += 1;
    ws.mergeCells(r, 1, r, 5);
    const sumCell = ws.getCell(r, 1);
    sumCell.value = sec.summary;
    sumCell.font = { italic: true, size: 9, color: { argb: BRAND.muted } };
    sumCell.alignment = { wrapText: true };
    r += 1;
    sec.bullets.forEach((bullet) => {
      ws.getCell(r, 1).value = "•";
      ws.getCell(r, 1).font = { bold: true, color: { argb: BRAND.purple }, size: 9 };
      ws.mergeCells(r, 2, r, 5);
      ws.getCell(r, 2).value = bullet;
      ws.getCell(r, 2).font = { size: 9 };
      ws.getCell(r, 2).alignment = { wrapText: true };
      r += 1;
    });
    r += 1;
  });

  // Screening authority table
  r += 1;
  sectionTitle(ws, r, 5, "Partner & authority matrix");
  r += 1;
  hdr(ws, r, ["Function", "Vendor / System", "Notes"], BRAND.navyLight);
  r += 1;
  const authRows: [string, string, string][] = [
    ["Sanctions screening", SCREENING_AUTHORITY.sanctions.toUpperCase(), "Sole disposition authority; mirrors from Oscilar TM"],
    ["PEP screening", SCREENING_AUTHORITY.pep.toUpperCase(), "Sole PEP/watchlist disposition authority"],
    ["Adverse media", SCREENING_AUTHORITY.adverse.toUpperCase(), "Adverse disposition via Vital4"],
    ["Identity / IDV", SCREENING_AUTHORITY.identity.toUpperCase(), "AML fields from Shufti ignored; identity only"],
    ["KYB", SCREENING_AUTHORITY.kyb.toUpperCase(), "Entity onboarding — 10 AiPrise jurisdictions"],
    ["Transaction monitoring", SCREENING_AUTHORITY.transactionMonitoring.toUpperCase(), "Realtime TM; Oscilar never writes CRAM fields directly"],
    ["FIU reporting", isUae ? FIU_ROUTING.UAE.system : FIU_ROUTING.US.system, isUae ? FIU_ROUTING.UAE.regulator : FIU_ROUTING.US.regulator],
  ];
  authRows.forEach(([fn, vendor, note]) => {
    dataRow(ws, r, [fn, vendor, note]);
    r += 1;
  });
}

function addScoringSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Transaction Risk Scoring");
  addBrandHeader(ws, wb, logo, "Transaction Risk Scoring Model", 6);
  ws.columns = [{ width: 22 }, { width: 40 }, { width: 14 }, { width: 16 }, { width: 32 }, { width: 28 }];

  let r = 6;
  ws.mergeCells(r, 1, r, 6);
  const introCell = ws.getCell(r, 1);
  introCell.value = TXN_SCREENING_SCORING.intro;
  introCell.font = { italic: true, size: 9, color: { argb: BRAND.muted } };
  introCell.alignment = { wrapText: true };
  ws.getRow(r).height = 36;
  r += 2;

  sectionTitle(ws, r, 6, "Scoring dimensions");
  r += 1;
  TXN_SCREENING_SCORING.dimensions.forEach((dim) => {
    hdr(ws, r, [dim.title], BRAND.navyLight);
    ws.mergeCells(r, 1, r, 6);
    ws.getRow(r).height = 16;
    r += 1;
    ws.mergeCells(r, 1, r, 6);
    ws.getCell(r, 1).value = dim.summary;
    ws.getCell(r, 1).font = { italic: true, size: 9 };
    ws.getCell(r, 1).alignment = { wrapText: true };
    r += 1;
    dim.bullets.forEach((bullet) => {
      ws.getCell(r, 2).value = bullet;
      ws.getCell(r, 2).font = { size: 9 };
      ws.mergeCells(r, 2, r, 6);
      ws.getCell(r, 1).value = "•";
      ws.getCell(r, 1).font = { bold: true, color: { argb: BRAND.purple }, size: 9 };
      r += 1;
    });
    r += 1;
  });

  r += 1;
  sectionTitle(ws, r, 6, "Alert scoring tiers");
  r += 1;
  hdr(ws, r, ["Tier", "Score Range", "SLA", "Action", "CRAM Link", "Currency"]);
  r += 1;
  TXN_SCREENING_SCORING.tiers.forEach((tier) => {
    dataRow(ws, r, [
      tier.tier, tier.scoreRange, tier.sla, tier.action,
      tier.cramLink ?? "", isUae ? "AED" : "USD",
    ]);
    const tierCell = ws.getCell(r, 1);
    if (tier.tier === "Critical") {
      tierCell.fill = fillSolid(BRAND.high); tierCell.font = { bold: true, size: 9, color: { argb: "FF7F1D1D" } };
    } else if (tier.tier === "High") {
      tierCell.fill = fillSolid("FFFEE2E2"); tierCell.font = { bold: true, size: 9, color: { argb: BRAND.highText } };
    } else if (tier.tier === "Medium") {
      tierCell.fill = fillSolid(BRAND.med); tierCell.font = { bold: true, size: 9, color: { argb: BRAND.medText } };
    } else {
      tierCell.fill = fillSolid(BRAND.low); tierCell.font = { bold: true, size: 9, color: { argb: BRAND.lowText } };
    }
    r += 1;
  });

  ws.views = [{ state: "frozen", ySplit: 5 }];
}

function addWorkflowSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Monitoring Workflow");
  addBrandHeader(ws, wb, logo, "Transaction Monitoring Workflow", 5);
  ws.columns = [{ width: 6 }, { width: 28 }, { width: 22 }, { width: 52 }, { width: 28 }];

  hdr(ws, 5, ["Step", "Name", "Actor", "Detail", "Outcome"]);

  TXN_SCREENING_WORKFLOW.forEach((step, i) => {
    const r = 6 + i;
    dataRow(ws, r, [step.step, step.name, step.actor, step.detail, step.outcome ?? ""]);
    ws.getCell(r, 1).fill = fillSolid(BRAND.navyLight);
    ws.getCell(r, 1).font = { bold: true, color: { argb: BRAND.white }, size: 9 };
    ws.getCell(r, 1).alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(r).height = 28;
  });

  ws.views = [{ state: "frozen", ySplit: 5 }];
}

function addCaseMgmtSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Alerts & Case Mgmt");
  addBrandHeader(ws, wb, logo, "Alert & Case Management", 5);
  ws.columns = [{ width: 28 }, { width: 22 }, { width: 16 }, { width: 44 }, { width: 22 }];

  hdr(ws, 5, ["Stage", "Owner", "SLA", "Outputs", "Perimeter"]);

  TXN_SCREENING_CASE_MGMT.forEach((stage, i) => {
    const r = 6 + i;
    const outputs = stage.outputs.join(" | ");
    const perm = isUae ? "Mal Bank (UAE)" : "Global Account (US)";
    dataRow(ws, r, [stage.stage, stage.owner, stage.sla, outputs, perm]);
    ws.getRow(r).height = 24;
  });

  // Regulatory reporting row
  const sarRow = 6 + TXN_SCREENING_CASE_MGMT.length + 1;
  sectionTitle(ws, sarRow, 5, "Regulatory reporting outputs");
  const sarData = isUae
    ? [
        ["STR / SAR", "Jana (compliance)", "Regulatory deadline", "goAML submission → UAE FIU", "Mal Bank (UAE / CBUAE)"],
        ["Suspicious Transaction Report", "MLRO", "Immediately if TF suspected", "UAE FIU — no tipping off", "Mal Bank (UAE)"],
      ]
    : [
        ["FinCEN SAR", "Jana (compliance)", "30 days (60 voluntary delay)", "FinCEN BSA e-File", "Global Account (US)"],
        ["FinCEN CTR", "Compliance", "15 days", "Form 104 — cash ≥ $10,000", "Global Account (US)"],
      ];
  sarData.forEach((row, i) => {
    dataRow(ws, sarRow + 1 + i, row);
  });
}

function addPurposeCodesSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Purpose Codes");
  addBrandHeader(ws, wb, logo, "Transaction Purpose Code Catalog", 9);
  ws.columns = [
    { width: 12 }, { width: 28 }, { width: 36 }, { width: 38 },
    { width: 38 }, { width: 22 }, { width: 12 }, { width: 32 }, { width: 32 },
  ];

  const allEntries = allCatalogEntries();
  hdr(ws, 5, [
    "Purpose Code", "Customer Label", "Flow Type", "Description",
    "Acceptable Use", "Not Acceptable / Misuse", isUae ? "CBUAE POP Mapping" : "Reg. Reference",
    "Risk Tier", "Evidence / EDD Trigger",
  ]);

  let r = 6;
  FLOW_IDS.forEach((flowId) => {
    const flow = TRANSACTION_PURPOSE_CATALOG.flows[flowId];
    if (!flow) return;
    sectionTitle(ws, r, 9, `${FLOW_LABELS[flowId]} — ${flow.title}`);
    r += 1;
    flow.entries.forEach((entry) => {
      dataRow(ws, r, [
        entry.purpose_code,
        entry.customer_facing_label,
        flowId,
        entry.description_shown_to_customer,
        entry.acceptable_use_compliance_definition,
        entry.not_acceptable_misuse_indicators,
        isUae ? entry.cbuae_pop_mapping_indicative_validate : "See TM Rule Library",
        entry.risk_tier,
        entry.evidence_edd_trigger,
      ]);
      addRateConditionalFormatting(ws, `H${r}`);
      ws.getRow(r).height = 36;
      r += 1;
    });
    r += 1;
  });

  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: 9 } };
  ws.views = [{ state: "frozen", ySplit: 5 }];
}

function addCustomerTxnTypesSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Customer Txn Types");
  addBrandHeader(ws, wb, logo, "Customer Transaction Types", 7);
  ws.columns = [
    { width: 28 }, { width: 18 }, { width: 22 }, { width: 22 },
    { width: 28 }, { width: 32 }, { width: 22 },
  ];

  hdr(ws, 5, ["Transaction Type", "Flow", "Channel", isUae ? "CBUAE Reference" : "BSA Reference", "Description", "Monitoring Rule", "Risk Tier"]);

  const types = isUae
    ? [
        ["P2P Domestic Transfer", "C2C", "Transfer", "CBUAE UAEFTS", "Person-to-person AED transfer within UAE", "OS-TM-001/004/005", "Low-Medium"],
        ["P2P Cross-Border Remittance", "C2C", "Transfer", "CBUAE IPP / Aani", "Cross-border remittance (corridor-specific thresholds)", "OS-TM-008/030", "Medium-High"],
        ["UAE Hawala / IVTS", "C2C", "Transfer", "CBUAE AML Reg. Art. 12", "Informal value transfer — PROHIBITED; authorized channel only", "OS-TM-031", "Prohibited"],
        ["Intra-GCC Transfer", "C2C/C2B", "Transfer", "CBUAE GCC Scheme", "GCC rails (Bahrain, KSA, Kuwait, Oman, Qatar)", "OS-TM-005/008", "Low-Medium"],
        ["Wage Protection (WPS)", "B2C", "Transfer", "CBUAE WPS", "Salary payment via UAE Wage Protection System", "OS-TM-019/026", "Low"],
        ["Trade Payment", "B2B", "Transfer", "CBUAE UAEFTS", "Business invoice settlement; purpose-code required", "OS-TM-032", "Medium"],
        ["POS Card Payment", "C2B", "Card", "Visa/MC scheme", "Point-of-sale card authorisation (domestic/GCC)", "OS-TM-006", "Low"],
        ["CNP / e-Commerce", "C2B", "Card", "3DS v2 scheme", "Card-not-present online purchase", "OS-TM-012", "Medium"],
        ["ATM Withdrawal", "C2C", "Card", "Scheme rules", "Cash withdrawal — structuring watch applies", "OS-TM-024", "Low-Medium"],
        ["Cross-Border Card", "C2B", "Card", "Scheme + CBUAE", "Card used outside residence country", "OS-TM-015", "Medium"],
        ["VA / Crypto Off-Ramp", "C2B", "Both", "CBUAE VARA", "Fiat in/out linked to VASP — licensed VASP only", "OS-TM-021/038", "High"],
        ["Internal Transfer (Mal-to-Mal)", "Mal2Mal", "Transfer", "Internal", "On-us transfers between Mal accounts", "OS-TM-004/005", "Low"],
        ["Card Chargeback / Refund", "B2C", "Card", "Scheme rules", "Merchant refund or chargeback settlement", "OS-TM-014", "Low-Medium"],
        ["Instant Transfer", "C2C/C2B", "Transfer", "CBUAE Aani IPP", "Instant payment — higher velocity scrutiny", "OS-TM-026", "Low-Medium"],
      ]
    : [
        ["ACH Domestic Transfer", "C2C/C2B", "Transfer", "BSA §5311", "US domestic ACH — standard monitoring", "OS-TM-005", "Low"],
        ["Wire Transfer (Fedwire)", "B2B/C2B", "Transfer", "BSA Travel Rule §5316", "Fedwire — BSA travel rule ≥$3k", "OS-TM-009", "Low-Medium"],
        ["International Wire (SWIFT)", "C2C/B2B", "Transfer", "BSA §5316 / OFAC", "Cross-border wire — OFAC screening required", "OS-TM-009/010", "Medium-High"],
        ["Zelle / RTP", "C2C", "Transfer", "Reg E", "Real-time payment — fraud velocity watch", "OS-TM-005/007", "Low-Medium"],
        ["Debit Card POS", "C2B", "Card", "Reg E / Visa", "Point-of-sale debit card authorisation", "OS-TM-006", "Low"],
        ["CNP / e-Commerce", "C2B", "Card", "Reg E / 3DS", "Card-not-present online purchase", "OS-TM-012", "Medium"],
        ["ATM Withdrawal", "C2C", "Card", "Reg E", "ATM cash withdrawal — structuring watch", "OS-TM-024", "Low-Medium"],
        ["Check / ACH Return", "C2C/B2B", "Transfer", "UCC Art. 4 / Reg CC", "Check deposit / ACH return processing", "OS-TM-018", "Low"],
        ["Cross-Border Remittance", "C2C", "Transfer", "Dodd-Frank §1073 / OFAC", "International remittance — OFAC pre-screen", "OS-TM-008/009", "Medium-High"],
        ["Cash Deposit (teller / ATM)", "C2C/B2C", "Cash", "BSA CTR §5313", "Cash ≥$10k → CTR; structuring watch below", "OS-TM-001/024", "Medium"],
        ["USDC / Stablecoin Leg", "B2B", "Both", "FinCEN VASP guidance", "USDC treasury leg — crypto mixer exposure watch", "OS-TM-038", "High"],
        ["Internal Transfer (Mal-to-Mal)", "Mal2Mal", "Transfer", "Internal", "On-us transfers between Global Account customers", "OS-TM-004/005", "Low"],
      ];

  types.forEach((row, i) => {
    const r = 6 + i;
    dataRow(ws, r, row);
    addRateConditionalFormatting(ws, `G${r}`);
  });

  ws.views = [{ state: "frozen", ySplit: 5 }];
}

function addCorridorGuidanceSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Corridor Guidance");
  addBrandHeader(ws, wb, logo, "Corridor Guidance", 6);
  ws.columns = [{ width: 24 }, { width: 22 }, { width: 44 }, { width: 32 }, { width: 28 }, { width: 24 }];

  hdr(ws, 5, ["Corridor / Region", "Risk Band", "Key Typologies", "Required Documentation", "Monitoring Uplift", "Regulatory Basis"]);

  const guidance = isUae
    ? [
        ["UAE Domestic", "Low", "Velocity, profile deviation, PEP domestic", "Standard KYC + WPS (salary)", "Standard monitoring", "CBUAE AML Reg 2019"],
        ["Pakistan (PK)", "High", "Hawala/IVTS, TBML, TF aggregation (KPK/Balochistan), wallet structuring, RTRA fraud proceeds, synthetic ID, remittance tax evasion", "SoF/SoW declaration + beneficiary relationship + NTN/filer check for business", "Enhanced monitoring; IVTS auto-block; see OS-TM-031–040", "FATF Grey List 2023; CBUAE corridor pack"],
        ["India (IN)", "Medium", "Remittance velocity, layering via informal channels", "Purpose code mandatory; SoF for >AED 25k", "Velocity alerts; corridor documentation required", "FATF Member; CBUAE Remittance Guidance"],
        ["Egypt (EG)", "Medium", "Corridor velocity, informal SoF", "Relationship declaration for recurring above AED 25k", "Baseline corridor monitoring + velocity watch", "FATF Member; CBUAE"],
        ["Turkey (TR)", "High", "Layering; proxy use; purpose-code mismatch", "Purpose code; SoF corroboration above AED 15k", "Enhanced; purpose-code integrity check required", "FATF Monitored; CBUAE"],
        ["GCC (BH/KW/OM/QA/SA)", "Low-Medium", "Velocity, PEP cross-border, trade-based ML", "Standard CDD; EDD for High CRA cross-GCC", "Corridor-specific thresholds by GCC country risk", "CBUAE GCC Scheme; bilateral AML agreements"],
        ["Syria / Iran / DPRK", "Prohibited", "Sanctions evasion, TF, asset freeze evasion", "N/A — all transactions blocked", "Auto-block; OVR-002; Vital4 mirror mandatory", "UNSC Resolutions; UAE TFS"],
        ["Crypto / VASP (all corridors)", "High", "Mixer exposure, sanctions wallet cluster, unlicensed VASP", "Licensed VASP whitelist only; blockchain analytics", "OS-TM-021/038; near-zero tolerance for mixer exposure", "CBUAE VARA; FATF R.15"],
      ]
    : [
        ["US Domestic (ACH/RTP/Zelle)", "Low", "Velocity, card testing, ACH return fraud", "Standard KYC; BSA CIP", "Baseline monitoring", "BSA §5311; Reg E"],
        ["Mexico", "High", "Cartel proceeds, remittance structuring, cash smuggling", "Purpose code; SoF for >USD 500; beneficiary ID", "Enhanced; lower thresholds; daily velocity check", "FinCEN Advisory 2023; OFAC SDNTK"],
        ["China", "Medium", "Capital control evasion, trade-based ML", "Purpose code mandatory; export compliance screen", "Enhanced purpose-code integrity; OFAC pre-screen", "OFAC; BIS export controls"],
        ["International Wire (SWIFT)", "Medium-High", "OFAC evasion, intermediary routing, TBML", "BSA travel rule docs; OFAC pre/post screen", "SWIFT screening; intermediary jurisdiction check", "BSA §5316; OFAC SDN/OFSI"],
        ["Afghanistan / DPRK / Iran / Cuba", "Prohibited", "Sanctions evasion, TF, OFAC prohibited programs", "N/A — all transactions blocked", "Auto-block; FinCEN SAR mandatory; OVR-002", "OFAC Cuba/Iran/North Korea/Afghanistan programs"],
        ["Russia", "High", "OFAC SDN match, Ukraine conflict related, asset freeze", "OFAC pre-screen mandatory; enhanced scrutiny", "All transactions: OFAC check + enhanced investigation", "OFAC Russia/Ukraine programs; FINCEN Advisory 2022"],
        ["Crypto / Stablecoin (all corridors)", "High", "OFAC wallet cluster, mixer, DeFi layering", "Licensed VASP only; Chainalysis / TRM analytics", "OS-TM-038; near-zero indirect exposure tolerance", "FinCEN VASP guidance; OFAC crypto advisory 2022"],
        ["Remittance ≥ $3,000", "Low-Medium", "Structuring, BSA travel rule", "BSA travel rule: name/address/acct of sender & beneficiary", "Travel rule compliance check; CTR if cash ≥$10k", "BSA §5316; FinCEN §103.33"],
      ];

  guidance.forEach((row, i) => {
    const r = 6 + i;
    dataRow(ws, r, row);
    const bandCell = ws.getCell(r, 2);
    const band = String(row[1]);
    if (band === "Prohibited") {
      bandCell.fill = fillSolid(BRAND.high); bandCell.font = { bold: true, size: 9, color: { argb: "FF7F1D1D" } };
    } else if (band === "High") {
      bandCell.fill = fillSolid("FFFEE2E2"); bandCell.font = { bold: true, size: 9, color: { argb: BRAND.highText } };
    } else if (band.startsWith("Medium")) {
      bandCell.fill = fillSolid(BRAND.med); bandCell.font = { bold: true, size: 9, color: { argb: BRAND.medText } };
    } else {
      bandCell.fill = fillSolid(BRAND.low); bandCell.font = { bold: true, size: 9, color: { argb: BRAND.lowText } };
    }
    ws.getRow(r).height = 40;
  });

  ws.views = [{ state: "frozen", ySplit: 5 }];
}

function addCountryTypologiesSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Country Typologies");
  addBrandHeader(ws, wb, logo, "Country Typologies", 7);
  ws.columns = [
    { width: 14 }, { width: 28 }, { width: 26 }, { width: 14 },
    { width: 44 }, { width: 24 }, { width: 22 },
  ];

  hdr(ws, 5, ["Rule ID", "Typology Name", "Category", "Corridor", "Description / Trigger", "Action", "Policy Ref"]);

  // Show corridor-specific rules (Pakistan pack for UAE, US-specific for Global Account)
  const corridorRules = isUae
    ? RULE_LIBRARY.filter((r) => {
        const ru = r as RuleRow & { corridorCountries?: string[] };
        return Array.isArray(ru.corridorCountries) && ru.corridorCountries.length > 0;
      })
    : RULE_LIBRARY.filter((r) => ["OS-TM-009","OS-TM-010","OS-TM-028"].includes(r.id));

  corridorRules.forEach((rule, i) => {
    const ru = rule as RuleRow & { corridorCountries?: string[]; pakistanTypologyId?: string };
    const r = 6 + i;
    dataRow(ws, r, [
      rule.id, rule.name, rule.category,
      ru.corridorCountries?.join(", ") ?? "All",
      rule.description + " | Trigger: " + rule.trigger,
      rule.action,
      (rule as RuleRow & { policyRef?: string }).policyRef ?? ru.pakistanTypologyId ?? "",
    ]);
    const sevCell = ws.getCell(r, 4);
    sevCell.fill = fillSolid(severityBg(rule.severity));
    sevCell.font = { bold: true, size: 9, color: { argb: severityFg(rule.severity) } };
    ws.getRow(r).height = 40;
  });

  ws.views = [{ state: "frozen", ySplit: 5 }];
}

function addReadinessSheet(
  wb: ExcelJS.Workbook, logo: ArrayBuffer, isUae: boolean,
) {
  const ws = wb.addWorksheet("Readiness Checklist");
  addBrandHeader(ws, wb, logo, "Pre-Implementation Readiness Checklist", 5);
  ws.columns = [{ width: 8 }, { width: 40 }, { width: 22 }, { width: 22 }, { width: 28 }];

  hdr(ws, 5, ["#", "Readiness Item", "Owner", "Status", "Notes"]);

  const items = isUae
    ? [
        ["1", "Oscilar deployment confirmed — UAE partition active and processing AED rails", "Engineering", "", ""],
        ["2", "Vital4 connected — CBUAE sanctions / PEP / watchlist lists loaded and updating", "Compliance", "", ""],
        ["3", "goAML account provisioned — STR/CTR filing workflow tested end-to-end", "Jana / Compliance", "", ""],
        ["4", "CBUAE UAEFTS purpose-of-payment codes validated against latest scheme list", "Product / Compliance", "", ""],
        ["5", "Pakistan corridor pack deployed (OS-TM-031–040) — back-test passed for TYP-PK typologies", "Engineering / Compliance", "", ""],
        ["6", "IVTS/Hawala auto-block live — authorized-channel-only payout enforced", "Engineering", "", ""],
        ["7", "PEP enhanced monitoring rules deployed (OS-TM-022/023)", "Engineering", "", ""],
        ["8", "CRAM re-rating webhook wired — transaction alerts POST to /api/v1/crr/events", "Engineering", "", ""],
        ["9", "Alert SLAs configured in Oscilar: Critical=immediate, High=same day, Medium=48h, Low=7d", "Operations", "", ""],
        ["10", "Mohsen investigation pipeline wired to Oscilar case management (Phase 4)", "Product", "", ""],
        ["11", "Monthly rule coverage attestation process documented and calendar entry set", "Compliance", "", ""],
        ["12", "No-tipping-off policy communicated to all staff with SAR/STR access", "MLRO", "", ""],
        ["13", "B-1 FATF grey/black-list floor interim control live (expires 2026-12-31)", "Engineering", "", ""],
        ["14", "Dual-perimeter firewall confirmed — UAE and US partitions do not share customer data", "Engineering", "", ""],
      ]
    : [
        ["1", "Oscilar deployment confirmed — US partition active (FinCEN CDD Rule aligned)", "Engineering", "", ""],
        ["2", "Vital4 connected — OFAC SDN + FinCEN watchlists loaded and updating", "Compliance", "", ""],
        ["3", "FinCEN BSA e-File account provisioned — SAR and CTR Form 104 tested", "Jana / Compliance", "", ""],
        ["4", "BSA Travel Rule compliance — name/address/acct captured for transfers ≥$3,000", "Engineering", "", ""],
        ["5", "CTR threshold automation — cash transactions ≥$10,000 auto-flag for Form 104", "Engineering", "", ""],
        ["6", "OFAC pre-screening on all cross-border wires (realtime; before settlement)", "Engineering", "", ""],
        ["7", "US BaaS corridor rules deployed (OS-TM-009) — FinCEN path active", "Engineering", "", ""],
        ["8", "CRAM re-rating webhook wired — US partition events POST to /api/v1/crr/events", "Engineering", "", ""],
        ["9", "Alert SLAs configured in Oscilar (US partition): Critical=immediate, High=same day", "Operations", "", ""],
        ["10", "Mohsen investigation pipeline wired to US partition case management", "Product", "", ""],
        ["11", "OFAC sanctions screening on USDC treasury / stablecoin legs", "Engineering", "", ""],
        ["12", "No-tipping-off policy communicated (31 U.S.C. §5318(g)(2))", "MLRO", "", ""],
        ["13", "B-1 FATF grey/black-list floor interim control live (expires 2026-12-31)", "Engineering", "", ""],
        ["14", "Dual-perimeter firewall confirmed — UAE and US partitions do not share customer data", "Engineering", "", ""],
      ];

  items.forEach(([num, item, owner, status, notes], i) => {
    const r = 6 + i;
    dataRow(ws, r, [num, item, owner, status, notes]);
    ws.getCell(r, 1).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(r, 1).font = { bold: true, color: { argb: BRAND.purple }, size: 9 };
    ws.getCell(r, 4).fill = fillSolid("FFFFF8E1");
    ws.getRow(r).height = 24;
  });

  ws.views = [{ state: "frozen", ySplit: 5 }];
}

// ─── public builders ──────────────────────────────────────────────────────────

async function buildTmWorkbook(isUae: boolean): Promise<ExcelJS.Workbook> {
  const title = isUae
    ? "Mal Bank – Transaction Monitoring & Screening Library"
    : "Global Account – Transaction Monitoring & Screening Library";
  const wb = newWorkbook(title);
  const logo = await loadLogoBuffer();

  addReadmeSheet(wb, logo, isUae);
  addRuleLibrarySheet(wb, logo, isUae);
  addCorridorSheet(wb, logo, isUae);
  addScreeningProgrammeSheet(wb, logo, isUae);
  addScoringSheet(wb, logo, isUae);
  addWorkflowSheet(wb, logo, isUae);
  addCaseMgmtSheet(wb, logo, isUae);
  addPurposeCodesSheet(wb, logo, isUae);
  addCustomerTxnTypesSheet(wb, logo, isUae);
  addCorridorGuidanceSheet(wb, logo, isUae);
  addCountryTypologiesSheet(wb, logo, isUae);
  addReadinessSheet(wb, logo, isUae);

  return wb;
}

export async function exportGlobalAccountTmWorkbook(): Promise<void> {
  const wb = await buildTmWorkbook(false);
  const date = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Mal-GlobalAccount-TM-Screening-Library-${date}.xlsx`);
}

export async function exportMalBankTmWorkbook(): Promise<void> {
  const wb = await buildTmWorkbook(true);
  const date = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Mal-Bank-TM-Screening-Library-${date}.xlsx`);
}
