/**
 * Controlescript voor de toetsen van de Balklaag buiten de referentiebladen.
 *
 * check-balklaag.mjs toetst het blad tegen de referentiebladen en
 * check-balklaag-schema3.mjs de belastinggevallen en combinaties. Dit script
 * toetst per onderwerp een absolute waarde, met de hand nagerekend (de
 * rekensom staat bij elke set):
 *
 *   1  trillingen: n_40 uit (7.7) met (EI)_l/(EI)_b, (EI)_l in de
 *      overspanningsrichting (de balken), (EI)_b dwars daarop (het beschot);
 *   2  f_1 ≤ 8 Hz: (7.3) en (7.4) gelden niet, de trilling en het eindoordeel
 *      zijn dan "niet aangetoond" (§7.3.3(1));
 *   3  afschuiving over de volle breedte, k_cr = 1,0 (NB art. 6.1.7(2)), in
 *      beide standen;
 *   4  oplegdruk (§6.1.5) bij de eindoplegging, het tussensteunpunt van twee
 *      velden en k_c,90 volgens 6.1.5(4);
 *   5  de combinatie met alleen permanente last, met k_mod voor blijvend
 *      (§3.1.3(2));
 *   6  trek in een eindoplegging bij een overstek en bij twee velden (EQU,
 *      NB tabel A1.2(A));
 *   7  de bijkomende doorbuiging naast de eindstand (NB bij EN 1990, A1.4);
 *   8  k_r volgens (NB.5.1): 1 buiten 0 < k_r ≤ 1, anders de ondergrens 1/3;
 *   9  het eigen gewicht van de gedragen balken bij een onderslag;
 *  10  kip bij het steunmoment (§6.3.3), met l_ef uit de zone met een
 *      negatief moment;
 *  11  de startwaarden van het beeld.
 *
 * Draaien:  node scripts/check-balklaag-toetsen.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, afronden } from "./lib/refcheck.mjs";

const ast = parse(laadTemplate("balklaag.ts"));
const hier = dirname(fileURLToPath(import.meta.url));

/** Projectgegevens: CC2 (γ_G 1,2, γ_Q 1,5, γ_G,a 1,35); rekenwijze per set. */
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };

/** Het basisgeval van check-balklaag.mjs: 71×221 C24, klimaatklasse 1, CC2. */
const BASIS = {
  profiel: "12", sterkteklasse: "2", klimaat: "1", duurklasse: "2", schema: "1", ligger: "1",
  L_d: "5000", a_opl: "50", hoh: "600", t_vloer: "18", E_beschot: "7000", b_vloer: "5",
  a_over: "0", L_veld2: "0", a_steun: "0", b_sparing: "0", l_staart: "0", b_ond: "0", b_zelf: "0", h_zelf: "0",
  G_k: "1.0", Q_k: "1.75", F_k: "2", g_bl: "0", belastingcat: "2",
  "ψ_0_zelf": "0", "ψ_2_zelf": "0", controleer: "1", grensfactor: "0.004", grens_bij: "0.003",
  controleer_trilling: "0", "ζ": "0.01", a_tril: "1", b_tril: "120",
};

const getal = (s) => parseFloat(String(s).replace(",", "."));

/** Rekent het blad door: de laatste zichtbare waarde per naam en de platte tekst. */
function reken(invoer, rekenwijze = 1) {
  const nodes = evaluate(ast, { ...BASIS, ...invoer }, { ...PROJECT, rekenwijze });
  const alle = {};
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "assignment" || n.type === "var-display") {
        const w = getal(n.result);
        if (Number.isFinite(w)) alle[n.name] = w;
      }
      if (Array.isArray(n.children)) loop(n.children);
    }
  };
  loop(nodes);
  const tekst = render(nodes).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return { alle, tekst };
}

/** De slotzin, zoals het rapport hem leest (bladResultaat.ts). */
function slotzin(tekst) {
  const i = tekst.lastIndexOf("Maatgevende UC");
  return i < 0 ? "" : tekst.slice(i, i + 240);
}
const voldoetVolgensSlotzin = (zin) => !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);

