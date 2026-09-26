/**
 * Controlescript voor de module Brandwerendheid staal (NEN-EN 1993-1-2 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op drie manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: doorsnedeklasse bij brand
 *      (§4.2.2), de kritieke temperatuur met (4.22) of, bij kip en knik, uit
 *      de weerstand met χ_fi (§4.2.3.2 en §4.2.3.3) — hier gevonden door de
 *      temperatuur in stapjes van 0,01 °C af te lopen, niet door halvering
 *      zoals het blad —, en de staaltemperatuur incrementeel met (4.25) of
 *      (4.27). Het blad moet daar op vier significante cijfers mee kloppen.
 *   2. Dezelfde staaltemperatuur met een stap van 1 s: het verschil met de stap
 *      van het blad (5 s onbekleed, 30 s bekleed) moet klein blijven.
 *   3. Voor het standaardgeval, de grensgevallen, de negatief ingevulde
 *      belasting en enkele andere sets de getallen van een handberekening.
 *
 * De profielgegevens staan hieronder los overgenomen uit de profieltabel,
 * zodat ook de matrix in het blad wordt gecontroleerd. Daarnaast: de
 * beginwaarden van het beeld zijn de standaardinvoer van dit script, en het
 * beeld geeft geen warmtegeleiding bij kamertemperatuur als beginwaarde.
 *
 * Draaien:  node scripts/check-brand.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const tpl = laadTemplate("brandwerendheid.ts");

// ── Standaardinvoer (= DEFAULTS van het beeld) ──────────────────────────────
const STANDAARD = {
  profiel: 5, staalsoort: 235, werking: 1, eis_min: 60, verhitting: 4, schema: 1,
  bron_fi: 1, M_Ed: 50, N_Ed: 500, η_fi: 0.7, M_fi: 35, N_fi: 350,
  L_kip: 5, C_1: 1.13, C_2: -0.45, L_fi: 3,
  bekleed: 1, beklvorm: 1, beklmateriaal: 1, d_p: 18, lambda_p: 0.2, rho_p: 800, c_p: 1700,
};

/**
 * id → h, b, t_w, t_f, r (mm); A (cm²); I_y, I_z (cm⁴); W_el,y, W_pl,y (cm³);
 * I_t (cm⁴); I_w (10³ cm⁶). Los overgenomen uit de profieltabellen.
 */
const PROFIEL = {
  1: { naam: "HEA 100", h: 96, b: 100, tw: 5, tf: 8, r: 12, A: 21.24, Iy: 349.2, Iz: 133.8, Wel: 72.76, Wpl: 83.01, It: 5.24, Iw: 2.58 },
  5: { naam: "HEA 180", h: 171, b: 180, tw: 6, tf: 9.5, r: 15, A: 45.25, Iy: 2510, Iz: 924.6, Wel: 293.6, Wpl: 324.9, It: 14.80, Iw: 60.21 },
  9: { naam: "HEA 260", h: 250, b: 260, tw: 7.5, tf: 12.5, r: 24, A: 86.82, Iy: 10450, Iz: 3668, Wel: 836.4, Wpl: 919.8, It: 52.37, Iw: 516.4 },
  16: { naam: "HEB 200", h: 200, b: 200, tw: 9, tf: 15, r: 18, A: 78.08, Iy: 5696, Iz: 2003, Wel: 569.6, Wpl: 642.5, It: 59.28, Iw: 171.1 },
  22: { naam: "IPE 240", h: 240, b: 120, tw: 6.2, tf: 9.8, r: 15, A: 39.12, Iy: 3892, Iz: 283.6, Wel: 324.3, Wpl: 366.6, It: 12.88, Iw: 37.39 },
  24: { naam: "IPE 300", h: 300, b: 150, tw: 7.1, tf: 10.7, r: 15, A: 53.81, Iy: 8356, Iz: 603.8, Wel: 557.1, Wpl: 628.4, It: 20.12, Iw: 125.9 },
  27: { naam: "IPE 400", h: 400, b: 180, tw: 8.6, tf: 13.5, r: 21, A: 84.46, Iy: 23130, Iz: 1318, Wel: 1156, Wpl: 1307, It: 51.08, Iw: 490.0 },
};

