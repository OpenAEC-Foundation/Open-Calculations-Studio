/**
 * Controlescript voor de module Portaal en spant (templates/portaalSpant.ts).
 *
 * Geen referentieberekening beschikbaar. De rekenkern zelf (het raamwerk, α_cr)
 * is getoetst in scripts/check-raamwerk-kern.mjs. Dit script toetst het blad
 * met voorbeelden die hieronder met de hand zijn uitgewerkt, met gesloten
 * formules voor de krachtsverdeling en de normformules voor de toetsen:
 *
 *   1. Stalen portaal met twee scharnieren, plat dak, HEA 300 en IPE 400, S235,
 *      alleen permanente last en dakbelasting: het knoopmoment qL²/(4(2k + 3))
 *      met de scheefstand φ·V_Ed (5.3.2(3)), α_cr uit (5.2) met de zijdelingse
 *      verplaatsing (h²/12)(2h/EI_k + L/EI_r), de kolom op doorsnede, knik,
 *      kip (C_1 = 1,75 bij ψ = 0) en druk met buiging (bijlage B, C_my = 0,6),
 *      de regel op doorsnede en dwarskracht, en de doorbuiging van de regel
 *      ten opzichte van de knieën 5qL⁴/(384EI) − M_k·L²/(8EI).
 *   2. Houten A-spant met nokscharnier en trekband, C24 75×225, sneeuw: de
 *      trekkracht wB²/(8f), het moment w(B/2)²/8 in de spoor, druk met buiging,
 *      knik, kip, afschuiving met k_mod kort, de trekband, en de doorbuiging van
 *      de spoor loodrecht op zijn koorde met k_def.
 *   3. Elk systeem en elk materiaal rekent door zonder foutmelding; een leeg
 *      blad vraagt om invoer en geeft geen slotregel; de module staat in het
 *      register en in de modulelijst.
 *   4. Ingeklemd stalen portaal met sneeuw en wind (c_pe per vlak, c_pi +0,2
 *      en −0,3): hoekveranderingsvergelijkingen met zijverplaatsing voor de
 *      reacties met de scheefstand, δ en α_cr uit (5.2), de kolom op
 *      doorsnede, kip en druk met buiging, de BGT, en α_cr uit de
 *      knikberekening tegen de knikvergelijking x·cot x = −6/G_B.
 *   5. Houten A-spant met nokscharnier en trekband onder wind en ongelijke
 *      sneeuw: statica per combinatie, de toetsen van de sporen, de trekband
 *      en de doorbuiging loodrecht op de spoor.
 *   6. A-spant met de knikberekening (methode 2): blijft eerste orde, zonder
 *      vergroting; α_cr alleen ter informatie.
 *
 * De tussenwaarden staan verborgen in het blad; het script toont ze door de
 * namen aan het eind van het blad te laten afdrukken.
 *
 * Draaien:  node scripts/check-portaal.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { laadTemplate } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const tpl = laadTemplate("portaalSpant.ts");
/** Projectgegevens zoals de app ze vóór de eerste regel in de scope zet (CC2). */
const SCOPE = { CC: 2, RC: 2, K_FI: 1, DesignLife: 50, rekenwijze: 1, windgebied: 2, terreincategorie: 2 };

let fouten = 0;
let getest = 0;

/** Doorrekenen met de verborgen namen erbij; de uitkomsten als getal en de platte tekst. */
function doorreken(waarden, namen = []) {
  const extra = namen.map((n, i) => `x_${i} = ${n}`).join("\n");
  const nodes = evaluate(parse(`${tpl}\n${extra}\n`), waarden, SCOPE);
  const uit = {};
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "assignment" || n.type === "var-display") {
        const w = parseFloat(String(n.result).replace(",", "."));
        if (Number.isFinite(w)) uit[n.name] = w;
      }
      if (Array.isArray(n.children)) loop(n.children);
    }
  };
  loop(nodes);
  namen.forEach((n, i) => { uit[n] = uit[`x_${i}`]; });
  const html = render(nodes);
  const tekst = html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return { uit, tekst, html };
}

/** Vergelijkt met de handberekening; het blad drukt 4 significante cijfers af. */
function toets(r, verwacht, tol = 2e-3) {
  for (const [naam, doel] of Object.entries(verwacht)) {
    getest++;
    const ons = r.uit[naam];
    const ok = ons !== undefined && (Math.abs(ons - doel) <= tol * Math.max(Math.abs(doel), 1e-9) || Math.abs(ons - doel) < 1e-9);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(12)} blad ${String(ons).padStart(10)}   hand ${Number(doel.toPrecision(6))}`);
  }
}
function waar(wat, ok, detail = "") {
  getest++;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${wat}${ok || !detail ? "" : ` — ${detail}`}`);
}
function geenFouten(r, wat) {
  const signaal = ["Error", "Undefined symbol", "NaN", "niet gedefinieerd", "Unexpected type"].find((s) => r.tekst.includes(s));
  waar(`${wat}: geen foutmelding of NaN`, !signaal, signaal ? r.tekst.slice(Math.max(0, r.tekst.indexOf(signaal) - 80), r.tekst.indexOf(signaal) + 80) : "");
  const svgNaN = (r.html.match(/<svg[\s\S]*?<\/svg>/g) || []).some((s) => /="[^"]*(NaN|Infinity)[^"]*"/.test(s));
  waar(`${wat}: tekeningen zonder NaN`, !svgNaN);
}

