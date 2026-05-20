import { useState } from "react";
import { useDocumentStore } from "../../store/documentStore";
import "./HelpPanel.css";

/**
 * Shown in the preview pane when the editor is empty. Mirrors the CalcPAD
 * "How it works" reference card so users discover the language without
 * leaving the app. Sections with a `+` prefix can be expanded.
 *
 * Clicking an inline snippet inserts it into the editor.
 */

interface Section {
  title: string;
  /** When set, items render as a collapsible list. */
  items?: Item[];
  /** When set, render as a single paragraph / inline list (no toggle). */
  inline?: { label: string; insert?: string; isCode?: boolean }[];
  /** Plain-text body shown after the title (no inserts). */
  description?: string;
}

interface Item {
  label: string;
  insert?: string;
  description?: string;
}

const SECTIONS: Section[] = [
  {
    title: "Hoe het werkt",
    description:
      "Typ je formules en tekst (tussen ' of \") in de linker editor. Druk F5 of klik Berekenen om te evalueren. " +
      "Resultaten verschijnen rechts. Exporteer naar PDF, IFCX, of HTML via het Bestand-menu.",
  },
  {
    title: "Getallen en arrays",
    inline: [
      { label: "Reëel", insert: "1.5", isCode: true },
      { label: "Complex", insert: "3 - 2i", isCode: true },
      { label: "Vector", insert: "[v_1; v_2; v_3]", isCode: true },
      { label: "Matrix", insert: "[a; b | c; d]", isCode: true },
    ],
  },
  {
    title: "Variabelen",
    items: [
      { label: "Eenvoudig", insert: "b = 300 mm", description: "Bind 'b' aan 300 mm" },
      { label: "Subscript", insert: "V_b,0 = 27 m/s", description: "Komma's in subscripts toegestaan" },
      { label: "Griekse letter", insert: "γ_Q = 1.5", description: "γ, σ, ψ, μ, π …" },
    ],
  },
  {
    title: "Constanten",
    inline: [
      { label: "π", insert: "pi" },
      { label: "e", insert: "e" },
      { label: "φ", insert: "phi" },
      { label: "γc · γs · γa · γw", insert: "γ_c" },
    ],
  },
  {
    title: "Operatoren",
    inline: [
      { label: "+ − × ÷", insert: "+", isCode: true },
      { label: "^", insert: "^", isCode: true },
      { label: "%", insert: "%", isCode: true },
      { label: "≡ ≠ ≤ ≥", insert: "≤", isCode: true },
      { label: "and · or · not", insert: "and(a; b)" },
    ],
  },
  {
    title: "Functies",
    items: [
      { label: "f(x) = …", insert: "f(x) = x^2 + 1", description: "Eigen functie" },
      { label: "sin / cos / tan", insert: "sin(θ)" },
      { label: "log / log10 / lg", insert: "log10(x)" },
      { label: "sqrt / sqr / abs", insert: "sqrt(x)" },
      { label: "min / max / round / floor / ceil", insert: "max(a; b)" },
      { label: "if (ternary)", insert: "if(cond; t; f)" },
      { label: "take / hlookup / vlookup", insert: "take(1; vec)" },
    ],
  },
  {
    title: "Conditionals",
    items: [
      { label: "#if … #end if", insert: "#if cond\n\t…\n#end if" },
      { label: "#if … #else if … #else … #end if", insert: "#if a > 0\n\t…\n#else if a == 0\n\t…\n#else\n\t…\n#end if" },
    ],
  },
  {
    title: "Loops",
    items: [
      { label: "#repeat n … #end repeat", insert: "#repeat 10\n\t…\n#end repeat" },
      { label: "#for var = lo : hi … #loop", insert: "#for i = 1 : 9\n\t…\n#loop" },
      { label: "#break (vroegtijdig stoppen)", insert: "#break" },
    ],
  },
  {
    title: "Macro's en includes",
    items: [
      { label: "#def name(args) … #end def", insert: "#def line$(x1$; y1$; x2$; y2$)\n\t'<line x1=\"'x1$'\" y1=\"'y1$'\" .../>\n#end def" },
      { label: "#def Name$ = waarde", insert: "#def style1$ = \"stroke:black\"" },
      { label: "#include bestand.cpd", insert: "#include svg_drawing.cpd" },
    ],
  },
  {
    title: "Tekeningen",
    items: [
      { label: "@svg … @end (handgeschreven)", insert: "@svg\n\t<rect width=\"100\" height=\"50\"/>\n@end" },
      { label: "@img(bestand.png)", insert: "@img(detail.png)" },
      { label: "@img(bestand.svg) — inline embed", insert: "@img(detail.svg)" },
      { label: "$Plot{ f(x) @ x = lo : hi }", insert: "$Plot{f(x) @ x = -10 : 10}" },
    ],
  },
  {
    title: "Tekst en titels",
    items: [
      { label: "\"Project-titel", insert: "\"Project Titel" },
      { label: "'<b>Vetgedrukt</b>", insert: "'<b>Vetgedrukt</b>" },
      { label: "# Hoofdstuk", insert: "# 1. Invoer" },
      { label: "// commentaar", insert: "// commentaar" },
    ],
  },
  {
    title: "Hoek-eenheden",
    inline: [
      { label: "#deg", insert: "#deg" },
      { label: "#rad", insert: "#rad" },
      { label: "#gra", insert: "#gra" },
    ],
  },
  {
    title: "Veelgebruikte eenheden",
    description:
      "Lengte: mm · cm · m · km   ·   Massa: g · kg · ton   ·   Kracht: N · kN · MN   ·   " +
      "Druk: Pa · kPa · MPa · GPa   ·   Hoek: deg · rad · grad   ·   Tijd: s · min · h",
  },
];

