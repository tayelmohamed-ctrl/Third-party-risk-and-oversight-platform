import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  allCatalogEntries,
  CATALOG_GUIDANCE,
  CATALOG_TABLE_OF_CONTENTS,
  catalogStats,
  CORRIDOR_GUIDANCE,
  COUNTRY_MODULES,
  FLOW_IDS,
  FLOW_LABELS,
  purposeTypologyLinks,
  TRANSACTION_PURPOSE_CATALOG,
  TYPOLOGY_ANNEX,
  type PurposeCatalogEntry,
  type PurposeFlowId,
} from "../config/transactionPurposeCatalog";

const BRAND = {
  header: [12, 18, 51] as [number, number, number],
  accent: [169, 83, 223] as [number, number, number],
  ink: [26, 31, 54] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  panel: [248, 249, 252] as [number, number, number],
  low: [22, 163, 74] as [number, number, number],
  med: [217, 119, 6] as [number, number, number],
  hi: [220, 38, 38] as [number, number, number],
};

type PdfState = {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  y: number;
  logo: string | null;
  margin: number;
};

function malLogoSvg(): string {
  const petals = Array.from({ length: 10 }, (_, k) => {
    const deg = k * 36;
    return `<g transform="rotate(${deg} 50 50)"><rect x="45.5" y="5" width="9" height="24" rx="4.5" fill="url(#malg)"/></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <defs><linearGradient id="malg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A953DF"/><stop offset="1" stop-color="#39B9ED"/>
    </linearGradient></defs>${petals}</svg>`;
}

async function loadLogoDataUrl(): Promise<string | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, 100, 100);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(malLogoSvg())}`;
  });
}

function drawHeader(state: PdfState, subtitle?: string) {
  const { doc, pageW, logo, margin } = state;
  doc.setFillColor(...BRAND.header);
  doc.rect(0, 0, pageW, 32, "F");
  if (logo) doc.addImage(logo, "PNG", margin, 6, 14, 14);
  else { doc.setFillColor(...BRAND.accent); doc.circle(margin + 7, 13, 7, "F"); }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Mal FinCrime OS", margin + 18, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 210, 230);
  doc.text(subtitle ?? CATALOG_GUIDANCE.title, margin + 18, 18);
  doc.text(CATALOG_GUIDANCE.documentId, pageW - margin, 12, { align: "right" });
}

function drawFooter(state: PdfState) {
  const { doc, pageW, pageH, margin } = state;
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.line);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(CATALOG_GUIDANCE.confidentiality, margin, pageH - 7);
    doc.text(`Catalog v${CATALOG_GUIDANCE.version} · Page ${i} of ${pages}`, pageW - margin, pageH - 7, { align: "right" });
  }
}

function newPage(state: PdfState, subtitle?: string): number {
  state.doc.addPage();
  drawHeader(state, subtitle);
  return 38;
}

function ensureSpace(state: PdfState, needed: number, subtitle?: string): number {
  if (state.y + needed > state.pageH - 18) state.y = newPage(state, subtitle);
  return state.y;
}

function sectionHeading(state: PdfState, title: string, subtitle?: string) {
  state.y = ensureSpace(state, 16, subtitle);
  state.doc.setTextColor(...BRAND.ink);
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(11);
  state.doc.text(title, state.margin, state.y);
  state.y += 3;
  state.doc.setDrawColor(...BRAND.accent);
  state.doc.setLineWidth(0.5);
  state.doc.line(state.margin, state.y, state.margin + 55, state.y);
  state.y += 6;
}

function bodyParagraph(state: PdfState, text: string, subtitle?: string) {
  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(8.5);
  state.doc.setTextColor(...BRAND.muted);
  const lines = state.doc.splitTextToSize(text, state.pageW - state.margin * 2);
  state.y = ensureSpace(state, lines.length * 4 + 4, subtitle);
  state.doc.text(lines, state.margin, state.y);
  state.y += lines.length * 4 + 4;
}

function bulletList(state: PdfState, items: string[], subtitle?: string) {
  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(8.5);
  state.doc.setTextColor(...BRAND.ink);
  for (const item of items) {
    const lines = state.doc.splitTextToSize(`• ${item}`, state.pageW - state.margin * 2 - 4);
    state.y = ensureSpace(state, lines.length * 4 + 2, subtitle);
    state.doc.text(lines, state.margin + 2, state.y);
    state.y += lines.length * 4 + 1;
  }
  state.y += 3;
}

function dataTable(
  state: PdfState,
  head: string[],
  body: string[][],
  opts?: { fontSize?: number; subtitle?: string; columnStyles?: Record<number, { cellWidth?: number }> },
) {
  state.y = ensureSpace(state, 24, opts?.subtitle);
  autoTable(state.doc, {
    startY: state.y,
    head: [head],
    body,
    styles: { fontSize: opts?.fontSize ?? 7, cellPadding: 2, textColor: BRAND.ink, lineColor: BRAND.line, overflow: "linebreak" },
    headStyles: { fillColor: BRAND.header, textColor: [255, 255, 255], fontStyle: "bold", fontSize: (opts?.fontSize ?? 7) + 0.5 },
    alternateRowStyles: { fillColor: BRAND.panel },
    margin: { left: state.margin, right: state.margin },
    columnStyles: opts?.columnStyles,
  });
  state.y = (state.doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? state.y + 20;
  state.y += 6;
}

function tierColor(tier: string): [number, number, number] {
  if (tier === "Low") return BRAND.low;
  if (tier === "High") return BRAND.hi;
  return BRAND.med;
}

function drawCover(state: PdfState) {
  const { doc, pageW, margin, logo } = state;
  doc.setFillColor(...BRAND.header);
  doc.rect(0, 0, pageW, 95, "F");
  if (logo) doc.addImage(logo, "PNG", margin, 22, 28, 28);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Mal", margin + (logo ? 34 : 0), 38);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("FinCrime OS", margin + (logo ? 34 : 0), 46);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("Transaction Monitoring", margin, 66);
  doc.text("& Screening", margin, 76);

  state.y = 108;
  doc.setTextColor(...BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(CATALOG_GUIDANCE.title, margin, state.y);
  state.y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  const sub = doc.splitTextToSize(CATALOG_GUIDANCE.subtitle, pageW - margin * 2);
  doc.text(sub, margin, state.y);
  state.y += sub.length * 5 + 8;

  const stats = catalogStats();
  const meta: [string, string][] = [
    ["Document ID", CATALOG_GUIDANCE.documentId],
    ["Catalog version", `v${CATALOG_GUIDANCE.version} (${CATALOG_GUIDANCE.catalogVersion})`],
    ["Purpose codes", `${stats.total} across 5 transaction flows`],
    ["CRAM model", CATALOG_GUIDANCE.modelVersion],
    ["Owner", CATALOG_GUIDANCE.owner],
    ["Audience", "Product · Payment Operations · Compliance · TM investigators"],
    ["Generated", new Date().toLocaleString()],
  ];
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.ink);
    doc.text(k, margin, state.y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(v, margin + 42, state.y, { maxWidth: pageW - margin - 46 });
    state.y += 7;
  });

  state.y += 4;
  doc.setFillColor(...BRAND.panel);
  doc.roundedRect(margin, state.y, pageW - margin * 2, 24, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.ink);
  doc.text("Quick reference for Product & Operations", margin + 4, state.y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    `Mandatory purpose on every transfer · Flow-specific lists (never customer-selected flow) · Risk tier drives evidence & TM · ${stats.byTier.High} High · ${stats.byTier.Medium} Medium · ${stats.byTier.Low} Low tier codes`,
    margin + 4, state.y + 14, { maxWidth: pageW - margin * 2 - 8 },
  );
}

function renderPurposeDetail(state: PdfState, flowId: PurposeFlowId, entry: PurposeCatalogEntry) {
  const sub = `${FLOW_LABELS[flowId]} — ${entry.purpose_code}`;
  state.y = ensureSpace(state, 36, sub);

  state.doc.setFillColor(...tierColor(entry.risk_tier));
  state.doc.roundedRect(state.margin, state.y - 4, 5, 5, 1, 1, "F");
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(9);
  state.doc.setTextColor(...BRAND.ink);
  const subFlow = entry.sub_flow ? ` [${entry.sub_flow}]` : "";
  state.doc.text(`${entry.purpose_code}${subFlow} — ${entry.customer_facing_label}`, state.margin + 8, state.y);
  state.y += 5;
  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(7.5);
  state.doc.setTextColor(...BRAND.muted);
  state.doc.text(`Risk: ${entry.risk_tier} · CBUAE POP: ${entry.cbuae_pop_mapping_indicative_validate}`, state.margin + 8, state.y);
  state.y += 4;

  const links = purposeTypologyLinks({ ...entry, flowId });
  const linkLine = [
    links.corridors.length ? `Corridors: ${links.corridors.join(", ")}` : "",
    links.typologies.length ? `Typologies: ${links.typologies.slice(0, 4).join(", ")}` : "",
    links.scenarios.length ? `TM scenarios: ${links.scenarios.join(", ")}` : "",
  ].filter(Boolean).join(" · ");
  if (linkLine) {
    state.doc.setFontSize(7);
    state.doc.setTextColor(...BRAND.accent);
    state.doc.text(linkLine, state.margin + 8, state.y, { maxWidth: state.pageW - state.margin * 2 - 8 });
    state.y += 5;
  }

  dataTable(
    state,
    ["Field", "Guidance"],
    [
      ["Customer description", entry.description_shown_to_customer],
      ["Acceptable use (compliance)", entry.acceptable_use_compliance_definition],
      ["Not acceptable / misuse", entry.not_acceptable_misuse_indicators],
      ["Evidence / EDD trigger", entry.evidence_edd_trigger],
      ["TM & screening relevance", entry.tm_screening_relevance],
    ],
    { subtitle: sub, fontSize: 6.8 },
  );
}

function renderFlowSection(state: PdfState, flowId: PurposeFlowId) {
  const flow = TRANSACTION_PURPOSE_CATALOG.flows[flowId];
  if (!flow) return;

  state.y = newPage(state, FLOW_LABELS[flowId]);
  sectionHeading(state, `${flowId} — ${flow.title}`, FLOW_LABELS[flowId]);
  bodyParagraph(state, flow.subtitle, FLOW_LABELS[flowId]);

  dataTable(
    state,
    ["Code", "Label", "Tier", "POP", "Acceptable use (summary)"],
    flow.entries.map((e) => [
      e.purpose_code,
      e.customer_facing_label,
      e.risk_tier,
      e.cbuae_pop_mapping_indicative_validate.slice(0, 12),
      e.acceptable_use_compliance_definition.slice(0, 72) + (e.acceptable_use_compliance_definition.length > 72 ? "…" : ""),
    ]),
    {
      subtitle: FLOW_LABELS[flowId],
      fontSize: 6.5,
      columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 32 }, 2: { cellWidth: 12 }, 3: { cellWidth: 14 }, 4: { cellWidth: 96 } },
    },
  );

  sectionHeading(state, `${flowId} — Detailed use cases & scenarios`, FLOW_LABELS[flowId]);
  for (const entry of flow.entries) {
    renderPurposeDetail(state, flowId, entry);
  }
}

function renderCorridorSection(state: PdfState) {
  state.y = newPage(state, "Corridor EWRA Guidance");
  sectionHeading(state, "Section 6 — Corridor EWRA Guidance");
  bodyParagraph(
    state,
    "Cross-border purpose codes must be consistent with corridor inherent risk, EWRA country overrides, and deployed Oscilar TM rules. Product and Operations should not enable High-tier purposes on corridors in pilot/planned status without Compliance sign-off.",
    "Corridor EWRA Guidance",
  );

  dataTable(
    state,
    ["Corridor", "Risk", "Status", "Stage", "Products", "Typology library"],
    CORRIDOR_GUIDANCE.map((c) => [
      c.label,
      c.corridorScore ? `${c.inherentRisk} (L×I ${c.corridorScore.likelihoodImpact})` : c.inherentRisk,
      c.status,
      c.workflowStage,
      c.productScope.join(", "),
      c.typologyLibraryId ?? "Inline corridor risks",
    ]),
    { subtitle: "Corridor EWRA Guidance", fontSize: 6.5, columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 2: { cellWidth: 14 }, 3: { cellWidth: 22 }, 4: { cellWidth: 38 }, 5: { cellWidth: 34 } } },
  );

  for (const c of CORRIDOR_GUIDANCE) {
    state.y = ensureSpace(state, 30, "Corridor EWRA Guidance");
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(9);
    state.doc.setTextColor(...BRAND.ink);
    state.doc.text(`${c.id} — ${c.label}`, state.margin, state.y);
    state.y += 5;
    dataTable(
      state,
      ["Category", "Typologies / notes"],
      [
        ["ML typologies", c.mlTypologies.join(", ") || "—"],
        ["TF typologies", c.tfTypologies.join(", ") || "—"],
        ["Illicit finance", c.illicitFinance.join(", ") || "—"],
        ["Islamic-specific", c.islamicSpecific.join(", ") || "—"],
        ["Sanctions", c.sanctionsNotes || "—"],
        ["Oscilar rules", c.oscilarRules.slice(0, 8).join(", ") + (c.oscilarRules.length > 8 ? " …" : "")],
        ["Target go-live", c.targetGoLive ?? "—"],
      ],
      { subtitle: "Corridor EWRA Guidance", fontSize: 7 },
    );
  }

  sectionHeading(state, "Country compliance modules", "Corridor EWRA Guidance");
  dataTable(
    state,
    ["Country", "FATF", "CRA", "EWRA override", "EDD", "Monitoring", "Rationale (summary)"],
    COUNTRY_MODULES.map((m) => [
      `${m.countryCode} ${m.countryName}`,
      m.fatfStatus.replace("_", " "),
      m.craBand,
      m.ewraOverride ? `${m.ewraOverride} (${m.ewraScore})` : "—",
      m.eddMandatory ? "Yes" : "No",
      m.enhancedMonitoring ? "Enhanced" : "Standard",
      m.rationale.slice(0, 90) + (m.rationale.length > 90 ? "…" : ""),
    ]),
    { subtitle: "Corridor EWRA Guidance", fontSize: 6.2 },
  );
}

function renderTypologyAnnex(state: PdfState) {
  state.y = newPage(state, "Appendix A — Country Typologies");
  sectionHeading(state, "Appendix A — Country Risk Typologies (Pakistan corpus)");
  bodyParagraph(
    state,
    "Pakistan has the most mature typology library (PK-TYPOLIB-2026-Q3). Other corridors use inline EWRA typologies until dedicated country libraries are published. Link purpose codes to typologies when designing TM rules and partner communications.",
    "Appendix A",
  );

  dataTable(
    state,
    ["ID", "Typology", "Category", "Severity", "Primary Oscilar rule", "Red-flag indicators (summary)"],
    TYPOLOGY_ANNEX.pakistanCorpus.map((t) => [
      t.id,
      t.name,
      t.category,
      t.severity,
      t.primaryOscilarRule ?? t.oscilarRules[0] ?? "—",
      t.indicators.slice(0, 2).join("; "),
    ]),
    { subtitle: "Appendix A", fontSize: 6.2, columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 38 }, 2: { cellWidth: 14 }, 3: { cellWidth: 14 }, 4: { cellWidth: 22 }, 5: { cellWidth: 70 } } },
  );

  for (const t of TYPOLOGY_ANNEX.pakistanCorpus) {
    state.y = ensureSpace(state, 28, "Appendix A");
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(8.5);
    state.doc.setTextColor(...BRAND.ink);
    state.doc.text(`${t.id} — ${t.name} (${t.severity})`, state.margin, state.y);
    state.y += 4;
    dataTable(
      state,
      ["Field", "Detail"],
      [
        ["Description", t.description],
        ["Indicators", t.indicators.join(" · ")],
        ["Controls", t.primaryControls.join(" · ")],
        ["Oscilar rules", t.oscilarRules.join(", ")],
        ["Corridor relevance", t.corridorRelevance],
        ["Source", t.source],
      ],
      { subtitle: "Appendix A", fontSize: 6.8 },
    );
  }

  sectionHeading(state, "Pakistan jurisdiction typologies (NRA / CCM)", "Appendix A");
  bulletList(state, TYPOLOGY_ANNEX.pakistanJurisdictionTypologies, "Appendix A");
  sectionHeading(state, "Pakistan red flags (summary)", "Appendix A");
  bulletList(state, TYPOLOGY_ANNEX.pakistanRedFlags.slice(0, 12), "Appendix A");

  state.y = newPage(state, "Appendix A — Other corridors");
  sectionHeading(state, "Inline corridor typologies (non-PK corridors)");
  for (const row of TYPOLOGY_ANNEX.corridorInlineTypologies) {
    if (row.typologies.length === 0) continue;
    state.y = ensureSpace(state, 14, "Appendix A");
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(8.5);
    state.doc.setTextColor(...BRAND.ink);
    state.doc.text(row.label, state.margin, state.y);
    state.y += 4;
    dataTable(
      state,
      ["Category", "Typology ID"],
      row.typologies.map((t) => [t.category, t.id]),
      { subtitle: "Appendix A", fontSize: 7 },
    );
  }
}

function renderLinkageMatrix(state: PdfState) {
  state.y = newPage(state, "Appendix B — Linkage Matrix");
  sectionHeading(state, "Appendix B — Purpose Code ↔ Typology ↔ Corridor Linkage");
  bodyParagraph(
    state,
    "Indicative mapping for Product, Operations, and TM rule design. High-risk purpose codes on Critical corridors require enhanced monitoring regardless of declared acceptable use.",
    "Appendix B",
  );

  const entries = allCatalogEntries().filter((e) => {
    const l = purposeTypologyLinks(e);
    return l.corridors.length > 0 || l.typologies.length > 0 || e.risk_tier === "High";
  });

  dataTable(
    state,
    ["Flow", "Code", "Label", "Tier", "Linked corridors", "Linked typologies"],
    entries.map((e) => {
      const l = purposeTypologyLinks(e);
      return [
        e.flowId,
        e.purpose_code,
        e.customer_facing_label.slice(0, 28),
        e.risk_tier,
        l.corridors.join(", ").slice(0, 40),
        l.typologies.join(", ").slice(0, 40),
      ];
    }),
    { subtitle: "Appendix B", fontSize: 5.8, columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 14 }, 2: { cellWidth: 28 }, 3: { cellWidth: 10 }, 4: { cellWidth: 38 }, 5: { cellWidth: 38 } } },
  );
}

export async function buildTransactionPurposeCatalogPdf(): Promise<jsPDF> {
  const logo = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const state: PdfState = { doc, pageW, pageH, y: 0, logo, margin };

  drawCover(state);

  state.y = newPage(state, "Contents");
  sectionHeading(state, "Table of Contents");
  CATALOG_TABLE_OF_CONTENTS.forEach((item, i) => {
    state.y = ensureSpace(state, 6, "Contents");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.ink);
    doc.text(`${String(i + 1).padStart(2, "0")}.  ${item}`, margin, state.y);
    state.y += 5.5;
  });

  state.y = newPage(state, "Executive Summary");
  sectionHeading(state, "Executive Summary for Product & Operations");
  const stats = catalogStats();
  bodyParagraph(
    state,
    `This catalog defines ${stats.total} customer-selectable purpose-of-payment codes across five transaction flows. Purpose selection is mandatory on every customer-initiated transfer. The system derives flow type (C2C, C2B, B2C, B2B, Mal2Mal) — customers never choose the flow. Each code includes acceptable use, misuse indicators, CBUAE POP mapping (indicative), risk tier, evidence triggers, and TM/scenario relevance.`,
    "Executive Summary",
  );
  dataTable(
    state,
    ["Flow", "Label", "Codes", "Primary use"],
    FLOW_IDS.map((id) => [
      id,
      FLOW_LABELS[id],
      String(stats.byFlow[id]),
      TRANSACTION_PURPOSE_CATALOG.flows[id]?.subtitle.slice(0, 60) + "…",
    ]),
    { subtitle: "Executive Summary", columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 38 }, 2: { cellWidth: 12 }, 3: { cellWidth: 108 } } },
  );

  const readme = TRANSACTION_PURPOSE_CATALOG.readme;
  const devStart = readme.findIndex((l) => l.includes("HOW DEVELOPERS"));
  const compStart = readme.findIndex((l) => l.includes("HOW COMPLIANCE"));
  const caveatsStart = readme.findIndex((l) => l.includes("IMPORTANT CAVEATS"));

  state.y = newPage(state, "Implementation Rules");
  sectionHeading(state, "Developer Implementation Rules");
  if (devStart >= 0) bulletList(state, readme.slice(devStart + 1, compStart >= 0 ? compStart : undefined).filter((l) => !l.startsWith("HOW")), "Implementation Rules");

  sectionHeading(state, "Compliance & TM Usage Rules");
  if (compStart >= 0) bulletList(state, readme.slice(compStart + 1, caveatsStart >= 0 ? caveatsStart : undefined).filter((l) => !l.startsWith("HOW")), "Compliance Rules");

  sectionHeading(state, "Important Caveats");
  if (caveatsStart >= 0) bulletList(state, readme.slice(caveatsStart + 1), "Caveats");

  for (const flowId of FLOW_IDS) renderFlowSection(state, flowId);
  renderCorridorSection(state);
  renderTypologyAnnex(state);
  renderLinkageMatrix(state);

  state.y = newPage(state, "Sign-off");
  sectionHeading(state, "MLRO / Product Sign-off");
  bodyParagraph(state, "I confirm this purpose code catalog, corridor guidance, and typology annex have been reviewed for Product, Payment Operations, and Compliance alignment.", "Sign-off");
  state.y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.ink);
  doc.text("Product owner: _____________________________  Date: ______________", margin, state.y);
  state.y += 10;
  doc.text("Payment Operations: _________________________  Date: ______________", margin, state.y);
  state.y += 10;
  doc.text("MLRO / Compliance: __________________________  Date: ______________", margin, state.y);
  state.y += 10;
  doc.text("Approved for production catalog v1.0:  □ Yes   □ No   □ Conditional", margin, state.y);

  drawFooter(state);
  return doc;
}

export async function exportTransactionPurposeCatalogPdf(): Promise<void> {
  const doc = await buildTransactionPurposeCatalogPdf();
  doc.save(`Mal-TM-Purpose-Code-Catalog-v${CATALOG_GUIDANCE.version}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** @deprecated Use exportTransactionPurposeCatalogPdf */
export async function exportPaymentPurposeGuidancePdf(): Promise<void> {
  return exportTransactionPurposeCatalogPdf();
}

export async function buildPaymentPurposeGuidancePdf(): Promise<jsPDF> {
  return buildTransactionPurposeCatalogPdf();
}
