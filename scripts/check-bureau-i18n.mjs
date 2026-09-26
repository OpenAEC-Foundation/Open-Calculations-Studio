/**
 * Bewaakt de vertalingen van het instellingenvenster.
 *
 * SettingsDialog.tsx en components/rapport/BureauTab.tsx halen hun teksten uit
 * locales/{nl,en}/settings.json. Ontbreekt een sleutel in het Nederlands, dan
 * toont i18next stil de Engelse tekst (fallbackLng "en"); ontbreekt hij in
 * allebei, dan staat de sleutel zelf in beeld. Deze controle eist dat elke
 * gebruikte sleutel in beide talen bestaat, en dat de sectie "bureau" in beide
 * talen dezelfde sleutels heeft.
 *
 * Draaien:  node scripts/check-bureau-i18n.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const SRC = join(hier, "../packages/desktop/src");
const lees = (pad) => readFileSync(join(SRC, pad), "utf8");

/** Alle sleutels van een JSON-object als "a.b.c". */
const sleutels = (o, voor = "") =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? sleutels(v, `${voor}${k}.`) : [`${voor}${k}`]));
const talen = {
  nl: new Set(sleutels(JSON.parse(lees("i18n/locales/nl/settings.json")))),
  en: new Set(sleutels(JSON.parse(lees("i18n/locales/en/settings.json")))),
};

const dialoog = lees("components/settings/SettingsDialog.tsx");
const bureau = lees("components/rapport/BureauTab.tsx");

// Gebruikt: t("…") met een vaste sleutel in beide bestanden, de tabs uit
// TAB_IDS (t(`tabs.${id}`)), en in BureauTab elke tekst "bureau.…" (ook de
// sleutels in de kleurenlijst, die pas later aan t() worden gegeven). TAB_IDS
// alleen aan het begin van een regel: het commentaar erboven heeft een
// voorbeeld met dezelfde naam.
const gebruikt = new Set();
for (const bron of [dialoog, bureau]) for (const m of bron.matchAll(/\bt\("([\w.]+)"/g)) gebruikt.add(m[1]);
const tabs = dialoog.match(/^const TAB_IDS = \[([^\]]*)\]/m);
if (!tabs) throw new Error("TAB_IDS niet gevonden in SettingsDialog.tsx");
for (const m of tabs[1].matchAll(/"(\w+)"/g)) gebruikt.add(`tabs.${m[1]}`);
for (const m of bureau.matchAll(/"(bureau\.\w+)"/g)) gebruikt.add(m[1]);

let fouten = 0;
for (const sleutel of [...gebruikt].sort()) {
  const mist = Object.keys(talen).filter((taal) => !talen[taal].has(sleutel));
  if (mist.length) {
    fouten++;
    console.log(`  FOUT   ${sleutel} ontbreekt in ${mist.join(" en ")}`);
  }
}
console.log(`  ${fouten ? "FOUT  " : "OK    "} ${gebruikt.size} gebruikte sleutels, elk in nl en en`);

// De sectie bureau in beide talen gelijk: een sleutel die maar in één taal
// staat, is een vergeten vertaling of een overblijfsel.
let scheef = 0;
for (const [taal, ander] of [["nl", "en"], ["en", "nl"]]) {
  for (const k of talen[taal]) {
    if (k.startsWith("bureau.") && !talen[ander].has(k)) {
      scheef++;
      console.log(`  FOUT   ${k} staat wel in ${taal}, niet in ${ander}`);
    }
  }
}
console.log(`  ${scheef ? "FOUT  " : "OK    "} sectie bureau gelijk in nl en en`);

process.exit(fouten + scheef ? 1 : 0);