export default function HelpPanel() {
  const source = useDocumentStore((s) => s.source);
  const setSource = useDocumentStore((s) => s.setSource);
  // First two sections always open; rest start collapsed.
  const [open, setOpen] = useState<Set<number>>(new Set([0, 1, 2]));

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const insert = (snippet: string) => {
    const sep = source.length === 0 || source.endsWith("\n") ? "" : "\n";
    setSource(source + sep + snippet + "\n");
  };

  return (
    <div className="help-panel">
      <header className="help-panel-header">
        <h2 className="help-panel-title">OpenAEC Calc — taalreferentie</h2>
        <p className="help-panel-subtitle">
          Klik een fragment om het in de editor in te voegen. Sluit dit paneel door iets in de editor te typen.
        </p>
      </header>
      <div className="help-panel-body">
        {SECTIONS.map((sec, i) => {
          const isCollapsible = !!(sec.items && sec.items.length > 0);
          const isOpen = !isCollapsible || open.has(i);
          return (
            <section key={sec.title} className={`help-section${isOpen ? " open" : ""}`}>
              <button
                type="button"
                className="help-section-header"
                onClick={() => isCollapsible && toggle(i)}
                aria-expanded={isOpen}
                aria-disabled={!isCollapsible}
              >
                {isCollapsible && (
                  <span className="help-section-toggle" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                )}
                <span className="help-section-title">{sec.title}</span>
              </button>
              {isOpen && (
                <div className="help-section-content">
                  {sec.description && <p className="help-section-desc">{sec.description}</p>}
                  {sec.inline && (
                    <div className="help-section-inline">
                      {sec.inline.map((it, j) => (
                        <button
                          key={j}
                          type="button"
                          className={`help-chip${it.isCode ? " is-code" : ""}`}
                          onClick={() => it.insert && insert(it.insert)}
                          title={it.insert ? `Voeg in: ${it.insert}` : undefined}
                        >
                          {it.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {sec.items && (
                    <ul className="help-section-items">
                      {sec.items.map((it, j) => (
                        <li key={j}>
                          <button
                            type="button"
                            className="help-item"
                            onClick={() => it.insert && insert(it.insert)}
                            title={it.insert ? "Klik om in te voegen" : undefined}
                          >
                            <span className="help-item-label">{it.label}</span>
                            {it.description && (
                              <span className="help-item-desc"> — {it.description}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
