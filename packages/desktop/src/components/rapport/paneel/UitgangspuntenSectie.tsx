import type {
  Bevestigingsregel,
  Conserveringsregel,
  Materiaalregel,
  Vervormingsregel,
} from "../../../rapport/model";
import {
  beta,
  fmt,
  getal,
  inspectieniveau,
  klasse,
  levensduurklasse,
  normVoorBouwjaar,
  ontwerpSupervisie,
} from "../../../rapport/normwaarden";
import { kFiVoor, projectWaarde } from "../../../store/projectGegevens";
import { useProjectStore } from "../../../store/projectStore";
import RijenTabel, { type Kolom } from "./RijenTabel";
import TekstVeld from "./TekstVeld";
import { Afgeleid, Keuze, Kop, Sectie, TekstVak, Veld, Vink, useRapport, type Optie } from "./velden";

/** Suggesties voor 4.1; eigen tekst kan altijd. */
const SOORTEN = [
  "Woning",
  "Eengezinswoning",
  "Appartementencomplex",
  "Villa",
  "Kantoor",
  "Bedrijfshal",
  "Bijgebouw",
  "Schuur",
];

const JA_NEE: Optie[] = [
  { waarde: "Ja", label: "Ja" },
  { waarde: "Nee", label: "Nee" },
];

const MATERIAAL_KOLOMMEN: Kolom<Materiaalregel>[] = [
  { sleutel: "type", kop: "Materiaaltype", breedte: "30%" },
  { sleutel: "soort", kop: "Soort / sterkteklasse", breedte: "24%" },
  { sleutel: "opmerking", kop: "Opmerking" },
];

const BEVESTIGING_KOLOMMEN: Kolom<Bevestigingsregel>[] = [
  { sleutel: "type", kop: "Bevestigingsmiddel", breedte: "55%" },
  { sleutel: "kwaliteit", kop: "Kwaliteit" },
];

const CONSERVERING_KOLOMMEN: Kolom<Conserveringsregel>[] = [
  { sleutel: "onderdeel", kop: "Onderdeel", breedte: "45%" },
  { sleutel: "systeem", kop: "Systeem" },
];

const VERVORMING_KOLOMMEN: Kolom<Vervormingsregel>[] = [
  { sleutel: "onderdeel", kop: "Onderdeel" },
  { sleutel: "ueind", kop: <>u<sub>eind</sub></>, breedte: "7.5em" },
  { sleutel: "ubij", kop: <>u<sub>bij</sub></>, breedte: "7.5em" },
  { sleutel: "uhor", kop: <>u<sub>hor</sub></>, breedte: "7.5em" },
];

/** Tekstonderdelen van hoofdstuk 4 na de vervormingen. */
const SLOTTEKSTEN = ["montage", "rekenprogrammatuur", "temperatuur", "aardbeving"];

/**
 * Sectie Uitgangspunten (hoofdstuk 4). Invoer die alleen in het rapport
 * bestaat staat hier; CC, RC, ontwerplevensduur en wat daaruit volgt staan
 * grijs, want die komen uit de projectgegevens en de norm.
 */
