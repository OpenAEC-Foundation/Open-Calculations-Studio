import { useMemo } from "react";
import type { Huisstijl } from "../../../rapport/model";
import { useBureauStore } from "../../../store/bureauProfiel";
import { useProjectStore } from "../../../store/projectStore";
import { adresRegel, lettertypeNaam, zelfdeBureau } from "./hulp";
import { Sectie } from "./velden";

const KLEUREN: readonly [sleutel: Exclude<keyof Huisstijl, "lettertype">, label: string][] = [
  ["hoofdkleur", "hoofdkleur"],
  ["accentkleur", "accent"],
  ["tabeltekst", "tabeltekst"],
  ["invoerkleur", "invoer"],
];

/**
 * Sectie Bureau: de kopie van het bureauprofiel die in dit rapport is
 * vastgelegd.
 *
 * Een rapport bewaart zijn eigen kopie, zodat een uitgebracht rapport niet
 * verandert als het profiel later wijzigt (een nieuw logo, een constructeur
 * die vertrekt). Bijwerken is een bewuste stap, en één stap in ongedaan
 * maken.
 */
export default function BureauSectie() {
  const bureau = useProjectStore((s) => s.rapport.bureau);
  const werkBij = useProjectStore((s) => s.werkRapportBij);
  const profiel = useBureauStore((s) => s.profiel);

  const gelijk = useMemo(() => zelfdeBureau(bureau, profiel), [bureau, profiel]);
  const vastgelegd = bureau.naam.trim() !== "";
  const profielIngevuld = profiel.naam.trim() !== "";

  const bijwerken = () => {
    if (vastgelegd && !confirm("De bureaugegevens van dit rapport bijwerken uit het huidige bureauprofiel?")) {
      return;
    }
    werkBij((r) => ({ ...r, bureau: structuredClone(profiel) }));
  };

  let melding: string;
  if (!vastgelegd && !profielIngevuld) {
    melding = "Er is nog geen bureauprofiel. Vul het in bij Instellingen → Bureau en werk dit rapport hier bij.";
  } else if (!vastgelegd) {
    melding =
      "Dit rapport heeft nog geen vastgelegde bureaugegevens; de afdruk gebruikt zolang het bureauprofiel uit de instellingen.";
  } else if (!profielIngevuld) {
    melding = "Het bureauprofiel in de instellingen is leeg; dit rapport houdt zijn vastgelegde gegevens.";
  } else if (gelijk) {
    melding = "Gelijk aan het bureauprofiel in de instellingen.";
  } else {
    melding =
      "Het bureauprofiel in de instellingen wijkt af van wat in dit rapport is vastgelegd. Bijwerken werkt alleen dit rapport bij.";
  }

  return (
    <Sectie
      id="bureau"
      titel="Bureau"
      intro="De bureaugegevens en huisstijl zoals ze in dit rapport zijn vastgelegd."
    >
      <p className={`rapport-melding-blok${vastgelegd && gelijk ? " rustig" : ""}`}>{melding}</p>

      {vastgelegd && (
        <div className="rapport-bureau">
          <dl>
            <dt>Naam</dt>
            <dd>{bureau.naam}</dd>
            <dt>Adres</dt>
            <dd>{adresRegel(bureau) || "—"}</dd>
            <dt>Telefoon</dt>
            <dd>{bureau.telefoon || "—"}</dd>
            <dt>E-mail</dt>
            <dd>{bureau.email || "—"}</dd>
            <dt>Constructeurs</dt>
            <dd>
              {bureau.constructeurs.length === 0 ? (
                "—"
              ) : (
                <ul>
                  {bureau.constructeurs.map((c, i) => (
                    <li key={i}>{[c.naam, c.telefoon, c.email].filter((s) => s.trim() !== "").join(" · ")}</li>
                  ))}
                </ul>
              )}
            </dd>
            <dt>Huisstijl</dt>
            <dd>
              <span className="rapport-kleuren">
                {KLEUREN.map(([sleutel, label]) => (
                  <span className="rapport-kleur" key={sleutel}>
                    <span className="rapport-staal" style={{ background: bureau.huisstijl[sleutel] }} />
                    {label}
                  </span>
                ))}
              </span>
              <span className="rapport-lettertype" style={{ fontFamily: bureau.huisstijl.lettertype }}>
                {lettertypeNaam(bureau.huisstijl.lettertype) || "—"}
              </span>
            </dd>
          </dl>
          {bureau.logo ? (
            <img className="rapport-beeld" src={bureau.logo} alt="Logo" />
          ) : (
            <span className="rapport-hint">geen logo</span>
          )}
        </div>
      )}
      {vastgelegd && bureau.voetafbeelding && (
        <img className="rapport-voetbeeld" src={bureau.voetafbeelding} alt="Voetafbeelding" />
      )}

      <button
        type="button"
        className="rapport-knop rapport-knop-primair"
        disabled={!profielIngevuld || gelijk}
        onClick={bijwerken}
      >
        Bijwerken uit bureauprofiel
      </button>
    </Sectie>
  );
}
