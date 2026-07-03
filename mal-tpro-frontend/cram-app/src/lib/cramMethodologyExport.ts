/** Official CRAM methodology document — served from Vite public/. */
export const CRAM_METHODOLOGY_DOCX_URL = "/Mal_Customer_Risk_Assessment_Methodology_v1_0.docx";
export const CRAM_METHODOLOGY_DOCX_FILENAME = "Mal_Customer_Risk_Assessment_Methodology_v1_0.docx";

export async function exportCramMethodologyDocument(): Promise<void> {
  const res = await fetch(CRAM_METHODOLOGY_DOCX_URL);
  if (!res.ok) {
    throw new Error(`Methodology document not found (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = CRAM_METHODOLOGY_DOCX_FILENAME;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