// ── Materiaal bij hoge temperatuur (EN 1993-1-2 §3) ─────────────────────────

/** Tabel 3.1: [θ, k_y,θ, k_E,θ]. */
const TABEL_31 = [
  [20, 1, 1], [100, 1, 1], [200, 1, 0.9], [300, 1, 0.8], [400, 1, 0.7], [500, 0.78, 0.6],
  [600, 0.47, 0.31], [700, 0.23, 0.13], [800, 0.11, 0.09], [900, 0.06, 0.0675],
  [1000, 0.04, 0.045], [1100, 0.02, 0.0225], [1200, 0, 0],
];
function tabel31(θ, kolom) {
  if (θ <= 20) return 1;
  for (let i = 1; i < TABEL_31.length; i++) {
    const [T0] = TABEL_31[i - 1], [T1] = TABEL_31[i];
    if (θ <= T1) {
      const k0 = TABEL_31[i - 1][kolom], k1 = TABEL_31[i][kolom];
      return k0 + ((k1 - k0) * (θ - T0)) / (T1 - T0);
    }
  }
  return 0;
}
const ky = (θ) => tabel31(θ, 1);
const kE = (θ) => Math.max(tabel31(θ, 2), 1e-4);

/** §3.4.1.2, soortelijke warmte van staal [J/kgK]. */
function ca(θ) {
  if (θ < 600) return 425 + 7.73e-1 * θ - 1.69e-3 * θ ** 2 + 2.22e-6 * θ ** 3;
  if (θ < 735) return 666 + 13002 / (738 - θ);
  if (θ < 900) return 545 + 17820 / (θ - 731);
  return 650;
}
const RHO_A = 7850;

/** NEN-EN 1991-1-2 (3.4), t in seconden. */
const gas = (t) => 20 + 345 * Math.log10((8 * t) / 60 + 1);

// ── Staaltemperatuur (§4.2.5) ───────────────────────────────────────────────

/**
 * Onbekleed (4.25): Δθ = k_sh·(A_m/V)/(c_a·ρ_a)·ḣ_net·Δt, ḣ_net volgens
 * NEN-EN 1991-1-2 (3.1) t/m (3.3) met α_c = 25, ε_m = 0,7, ε_f = 1, Φ = 1.
 */
function onbekleed(kshAmV, tEind, dt) {
  let θ = 20;
  for (let t = 0; t < tEind - 1e-9; t += dt) {
    const g = gas(t);
    const h = 25 * (g - θ) + 0.7 * 5.67e-8 * ((g + 273) ** 4 - (θ + 273) ** 4);
    θ = Math.min(θ + ((kshAmV / (ca(θ) * RHO_A)) * h * dt), gas(t + dt));
  }
  return θ;
}

