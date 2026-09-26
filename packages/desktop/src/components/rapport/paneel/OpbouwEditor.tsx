import { useMemo } from "react";
import type { Gevellaag, Laag, Opbouw } from "../../../rapport/model";
import { gevelOpbouw, vlakOpbouw } from "../../../rapport/opbouw";
import { useProjectStore } from "../../../store/projectStore";
import { getalTekst, verplaatst } from "./hulp";
import RijenTabel, { type Kolom } from "./RijenTabel";

/** De twee groepen van 5.5. */
export type Opbouwgroep = "vloerenDaken" | "wanden";

const VLAK_KOLOMMEN: Kolom<Laag>[] = [
  { sleutel: "naam", kop: "Laag" },
  { sleutel: "d", kop: "d [m]", breedte: "5.5em", getal: true },
  { sleutel: "rho", kop: "ρ [kN/m³]", breedte: "6.5em", getal: true },
  { sleutel: "p", kop: "p [kN/m²]", breedte: "6.5em", getal: true, placeholder: "d × ρ" },
];

const GEVEL_KOLOMMEN: Kolom<Gevellaag>[] = [
  { sleutel: "naam", kop: "Laag" },
  { sleutel: "p", kop: <>p<sub>rep</sub> [kN/m²]</>, breedte: "7em", getal: true },
  { sleutel: "h", kop: "h [m]", breedte: "5.5em", getal: true },
  { sleutel: "vulling", kop: "vulling", breedte: "5.5em", getal: true, placeholder: "90%" },
];

function nieuweOpbouw(soort: Opbouw["soort"]): Opbouw {
  return soort === "vlak"
    ? { soort: "vlak", naam: "", lagen: [{ naam: "", d: "", rho: "", p: "" }] }
    : { soort: "gevel", naam: "", lagen: [{ naam: "", p: "", h: "", vulling: "" }] };
}

/**
 * De opbouwen van één groep uit 5.5 Blijvende belastingen. Een vlakopbouw
 * telt per laag d × ρ op (of de ingevulde p) tot kN/m²; een gevelopbouw telt
 * p × h × vulling op tot kN/m¹. De sommen komen uit opbouw.ts, dezelfde
 * rekensom als in de afdruk.
 */
export default function OpbouwEditor({ groep, titel }: { groep: Opbouwgroep; titel: string }) {
  const opbouwen = useProjectStore((s) => s.rapport.belastingen[groep]);
  const werkBij = useProjectStore((s) => s.werkRapportBij);

  const wijzig = (fn: (lijst: Opbouw[]) => Opbouw[]) =>
    werkBij((r) => {
      const b = r.belastingen;
      const lijst = fn(b[groep]);
      return {
        ...r,
        belastingen: groep === "wanden" ? { ...b, wanden: lijst } : { ...b, vloerenDaken: lijst },
      };
    });

  return (
    <div className="rapport-opbouwgroep">
      <h5 className="rapport-subkop">{titel}</h5>
      {opbouwen.length === 0 && <p className="rapport-hint">Nog geen opbouwen in deze groep.</p>}
      {opbouwen.map((o, i) => (
        <OpbouwKaart
          key={i}
          opbouw={o}
          pad={`belastingen.${groep}.${i}`}
          index={i}
          aantal={opbouwen.length}
          wijzig={wijzig}
        />
      ))}
      <div className="rapport-knoppen">
        <button type="button" className="rapport-knop" onClick={() => wijzig((l) => [...l, nieuweOpbouw("vlak")])}>
          + Vlakopbouw (kN/m²)
        </button>
        <button type="button" className="rapport-knop" onClick={() => wijzig((l) => [...l, nieuweOpbouw("gevel")])}>
          + Gevelopbouw (kN/m¹)
        </button>
      </div>
    </div>
  );
}

function OpbouwKaart({ opbouw, pad, index, aantal, wijzig }: {
  opbouw: Opbouw;
  pad: string;
  index: number;
  aantal: number;
  wijzig: (fn: (lijst: Opbouw[]) => Opbouw[]) => void;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const vlak = opbouw.soort === "vlak";
  return (
    <div className="rapport-kaart">
      <div className="rapport-kaart-kop">
        <input
          type="text"
          value={opbouw.naam}
          aria-label="Naam van de opbouw"
          placeholder={vlak ? "Naam, bijv. Begane grondvloer" : "Naam, bijv. Voorgevel"}
          onChange={(e) => zet(`${pad}.naam`, e.target.value)}
        />
        <span className="rapport-soort">{vlak ? "vlakopbouw · kN/m²" : "gevelopbouw · kN/m¹"}</span>
        <button
          type="button"
          className="rapport-icoon"
          title="Omhoog"
          disabled={index === 0}
          onClick={() => wijzig((l) => verplaatst(l, index, -1))}
        >
          ↑
        </button>
        <button
          type="button"
          className="rapport-icoon"
          title="Omlaag"
          disabled={index === aantal - 1}
          onClick={() => wijzig((l) => verplaatst(l, index, 1))}
        >
          ↓
        </button>
        <button
          type="button"
          className="rapport-icoon"
          title="Opbouw verwijderen"
          onClick={() => {
            const naam = opbouw.naam.trim() || "zonder naam";
            if (confirm(`Opbouw "${naam}" met al zijn lagen verwijderen?`)) {
              wijzig((l) => l.filter((_, j) => j !== index));
            }
          }}
        >
          ✕
        </button>
      </div>
      {opbouw.soort === "vlak" ? (
        <VlakLagen pad={`${pad}.lagen`} lagen={opbouw.lagen} />
      ) : (
        <GevelLagen pad={`${pad}.lagen`} lagen={opbouw.lagen} />
      )}
    </div>
  );
}

function VlakLagen({ pad, lagen }: { pad: string; lagen: Laag[] }) {
  const { regels, som } = useMemo(() => vlakOpbouw(lagen), [lagen]);
  return (
    <RijenTabel<Laag>
      pad={pad}
      rijen={lagen}
      kolommen={VLAK_KOLOMMEN}
      nieuweRij={() => ({ naam: "", d: "", rho: "", p: "" })}
      toevoegen="Laag toevoegen"
      extra={[{ kop: "berekend", breedte: "6em", waarde: (_rij, i) => getalTekst(regels[i]?.p, 2) }]}
      voet={
        <p className="rapport-som">
          <span>Totaal</span>
          <strong>{getalTekst(som, 2)} kN/m²</strong>
        </p>
      }
    />
  );
}

function GevelLagen({ pad, lagen }: { pad: string; lagen: Gevellaag[] }) {
  const { regels, som } = useMemo(() => gevelOpbouw(lagen), [lagen]);
  return (
    <RijenTabel<Gevellaag>
      pad={pad}
      rijen={lagen}
      kolommen={GEVEL_KOLOMMEN}
      nieuweRij={() => ({ naam: "", p: "", h: "", vulling: "" })}
      toevoegen="Laag toevoegen"
      extra={[{ kop: "q [kN/m¹]", breedte: "6em", waarde: (_rij, i) => getalTekst(regels[i]?.q, 2) }]}
      voet={
        <p className="rapport-som">
          <span>Totaal</span>
          <strong>{getalTekst(som, 2)} kN/m¹</strong>
        </p>
      }
    />
  );
}
