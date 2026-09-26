import { useCallback } from "react";
import {
  parse,
  evaluate,
  generateProjectIfcx,
  type EvaluatedNode,
  type IfcCalcSheet,
} from "@ifc-calc/core";
import { useProjectStore } from "../store/projectStore";
import { projectScope } from "../store/projectGegevens";
import { bouwProjectBestand, leesProjectBestand, PROJECT_FORMAAT_VERSIE } from "../store/projectBestand";
import {
  openCalculationFile,
  saveCalculationFile,
  schrijfCalculationFile,
  kanDirectOpslaan,
} from "../tauri/fileOps";
import { calcpadIncludes, calcpadImageUrls } from "../templates/calcpad-includes";
import { useRecentFiles } from "./useRecentFiles";

/**
 * Elk blad apart doorrekenen voor de IFC-kant van het bestand: met de
 * projectgegevens als startwaarden en de eigen invoer van dát exemplaar.
 * Twee bladen van dezelfde module lopen hier dus langs elkaar heen.
 *
 * Een blad dat omvalt levert lege knopen op en dus geen elementen; de fout
 * gaat naar de console. In de afdruk zie je hem wél, daar staat de melding
 * op de plek van het blad zelf.
 */
function evalueerAlles(): IfcCalcSheet[] {
  const { exemplaren, gegevens } = useProjectStore.getState();
  const scope = projectScope(gegevens);
  return exemplaren.map((ex) => {
    let nodes: EvaluatedNode[] = [];
    try {
      const ast = parse(ex.source, { includes: calcpadIncludes, imageUrls: calcpadImageUrls });
      nodes = evaluate(ast, ex.waarden, scope);
    } catch (err) {
      console.error(`Blad "${ex.naam}" kon niet worden doorgerekend:`, err);
    }
    return { naam: ex.naam, nodes, elementen: ex.elementen };
  });
}

/**
 * Het project zoals het op schijf komt. Het bestand blijft een geldig
 * IFCX-document. De IFC-kant beschrijft het héle project — alle bladen in één
 * ruimtelijke boom — want binnen het OpenAEC-ecosysteem is IFCX de drager
 * waarmee de gereedschappen data uitwisselen. Eén blad exporteren zou de rest
 * van de keten de andere bladen onthouden.
 */
function projectInhoud(): string {
  const { projectNaam, gegevens, exemplaren } = useProjectStore.getState();
  const ifcBladen = evalueerAlles();
  const ifcx =
    ifcBladen.length > 0 ? generateProjectIfcx(ifcBladen, { projectName: projectNaam }) : null;
  return bouwProjectBestand(
    { versie: PROJECT_FORMAAT_VERSIE, naam: projectNaam, gegevens, exemplaren },
    ifcx,
  );
}

function bestandsnaam(pad: string): string {
  return (pad.split(/[/\\]/).pop() ?? pad).replace(/\.[^.]+$/, "");
}

/**
 * Nieuw, openen, opslaan en opslaan als — één set acties voor het lint, het
 * Bestand-menu en de sneltoetsen, zodat die drie niet uit elkaar lopen.
 */
export function useBestandActies() {
  const { addRecentFile } = useRecentFiles();

  const onthoud = useCallback(
    (pad: string) =>
      addRecentFile({ path: pad, name: bestandsnaam(pad), type: "report", timestamp: Date.now() }),
    [addRecentFile],
  );

  const nieuw = useCallback(() => {
    if (useProjectStore.getState().dirty) {
      const ok = confirm("Niet-opgeslagen wijzigingen worden weggegooid. Doorgaan?");
      if (!ok) return;
    }
    useProjectStore.getState().nieuwProject();
  }, []);

  const openen = useCallback(async () => {
    try {
      const file = await openCalculationFile();
      if (!file) return;
      const store = useProjectStore.getState();
      store.laadProject(leesProjectBestand(file.raw, file.name));
      store.markeerOpgeslagen(file.path);
      await onthoud(file.path);
    } catch (err) {
      console.error("Open file failed:", err);
      alert(`Bestand openen mislukt: ${(err as Error).message}`);
    }
  }, [onthoud]);

  /** Altijd met de dialoog: een nieuwe naam of een andere map. */
  const opslaanAls = useCallback(async () => {
    try {
      const { projectNaam, bestandspad } = useProjectStore.getState();
      const pad = await saveCalculationFile(projectInhoud(), projectNaam, bestandspad);
      if (!pad) return;
      useProjectStore.getState().markeerOpgeslagen(pad);
      await onthoud(pad);
    } catch (err) {
      console.error("Save file failed:", err);
      alert(`Bestand opslaan mislukt: ${(err as Error).message}`);
    }
  }, [onthoud]);

  /**
   * Over het geopende bestand heen. Is er nog geen bestand, of een ouder
   * formaat dat je niet ongemerkt wilt overschrijven, dan wordt het
   * "opslaan als".
   */
  const opslaan = useCallback(async () => {
    const pad = useProjectStore.getState().bestandspad;
    if (!kanDirectOpslaan(pad)) return opslaanAls();
    try {
      await schrijfCalculationFile(pad, projectInhoud());
      useProjectStore.getState().markeerOpgeslagen(pad);
    } catch (err) {
      console.error("Save file failed:", err);
      alert(`Bestand opslaan mislukt: ${(err as Error).message}`);
    }
  }, [opslaanAls]);

  return { nieuw, openen, opslaan, opslaanAls };
}
