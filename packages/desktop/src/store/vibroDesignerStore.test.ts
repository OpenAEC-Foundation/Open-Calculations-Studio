import { beforeEach, describe, expect, it } from "vitest";
import { useVibroDesignerStore } from "./vibroDesignerStore";

describe("vibroDesignerStore", () => {
  beforeEach(() => {
    useVibroDesignerStore.getState().resetWorkflow();
  });

  it("bewaart kalibratiewerk buiten de levensduur van een componentinstantie", () => {
    useVibroDesignerStore.getState().updateWorkflow({
      stage: "ready",
      pdfName: "sondering.pdf",
      acceptedPoints: [{ depthNapM: -1, qcMpa: 8, confidence: 0.9 }],
    });

    const remountedState = useVibroDesignerStore.getState();

    expect(remountedState.stage).toBe("ready");
    expect(remountedState.pdfName).toBe("sondering.pdf");
    expect(remountedState.acceptedPoints).toHaveLength(1);
  });

  it("maakt alleen de nieuwste renderrequest actueel", () => {
    const firstRequest = useVibroDesignerStore.getState().beginRenderRequest();
    const secondRequest = useVibroDesignerStore.getState().beginRenderRequest();

    expect(useVibroDesignerStore.getState().isCurrentRenderRequest(firstRequest))
      .toBe(false);
    expect(useVibroDesignerStore.getState().isCurrentRenderRequest(secondRequest))
      .toBe(true);
  });

  it("maakt lopende requests ongeldig bij een expliciete workflowreset", () => {
    const request = useVibroDesignerStore.getState().beginRenderRequest();

    useVibroDesignerStore.getState().resetWorkflow();

    expect(useVibroDesignerStore.getState().isCurrentRenderRequest(request))
      .toBe(false);
  });

  it("begint leeg en maakt lopende requests ongeldig voor een ander document", () => {
    useVibroDesignerStore.getState().updateWorkflow({
      stage: "ready",
      pdfName: "sondering.pdf",
      acceptedPoints: [{ depthNapM: -1, qcMpa: 8, confidence: 0.9 }],
    });
    const request = useVibroDesignerStore.getState().beginRenderRequest();
    const nextRevision =
      useVibroDesignerStore.getState().documentRevision + 1;

    useVibroDesignerStore.getState().bindDocument(nextRevision);

    const state = useVibroDesignerStore.getState();
    expect(state.documentRevision).toBe(nextRevision);
    expect(state.stage).toBe("empty");
    expect(state.pdfName).toBe("");
    expect(state.acceptedPoints).toEqual([]);
    expect(state.isCurrentRenderRequest(request)).toBe(false);
  });
});
