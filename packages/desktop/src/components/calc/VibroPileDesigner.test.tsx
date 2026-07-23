import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../vibro/pdfPage", () => ({
  renderPdfPage: vi.fn(),
}));

import VibroPileDesigner from "./VibroPileDesigner";

describe("VibroPileDesigner", () => {
  it("toont in de lege toestand de PDF-keuze en kalibratie-uitleg", () => {
    const markup = renderToStaticMarkup(<VibroPileDesigner />);

    expect(markup).toContain("VIBRO-paal");
    expect(markup).toContain("Grondonderzoek-PDF kiezen");
    expect(markup).toContain("Selecteer een grondonderzoek");
    expect(markup).toContain('data-stage="empty"');
  });
});
