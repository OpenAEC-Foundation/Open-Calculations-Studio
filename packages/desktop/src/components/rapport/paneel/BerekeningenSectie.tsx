import { useMemo } from "react";
import { evaluate, parse } from "@ifc-calc/core";
import { calcpadImageUrls, calcpadIncludes } from "../../../templates/calcpad-includes";
import { projectScope } from "../../../store/projectGegevens";
import { useProjectStore } from "../../../store/projectStore";
import { leesResultaat, samenvatting, type Resultaat } from "../../calc/bladResultaat";
import { GroeiVeld, Sectie, useOpzetStand, useRapport } from "./velden";

interface Uitkomst {
  resultaat: Resultaat;
  /** De foutmelding als het blad niet door te rekenen was. */
  fout: string | null;
}

/**
 * Rekent elk blad door en leest zijn uitkomst, net als de afdruk. Hangt
 * alleen af van de bladen en de projectgegevens: typen in het rapport rekent
 * niets opnieuw.
 */
function useUitkomsten(): Map<string, Uitkomst> {
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const gegevens = useProjectStore((s) => s.gegevens);
  return useMemo(() => {
    const scope = projectScope(gegevens);
    const opties = { includes: calcpadIncludes, imageUrls: calcpadImageUrls };
    const uit = new Map<string, Uitkomst>();
    for (const ex of exemplaren) {
      try {
        const nodes = evaluate(parse(ex.source, opties), ex.waarden, scope);
        uit.set(ex.id, { resultaat: leesResultaat(nodes, ex.naam), fout: null });
      } catch (err) {
        uit.set(ex.id, {
          resultaat: { titel: ex.naam, norm: "", uc: null, voldoet: null },
          fout: (err as Error).message,
        });
      }
    }
    return uit;
  }, [exemplaren, gegevens]);
}

/**
 * Sectie Berekeningen (hoofdstuk 6): per rekenblad de samenvatting die in
 * het rapport komt, een eigen toelichting, en de keuze of de volledige
 * uitwerking in het hoofdstuk zelf staat of in bijlage A.
 */
export default function BerekeningenSectie() {
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const rapport = useRapport();
  const stand = useOpzetStand();
  const uitkomsten = useUitkomsten();

  return (
    <Sectie
      id="berekeningen"
      titel="Berekeningen"
      hoofdstuk="berekeningen"
      intro="Elk rekenblad van het project krijgt een paragraaf met een samenvatting en je eigen toelichting. De volledige uitwerking staat in bijlage A, tenzij je hem in het hoofdstuk zelf opneemt."
    >
      {exemplaren.length === 0 && (
        <p className="rapport-hint">
          Dit project heeft nog geen rekenbladen. Voeg ze toe in de projectboom; elk blad krijgt hier
          vanzelf een paragraaf.
        </p>
      )}
      {exemplaren.map((ex) => {
        const uitkomst = uitkomsten.get(ex.id);
        const r = uitkomst?.resultaat;
        // Zonder UC, oordeel of eigen kop zegt de samenvatting niets meer dan de naam.
        const zegtIets = !!r && (r.titel !== ex.naam || r.uc !== null || r.voldoet !== null);
        const plaats = stand.blad(ex.id);
        const inHoofdstuk = rapport.inHoofdstuk[ex.id] ?? false;
        // Het exemplaar-id staat in het pad; ids van de vorm "ex-…" bevatten
        // geen punt, dus leesPad knipt ze niet in stukken.
        return (
          <div className="rapport-kaart" key={ex.id}>
            <div className="rapport-kaart-kop">
              {plaats?.nummer && <span className="rapport-nummer">{plaats.nummer}</span>}
              <span className="rapport-kaart-titel">{ex.naam}</span>
              {r && r.voldoet !== null && (
                <span className={`rapport-oordeel ${r.voldoet ? "goed" : "fout"}`}>
                  {r.voldoet ? "voldoet" : "voldoet niet"}
                </span>
              )}
            </div>
            {r && zegtIets && <p className="rapport-samenvatting">{samenvatting(r)}</p>}
            {uitkomst?.fout && (
              <p className="rapport-hint">Dit blad kon niet worden doorgerekend: {uitkomst.fout}</p>
            )}
            <GroeiVeld
              waarde={rapport.toelichting[ex.id] ?? ""}
              onChange={(v) => zet(`toelichting.${ex.id}`, v)}
              placeholder="Eigen toelichting bij deze berekening (optioneel)."
            />
            <div className="rapport-kaart-voet">
              <label className="rapport-vink">
                <input
                  type="checkbox"
                  checked={inHoofdstuk}
                  onChange={(e) => zet(`inHoofdstuk.${ex.id}`, e.target.checked)}
                />
                Uitwerking in dit hoofdstuk
              </label>
              <span className="rapport-hint">
                {inHoofdstuk
                  ? "De volledige uitwerking staat direct onder de toelichting."
                  : `De volledige uitwerking staat in bijlage ${plaats?.bijlage || "A"}.`}
              </span>
            </div>
          </div>
        );
      })}
    </Sectie>
  );
}
