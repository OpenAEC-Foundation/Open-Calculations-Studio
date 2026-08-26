import { useMemo } from "react";
import { useProjectStore } from "../../store/projectStore";
import { PROJECT_VELDEN, kFiVoor, type VeldDef } from "../../store/projectGegevens";
import "./ProjectGegevensPanel.css";

/**
 * Formulier met de gegevens die voor het héle project gelden.
 *
 * Wat je hier invult werkt door in elk rekenblad — de gevolgklasse vul je één
 * keer in, niet per blad. Alles wat per constructiedeel verschilt (belastingen,
 * afmetingen, materiaal) hoort níét hier maar in het blad zelf, zodat twee
 * exemplaren van dezelfde module elkaar nooit in de weg zitten.
 */
export default function ProjectGegevensPanel() {
  const gegevens = useProjectStore((s) => s.gegevens);
  const zetGegeven = useProjectStore((s) => s.zetGegeven);
  const projectNaam = useProjectStore((s) => s.projectNaam);
  const zetProjectNaam = useProjectStore((s) => s.zetProjectNaam);
  const exemplaren = useProjectStore((s) => s.exemplaren);

  const groepen = useMemo(() => {
    const uit: { naam: string; velden: VeldDef[] }[] = [];
    for (const veld of PROJECT_VELDEN) {
      let groep = uit.find((g) => g.naam === veld.groep);
      if (!groep) {
        groep = { naam: veld.groep, velden: [] };
        uit.push(groep);
      }
      groep.velden.push(veld);
    }
    return uit;
  }, []);

  const cc = parseFloat(gegevens.CC ?? "2");
  const kFi = kFiVoor(Number.isFinite(cc) ? cc : 2);

  return (
    <div className="pg-panel">
      <div className="pg-kop">
        <h1>Projectgegevens</h1>
        <p>
          {exemplaren.length === 0
            ? "Deze waarden gelden voor elk rekenblad dat je aan dit project toevoegt. Elk blad kan ze gebruiken zonder ze opnieuw te vragen."
            : `Deze waarden gelden voor ${exemplaren.length === 1 ? "het rekenblad" : `alle ${exemplaren.length} rekenbladen`} in dit project. Elk blad kan ze gebruiken zonder ze opnieuw te vragen.`}
        </p>
      </div>

      <div className="pg-groep">
        <h2>Bestand</h2>
        <label className="pg-veld">
          <span className="pg-label">Projectnaam (bestand)</span>
          <input
            type="text"
            value={projectNaam}
            placeholder="Nieuw project"
            onChange={(e) => zetProjectNaam(e.target.value)}
          />
          <span className="pg-hint">Naam van het projectbestand en de kop van de PDF-uitdraai.</span>
        </label>
      </div>

      {groepen.map((groep) => (
        <div className="pg-groep" key={groep.naam}>
          <h2>{groep.naam}</h2>
          {groep.velden.map((veld) => (
            <label className="pg-veld" key={veld.naam}>
              <span className="pg-label">
                {veld.label}
                <code className="pg-var">{veld.naam}</code>
              </span>
              {veld.type === "keuze" ? (
                <select
                  value={gegevens[veld.naam] ?? veld.standaard}
                  onChange={(e) => zetGegeven(veld.naam, e.target.value)}
                >
                  {veld.opties?.map((o) => (
                    <option key={o.waarde} value={o.waarde}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={gegevens[veld.naam] ?? ""}
                  onChange={(e) => zetGegeven(veld.naam, e.target.value)}
                />
              )}
              {veld.hint && <span className="pg-hint">{veld.hint}</span>}
              {veld.naam === "CC" && (
                <span className="pg-afgeleid">
                  Afgeleid: K<sub>FI</sub> = {kFi.toFixed(2).replace(".", ",")}
                </span>
              )}
            </label>
          ))}
        </div>
      ))}

      <p className="pg-voet">
        In een rekenblad zijn deze namen direct te gebruiken, bijvoorbeeld{" "}
        <code>γ_G = 1,2·K_FI</code> of <code>#if CC ≡ 3</code>. Een blad dat de naam zelf opnieuw
        toekent, overschrijft de projectwaarde alleen voor dat blad.
      </p>
    </div>
  );
}