let fouten = 0;
const toon = (v) => (v === undefined || !Number.isFinite(v) ? String(v ?? "—") : String(Number(v.toPrecision(5))));

/** Het blad drukt vier significante cijfers af: een relatieve marge. */
function gelijk(label, ons, doel, { rel = 2e-3, abs = 1e-4 } = {}) {
  const ok = Number.isFinite(ons) && Math.abs(ons - doel) <= rel * Math.abs(doel) + abs;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${label.padEnd(44)} blad ${toon(ons).padStart(10)}   verwacht ${toon(doel)}`);
}

function waar(label, ok, toelichting = "") {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${label}${toelichting ? `   (${toelichting})` : ""}`);
}

// ── 1. Trillingen: formule (7.7) ──────────────────────────────────────────

console.log("\n1. Trillingen — n_40 (7.7) met (EI)_l/(EI)_b, 71×221 h.o.h. 600, t 18, L 4,05 m, G_k 0,5");
{
  // Norm-stand. Met de hand:
  //   g_balk = 0,071·0,221·420·9,81 = 64,65 N/m, per m² 64,65/0,6 = 107,75 N/m²
  //   m      = (500 + 107,75)/9,81 = 61,95 kg/m²
  //   (EI)_l = 11000·(71·221³/12)/600 = 1 170 820 N·m²/m   (balken)
  //   (EI)_b = 7000·18³/12           =     3 402 N·m²/m   (beschot)
  //   f_1    = π/(2·4,05²)·√(1 170 820/61,95) = 13,166 Hz
  //   n_40   = [((40/13,166)² − 1)·(5/4,05)⁴·1 170 820/3402]^0,25
  //          = (8,230·2,3231·344,16)^0,25 = 9,007
  //   v      = 4·(0,4 + 0,6·9,007)/(61,95·5·4,05 + 200) = 23,217/1454,5 = 0,01596
  //   v_lim  = 120^(13,166·0,01 − 1) = 0,01565, UC_v = 1,020
  // Met de verhouding omgekeerd (beschot/balken) kwam n_40 op 9,007/√344,16 =
  // 0,486 en UC_v op 0,12: een factor 8 te gunstig.
  const invoer = { L_d: "4000", G_k: "0.5", controleer_trilling: "1" };
  const a = reken(invoer, 0).alle;
  gelijk("EI_l = balken 1 170 820 N·m²/m", a.EI_l, 1170820, { rel: 1e-3 });
  gelijk("EI_b = beschot 3402 N·m²/m", a.EI_b, 3402, { rel: 1e-3 });
  gelijk("m_opp = 61,95 kg/m²", a.m_opp, 61.95);
  gelijk("f_1 = 13,166 Hz", a.f_1, 13.166);
  gelijk("n_40 = 9,007", a.n_40, 9.007);
  gelijk("v_resp = 0,01596", a.v_resp, 0.01596);
  gelijk("v_lim = 0,01565", a.v_lim, 0.01565);
  gelijk("UC_tril_v = 1,020", a.UC_tril_v, 1.020, { rel: 3e-3 });
  // Referentiestand: eigen gewicht 550 kg/m³ en g = 10, dus m = (500 +
  // 0,071·0,221·5500/0,6)/9,81 = 65,63 kg/m²; f_1 = 12,792 Hz; n_40 =
  // (8,778·2,3231·344,16)^0,25 = 9,153; v = 23,568/1529,0 = 0,015414;
  // v_lim = 120^(−0,87208) = 0,015370; UC_v = 1,003.
  const r = reken(invoer, 1).alle;
  gelijk("referentiestand: n_40 = 9,153", r.n_40, 9.153);
  gelijk("referentiestand: UC_tril_v = 1,003", r.UC_tril_v, 1.003, { rel: 3e-3 });
}

