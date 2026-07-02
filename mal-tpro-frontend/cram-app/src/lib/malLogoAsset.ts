/** Mal logomark PNG buffer for PDF/Excel exports (SVG → canvas). */

const MAL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100">
  <defs><linearGradient id="malg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#A953DF"/><stop offset="1" stop-color="#39B9ED"/>
  </linearGradient></defs>
  ${Array.from({ length: 10 }, (_, k) => {
    const deg = k * 36;
    return `<g transform="rotate(${deg} 50 50)"><rect x="45.5" y="5" width="9" height="24" rx="4.5" fill="url(#malg)"/></g>`;
  }).join("")}
</svg>`;

let cached: ArrayBuffer | null = null;

/** Read bundled PNG from public/ (Node) or render via canvas (browser). */
export async function getMalLogoPngBuffer(size = 128): Promise<ArrayBuffer> {
  if (cached) return cached.slice(0);

  if (typeof document === "undefined") {
    try {
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");
      const here = dirname(fileURLToPath(import.meta.url));
      const buf = readFileSync(join(here, "../../public/mal-logo.png"));
      cached = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return cached.slice(0);
    } catch {
      const fallback = Uint8Array.from(atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      ), (c) => c.charCodeAt(0));
      cached = fallback.buffer;
      return cached.slice(0);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("logo blob failed"));
          return;
        }
        blob.arrayBuffer().then((buf) => {
          cached = buf;
          resolve(buf.slice(0));
        }).catch(reject);
      }, "image/png");
    };
    img.onerror = () => reject(new Error("logo load failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(MAL_LOGO_SVG)}`;
  });
}