/** Knikfactor volgens (6.49) en kipfactor volgens (6.57) met λ̄_LT,0 = 0,4 en β = 0,75. */
const χ = (λ, α) => { const Φ = 0.5 * (1 + α * (λ - 0.2) + λ * λ); return Math.min(1, 1 / (Φ + Math.sqrt(Φ * Φ - λ * λ))); };
const χLT = (λ, α) => { const Φ = 0.5 * (1 + α * (λ - 0.4) + 0.75 * λ * λ); return Math.min(1, 1 / (λ * λ), 1 / (Φ + Math.sqrt(Φ * Φ - 0.75 * λ * λ))); };
/** M_cr volgens bijlage NB.NB (C_2 = 0). */
const Mcr = (C1, L, EIz, GIt, EIw) => ((C1 * Math.PI) / L) * Math.sqrt(EIz * GIt) * Math.sqrt(1 + (Math.PI ** 2 * (EIw / GIt)) / L ** 2);

// ── 1. Stalen portaal met twee scharnieren ──────────────────────────────────
console.log("\n1. Stalen portaal, scharnierende voeten, L = 12 m, h = 5 m, plat, HEA 300 / IPE 400, S235, G + dak");
const VOORBEELD_1 = {
  materiaal: "1", systeem: "1", L_sp: "12", H_k: "5", "α_dak": "0", a_sp: "5", a_zk: "0", a_zr: "2",
  profiel_k: "10", profiel_r: "27", staalsoort: "235", g_dak: "0.5", dakbel: "1", sneeuwbel: "0", windbel: "0",
  methode: "1", gebouw: "300", uiterlijk: "1",
};
{
  const r = doorreken(VOORBEELD_1, [
    "vV.(2)", "vH.(2)", "vA.(2)", "vK.(2)", "mth", "φ_n", "δ_1",
    "Ud_1", "Uv_1", "Un_1", "Ul_1", "Ui_1", "Ud_2", "Uv_2", "w_bij", "w_mx", "u_h",
  ]);
  geenFouten(r, "voorbeeld 1");
  const E = 210e6, G = 81e6, fy = 235e3, L = 12, h = 5, a = 5;
  // HEA 300 en IPE 400 uit de profieltabel.
  const k_ = { A: 112.5e-4, Iy: 18260e-8, Wpl: 1383e-6, Avz: 37.28e-4, Iz: 6310e-8, It: 85.17e-8, Iw: 1200000e-12 };
  const r_ = { A: 84.46e-4, Iy: 23130e-8, Wpl: 1307e-6, Avz: 42.69e-4, Iz: 1318e-8, It: 51.08e-8, Iw: 490000e-12 };
  // Belasting per m regel: 0,5·5 + 78,5·A = 3,163 kN/m permanent, 1,0·5 = 5 kN/m dak (α < 15°).
  const g = 0.5 * a + 78.5 * r_.A, gk = 78.5 * k_.A, q = 1.0 * a;
  // Combinatie 2: 1,2·G + 1,5·Q = 11,30 kN/m; V_Ed = q_d·L + 2·1,2·g_kolom·h = 146,1 kN.
  const qd = 1.2 * g + 1.5 * q;
  const VEd = qd * L + 2 * 1.2 * gk * h;
  // φ = φ_0·α_h·α_m = (1/200)·(2/√5)·√0,75 = 3,873·10⁻³; H = φ·V_Ed = 0,566 kN.
  const φ = (1 / 200) * (2 / Math.sqrt(5)) * Math.sqrt(0.75);
  const H = φ * VEd;
  // δ onder H = 1 kN in de knieën: (h²/12)(2h/EI_k + L/EI_r); α_cr = h/(V_Ed·δ) = 32,3 ≥ 10: geen vergroting.
  const EIk = E * k_.Iy, EIr = E * r_.Iy;
  const δ1 = ((h * h) / 12) * ((2 * h) / EIk + L / EIr);
  const αcr = h / (VEd * δ1);
  toets(r, { "vV.(2)": VEd, "φ_n": φ, "vH.(2)": H, "δ_1": δ1, "vA.(2)": αcr, "vK.(2)": 1, mth: 1 });

  // Knoopmoment qL²/(4(2k + 3)) met k = I_r·h/(I_k·L); de scheefstand ±H·h/2 in de knieën.
  const k = (r_.Iy * h) / (k_.Iy * L);
  const Mg = (qd * L * L) / (4 * (2 * k + 3));
  const Mknie = Mg + (H * h) / 2; // rechterknie: beide trek aan de buitenzijde
  // Rechterkolom: N aan de voet = q_d·L/2 + 1,2·g_kolom·h + H·h/L; V = M_g/h + H/2.
  const N = (qd * L) / 2 + 1.2 * gk * h + (H * h) / L;
  const V = Mg / h + H / 2;
  // Doorsnede: klasse 1 (flens c/t = 8,48 ≤ 9; lijf 24,5 ≤ 396ε/(13α − 1)), n klein: M_N,Rd = M_pl,Rd.
  const Mpl = k_.Wpl * fy;
  const Vpl = (k_.Avz * fy) / Math.sqrt(3);
  // Knik: L_cr,y = L_cr,z = h; h/b ≤ 1,2: kromme b om y, c om z.
  const λy = h * Math.sqrt((k_.A * fy) / (Math.PI ** 2 * EIk));
  const λz = h * Math.sqrt((k_.A * fy) / (Math.PI ** 2 * E * k_.Iz));
  const χy = χ(λy, 0.34), χz = χ(λz, 0.49);
  const Npl = k_.A * fy;
  // Kip over de hele kolom: lineair moment van 0 tot M_knie, ψ = 0 → C_1 = 1,75 (tabel NB.NB.1); kromme b.
  const mcr = Mcr(1.75, h, E * k_.Iz, G * k_.It, E * k_.Iw);
  const λLT = Math.sqrt((k_.Wpl * fy) / mcr);
  const Mb = χLT(λLT, 0.34) * k_.Wpl * fy;
  // Bijlage B: C_my = C_mLT = 0,6 + 0,4ψ = 0,6; klasse 1, λ̄_z ≥ 0,4.
  const ny = N / (χy * Npl), nz = N / (χz * Npl);
  const kyy = 0.6 * Math.min(1 + (λy - 0.2) * ny, 1 + 0.8 * ny);
  const kzy = Math.max(1 - (0.1 * λz * nz) / (0.6 - 0.25), 1 - (0.1 * nz) / (0.6 - 0.25));
  const ui = Math.max(ny + (kyy * Mknie) / Mb, nz + (kzy * Mknie) / Mb);
  console.log(`  (kolom: N = ${N.toFixed(2)} kN, M = ${Mknie.toFixed(2)} kNm, λ̄_y = ${λy.toFixed(3)}, λ̄_z = ${λz.toFixed(3)}, M_cr = ${mcr.toFixed(1)} kNm)`);
  toets(r, { Ud_1: Mknie / Mpl, Uv_1: V / Vpl, Un_1: N / (Math.min(χy, χz) * Npl), Ul_1: Mknie / Mb, Ui_1: ui });

  // Regel: veldmoment qL²/8 − M_g (de scheefstand is in het midden nul), dwarskracht qL/2 + H·h/L.
  const Mveld = (qd * L * L) / 8 - Mg;
  const Vr = (qd * L) / 2 + (H * h) / L;
  toets(r, { Ud_2: Mveld / (r_.Wpl * fy), Uv_2: Vr / ((r_.Avz * fy) / Math.sqrt(3)) });

  // Doorbuiging van de regel ten opzichte van de knieën: 5qL⁴/(384EI) − M_k·L²/(8EI).
  // Bijkomend (staal, k_def = 0): alleen de dakbelasting; eindstand: G + Q.
  const wQ = (5 * q * L ** 4) / (384 * EIr) - ((q * L * L) / (4 * (2 * k + 3))) * (L * L) / (8 * EIr);
  const wGQ = (wQ * (g + q)) / q;
  // Horizontaal: de knieën schuiven alleen met de verkorting van de regel, H_k·L/(2EA) met de spatkracht bij G + Q.
  const uh = ((((g + q) * L * L) / (4 * h * (2 * k + 3))) * L) / (2 * E * r_.A);
  toets(r, { w_bij: wQ, w_mx: wGQ }, 3e-3);
  toets(r, { u_h: uh }, 2e-2);
  waar("voorbeeld 1: slotregel met voldoet", /Maatgevende UC = [\d.]+ ≤ 1\.0 → het spant voldoet/.test(r.tekst), r.tekst.slice(r.tekst.lastIndexOf("Maatgevende UC"), r.tekst.lastIndexOf("Maatgevende UC") + 80));
  // Zelfde portaal met de knikberekening: α_cr volgt dan uit de oplosser en is kleiner dan uit (5.2)
  // (de drukkracht in de regel en de verdeelde last tellen mee), maar ruim boven 10.
  const r2 = doorreken({ ...VOORBEELD_1, methode: "2" }, ["vA.(2)", "vK.(2)", "mth"]);
  geenFouten(r2, "voorbeeld 1, knikberekening");
  waar("knikberekening: methode 2 gebruikt", r2.uit.mth === 2);
  waar("knikberekening: α_cr tussen 10 en de waarde uit (5.2)", r2.uit["vA.(2)"] > 10 && r2.uit["vA.(2)"] <= αcr * 1.01, String(r2.uit["vA.(2)"]));
}