// ── 2. f_1 ≤ 8 Hz: niet aangetoond ────────────────────────────────────────

console.log("\n2. f_1 ≤ 8 Hz — 96×271 h.o.h. 400, L 5,05 m, G_k 2,5 (zware dekvloer)");
{
  // Norm-stand. m = (2500 + 0,096·0,271·420·9,81/0,4)/9,81 = (2500 + 268,0)/9,81
  // = 282,2 kg/m²; (EI)_l = 11000·(96·271³/12)/400 = 4 378 550 N·m²/m;
  // f_1 = π/(2·5,05²)·√(4 378 550/282,2) = 7,673 Hz ≤ 8 Hz, dus UC_trilling ≥
  // 8/7,673 = 1,043 en de slotzin "niet aangetoond" (§7.3.3(1)).
  const invoer = { profiel: "19", hoh: "400", t_vloer: "25", G_k: "2.5", F_k: "3", controleer_trilling: "1" };
  const { alle: a, tekst } = reken(invoer, 0);
  gelijk("f_1 = 7,673 Hz", a.f_1, 7.673);
  waar("UC_trilling ≥ 8 Hz/f_1", a.UC_trilling >= 8 / a.f_1 - 1e-4, `UC_trilling = ${toon(a.UC_trilling)}`);
  const zin = slotzin(tekst);
  waar("slotzin: Balklaag niet aangetoond", /Balklaag niet aangetoond/.test(zin), zin.slice(0, 90));
  waar("het rapport leest dat niet als voldoet", !voldoetVolgensSlotzin(zin));
  waar("§7 verwijst naar §7.3.3(1), niet naar lid (2)", /§7\.3\.3\(1\)/.test(tekst) && !/§7\.3\.3\(2\)/.test(tekst));
  // Dezelfde vloer zonder dekvloer: m = (500 + 268,0)/9,81 = 78,29 kg/m² en
  // f_1 = π/(2·5,05²)·√(4 378 550/78,29) = 0,061593·236,49 = 14,57 Hz > 8 Hz;
  // dan beslissen (7.3) en (7.4) weer.
  const licht = reken({ ...invoer, G_k: "0.5" }, 0);
  gelijk("zonder dekvloer f_1 = 14,57 Hz", licht.alle.f_1, 14.57);
  waar("dan geen 'niet aangetoond'", !/niet aangetoond/.test(slotzin(licht.tekst)));
}

// ── 3. Afschuiving: k_cr = 1,0 ────────────────────────────────────────────

console.log("\n3. Afschuiving — onderslag 71×221, L 1,50 m, belaste breedte 7,0 m, F 3 kN");
{
  // k_cr = 1,0 voor een prismatische doorsnede (NB art. 6.1.7(2)): beide
  // standen rekenen met de volle breedte b = 71 mm.
  // Norm-stand: g = 7,0·1,0 + 0,06465 = 7,0647 kN/m, q = 7,0·1,75 = 12,25 kN/m.
  // V_z,Ed = (1,2·7,0647 + 1,5·12,25)·1,50/2 = 20,139 kN (6.10b; de puntlast
  // geeft 1,2·7,0647·0,75 + 1,5·3 = 10,86). τ_d = 1,5·20 139/(71·221)
  // = 1,925 N/mm²; f_v,d = 0,8·4,0/1,3 = 2,462; UC = 0,7821 (was 2,874 en
  // 1,167 met k_cr = 0,67).
  const invoer = { ligger: "2", b_ond: "7.0", L_d: "1400", a_opl: "100", F_k: "3" };
  const nb = reken(invoer, 0);
  gelijk("norm: V_z,Ed = 20,139 kN", nb.alle.V_z_Ed, 20.139);
  gelijk("norm: τ_d = V·S/(b·I) = 1,925", nb.alle["τ_d"], 1.925);
  gelijk("norm: UC_afsch = 0,7821", nb.alle.UC_afsch, 0.7821);
  // Referentiestand: g = 7,0 + 0,0863 = 7,0863; V = (8,5036 + 18,375)·0,75 =
  // 20,159 kN; τ_d = 1,5·20 159/(71·221) = 1,927 N/mm² (volle breedte); UC 0,783.
  const refStand = reken(invoer, 1);
  gelijk("referentie: τ_d = V·S/(b·I) = 1,927", refStand.alle["τ_d"], 1.927);
  gelijk("referentie: UC_afsch = 0,783", refStand.alle.UC_afsch, 0.783, { rel: 3e-3 });
  for (const [stand, r] of [["norm", nb], ["referentie", refStand]]) {
    waar(`${stand}: het blad noemt k_cr = 1,0 (NB art. 6.1.7(2))`, /k cr = 1,0 \(NB art\. 6\.1\.7\(2\)\)/.test(r.tekst));
    waar(`${stand}: geen melding "zonder k_cr" meer`, !/zonder k cr/.test(r.tekst));
  }
}

