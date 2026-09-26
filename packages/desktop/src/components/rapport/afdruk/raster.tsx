import { Fragment, type ReactNode } from "react";
import { tekstRegels, vulIn, type Invulwaarden } from "../../../rapport/invullen";

/*
 * Bouwstenen van het rapport, op het raster van de referentie-spreadsheet:
 * regels van 6,6 mm en kolommen van 18,98 mm (RapportAfdruk.css).
 *
 * Alles wat hier uit komt is een los blok per regel. Het afdrukvoorbeeld
 * verdeelt het rapport per blok over de vellen; een tabel als één geheel zou
 * niet over twee vellen kunnen lopen en onderaan worden afgeknipt. Groeperen
 * gebeurt daarom met `Vlak`: een wikkel die het voorbeeld weer uitvlakt.
 */

/** Groepeert regels. Het afdrukvoorbeeld pelt deze wikkel af en zet zijn klasse per vel terug. */
export function Vlak({ klasse, children }: { klasse?: string; children?: ReactNode }) {
  return <div className={klasse ? `rpa-vlak ${klasse}` : "rpa-vlak"}>{children}</div>;
}

/**
 * Eén regel van het raster, met cellen op vaste kolommen. `houd` houdt de
 * regel bij de volgende: de kopregel van een tabel blijft niet alleen
 * onderaan een vel staan.
 */
export function Rij({ klasse, houd, children }: { klasse?: string; houd?: boolean; children?: ReactNode }) {
  const klassen = ["rpa-rij"];
  if (houd) klassen.push("rpa-houd");
  if (klasse) klassen.push(klasse);
  return <div className={klassen.join(" ")}>{children}</div>;
}

export interface CelProps {
  /** Eerste kolom, vanaf 1: de linkerkant van het vlak waar de rij in staat. */
  k: number;
  /** Aantal kolommen. Tekst mag er, net als in een spreadsheet, overheen lopen. */
  n?: number;
  /** Lijn onder. */
  o?: boolean;
  /** Lijn boven. */
  b?: boolean;
  /** Lijn links. */
  l?: boolean;
  /** Lijn rechts. */
  r?: boolean;
  klasse?: string;
  children?: ReactNode;
}

/** Eén cel van een rij. */
export function Cel({ k, n = 1, o, b, l, r, klasse, children }: CelProps) {
  const klassen = ["rpa-cel"];
  if (o) klassen.push("rpa-o");
  if (b) klassen.push("rpa-b");
  if (l) klassen.push("rpa-l");
  if (r) klassen.push("rpa-r");
  if (klasse) klassen.push(klasse);
  return (
    <span className={klassen.join(" ")} style={{ gridColumn: `${k} / span ${n}` }}>
      {children}
    </span>
  );
}

/** Lege regels. */
export function Leeg({ n = 1 }: { n?: number }) {
  return <div className="rpa-leeg" style={n === 1 ? undefined : { height: `calc(${n} * var(--rpa-rij))` }} />;
}

/**
 * Indices zoals de norm ze schrijft: "1,5ψ0" → 1,5ψ₀ en "0,004l_rep" →
 * 0,004l met "rep" als onderschrift. Alleen voor velden die zo zijn bedoeld
 * (belastingfactoren, vervormingseisen); een naam van een opbouw blijft zoals
 * hij is getypt.
 */
export function Index({ t }: { t: string }) {
  const delen = t.split(/(ψ\d|_[^\s_]+)/);
  return (
    <>
      {delen.map((d, i) => {
        if (/^ψ\d$/.test(d)) return <Fragment key={i}>ψ<sub>{d.slice(1)}</sub></Fragment>;
        if (d.startsWith("_") && d.length > 1) return <sub key={i}>{d.slice(1)}</sub>;
        return <Fragment key={i}>{d}</Fragment>;
      })}
    </>
  );
}

type Eenheidnaam = "kN/m2" | "kN/m1" | "kN/m3" | "kN" | "m" | "min";

/** Een eenheid tussen haken, met de macht als echte exponent: [kN/m²]. */
export function Eenheid({ e }: { e: Eenheidnaam }) {
  const [basis, macht] = e.split(/(?=\d$)/);
  return (
    <>
      [{basis}
      {macht && <sup>{macht}</sup>}]
    </>
  );
}

/**
 * Een tekst uit het rapport, regel voor regel: een lege regel is een lege rij,
 * een regel die met "-" begint springt één kolom in. De invulvelden
 * ({projectnaam} en dergelijke) worden per regel ingevuld.
 */
export function Tekst({ tekst, invul }: { tekst: string | undefined; invul: Invulwaarden }) {
  return (
    <>
      {tekstRegels(tekst ?? "").map((r, i) =>
        r.leeg ? (
          <Leeg key={i} />
        ) : (
          <p key={i} className={r.inspringen ? "rpa-tekst rpa-streep" : "rpa-tekst"}>
            {vulIn(r.tekst, invul)}
          </p>
        ),
      )}
    </>
  );
}
