import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import { tableIcon, pencilIcon, reportPreviewIcon } from "./icons";

export default function ViewTab() {
  const { t } = useTranslation("ribbon");
  return (
    <div className="ribbon-content">
      <div className="ribbon-groups">
        <RibbonGroup label={t("view.layout", "Indeling")}>
          <RibbonButton icon={tableIcon} label={t("view.split", "Splitsen")} size="large" onClick={() => {}} />
          <RibbonButton icon={pencilIcon} label={t("view.editor", "Editor")} size="large" onClick={() => {}} />
          <RibbonButton icon={reportPreviewIcon} label={t("view.preview", "Preview")} size="large" onClick={() => {}} />
        </RibbonGroup>
      </div>
    </div>
  );
}
