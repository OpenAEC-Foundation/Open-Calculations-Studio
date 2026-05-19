import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import RibbonButtonStack from "./RibbonButtonStack";
import {
  reportNewIcon,
  ifcImportIcon,
  ifcExportIcon,
  undoIcon,
  redoIcon,
  reportPreviewIcon,
  reportGenerateIcon,
} from "./icons";

interface CalcTabProps {
  onSettingsClick?: () => void;
}

export default function CalcTab({ onSettingsClick: _onSettingsClick }: CalcTabProps) {
  const { t } = useTranslation("ribbon");
  return (
    <div className="ribbon-content">
      <div className="ribbon-groups">
        <RibbonGroup label={t("calc.file", "Bestand")}>
          <RibbonButton icon={reportNewIcon} label={t("calc.new", "Nieuw")} size="large" onClick={() => {}} />
          <RibbonButton icon={ifcImportIcon} label={t("calc.open", "Openen")} size="large" onClick={() => {}} />
          <RibbonButton icon={ifcExportIcon} label={t("calc.save", "Opslaan")} size="large" onClick={() => {}} />
        </RibbonGroup>

        <RibbonGroup label={t("calc.edit", "Bewerken")}>
          <RibbonButtonStack>
            <RibbonButton icon={undoIcon} label={t("calc.undo", "Ongedaan")} size="small" onClick={() => {}} />
            <RibbonButton icon={redoIcon} label={t("calc.redo", "Opnieuw")} size="small" onClick={() => {}} />
          </RibbonButtonStack>
        </RibbonGroup>

        <RibbonGroup label={t("calc.export", "Exporteren")}>
          <RibbonButton icon={reportPreviewIcon} label={t("calc.pdf", "PDF")} size="large" onClick={() => {}} />
          <RibbonButton icon={reportGenerateIcon} label={t("calc.ifcExport", "IFC")} size="large" onClick={() => {}} />
        </RibbonGroup>
      </div>
    </div>
  );
}
