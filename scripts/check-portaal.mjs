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

console.log(
  fouten === 0
    ? `\nPortaal en spant: alle ${getest} controles kloppen met de handberekening.`
    : `\nPortaal en spant: ${fouten} van ${getest} controles wijken af.`,
);
process.exit(fouten === 0 ? 0 : 1);