// ── 2. Houten A-spant met nokscharnier en trekband ──────────────────────────
console.log("\n2. Houten A-spant, C24 75×225, B = 8 m, α = 30°, h.o.h. 0,6 m, trekband Ø16, dakopbouw 0,5 kN/m² en sneeuw");
const VOORBEELD_2 = {
  materiaal: "2", systeem: "3", L_sp: "8", "α_dak": "30", a_sp: "0.6", a_zr: "1", trekband: "1", nok: "1", d_tb: "16",
  houtklasse: "2", klimaat: "1", b_reg: "75", h_reg: "225", g_dak: "0.5", dakbel: "0", sneeuwbel: "1", windbel: "0",
  methode: "1", uiterlijk: "1",
};
{
  const r = doorreken(VOORBEELD_2, ["Ud_2", "Uv_2", "Un_2", "Ul_2", "UC_tb", "w_bij", "w_mx", "mth", "vK.(3)"]);
  geenFouten(r, "voorbeeld 2");
  const B = 8, α = Math.PI / 6, a = 0.6, b = 0.075, hh = 0.225;
  const A = b * hh, W = (b * hh * hh) / 6, I = (b * hh ** 3) / 12;
  const f = (B / 2) * Math.tan(α), Lr = B / 2 / Math.cos(α);
  // Per m spoor verticaal: ρ·g·A + 0,5·a = 0,3695 kN/m; sneeuw μ_1 = 0,8 (α ≤ 30°): 0,56·0,6 = 0,336 kN/m per m grondvlak.
  const g = (420 * 9.81 * A) / 1000 + 0.5 * a;
  const s = 0.8 * 0.7 * a;
  // Combinatie 3 (1,2·G + 1,5·S, k_mod kort 0,9) per m grondvlak: w = 1,2·g/cos α + 1,5·s = 1,016 kN/m.
  const w = (1.2 * g) / Math.cos(α) + 1.5 * s;
  // Driescharnierspant met trekband: T = wB²/(8f); spoor als ligger over B/2: M = w(B/2)²/8.
  const T = (w * B * B) / (8 * f);
  const M = (w * (B / 2) ** 2) / 8;
  const Vv = (w * B) / 2;
  const N = Vv * Math.sin(α) + T * Math.cos(α); // druk aan de voet
  const V = Vv * Math.cos(α) - T * Math.sin(α);
  console.log(`  (T = ${T.toFixed(3)} kN, M = ${M.toFixed(3)} kNm, N = ${N.toFixed(3)} kN, V = ${V.toFixed(3)} kN)`);
  const kmod = 0.9, γM = 1.3;
  const fmd = (kmod * 24e3) / γM, fc0d = (kmod * 21e3) / γM, fvd = (kmod * 4e3) / γM;
  const σc = N / A, σm = M / W;
  // Knik: l_ef,y = de spoor, l_ef,z = 1 m (de steunafstand), β_c = 0,2.
  const λrel = (l, d) => (l / (d / Math.sqrt(12)) / Math.PI) * Math.sqrt(21 / 7400);
  const kc = (λ) => { if (λ <= 0.3) return 1; const kk = 0.5 * (1 + 0.2 * (λ - 0.3) + λ * λ); return 1 / (kk + Math.sqrt(kk * kk - λ * λ)); };
  const kcy = kc(λrel(Lr, hh)), kcz = kc(λrel(1, b));
  // Kip: l_ef = 1 + 2h (tabel 6.1, last op de gedrukte rand); λ_rel,m = √(f_m,k·h·l_ef/(0,78·b²·E_0,05)).
  const λm = Math.sqrt((24 * hh * (1 + 2 * hh)) / (0.78 * b * b * 7400));
  const kcrit = λm <= 0.75 ? 1 : λm <= 1.4 ? 1.56 - 0.75 * λm : 1 / λm ** 2;
  toets(r, {
    Ud_2: (σc / fc0d) ** 2 + σm / fmd,
    Uv_2: (1.5 * V) / A / fvd,
    Un_2: Math.max(σc / (kcy * fc0d) + σm / fmd, σc / (kcz * fc0d) + (0.7 * σm) / fmd),
    Ul_2: (σm / (kcrit * fmd)) ** 2 + σc / (kcz * fc0d),
    UC_tb: T / ((Math.PI * 0.016 ** 2) / 4 * 235e3),
    mth: 0, "vK.(3)": 1,
  });
  // Doorbuiging van de spoor loodrecht op de koorde: 5pL⁴/(384EI) met p de last loodrecht op de spoor,
  // G: g·cos α per m spoor, S: s·cos²α per m spoor. Bijkomend k_def·w_G + w_S, eindstand (1 + k_def)·w_G + w_S.
  const EI = 11000e3 * I;
  const wG = (5 * g * Math.cos(α) * Lr ** 4) / (384 * EI);
  const wS = (5 * s * Math.cos(α) ** 2 * Lr ** 4) / (384 * EI);
  toets(r, { w_bij: 0.6 * wG + wS, w_mx: 1.6 * wG + wS }, 3e-3);
  waar("voorbeeld 2: slotregel met voldoet", /Maatgevende UC = [\d.]+ ≤ 1\.0 → het spant voldoet/.test(r.tekst));
}

