import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BEHAVIOUR_TRIGGERS,
  CALCULATION_SEQUENCE,
  COMPOSITE_FORMULA,
  CUSTOMER_SEGMENTS,
  DESIGN_PRINCIPLES,
  EDD_EVIDENCE_MATRIX,
  EXECUTIVE_SUMMARY,
  FACTOR_WEIGHTS_BY_SEGMENT,
  GEOGRAPHY_PILLARS,
  LP_PROFILE_PARAMETERS,
  METHODOLOGY_DOCUMENT,
  NP_PROFILE_PARAMETERS,
  OUTCOME_MAPPING,
  OVERRIDE_REGISTRY,
  PRODUCT_BASELINE_MATRIX,
  PURPOSE,
  RATING_BANDS,
  ROUNDING_CONTROLS,
  TABLE_OF_CONTENTS,
  buildImplementationAppendix,
} from "../config/cramMethodologyDocument";

const BRAND = {
  header: [12, 18, 51] as [number, number, number],
  accent: [169, 83, 223] as [number, number, number],
  ink: [26, 31, 54] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  panel: [248, 249, 252] as [number, number, number],
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
  doc.text(subtitle ?? METHODOLOGY_DOCUMENT.title, margin + 18, 18);
  doc.text(METHODOLOGY_DOCUMENT.modelVersionId, pageW - margin, 12, { align: "right" });
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
    doc.text(METHODOLOGY_DOCUMENT.confidentiality, margin, pageH - 7);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 7, { align: "right" });
  }
}

function newPage(state: PdfState, subtitle?: string): number {
  state.doc.addPage();
  drawHeader(state, subtitle);
  return 38;
}

function ensureSpace(state: PdfState, needed: number, subtitle?: string): number {
  if (state.y + needed > state.pageH - 18) {
    state.y = newPage(state, subtitle);
  }
  return state.y;
}

function sectionHeading(state: PdfState, title: string, subtitle?: string) {
  state.y = ensureSpace(state, 16, subtitle);
  docSetInk(state);
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(11);
  state.doc.text(title, state.margin, state.y);
  state.y += 3;
  state.doc.setDrawColor(...BRAND.accent);
  state.doc.setLineWidth(0.5);
  state.doc.line(state.margin, state.y, state.margin + 55, state.y);
  state.y += 6;
}

function docSetInk(state: PdfState) {
  state.doc.setTextColor(...BRAND.ink);
}

function bodyParagraph(state: PdfState, text: string, subtitle?: string) {
  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(8.5);
  state.doc.setTextColor(...BRAND.muted);
  const lines = state.doc.splitTextToSize(text, state.pageW - state.margin * 2);
  const blockH = lines.length * 4 + 4;
  state.y = ensureSpace(state, blockH, subtitle);
  state.doc.text(lines, state.margin, state.y);
  state.y += blockH;
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
    styles: {
      fontSize: opts?.fontSize ?? 7,
      cellPadding: 2,
      textColor: BRAND.ink,
      lineColor: BRAND.line,
      overflow: "linebreak",
    },
    headStyles: { fillColor: BRAND.header, textColor: [255, 255, 255], fontStyle: "bold", fontSize: (opts?.fontSize ?? 7) + 0.5 },
    alternateRowStyles: { fillColor: BRAND.panel },
    margin: { left: state.margin, right: state.margin },
    columnStyles: opts?.columnStyles,
  });
  state.y = (state.doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? state.y + 20;
  state.y += 6;
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

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Risk Assessment", margin, 72);
  doc.text("Methodology", margin, 82);

  state.y = 108;
  docSetInk(state);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(METHODOLOGY_DOCUMENT.subtitle, margin, state.y);
  state.y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  const meta = [
    ["Document type", METHODOLOGY_DOCUMENT.documentType],
    ["Model version", METHODOLOGY_DOCUMENT.modelVersionId],
    ["Owner", METHODOLOGY_DOCUMENT.owner],
    ["Approval forum", METHODOLOGY_DOCUMENT.approvalForum],
    ["Generated", new Date().toLocaleString()],
    ["Reference", "Customer Risk Assessment Methodology CBUAE Digital Bank"],
  ];
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.ink);
    doc.text(k, margin, state.y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(String(v), margin + 42, state.y, { maxWidth: pageW - margin - 46 });
    state.y += 7;
  });

  state.y += 6;
  doc.setFillColor(...BRAND.panel);
  doc.roundedRect(margin, state.y, pageW - margin * 2, 28, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.ink);
  doc.text("Primary risk domains", margin + 4, state.y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    "Money laundering · terrorist financing · proliferation financing · targeted financial sanctions · sanctions evasion · high-risk country exposure · TBML · fraud/scam/mule exposure · digital identity abuse · non-face-to-face channel risk",
    margin + 4,
    state.y + 14,
    { maxWidth: pageW - margin * 2 - 8 },
  );
}

