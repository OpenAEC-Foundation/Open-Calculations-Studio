import { useTranslation } from "react-i18next";
import "./StatusBar.css";

export default function StatusBar() {
  const { t } = useTranslation();

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <div className="status-item">
          <span className="status-item-label">{t("ready")}</span>
        </div>
        <div className="status-separator" />
        <div className="status-item">
          <span className="status-item-label">{t("items")}:</span>
          <span className="status-item-value">0</span>
        </div>
      </div>

      <div className="status-bar-center">
        <span className="status-item-label" style={{ fontSize: "11px" }}>
          {t("version")}
        </span>
      </div>

      <div className="status-bar-right">
        <div className="status-item">
          <span className="status-item-label">{t("zoom")}:</span>
          <span className="status-item-value">100%</span>
        </div>
      </div>
    </div>
  );
}
