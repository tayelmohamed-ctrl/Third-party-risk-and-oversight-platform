import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { KybChecklistItem, KybChecklistPackage } from "./kybChecklistBuilder";
import { kybProductSummary } from "./kybChecklistBuilder";
import { KYB_PRODUCT_LABELS, type KybProduct } from "../config/kybDocumentMatrix";

const BRAND = {
  header: [12, 18, 51] as [number, number, number],
  accent: [169, 83, 223] as [number, number, number],
  accent2: [57, 185, 237] as [number, number, number],
  ink: [26, 31, 54] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  warn: [217, 119, 6] as [number, number, number],
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

async function loadLogoDataUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, 100, 100);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("logo load failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(malLogoSvg())}`;
  });
}

function levelLabel(item: KybChecklistItem): string {
  return item.effectiveLevel === "mandatory" ? "Mandatory" : "Conditional";
}

function productCols(products: KybProduct[]): string {
  return products.map((p) => KYB_PRODUCT_LABELS[p]).join(", ");
}

function drawHeader(doc: jsPDF, pkg: KybChecklistPackage, logoDataUrl: string, pageW: number) {
  doc.setFillColor(...BRAND.header);
  doc.rect(0, 0, pageW, 42, "F");

  doc.addImage(logoDataUrl, "PNG", 14, 8, 18, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Mal", 36, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("FinCrime OS", 36, 22);

  doc.setFontSize(8);
  doc.setTextColor(200, 210, 230);
  doc.text(pkg.guidelines.documentTitle.toUpperCase(), 36, 30);
  doc.text(pkg.guidelines.confidentiality, 36, 35);

  doc.setFontSize(7);
  doc.text(`${pkg.caseRef} · ${pkg.customerId}`, pageW - 14, 14, { align: "right" });
  doc.text(new Date(pkg.generatedAt).toLocaleString(), pageW - 14, 19, { align: "right" });
  doc.text(pkg.guidelines.preparedBy, pageW - 14, 24, { align: "right" });
}

function drawCoverBlock(doc: jsPDF, pkg: KybChecklistPackage, y: number): number {
  doc.setTextColor(...BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(pkg.customerName, 14, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  const lines = [
    `Entity: ${pkg.entityType}`,
    `Segment: ${pkg.segment}`,
    `Products: ${kybProductSummary(pkg.products)}`,
    `CRAM rating: ${pkg.cramRating} · Inherent ${pkg.inherentScore.toFixed(1)} → Residual ${pkg.residualScore.toFixed(1)}`,
    `Due diligence: ${pkg.ddLevel} · Review every ${pkg.reviewMonths} months`,
  ];
  lines.forEach((line) => {
    doc.text(line, 14, y);
    y += 5;
  });

  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(0.8);
  doc.line(14, y + 2, 80, y + 2);
  return y + 10;
}

function tableForItems(
  doc: jsPDF,
  title: string,
  items: KybChecklistItem[],
  startY: number,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.ink);
  doc.text(title, 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [["Document / evidence", "Level", "Products", "CRAM / MLRO note", "Policy", "Status"]],
    body: items.map((item) => [
      item.document,
      levelLabel(item),
      productCols(item.products),
      item.cramNote,
      item.policyRef,
      item.status === "pending" ? "Pending" : item.status,
    ]),
    styles: { fontSize: 7, cellPadding: 2.5, textColor: BRAND.ink, lineColor: BRAND.line },
    headStyles: { fillColor: BRAND.header, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 18 },
      2: { cellWidth: 28 },
      3: { cellWidth: 42 },
      4: { cellWidth: 22 },
      5: { cellWidth: 16 },
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    margin: { left: 14, right: 14 },
  });

  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
}

function drawFooter(doc: jsPDF, pkg: KybChecklistPackage, pageW: number, pageH: number) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.line);
    doc.line(14, pageH - 16, pageW - 14, pageH - 16);
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(pkg.guidelines.footerNotice, 14, pageH - 11, { maxWidth: pageW - 50 });
    doc.text(`Model ${pkg.guidelines.modelVersion} · Page ${i} of ${pages}`, pageW - 14, pageH - 8, { align: "right" });
  }
}

export async function exportKybChecklistPdf(pkg: KybChecklistPackage): Promise<void> {
  if (pkg.prohibited) {
    throw new Error(pkg.prohibitedReason ?? "Cannot export checklist for prohibited entity");
  }

  const logo = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  drawHeader(doc, pkg, logo, pageW);
  let y = drawCoverBlock(doc, pkg, 50);

  if (pkg.escalations.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.warn);
    doc.text("CRAM-driven escalations", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.ink);
    pkg.escalations.forEach((e) => {
      doc.text(`• ${e}`, 16, y, { maxWidth: pageW - 32 });
      y += 5;
    });
    y += 4;
  }

  y = tableForItems(doc, "Core KYB document matrix", pkg.coreItems, y + 2);

  if (pkg.entityItems.length) {
    if (y > pageH - 40) {
      doc.addPage();
      drawHeader(doc, pkg, logo, pageW);
      y = 50;
    }
    y = tableForItems(doc, "Entity-type conditional documents", pkg.entityItems, y + 8);
  }

  doc.addPage();
  drawHeader(doc, pkg, logo, pageW);
  y = 52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.ink);
  doc.text("Regulatory & policy basis", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  pkg.guidelines.policyBasis.forEach((line) => {
    doc.text(`• ${line}`, 16, y, { maxWidth: pageW - 32 });
    y += 5;
  });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("MLRO / compliance sign-off", 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.text("Prepared by (Sayed / analyst): _____________________________  Date: ______________", 14, y);
  y += 8;
  doc.text("Reviewed by (MLRO / Compliance): __________________________  Date: ______________", 14, y);
  y += 8;
  doc.text("Approved for onboarding / product activation:  □ Yes   □ No   □ Pending documents", 14, y);

  drawFooter(doc, pkg, pageW, pageH);

  const safeName = pkg.customerName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  doc.save(`Mal-KYB-Checklist-${safeName}-${pkg.caseRef.replace(/[^\w-]/g, "")}.pdf`);
}

export function exportKybChecklistJson(pkg: KybChecklistPackage): void {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Mal-KYB-Checklist-${pkg.customerId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
