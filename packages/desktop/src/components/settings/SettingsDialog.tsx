import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, changeLanguage } from "../../i18n/config";
import { getSetting, setSetting } from "../../store";
import Modal from "../Modal";
import ThemedSelect from "../ThemedSelect";
import "../ThemedSelect.css";
import "./SettingsDialog.css";

const THEME_OPTIONS = [
  { value: "light",     labelKey: "appearance.light",     swatches: ["#FAFAF9", "#FFFFFF", "#D97706", "#36363E"] },
  { value: "forge",     labelKey: "appearance.forge",     swatches: ["#36363E", "#44444C", "#D97706", "#FAFAF9"] },
  { value: "openaec",   labelKey: "appearance.dark",      swatches: ["#27272A", "#1C1917", "#D97706", "#FAFAF9"] },
  { value: "blueprint", labelKey: "appearance.blueprint", swatches: ["#0F1B2D", "#1A2C45", "#60A5FA", "#E0E7FF"] },
  { value: "contrast",  labelKey: "appearance.contrast",  swatches: ["#000000", "#0A0A0A", "#FFD700", "#FFFFFF"] },
];

/* ─── Tab configuratie ──────────────────────────────────────
   Pas deze array aan voor jouw project.
   Voeg domein-specifieke tabs toe, verwijder wat je niet nodig hebt.

   Voorbeeld met domein-tab:
     const TAB_IDS = ["general", "appearance", "calculation", "about"] as const;
   ─────────────────────────────────────────────────────────── */
const TAB_IDS = ["general", "appearance", "about"] as const;

