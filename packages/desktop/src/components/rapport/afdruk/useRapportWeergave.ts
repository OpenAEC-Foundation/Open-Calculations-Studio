import { useMemo } from "react";
import { useProjectStore, type Exemplaar } from "../../../store/projectStore";
import { useBureauStore } from "../../../store/bureauProfiel";
import { projectScope, type ProjectGegevens } from "../../../store/projectGegevens";
import type { BureauProfiel, Rapport } from "../../../rapport/model";
import {
  bijlagen as bijlagenVan,
  bouwOpzet,
  inhoudsopgave,
  type Bijlage,
  type Inhoudsregel,
  type Rapportknoop,
} from "../../../rapport/opzet";
import type { Invulwaarden } from "../../../rapport/invullen";
import { rekenBladDoor, zorgVoorKernstijlen } from "../../calc/bladDoorrekenen";
import type { Resultaat } from "../../calc/bladResultaat";

/*
 * Alles wat de afdruk van het rapport nodig heeft, op één plek verzameld.
 *
 * Het afdrukvoorbeeld en de echte afdruk renderen allebei <RapportAfdruk />,
 * en die leest alleen via deze hook. Zo kunnen de twee niet uiteenlopen: wat
 * je in het voorbeeld ziet, is wat er op papier komt.
 */

/** Eén blad van het project, doorgerekend. */
export interface RapportBlad {
  ex: Exemplaar;
  html: string;
  resultaat: Resultaat;
}

export interface RapportWeergave {
  rapport: Rapport;
  gegevens: ProjectGegevens;
  projectNaam: string;
  /** Het bureau dat op het rapport staat (zie useRapportBureau). */
  bureau: BureauProfiel;
  /** Alle bladen van het project in de volgorde van de projectboom, los van een afdrukselectie. */
  bladen: RapportBlad[];
  /** De hoofdstukindeling van dit rapport: genummerd, zonder wat wegvalt. */
  knopen: Rapportknoop[];
  inhoud: Inhoudsregel[];
  bijlagen: Bijlage[];
  /** Waarden voor de invulvelden in de teksten. */
  invul: Invulwaarden;
}

/**
 * Het bureau van dit rapport.
 *
 * Een rapport draagt een vastgelegde kopie van het bureauprofiel, zodat een
 * opgeleverd rapport niet verandert als het profiel later wijzigt. Zolang die
 * kopie nog leeg is (een nieuw rapport), geldt het profiel uit de
 * instellingen — anders zou een vers rapport zonder bureaunaam en huisstijl
 * op papier komen.
 */
export function useRapportBureau(): BureauProfiel {
  const vastgelegd = useProjectStore((s) => s.rapport.bureau);
  const profiel = useBureauStore((s) => s.profiel);
  return vastgelegd.naam ? vastgelegd : profiel;
}

export function useRapportWeergave(): RapportWeergave {
  const rapport = useProjectStore((s) => s.rapport);
  const gegevens = useProjectStore((s) => s.gegevens);
  const projectNaam = useProjectStore((s) => s.projectNaam);
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const bureau = useRapportBureau();

  zorgVoorKernstijlen();

  // Alle bladen: het rapport kent geen selectie. Een blad dat in het
  // hoofdstuk zelf staat, telt net zo goed mee als een blad in bijlage A.
  const bladen = useMemo(() => {
    const scope = projectScope(gegevens);
    return exemplaren.map((ex) => ({ ex, ...rekenBladDoor(ex, scope) }));
  }, [exemplaren, gegevens]);

  const opzet = useMemo(() => {
    const lijst = exemplaren.map((ex) => ({ id: ex.id, naam: ex.naam }));
    const knopen = bouwOpzet(rapport, lijst);
    return { knopen, inhoud: inhoudsopgave(knopen), bijlagen: bijlagenVan(rapport, lijst) };
  }, [rapport, exemplaren]);

  const invul = useMemo<Invulwaarden>(
    () => ({
      adviseur: bureau.naam,
      projectnummer: gegevens.project_nummer || "",
      projectnaam: gegevens.project_naam || projectNaam,
      opdrachtgever: gegevens.opdrachtgever || "",
      locatie: gegevens.locatie || "",
      verantwoordelijk: rapport.verantwoordelijk,
      uitvoerend: rapport.uitvoerend,
    }),
    [bureau.naam, gegevens, projectNaam, rapport.verantwoordelijk, rapport.uitvoerend],
  );

  return { rapport, gegevens, projectNaam, bureau, bladen, ...opzet, invul };
}