// ── 3. Alle systemen, een leeg blad en de registratie ───────────────────────
console.log("\n3. Alle systemen en materialen, een leeg blad, de registratie");
{
  const basis = {
    ...VOORBEELD_1, "α_dak": "12", sneeuwbel: "1", windbel: "1", c_pe_D: "0.8", c_pe_E: "-0.5", c_pe_1: "-0.4", c_pe_2: "-0.5",
    b_kol: "140", h_kol: "450", b_reg: "140", h_reg: "450", houtklasse: "4", klimaat: "2", d_tb: "20",
  };
  for (const [naam, v] of [
    ["ingeklemd portaal, knikberekening", { systeem: "2", methode: "2" }],
    ["A-spant zonder trekband, stijve nok", { systeem: "3", "α_dak": "35", trekband: "0", nok: "0" }],
    ["lessenaarspant, ingeklemd", { systeem: "4", "α_dak": "5", voet: "1" }],
    ["houten portaal", { materiaal: "2", L_sp: "9", H_k: "3.5" }],
    ["houten lessenaarspant", { materiaal: "2", systeem: "4", "α_dak": "6", L_sp: "8", H_k: "3" }],
  ]) {
    const r = doorreken({ ...basis, ...v });
    geenFouten(r, naam);
    waar(`${naam}: slotregel`, /Maatgevende UC = [\d.]+/.test(r.tekst));
  }
  const leeg = doorreken({});
  waar("leeg: vraagt om de overspanning", /Vul de overspanning/.test(leeg.tekst));
  waar("leeg: geen slotregel", !/Maatgevende UC/.test(leeg.tekst));
  const index = readFileSync(join(hier, "../packages/desktop/src/templates/index.ts"), "utf8");
  const boom = readFileSync(join(hier, "../packages/desktop/src/components/calc/projectTree.ts"), "utf8");
  waar("register: templates/index.ts", /"portaal-spant": portaalSpant/.test(index));
  waar("modulelijst: projectTree.ts met status controleren", /templateId: "portaal-spant", status: "controleren"/.test(boom));
}