export default function UitgangspuntenSectie() {
  const u = useRapport().uitgangspunten;
  const gegevens = useProjectStore((s) => s.gegevens);

  const cc = klasse(gegevens.CC, 2);
  const rc = klasse(gegevens.RC, 2);
  const jaren = getal(projectWaarde(gegevens, "DesignLife"));
  const bouwjaar = getal(u.bestaand.bouwjaar);

  return (
    <Sectie
      id="uitgangspunten"
      titel="Uitgangspunten"
      hoofdstuk="uitgangspunten"
      intro="Grijze waarden volgen uit de projectgegevens en de norm; ze worden bij het opmaken berekend en niet opgeslagen."
    >
      <div className="rapport-knoop">
        <Kop id="bouwwerk" />
        <Veld
          label="Soort bouwwerk"
          pad="uitgangspunten.soortBouwwerk"
          waarde={u.soortBouwwerk}
          lijst="rapport-soorten"
          hint="Kies uit de lijst of typ een eigen omschrijving."
        />
        <datalist id="rapport-soorten">
          {SOORTEN.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <Afgeleid
          uitProjectgegevens
          regels={[
            { label: "Gevolgklasse", waarde: `CC${cc}` },
            { label: "Betrouwbaarheidsklasse", waarde: `RC${rc}` },
            {
              label: "Ontwerplevensduur",
              waarde: Number.isFinite(jaren)
                ? `${fmt(jaren, 0)} jaar — klasse ${levensduurklasse(jaren)}`
                : "—",
              bron: "tabel NB.1–2.1",
            },
            { label: "Betrouwbaarheidsindex β", waarde: fmt(beta(rc), 1), bron: "tabel B2, 50 jaar" },
            { label: <>K<sub>FI</sub></>, waarde: fmt(kFiVoor(cc), 2), bron: "tabel B3" },
            {
              label: "Ontwerp- en berekeningssupervisie",
              waarde: ontwerpSupervisie(rc),
              bron: "tabel B4",
            },
            { label: "Inspectieniveau", waarde: inspectieniveau(rc), bron: "tabel B5" },
          ]}
        />
      </div>

      <div className="rapport-knoop">
        <Kop id="brand" />
        <div className="rapport-rij">
          <Veld
            label="Hoofddraagconstructie"
            pad="uitgangspunten.brand.hoofddraagconstructie"
            waarde={u.brand.hoofddraagconstructie}
            eenheid="min"
          />
          <Veld
            label="Brandscheiding"
            pad="uitgangspunten.brand.brandscheiding"
            waarde={u.brand.brandscheiding}
            eenheid="min"
          />
          <Veld
            label="Vluchtroute"
            pad="uitgangspunten.brand.vluchtroute"
            waarde={u.brand.vluchtroute}
            eenheid="min"
          />
        </div>
        <Veld
          label="Verwijzing"
          pad="uitgangspunten.brand.verwijzing"
          waarde={u.brand.verwijzing}
          placeholder="verwijzing naar de regelgeving"
          hint='Staat rechts naast de tabel. Een "-" betekent: geen eis.'
        />
      </div>

      <div className="rapport-knoop">
        <Kop id="materialen" />
        <RijenTabel<Materiaalregel>
          pad="uitgangspunten.materialen"
          rijen={u.materialen}
          kolommen={MATERIAAL_KOLOMMEN}
          nieuweRij={() => ({ type: "", soort: "", opmerking: "" })}
          toevoegen="Materiaal toevoegen"
        />
        <Veld label="Slotregel" pad="uitgangspunten.materialenNoot" waarde={u.materialenNoot} />
        <h6 className="rapport-subkop">Bevestigingsmiddelen</h6>
        <RijenTabel<Bevestigingsregel>
          pad="uitgangspunten.bevestiging"
          rijen={u.bevestiging}
          kolommen={BEVESTIGING_KOLOMMEN}
          nieuweRij={() => ({ type: "", kwaliteit: "" })}
          toevoegen="Bevestigingsmiddel toevoegen"
        />
      </div>

      <div className="rapport-knoop">
        <Kop id="conservering" />
        <RijenTabel<Conserveringsregel>
          pad="uitgangspunten.conservering"
          rijen={u.conservering}
          kolommen={CONSERVERING_KOLOMMEN}
          nieuweRij={() => ({ onderdeel: "", systeem: "" })}
          toevoegen="Regel toevoegen"
        />
        <label className="rapport-veld">
          <span className="rapport-label">Slotzin</span>
          <TekstVak pad="uitgangspunten.conserveringSlot" waarde={u.conserveringSlot} rijen={1} />
        </label>
      </div>

      <div className="rapport-knoop">
        <Kop id="factoren" />
        <p className="rapport-hint">
          De belastingfactoren en -combinaties volgen uit gevolgklasse CC{cc} volgens de tabellen NB.3,
          NB.4 en NB.5 van NEN-EN 1990. Hier is niets in te vullen; het afdrukvoorbeeld toont de tabel.
        </p>
      </div>

      <div className="rapport-knoop">
        <Kop id="bestaand-situatie" />
        <Vink
          label="Bestaande situatie opnemen"
          pad="uitgangspunten.bestaand.opnemen"
          aan={u.bestaand.opnemen}
          hint="Uit bij nieuwbouw: de paragraaf valt dan weg en de nummering schuift door."
        />
        {u.bestaand.opnemen && (
          <>
            <div className="rapport-rij">
              <Veld
                label="Bouwjaar"
                pad="uitgangspunten.bestaand.bouwjaar"
                waarde={u.bestaand.bouwjaar}
                placeholder="bijv. 1965"
              />
              <Veld
                label="Bron"
                pad="uitgangspunten.bestaand.bron"
                waarde={u.bestaand.bron}
                placeholder="bijv. archieftekeningen"
              />
            </div>
            <Afgeleid
              regels={[
                {
                  label: "Norm uit het bouwjaar",
                  waarde: Number.isFinite(bouwjaar) ? normVoorBouwjaar(bouwjaar) : "— (vul het bouwjaar in)",
                },
              ]}
            />
            <div className="rapport-rij">
              <Keuze
                label="Bestaande berekening beschikbaar"
                pad="uitgangspunten.bestaand.berekeningBeschikbaar"
                waarde={u.bestaand.berekeningBeschikbaar}
                opties={JA_NEE}
              />
              <Keuze
                label="Materiaalgegevens beschikbaar"
                pad="uitgangspunten.bestaand.materiaalgegevensBeschikbaar"
                waarde={u.bestaand.materiaalgegevensBeschikbaar}
                opties={JA_NEE}
              />
            </div>
          </>
        )}
      </div>

      <div className="rapport-knoop">
        <TekstVeld id="trillingen" kop={<Kop id="trillingen" />} />
      </div>

      <div className="rapport-knoop">
        <TekstVeld id="vervormingen" kop={<Kop id="vervormingen" />} hint="De inleidende zin boven de tabel." />
        <RijenTabel<Vervormingsregel>
          pad="uitgangspunten.vervormingen"
          rijen={u.vervormingen}
          kolommen={VERVORMING_KOLOMMEN}
          nieuweRij={() => ({ onderdeel: "", ueind: "", ubij: "", uhor: "" })}
          toevoegen="Eis toevoegen"
        />
        <p className="rapport-hint">
          Schrijf een eis als 0,004l_rep, H/300 of &lt; 20 mm; "_rep" komt in de afdruk als subscript. Een
          lege cel betekent: geen eis in die kolom.
        </p>
      </div>

      {SLOTTEKSTEN.map((id) => (
        <div className="rapport-knoop" key={id}>
          <TekstVeld id={id} kop={<Kop id={id} />} />
        </div>
      ))}
    </Sectie>
  );
}
