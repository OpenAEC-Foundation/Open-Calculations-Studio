import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

import { useDocumentStore } from "./documentStore";

describe("documentStore documentidentiteit", () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documentRevision: 0,
      source: "eerste document",
      filePath: "eerste.ifccalc",
      selectValues: {},
      dirty: false,
    });
  });

  it("wijzigt de documentrevisie alleen wanneer een ander document wordt geladen", () => {
    useDocumentStore.getState().setSource("gewijzigde inhoud");
    expect(useDocumentStore.getState().documentRevision).toBe(0);

    useDocumentStore.getState().loadTemplate(
      "nieuw document",
      "tweede.ifccalc",
    );

    expect(useDocumentStore.getState().documentRevision).toBe(1);
    expect(useDocumentStore.getState().filePath).toBe("tweede.ifccalc");
  });
});
