import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export interface RenderedPdfPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pageCount: number;
}

export async function renderPdfPage(
  data: string | Uint8Array,
  pageIndex: number,
  scale: number,
): Promise<RenderedPdfPage> {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError("De PDF-renderschaal moet groter zijn dan nul");
  }
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new RangeError("De PDF-pagina-index moet een positief geheel getal zijn");
  }

  const sourceBytes = typeof data === "string"
    ? await readLocalPdf(data)
    : data;
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const loadingTask = getDocument({ data: sourceBytes.slice() });
  const pdf = await loadingTask.promise;

  try {
    if (pageIndex >= pdf.numPages) {
      throw new RangeError(
        `PDF-pagina ${pageIndex + 1} valt buiten het document met ${pdf.numPages} pagina's`,
      );
    }

    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });
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
    };
  } finally {
    await pdf.destroy();
  }
}

async function readLocalPdf(path: string): Promise<Uint8Array> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  return readFile(path);
}