// ── 4. Ingeklemd stalen portaal met wind ────────────────────────────────────
console.log("\n4. Ingeklemd stalen portaal, L = 12 m, h = 5 m, plat, HEA 240 / IPE 360, S235, G + sneeuw + wind (q_p = 0,8)");
const VOORBEELD_4 = {
  materiaal: "1", systeem: "2", L_sp: "12", H_k: "5", "α_dak": "0", a_sp: "5", a_zk: "0", a_zr: "2",
  profiel_k: "8", profiel_r: "26", staalsoort: "235", g_dak: "0.6", dakbel: "0", sneeuwbel: "2", s_in: "0.56",
  windbel: "2", q_p_in: "0.8", c_pe_D: "0.8", c_pe_E: "-0.5", c_pe_1: "-1.0", c_pe_2: "-0.6", methode: "1", gebouw: "300", uiterlijk: "1",
};
{
  const R = (c, i, j) => `raamwerk_R(kn; st; opl; last; F(${c}))[${i}; ${j}]`;
  const r = doorreken(VOORBEELD_4, [
    "δ_1", "vA.(3)", "vV.(9)", "vH.(9)", R(9, 1, 2), R(9, 1, 3), R(9, 1, 4), R(9, 2, 2), R(9, 2, 3), R(9, 2, 4),
    R(12, 1, 2), R(12, 1, 4), R(12, 2, 4), "Ud_1", "Ul_1", "Ui_1", "UC_uh", "UC_wmax",
  ]);
  geenFouten(r, "voorbeeld 4");
  // Handberekening met de hoekveranderingsvergelijkingen, onbekenden θ_B, θ_C (rechtsom) en de zijverplaatsing Δ,
  // zonder de rek van de staven (die geeft tot 0,7 % verschil: tolerantie 1 %).
  //   M_AB = k_k(θ_B − 3ψ) + F_AB, M_BA = k_k(2θ_B − 3ψ) + F_BA, ψ = Δ/h, k_k = 2EI_k/h; idem D–C;
  //   M_BC = k_r(2θ_B + θ_C) + F_BC, M_CB = k_r(2θ_C + θ_B) + F_CB, k_r = 2EI_r/L;
  //   M_BA + M_BC = 0, M_CD + M_CB = 0, H_A + H_D + (w_1 + w_4)·h + H = 0 met H_A = (M_AB + M_BA − w_1h²/2)/h.
  // Wind: (c_pe − c_pi)·q_p·a loodrecht op het vlak; de linkerkolom naar +x bij druk, de rechter naar −x bij druk.
  const E = 210e6, L = 12, h = 5, a = 5, qp = 0.8 * a;
  const kol = { A: 76.84e-4, I: 7763e-8, Wpl: 744.6e-6, Iz: 2769e-8, It: 41.55e-8, Iw: 328500e-12 };
  const EIk = E * kol.I, EIr = E * 16270e-8;
  const gk = 78.5 * kol.A, gr = 78.5 * 72.73e-4 + 0.6 * a; // 0,603 en 3,571 kN/m
  const los = ({ w1 = 0, w4 = 0, qL = 0, qR = 0, gkol = 0, H = 0 }) => {
    // Simpson per helft van de regel, met de last van die helft (de sprong ligt in L/2).
    const int = (f) => { let s = 0; for (const [p, q, w] of [[0, L / 2, qL], [L / 2, L, qR]]) { const n = 600, d = (q - p) / n; for (let i = 0; i <= n; i++) s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * f(p + i * d, w) * d / 3; } return s; };
    const FBC = -int((x, w) => w * x * (L - x) ** 2 / L ** 2), FCB = int((x, w) => w * x * x * (L - x) / L ** 2);
    const FAB = -w1 * h * h / 12, FBA = -FAB, FDC = -w4 * h * h / 12, FCD = -FDC;
    const kk = 2 * EIk / h, kr = 2 * EIr / L;
    const A = [[2 * kk + 2 * kr, kr, -3 * kk / h], [kr, 2 * kk + 2 * kr, -3 * kk / h], [3 * kk / h, 3 * kk / h, -12 * kk / h / h]];
    const b = [-(FBA + FBC), -(FCD + FCB), -((FAB + FBA - w1 * h * h / 2) / h + (FDC + FCD - w4 * h * h / 2) / h + (w1 + w4) * h + H)];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const [tB, tC, Δ] = [0, 1, 2].map((k) => det(A.map((rij, i) => rij.map((v, j) => (j === k ? b[i] : v)))) / det(A));
    const MAB = kk * (tB - 3 * Δ / h) + FAB, MBA = kk * (2 * tB - 3 * Δ / h) + FBA;
    const MDC = kk * (tC - 3 * Δ / h) + FDC, MCD = kk * (2 * tC - 3 * Δ / h) + FCD;
    const MBC = kr * (2 * tB + tC) + FBC, MCB = kr * (2 * tC + tB) + FCB;
    const RB = (int((x, w) => w * (L - x)) - MBC - MCB) / L;
    return { Δ, MAB, MBA, MDC, MCD, MBC, HA: (MAB + MBA - w1 * h * h / 2) / h, HD: (MDC + MCD - w4 * h * h / 2) / h, RyA: RB + gkol * h, RyD: int((x, w) => w) - RB + gkol * h };
  };
  const som = (...ds) => { const o = {}; for (const [f, d] of ds) for (const k in d) o[k] = (o[k] ?? 0) + f * d[k]; return o; };
  const G = { qL: gr, qR: gr, gkol: gk }, S = { qL: 0.56 * a, qR: 0.56 * a };
  const wind = (cD, cE, c1, c2, cpi) => ({ w1: (cD - cpi) * qp, w4: -(cE - cpi) * qp, qL: (c1 - cpi) * qp, qR: (c2 - cpi) * qp });
  // δ onder H = 1 kN in de knieën: 0,4731 mm; φ = (1/200)·(2/√5)·√0,75 = 3,873·10⁻³.
  const δ1 = Math.abs(los({ H: 1 }).Δ);
  const φ = (1 / 200) * (2 / Math.sqrt(5)) * Math.sqrt(0.75);
  // Combinatie 3 (1,2·G + 1,5·S): V_Ed = 109,06 kN, α_cr = h/(V_Ed·δ) = 96,9 ≥ 10.
  const c3 = som([1.2, G], [1.5, S]);
  const V3 = los(c3).RyA + los(c3).RyD;
  // Combinatie 9 (0,9·G + 1,5·W van links, c_pi = −0,3): V_Ed = 7,99 kN, φ·V_Ed = 0,031 kN naar rechts.
  const c9 = som([0.9, G], [1.5, wind(0.8, -0.5, -1.0, -0.6, -0.3)]);
  const V9 = los(c9).RyA + los(c9).RyD;
  const r9 = los(som([1, c9], [1, { H: φ * V9 }]));
  // Combinatie 12 (1,2·G + 1,5·W van rechts, c_pi = −0,3): V_Ed = 22,66 kN, φ·V_Ed naar links.
  const c12 = som([1.2, G], [1.5, wind(-0.5, 0.8, -0.6, -1.0, -0.3)]);
  const V12 = los(c12).RyA + los(c12).RyD;
  const r12 = los(som([1, c12], [1, { H: -φ * V12 }]));
  console.log(`  (combinatie 9: R_A = ${r9.HA.toFixed(2)} / ${r9.RyA.toFixed(2)} kN, M_A = ${r9.MAB.toFixed(2)} kNm; R_D = ${r9.HD.toFixed(2)} / ${r9.RyD.toFixed(2)} kN, M_D = ${r9.MDC.toFixed(2)} kNm)`);
  toets(r, {
    "δ_1": δ1, "vA.(3)": h / (V3 * δ1), "vV.(9)": V9, "vH.(9)": φ * V9,
    [R(9, 1, 2)]: r9.HA, [R(9, 1, 3)]: r9.RyA, [R(9, 1, 4)]: r9.MAB, [R(9, 2, 2)]: r9.HD, [R(9, 2, 3)]: r9.RyD, [R(9, 2, 4)]: r9.MDC,
    [R(12, 1, 2)]: r12.HA, [R(12, 1, 4)]: r12.MAB, [R(12, 2, 4)]: r12.MDC,
  }, 1e-2);
  // Kolommen, maatgevend combinatie 3 in de rechterkolom: M_knie = 71,3 kNm, N = 54,6 kN, klasse 1, N < 0,5·h_w·t_w·f_y:
  // M_N,Rd = M_pl,Rd = 175,0 kNm. Kip over 5 m zonder last op de kolom: ψ = M_voet/M_knie = −0,505 →
  // C_1 = 1,75 + 1,05·0,505 + 0,3·0,505² = 2,36 → 2,3; C_my = C_mLT = 0,6 + 0,4ψ = 0,40 (ondergrens 0,4).
  const r3 = los(c3);
  const fy = 235e3, Npl = kol.A * fy, Mpl = kol.Wpl * fy;
  const Mk = Math.abs(r3.MCD), Mv = -r3.MDC, N = r3.RyD, ψ = Mv / -Mk;
  const C1 = Math.min(1.75 - 1.05 * ψ + 0.3 * ψ * ψ, 2.3);
  const mcr = Mcr(C1, h, E * kol.Iz, 81e6 * kol.It, E * kol.Iw);
  const Mb = χLT(Math.sqrt(Mpl / mcr), 0.34) * Mpl; // HEA 240: h/b ≤ 2, kromme b
  const λy = h * Math.sqrt(Npl / (Math.PI ** 2 * EIk)), λz = h * Math.sqrt(Npl / (Math.PI ** 2 * E * kol.Iz));
  const ny = N / (χ(λy, 0.34) * Npl), nz = N / (χ(λz, 0.49) * Npl);
  const Cm = Math.max(0.6 + 0.4 * ψ, 0.4);
  const kyy = Cm * Math.min(1 + (λy - 0.2) * ny, 1 + 0.8 * ny);
  const kzy = Math.max(1 - (0.1 * λz * nz) / (Cm - 0.25), 1 - (0.1 * nz) / (Cm - 0.25));
  // BGT: de knieën bij wind (karakteristiek) Δ = 5,04 mm ≤ h/300; het dak G + S: 5qL⁴/384EI − M_k·L²/8EI = 22,31 mm ≤ L/250.
  const Δw = Math.abs(los(som([1, G], [1, wind(0.8, -0.5, -1.0, -0.6, 0.2)])).Δ);
  const gs = som([1, G], [1, S]), rgs = los(gs);
  const wd = (5 * gs.qL * L ** 4) / (384 * EIr) + (rgs.MBC * L * L) / (8 * EIr);
  toets(r, {
    Ud_1: Mk / Mpl, Ul_1: Mk / Mb, Ui_1: Math.max(ny + (kyy * Mk) / Mb, nz + (kzy * Mk) / Mb),
    UC_uh: Δw / (h / 300), UC_wmax: wd / (L / 250),
  }, 1e-2);
  // Knikberekening: zijdelingse knik van het ingeklemde portaal, x·cot x = −6/G_B met G_B = (I_k/h)/(I_r/L)
  // (regel in dubbele kromming): x = 2,670, K = π/x = 1,1765, N_cr = π²EI_k/(K·h)² = 4650 kN per kolom,
  // α_cr = 2·4650/109,06 = 85,3 — 12 % lager dan (5.2) geeft (96,9).
  const GB = (7763 / 5) / (16270 / 12);
  let lo = Math.PI / 2 + 1e-9, hi = Math.PI - 1e-9;
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (m / Math.tan(m) + 6 / GB > 0) lo = m; else hi = m; }
  const Ncr = (Math.PI ** 2 * EIk) / ((Math.PI / lo) * h) ** 2;
  const rk = doorreken({ ...VOORBEELD_4, methode: "2" }, ["vA.(3)", "mth"]);
  toets(rk, { "vA.(3)": (2 * Ncr) / V3, mth: 2 }, 2e-3);
}

