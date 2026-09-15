/**
 * Controlescript voor de module Verankeringslengte (NEN-EN 1992-1-1 §8.4).
 *
 * Zeven de referentie-uitwerking-referenties (document1B t/m 7B). Basis C45/55 · B500B · Ø16 ·
 * c 30 · goede aanhechting · rechte staaf → l_bd 379 mm. Elk volgend blad
 * varieert precies één ding.
 *
 * Gedocumenteerde afwijking (register §4): de referentie-uitwerking past α₁ = 0,70 toe zodra
 * c_d > 3Ø, óók bij een RECHTE staaf, terwijl tabel 8.2 daar α₁ = 1,00 vraagt.
 * Bij de basis (c 30 tegen 3Ø = 48) speelt dat niet; bij Ø6 met c 60 wel, en
 * dan geeft de referentie-uitwerking een KORTERE verankering dan de norm toestaat.
 *
 * Draaien:  node scripts/check-verankeringslengte.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, toetsNormStand, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("verankeringslengte.ts");

/** Keuzewaarden: betonstaal 501 = B500B · aanhechting 1 = goed, 2 = slecht ·
 *  staaftype 1 = recht, 2 = anders dan recht. A_req/A_prov 0 = niet benutten. */
const BASIS = {
  betonklasse: "45", betonstaal: "501", diameter: "16", c_dek: "30",
  aanhechting: "1", staaftype: "1", A_req: "0", A_prov: "0",
};

/** `rekenwijze` = 1 → de referentie-uitwerking volgen; dan hoort élke waarde exact te kloppen. */
const PROJECT = { rekenwijze: 1 };

const REFERENTIES = [
  { blad: "document1B — basis: C45/55 · B500B · Ø16 · c 30 · goed · recht",
    invoer: {},
    verwacht: { "σ_sd": "434.8", "η_1": "1", "α_1": "1", l_bd: "379" } },

  { blad: "document2B — slechte aanhechting (η₁ 0,70)",
    invoer: { aanhechting: "2" },
    verwacht: { "η_1": "0.7", f_bd: "2.79", l_bd: "542" } },

  { blad: "document3B — anders dan recht (andere α₂-tak)",
    invoer: { staaftype: "2" },
    verwacht: { "α_1": "1", "α_2": "1.00", l_bd: "436" } },

  { blad: "document4B — A_req/A_prov 300/500 (wapening niet volledig benut)",
    invoer: { A_req: "300", A_prov: "500" },
    verwacht: { "σ_sd": "261", l_bd: "227" } },

  { blad: "document6B — C20/25 (lagere betonklasse)",
    invoer: { betonklasse: "20" },
    verwacht: { f_ctd: "1.03", f_bd: "2.32", l_bd: "651" } },

  { blad: "document5B — Ø6 met c 60: ondergrens (8.6) is maatgevend",
    invoer: { diameter: "6", c_dek: "60" },
    // Hier bijt het splitspunt: c_d = 60 > 3Ø = 18, dus de referentie-uitwerking zet α₁ op 0,70
    // en zakt door tot de ondergrens van 100 mm. Tabel 8.2 geeft voor een rechte
    // staaf α₁ = 1,00 en dan is 115 mm nodig — dat is `l_bd,nb`. In de
    // de referentie-uitwerking-stand is `l_bd` dus 100 en niet 115.
    verwacht: { "α_1": "1", l_bd_nb: "115", l_bd: "100" } },
];

let fouten = 0;
for (const ref of REFERENTIES) {
  const got = reken(tpl, { ...BASIS, ...ref.invoer }, PROJECT);
  fouten += toets(ref.blad, got, ref.verwacht, {});
}

afronden(fouten, "Verankeringslengte");