// ── 4. Oplegdruk ──────────────────────────────────────────────────────────

console.log("\n4. Oplegdruk — §6.1.5");
{
  // Basisgeval (referentiestand), eindoplegging: R = (1,2·0,6863 + 1,5·1,05)
  // ·5,05/2 = 6,056 kN; l_ef = 50 + 30 = 80 mm; σ = 6056/(71·80) = 1,066
  // N/mm²; f_c,90,d = 0,8·2,5/1,3 = 1,538; k_c,90 = 1,5 (massief, losse
  // steunpunten, l_1 ≥ 2h); UC = 1,066/(1,5·1,538) = 0,462.
  const a = reken({}).alle;
  gelijk("basis: R_A,Ed = 6,056 kN", a.R_A_Ed, 6.056);
  gelijk("basis: l_ef,e = 80 mm", a.l_ef_e, 80, { rel: 0, abs: 1e-9 });
  gelijk("basis: f_c,90,d = 1,538", a.f_c_90_d, 1.538);
  gelijk("basis: k_c,90 = 1,5", a.k_c_90, 1.5, { rel: 0, abs: 1e-9 });
  gelijk("basis: UC_c90 = 0,462", a.UC_c90, 0.462);

  // Twee velden, onderslag 96×271, 3,0 + 3,0 m, belaste breedte 3,0 m, norm-
  // stand: g = 3,0 + 0,1072 = 3,1072, q = 5,25; q_Ed = 1,2·3,1072 + 1,5·5,25 =
  // 11,604 kN/m; R_B = 1,25·11,604·3,0 = 43,51 kN. Zonder a_steun geldt a_opl
  // = 100: l_ef = 100 + 2·30 = 160 mm, σ = 43 510/(96·160) = 2,833 N/mm², UC =
  // 2,833/(1,5·1,538) = 1,228. Met een onderslag van 200 breed: l_ef = 260 mm,
  // σ = 1,743, UC = 0,755.
  const twee = { profiel: "19", ligger: "2", schema: "3", L_d: "2900", a_opl: "100", L_veld2: "3000", b_ond: "3.0", F_k: "3" };
  const b = reken(twee, 0).alle;
  gelijk("twee velden: R_B,Ed = 43,51 kN", b.R_B_Ed, 43.51);
  gelijk("twee velden: l_ef,s = 160 mm", b.l_ef_s, 160, { rel: 0, abs: 1e-9 });
  gelijk("twee velden: σ_c,90,s = 2,833", b.σ_c_90_s, 2.833);
  gelijk("twee velden: UC_c90 = 1,228", b.UC_c90, 1.228);
  waar("twee velden: de oplegdruk is maatgevend", Math.abs(b.UC_max - b.UC_c90) < 1e-9, `UC_max = ${toon(b.UC_max)}`);
  const c = reken({ ...twee, a_steun: "200" }, 0).alle;
  gelijk("a_steun 200: l_ef,s = 260 mm", c.l_ef_s, 260, { rel: 0, abs: 1e-9 });
  gelijk("a_steun 200: UC_c90 = 0,755", c.UC_c90, 0.755);

  // GL24h: k_c,90 = 1,75 (l ≤ 400 mm) en f_c,90,d = 0,8·2,5/1,25 = 1,600.
  const gl = reken({ sterkteklasse: "4" }).alle;
  gelijk("GL24h: k_c,90 = 1,75", gl.k_c_90, 1.75, { rel: 0, abs: 1e-9 });
  gelijk("GL24h: f_c,90,d = 1,600", gl.f_c_90_d, 1.6);
}