// ── 5. Houten A-spant met wind en ongelijke sneeuw ──────────────────────────
console.log("\n5. Houten A-spant C24 75×200, nokscharnier, trekband Ø16, B = 8 m, 30°, h.o.h. 1,2 m, sneeuw en wind (q_p = 0,7)");
{
  const r = doorreken({
    materiaal: "2", systeem: "3", L_sp: "8", "α_dak": "30", a_sp: "1.2", trekband: "1", nok: "1", d_tb: "16", a_zr: "0.6",
    houtklasse: "2", klimaat: "1", b_reg: "75", h_reg: "200", g_dak: "0.5", dakbel: "0", sneeuwbel: "1", windbel: "2", q_p_in: "0.7",
    c_pe_1: "0.4", c_pe_2: "-0.5", methode: "1", uiterlijk: "1",
  }, ["Ud_2", "Uv_2", "Un_2", "Ul_2", "UC_tb", "UC_wbij", "UC_wmax"]);
  geenFouten(r, "voorbeeld 5");
  // Statica van het driescharnierspant: reacties uit het evenwicht van het geheel, de trekbandkracht uit het
  // momentenevenwicht van de linkerhelft om de nok, en per spoor N, V en M uit het vrije lichaam tot s.
  // Belasting per m spoor: G verticaal g = ρ·g·A + 0,5·1,2 = 0,6618; sneeuw 0,56·1,2 = 0,672 per m grondvlak;
  // wind (c_pe − c_pi)·0,84 loodrecht, druk op de buitenzijde positief.
  const B = 8, α = Math.PI / 6, c = Math.cos(α), sn = Math.sin(α), f = (B / 2) * Math.tan(α), Lr = B / 2 / c;
  const b = 0.075, hh = 0.2, A = b * hh, W = (b * hh * hh) / 6, I = (b * hh ** 3) / 12;
  const g = (420 * 9.81 * A) / 1000 + 0.5 * 1.2, s = 0.8 * 0.7 * 1.2, qp = 0.7 * 1.2;
  const spant = (l1, l2) => {
    const q = [l1, l2].map((ld, k) => {
      const n = k === 0 ? [sn, -c] : [-sn, -c]; // binnenzijde van de spoor
      return { qx: ld.w * n[0], qy: -ld.g - ld.s * c + ld.w * n[1] }; // per m spoor
    });
    const Fx = q.map((x) => x.qx * Lr), Fy = q.map((x) => x.qy * Lr), mx = [2, 6];
    const R1x = -(Fx[0] + Fx[1]);
    const R3y = -(mx[0] * Fy[0] - (f / 2) * Fx[0] + mx[1] * Fy[1] - (f / 2) * Fx[1]) / B;
    const R1y = -(Fy[0] + Fy[1]) - R3y;
    const T = (4 * R1y - f * R1x + 2 * Fy[0] - (f / 2) * Fx[0]) / f;
    // Kracht op het begin van elke spoor: in de voet (R1x + T, R1y), in de nok minus die op het eind van spoor 1.
    const begin = [[R1x + T, R1y], [R1x + T + Fx[0], R1y + Fy[0]]];
    const uit = [0, 1].map((k) => {
      const e = k === 0 ? [c, sn] : [c, -sn];
      let Nc = 0, M = 0, V = 0;
      for (let i = 0; i <= 200; i++) {
        const t = (Lr * i) / 200, Sx = begin[k][0] + q[k].qx * t, Sy = begin[k][1] + q[k].qy * t;
        // Moment om het punt t: de kracht in het begin met arm t, de verdeelde last met arm t/2 (linksom, dan het teken om).
        const m = -((-t * e[0]) * begin[k][1] - (-t * e[1]) * begin[k][0] + (-t / 2 * e[0]) * q[k].qy * t - (-t / 2 * e[1]) * q[k].qx * t);
        Nc = Math.max(Nc, Sx * e[0] + Sy * e[1]); M = Math.max(M, Math.abs(m)); V = Math.max(V, Math.abs(-Sx * e[1] + Sy * e[0]));
      }
      return { Nc, M, V };
    });
    return { T, uit };
  };
  const ld = (gG, sL, sR, wL, wR) => [{ g: gG * g, s: sL * s, w: wL * qp }, { g: gG * g, s: sR * s, w: wR * qp }];
  // Combinaties: 1 (1,35·G, k_mod 0,6), sneeuw vol en half-vol, wind van links en rechts met c_pi +0,2 en −0,3 en G 1,2 of 0,9.
  const combis = [[ld(1.35, 0, 0, 0, 0), 0.6], [ld(1.2, 1.5, 1.5, 0, 0), 0.9], [ld(1.2, 1.5, 0.75, 0, 0), 0.9], [ld(1.2, 0.75, 1.5, 0, 0), 0.9]];
  for (const [c1, c2] of [[0.4, -0.5], [-0.5, 0.4]]) for (const cpi of [0.2, -0.3]) for (const gG of [1.2, 0.9]) combis.push([ld(gG, 0, 0, 1.5 * (c1 - cpi), 1.5 * (c2 - cpi)), 0.9]);
  const λrel = (l, d) => (l / (d / Math.sqrt(12)) / Math.PI) * Math.sqrt(21 / 7400);
  const kc = (λ) => { if (λ <= 0.3) return 1; const k = 0.5 * (1 + 0.2 * (λ - 0.3) + λ * λ); return 1 / (k + Math.sqrt(k * k - λ * λ)); };
  const kcy = kc(λrel(Lr, hh)), kcz = kc(λrel(0.6, b));
  const λm = Math.sqrt((24 * hh * (0.6 + 2 * hh)) / (0.78 * b * b * 7400)); // 0,385 → k_crit = 1
  const kcrit = λm <= 0.75 ? 1 : λm <= 1.4 ? 1.56 - 0.75 * λm : 1 / λm ** 2;
  let ud = 0, uv = 0, un = 0, ul = 0, Tmax = 0;
  for (const [[l1, l2], km] of combis) {
    const sp = spant(l1, l2);
    Tmax = Math.max(Tmax, sp.T);
    const fmd = (km * 24e3) / 1.3, fc0d = (km * 21e3) / 1.3, fvd = (km * 4e3) / 1.3;
    for (const { Nc, M, V } of sp.uit) {
      ud = Math.max(ud, (Nc / A / fc0d) ** 2 + M / W / fmd);
      uv = Math.max(uv, (1.5 * V) / A / fvd);
      un = Math.max(un, Nc / A / (kcy * fc0d) + M / W / fmd, Nc / A / (kcz * fc0d) + (0.7 * M) / W / fmd);
      ul = Math.max(ul, (M / W / (kcrit * fmd)) ** 2 + Nc / A / (kcz * fc0d));
    }
  }
  // Maatgevend: 1,2·G + 1,5·S (k_mod 0,9): T = 6,668 kN, N = 9,63 kN, M = 3,850 kNm → knik (6.23) 0,562.
  // BGT loodrecht op de spoor: 5pL⁴/384EI, p = g·cos α (G), s·cos²α (S), (c_pe − c_pi)·q_p (W); k_def = 0,6:
  // w_G = 6,175 mm, w_S = 5,430 mm; bijkomend 0,6·w_G + w_S = 9,14 mm, eindstand 1,6·w_G + w_S = 15,31 mm ≤ L/250 = 18,48.
  const EI = 11000e3 * I, wv = (p) => (5 * p * Lr ** 4) / (384 * EI);
  const wG = wv(g * c);
  let wb = 0, wm = 1.6 * wG;
  for (const p of [s * c * c, 0.5 * s * c * c, ...[0.2, -0.3].flatMap((cpi) => [(0.4 - cpi) * qp, (-0.5 - cpi) * qp])]) {
    wb = Math.max(wb, Math.abs(0.6 * wG + wv(p))); wm = Math.max(wm, Math.abs(1.6 * wG + wv(p)));
  }
  toets(r, {
    Ud_2: ud, Uv_2: uv, Un_2: un, Ul_2: ul, UC_tb: Tmax / ((Math.PI * 0.016 ** 2) / 4 * 235e3),
    UC_wbij: wb / (Lr / 250), UC_wmax: wm / (Lr / 250),
  });
}