/** Bekleed (4.27) en (4.28), Δθ ≥ 0 bij een stijgende gastemperatuur. */
function bekleed(ApV, dp, λp, ρp, cp, tEind, dt) {
  let θ = 20;
  for (let t = 0; t < tEind - 1e-9; t += dt) {
    const c = ca(θ);
    const φ = ((cp * ρp) / (c * RHO_A)) * dp * ApV;
    const dg = gas(t + dt) - gas(t);
    const d = ((λp * ApV) / (dp * c * RHO_A)) * ((gas(t) - θ) / (1 + φ / 3)) * dt - (Math.exp(φ / 10) - 1) * dg;
    θ = Math.min(θ + Math.max(d, 0), gas(t + dt));
  }
  return θ;
}

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v) {
  const p = PROFIEL[v.profiel];
  const { h, b, tw, tf, r } = p;
  const A = p.A * 1e2, Iy = p.Iy * 1e4, Iz = p.Iz * 1e4, It = p.It * 1e4, Iw = p.Iw * 1e9;
  const Wel = p.Wel * 1e3, Wpl = p.Wpl * 1e3;
  const fy = v.staalsoort, E = 210000, G = 81000;
  const uit = {};

  // Belasting bij brand (N of Nmm)
  const buiging = v.werking <= 2;
  // Het teken van de invoer telt niet: een steunpuntsmoment of een drukkracht
  // mag negatief ingevuld zijn.
  const Efi = Math.abs(v.bron_fi === 1
    ? v.η_fi * (buiging ? v.M_Ed * 1e6 : v.N_Ed * 1e3)
    : buiging ? v.M_fi * 1e6 : v.N_fi * 1e3);
  uit.Efi = Efi;

  // Doorsnedeklasse bij brand (§4.2.2 met tabel 5.2 van EN 1993-1-1)
  let klasse = 1;
  if (v.werking <= 3) {
    const ε = 0.85 * Math.sqrt(235 / fy);
    const kf = (b - tw - 2 * r) / 2 / tf / ε;
    const kw = (h - 2 * tf - 2 * r) / tw / ε;
    const grens = (x, [g1, g2, g3]) => (x <= g1 ? 1 : x <= g2 ? 2 : x <= g3 ? 3 : 4);
    klasse = Math.max(grens(kf, [9, 10, 14]), grens(kw, v.werking === 3 ? [33, 38, 42] : [72, 83, 124]));
  }
  uit.klasse = klasse;
  const Wy = klasse <= 2 ? Wpl : Wel;
  const instab = klasse < 4 && (v.werking === 2 || v.werking === 3);

  // Kritieke temperatuur
  let μ0 = 0, θcr, R0, λ20 = 0;
  const α = 0.65 * Math.sqrt(235 / fy);
  const χ = (θ) => {
    const λθ = λ20 * Math.sqrt(ky(θ) / kE(θ));
    const Φ = 0.5 * (1 + α * λθ + λθ * λθ);
    return 1 / (Φ + Math.sqrt(Φ * Φ - λθ * λθ));
  };
  if (klasse === 4) {
    θcr = 350;
  } else if (!instab) {
    let Rfi0;
    if (v.werking === 1) {
      const κ1 = v.verhitting === 3 ? (v.bekleed === 1 ? 0.85 : 0.7) : 1;
      const κ2 = v.schema === 2 ? 0.85 : 1;
      Object.assign(uit, { κ1, κ2 });
      Rfi0 = (Wy * fy) / (κ1 * κ2);
    } else Rfi0 = A * fy;
    μ0 = Math.max(Efi / Rfi0, 0.013);
    θcr = μ0 <= 1 ? 39.19 * Math.log(1 / (0.9674 * μ0 ** 3.833) - 1) + 482 : 20;
    uit.Rfi0 = Rfi0;
  } else {
    if (v.werking === 2) {
      const L = v.L_kip * 1000;
      const S = Math.sqrt((E * Iw) / (G * It));
      const Mcr = ((Math.PI * v.C_1) / L) *
        (Math.sqrt(1 + (Math.PI ** 2 * S * S * (v.C_2 ** 2 + 1)) / (L * L)) + (Math.PI * v.C_2 * S) / L) *
        Math.sqrt(E * Iz * G * It);
      λ20 = Math.sqrt((Wy * fy) / Mcr);
      R0 = Wy * fy;
      Object.assign(uit, { Mcr, λLT: λ20 });
    } else {
      const L = v.L_fi * 1000;
      const Ncrz = (Math.PI ** 2 * E * Iz) / (L * L);
      λ20 = Math.sqrt((A * fy) / Ncrz);
      R0 = A * fy;
      Object.assign(uit, { Ncrz, λz: λ20 });
    }
    // Afloop in stapjes van 0,01 °C tot χ·k_y·R_0 onder E_fi,d zakt, dan lineair.
    const r = (θ) => χ(θ) * ky(θ) * R0;
    const Rfi0 = χ(20) * R0;
    μ0 = Efi / Rfi0;
    θcr = 20;
    if (μ0 <= 1) {
      let θ = 20, rv = r(20);
      while (θ < 1200) {
        const θn = Math.min(θ + 0.01, 1199.99), rn = r(θn);
        if (rn < Efi) { θcr = θ + ((rv - Efi) / (rv - rn)) * (θn - θ); break; }
        θ = θn; rv = rn;
        if (θ >= 1199.99) { θcr = 1200; break; }
      }
    }
    Object.assign(uit, { R0, Rfi0 });
  }
  Object.assign(uit, { μ0, θcr, Wy });

  // Staaltemperatuur na de eis
  const t = v.eis_min * 60;
  const koker = 2 * h + (v.verhitting === 3 ? b : 2 * b);
  const contour = 2 * h + (v.verhitting === 3 ? 3 : 4) * b - 2 * tw;
  let θa, θa1;
  if (v.bekleed === 0) {
    const AmV = (contour / A) * 1000, AbV = (koker / A) * 1000;
    const ksh = (0.9 * AbV) / AmV;
    θa = onbekleed(ksh * AmV, t, 5);
    θa1 = onbekleed(ksh * AmV, t, 1);
    Object.assign(uit, { AmV, AbV, ksh });
  } else {
    const ApV = ((v.beklvorm === 1 ? koker : contour) / A) * 1000;
    θa = bekleed(ApV, v.d_p / 1000, v.lambda_p, v.rho_p, v.c_p, t, 30);
    θa1 = bekleed(ApV, v.d_p / 1000, v.lambda_p, v.rho_p, v.c_p, t, 1);
    uit.ApV = ApV;
  }
  Object.assign(uit, { θa, θa1, θg: gas(t) });

  // Toetsing
  const UCθ = θa / θcr;
  let UCR = 0;
  if (instab) {
    const Rt = χ(θa) * ky(θa) * R0;
    UCR = Efi / Rt;
    Object.assign(uit, { Rt, UCR });
  }
  uit.UCθ = UCθ;
  uit.UCmax = μ0 > 1 ? (instab ? UCR : μ0) : instab ? Math.max(UCθ, UCR) : UCθ;
  return uit;
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(r, v) {
  const uit = { θ_a_t: ruim(r.θa), θ_g_t: ruim(r.θg), θ_a_cr: ruim(r.θcr) };
  const eenheid = v.werking <= 2 ? 1e6 : 1e3;
  uit.E_fi_d = ruim(r.Efi / eenheid);
  if (r.klasse < 4) {
    uit.μ_0 = ruim(r.μ0);
    uit.R_fi_d_0 = ruim(r.Rfi0 / eenheid);
  }
  if (r.κ1 !== undefined) Object.assign(uit, { κ_1: ruim(r.κ1), κ_2: ruim(r.κ2), W_y: ruim(r.Wy / 1e3) });
  if (r.Mcr !== undefined) Object.assign(uit, { M_cr: ruim(r.Mcr / 1e6), λ_LT: ruim(r.λLT), R_0: ruim(r.R0 / 1e6), M_b_fi_t_Rd: ruim(r.Rt / 1e6) });
  if (r.Ncrz !== undefined) Object.assign(uit, { N_cr_z: ruim(r.Ncrz / 1e3), λ_z: ruim(r.λz), R_0: ruim(r.R0 / 1e3), N_b_fi_t_Rd: ruim(r.Rt / 1e3) });
  if (r.UCR) uit.UC_R = ruim(r.UCR);
  if (r.μ0 <= 1) uit.UC_θ = ruim(r.UCθ);
  if (v.bekleed === 0) Object.assign(uit, { A_m_V: ruim(r.AmV), A_b_V: ruim(r.AbV), k_sh: ruim(r.ksh) });
  else uit.A_p_V = ruim(r.ApV);
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: HEA 180 S235, ligger zonder kip, R60, vierzijdig, kokervormig gips 18 mm",
    invoer: {},
    // Met de hand. Klasse: ε = 0,85; flens c = (180 − 6 − 2·15)/2 = 72 mm,
    // c/t = 7,579 = 8,916ε ≤ 9ε; lijf c = 171 − 19 − 30 = 122 mm, c/t = 20,33 =
    // 23,92ε ≤ 72ε → klasse 1, W_pl,y = 324,9 cm³. κ_1 = κ_2 = 1 →
    // R_fi,d,0 = 324,9·10³·235 = 76,35 kNm. E_fi,d = 0,7·50 = 35 kNm →
    // μ_0 = 35/76,35 = 0,4584. (4.22): 0,4584^3,833 = 0,05030; ·0,9674 = 0,04866;
    // 1/0,04866 − 1 = 19,55; ln = 2,973 → θ_a,cr = 39,19·2,973 + 482 = 598,5 °C.
    // A_p/V = 2·(171 + 180)/4525 = 155,1 1/m. c_a(20) = 439,8 J/kgK →
    // φ = 1700·800/(439,8·7850)·0,018·155,1 = 1,100. Eerste stap (t = 0):
    // Δθ_g = 345·log₁₀ 5 = 241,1 °C, θ_g − θ_a = 0 → Δθ_a = −(e^0,11 − 1)·241,1 < 0,
    // dus 0; de staaltemperatuur loopt pas op na ruim een minuut. Na 120 stappen
    // van 30 s: θ_a = 529,8 °C (met stappen van 1 s 529,3 °C); θ_g(60) = 20 +
    // 345·log₁₀ 481 = 945,3 °C. UC = 529,8/598,5 = 0,8853 → voldoet.
    handwerk: {
      μ_0: "0.4584", R_fi_d_0: "76.35", θ_a_cr: "598.5", A_p_V: "155.1",
      θ_g_t: "945.3", θ_a_t: "529.8", UC_θ: "0.8853",
    },
  },
  {
    naam: "2 — grensgeval: M_Ed = 74,7 kNm, θ_a,cr net boven de staaltemperatuur van set 1",
    invoer: { M_Ed: 74.7 },
    // Met de hand: θ_a,cr = θ_a,t = 529,84 °C hoort bij (θ − 482)/39,19 = 1,2207 →
    // 1/(0,9674·μ^3,833) = 1 + e^1,2207 = 4,390 → μ = 0,2355^(1/3,833) = 0,6857 →
    // E_fi,d = 0,6857·76,35 = 52,36 kNm, M_Ed = 74,79 kNm. Bij 74,7 kNm:
    // μ_0 = 52,29/76,35 = 0,6849; 0,6849^3,833 = 0,2343 → 1/(0,9674·0,2343) − 1 =
    // 3,411; ln = 1,2270 → θ_a,cr = 39,19·1,2270 + 482 = 530,1 °C →
    // UC = 529,84/530,09 = 0,9995: voldoet, net.
    handwerk: { μ_0: "0.6849", θ_a_cr: "530.1", UC_θ: "0.9995" },
    oordeel: "voldoet",
  },
  {
    naam: "3 — grensgeval: M_Ed = 74,9 kNm, net over de grens",
    invoer: { M_Ed: 74.9 },
    // Met de hand: μ_0 = 52,43/76,35 = 0,6867 → θ_a,cr = 529,6 °C →
    // UC = 529,84/529,57 = 1,0005: voldoet niet.
    handwerk: { μ_0: "0.6867", θ_a_cr: "529.6", UC_θ: "1.001" },
    oordeel: "voldoet niet",
  },
  {
    naam: "4 — onbekleed, driezijdig met de vloer erop (κ_1 = 0,7), boven een tussensteunpunt (κ_2 = 0,85), R30",
    invoer: { bekleed: 0, verhitting: 3, schema: 2, eis_min: 30 },
    // Met de hand: A_m = 2·171 + 3·180 − 2·6 = 870 mm → A_m/V = 192,3 1/m;
    // kastwaarde (2·171 + 180)/4525 = 115,4 1/m → k_sh = 0,9·115,4/192,3 = 0,5400.
    // R_fi,d,0 = 76,35/(0,7·0,85) = 128,3 kNm → μ_0 = 0,2728 → θ_a,cr = 678,2 °C.
    handwerk: { A_m_V: "192.3", k_sh: "0.5400", R_fi_d_0: "128.3", θ_a_cr: "678.2" },
  },
  {
    naam: "5 — ligger met kip: IPE 300 S235, L_kip = 6 m, last op de bovenflens, profielvolgend gespoten 25 mm, R90",
    invoer: {
      profiel: 24, werking: 2, eis_min: 90, M_Ed: 25, L_kip: 6, C_1: 1.13, C_2: -0.45,
      beklvorm: 2, beklmateriaal: 3, d_p: 25, lambda_p: 0.12, rho_p: 350, c_p: 1200,
    },
  },
  {
    naam: "6 — kolom: HEB 200 S355, l_fi = 3,5 m, η_fi = 0,65, kokervormig gips 25 mm, R60",
    invoer: { profiel: 16, staalsoort: 355, werking: 3, N_Ed: 1200, η_fi: 0.65, L_fi: 3.5, d_p: 25 },
  },
  {
    naam: "7 — kolom IPE 400 S355: lijf bij druk in klasse 4, θ_a,cr = 350 °C",
    invoer: { profiel: 27, staalsoort: 355, werking: 3, N_Ed: 800, L_fi: 3 },
    // Met de hand: ε = 0,85·√(235/355) = 0,6916; lijf c = 400 − 27 − 42 = 331 mm,
    // c/t = 38,49 = 55,65ε > 42ε → klasse 4 → θ_a,cr = 350 °C (§4.2.3.6).
    handwerk: { θ_a_cr: "350" },
  },
  {
    naam: "8 — trekstaaf HEA 100, rekenwaarde bij brand zelf ingevuld, onbekleed, R30",
    invoer: { profiel: 1, werking: 4, bron_fi: 2, N_fi: 150, bekleed: 0, eis_min: 30 },
  },
  {
    naam: "9 — ligger met M_Ed = 120 kNm: μ_0 > 1, bezwijkt al bij normale temperatuur",
    invoer: { M_Ed: 120 },
    oordeel: "voldoet niet",
  },
  {
    naam: "10 — HEA 180 S355: flens c/t = 10,96ε → klasse 3, W_el,y",
    invoer: { staalsoort: 355, M_Ed: 40 },
  },
  {
    naam: "11 — HEA 260, steenwol 25 mm met λ_p = 0,20 (effectief bij brand), R90",
    invoer: { profiel: 9, eis_min: 90, M_Ed: 150, beklmateriaal: 4, d_p: 25, lambda_p: 0.2, rho_p: 150, c_p: 1200 },
  },
  {
    naam: "12 — steunpuntsmoment negatief ingevuld: M_Ed = −90 kNm boven een tussensteunpunt (κ_2 = 0,85)",
    invoer: { schema: 2, M_Ed: -90 },
    // Met de hand: E_fi,d = 0,7·|−90| = 63 kNm; R_fi,d,0 = 76,352/0,85 = 89,83 kNm →
    // μ_0 = 0,7014; 0,7014^3,833 = 0,2568; ·0,9674 = 0,2484; 1/0,2484 − 1 = 3,025;
    // ln = 1,1070 → θ_a,cr = 39,19·1,1070 + 482 = 525,4 °C →
    // UC = 529,8/525,4 = 1,008: voldoet niet. Met het teken meegenomen kwam μ_0 op
    // de ondergrens 0,013 en voldeed het profiel ten onrechte.
    handwerk: { E_fi_d: "63.00", R_fi_d_0: "89.83", μ_0: "0.7014", θ_a_cr: "525.4", UC_θ: "1.008" },
    oordeel: "voldoet niet",
  },
  {
    naam: "13 — kolom met de drukkracht negatief ingevuld: N_Ed = −1200 kN, HEB 200 S355 als set 6",
    invoer: { profiel: 16, staalsoort: 355, werking: 3, N_Ed: -1200, η_fi: 0.65, L_fi: 3.5, d_p: 25 },
    // Met de hand: ε = 0,6916; flens 7,47ε, lijf 21,5ε → klasse 1. N_cr,z =
    // π²·210000·2003·10⁴/3500² = 3389 kN; N_pl = 7808·355 = 2772 kN → λ̄_z = 0,9044;
    // α = 0,5289 → Φ = 1,148, χ_fi = 0,5390 → R_fi,d,0 = 1494 kN; E_fi,d = 780 kN →
    // μ_0 = 0,5221. χ_fi·k_y,θ = 780/2772 = 0,2814: bij 550 °C 0,2887, bij 560 °C
    // 0,2721 → θ_a,cr ≈ 554,4 °C.
    handwerk: { E_fi_d: "780.0", R_fi_d_0: "1494", μ_0: "0.5221", θ_a_cr: "554.4" },
  },
  {
    naam: "14 — kolom HEB 200 S235 onbekleed, l_fi = 3 m, N_fi,d = 300 kN zelf ingevuld, R30",
    invoer: { profiel: 16, werking: 3, bron_fi: 2, N_fi: 300, L_fi: 3, bekleed: 0, eis_min: 30 },
    // Met de hand: N_cr,z = π²·210000·2003·10⁴/3000² = 4613 kN; N_pl = 7808·235 =
    // 1835 kN → λ̄_z = 0,6307; Φ = 0,5·(1 + 0,65·0,6307 + 0,3978) = 0,9039,
    // χ_fi = 0,6446 → R_fi,d,0 = 1183 kN, μ_0 = 0,2536. χ_fi·k_y,θ = 300/1835 =
    // 0,1635 → θ_a,cr = 671,7 °C. A_m = 2·200 + 4·200 − 18 = 1182 mm → A_m/V =
    // 151,4 1/m; kast 800/7808 = 102,5 1/m → k_sh = 0,9·800/1182 = 0,6091.
    // θ_a(30) = 756,3 °C (met 1 s 756,2 °C); daar k_y,θ = 0,1624, k_E,θ = 0,1075,
    // λ̄_θ = 0,7752, Φ = 1,052, χ_fi = 0,5668 → N_b,fi,t,Rd = 0,5668·0,1624·1835 =
    // 168,9 kN → UC_R = 1,776: voldoet niet; θ_a,cr is na 20,58 min bereikt.
    handwerk: { λ_z: "0.6307", μ_0: "0.2536", θ_a_cr: "671.7", A_m_V: "151.4", k_sh: "0.6091", θ_a_t: "756.3", UC_R: "1.776" },
    oordeel: "voldoet niet",
    tkr: 20.58,
  },
  {
    naam: "15 — trekstaaf IPE 240 S275 onbekleed, driezijdig verhit, N_Ed = 200 kN, R30",
    invoer: { profiel: 22, staalsoort: 275, werking: 4, N_Ed: 200, bekleed: 0, verhitting: 3, eis_min: 30 },
    // Met de hand: E_fi,d = 0,7·200 = 140 kN; R_fi,d,0 = 3912·275 = 1076 kN →
    // μ_0 = 0,1301; 0,1301^3,833 = 4,02·10⁻⁴; ·0,9674 = 3,89·10⁻⁴; 1/… − 1 = 2570;
    // ln = 7,852 → θ_a,cr = 39,19·7,852 + 482 = 789,6 °C. A_m = 2·240 + 3·120 −
    // 2·6,2 = 827,6 mm → A_m/V = 211,6 1/m; kast (2·240 + 120)/3912 = 153,4 1/m →
    // k_sh = 0,9·600/827,6 = 0,6525. θ_a(30) = 807,8 °C → UC = 807,8/789,6 = 1,023:
    // voldoet niet, θ_a,cr is na 28,5 min bereikt.
    handwerk: { μ_0: "0.1301", θ_a_cr: "789.6", A_m_V: "211.6", A_b_V: "153.4", k_sh: "0.6525", θ_a_t: "807.8", UC_θ: "1.023" },
    oordeel: "voldoet niet",
    tkr: 28.5,
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues);
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  // De klasse staat in de tekst.
  if (v.werking <= 3) {
    const m = got.text.match(/→ klasse (\d)/);
    const ok = m && Number(m[1]) === r.klasse;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} klasse     ons ${m ? m[1] : "—"}   narekening ${r.klasse}`);
  }

  // Stapgrootte: de stap van het blad tegen een stap van 1 s.
  {
    const verschil = Math.abs(r.θa - r.θa1);
    const ok = verschil <= 2;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} stap       θ_a met de stap van het blad ${s4(r.θa)} °C, met 1 s ${s4(r.θa1)} °C (verschil ${verschil.toFixed(2)} °C)`);
  }

  // Het tijdstip waarop θ_a,cr wordt bereikt, als dat vóór de eis ligt.
  if (set.tkr !== undefined) {
    const m = got.text.match(/bereikt na ([\d.]+) minuten/);
    const ok = m !== null && Math.abs(Number(m[1]) - set.tkr) <= 0.01;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} t_kr       ons ${m ? m[1] : "—"} min   handberekening ${set.tkr} min`);
  }

  // Maatgevende UC en oordeel uit de slotzin.
  {
    const m = got.text.match(/Maatgevende UC = ([\d.]+)/);
    const uc = m ? Number(m[1]) : NaN;
    const okUc = Math.abs(uc - r.UCmax) <= Math.max(r.UCmax * 0.002, 1e-6);
    const voldoet = /het profiel voldoet(?! niet)/.test(got.text);
    const verwacht = set.oordeel ?? (r.UCmax <= 1 ? "voldoet" : "voldoet niet");
    const okOordeel = (voldoet ? "voldoet" : "voldoet niet") === verwacht && verwacht === (r.UCmax <= 1 ? "voldoet" : "voldoet niet");
    if (!okUc) fouten++;
    if (!okOordeel) fouten++;
    console.log(`  ${okUc ? "OK    " : "FOUT  "} UC_max     ons ${m ? m[1] : "—"}   narekening ${s4(r.UCmax)}`);
    console.log(`  ${okOordeel ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   verwacht ${verwacht}`);
  }
}

// ── Het beeld ───────────────────────────────────────────────────────────────
{
  console.log("\nBeginwaarden van het beeld tegen de standaardinvoer");
  const tsx = readFileSync(join(hier, "../packages/desktop/src/components/calc/BrandwerendheidDesigner.tsx"), "utf8");
  const blok = tsx.match(/const DEFAULTS[^{]*\{([^}]+)\}/)[1];
  const beeld = Object.fromEntries([...blok.matchAll(/([\p{L}_][\p{L}\p{N}_]*): (-?[\d.]+)/gu)].map((m) => [m[1], Number(m[2])]));
  const verschil = [...new Set([...Object.keys(beeld), ...Object.keys(STANDAARD)])].filter((k) => beeld[k] !== STANDAARD[k]);
  let ok = verschil.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${Object.keys(beeld).length} beginwaarden${ok ? " gelijk" : `, verschil in ${verschil.join(", ")}`}`);

  // Een warmtegeleiding bij kamertemperatuur (steenwol 0,045 W/mK) geeft bij
  // brand een veel te lage staaltemperatuur. Geen enkele beginwaarde eronder.
  const mat = [...tsx.matchAll(/\{ v: (\d), label: "([^"]+)", lam: ([\d.]+)/g)].map((m) => ({ label: m[2], lam: Number(m[3]) }));
  const laag = mat.filter((m) => m.lam < 0.1);
  ok = mat.length === 4 && laag.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${mat.length} materialen, λ_p ${mat.map((m) => `${m.label} ${m.lam}`).join(", ")}${laag.length ? " — te laag voor brand" : ""}`);
}

afronden(fouten, "Brandwerendheid");
