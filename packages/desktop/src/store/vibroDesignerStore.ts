import { create } from "zustand";
import type { CurveDigitizationResult } from "../vibro/curveDigitizer";
import type { RelevantDepthRange } from "../vibro/designerQuality";
import type { RenderedPdfPage } from "../vibro/pdfPage";
import type {
  CptCalibration,
  DigitizedCptPoint,
} from "../vibro/types";

export type DesignerStage =
  | "empty"
  | "loading"
  | "calibrating"
  | "review"
  | "ready"
  | "error";

export interface VibroDesignerWorkflow {
  documentRevision: number;
  stage: DesignerStage;
  isReloading: boolean;
  pdfSource: string | Uint8Array | null;
  pdfName: string;
  pageIndex: number;
  renderScale: number;
  renderScaleError: string;
  renderedPage: RenderedPdfPage | null;
  calibration: CptCalibration | null;
  relevantRange: RelevantDepthRange;
  digitization: CurveDigitizationResult | null;
  acceptedPoints: DigitizedCptPoint[];
  errorMessage: string;
  renderRequestId: number;
}

interface VibroDesignerActions {
  updateWorkflow: (patch: Partial<VibroDesignerWorkflow>) => void;
  resetWorkflow: () => void;
  bindDocument: (documentRevision: number) => void;
  beginRenderRequest: () => number;
  isCurrentRenderRequest: (requestId: number) => boolean;
}

const INITIAL_WORKFLOW: VibroDesignerWorkflow = {
  documentRevision: 0,
  stage: "empty",
  isReloading: false,
  pdfSource: null,
  pdfName: "",
  pageIndex: 0,
  renderScale: 2,
  renderScaleError: "",
  renderedPage: null,
  calibration: null,
  relevantRange: {
    topNapM: 1,
    bottomNapM: -25,
  },
  digitization: null,
  acceptedPoints: [],
  errorMessage: "",
  renderRequestId: 0,
};

export const useVibroDesignerStore = create<
  VibroDesignerWorkflow & VibroDesignerActions
>((set, get) => ({
  ...INITIAL_WORKFLOW,
  updateWorkflow: (patch) => set(patch),
  resetWorkflow: () => set((state) => ({
    ...INITIAL_WORKFLOW,
    documentRevision: state.documentRevision,
    renderRequestId: state.renderRequestId + 1,
  })),
  bindDocument: (documentRevision) => {
    if (get().documentRevision === documentRevision) return;
    set((state) => ({
      ...INITIAL_WORKFLOW,
      documentRevision,
      renderRequestId: state.renderRequestId + 1,
    }));
  },
  beginRenderRequest: () => {
    const requestId = get().renderRequestId + 1;
    set({ renderRequestId: requestId });
    return requestId;
  },
  isCurrentRenderRequest: (requestId) =>
    get().renderRequestId === requestId,
}));