// ── 5. Alleen permanente belasting ────────────────────────────────────────

console.log("\n5. Alleen permanent — onderslag 71×246 onder een groendak, sneeuw, duurklasse kort");
{
  // Norm-stand: g = 4,0·2,0 + 0,07196 = 8,072 kN/m, L = 2,60 m.
  // 6.10b: M = (1,2·8,072 + 1,5·2,24)·2,6²/8 = 11,02 kNm, σ = 15,39,
  //   f_m,d = 0,9·24/1,3 = 16,62, UC_buiging = 0,927 (sneeuw: ψ_0 = 0, dus
  //   6.10a is 1,35·G alleen — met k_mod kort).
  // Alleen permanent: M = 1,35·8,072·0,845 = 9,208 kNm, σ = 9,208e6/716 106 =
  //   12,86 N/mm², f_m,d = 0,6·24/1,3 = 11,08, UC_G = 1,161: maatgevend.
  const invoer = { profiel: "13", ligger: "2", b_ond: "4.0", belastingcat: "9", duurklasse: "1",
    L_d: "2500", a_opl: "100", G_k: "2.0", Q_k: "0.56", F_k: "0" };
  const a = reken(invoer, 0).alle;
  gelijk("P_g,k = 8,072 kN/m", a.P_g_k, 8.072);
  gelijk("UC_buiging = 0,927 (k_mod kort)", a.UC_buiging, 0.9265);
  gelijk("UC_G,m = 1,161 (k_mod blijvend)", a.UC_G_m, 1.161);
  gelijk("UC_max = UC_G", a.UC_max, a.UC_G, { rel: 0, abs: 1e-9 });
  // Klimaatklasse 3: k_mod,G = 0,50.
  const k3 = reken({ ...invoer, klimaat: "3" }, 0).alle;
  gelijk("klimaatklasse 3: UC_G,m = 1,161·0,6/0,5 = 1,393", k3.UC_G_m, 1.161 * 0.6 / 0.5, { rel: 3e-3 });
}

// ── 6. Trek in de eindoplegging bij een overstek ──────────────────────────

console.log("\n6. Trek in een eindoplegging — overstek 3,07 + 1,00 m (A) en twee velden 5,05 + 3,00 m (C)");
{
  // Norm-stand: g = 0,6·0,6 + 0,06465 = 0,42465 kN/m, F_Q,k = 0,782·3 = 2,346.
  // EQU (0,9·G op het veld, 1,1·G en 1,5·F op het overstek):
  //   M_B = 1,1·0,42465·1,0²/2 + 1,5·2,346·1,0 = 3,7526 kNm
  //   R_A = 0,9·0,42465·3,07/2 − 3,7526/3,07 = 0,5867 − 1,2223 = −0,636 kN.
  // De UGT-combinatie 6.10b met de puntlast geeft −0,447 kN; EQU is maatgevend.
  const invoer = { schema: "2", L_d: "3000", a_opl: "70", a_over: "1000", G_k: "0.6", F_k: "3" };
  const { alle: a, tekst } = reken(invoer, 0);
  gelijk("R_min = −0,636 kN", a.R_min, -0.636, { rel: 3e-3 });
  waar("het blad meldt de verankering", /verankering per balk van ten minste 0\.63/.test(tekst));
  const geen = reken({ schema: "2", L_d: "4000", a_over: "600" }, 0);
  waar("kort overstek: geen trek", geen.alle.R_min > 0 && !/verankering per balk van ten minste/.test(geen.tekst),
    `R_min = ${toon(geen.alle.R_min)}`);
  // Twee ongelijke velden 5,05 + 3,00 m, G_k 0,5: trek in eindoplegging C.
  // Norm-stand: g = 0,6·0,5 + 0,06465 = 0,36465 kN/m, q = 1,05 kN/m. EQU met
  // 1,1·G + 1,5·q op veld 1 en 0,9·G op veld 2: w_1 = 0,40112 + 1,575 =
  // 1,97612, w_2 = 0,32819; M_B = (1,97612·5,05³ + 0,32819·3,0³)/(8·8,05) =
  // (254,500 + 8,861)/64,4 = 4,0895 kNm; R_C = 0,32819·1,5 − 4,0895/3,0 =
  // 0,4923 − 1,3632 = −0,871 kN. De UGT-rij 6.10b met q op veld 1 geeft −0,746.
  const c = reken({ schema: "3", L_veld2: "3000", G_k: "0.5" }, 0);
  gelijk("twee velden: R_min = R_C,min = −0,871 kN", c.alle.R_min, -0.8709, { rel: 3e-3 });
  waar("twee velden: het blad meldt de verankering", /verankering per balk van ten minste 0\.87/.test(c.tekst));
}

