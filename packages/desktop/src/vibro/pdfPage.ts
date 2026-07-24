import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { sha256Hex } from "./referenceCase";

export const MIN_PDF_RENDER_SCALE = 0.5;
export const MAX_PDF_RENDER_SCALE = 4;

export interface RenderedPdfPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pageCount: number;
  sourceSha256?: string;
  pageText?: string;
  sourceWidth?: number;
  sourceHeight?: number;
}

export async function renderPdfPage(
  data: string | Uint8Array,
  pageIndex: number,
  scale: number,
): Promise<RenderedPdfPage> {
  const scaleError = getPdfRenderScaleError(scale);
  if (scaleError !== null) {
    throw new RangeError(scaleError);
  }
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new RangeError("De PDF-pagina-index moet een positief geheel getal zijn");
  }

  const sourceBytes = typeof data === "string"
    ? await readLocalPdf(data)
    : data;
  const sourceSha256 = await sha256Hex(sourceBytes);
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const loadingTask = getDocument({ data: sourceBytes.slice() });
  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (error) {
    await loadingTask.destroy();
    throw error;
  }

  try {
    if (pageIndex >= pdf.numPages) {
      throw new RangeError(
        `PDF-pagina ${pageIndex + 1} valt buiten het document met ${pdf.numPages} pagina's`,
      );
    }

    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) =>
        "str" in item && typeof item.str === "string" ? item.str : "")
      .filter((text) => text !== "")
      .join(" ");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (context === null) {
      throw new Error("De PDF-pagina kan niet naar een canvas worden gerenderd");
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    return {
      canvas,
      width: canvas.width,
      height: canvas.height,
      pageCount: pdf.numPages,
      sourceSha256,
      pageText,
      sourceWidth: viewport.width / scale,
      sourceHeight: viewport.height / scale,
    };
  } finally {
    await pdf.destroy();
  }
}

export function getPdfRenderScaleError(scale: number): string | null {
  return Number.isFinite(scale)
    && scale >= MIN_PDF_RENDER_SCALE
    && scale <= MAX_PDF_RENDER_SCALE
    ? null
    : "De PDF-renderschaal moet tussen 0,5 en 4 liggen";
}

async function readLocalPdf(path: string): Promise<Uint8Array> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  return readFile(path);
}
