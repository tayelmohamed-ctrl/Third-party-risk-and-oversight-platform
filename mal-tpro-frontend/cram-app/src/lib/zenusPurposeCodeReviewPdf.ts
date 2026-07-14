import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ZENUS_REVIEW_META,
  ZENUS_PURPOSE_CODES,
  ZENUS_CHANGE_LOG,
  ZENUS_HANDOVER_NOTES,
  zenusRiskCounts,
  type ZenusPurposeCode,
} from "../config/zenusPurposeCodeReview";

const BRAND = {
  header: [12, 18, 51] as [number, number, number],
  accent: [23, 138, 99] as [number, number, number],
  ink: [26, 31, 54] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  panel: [244, 248, 245] as [number, number, number],
  low: [31, 157, 107] as [number, number, number],
  med: [192, 122, 18] as [number, number, number],
  hi: [194, 58, 75] as [number, number, number],
  proh: [122, 45, 143] as [number, number, number],
};

type State = { doc: jsPDF; pageW: number; pageH: number; y: number; margin: number };

function header(state: State) {
  const { doc, pageW, margin } = state;
  doc.setFillColor(...BRAND.header);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setFillColor(...BRAND.accent);
  doc.circle(margin + 6, 12, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Mal FinCrime OS", margin + 16, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 230);
  doc.text("Global Account · Zenus purpose-code review", margin + 16, 17);
  doc.text(ZENUS_REVIEW_META.documentId, pageW - margin, 11, { align: "right" });
}

function footer(state: State) {
  const { doc, pageW, pageH, margin } = state;
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.line);
    doc.line(margin, pageH - 11, pageW - margin, pageH - 11);
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(ZENUS_REVIEW_META.confidentiality, margin, pageH - 6.5);
    doc.text(`v${ZENUS_REVIEW_META.version} · Page ${i} of ${pages}`, pageW - margin, pageH - 6.5, { align: "right" });
  }
}

function newPage(state: State): number {
  state.doc.addPage();
  header(state);
  return 38;
}

function ensure(state: State, needed: number): number {
  if (state.y + needed > state.pageH - 16) state.y = newPage(state);
  return state.y;
}

function heading(state: State, title: string) {
  state.y = ensure(state, 16);
  state.doc.setTextColor(...BRAND.ink);
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(12);
  state.doc.text(title, state.margin, state.y);
  state.y += 3;
  state.doc.setDrawColor(...BRAND.accent);
  state.doc.setLineWidth(0.6);
  state.doc.line(state.margin, state.y, state.margin + 50, state.y);
  state.y += 6;
}

function paragraph(state: State, text: string, size = 8.5, color = BRAND.muted) {
  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(size);
  state.doc.setTextColor(...color);
  const lines = state.doc.splitTextToSize(text, state.pageW - state.margin * 2);
  state.y = ensure(state, lines.length * 4 + 3);
  state.doc.text(lines, state.margin, state.y);
  state.y += lines.length * 4 + 4;
}

function flowStr(c: ZenusPurposeCode): string {
  const parts: string[] = [];
  if (c.flows.c2c) parts.push("C2C");
  if (c.flows.c2b) parts.push("C2B");
  if (c.flows.b2c) parts.push("B2C");
  if (c.flows.b2b) parts.push("B2B");
  if (c.flows.mal2mal) parts.push("Mal2Mal");
  return parts.length ? parts.join(", ") : "—";
}

function riskFill(risk: string): [number, number, number] | undefined {
  if (risk === "Low") return [230, 244, 238];
  if (risk === "Medium") return [251, 240, 220];
  if (risk === "High") return [251, 231, 234];
  if (risk === "Prohibited") return [242, 231, 245];
  return undefined;
}
function riskText(risk: string): [number, number, number] {
  if (risk === "Low") return BRAND.low;
  if (risk === "Medium") return BRAND.med;
  if (risk === "High") return BRAND.hi;
  if (risk === "Prohibited") return BRAND.proh;
  return BRAND.muted;
}

function drawCover(state: State) {
  const { doc, pageW, margin } = state;
  doc.setFillColor(...BRAND.header);
  doc.rect(0, 0, pageW, 88, "F");
  doc.setFillColor(...BRAND.accent);
  doc.circle(margin + 9, 34, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Mal", margin + 24, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("FinCrime OS · MLRO review", margin + 24, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Global Account — Zenus", margin, 62);
  doc.text("Purpose Code Register", margin, 72);

  state.y = 104;
  doc.setTextColor(...BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(ZENUS_REVIEW_META.title, margin, state.y);
  state.y += 8;

  const c = ZENUS_REVIEW_META.counts;
  const meta: [string, string][] = [
    ["Document ID", ZENUS_REVIEW_META.documentId],
    ["Perimeter", ZENUS_REVIEW_META.perimeter],
    ["Source", ZENUS_REVIEW_META.source],
    ["Outcome", `${c.unchanged} unchanged · ${c.modified} modified · ${c.retired} retired · ${c.added} added (${c.activeTotal} active)`],
    ["Regulatory basis", ZENUS_REVIEW_META.basis],
    ["Owner", "Financial Crime Compliance / MLRO"],
    ["Generated", new Date().toLocaleString()],
  ];
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.ink);
    doc.setFontSize(8.5);
    doc.text(k, margin, state.y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    const lines = doc.splitTextToSize(v, pageW - margin - 48);
    doc.text(lines, margin + 44, state.y);
    state.y += Math.max(6.5, lines.length * 4.5);
  });

  state.y += 3;
  doc.setFillColor(...BRAND.panel);
  const boxLines = doc.splitTextToSize(ZENUS_REVIEW_META.framing, pageW - margin * 2 - 8);
  const boxH = boxLines.length * 4 + 12;
  doc.roundedRect(margin, state.y, pageW - margin * 2, boxH, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.ink);
  doc.text("Regulatory framing", margin + 4, state.y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.muted);
  doc.text(boxLines, margin + 4, state.y + 11);
}

