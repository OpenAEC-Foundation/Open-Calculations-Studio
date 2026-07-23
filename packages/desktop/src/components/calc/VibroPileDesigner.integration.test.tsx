// @vitest-environment jsdom

import { useState } from "react";
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
    render(<VibroPileDesigner />);

    const pageSelect = screen.getByLabelText("PDF-pagina");
    fireEvent.change(pageSelect, { target: { value: "1" } });
    fireEvent.change(pageSelect, { target: { value: "2" } });

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
            ? <div data-testid="right-pane"><VibroPileDesigner /></div>
            : <div data-testid="left-pane"><VibroPileDesigner /></div>}
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
    render(<VibroPileDesigner />);

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
    render(<VibroPileDesigner />);

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
    render(<VibroPileDesigner />);

    fireEvent.change(screen.getByLabelText("PDF-pagina"), {
      target: { value: "1" },
    });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "PDF is beschadigd",
    );
    expect(useVibroDesignerStore.getState().stage).toBe("error");
  });
});