// ── 7. Bijkomende doorbuiging ─────────────────────────────────────────────

console.log("\n7. Bijkomende doorbuiging — 71×171 h.o.h. 450, t 25, L 4,05 m, G_k 0,5, Q_k 2,55");
{
  // Norm-stand: w_fin = 19,31 mm, u_g,k = 2,961 mm, w_bij = 16,35 mm.
  // Eindstand: 19,31/(0,004·4050 = 16,20) = 1,192; bijkomend: 16,35/(0,003·4050
  // = 12,15) = 1,346 — de bijkomende is maatgevend en telt nu mee.
  const invoer = { profiel: "10", hoh: "450", t_vloer: "25", L_d: "4000", G_k: "0.5", Q_k: "2.55", belastingcat: "1" };
  const a = reken(invoer, 0).alle;
  gelijk("w_bij = w_fin − u_g,k", a.w_bij, a.w_fin - a.u_g_k, { rel: 1e-3 });
  gelijk("w_bij = 16,35 mm", a.w_bij, 16.35);
  gelijk("UC_doorbuiging = 1,192", a.UC_doorbuiging, 1.192);
  gelijk("UC_bij = 1,346", a.UC_bij, 1.346, { rel: 3e-3 });
  gelijk("UC_max telt de bijkomende mee", a.UC_max, Math.max(a.UC_doorbuiging, a.UC_bij, a.UC_buiging, a.UC_afsch, a.UC_c90, a.UC_G));
  const bros = reken({ ...invoer, grens_bij: "0.002" }, 0).alle;
  gelijk("brosse afwerking: w_lim,bij = 0,002·4050 = 8,10 mm", bros.w_lim_bij, 8.1);
}

// ── 8. Ondergrens k_r ─────────────────────────────────────────────────────