export async function buildZenusPurposeCodeReviewPdf(): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const state: State = {
    doc,
    pageW: doc.internal.pageSize.getWidth(),
    pageH: doc.internal.pageSize.getHeight(),
    y: 0,
    margin: 14,
  };

  drawCover(state);

  // Register
  state.y = newPage(state);
  heading(state, "1. Corrected register");
  paragraph(
    state,
    "Every code with corrected flow directions, Convera/WUBS category, type (GA/SME), risk tier and EDD/monitoring trigger. Risk tier binds to EDD + Oscilar TM scenarios via CRAM. Correspondent category is a recommendation — validate the exact string against Convera's current POP list per destination country.",
  );
  const rc = zenusRiskCounts();
  paragraph(state, `Risk mix (active): ${rc.Low} Low · ${rc.Medium} Medium · ${rc.High} High · ${rc.Prohibited} Prohibited.`, 8, BRAND.ink);

  autoTable(doc, {
    startY: state.y,
    head: [["ID", "Purpose", "Convera category", "Type", "Flows", "Risk", "EDD / monitoring trigger"]],
    body: ZENUS_PURPOSE_CODES.map((c) => [
      c.retired ? `${c.id} (retired)` : c.added ? `${c.id} (new)` : c.changed ? `${c.id} *` : String(c.id),
      c.note ? `${c.name}\n${c.note}` : c.name,
      c.categoryWas ? `${c.category}\n(was ${c.categoryWas})` : c.category,
      c.type,
      flowStr(c),
      c.risk,
      c.trigger,
    ]),
    styles: { fontSize: 6.6, cellPadding: 1.6, textColor: BRAND.ink, lineColor: BRAND.line, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: BRAND.header, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: BRAND.panel },
    margin: { left: state.margin, right: state.margin },
    columnStyles: {
      0: { cellWidth: 13 }, 1: { cellWidth: 40 }, 2: { cellWidth: 28 },
      3: { cellWidth: 11 }, 4: { cellWidth: 30 }, 5: { cellWidth: 16 }, 6: { cellWidth: 44 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const risk = String(data.cell.raw ?? "");
        const fill = riskFill(risk);
        if (fill) data.cell.styles.fillColor = fill;
        data.cell.styles.textColor = riskText(risk);
        data.cell.styles.fontStyle = "bold";
      }
      if (data.section === "body" && data.column.index === 0 && String(data.cell.raw ?? "").includes("retired")) {
        data.cell.styles.textColor = BRAND.muted;
      }
    },
  });
  state.y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? state.y;
  state.y += 4;
  paragraph(state, "* = changed from the Zenus original. GA = all customers · SME = business-tier onboarding.", 7);

  // Change log
  state.y = newPage(state);
  heading(state, "2. Change log");
  autoTable(doc, {
    startY: state.y,
    head: [["#", "Change", "Detail", "Basis"]],
    body: ZENUS_CHANGE_LOG.map((c, i) => [String(i + 1), c.title, c.detail, c.tag]),
    styles: { fontSize: 7, cellPadding: 1.8, textColor: BRAND.ink, lineColor: BRAND.line, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: BRAND.header, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: BRAND.panel },
    margin: { left: state.margin, right: state.margin },
    columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 48 }, 2: { cellWidth: 90 }, 3: { cellWidth: 36 } },
  });
  state.y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? state.y;
  state.y += 8;

  // Handover
  heading(state, "3. Before you hand this back to Zenus");
  ZENUS_HANDOVER_NOTES.forEach((n) => {
    state.y = ensure(state, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.ink);
    const t = doc.splitTextToSize(`• ${n.title}`, state.pageW - state.margin * 2);
    doc.text(t, state.margin, state.y);
    state.y += t.length * 4.2 + 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    const d = doc.splitTextToSize(n.detail, state.pageW - state.margin * 2 - 4);
    state.y = ensure(state, d.length * 4 + 3);
    doc.text(d, state.margin + 4, state.y);
    state.y += d.length * 4 + 4;
  });

  // Sign-off
  state.y = ensure(state, 44);
  heading(state, "4. MLRO / Product sign-off");
  paragraph(state, "I confirm this reviewed Global Account (Zenus) purpose-code register has been reviewed against the US framework and is fit to reconcile with MAL-TM-PPC-CATALOG-v1.0 and route through model governance.", 8.5, BRAND.ink);
  state.y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.ink);
  doc.text("MLRO / Compliance: __________________________  Date: ______________", state.margin, state.y);
  state.y += 10;
  doc.text("Product owner: _____________________________  Date: ______________", state.margin, state.y);
  state.y += 10;
  doc.text("Approved for Zenus handover:  [ ] Yes   [ ] No   [ ] Conditional", state.margin, state.y);

  footer(state);
  return doc;
}

export async function exportZenusPurposeCodeReviewPdf(): Promise<void> {
  const doc = await buildZenusPurposeCodeReviewPdf();
  doc.save(`Mal-GlobalAccount-Zenus-Purpose-Codes-Reviewed-v${ZENUS_REVIEW_META.version}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
