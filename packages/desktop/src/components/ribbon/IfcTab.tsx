import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import {
  ifcImportIcon,
  ifcExportIcon,
  ifcTreeIcon,
  ifcValidateIcon,
  infoIcon,
} from "./icons";

export default function IfcTab() {
  const { t } = useTranslation("ribbon");
  return (
    <div className="ribbon-content">
      <div className="ribbon-groups">
        <RibbonGroup label={t("ifc.file", "Bestand")}>
          <RibbonButton icon={ifcImportIcon} label={t("ifc.open", "IFC Open")} size="large" onClick={() => {}} />
          <RibbonButton icon={ifcExportIcon} label={t("ifc.export", "IFC Export")} size="large" onClick={() => {}} />
        </RibbonGroup>

        <RibbonGroup label={t("ifc.view", "Bekijken")}>
          <RibbonButton icon={ifcTreeIcon} label={t("ifc.tree", "Spatial Tree")} size="large" onClick={() => {}} />
          <RibbonButton icon={infoIcon} label={t("ifc.props", "Properties")} size="large" onClick={() => {}} />
          <RibbonButton icon={ifcValidateIcon} label={t("ifc.validate", "Validate")} size="large" onClick={() => {}} />
        </RibbonGroup>

        <RibbonGroup label={t("ifc.convert", "Converteren")}>
          <RibbonButton icon={ifcImportIcon} label={t("ifc.gefToIfc", "GEF naar IFC")} size="large" onClick={() => {}} />
          <RibbonButton icon={ifcImportIcon} label={t("ifc.broToIfc", "BRO naar IFC")} size="large" onClick={() => {}} />
        </RibbonGroup>
      </div>
    </div>
  );
}
