import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfMocks = vi.hoisted(() => ({
  destroy: vi.fn(async () => undefined),
  loadingDestroy: vi.fn(async () => undefined),
  getDocument: vi.fn(),
  getPage: vi.fn(),
  getViewport: vi.fn(),
  render: vi.fn(),
  workerOptions: { workerSrc: "" },
}));

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: pdfMocks.workerOptions,
  getDocument: pdfMocks.getDocument,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: fsMocks.readFile,
}));

import { renderPdfPage } from "./pdfPage";

describe("renderPdfPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdfMocks.workerOptions.workerSrc = "";
    pdfMocks.getViewport.mockReturnValue({ width: 612, height: 792 });
    pdfMocks.render.mockReturnValue({ promise: Promise.resolve() });
    pdfMocks.getPage.mockResolvedValue({
      getViewport: pdfMocks.getViewport,
      render: pdfMocks.render,
    });
    pdfMocks.getDocument.mockReturnValue({
      destroy: pdfMocks.loadingDestroy,
      promise: Promise.resolve({
        numPages: 4,
        getPage: pdfMocks.getPage,
        destroy: pdfMocks.destroy,
      }),
    });
  });

  it("rendert uitsluitend de geselecteerde nulgebaseerde pagina", async () => {
    const context = {};
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    };
    vi.stubGlobal("document", {
      createElement: vi.fn(() => canvas),
    });

    const source = new Uint8Array([37, 80, 68, 70]);
    const result = await renderPdfPage(source, 2, 1.5);

    expect(pdfMocks.getDocument).toHaveBeenCalledWith({
      data: expect.any(Uint8Array),
    });
    expect(pdfMocks.getPage).toHaveBeenCalledOnce();
    expect(pdfMocks.getPage).toHaveBeenCalledWith(3);
    expect(pdfMocks.getViewport).toHaveBeenCalledWith({ scale: 1.5 });
    expect(pdfMocks.render).toHaveBeenCalledWith({
      canvas,
      canvasContext: context,
      viewport: { width: 612, height: 792 },
    });
    expect(result).toEqual({
      canvas,
      width: 612,
      height: 792,
      pageCount: 4,
    });
    expect(pdfMocks.destroy).toHaveBeenCalledOnce();
  });

  it("leest een lokaal PDF-pad via de bestaande Tauri fs-plugin", async () => {
    fsMocks.readFile.mockResolvedValue(new Uint8Array([1, 2, 3]));
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: () => ({}),
      })),
    });

    await renderPdfPage("C:\\onderzoek\\sondering.pdf", 0, 1);

    expect(fsMocks.readFile).toHaveBeenCalledWith(
      "C:\\onderzoek\\sondering.pdf",
    );
    expect(pdfMocks.getPage).toHaveBeenCalledWith(1);
  });

  it("weigert een pagina buiten het documentbereik", async () => {
    await expect(renderPdfPage(new Uint8Array([1]), 4, 1))
      .rejects.toThrow(/pagina 5.*4 pagina/i);
    expect(pdfMocks.getPage).not.toHaveBeenCalled();
    expect(pdfMocks.destroy).toHaveBeenCalledOnce();
  });

  it("weigert een ongeldige renderschaal voordat het document wordt geladen", async () => {
    await expect(renderPdfPage(new Uint8Array([1]), 0, 0))
      .rejects.toThrow(/renderschaal/i);
    expect(pdfMocks.getDocument).not.toHaveBeenCalled();
  });

  it("weigert renderschalen boven de veilige bovengrens", async () => {
    await expect(renderPdfPage(new Uint8Array([1]), 0, 4.01))
      .rejects.toThrow(/0,5.*4/i);
    expect(pdfMocks.getDocument).not.toHaveBeenCalled();
  });

  it("vernietigt de loading task wanneer het PDF-document niet geladen kan worden", async () => {
    let rejectLoading!: (error: Error) => void;
    const loadingPromise = new Promise<never>((_resolve, reject) => {
      rejectLoading = reject;
    });
    pdfMocks.getDocument.mockReturnValue({
      destroy: pdfMocks.loadingDestroy,
      promise: loadingPromise,
    });

    const rendering = renderPdfPage(new Uint8Array([1]), 0, 1);
    await vi.waitFor(() => expect(pdfMocks.getDocument).toHaveBeenCalledOnce());
    rejectLoading(new Error("Beschadigd document"));

    await expect(rendering)
      .rejects.toThrow("Beschadigd document");

    expect(pdfMocks.loadingDestroy).toHaveBeenCalledOnce();
    expect(pdfMocks.destroy).not.toHaveBeenCalled();
  });
});
