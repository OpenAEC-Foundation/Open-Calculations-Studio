import { REVISIE_STATUSSEN, type Revisie } from "../../../rapport/model";
import { datumTekst, rapportStatus, volgendeCode } from "../../../rapport/revisies";
import RijenTabel, { type Kolom } from "./RijenTabel";
import { Sectie, useRapport } from "./velden";

const KOLOMMEN: Kolom<Revisie>[] = [
  { sleutel: "code", kop: "Revisie", breedte: "5em" },
  { sleutel: "datum", kop: "Datum", breedte: "8.5em", placeholder: "dd-mm-jjjj" },
  { sleutel: "omschrijving", kop: "Omschrijving" },
  {
    sleutel: "status",
    kop: "Status",
    breedte: "9.5em",
    keuzes: REVISIE_STATUSSEN.map((s) => ({ waarde: s, label: s })),
  },
];

/** Een nieuwe revisie: de volgende code (A → B, 1 → 2) en de datum van vandaag. */
function nieuweRevisie(lijst: readonly Revisie[]): Revisie {
  return {
    code: volgendeCode([...lijst]),
    datum: datumTekst(new Date()),
    omschrijving: "",
    status: "concept",
  };
}

/**
 * Sectie Revisies. De eerste revisie geeft de eerste datum van het rapport,
 * de laatste de rapportstatus; beide staan op het voorblad.
 */
export default function RevisieSectie() {
  const revisies = useRapport().revisies;
  const status = rapportStatus(revisies);
  return (
    <Sectie
      id="revisies"
      titel="Revisies"
      intro="De eerste revisie geeft de 1ᵉ datum van het rapport, elke latere een regel Datum wijz. De laatste revisie bepaalt de rapportstatus op het voorblad."
    >
      <RijenTabel<Revisie>
        pad="revisies"
        rijen={revisies}
        kolommen={KOLOMMEN}
        verplaatsbaar={false}
        nieuweRij={nieuweRevisie}
        toevoegen="Revisie toevoegen"
        leeg="Nog geen revisies: het voorblad laat datum en status dan leeg."
      />
      <p className="rapport-hint">
        Rapportstatus: <strong>{status || "—"}</strong>
      </p>
    </Sectie>
  );
}
