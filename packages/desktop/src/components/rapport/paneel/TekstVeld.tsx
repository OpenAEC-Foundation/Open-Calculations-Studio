import { useEffect, useRef, useState, type ReactNode } from "react";
import { INVULVELDEN, type Invulwaarden } from "../../../rapport/invullen";
import { STANDAARD_TEKSTEN, type Tekstvariant } from "../../../rapport/standaardteksten";
import { useBureauStore } from "../../../store/bureauProfiel";
import { useProjectStore } from "../../../store/projectStore";
import { uittreksel } from "./hulp";
import { GroeiVeld } from "./velden";

const GEEN: readonly Tekstvariant[] = [];

/**
 * Eén tekstonderdeel van het rapport (rapport.teksten[id]) met zijn
 * standaardteksten.
 *
 * "Standaardtekst ▾" toont de meegeleverde varianten en de eigen varianten
 * uit de instellingen. Kiezen vervangt de tekst; staat er al iets anders,
 * dan vraagt het eerst om bevestiging. Het vervangen is één eigen stap in
 * ongedaan maken. "Bewaar als eigen variant" legt de tekst van nu vast onder
 * een naam, voor dit onderdeel in elk volgend rapport.
 */
export default function TekstVeld({ id, kop, hint, placeholder }: {
  /** Tekst-id uit de opzet, tevens de sleutel in rapport.teksten. */
  id: string;
  /** Links van de knoppen; meestal een <Kop>. */
  kop?: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
}) {
  const tekst = useProjectStore((s) => s.rapport.teksten[id] ?? "");
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const werkBij = useProjectStore((s) => s.werkRapportBij);
  const eigen = useBureauStore((s) => s.eigenTeksten[id] ?? GEEN);
  const voegTekstToe = useBureauStore((s) => s.voegTekstToe);
  const verwijderTekst = useBureauStore((s) => s.verwijderTekst);
  const meegeleverd = STANDAARD_TEKSTEN[id] ?? GEEN;

  const [menuOpen, setMenuOpen] = useState(false);
  /** Naam voor een nieuwe eigen variant; null zolang dat regeltje dicht is. */
  const [variantNaam, setVariantNaam] = useState<string | null>(null);
  const [melding, setMelding] = useState("");
  const knoppenRef = useRef<HTMLDivElement>(null);

  // Een klik buiten het menu of Escape sluit het.
  useEffect(() => {
    if (!menuOpen) return;
    const klik = (e: MouseEvent) => {
      if (!knoppenRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const toets = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", toets);
    };
  }, [menuOpen]);

  /** Vervangt de tekst na bevestiging, als je er iets anders mee kwijtraakt. */
  const vervang = (nieuw: string, vraag: string) => {
    const huidig = tekst.trim();
    if (huidig !== "" && huidig !== nieuw.trim() && !confirm(vraag)) return;
    werkBij((r) => ({ ...r, teksten: { ...r.teksten, [id]: nieuw } }));
    setMenuOpen(false);
    setMelding("");
  };

  const bewaar = () => {
    const label = (variantNaam ?? "").trim();
    if (label === "" || tekst.trim() === "") return;
    voegTekstToe(id, { label, tekst });
    setVariantNaam(null);
    setMelding(`Bewaard als eigen variant "${label}"; te kiezen onder Standaardtekst.`);
  };

  const variant = (v: Tekstvariant, sleutel: string) => (
    <button
      key={sleutel}
      type="button"
      role="menuitem"
      className="rapport-menu-item"
      title={v.tekst}
      onClick={() => vervang(v.tekst, `De huidige tekst vervangen door "${v.label}"?`)}
    >
      <span className="rapport-menu-label">{v.label}</span>
      <span className="rapport-menu-uittreksel">{uittreksel(v.tekst)}</span>
    </button>
  );

  return (
    <div className="rapport-tekstveld">
      <div className="rapport-tekst-balk">
        {kop}
        <div className="rapport-tekst-knoppen" ref={knoppenRef}>
          <button
            type="button"
            className="rapport-knop"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setMelding("");
            }}
          >
            Standaardtekst ▾
          </button>
          <button
            type="button"
            className="rapport-knop"
            disabled={tekst.trim() === ""}
            title="Deze tekst bewaren in de instellingen, om hem in elk rapport te kunnen kiezen"
            onClick={() => {
              setVariantNaam(`Eigen variant ${eigen.length + 1}`);
              setMenuOpen(false);
              setMelding("");
            }}
          >
            Bewaar als eigen variant
          </button>
          {menuOpen && (
            <div className="rapport-menu" role="menu">
              {meegeleverd.length > 0 && <div className="rapport-menu-groep">Meegeleverd</div>}
              {meegeleverd.map((v, i) => variant(v, `m${i}`))}
              {eigen.length > 0 && <div className="rapport-menu-groep">Eigen varianten</div>}
              {eigen.map((v, i) => (
                <div className="rapport-menu-regel" key={`e${i}`}>
                  {variant(v, `e${i}`)}
                  <button
                    type="button"
                    className="rapport-icoon"
                    title="Eigen variant verwijderen"
                    onClick={() => {
                      if (confirm(`Eigen variant "${v.label}" verwijderen?`)) verwijderTekst(id, i);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {meegeleverd.length === 0 && eigen.length === 0 && (
                <div className="rapport-menu-leeg">Nog geen varianten voor dit onderdeel.</div>
              )}
              <div className="rapport-menu-scheiding" />
              <button
                type="button"
                role="menuitem"
                className="rapport-menu-item"
                disabled={tekst === ""}
                onClick={() => vervang("", "De tekst van dit onderdeel leegmaken?")}
              >
                <span className="rapport-menu-label">Leegmaken</span>
                <span className="rapport-menu-uittreksel">
                  Een leeg optioneel onderdeel valt weg uit het rapport.
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
      <GroeiVeld waarde={tekst} onChange={(v) => zet(`teksten.${id}`, v)} placeholder={placeholder} />
      {variantNaam !== null && (
        <div className="rapport-bewaar">
          <input
            type="text"
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            value={variantNaam}
            placeholder="Naam van de variant"
            onChange={(e) => setVariantNaam(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") bewaar();
              if (e.key === "Escape") setVariantNaam(null);
            }}
          />
          <button
            type="button"
            className="rapport-knop rapport-knop-primair"
            disabled={variantNaam.trim() === ""}
            onClick={bewaar}
          >
            Bewaar
          </button>
          <button type="button" className="rapport-knop" onClick={() => setVariantNaam(null)}>
            Annuleer
          </button>
        </div>
      )}
      {melding && <span className="rapport-melding">{melding}</span>}
      {hint && <span className="rapport-hint">{hint}</span>}
    </div>
  );
}

/**
 * De invulvelden die een tekst kan gebruiken. Met de muis erop zie je wat er
 * nu in het rapport komt te staan.
 */
export function Invulvelden() {
  const gegevens = useProjectStore((s) => s.gegevens);
  const rapport = useProjectStore((s) => s.rapport);
  const projectNaam = useProjectStore((s) => s.projectNaam);
  const profielNaam = useBureauStore((s) => s.profiel.naam);
  // Zelfde bronnen als bij het opmaken: projectgegevens, documentgegevens en
  // het bureau — het vastgelegde, of zolang dat leeg is het profiel.
  const waarden: Invulwaarden = {
    adviseur: rapport.bureau.naam || profielNaam,
    projectnummer: gegevens.project_nummer ?? "",
    projectnaam: gegevens.project_naam || projectNaam,
    opdrachtgever: gegevens.opdrachtgever ?? "",
    locatie: gegevens.locatie ?? "",
    verantwoordelijk: rapport.verantwoordelijk,
    uitvoerend: rapport.uitvoerend,
  };
  return (
    <div className="rapport-invulvelden">
      <span className="rapport-label">Invulvelden</span>
      <span className="rapport-invulvelden-lijst">
        {INVULVELDEN.map((v) => (
          <code key={v} title={waarden[v] ? `Nu: ${waarden[v]}` : 'Nu leeg: in het rapport komt "—"'}>
            {`{${v}}`}
          </code>
        ))}
      </span>
      <span className="rapport-hint">
        Een invulveld wordt in het rapport vervangen door zijn waarde; een leeg veld wordt "—". Een regel
        die met "-" begint is een opsommingsregel, een lege regel begint een nieuwe alinea.
      </span>
    </div>
  );
}
