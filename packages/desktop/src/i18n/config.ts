import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { getSetting } from "../store";

// English
import enCommon from "./locales/en/common.json";
import enRibbon from "./locales/en/ribbon.json";
import enBackstage from "./locales/en/backstage.json";
import enSettings from "./locales/en/settings.json";
import enFeedback from "./locales/en/feedback.json";
// Dutch
import nlCommon from "./locales/nl/common.json";
import nlRibbon from "./locales/nl/ribbon.json";
import nlBackstage from "./locales/nl/backstage.json";
import nlSettings from "./locales/nl/settings.json";
import nlFeedback from "./locales/nl/feedback.json";

export const LANGUAGES = [
  { code: "auto", name: "Auto-detect" },
  { code: "en", name: "English" },
  { code: "nl", name: "Nederlands" },
];

const ns = ["common", "ribbon", "backstage", "settings", "feedback"];

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, ribbon: enRibbon, backstage: enBackstage, settings: enSettings, feedback: enFeedback },
      nl: { common: nlCommon, ribbon: nlRibbon, backstage: nlBackstage, settings: nlSettings, feedback: nlFeedback },
    },
    ns,
    defaultNS: "common",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["navigator"],
      caches: [],
    },
  });

i18next.on("languageChanged", (lng) => {
  document.documentElement.setAttribute("lang", lng);
});

// Load saved language from Tauri store on startup
getSetting("language", "auto").then((lang) => {
  changeLanguage(lang);
});

export function changeLanguage(lang: string) {
  if (lang === "auto") {
    const detected = navigator.language?.split("-")[0] || "en";
    const supported = Object.keys(i18next.options.resources || {});
    const finalLang = supported.includes(detected) ? detected : "en";
    return i18next.changeLanguage(finalLang);
  }
  return i18next.changeLanguage(lang);
}

export default i18next;
