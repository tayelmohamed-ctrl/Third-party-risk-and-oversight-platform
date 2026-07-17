/**
 * Shared presentation helpers for Global Account onboarding playbook PDFs.
 * Visual system + journey framing (entertaining-platform-design · Golden Fleece).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const BRAND = {
  header: [12, 18, 51] as [number, number, number],
  accent: [23, 138, 99] as [number, number, number],
  accentSoft: [230, 244, 238] as [number, number, number],
  ink: [26, 31, 54] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  panel: [246, 248, 251] as [number, number, number],
  gold: [180, 132, 52] as [number, number, number],
  goldSoft: [251, 243, 227] as [number, number, number],
  low: [31, 157, 107] as [number, number, number],
  med: [192, 122, 18] as [number, number, number],
  hi: [194, 58, 75] as [number, number, number],
  proh: [122, 45, 143] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export type PdfState = {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  y: number;
  margin: number;
  docId: string;
  subtitle: string;
};

export function createState(docId: string, subtitle: string): PdfState {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  return {
    doc,
    pageW: doc.internal.pageSize.getWidth(),
    pageH: doc.internal.pageSize.getHeight(),
    y: 0,
    margin: 14,
    docId,
    subtitle,
  };
}

export function header(state: PdfState) {
  const { doc, pageW, margin, docId, subtitle } = state;
  doc.setFillColor(...BRAND.header);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 28, pageW, 1.2, "F");
  doc.setFillColor(...BRAND.accent);
  doc.circle(margin + 5, 11, 5, "F");
  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Mal", margin + 13, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 230);
  doc.text("FinCrime OS · Global Account onboarding", margin + 13, 16);
  doc.text(subtitle, margin + 13, 21);
  doc.setFontSize(6.5);
  doc.text(docId, pageW - margin, 12, { align: "right" });
  doc.text("CONFIDENTIAL", pageW - margin, 17, { align: "right" });
}

export function footer(state: PdfState) {
  const { doc, pageW, pageH, margin, docId } = state;
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.line);
    doc.line(margin, pageH - 11, pageW - margin, pageH - 11);
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(`${docId} · Risk-based · Customer-clear`, margin, pageH - 6.5);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 6.5, { align: "right" });
  }
}

export function newPage(state: PdfState): number {
  state.doc.addPage();
  header(state);
  return 36;
}

export function ensure(state: PdfState, needed: number): number {
  if (state.y + needed > state.pageH - 16) state.y = newPage(state);
  return state.y;
}

export function heading(state: PdfState, title: string) {
  state.y = ensure(state, 14);
  state.doc.setTextColor(...BRAND.ink);
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(11.5);
  state.doc.text(title, state.margin, state.y);
  state.y += 2.5;
  state.doc.setDrawColor(...BRAND.accent);
  state.doc.setLineWidth(0.55);
  state.doc.line(state.margin, state.y, state.margin + 42, state.y);
  state.y += 6;
}

export function subheading(state: PdfState, title: string) {
  state.y = ensure(state, 10);
  state.doc.setTextColor(...BRAND.ink);
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(9.5);
  state.doc.text(title, state.margin, state.y);
  state.y += 5;
}

export function paragraph(
  state: PdfState,
  text: string,
  size = 8.2,
  color: [number, number, number] = BRAND.muted,
) {
  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(size);
  state.doc.setTextColor(...color);
  const lines = state.doc.splitTextToSize(text, state.pageW - state.margin * 2);
  state.y = ensure(state, lines.length * 3.8 + 3);
  state.doc.text(lines, state.margin, state.y);
  state.y += lines.length * 3.8 + 3.5;
}

export function callout(
  state: PdfState,
  label: string,
  text: string,
  fill: [number, number, number] = BRAND.accentSoft,
  labelColor: [number, number, number] = BRAND.accent,
) {
  const { doc, pageW, margin } = state;
  const body = doc.splitTextToSize(text, pageW - margin * 2 - 10);
  const h = body.length * 3.7 + 14;
  state.y = ensure(state, h + 2);
  doc.setFillColor(...fill);
  doc.roundedRect(margin, state.y, pageW - margin * 2, h, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...labelColor);
  doc.text(label.toUpperCase(), margin + 4, state.y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...BRAND.ink);
  doc.text(body, margin + 4, state.y + 11);
  state.y += h + 4;
}

export function bulletList(state: PdfState, items: string[]) {
  const { doc, pageW, margin } = state;
  items.forEach((item) => {
    const lines = doc.splitTextToSize(item, pageW - margin * 2 - 6);
    state.y = ensure(state, lines.length * 3.7 + 2);
    doc.setFillColor(...BRAND.accent);
    doc.circle(margin + 1.5, state.y - 1, 0.9, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.ink);
    doc.text(lines, margin + 5, state.y);
    state.y += lines.length * 3.7 + 2;
  });
  state.y += 1;
}

export function journeyStrip(
  state: PdfState,
  steps: { n: string; label: string; feel: string }[],
) {
  const { doc, pageW, margin } = state;
  const usable = pageW - margin * 2;
  const w = usable / steps.length;
  state.y = ensure(state, 28);
  steps.forEach((s, i) => {
    const x = margin + i * w;
    doc.setFillColor(...(i % 2 === 0 ? BRAND.panel : BRAND.accentSoft));
    doc.roundedRect(x + 0.8, state.y, w - 1.6, 24, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.accent);
    doc.text(s.n, x + 3, state.y + 6);
    doc.setTextColor(...BRAND.ink);
    doc.setFontSize(7);
    const lab = doc.splitTextToSize(s.label, w - 6);
    doc.text(lab, x + 3, state.y + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...BRAND.muted);
    const feel = doc.splitTextToSize(s.feel, w - 6);
    doc.text(feel, x + 3, state.y + 17.5);
  });
  state.y += 28;
}

export function table(
  state: PdfState,
  head: string[],
  body: string[][],
  colWidths?: number[],
) {
  const { doc, margin } = state;
  autoTable(doc, {
    startY: state.y,
    head: [head],
    body,
    styles: {
      fontSize: 6.8,
      cellPadding: 1.6,
      textColor: BRAND.ink,
      lineColor: BRAND.line,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: BRAND.header,
      textColor: BRAND.white,
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: BRAND.panel },
    margin: { left: margin, right: margin },
    columnStyles: colWidths
      ? Object.fromEntries(colWidths.map((w, i) => [i, { cellWidth: w }]))
      : undefined,
  });
  state.y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? state.y;
  state.y += 5;
}

export function drawCover(
  state: PdfState,
  opts: {
    eyebrow: string;
    title: string;
    title2: string;
    promise: string;
    beforeAfter: [string, string];
    meta: [string, string][];
    framing: string;
  },
) {
  const { doc, pageW, margin } = state;
  doc.setFillColor(...BRAND.header);
  doc.rect(0, 0, pageW, 92, "F");
  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 92, pageW, 2.2, "F");

  doc.setFillColor(...BRAND.accent);
  doc.circle(margin + 8, 28, 8, "F");
  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Mal", margin + 22, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 210, 230);
  doc.text("FinCrime OS · Global Account", margin + 22, 34);

  doc.setFontSize(7.5);
  doc.setTextColor(160, 190, 175);
  doc.text(opts.eyebrow.toUpperCase(), margin, 52);
  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(opts.title, margin, 62);
  doc.text(opts.title2, margin, 71);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(190, 205, 220);
  const promiseLines = doc.splitTextToSize(opts.promise, pageW - margin * 2);
  doc.text(promiseLines, margin, 80);

  state.y = 104;
  // Before → After transformation strip
  const half = (pageW - margin * 2 - 8) / 2;
  doc.setFillColor(...BRAND.goldSoft);
  doc.roundedRect(margin, state.y, half, 22, 2, 2, "F");
  doc.setFillColor(...BRAND.accentSoft);
  doc.roundedRect(margin + half + 8, state.y, half, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.gold);
  doc.text("BEFORE", margin + 4, state.y + 6);
  doc.setTextColor(...BRAND.accent);
  doc.text("AFTER", margin + half + 12, state.y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.ink);
  doc.text(doc.splitTextToSize(opts.beforeAfter[0], half - 8), margin + 4, state.y + 12);
  doc.text(doc.splitTextToSize(opts.beforeAfter[1], half - 8), margin + half + 12, state.y + 12);
  state.y += 28;

  opts.meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.ink);
    doc.text(k, margin, state.y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    const lines = doc.splitTextToSize(v, pageW - margin - 48);
    doc.text(lines, margin + 42, state.y);
    state.y += Math.max(5.5, lines.length * 4);
  });

  state.y += 3;
  callout(state, "Theme · the promise", opts.framing, BRAND.panel, BRAND.header);
}
