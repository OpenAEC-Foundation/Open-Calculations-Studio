// @vitest-environment jsdom

import { useState } from "react";
import { evaluate, parse } from "@ifc-calc/core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { RenderedPdfPage } from "../../vibro/pdfPage";
import { useVibroDesignerStore } from "../../store/vibroDesignerStore";
import { useDocumentStore } from "../../store/documentStore";

const pdfMocks = vi.hoisted(() => ({
  renderPdfPage: vi.fn(),
}));

vi.mock("../../vibro/pdfPage", () => ({
  MAX_PDF_RENDER_SCALE: 4,
  MIN_PDF_RENDER_SCALE: 0.5,
  getPdfRenderScaleError: (scale: number) =>
    Number.isFinite(scale) && scale >= 0.5 && scale <= 4
      ? null
      : "De PDF-renderschaal moet tussen 0,5 en 4 liggen",
  renderPdfPage: pdfMocks.renderPdfPage,
}));

import VibroPileDesigner from "./VibroPileDesigner";

function createCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}

function renderedPage(
  width: number,
  pageCount = 3,
): RenderedPdfPage {
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = 800;
  return {
    canvas,
    width,
    height: 800,
    pageCount,
  };
}

function seedWorkflow(stage: "calibrating" | "review" | "ready" = "calibrating") {
  const digitization = stage === "calibrating"
    ? null
    : {
      coverage: 0.98,
      warnings: [],
      uncertainDepthRanges: [],
      points: Array.from({ length: 41 }, (_, index) => ({
        depthNapM: 1 - index * 0.05,
        qcMpa: 8,
        confidence: 0.9,
      })),
    };
  useVibroDesignerStore.getState().updateWorkflow({
    stage,
    pdfSource: new Uint8Array([1, 2, 3]),
    pdfName: "sondering.pdf",
    pageIndex: 0,
    renderScale: 2,
    renderScaleError: "",
    renderedPage: renderedPage(600),
    calibration: {
      pageIndex: 0,
      plotBoundsPx: { left: 60, top: 80, right: 400, bottom: 700 },
      qcMinMpa: 0,
      qcMaxMpa: 20,
      depthTopNapM: 1,
      depthBottomNapM: -1,
    },
    relevantRange: { topNapM: 1, bottomNapM: -1 },
    digitization,
    acceptedPoints: stage === "ready" && digitization !== null
      ? [{ ...digitization.points[0] }]
      : [],
    errorMessage: "",
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  useDocumentStore.setState({
    documentRevision: 0,
    source: "# VIBRO-paaldraagvermogen",
    selectValues: {},
    filePath: null,
    dirty: false,
  });
  useVibroDesignerStore.getState().bindDocument(0);
  useVibroDesignerStore.getState().resetWorkflow();
  pdfMocks.renderPdfPage.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("VibroPileDesigner workflow", () => {
  it("houdt alleen het resultaat van de nieuwste paginarender actief", async () => {
    seedWorkflow();
    const first = deferred<RenderedPdfPage>();
    const second = deferred<RenderedPdfPage>();
    pdfMocks.renderPdfPage
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    render(<VibroPileDesigner documentRevision={0} />);

    fireEvent.change(screen.getByLabelText("PDF-pagina"), {
      target: { value: "1" },
    });
    act(() => {
      seedWorkflow();
    });
    fireEvent.change(screen.getByLabelText("PDF-pagina"), {
      target: { value: "2" },
    });

    expect(screen.getByLabelText("PDF-laadstatus").textContent).toContain(
      "PDF-pagina wordt opnieuw geladen.",
    );

    await act(async () => {
      second.resolve(renderedPage(902));
      await second.promise;
    });
    await act(async () => {
      first.resolve(renderedPage(701));
      await first.promise;
    });

    const state = useVibroDesignerStore.getState();
    expect(state.pageIndex).toBe(2);
    expect(state.calibration?.pageIndex).toBe(2);
    expect(state.renderedPage?.width).toBe(902);
    expect(state.stage).toBe("calibrating");
  });

  it("behoudt geaccepteerde kalibratiestate wanneer de designer van paneel wisselt", () => {
    seedWorkflow("ready");

    function SplitModeHarness() {
      const [right, setRight] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setRight((value) => !value)}>
            Wissel paneel
          </button>
          {right
            ? <div data-testid="right-pane"><VibroPileDesigner documentRevision={0} /></div>
            : <div data-testid="left-pane"><VibroPileDesigner documentRevision={0} /></div>}
        </>
      );
    }

    render(<SplitModeHarness />);
    expect(screen.getByText(/Kalibratie geaccepteerd · 1 meetpunten/))
      .toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Wissel paneel" }));

    expect(screen.getByTestId("right-pane")).toBeTruthy();
    expect(screen.getByText(/Kalibratie geaccepteerd · 1 meetpunten/))
      .toBeTruthy();
    expect(useVibroDesignerStore.getState().acceptedPoints).toHaveLength(1);
  });

  it("weigert een renderschaal buiten 0,5 tot 4 zonder state of canvas te wijzigen", () => {
    seedWorkflow();
    render(<VibroPileDesigner documentRevision={0} />);

    const scaleInput = screen.getByLabelText("Renderschaal");
    fireEvent.change(scaleInput, { target: { value: "40" } });
    fireEvent.blur(scaleInput);

    expect(screen.getByText("De PDF-renderschaal moet tussen 0,5 en 4 liggen"))
      .toBeTruthy();
    expect(scaleInput.getAttribute("aria-invalid")).toBe("true");
    expect(useVibroDesignerStore.getState().renderScale).toBe(2);
    expect(useVibroDesignerStore.getState().renderedPage?.width).toBe(600);
    expect(pdfMocks.renderPdfPage).not.toHaveBeenCalled();
  });

  it("doorloopt loading, calibrating, review en ready met aangekondigde reload", async () => {
    seedWorkflow();
    const nextPage = deferred<RenderedPdfPage>();
    pdfMocks.renderPdfPage.mockReturnValueOnce(nextPage.promise);
    render(<VibroPileDesigner documentRevision={0} />);

    fireEvent.change(screen.getByLabelText("PDF-pagina"), {
      target: { value: "1" },
    });
    expect(useVibroDesignerStore.getState().stage).toBe("loading");
    expect(screen.getByLabelText("PDF-laadstatus").textContent).toContain(
      "PDF-pagina wordt opnieuw geladen.",
    );

    await act(async () => {
      nextPage.resolve(renderedPage(720));
      await nextPage.promise;
    });
    expect(useVibroDesignerStore.getState().stage).toBe("calibrating");

    act(() => {
      seedWorkflow("review");
    });
    expect(useVibroDesignerStore.getState().stage).toBe("review");
    const acceptButton = screen.getByRole("button", {
      name: "Kalibratie accepteren",
    });
    expect((acceptButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(acceptButton);

    expect(useVibroDesignerStore.getState().stage).toBe("ready");
    expect(screen.getByText(/Kalibratie geaccepteerd · 41 meetpunten/))
      .toBeTruthy();
  });

  it("toont de errorfase wanneer de nieuwste paginarender faalt", async () => {
    seedWorkflow();
    pdfMocks.renderPdfPage.mockRejectedValueOnce(new Error("PDF is beschadigd"));
    render(<VibroPileDesigner documentRevision={0} />);

    fireEvent.change(screen.getByLabelText("PDF-pagina"), {
      target: { value: "1" },
    });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "PDF is beschadigd",
    );
    expect(useVibroDesignerStore.getState().stage).toBe("error");
  });

  it("wist de workflow en negeert een lopende render bij een documentwissel", async () => {
    seedWorkflow("ready");
    const pendingPage = deferred<RenderedPdfPage>();
    pdfMocks.renderPdfPage.mockReturnValueOnce(pendingPage.promise);
    const view = render(<VibroPileDesigner documentRevision={0} />);

    fireEvent.change(screen.getByLabelText("PDF-pagina"), {
      target: { value: "1" },
    });
    const requestIdBeforeSwitch =
      useVibroDesignerStore.getState().renderRequestId;

    view.rerender(<VibroPileDesigner documentRevision={1} />);

    const switchedState = useVibroDesignerStore.getState();
    expect(switchedState.documentRevision).toBe(1);
    expect(switchedState.renderRequestId).toBeGreaterThan(requestIdBeforeSwitch);
    expect(switchedState.stage).toBe("empty");
    expect(switchedState.pdfSource).toBeNull();
    expect(switchedState.calibration).toBeNull();
    expect(switchedState.digitization).toBeNull();
    expect(switchedState.acceptedPoints).toEqual([]);

    await act(async () => {
      pendingPage.resolve(renderedPage(999));
      await pendingPage.promise;
    });

    expect(useVibroDesignerStore.getState().stage).toBe("empty");
    expect(useVibroDesignerStore.getState().renderedPage).toBeNull();
  });

  it("invalideert oude meetdata direct en houdt acceptatie geblokkeerd na een laadfout", async () => {
    seedWorkflow("ready");
    const failedPage = deferred<RenderedPdfPage>();
    pdfMocks.renderPdfPage.mockReturnValueOnce(failedPage.promise);
    render(<VibroPileDesigner documentRevision={0} />);

    fireEvent.change(screen.getByLabelText("PDF-pagina"), {
      target: { value: "1" },
    });

    const loadingState = useVibroDesignerStore.getState();
    expect(loadingState.stage).toBe("loading");
    expect(loadingState.renderedPage).toBeNull();
    expect(loadingState.calibration).toBeNull();
    expect(loadingState.digitization).toBeNull();
    expect(loadingState.acceptedPoints).toEqual([]);

    await act(async () => {
      failedPage.reject(new Error("PDF is beschadigd"));
      try {
        await failedPage.promise;
      } catch {
        // De component verwerkt deze fout naar de errorfase.
      }
    });

    const errorState = useVibroDesignerStore.getState();
    expect(errorState.stage).toBe("error");
    expect(errorState.renderedPage).toBeNull();
    expect(errorState.calibration).toBeNull();
    expect(errorState.digitization).toBeNull();
    expect(errorState.acceptedPoints).toEqual([]);
    expect(screen.queryByRole("button", {
      name: "Kalibratie accepteren",
    })).toBeNull();
  });

  it("genereert na acceptatie acht paalpuntblokken via de documentstore", () => {
    const acceptedPoints = Array.from({ length: 201 }, (_, index) => ({
      depthNapM: -24 + index * 0.05,
      qcMpa: 8 + index / 100,
      confidence: 0.95,
    }));
    seedWorkflow("ready");
    act(() => {
      useVibroDesignerStore.getState().updateWorkflow({
        pdfName: "sondering-01.pdf",
        calibration: {
          pageIndex: 0,
          plotBoundsPx: { left: 60, top: 80, right: 400, bottom: 700 },
          qcMinMpa: 0,
          qcMaxMpa: 20,
          depthTopNapM: -14,
          depthBottomNapM: -24,
        },
        acceptedPoints,
      });
    });
    render(<VibroPileDesigner documentRevision={0} />);

    fireEvent.change(screen.getByLabelText("Ontwerpbelasting (kN)"), {
      target: { value: "650" },
    });
    fireEvent.change(screen.getByLabelText("Alpha p"), {
      target: { value: "0.65" },
    });
    fireEvent.change(screen.getByLabelText("K0 laag 1"), {
      target: { value: "0.6" },
    });
    fireEvent.change(screen.getByLabelText(
      "Effectieve spanning onder laag 1 (kPa)",
    ), {
      target: { value: "90" },
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Rekensheet genereren",
    }));

    const document = useDocumentStore.getState();
    expect(document.source).toContain("# VIBRO-paaldraagvermogen");
    expect(document.source).toContain("sondering-01.pdf");
    expect(document.source.match(/^### Paalpunt NAP /gm)).toHaveLength(8);
    expect(document.source).toContain("F_design_kN = 650");
    expect(document.source).toContain("alpha_p = 0.65");
    expect(document.source).toContain(
      "negatieve_kleeflaag_data = [[-0.9, -14.25, 0, 90, 0.6, 0.35, 1]]",
    );
    expect(document.source).not.toContain("F_nk_d_basis = 0");
    expect(document.filePath).toBe("VIBRO-paal sondering 1");
    expect(document.dirty).toBe(false);
    expect(document.documentRevision).toBe(1);
    expect(evaluate(parse(document.source)).filter(
      (node) =>
        node.type === "assignment"
        && node.result.startsWith("Error:"),
    )).toEqual([]);
  });

  it("laat meerdere negatieve-kleeflagen configureren", () => {
    seedWorkflow("ready");
    render(<VibroPileDesigner documentRevision={0} />);

    expect(screen.getByLabelText("K0 laag 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {
      name: "Negatieve-kleeflaag toevoegen",
    }));

    expect(screen.getByLabelText("K0 laag 2")).toBeTruthy();
    expect(screen.getByRole("button", {
      name: "Negatieve-kleeflaag 2 verwijderen",
    })).toBeTruthy();
  });
});