console.log("\n8. k_r — h.o.h. 300, beschot 35 mm met E 10 000");
{
  // (NB.5.1) geldt voor 0 < k_r ≤ 1. k_r,0 = 0,37 + 0,8·0,3 − 10 000·35³/12/5·10⁷
  // = 0,61 − 0,7146 = −0,1046 ligt daarbuiten: geen reductie, k_r = 1 (zoals de
  // gording). Het blad hield hier eerder 1/3 aan: een puntlast die 3× te laag was.
  const a = reken({ hoh: "300", t_vloer: "35", E_beschot: "10000", F_k: "3" }, 0);
  gelijk("k_r,0 = −0,1046", a.alle.k_r_0, -0.1046);
  gelijk("k_r = 1 (buiten 0 < k_r ≤ 1)", a.alle.k_r, 1, { rel: 0, abs: 1e-9 });
  gelijk("F_Q,k = 3,000 kN", a.alle.F_Q_k, 3.0);
  waar("melding: buiten het geldigheidsgebied, geen reductie", /geen reductie, k r = 1/.test(a.tekst));
  // Beschot 30 mm: k_r,0 = 0,61 − 10 000·30³/12/5·10⁷ = 0,61 − 0,45 = 0,16. Binnen het
  // gebied, maar onder de ondergrens van het blad (veilige kant): k_r = 1/3.
  const b = reken({ hoh: "300", t_vloer: "30", E_beschot: "10000", F_k: "3" }, 0);
  gelijk("30 mm: k_r,0 = 0,160", b.alle.k_r_0, 0.16);
  gelijk("30 mm: k_r = 1/3", b.alle.k_r, 1 / 3, { rel: 1e-3 });
  gelijk("30 mm: F_Q,k = 3/3 = 1,000 kN", b.alle.F_Q_k, 1.0);
  // De trillingstoets gebruikt dezelfde k_r (F_tril = 1 kN·k_r). 71×221 C24,
  // L_d 4000 (L = 4050), h.o.h. 400, beschot 35 mm met E 11 000:
  // k_r,0 = 0,37 + 0,32 − 11 000·35³/12/5·10⁷ = 0,69 − 0,786 = −0,096 → k_r = 1;
  // I_y = 71·221³/12 = 63,86·10⁶ mm⁴; w = 1000·4050³/(48·11 000·63,86·10⁶) = 1,970 mm;
  // w/F = 1,970 mm/kN > a = 1: UC 1,97, voldoet niet (met 1/3 was het 0,657, voldoet).
  const c = reken({ L_d: "4000", hoh: "400", t_vloer: "35", E_beschot: "11000", G_k: "0.5", F_k: "3",
    belastingcat: "1", controleer_trilling: "1" }, 0).alle;
  gelijk("trilling: k_r,0 = −0,0960", c.k_r_0, -0.0960);
  gelijk("trilling: F_tril = 1,000 kN", c.F_tril, 1.0);
  gelijk("trilling: w_1kN = 1,970 mm", c.w_1kN, 1.970);
  gelijk("trilling: UC_trilling = 1,970", c.UC_trilling, 1.970);
}

// ── 9. Gedragen balken op een onderslag ───────────────────────────────────

console.log("\n9. Onderslag 96×271, belaste breedte 5,0 m — eigen gewicht van de gedragen balken");
{
  // Norm-stand: g_balk (onderslag) = 0,096·0,271·420·9,81/1000 = 0,1072 kN/m.
  // Zonder g_bl: P_g,k = 5,0·0,6 + 0,1072 = 3,107 kN/m; met g_bl = 0,108 kN/m²
  // (71×221 h.o.h. 600 in C24): 5,0·0,708 + 0,1072 = 3,647 kN/m.
  const invoer = { profiel: "19", ligger: "2", b_ond: "5.0", L_d: "3000", a_opl: "100", G_k: "0.6", F_k: "3" };
  gelijk("zonder g_bl: P_g,k = 3,107", reken(invoer, 0).alle.P_g_k, 3.107);
  gelijk("met g_bl 0,108: P_g,k = 3,647", reken({ ...invoer, g_bl: "0.108" }, 0).alle.P_g_k, 3.647);
  // De bovenzijde van de onderslag onder de balken toetst geen van beide
  // bladen (andere werkzame lengte en k_c,90): de slotregel zegt dat.
  waar("onderslag: de slotregel noemt de druk onder de balken",
    /druk onder de balken op de bovenzijde van de onderslag/.test(reken(invoer, 0).tekst));
  // Bij een balk in de balklaag telt g_bl niet: die draagt geen balken.
  gelijk("balk in de balklaag: g_bl telt niet", reken({ g_bl: "0.5" }).alle.P_g_k, reken({}).alle.P_g_k, { rel: 0, abs: 1e-9 });
}

