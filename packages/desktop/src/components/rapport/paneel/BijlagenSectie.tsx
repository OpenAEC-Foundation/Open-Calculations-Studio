import { useProjectStore } from "../../../store/projectStore";
import { bijlageLetter, verplaatst } from "./hulp";
import { Sectie } from "./velden";

/**
 * Sectie Bijlagen. Bijlage A is altijd de uitgebreide uitwerking van de
 * berekeningen; eigen bijlagen (een constructieoverzicht, een sondering)
 * staan alleen met hun titel in de inhoud.
 */
export default function BijlagenSectie() {
  const bijlagen = useProjectStore((s) => s.rapport.bijlagen);
  const inHoofdstuk = useProjectStore((s) => s.rapport.inHoofdstuk);
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const werkBij = useProjectStore((s) => s.werkRapportBij);

  const wijzig = (fn: (lijst: string[]) => string[]) =>
    werkBij((r) => ({ ...r, bijlagen: fn(r.bijlagen) }));

  // Bijlage A bestaat alleen als er minstens één uitwerking in staat.
  const metA = exemplaren.some((e) => !inHoofdstuk[e.id]);

  // Zelfde telling als bijlagen() in rapport/opzet.ts: een bijlage zonder titel telt niet mee.
  let volgnummer = 0;
  const letters = bijlagen.map((t) => (t.trim() === "" ? "–" : bijlageLetter(volgnummer++)));

  return (
    <Sectie
      id="bijlagen"
      titel="Bijlagen"
      intro="Eigen bijlagen staan met hun titel in de inhoudsopgave; het document zelf voeg je buiten de app toe."
    >
      <ol className="rapport-bijlagen">
        <li>
          <span className="rapport-letter">A</span>
          <span className="rapport-vast">
            Uitgebreide uitwerking berekeningen
            {metA ? "" : " — vervalt: er staat geen uitwerking in de bijlage"}
          </span>
        </li>
        {bijlagen.map((titel, i) => (
          <li key={i}>
            <span className="rapport-letter">{letters[i]}</span>
            <input
              type="text"
              value={titel}
              placeholder="Titel, bijv. Constructieoverzicht"
              aria-label={`Titel van bijlage ${letters[i]}`}
              onChange={(e) => zet(`bijlagen.${i}`, e.target.value)}
            />
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
              disabled={i === bijlagen.length - 1}
              onClick={() => wijzig((l) => verplaatst(l, i, 1))}
            >
              ↓
            </button>
            <button
              type="button"
              className="rapport-icoon"
              title="Bijlage verwijderen"
              onClick={() => wijzig((l) => l.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="rapport-knop" onClick={() => wijzig((l) => [...l, ""])}>
        + Bijlage toevoegen
      </button>
    </Sectie>
  );
}
