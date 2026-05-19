import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import { boldIcon, italicIcon, reportTemplateIcon, imageIcon, rectangleIcon } from "./icons";

export default function InsertTab() {
  const { t } = useTranslation("ribbon");
  return (
    <div className="ribbon-content">
      <div className="ribbon-groups">
        <RibbonGroup label={t("insert.elements", "Elementen")}>
          <RibbonButton icon={boldIcon} label={t("insert.heading", "Kop")} size="large" onClick={() => {}} />
          <RibbonButton icon={italicIcon} label={t("insert.formula", "Formule")} size="large" onClick={() => {}} />
          <RibbonButton icon={reportTemplateIcon} label={t("insert.select", "Keuzelijst")} size="large" onClick={() => {}} />
        </RibbonGroup>

        <RibbonGroup label={t("insert.media", "Media")}>
          <RibbonButton icon={imageIcon} label={t("insert.image", "Afbeelding")} size="large" onClick={() => {}} />
          <RibbonButton icon={rectangleIcon} label={t("insert.svg", "SVG")} size="large" onClick={() => {}} />
        </RibbonGroup>
      </div>
    </div>
  );
}
