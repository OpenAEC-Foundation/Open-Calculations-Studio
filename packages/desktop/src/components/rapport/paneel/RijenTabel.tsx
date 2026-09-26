import type { ReactNode } from "react";
import { leesPad, zetOpPad } from "../../../rapport/pad";
import { useProjectStore } from "../../../store/projectStore";
import { opPad, verplaatst } from "./hulp";
import type { Optie } from "./velden";

/**
 * Een bewerkbare tabel van rijen in het rapport: revisies, materialen,
 * windcoëfficiënten, de lagen van een opbouw.
 *
 * Typen in een cel gaat per cel via zetRapportVeld ("…materialen.2.soort"),
 * zodat doortypen één stap ongedaan maken is. Toevoegen, verwijderen en
 * verplaatsen gaan via werkRapportBij en lezen de lijst uit het rapport van
 * dát moment, niet uit de laatste render: twee snelle klikken op "toevoegen"
 * geven dan ook echt twee rijen.
 */

export interface Kolom<T> {
  sleutel: Extract<keyof T, string>;
  kop: ReactNode;
  /** CSS-breedte, bijv. "6em" of "30%"; zonder breedte deelt de kolom de rest. */
  breedte?: string;
  placeholder?: string;
  /** Id van een <datalist> met suggesties. */
  lijst?: string;
  /** Vaste keuzes: een keuzelijst in plaats van een tekstveld. */
  keuzes?: readonly Optie[];
  /** Een getal: rechts uitgelijnd. */
  getal?: boolean;
}

/** Een kolom die niet bewerkt wordt maar uit de rij volgt, zoals P_rep of een berekende p. */
export interface Extrakolom<T> {
  kop: ReactNode;
  breedte?: string;
  waarde: (rij: T, index: number) => ReactNode;
}

export interface RijenTabelProps<T> {
  /** Pad van de lijst in het rapport, bijv. "uitgangspunten.materialen". */
  pad: string;
  rijen: readonly T[];
  kolommen: readonly Kolom<T>[];
  /** De rij die "toevoegen" maakt; krijgt de huidige lijst mee, voor een volgende revisiecode. */
  nieuweRij: (rijen: readonly T[]) => T;
  /** Tekst op de toevoegknop. */
  toevoegen?: string;
  extra?: readonly Extrakolom<T>[];
  /** Onder de tabel, bijvoorbeeld een som. */
  voet?: ReactNode;
  /** Naast de toevoegknop, bijvoorbeeld een keuzemenu met lagen uit de bibliotheek. */
  knoppen?: ReactNode;
  /** Tekst in een lege tabel. */
  leeg?: string;
  /** Knoppen om rijen te verplaatsen; uit voor een lijst met een vaste volgorde. */
  verplaatsbaar?: boolean;
  /** Bij dit aantal rijen of minder kan er geen rij meer weg. */
  minimaal?: number;
}

export default function RijenTabel<T extends object>({
  pad,
  rijen,
  kolommen,
  nieuweRij,
  toevoegen = "Rij toevoegen",
  extra = [],
  voet,
  knoppen,
  leeg = "Nog geen regels.",
  verplaatsbaar = true,
  minimaal = 0,
}: RijenTabelProps<T>) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const werkBij = useProjectStore((s) => s.werkRapportBij);

  const wijzig = (fn: (lijst: T[]) => T[]) =>
    werkBij((r) => {
      const stappen = leesPad(pad);
      const huidig = opPad(r, stappen);
      return zetOpPad(r, stappen, fn(Array.isArray(huidig) ? (huidig as T[]) : []));
    });

  const toevoegKnop = (
    <button type="button" className="rapport-knop" onClick={() => wijzig((l) => [...l, nieuweRij(l)])}>
      + {toevoegen}
    </button>
  );

  return (
    <div className="rapport-rijen">
      <table className="rapport-tabel">
        <thead>
          <tr>
            {kolommen.map((k) => (
              <th
                key={k.sleutel}
                style={{ width: k.breedte }}
                className={k.getal ? "rapport-getal" : undefined}
              >
                {k.kop}
              </th>
            ))}
            {extra.map((x, j) => (
              <th key={`extra-${j}`} style={{ width: x.breedte }} className="rapport-getal">
                {x.kop}
              </th>
            ))}
            <th style={{ width: verplaatsbaar ? "74px" : "30px" }} aria-label="Bewerken" />
          </tr>
        </thead>
        <tbody>
          {rijen.length === 0 && (
            <tr>
              <td colSpan={kolommen.length + extra.length + 1} className="rapport-tabel-leeg">
                {leeg}
              </td>
            </tr>
          )}
          {rijen.map((rij, i) => (
            <tr key={i}>
              {kolommen.map((k) => {
                const waarde = String(rij[k.sleutel] ?? "");
                const celPad = `${pad}.${i}.${k.sleutel}`;
                return (
                  <td key={k.sleutel}>
                    {k.keuzes ? (
                      <select value={waarde} onChange={(e) => zet(celPad, e.target.value)}>
                        {!k.keuzes.some((o) => o.waarde === waarde) && (
                          <option value={waarde}>{waarde}</option>
                        )}
                        {k.keuzes.map((o) => (
                          <option key={o.waarde} value={o.waarde}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={waarde}
                        placeholder={k.placeholder}
                        list={k.lijst}
                        className={k.getal ? "rapport-getal" : undefined}
                        onChange={(e) => zet(celPad, e.target.value)}
                      />
                    )}
                  </td>
                );
              })}
              {extra.map((x, j) => (
                <td key={`extra-${j}`} className="rapport-tabel-afgeleid">
                  {x.waarde(rij, i)}
                </td>
              ))}
              <td className="rapport-tabel-knoppen">
                {verplaatsbaar && (
                  <>
                    <button
                      type="button"
                      className="rapport-icoon"
                      title="Omhoog"
                      disabled={i === 0}
                      onClick={() => wijzig((l) => verplaatst(l, i, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rapport-icoon"
                      title="Omlaag"
                      disabled={i === rijen.length - 1}
                      onClick={() => wijzig((l) => verplaatst(l, i, 1))}
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="rapport-icoon"
                  title="Rij verwijderen"
                  disabled={rijen.length <= minimaal}
                  onClick={() => wijzig((l) => l.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {voet}
      {knoppen ? (
        <div className="rapport-knoppen">
          {toevoegKnop}
          {knoppen}
        </div>
      ) : (
        toevoegKnop
      )}
    </div>
  );
}