export async function buildCramMethodologyPdf(): Promise<jsPDF> {
  const logo = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const state: PdfState = { doc, pageW, pageH, y: 0, logo, margin };

  drawCover(state);

  // TOC
  state.y = newPage(state, "Contents");
  sectionHeading(state, "Table of Contents");
  TABLE_OF_CONTENTS.forEach((item, i) => {
    state.y = ensureSpace(state, 6, "Contents");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.ink);
    doc.text(`${String(i + 1).padStart(2, "0")}.  ${item}`, margin, state.y);
    state.y += 5.5;
  });

  // Executive summary
  state.y = newPage(state, "Executive Summary");
  sectionHeading(state, "Executive Summary");
  bodyParagraph(state, EXECUTIVE_SUMMARY);

  // Section 1
  state.y = newPage(state, PURPOSE.section);
  sectionHeading(state, PURPOSE.section);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("1.1 Purpose", margin, state.y);
  state.y += 5;
  bodyParagraph(state, PURPOSE.purpose, PURPOSE.section);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("1.2 Measurable objectives", margin, state.y);
  state.y += 5;
  bulletList(state, PURPOSE.objectives, PURPOSE.section);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("1.3 Scope", margin, state.y);
  state.y += 5;
  bulletList(state, PURPOSE.scope, PURPOSE.section);
  bodyParagraph(state, PURPOSE.outOfScopeNote, PURPOSE.section);

  // Section 2
  state.y = newPage(state, "Core Design Principles");
  sectionHeading(state, "2. Core Design Principles");
  dataTable(state, ["Principle", "Mandatory implementation rule"], DESIGN_PRINCIPLES.map((r) => [r.principle, r.rule]), {
    fontSize: 7.5,
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 134 } },
  });

  // Section 3 — Scoring
  state.y = newPage(state, "Authoritative Scoring Framework");
  sectionHeading(state, "3. Authoritative Scoring Framework");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("3.1 Score scale and rating bands", margin, state.y);
  state.y += 5;
  dataTable(
    state,
    ["Raw score band", "Mathematical rating", "Minimum treatment", "Implementation rule"],
    RATING_BANDS.map((r) => [r.band, r.rating, r.treatment, r.rule]),
    { subtitle: "Authoritative Scoring Framework", fontSize: 6.8, columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 22 }, 2: { cellWidth: 58 }, 3: { cellWidth: 58 } } },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("3.2 Mathematical formula and calculation sequence", margin, state.y);
  state.y += 5;
  bodyParagraph(state, COMPOSITE_FORMULA, "Authoritative Scoring Framework");
  bulletList(state, CALCULATION_SEQUENCE, "Authoritative Scoring Framework");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("3.3 Rounding and precision controls", margin, state.y);
  state.y += 5;
  bulletList(state, ROUNDING_CONTROLS, "Authoritative Scoring Framework");

  // Section 4 — Segments
  state.y = newPage(state, "Customer Segments");
  sectionHeading(state, "4. Customer Segments and Relationship Hierarchy");
  dataTable(
    state,
    ["Code", "Segment", "Roles captured", "Risk treatment"],
    CUSTOMER_SEGMENTS.map((s) => [s.code, s.segment, s.roles, s.treatment]),
    { fontSize: 6.5, columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 28 }, 2: { cellWidth: 52 }, 3: { cellWidth: 72 } } },
  );

  // Section 5 — Factor weights
  state.y = newPage(state, "Factor Weights §6.1");
  sectionHeading(state, "5. Factor Weights by Segment and Lifecycle Stage (§6.1)");
  bodyParagraph(
    state,
    "Active production factor weights. Each column sums to 100%. New customers weight profile, product, geography and digital assurance more heavily; existing customers weight expected activity and transaction behaviour more heavily. Systems-and-controls applies to FI segments only.",
    "Factor Weights §6.1",
  );
  dataTable(state, FACTOR_WEIGHTS_BY_SEGMENT.headers, FACTOR_WEIGHTS_BY_SEGMENT.rows, {
    fontSize: 7.5,
    subtitle: "Factor Weights §6.1",
  });

  // Section 6 — NP parameters
  state.y = newPage(state, "NP Parameters §7.1");
  sectionHeading(state, "6. Natural Person Profile Parameter Library (§7.1)");
  dataTable(state, NP_PROFILE_PARAMETERS.headers, NP_PROFILE_PARAMETERS.rows, {
    fontSize: 6.2,
    subtitle: "NP Parameters §7.1",
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 10 }, 2: { cellWidth: 44 }, 3: { cellWidth: 44 }, 4: { cellWidth: 44 } },
  });

  // Section 7 — LP parameters
  state.y = newPage(state, "LP/MER Parameters §7.2");
  sectionHeading(state, "7. Legal Person / SME / Merchant Parameter Library (§7.2)");
  dataTable(state, LP_PROFILE_PARAMETERS.headers, LP_PROFILE_PARAMETERS.rows, {
    fontSize: 6.2,
    subtitle: "LP/MER Parameters §7.2",
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 10 }, 2: { cellWidth: 44 }, 3: { cellWidth: 44 }, 4: { cellWidth: 44 } },
  });

  // Section 8 — Geography
  state.y = newPage(state, "Geography §8.1");
  sectionHeading(state, "8. Geography and Country Risk Methodology (§8.1)");
  dataTable(state, GEOGRAPHY_PILLARS.headers, GEOGRAPHY_PILLARS.rows, {
    fontSize: 6.5,
    subtitle: "Geography §8.1",
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 10 }, 2: { cellWidth: 40 }, 3: { cellWidth: 40 }, 4: { cellWidth: 40 } },
  });

  // Section 9 — Products
  state.y = newPage(state, "Product Baseline §9.3");
  sectionHeading(state, "9. Digital-Bank Product Baseline Matrix (§9.3)");
  bodyParagraph(
    state,
    "Each product must have an approved product risk score before launch or customer activation. Where a customer has multiple products, the customer product factor uses the highest active or requested product score unless a validated exposure-weighted method is approved.",
    "Product Baseline §9.3",
  );
  dataTable(state, PRODUCT_BASELINE_MATRIX.headers, PRODUCT_BASELINE_MATRIX.rows, {
    fontSize: 7,
    subtitle: "Product Baseline §9.3",
    columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 22 }, 2: { cellWidth: 98 } },
  });

  // Section 10 — Behaviour
  state.y = newPage(state, "Behaviour §11");
  sectionHeading(state, "10. Expected Activity, Behaviour and Funding Risk (§11)");
  bodyParagraph(
    state,
    "Expected activity is collected at onboarding and validated after activation. Existing-customer scoring must use observed behaviour in rolling windows — velocity, pass-through, counterparty concentration, unexpected corridors, dormancy-to-activity and alert/case outcomes.",
    "Behaviour §11",
  );
  dataTable(state, BEHAVIOUR_TRIGGERS.headers, BEHAVIOUR_TRIGGERS.rows, {
    fontSize: 7,
    subtitle: "Behaviour §11",
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 58 }, 2: { cellWidth: 58 } },
  });

  // Section 11 — Overrides
  state.y = newPage(state, "Overrides §13");
  sectionHeading(state, "11. Overrides, Risk Floors and Prohibitions (§13)");
  bodyParagraph(
    state,
    "Overrides are deterministic, auditable and separate from the weighted scoring engine. Hard prohibitions (OVR-001 to OVR-007) are evaluated before normal approval routing. High floors (OVR-008 to OVR-014) and Medium floors (OVR-015 to OVR-020) are applied after the mathematical score. Manual downgrades cannot override hard prohibitions or mandatory floors.",
    "Overrides §13",
  );
  dataTable(
    state,
    ["Rule ID", "Trigger", "Outcome", "Priority"],
    OVERRIDE_REGISTRY.map((o) => [o.id, o.trigger, o.outcome, o.priority]),
    {
      fontSize: 6.5,
      subtitle: "Overrides §13",
      columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 72 }, 2: { cellWidth: 38 }, 3: { cellWidth: 18 } },
    },
  );

  // Section 12 — Outcomes
  state.y = newPage(state, "Outcomes §14");
  sectionHeading(state, "12. Due Diligence, Approval, Monitoring and Review Outcomes (§14)");
  dataTable(state, OUTCOME_MAPPING.headers, OUTCOME_MAPPING.rows, {
    fontSize: 6.5,
    subtitle: "Outcomes §14",
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 42 }, 2: { cellWidth: 38 }, 3: { cellWidth: 28 }, 4: { cellWidth: 34 } },
  });

  // Section 13 — EDD matrix
  state.y = newPage(state, "EDD Matrix §14.1");
  sectionHeading(state, "13. EDD Evidence Matrix (§14.1)");
  dataTable(state, EDD_EVIDENCE_MATRIX.headers, EDD_EVIDENCE_MATRIX.rows, {
    fontSize: 6.8,
    subtitle: "EDD Matrix §14.1",
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 68 }, 2: { cellWidth: 68 } },
  });

  // Appendix A — Implementation
  const impl = buildImplementationAppendix();
  state.y = newPage(state, "Appendix A — Implementation");
  sectionHeading(state, "Appendix A — Mal FinCrime OS Implementation Binding");
  bodyParagraph(
    state,
    `This appendix maps the approved methodology (${METHODOLOGY_DOCUMENT.modelVersionId}) to the live Mal FinCrime OS scoring engine, reference libraries and golden-thread configuration deployed in production build.`,
    "Appendix A — Implementation",
  );

  dataTable(
    state,
    ["Configuration item", "Deployed value"],
    [
      ["Platform", impl.platform],
      ["Model version ID", impl.deployedModelVersion],
      ["Activity library", impl.activityLibrary],
      ["Customer-type weight (composite)", impl.activeFactorWeights.customerType],
      ["Geography weight", impl.activeFactorWeights.geography],
      ["Product weight", impl.activeFactorWeights.product],
      ["Service weight", impl.activeFactorWeights.service],
      ["Product ∪ service (max pillar)", impl.activeFactorWeights.productServiceCombined],
      ["Channel (max pillar)", impl.activeFactorWeights.channel],
      ["Transaction / behaviour weight", impl.activeFactorWeights.transaction],
      ["Calculator bands", `Low ≤ ${impl.bandBoundaries.calculator.lowMax} · Medium ≤ ${impl.bandBoundaries.calculator.mediumMax}`],
      ["CRAM sensitivity bands", `Low ≤ ${impl.bandBoundaries.cram.lowMax} · Medium ≤ ${impl.bandBoundaries.cram.mediumMax}`],
      ["Override rules loaded", `${OVERRIDE_REGISTRY.length} (OVR-001 … OVR-020)`],
      ["Entity legal types register", `${impl.entityLegalTypes.total} forms`],
    ],
    { fontSize: 7.5, subtitle: "Appendix A — Implementation", columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 110 } } },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("Scoring pipeline (Mal FinCrime OS)", margin, state.y);
  state.y += 5;
  bulletList(state, impl.scoringPipeline, "Appendix A — Implementation");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("Golden thread configuration", margin, state.y);
  state.y += 5;
  dataTable(
    state,
    ["Setting", "Value"],
    [
      ["Review months — Low", `${impl.goldenThreadConfig.reviewMonthsPolicy.Low} months`],
      ["Review months — Medium", `${impl.goldenThreadConfig.reviewMonthsPolicy.Medium} months`],
      ["Review months — High", `${impl.goldenThreadConfig.reviewMonthsPolicy.High} months`],
      ["Control weights (CDD/SOW/MON/SCR/EDD/OVS)", Object.values(impl.goldenThreadConfig.controlWeights).join(" / ")],
      ["Residual max reduction", `${impl.goldenThreadConfig.residual.maxReduction}%`],
      ["Residual one-band cap", String(impl.goldenThreadConfig.residual.oneBandCap)],
      ["Expected AED band 1 (single / monthly)", `${impl.goldenThreadConfig.expectedAedBands[1].single.toLocaleString()} AED`],
      ["Expected AED band 2 (single / monthly)", `${impl.goldenThreadConfig.expectedAedBands[2].single.toLocaleString()} AED`],
      ["Expected AED band 3 (single / monthly)", `${impl.goldenThreadConfig.expectedAedBands[3].single.toLocaleString()} AED`],
    ],
    { fontSize: 7.5, subtitle: "Appendix A — Implementation", columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: 100 } } },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("Implementation notes", margin, state.y);
  state.y += 5;
  bulletList(state, impl.implementationNotes, "Appendix A — Implementation");

  // Appendix B — Entity legal types
  state.y = newPage(state, "Appendix B — Entity Legal Types");
  sectionHeading(state, "Appendix B — Entity Legal Types Register");
  const legalRows: string[][] = [
    ["Score 1 — Low", impl.entityLegalTypes.score1Low.join("; ")],
    ["Score 2 — Medium", impl.entityLegalTypes.score2Medium.join("; ")],
    ["Score 3 — High", impl.entityLegalTypes.score3High.join("; ")],
    ["Score 4 — Prohibited", impl.entityLegalTypes.score4Prohibited.join("; ")],
  ];
  dataTable(state, ["Rating", "Legal forms"], legalRows, {
    fontSize: 6.8,
    subtitle: "Appendix B — Entity Legal Types",
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 134 } },
  });

  // Customer-type sub-weights
  state.y = ensureSpace(state, 40, "Appendix B — Entity Legal Types");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("Customer-type sub-weights (within 25% composite factor)", margin, state.y);
  state.y += 5;
  const ind = impl.customerTypeWeights.individual;
  const ent = impl.customerTypeWeights.entity;
  dataTable(
    state,
    ["Parameter", "Individual (NP)", "Entity (LP/MER)"],
    [
      ["Employment / signatory role", `${(ind.employment * 100).toFixed(1)}%`, `${(ent.employment * 100).toFixed(1)}%`],
      ["Profession", `${(ind.profession * 100).toFixed(1)}%`, `${(ent.profession * 100).toFixed(1)}%`],
      ["ISIC activity / nature of business", `${(ind.natureOfBusiness * 100).toFixed(1)}%`, `${(ent.natureOfBusiness * 100).toFixed(1)}%`],
      ["Entity type", "—", `${(ent.entityType * 100).toFixed(1)}%`],
      ["Segment", `${(ind.segment * 100).toFixed(1)}%`, `${(ent.segment * 100).toFixed(1)}%`],
      ["Expected activity", `${(ind.expectedActivity * 100).toFixed(1)}%`, `${(ent.expectedActivity * 100).toFixed(1)}%`],
      ["UBO transparency", `${(ind.ubo * 100).toFixed(1)}%`, `${(ent.ubo * 100).toFixed(1)}%`],
    ],
    { fontSize: 7.5, subtitle: "Appendix B — Entity Legal Types", columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 } } },
  );

  // Attestation
  state.y = ensureSpace(state, 30, "Governance Attestation");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  docSetInk(state);
  state.doc.text("Governance attestation", margin, state.y);
  state.y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  state.doc.text("Prepared by (Model Owner / Financial Crime Compliance): _________________________  Date: __________", margin, state.y);
  state.y += 7;
  state.doc.text("Reviewed by (MLRO / Model Validation): _________________________________  Date: __________", margin, state.y);
  state.y += 7;
  state.doc.text("Approved for production build (Governance Forum): ______________________  Date: __________", margin, state.y);

  drawFooter(state);
  return doc;
}

export async function exportCramMethodologyPdf(): Promise<void> {
  const doc = await buildCramMethodologyPdf();
  doc.save(`Mal-CRAM-Methodology-${METHODOLOGY_DOCUMENT.modelVersionId}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
