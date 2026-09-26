import { FASEN, type Fase } from "../../../rapport/model";
import { useBureauStore } from "../../../store/bureauProfiel";
import { useProjectStore } from "../../../store/projectStore";
import { Afgeleid, Keuze, Sectie, TekstVak, Veld, useRapport, type Optie } from "./velden";

/** Suggesties voor de rapporttitel; een eigen titel typen kan altijd. */
const TITELS = [
  "Constructieadvies & berekeningen",
  "Constructieve berekening",
  "Constructief advies",
  "Constructieve berekeningen en tekeningen",
  "Beoordeling bestaande constructie",
];

const FASE_NAMEN: Record<Fase, string> = {
  "": "niet vermelden",
  SO: "schetsontwerp",
  VO: "voorlopig ontwerp",
  DO: "definitief ontwerp",
  TO: "technisch ontwerp",
  UO: "uitvoeringsontwerp",
};

const FASE_OPTIES: Optie[] = [
  { waarde: "", label: "— (niet vermelden)" },
  ...FASEN.map((f) => ({ waarde: f, label: `${f} — ${FASE_NAMEN[f]}` })),
];

/**
 * Sectie Document: wat op het voorblad staat en niet al in de
 * projectgegevens zit.
 */
export default function DocumentSectie() {
  const rapport = useRapport();
  const gegevens = useProjectStore((s) => s.gegevens);
  const profiel = useBureauStore((s) => s.profiel);

  // Zelfde bureau als op papier: het vastgelegde, of zolang dat leeg is het profiel.
  const bureau = rapport.bureau.naam ? rapport.bureau : profiel;
  const namen = bureau.constructeurs.map((c) => c.naam.trim()).filter((n) => n !== "");
  const constructeurs: Optie[] = [
    { waarde: "", label: "—" },
    ...namen.map((n) => ({ waarde: n, label: n })),
  ];

  return (
    <Sectie
      id="document"
      titel="Document"
      intro="Wat op het voorblad staat. Projectnummer, projectnaam, opdrachtgever en locatie komen uit de projectgegevens."
    >
      <Veld
        label="Titel"
        pad="titel"
        waarde={rapport.titel}
        lijst="rapport-titels"
        hint="Kies een suggestie of typ een eigen titel. De projectnaam komt eronder als ondertitel."
      />
      <datalist id="rapport-titels">
        {TITELS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <div className="rapport-rij">
        <Veld label="Documentkenmerk" pad="kenmerk" waarde={rapport.kenmerk} placeholder="bijv. 2026-001-C01" />
        <Keuze label="Fase in bouwproces" pad="fase" waarde={rapport.fase} opties={FASE_OPTIES} />
      </div>
      <Veld label="Toegepaste normen" pad="normen" waarde={rapport.normen} />
      <div className="rapport-rij">
        <Keuze
          label="Verantwoordelijk constructeur"
          pad="verantwoordelijk"
          waarde={rapport.verantwoordelijk}
          opties={constructeurs}
        />
        <Keuze
          label="Uitvoerend constructeur"
          pad="uitvoerend"
          waarde={rapport.uitvoerend}
          opties={constructeurs}
        />
      </div>
      {namen.length === 0 && (
        <p className="rapport-hint">
          Dit rapport heeft nog geen constructeurs. Vul ze in bij Instellingen → Bureau en werk het
          rapport bij in de sectie Bureau onderaan.
        </p>
      )}
      <label className="rapport-veld">
        <span className="rapport-label">Adresregels opdrachtgever</span>
        <TekstVak
          pad="opdrachtgeverAdres"
          waarde={rapport.opdrachtgeverAdres}
          placeholder={"Straat en huisnummer\nPostcode en plaats"}
        />
        <span className="rapport-hint">
          Eén adresregel per regel; ze komen op het voorblad onder de naam van de opdrachtgever.
        </span>
      </label>
      <Afgeleid
        uitProjectgegevens
        regels={[
          { label: "Projectnummer", waarde: gegevens.project_nummer || "—" },
          { label: "Projectnaam", waarde: gegevens.project_naam || "—" },
          { label: "Opdrachtgever", waarde: gegevens.opdrachtgever || "—" },
          { label: "Locatie", waarde: gegevens.locatie || "—" },
        ]}
      />
    </Sectie>
  );
}