export function applyTheme(theme?: string) {
  document.documentElement.setAttribute("data-theme", theme || "light");
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export default function SettingsDialog({
  open,
  onClose,
  theme,
  onThemeChange,
}: SettingsDialogProps) {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const [activeTab, setActiveTab] = useState("general");

  // Draft state — only committed on Save
  const [draftTheme, setDraftTheme] = useState(theme);
  const [draftLang, setDraftLang] = useState("auto");
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Snapshot of original values when dialog opens, for reverting on Cancel
  const originalTheme = useRef(theme);
  const originalLang = useRef("");

  // Reset draft to current values when dialog opens
  useEffect(() => {
    if (open) {
      originalTheme.current = theme;
      setDraftTheme(theme);
      getSetting("language", "auto").then((lang) => {
        originalLang.current = lang;
        setDraftLang(lang);
      });
    }
  }, [open, theme]);

  // Live theme preview — apply immediately when the user picks one in the dropdown.
  // Saved only on Save; reverted on Cancel.
  const handleThemePreview = (value: string) => {
    setDraftTheme(value);
    applyTheme(value);
  };

  // Live language preview — switch i18n immediately on selection.
  const handleLangPreview = (value: string) => {
    setDraftLang(value);
    changeLanguage(value);
  };

  // Cancel — discard all draft changes, revert live preview
  const handleCancel = () => {
    setDraftTheme(originalTheme.current);
    applyTheme(originalTheme.current);
    setDraftLang(originalLang.current);
    changeLanguage(originalLang.current);
    onClose();
  };

  // Save — commit all draft changes
  const handleSave = () => {
    onThemeChange(draftTheme);
    applyTheme(draftTheme);
    setSetting("theme", draftTheme);

    setSetting("language", draftLang);
    changeLanguage(draftLang);

    onClose();
  };

  // Reset to defaults — resets draft values (still requires Save to apply)
  const handleReset = () => {
    setConfirmResetOpen(true);
  };

  const handleConfirmReset = () => {
    setDraftTheme("light");
    applyTheme("light");
    setDraftLang("auto");
    changeLanguage("auto");
    setConfirmResetOpen(false);
  };

  const footer = (
    <>
      <button className="settings-btn settings-btn-secondary" onClick={handleReset}>
        {t("resetToDefaults")}
      </button>
      <div className="settings-footer-right">
        <button className="settings-btn settings-btn-secondary" onClick={handleCancel}>
          {tCommon("cancel")}
        </button>
        <button className="settings-btn settings-btn-primary" onClick={handleSave}>
          {tCommon("save")}
        </button>
      </div>
    </>
  );

  return (
    <>
    <Modal open={open} onClose={handleCancel} title={t("title")} width={560} height={500} className="settings-dialog" footer={footer}>
      <div className="settings-body">
        <div className="settings-sidebar">
          {TAB_IDS.map((id) => (
            <button
              key={id}
              className={`settings-tab${activeTab === id ? " active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === "general" && (
            <GeneralTabContent lang={draftLang} onLangChange={handleLangPreview} />
          )}
          {activeTab === "appearance" && (
            <AppearanceTabContent theme={draftTheme} onThemeSelect={handleThemePreview} />
          )}
          {activeTab === "about" && <AboutTabContent />}
        </div>
      </div>
    </Modal>

    <Modal
      open={confirmResetOpen}
      onClose={() => setConfirmResetOpen(false)}
      title={t("resetToDefaults")}
      width={340}
      footer={
        <>
          <button className="settings-btn settings-btn-secondary" onClick={() => setConfirmResetOpen(false)}>
            {tCommon("cancel")}
          </button>
          <button className="settings-btn settings-btn-primary" onClick={handleConfirmReset}>
            {t("resetToDefaults")}
          </button>
        </>
      }
    >
      <div style={{ padding: 12, fontSize: 12 }}>{t("resetConfirm")}</div>
    </Modal>
    </>
  );
}

/* ─── General Tab ───────────────────────────────────────────
   Taalselectie werkt out-of-the-box.
   Pas de overige secties aan of verwijder ze naar behoefte.
   ─────────────────────────────────────────────────────────── */
function GeneralTabContent({
  lang,
  onLangChange,
}: {
  lang: string;
  onLangChange: (value: string) => void;
}) {
  const { t } = useTranslation("settings");

  return (
    <div className="settings-section">
      <h3>{t("general.application")}</h3>
      <div className="settings-row">
        <span className="settings-label">{t("general.language")}</span>
        <ThemedSelect
          value={lang}
          options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
          onChange={onLangChange}
          style={{ width: 180 }}
        />
      </div>
    </div>
  );
}

/* ─── Appearance Tab ────────────────────────────────────────
   Themaselectie werkt out-of-the-box.
   ─────────────────────────────────────────────────────────── */
function AppearanceTabContent({
  theme,
  onThemeSelect,
}: {
  theme: string;
  onThemeSelect: (value: string) => void;
}) {
  const { t } = useTranslation("settings");
  return (
    <div className="settings-section">
      <h3>{t("appearance.theme")}</h3>
      <ThemeDropdown theme={theme} onThemeSelect={onThemeSelect} />
    </div>
  );
}

function ThemeDropdown({
  theme,
  onThemeSelect,
}: {
  theme: string;
  onThemeSelect: (value: string) => void;
}) {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selected = THEME_OPTIONS.find((o) => o.value === theme) || THEME_OPTIONS[0];

  const swatchRow = (swatches: string[]) => (
    <div className="theme-dropdown-swatches">
      {swatches.map((color, i) => (
        <span key={i} className="theme-dropdown-swatch" style={{ backgroundColor: color } as CSSProperties} />
      ))}
    </div>
  );

  return (
    <div className="theme-dropdown" ref={ref}>
      <button className="theme-dropdown-trigger" onClick={() => setOpen(!open)}>
        {swatchRow(selected.swatches)}
        <span className="theme-dropdown-label">{t(selected.labelKey)}</span>
        <svg className="theme-dropdown-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="theme-dropdown-menu">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`theme-dropdown-item${theme === opt.value ? " active" : ""}`}
              onClick={() => { onThemeSelect(opt.value); setOpen(false); }}
            >
              {swatchRow(opt.swatches)}
              <span className="theme-dropdown-label">{t(opt.labelKey)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── About Tab ───────────────────────────────────────────────
// Pas naam, versie en beschrijving aan via i18n keys
// in locales/{lang}/settings.json, sectie "about"
// ─────────────────────────────────────────────────────────────
function AboutTabContent() {
  const { t } = useTranslation("settings");
  return (
    <div className="settings-section">
      <h3>{t("about.appName")}</h3>
      <div style={{ fontSize: 11, lineHeight: 1.8 }}>
        <p><strong>{t("about.version")}:</strong> 0.1.0</p>
        <p><strong>{t("about.framework")}:</strong> Tauri + React + TypeScript</p>
        <p><strong>{t("about.license")}:</strong> MIT</p>
        <p style={{ marginTop: 8, color: "var(--theme-dialog-content-secondary)" }}>
          {t("about.description")}
        </p>
      </div>
    </div>
  );
}
