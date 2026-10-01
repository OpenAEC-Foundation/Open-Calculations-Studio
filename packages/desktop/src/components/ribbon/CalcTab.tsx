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
  moduleIcon,
} from "./calcIcons";
import { useProjectStore, RAPPORT_ID } from "../../store/projectStore";
import { usePrintStore } from "../../store/printStore";
import { useBestandActies } from "../../hooks/useBestandActies";
import { useModuleKiezer } from "../../store/moduleKiezer";

interface CalcTabProps {
  onSettingsClick?: () => void;
}

export default function CalcTab({ onSettingsClick: _onSettingsClick }: CalcTabProps) {
  const { t } = useTranslation("ribbon");
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const ongedaan = useProjectStore((s) => s.ongedaan);
  const opnieuw = useProjectStore((s) => s.opnieuw);
  const kanOngedaan = useProjectStore((s) => s.verleden.length > 0);
  const kanOpnieuw = useProjectStore((s) => s.toekomst.length > 0);
  const afdrukken = usePrintStore((s) => s.afdrukken);
  const toonVoorbeeld = usePrintStore((s) => s.toonVoorbeeld);
  const activeId = useProjectStore((s) => s.activeId);
  const { nieuw, openen, opslaan } = useBestandActies();
  const openModuleKiezer = useModuleKiezer((s) => s.openen);

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
    // Het hele project is het rapport: voorblad, hoofdstukken en bijlage A.
    afdrukken(null, "rapport");
  }, [afdrukken]);

  /** Alleen de berekening die openstaat, als losse uitdraai met een titelblok. */
  const bladOpen = exemplaren.some((e) => e.id === activeId);
  const handlePrintBlad = useCallback(() => {
    if (!useProjectStore.getState().exemplaren.some((e) => e.id === activeId)) {
      alert("Open eerst het rekenblad dat je als PDF wilt opslaan.");
      return;
    }
    afdrukken([activeId], "bladen");
  }, [afdrukken, activeId]);

  const handleVoorbeeld = useCallback(() => {
    if (useProjectStore.getState().exemplaren.length === 0) {
      alert("Dit project bevat nog geen rekenbladen.");
      return;
    }
    // Het voorbeeld van het project is het rapportvoorbeeld, bij de knoop Rapport.
    useProjectStore.getState().selecteer(RAPPORT_ID);
    toonVoorbeeld(null, "rapport");
  }, [toonVoorbeeld]);

  return (
    <div className="ribbon-content">
      <div className="ribbon-groups">
        <RibbonGroup label={t("calc.file", "Bestand")}>
          <RibbonButton icon={newDocIcon} label={t("calc.new", "Nieuw")} size="large" onClick={nieuw} />
          <RibbonButton icon={openFolderIcon} label={t("calc.browse", "Browse…")} size="large" onClick={openen} />
          <RibbonButton icon={saveDiskIcon} label={t("calc.save", "Opslaan")} size="large" onClick={opslaan} />
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

        <RibbonGroup label={t("calc.insert", "Invoegen")}>
          <RibbonButton icon={moduleIcon} label={t("calc.module", "Module")} size="large" onClick={openModuleKiezer} />
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
            label={t("calc.pdfSheet", "PDF blad")}
            size="large"
            disabled={!bladOpen}
            onClick={handlePrintBlad}
          />
          <RibbonButton
            icon={pdfIcon}
            label={t("calc.pdfSave", "PDF project")}
            size="large"
            onClick={handlePrint}
          />
        </RibbonGroup>
      </div>

    </div>
  );
}