// ── 6. A-spant met de knikberekening ────────────────────────────────────────
console.log("\n6. A-spant met methode 2: eerste orde, α_cr alleen ter informatie");
{
  const m1 = doorreken({ ...VOORBEELD_2, methode: "1" }, ["mth", "vK.(3)", "UC_max"]);
  const m2 = doorreken({ ...VOORBEELD_2, methode: "2" }, ["mth", "vK.(3)", "vA.(3)", "UC_max"]);
  geenFouten(m2, "A-spant, methode 2");
  // Een driehoek is niet verplaatsbaar: geen vergroting, de staven met hun lengte als kniklengte. Vroeger
  // gold hier methode 2 als een verplaatsbaar raamwerk (vergroting 1,015 en de tekst over knieën).
  waar("A-spant, methode 2: eerste orde (mth 0)", m2.uit.mth === 0);
  waar("A-spant, methode 2: geen vergroting", m2.uit["vK.(3)"] === 1);
  waar("A-spant, methode 2: α_cr uit de knikberekening getoond", m2.uit["vA.(3)"] > 1 && m2.uit["vA.(3)"] < 1e5, String(m2.uit["vA.(3)"]));
  waar("A-spant, methode 2: zelfde UC als methode 1", m1.uit.UC_max === m2.uit.UC_max);
  waar("A-spant, methode 2: de tekst voor het niet verplaatsbare spant", /De knikberekening geeft α/.test(m2.tekst) && !/in de knieën/.test(m2.tekst));
}

console.log(
  fouten === 0
    ? `\nPortaal en spant: alle ${getest} controles kloppen met de handberekening.`
    : `\nPortaal en spant: ${fouten} van ${getest} controles wijken af.`,
);
process.exit(fouten === 0 ? 0 : 1);