// ── 10. Kip bij het steunmoment ───────────────────────────────────────────

console.log("\n10. Kip — 46×196, twee velden 3,60 + 3,60 m, G_k 0,3");
{
  // Referentiestand, per balk (h.o.h. 600): g = 0,3·0,6 + 0,046·0,196·5,5 =
  // 0,18 + 0,0496 = 0,2296 kN/m, q = 1,75·0,6 = 1,05 kN/m.
  // Langste zone met een negatief moment: veld 1 alleen permanent, veld 2 vol
  // (6.10b): w1 = 1,2·0,2296 = 0,2755, w2 = 0,2755 + 1,575 = 1,8505;
  // M_B = (w1 + w2)·L²/16 = 2,1260·0,81 = 1,7221 kNm; R_A = w1·L/2 − M_B/L =
  // 0,4959 − 0,4784 = 0,0175 kN; nulpunt op 2·R_A/w1 = 0,127 m, dus een zone van
  // 3,473 m. Het blad bemonstert in stappen van L/48 = 0,075 m en rondt naar de
  // veilige kant af: l_ef tussen 3,473 en 3,548 m (hier 3,525 m, dus σ_m,crit =
  // 17,68 N/mm², λ_rel,m = 1,165, k_crit = 0,686 en UC_kip = 1,005).
  const invoer = { profiel: "4", schema: "3", L_d: "3550", L_veld2: "3600", G_k: "0.3" };
  const a = reken(invoer).alle;
  waar("l_ef = zone met negatief moment (3,473 … 3,548 m)", a.l_ef >= 3.473 - 1e-3 && a.l_ef <= 3.548 + 1e-3, `l_ef = ${toon(a.l_ef)} m`);
  // (6.32), (6.30), (6.34) met die l_ef, en M_B uit 6.10b met beide velden vol:
  // M_B = 1,8505·3,6²/8 = 2,9978 kNm; W = 46·196²/6 = 294 523 mm³.
  const σcrit = (0.78 * 46 ** 2 * 7400) / (196 * a.l_ef * 1000);
  const λ = Math.sqrt(24 / σcrit);
  const kcrit = λ <= 0.75 ? 1 : λ <= 1.4 ? 1.56 - 0.75 * λ : 1 / λ ** 2;
  gelijk("σ_m,crit = 0,78·b²·E_0,05/(h·l_ef)", a.σ_m_crit, σcrit);
  gelijk("λ_rel,m = √(f_m,k/σ_m,crit)", a.λ_rel_m, λ);
  gelijk("k_crit (6.34)", a.k_crit, kcrit);
  waar("k_crit < 1: de kip telt", a.k_crit < 1, `k_crit = ${toon(a.k_crit)}`);
  gelijk("UC_kip = M_B/(W·k_crit·f_m,d)", a.UC_kip, (2.9978e6 / 294523) / (kcrit * (0.8 * 24 / 1.3)), { rel: 3e-3 });
  // Eén veld: geen negatief moment, dus geen kiptoets (de bovenrand is gesteund).
  const enkel = reken({ profiel: "4" }).alle;
  waar("enkelvoudige ligger: geen UC_kip", !(enkel.UC_kip > 0));
}

// ── 11. Startwaarden van het beeld ────────────────────────────────────────

console.log("\n11. Startwaarden van het beeld");
{
  const bron = readFileSync(join(hier, "../packages/desktop/src/components/calc/BalklaagDesigner.tsx"), "utf8");
  const blok = bron.match(/const DEFAULTS[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
  // Categorie A: Q_k = 3,0 kN naast q_k = 1,75 kN/m² (NB tabel 6.2 bij EN 1991-1-1).
  waar("F_k = 3 kN", /\bF_k:\s*3\b/.test(blok));
  for (const k of ["a_steun", "g_bl", "grens_bij"]) waar(`startwaarde voor ${k}`, new RegExp(`\\b${k}:`).test(blok));
}

afronden(fouten, "Balklaag — toetsen");
