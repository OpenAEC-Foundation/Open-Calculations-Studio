import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import RibbonButtonStack from "./RibbonButtonStack";
import {
  newDocIcon,
  openFolderIcon,
  saveDiskIcon,
  undoIcon,
  redoIcon,
  imageIcon,
  pdfIcon,
} from "./calcIcons";
import {
  parse,
  evaluate,
  generateProjectIfcx,
  type EvaluatedNode,
  type IfcCalcSheet,
} from "@ifc-calc/core";
import { useProjectStore } from "../../store/projectStore";
import { projectScope } from "../../store/projectGegevens";
import { bouwProjectBestand, leesProjectBestand, PROJECT_FORMAAT_VERSIE } from "../../store/projectBestand";
import { useAfdrukken, usePrintStore } from "../../store/printStore";
import { openCalculationFile, saveCalculationFile } from "../../tauri/fileOps";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import { useRecentFiles } from "../../hooks/useRecentFiles";

interface CalcTabProps {
  onSettingsClick?: () => void;
}

export default function CalcTab({ onSettingsClick: _onSettingsClick }: CalcTabProps) {
  const { t } = useTranslation("ribbon");
  const projectNaam = useProjectStore((s) => s.projectNaam);
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const gegevens = useProjectStore((s) => s.gegevens);
  const laadProject = useProjectStore((s) => s.laadProject);
  const nieuwProject = useProjectStore((s) => s.nieuwProject);
  const ongedaan = useProjectStore((s) => s.ongedaan);
  const opnieuw = useProjectStore((s) => s.opnieuw);
  const kanOngedaan = useProjectStore((s) => s.verleden.length > 0);
  const kanOpnieuw = useProjectStore((s) => s.toekomst.length > 0);
  const afdrukken = useAfdrukken();
  const toonVoorbeeld = usePrintStore((s) => s.toonVoorbeeld);
  const { addRecentFile } = useRecentFiles();

  const handleOpen = useCallback(async () => {
    try {
      const file = await openCalculationFile();
      if (!file) return;
      laadProject(leesProjectBestand(file.raw, file.name));
      useProjectStore.getState().markeerOpgeslagen(file.path);
      await addRecentFile({
        path: file.path,
        name: file.name,
        type: "report",
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Open file failed:", err);
      alert(`Bestand openen mislukt: ${(err as Error).message}`);
    }
  }, [laadProject, addRecentFile]);

  /**
   * Elk blad apart doorrekenen voor de IFC-kant van het bestand: met de
   * projectgegevens als startwaarden en de eigen invoer van dát exemplaar.
   * Twee bladen van dezelfde module lopen hier dus langs elkaar heen.
   *
   * Een blad dat omvalt levert lege knopen op en dus geen elementen; de fout
   * gaat naar de console. In de afdruk zie je hem wél, daar staat de melding
   * op de plek van het blad zelf.
   */
  const evalueerAlles = useCallback((): IfcCalcSheet[] => {
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
  }, [exemplaren, gegevens]);

  const handleSave = useCallback(async () => {
    try {
      // Het bestand blijft een geldig IFCX-document. De IFC-kant beschrijft het
      // héle project — alle bladen in één ruimtelijke boom — want binnen het
      // OpenAEC-ecosysteem is IFCX de drager waarmee de gereedschappen data
      // uitwisselen. Eén blad exporteren zou de rest van de keten de andere
      // bladen onthouden.
      const ifcBladen = evalueerAlles();
      const ifcx =
        ifcBladen.length > 0 ? generateProjectIfcx(ifcBladen, { projectName: projectNaam }) : null;
      const payload = bouwProjectBestand(
        {
          versie: PROJECT_FORMAAT_VERSIE,
          naam: projectNaam,
          gegevens,
          exemplaren,
        },
        ifcx,
      );
      const path = await saveCalculationFile(payload, projectNaam);
      if (path) {
        useProjectStore.getState().markeerOpgeslagen(path);
      }
    } catch (err) {
      console.error("Save file failed:", err);
      alert(`Bestand opslaan mislukt: ${(err as Error).message}`);
    }
  }, [evalueerAlles, projectNaam, gegevens, exemplaren]);

  const handleNew = useCallback(() => {
    if (useProjectStore.getState().dirty) {
      const ok = confirm("Niet-opgeslagen wijzigingen worden weggegooid. Doorgaan?");
      if (!ok) return;
    }
    nieuwProject();
  }, [nieuwProject]);

  /**
   * Afdrukken via de browser, niet via de rapportengine.
   *
   * `documentToReport` (de weg naar de Rust-engine) slaat svg- en image-knopen
   * over, dus daar komt geen enkele tekening uit. Bovendien is die engine een
   * pad-afhankelijkheid naar de `openaec-reports`-repo; zonder die repo is de
   * app niet eens te bouwen. Deze weg print exact wat de uitwerking toont —
   * formules, tekeningen en afbeeldingen — en in de printdialoog kies je
   * "Opslaan als PDF". Zie docs/backlog.md.
   */
  const handlePrint = useCallback(() => {
    if (useProjectStore.getState().exemplaren.length === 0) {
      alert("Dit project bevat nog geen rekenbladen.");
      return;
    }
    afdrukken();
  }, [afdrukken]);

  const handleVoorbeeld = useCallback(() => {
    if (useProjectStore.getState().exemplaren.length === 0) {
      alert("Dit project bevat nog geen rekenbladen.");
      return;
    }
    toonVoorbeeld();
  }, [toonVoorbeeld]);

  return (
    <div className="ribbon-content">
      <div className="ribbon-groups">
        <RibbonGroup label={t("calc.file", "Bestand")}>
          <RibbonButton icon={newDocIcon} label={t("calc.new", "Nieuw")} size="large" onClick={handleNew} />
          <RibbonButton icon={openFolderIcon} label={t("calc.browse", "Browse…")} size="large" onClick={handleOpen} />
          <RibbonButton icon={saveDiskIcon} label={t("calc.save", "Opslaan")} size="large" onClick={handleSave} />
        </RibbonGroup>

        <RibbonGroup label={t("calc.edit", "Bewerken")}>
          <RibbonButtonStack>
            <RibbonButton
              icon={undoIcon}
              label={t("calc.undo", "Ongedaan")}
              size="small"
              disabled={!kanOngedaan}
              onClick={ongedaan}
            />
            <RibbonButton
              icon={redoIcon}
              label={t("calc.redo", "Opnieuw")}
              size="small"
              disabled={!kanOpnieuw}
              onClick={opnieuw}
            />
          </RibbonButtonStack>
        </RibbonGroup>

        <RibbonGroup label={t("insert.media", "Media")}>
          <RibbonButton icon={imageIcon} label={t("insert.image", "Afbeelding")} size="large" onClick={() => {}} />
        </RibbonGroup>

        <RibbonGroup label={t("calc.export", "Exporteren")}>
          <RibbonButton
            icon={pdfIcon}
            label={t("calc.preview", "Voorbeeld")}
            size="large"
            onClick={handleVoorbeeld}
          />
          <RibbonButton
            icon={pdfIcon}
            label={t("calc.pdfSave", "PDF opslaan")}
            size="large"
            onClick={handlePrint}
          />
        </RibbonGroup>
      </div>

    </div>
  );
}
