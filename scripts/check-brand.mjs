/**
 * Controlescript voor de module Brandwerendheid: staal (NEN-EN 1993-1-2), hout
 * (NEN-EN 1995-1-2) en beton (tabelmethode van NEN-EN 1992-1-2), elk met NB.
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten van het staal daarom op drie manieren na:
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
 * Daarnaast: κ_1 < 1 alleen met een beton- of staalplaatbetonvloer aan de
 * vierde zijde, en een blad zonder die keuze (bijgewerkt van een oudere
 * versie) rekent met κ_1 = 1; in klasse 4 de knikweerstand bij 20 °C met
 * A_eff; bij μ_0 > 1 de weerstand bij θ_a,t als UC (in klasse 4 de grootste
 * van μ_0 en θ_a,t/350); en een blad zonder
 * belasting of lengte krijgt "niet te bepalen → voldoet niet". Een staalblad
 * zonder de keuze "materiaal" (bijgewerkt van vóór hout en beton) rekent als
 * staal, en η_fi kan ook uit G_k en Q_k,1 komen: de kleinste van (6.10a) en
 * (6.10b) met γ bij de gevolgklasse.
 *
 * Hout: een eigen uitwerking van de gereduceerde doorsnede (§4.2.2), waarin de
 * inbranddiepte met een beschermende laag niet met de formules per fase van
 * het blad maar door de inbrandsnelheid over de tijd op te tellen wordt
 * bepaald (stap 0,001 min); verder k_fi, buiging met kip ((6.32) bij massief
 * naaldhout, (6.31) met G_0,05 = 540 N/mm² bij GL), afschuiving en druk
 * met knik, met handberekeningen voor onbeschermd, gips type A/H en F, een
 * eigen bescherming, (6.19) bij kleine slankheid, een volledig ingebrande
 * doorsnede (UC = ∞) en ontbrekende invoer.
 *
 * Beton: de tabelwaarden zijn invoer; nagerekend worden de asafstand, de
 * benuttingsgraad met de tabelkolom, de UC, μ_fi > 0,7 buiten tabel 5.2a,
 * de toepassingsvoorwaarden van methode A (§5.3.2(2) met de NB), bij balken
 * Δa volgens (5.3) met θ_cr uit kromme 1 van figuur 5.1 — hier gevonden door
 * de kromme in stapjes van 0,01 °C af te lopen, niet met de omgekeerde
 * formule van het blad —, bij vloeren de grens σ_s,fi/f_yk ≤ 0,6 en
 * ontbrekende invoer.
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
  materiaal: 1,
  profiel: 5, staalsoort: 235, werking: 1, eis_min: 60, verhitting: 4, schema: 1, vloer: 0,
  bron_fi: 1, M_Ed: 50, N_Ed: 500, η_fi: 0.7, M_fi: 35, N_fi: 350,
  eta_uit: 1, categorie_fi: 1, G_k: 5, Q_k1: 3,
  L_kip: 5, C_1: 1.13, C_2: -0.45, L_fi: 3,
  bekleed: 1, beklvorm: 1, beklmateriaal: 1, d_p: 18, lambda_p: 0.2, rho_p: 800, c_p: 1700,
  houtsoort: 4, werking_h: 1, b_hout: 180, h_hout: 450, V_Ed: 30, V_fi: 20, l_ef: 5,
  bekl_h: 0, h_p: 15, t_ch: 20, t_f: 30, k_2: 1,
  element_b: 1, zijde_b: 1, verhouding_b: 1, b_beton: 300, h_beton: 300,
  c_dek: 30, d_beugel: 8, d_staaf: 16, N_Rd: 3000, M_Rd: 150, b_min: 0, h_min: 0, a_min: 0,
  vorm_b: 1, l_0fi: 3, M_0Ed: 0, M_0Ed_fi: 0, A_s: 1608,
};

/** Projectgegevens zoals de app ze in de scope zet; de gevolgklasse per set. */
const scopeVoor = (v) => ({ CC: v.CC ?? 2, K_FI: 1 });

/**
 * η_fi uit G_k en Q_k,1 (§2.4.2(3) van elk branddeel): de kleinste van de
 * waarden met (6.10a) en (6.10b). γ uit tabel NB.4/NB.5 – A1.2(B); ψ_0 en
 * ψ_2 uit tabel NB.2 – A1.1, op volgorde van de keuzelijst.
 */
const PSI = [
  [0.4, 0.3], [0.5, 0.3], [0.6, 0.6], [0.4, 0.6], [0.4, 0.6], [1.0, 0.8], [0.7, 0.6],
  [0.7, 0.3], [0, 0], [0.5, 0.3], [1.0, 0.8], [0, 0], [0, 0],
];
function etaFi(v) {
  if (v.bron_fi !== 1 || (v.eta_uit ?? 1) !== 2) return v.η_fi;
  if (!(v.G_k > 0)) return 0;
  const cc = v.CC ?? 2;
  const [ψ0, ψ2] = PSI[v.categorie_fi - 1];
  const γGa = cc === 1 ? 1.2 : cc === 3 ? 1.5 : 1.35;
  const γGb = cc === 1 ? 1.1 : cc === 3 ? 1.3 : 1.2;
  const γQ = cc === 1 ? 1.35 : cc === 3 ? 1.65 : 1.5;
  const teller = v.G_k + ψ2 * v.Q_k1;
  return Math.min(teller / (γGa * v.G_k + γQ * ψ0 * v.Q_k1), teller / (γGb * v.G_k + γQ * v.Q_k1));
}

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
  25: { naam: "IPE 330", h: 330, b: 160, tw: 7.5, tf: 11.5, r: 18, A: 62.61, Iy: 11770, Iz: 788.1, Wel: 713.1, Wpl: 804.3, It: 28.15, Iw: 199.1 },
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
  const η = etaFi(v);
  const Efi = Math.abs(v.bron_fi === 1
    ? η * (buiging ? v.M_Ed * 1e6 : v.N_Ed * 1e3)
    : buiging ? v.M_fi * 1e6 : v.N_fi * 1e3);
  uit.Efi = Efi;
  uit.η = η;
  // Zonder belasting, of bij kip of knik zonder lengte, is er geen UC.
  uit.onvolledig = !(Efi > 0) ||
    (v.werking === 2 && !(v.L_kip > 0 && v.C_1 > 0)) ||
    (v.werking === 3 && !(v.L_fi > 0));

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
  if (klasse === 4 && v.werking === 3) {
    // θ_a,cr = 350 °C (§4.2.3.6), mits μ_0 ≤ 1 met de knikweerstand bij 20 °C
    // en A_eff bij de eigenschappen van 20 °C (NEN-EN 1993-1-5 §4.4, ψ = 1).
    const ε20 = Math.sqrt(235 / fy);
    const cw = h - 2 * tf - 2 * r;
    const λp = cw / tw / (28.4 * ε20 * 2);
    const ρw = cw / tw <= 42 * ε20 ? 1 : Math.min(1, (λp - 0.22) / (λp * λp));
    const Aeff = A - (1 - ρw) * cw * tw;
    const L = v.L_fi * 1000;
    const Ncrz = (Math.PI ** 2 * E * Iz) / (L * L);
    λ20 = Math.sqrt((Aeff * fy) / Ncrz);
    const Rfi0 = χ(20) * Aeff * fy;
    μ0 = Efi / Rfi0;
    θcr = μ0 <= 1 ? 350 : 20;
    uit.kl4 = { Aeff, Ncrz, λz: λ20, χ0: χ(20) };
    uit.Rfi0 = Rfi0;
  } else if (klasse === 4) {
    θcr = 350;
  } else if (!instab) {
    let Rfi0;
    if (v.werking === 1) {
      // Alleen met een beton- of staalplaatbetonvloer aan de vierde zijde; een
      // blad zonder die keuze rekent met de eerste keuze, κ_1 = 1.
      const κ1 = v.verhitting === 3 && v.vloer === 1 ? (v.bekleed === 1 ? 0.85 : 0.7) : 1;
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

  // Toetsing; in klasse 4 bij μ_0 > 1 ook de temperatuur tegen 350 °C.
  const UCθ = klasse === 4 && μ0 > 1 ? θa / 350 : θa / θcr;
  let UCR = 0;
  if (instab) {
    const Rt = χ(θa) * ky(θa) * R0;
    UCR = Efi / Rt;
    Object.assign(uit, { Rt, UCR });
  } else if (μ0 > 1 && klasse < 4) {
    // De weerstand bij θ_a,t: k_y,θ·R_fi,d,0, ook met κ_1·κ_2 (4.10).
    const Rt = ky(θa) * uit.Rfi0;
    UCR = Efi / Rt;
    Object.assign(uit, { RtZonder: Rt, UCR });
  }
  uit.UCθ = UCθ;
  uit.UCmax = μ0 > 1 ? (klasse < 4 ? UCR : Math.max(μ0, UCθ)) : instab ? Math.max(UCθ, UCR) : UCθ;
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
  if (v.bron_fi === 1 && v.eta_uit === 2) uit.η_fi = ruim(r.η);
  if (r.klasse < 4 || r.kl4) {
    uit.μ_0 = ruim(r.μ0);
    uit.R_fi_d_0 = ruim(r.Rfi0 / eenheid);
  }
  if (r.kl4) {
    Object.assign(uit, {
      A_eff: ruim(r.kl4.Aeff / 1e2), N_cr_z: ruim(r.kl4.Ncrz / 1e3), λ_z: ruim(r.kl4.λz), χ_fi_0: ruim(r.kl4.χ0),
    });
  }
  if (r.RtZonder !== undefined) uit.R_fi_d_t = ruim(r.RtZonder / eenheid);
  if (r.κ1 !== undefined) Object.assign(uit, { κ_1: ruim(r.κ1), κ_2: ruim(r.κ2), W_y: ruim(r.Wy / 1e3) });
  if (r.Mcr !== undefined) Object.assign(uit, { M_cr: ruim(r.Mcr / 1e6), λ_LT: ruim(r.λLT), R_0: ruim(r.R0 / 1e6), M_b_fi_t_Rd: ruim(r.Rt / 1e6) });
  if (r.Ncrz !== undefined) Object.assign(uit, { N_cr_z: ruim(r.Ncrz / 1e3), λ_z: ruim(r.λz), R_0: ruim(r.R0 / 1e3), N_b_fi_t_Rd: ruim(r.Rt / 1e3) });
  if (r.UCR) uit.UC_R = ruim(r.UCR);
  if (r.μ0 <= 1 || r.kl4) uit.UC_θ = ruim(r.UCθ);
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
    naam: "4 — onbekleed, driezijdig met een betonvloer erop (κ_1 = 0,7), boven een tussensteunpunt (κ_2 = 0,85), R30",
    invoer: { bekleed: 0, verhitting: 3, vloer: 1, schema: 2, eis_min: 30 },
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
    // Met de hand: E_fi,d = 0,7·120 = 84 kNm; μ_0 = 84/76,35 = 1,100 > 1. De UC is
    // de weerstand bij θ_a,t = 529,84 °C (als set 1): k_y,θ = 0,78 − 0,31·0,2984 =
    // 0,6875 → R_fi,d,t = 0,6875·76,35 = 52,49 kNm → UC = 84/52,49 = 1,600.
    handwerk: { μ_0: "1.100", R_fi_d_t: "52.49", UC_R: "1.600" },
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
  {
    naam: "16 — als set 4, maar een andere vloer aan de vierde zijde: κ_1 = 1,0",
    invoer: { bekleed: 0, verhitting: 3, vloer: 0, schema: 2, eis_min: 30 },
    // Met de hand: R_fi,d,0 = 76,35/(1,0·0,85) = 89,83 kNm → μ_0 = 35/89,83 =
    // 0,3896; 0,3896^3,833 = 0,02698; ·0,9674 = 0,02610; 1/0,02610 − 1 = 37,31;
    // ln = 3,619 → θ_a,cr = 39,19·3,619 + 482 = 623,8 °C. θ_a(30) = 772,8 °C als
    // set 4 → UC = 772,8/623,8 = 1,239 (met κ_1 = 0,7 was het 1,139).
    handwerk: { κ_1: "1", R_fi_d_0: "89.83", μ_0: "0.3896", θ_a_cr: "623.8", UC_θ: "1.239" },
    oordeel: "voldoet niet",
  },
  {
    naam: "17 — bijgewerkt blad zonder de keuze voor de vierde zijde: de eerste keuze, κ_1 = 1,0",
    invoer: { bekleed: 0, verhitting: 3, schema: 2, eis_min: 30 },
    zonder: ["vloer"],
    handwerk: { κ_1: "1", R_fi_d_0: "89.83", θ_a_cr: "623.8", UC_θ: "1.239" },
    oordeel: "voldoet niet",
  },
  {
    naam: "18 — bekleed en driezijdig met een betonvloer (κ_1 = 0,85), M_Ed = 60 kNm",
    invoer: { verhitting: 3, vloer: 1, M_Ed: 60 },
    // Met de hand: E_fi,d = 42 kNm; R_fi,d,0 = 76,35/0,85 = 89,83 kNm → μ_0 =
    // 0,4676 → θ_a,cr = 595,4 °C. Kokervormig driezijdig: A_p/V = (2·171 + 180)/
    // 4525 = 115,4 1/m → θ_a(60) = 466,8 °C → UC = 0,7841. Met een andere vloer
    // (κ_1 = 1): μ_0 = 0,5501, θ_a,cr = 569,0 °C, UC = 0,8204.
    handwerk: { κ_1: "0.85", R_fi_d_0: "89.83", μ_0: "0.4676", θ_a_cr: "595.4", A_p_V: "115.4", θ_a_t: "466.8", UC_θ: "0.7841" },
  },
  {
    naam: "19 — kolom IPE 400 S355 klasse 4, gips 30 mm, N_Ed = 1500 kN: θ_a ≤ 350 °C en μ_0 ≤ 1",
    invoer: { profiel: 27, staalsoort: 355, werking: 3, N_Ed: 1500, L_fi: 3, d_p: 30 },
    // Met de hand: bij 20 °C ε = 0,8136; lijf c/t = 331/8,6 = 38,49 > 42ε = 34,17
    // → λ̄_p = 38,49/(28,4·0,8136·2) = 0,8328; ρ = (0,8328 − 0,22)/0,8328² =
    // 0,8835 → A_eff = 8446 − 0,1165·331·8,6 = 8114 mm². N_cr,z = π²·210000·
    // 1318·10⁴/3000² = 3035 kN → λ̄_z = √(8114·355/3035·10³) = 0,9742; α = 0,5289;
    // Φ = 1,232; χ_fi = 0,5034 → R_fi,d,0 = 0,5034·8114·355 = 1450 kN; E_fi,d =
    // 1050 kN → μ_0 = 0,7241 ≤ 1 → θ_a,cr = 350 °C. A_p/V = 2·(400 + 180)/8446 =
    // 137,3 1/m → θ_a(60) = 308,8 °C → UC = 308,8/350 = 0,8824.
    handwerk: { A_eff: "81.14", λ_z: "0.9742", R_fi_d_0: "1450", μ_0: "0.7241", θ_a_cr: "350", θ_a_t: "308.8", UC_θ: "0.8824" },
    oordeel: "voldoet",
  },
  {
    naam: "20 — als set 19 met N_Ed = 2500 kN: μ_0 > 1, voldeed eerder met θ_a ≤ 350 °C",
    invoer: { profiel: 27, staalsoort: 355, werking: 3, N_Ed: 2500, L_fi: 3, d_p: 30 },
    // Met de hand: E_fi,d = 1750 kN → μ_0 = 1750/1450 = 1,207 > 1 → voldoet niet,
    // UC = μ_0. Alleen op de temperatuur (308,8 °C ≤ 350 °C) voldeed hij.
    handwerk: { μ_0: "1.207", θ_a_t: "308.8" },
    oordeel: "voldoet niet",
  },
  {
    naam: "20b — als set 20, onbekleed en R30: μ_0 > 1 én θ_a,t > 350 °C, de grootste telt",
    invoer: { profiel: 27, staalsoort: 355, werking: 3, N_Ed: 2500, L_fi: 3, bekleed: 0, eis_min: 30 },
    // Met de hand: A_m = 2·400 + 4·180 − 2·8,6 = 1502,8 mm → A_m/V = 177,9 1/m;
    // kastwaarde 2·(400 + 180)/8446 = 137,3 1/m → k_sh = 0,6947; θ_a(30) = 796,1 °C.
    // UC = max(μ_0 = 1,207; 796,1/350 = 2,275) = 2,275, gelijk aan de UC van
    // vóór de toets van μ_0.
    handwerk: { μ_0: "1.207", k_sh: "0.6947", θ_a_t: "796.1", UC_θ: "2.275" },
    oordeel: "voldoet niet",
  },
  {
    naam: "21 — kolom IPE 330 S235: bij brand klasse 4 (42,5ε), bij 20 °C klasse 3, dus A_eff = A",
    invoer: { profiel: 25, werking: 3, N_Ed: 500, L_fi: 3 },
    // Met de hand: lijf c/t = (330 − 23 − 36)/7,5 = 36,13 → bij brand /0,85 =
    // 42,51ε > 42ε, klasse 4; bij 20 °C 36,13 ≤ 42 → ρ = 1, A_eff = 6261 mm².
    // N_cr,z = π²·210000·788,1·10⁴/3000² = 1815 kN → λ̄_z = 0,9004; Φ = 1,198;
    // χ_fi = 0,5030 → R_fi,d,0 = 740,0 kN; μ_0 = 350/740,0 = 0,4729. A_p/V =
    // 2·(330 + 160)/6261 = 156,5 1/m → θ_a(60) = 531,7 °C → UC = 531,7/350 = 1,519.
    handwerk: { A_eff: "62.61", λ_z: "0.9004", R_fi_d_0: "740.0", μ_0: "0.4729", θ_a_t: "531.7", UC_θ: "1.519" },
    oordeel: "voldoet niet",
  },
  {
    naam: "22 — geen belasting (M_Ed = 0): niet te bepalen",
    invoer: { M_Ed: 0 },
    // Een leeg veld telt als 0. Eerder: μ_0 = 0,013, θ_a,cr = 1136 °C en "voldoet".
    onvolledig: "vul de belasting bij brand in",
  },
  {
    naam: "23 — trekstaaf met η_fi leeg (0): niet te bepalen",
    invoer: { profiel: 1, werking: 4, η_fi: 0, bekleed: 0, eis_min: 30 },
    onvolledig: "vul de belasting bij brand in",
  },
  {
    naam: "24 — kolom zonder kniklengte (L_fi = 0): niet te bepalen",
    invoer: { profiel: 16, werking: 3, L_fi: 0 },
    // Eerder: N_cr,z = ∞, χ_fi = 1 en "voldoet".
    onvolledig: "vul de kniklengte in",
  },
  {
    naam: "25 — kip zonder kiplengte en zonder belasting: niet te bepalen",
    invoer: { profiel: 24, werking: 2, M_Ed: 0, L_kip: 0 },
    onvolledig: "vul de belasting bij brand, de kiplengte en C 1 in",
  },
  {
    naam: "26 — bijgewerkt staalblad zonder de keuzes materiaal en η_fi: rekent als set 1",
    invoer: {},
    zonder: ["materiaal", "eta_uit"],
    handwerk: { μ_0: "0.4584", θ_a_cr: "598.5", θ_a_t: "529.8", UC_θ: "0.8853" },
    oordeel: "voldoet",
  },
  {
    naam: "27 — als set 1, η_fi uit G_k = 5 en Q_k,1 = 3, categorie B, CC2",
    invoer: { eta_uit: 2, categorie_fi: 2 },
    // Met de hand: ψ_0 = 0,5, ψ_2 = 0,3 (tabel NB.2 – A1.1). (6.10a): (5 + 0,3·3)/
    // (1,35·5 + 1,5·0,5·3) = 5,9/9,0 = 0,6556; (6.10b): 5,9/(1,2·5 + 1,5·3) =
    // 5,9/10,5 = 0,5619 → η_fi = 0,5619. E_fi,d = 0,5619·50 = 28,10 kNm →
    // μ_0 = 28,10/76,35 = 0,3680; 0,3680^3,833 = 0,02167; ·0,9674 = 0,02097;
    // 1/0,02097 − 1 = 46,70; ln = 3,844 → θ_a,cr = 39,19·3,844 + 482 = 632,6 °C →
    // UC = 529,8/632,6 = 0,8375.
    handwerk: { η_fi: "0.5619", E_fi_d: "28.10", μ_0: "0.3680", θ_a_cr: "632.6", UC_θ: "0.8375" },
    oordeel: "voldoet",
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  for (const k of set.zonder ?? []) delete v[k];
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, scopeVoor(v));
  const r = uitwerking(v);

  // Zonder belasting of lengte: geen UC, wel een oordeel.
  if (set.onvolledig !== undefined || r.onvolledig) {
    const m = got.text.match(/Maatgevende UC niet te bepalen: (.*?) → het profiel voldoet niet/);
    const ok = set.onvolledig !== undefined && r.onvolledig && m !== null && m[1].trim() === set.onvolledig;
    if (!ok) fouten++;
    console.log(`
${set.naam}`);
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${m ? `"${m[1].trim()}" → voldoet niet` : "een UC"}   verwacht "${set.onvolledig ?? "—"}"`);
    continue;
  }

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

// ── Hout (NEN-EN 1995-1-2 met NB) ───────────────────────────────────────────

/** NEN-EN 338 en NEN-EN 14080, los overgenomen: f_m,k, f_c,0,k, f_v,k, E_0,05 in N/mm². */
const HOUT = {
  1: { naam: "C18", fm: 18, fc: 18, fv: 3.4, E05: 6000, gl: false },
  2: { naam: "C24", fm: 24, fc: 21, fv: 4.0, E05: 7400, gl: false },
  3: { naam: "C30", fm: 30, fc: 23, fv: 4.0, E05: 8000, gl: false },
  4: { naam: "GL24h", fm: 24, fc: 24, fv: 3.5, E05: 9600, gl: true },
  5: { naam: "GL28h", fm: 28, fc: 28, fv: 3.5, E05: 10500, gl: true },
  6: { naam: "GL32h", fm: 32, fc: 32, fv: 3.5, E05: 11800, gl: true },
};

/**
 * Onafhankelijke uitwerking van het hout; eenheden N en mm. De inbranddiepte
 * volgt uit de inbrandsnelheid per fase, opgeteld over de tijd: 0 tot t_ch,
 * k_2·β_n tot t_f, k_3·β_n = 2·β_n tot t_a, daarna β_n (§3.4.3.2).
 */
function uitwerkingHout(v) {
  const m = HOUT[v.houtsoort];
  const uit = {};
  const t = v.eis_min;
  const βn = m.gl ? 0.7 : 0.8;
  let tch = 0, tf = 0, ta = 0, k2 = 1;
  if (v.bekl_h === 0) {
    uit.dchar = βn * t;
    uit.k0 = Math.min(t / 20, 1);
  } else {
    tch = v.bekl_h <= 2 ? Math.max(2.8 * v.h_p - 14, 0) : v.t_ch;
    tf = v.bekl_h === 1 ? tch : v.t_f;
    k2 = v.bekl_h === 1 ? 1 : v.bekl_h === 2 ? 1 - 0.018 * v.h_p : v.k_2;
    tf = Math.max(tf, tch);
    ta = tf <= tch
      ? Math.min(2 * tf, 25 / (2 * βn) + tf)                         // (3.8)
      : Math.max((25 - (tf - tch) * k2 * βn) / (2 * βn) + tf, tf);   // (3.9)
    const snelheid = (s) => (s < tch ? 0 : s < tf ? k2 * βn : s < ta ? 2 * βn : βn);
    let d = 0;
    const ds = 0.001;
    for (let s = 0; s < t - 1e-9; s += ds) d += snelheid(s + ds / 2) * Math.min(ds, t - s);
    uit.dchar = d;
    uit.k0 = tch > 20 ? Math.min(t / tch, 1) : Math.min(t / 20, 1);
    Object.assign(uit, { tch, tf, ta, k2 });
  }
  uit.def = uit.dchar + 7 * uit.k0;
  uit.bef = Math.max(v.b_hout - 2 * uit.def, 0);
  uit.hef = Math.max(v.h_hout - (v.verhitting === 3 ? 1 : 2) * uit.def, 0);
  uit.kfi = m.gl ? 1.15 : 1.25;

  const η = etaFi(v);
  uit.η = η;
  const eigen = v.bron_fi === 1;
  const M = Math.abs(eigen ? η * v.M_Ed : v.M_fi) * 1e6;
  const ligger = v.werking_h <= 2;
  const V = ligger ? Math.abs(eigen ? η * v.V_Ed : v.V_fi) * 1e3 : 0;
  const N = ligger ? 0 : Math.abs(eigen ? η * v.N_Ed : v.N_fi) * 1e3;
  Object.assign(uit, { M, V, N });

  const geenA = !(v.b_hout > 0 && v.h_hout > 0);
  const geenE = ligger ? !(M > 0 || V > 0) : !(N > 0 || M > 0);
  const geenL = v.werking_h === 2 ? !(v.l_ef > 0) : v.werking_h === 3 ? !(v.L_fi > 0) : false;
  uit.onvolledig = geenA || geenE || geenL;
  uit.ingebrand = !(uit.bef > 0 && uit.hef > 0);
  if (uit.ingebrand) { uit.UCmax = Infinity; return uit; }

  const b = uit.bef, h = uit.hef;
  const fmd = uit.kfi * m.fm, fvd = uit.kfi * m.fv, fcd = uit.kfi * m.fc;
  Object.assign(uit, { fmd, fvd, fcd });
  if (ligger) {
    const W = (b * h * h) / 6;
    const σ = M / W;
    let kcrit = 1;
    if (v.werking_h === 2) {
      // (6.32) alleen voor massief naaldhout (§6.3.3(3)); GL met (6.31),
      // G_0,05 = 540 N/mm² (NEN-EN 14080), I_tor = a·c³/3·(1 − 0,63·c/a).
      const lef = v.l_ef * 1000, Wy = (b * h * h) / 6, Iz = (h * b ** 3) / 12;
      const a = Math.max(b, h), c = Math.min(b, h), Itor = ((a * c ** 3) / 3) * (1 - (0.63 * c) / a);
      const σcrit = m.gl
        ? (Math.PI * Math.sqrt(m.E05 * Iz * 540 * Itor)) / (lef * Wy)   // (6.31)
        : ((0.78 * b * b) / (h * lef)) * m.E05;                          // (6.32)
      const λ = Math.sqrt(m.fm / σcrit);
      kcrit = λ <= 0.75 ? 1 : λ <= 1.4 ? 1.56 - 0.75 * λ : 1 / (λ * λ);
      Object.assign(uit, { σcrit, λm: λ });
    }
    const τ = (1.5 * V) / (b * h);
    Object.assign(uit, { W, σ, kcrit, τ, UCm: σ / (kcrit * fmd), UCv: τ / fvd });
    uit.UCmax = Math.max(uit.UCm, uit.UCv);
  } else {
    const A = b * h, W = (b * h * h) / 6;
    const σc = N / A, σm = M / W;
    const λrel = (dim) => ((v.L_fi * 1000 * Math.sqrt(12)) / (Math.PI * dim)) * Math.sqrt(m.fc / m.E05);
    const βc = m.gl ? 0.1 : 0.2;
    const kc = (λ) => {
      const k = 0.5 * (1 + βc * (λ - 0.3) + λ * λ);
      return Math.min(1 / (k + Math.sqrt(k * k - λ * λ)), 1);
    };
    const λy = λrel(h), λz = λrel(b);
    const kcy = kc(λy), kcz = kc(λz);
    Object.assign(uit, { A, W, σc, σm, λy, λz, kcy, kcz });
    if (λy <= 0.3 && λz <= 0.3) uit.UCc = (σc / fcd) ** 2 + σm / fmd;   // (6.19)
    else {
      uit.UC623 = σc / (kcy * fcd) + σm / fmd;
      uit.UC624 = σc / (kcz * fcd) + (0.7 * σm) / fmd;
      uit.UCc = Math.max(uit.UC623, uit.UC624);
    }
    uit.UCmax = uit.UCc;
  }
  return uit;
}

function verwachtingenHout(r, v) {
  const uit = {
    d_char_n: ruim(r.dchar), k_0: ruim(r.k0), d_ef: ruim(r.def), b_ef: ruim(r.bef), h_ef: ruim(r.hef), k_fi: ruim(r.kfi),
  };
  if (v.bron_fi === 1 && v.eta_uit === 2) uit.η_fi = ruim(r.η);
  // Wat invoer is (t_f bij type F, alles bij een eigen bescherming), staat niet
  // als uitkomst in het blad.
  if (v.bekl_h > 0) uit.t_a = ruim(r.ta);
  if (v.bekl_h === 1 || v.bekl_h === 2) uit.t_ch = ruim(r.tch);
  if (v.bekl_h === 1) uit.t_f = ruim(r.tf);
  if (v.bekl_h === 2) uit.k_2 = ruim(r.k2);
  if (r.ingebrand) return uit;
  if (v.werking_h <= 2) {
    Object.assign(uit, {
      f_m_d_fi: ruim(r.fmd), f_v_d_fi: ruim(r.fvd),
      W_ef: ruim(r.W), σ_m_d_fi: ruim(r.σ), k_crit: ruim(r.kcrit), UC_m: ruim(r.UCm), τ_d_fi: ruim(r.τ), UC_v: ruim(r.UCv),
    });
    if (r.σcrit !== undefined) Object.assign(uit, { σ_m_crit: ruim(r.σcrit), λ_rel_m: ruim(r.λm) });
    // Bij een zelf ingevulde rekenwaarde staat M_fi,d niet zichtbaar in het blad.
    if (v.bron_fi === 1) Object.assign(uit, { M_fi_d: ruim(r.M / 1e6), V_fi_d: ruim(r.V / 1e3) });
  } else {
    Object.assign(uit, {
      f_c_0_d_fi: ruim(r.fcd), A_ef: ruim(r.A), σ_c_0_d_fi: ruim(r.σc),
      λ_rel_y: ruim(r.λy), λ_rel_z: ruim(r.λz), k_c_y: ruim(r.kcy), k_c_z: ruim(r.kcz), UC_c: ruim(r.UCc),
    });
    if (r.UC623 !== undefined) Object.assign(uit, { UC_623: ruim(r.UC623), UC_624: ruim(r.UC624) });
    if (v.bron_fi === 1) Object.assign(uit, { N_fi_d: ruim(r.N / 1e3), M_fi_d: ruim(r.M / 1e6) });
  }
  return uit;
}

/** Standaard hout: GL24h 180×450, ligger zonder kip, R60, vierzijdig, onbeschermd. */
const HOUT_STANDAARD = { materiaal: 2 };

const SETS_HOUT = [
  {
    naam: "H1 — standaard: GL24h 180×450, ligger, kip verhinderd, vierzijdig, onbeschermd, R60",
    invoer: {},
    // Met de hand: β_n = 0,7 (gelijmd gelamineerd, tabel 3.1); d_char,n = 0,7·60 =
    // 42 mm; k_0 = 1 (t ≥ 20 min); d_ef = 42 + 7 = 49 mm → b_ef = 180 − 98 = 82 mm,
    // h_ef = 450 − 98 = 352 mm. W_ef = 82·352²/6 = 1,693·10⁶ mm³. M_fi,d = 0,7·50 =
    // 35 kNm → σ = 20,67 N/mm²; f_m,d,fi = 1,15·24 = 27,6 → UC_m = 0,7489.
    // V_fi,d = 0,7·30 = 21 kN → τ = 1,5·21000/(82·352) = 1,091 N/mm²; f_v,d,fi =
    // 1,15·3,5 = 4,025 → UC_v = 0,2711. Maatgevend 0,7489: voldoet.
    handwerk: { d_char_n: "42.0", d_ef: "49.0", b_ef: "82.0", h_ef: "352.0", σ_m_d_fi: "20.67", UC_m: "0.7489", τ_d_fi: "1.091", UC_v: "0.2711" },
    oordeel: "voldoet",
  },
  {
    naam: "H2 — C24 75×225 met kip (ℓ_ef = 3 m), driezijdig, gips type A 12,5 mm, R30, η_fi uit G_k/Q_k,1",
    invoer: {
      houtsoort: 2, b_hout: 75, h_hout: 225, werking_h: 2, l_ef: 3, verhitting: 3, bekl_h: 1, h_p: 12.5,
      eis_min: 30, eta_uit: 2, categorie_fi: 2, M_Ed: 5, V_Ed: 8,
    },
    // Met de hand: η_fi = 0,5619 (als set 27). t_ch = 2,8·12,5 − 14 = 21 min (3.11),
    // t_f = t_ch (3.15); t_a = min(2·21; 25/(2·0,8) + 21) = min(42; 36,625) =
    // 36,625 (3.8). Bij 30 min: d_char,n = 2·0,8·(30 − 21) = 14,4 mm; k_0 = min(30/21; 1)
    // = 1; d_ef = 21,4 mm → b_ef = 75 − 42,8 = 32,2 mm, h_ef = 225 − 21,4 =
    // 203,6 mm. M_fi,d = 0,5619·5 = 2,810 kNm; W = 32,2·203,6²/6 = 222,5·10³ mm³ →
    // σ = 12,63 N/mm². σ_m,crit = 0,78·32,2²/(203,6·3000)·7400 = 9,798 N/mm² →
    // λ_rel,m = √(24/9,798) = 1,565 > 1,4 → k_crit = 1/1,565² = 0,4083; f_m,d,fi =
    // 1,25·24 = 30 → UC_m = 12,63/(0,4083·30) = 1,031: voldoet niet. Onbeschermd
    // was d_ef = 31 mm en b_ef = 13 mm geweest.
    handwerk: { t_ch: "21.0", t_a: "36.6", d_char_n: "14.40", b_ef: "32.20", h_ef: "203.6", σ_m_crit: "9.798", λ_rel_m: "1.565", k_crit: "0.4083", UC_m: "1.031" },
    oordeel: "voldoet niet",
  },
  {
    naam: "H3 — kolom GL24h 200×200, vierzijdig, onbeschermd, R60, l_fi = 3 m, N_Ed = 100 kN",
    invoer: { werking_h: 3, b_hout: 200, h_hout: 200, L_fi: 3, N_Ed: 100, M_Ed: 0 },
    // Met de hand: d_ef = 49 mm → b_ef = h_ef = 102 mm, A = 10 404 mm². N_fi,d =
    // 70 kN → σ_c = 6,728 N/mm². i = 102/√12 = 29,44 mm; λ = 3000/29,44 = 101,9;
    // λ_rel = 101,9/π·√(24/9600) = 1,622. k = 0,5·(1 + 0,1·1,322 + 1,622²) = 1,881;
    // k_c = 1/(1,881 + √(1,881² − 1,622²)) = 0,3529. f_c,0,d,fi = 1,15·24 = 27,6 →
    // UC = 6,728/(0,3529·27,6) = 0,6908: voldoet.
    handwerk: { σ_c_0_d_fi: "6.728", λ_rel_z: "1.622", k_c_z: "0.3529", UC_c: "0.6908" },
    oordeel: "voldoet",
  },
  {
    naam: "H4 — GL28h 160×480, driezijdig, gips type F 15 mm (t_f = 45 min), R60, rekenwaarden bij brand",
    invoer: {
      houtsoort: 5, b_hout: 160, h_hout: 480, verhitting: 3, bekl_h: 2, h_p: 15, t_f: 45,
      bron_fi: 2, M_fi: 60, V_fi: 40,
    },
    // Met de hand: t_ch = 2,8·15 − 14 = 28 min; k_2 = 1 − 0,018·15 = 0,73 (3.7);
    // t_a = (25 − 17·0,73·0,7)/(2·0,7) + 45 = 56,65 min (3.9). d_char,n = 0,73·0,7·17
    // + 2·0,7·11,65 + 0,7·(60 − 56,65) = 8,687 + 16,31 + 2,344 = 27,34 mm; k_0 = 1;
    // d_ef = 34,34 mm → b_ef = 91,31 mm, h_ef = 445,7 mm. W = 3,023·10⁶ mm³ →
    // σ = 19,85 N/mm²; f_m,d,fi = 1,15·28 = 32,2 → UC_m = 0,6165. τ = 1,5·40000/
    // (91,31·445,7) = 1,474 → UC_v = 1,474/4,025 = 0,3663: voldoet.
    handwerk: { t_ch: "28.0", k_2: "0.730", t_a: "56.65", d_char_n: "27.34", b_ef: "91.31", h_ef: "445.7", UC_m: "0.6165", UC_v: "0.3663" },
    oordeel: "voldoet",
  },
  {
    naam: "H5 — kolom C30 200×200, eigen bescherming (t_ch = 10, t_f = 25, k_2 = 0,6), R30, l_fi = 0,5 m: (6.19)",
    invoer: {
      houtsoort: 3, werking_h: 3, b_hout: 200, h_hout: 200, L_fi: 0.5, bekl_h: 3, t_ch: 10, t_f: 25, k_2: 0.6,
      eis_min: 30, bron_fi: 2, N_fi: 300, M_fi: 10,
    },
    // Met de hand: t_a = (25 − 15·0,6·0,8)/1,6 + 25 = 36,13 min (3.9); d_char,n =
    // 0,6·0,8·15 + 1,6·5 = 15,2 mm; t_ch ≤ 20 → k_0 = min(30/20; 1) = 1; d_ef =
    // 22,2 mm → b_ef = h_ef = 155,6 mm. λ_rel = 500·√12/(π·155,6)·√(23/8000) =
    // 0,1900 ≤ 0,3 → (6.19): σ_c = 300000/24211 = 12,39 → (12,39/28,75)² = 0,1857;
    // σ_m = 10·10⁶/(155,6³/6) = 15,93 → /37,5 = 0,4247; UC = 0,6105: voldoet.
    handwerk: { t_a: "36.13", d_char_n: "15.20", b_ef: "155.6", λ_rel_y: "0.1900", UC_c: "0.6105" },
    oordeel: "voldoet",
  },
  {
    naam: "H6 — GL24h 140×600 met kip (ℓ_ef = 5 m), driezijdig, onbeschermd, R30: (6.31), 0,75 < λ_rel,m ≤ 1,4",
    invoer: { b_hout: 140, h_hout: 600, werking_h: 2, l_ef: 5, verhitting: 3, eis_min: 30, M_Ed: 120, V_Ed: 60 },
    // Met de hand: d_ef = 21 + 7 = 28 mm → b_ef = 84 mm, h_ef = 572 mm. GL, dus
    // (6.31): I_z = 572·84³/12 = 28,25·10⁶ mm⁴; I_tor = 572·84³/3·(1 − 0,63·84/572)
    // = 113,0·10⁶·0,9075 = 102,55·10⁶ mm⁴; W = 84·572²/6 = 4,581·10⁶ mm³.
    // σ_m,crit = π·√(9600·28,25·10⁶·540·102,55·10⁶)/(5000·4,581·10⁶)
    // = π·1,2256·10¹¹/2,2903·10¹⁰ = 16,81 N/mm² → λ_rel,m = √(24/16,81) = 1,195 →
    // k_crit = 1,56 − 0,75·1,195 = 0,6639. M_fi,d = 84 kNm → σ = 18,34 →
    // UC_m = 18,34/(0,6639·27,6) = 1,001: voldoet niet. Met (6.32), alleen voor
    // massief naaldhout, was σ_m,crit 18,47 en UC 0,942 "voldoet" geweest.
    handwerk: { I_z_ef: "28250000", I_tor_ef: { waarde: "102550000", tol: 60000, waarom: "het blad drukt vier cijfers af" }, σ_m_crit: "16.81", λ_rel_m: "1.195", k_crit: "0.6639", UC_m: "1.001" },
    oordeel: "voldoet niet",
  },
  {
    naam: "H7 — C24 45×145 onbeschermd, R60: volledig ingebrand, UC = ∞",
    invoer: { houtsoort: 2, b_hout: 45, h_hout: 145 },
    // Met de hand: d_ef = 0,8·60 + 7 = 55 mm > 45/2 → b_ef = 0: geen doorsnede.
    handwerk: { d_ef: "55.0", b_ef: "0" },
    oordeel: "voldoet niet",
  },
  {
    naam: "H8 — kolom met CC3 en categorie E: η_fi uit (6.10a)",
    invoer: { werking_h: 3, b_hout: 240, h_hout: 240, L_fi: 3, N_Ed: 200, eta_uit: 2, categorie_fi: 6, CC: 3 },
    // Met de hand: ψ_0 = 1,0, ψ_2 = 0,8; (6.10a): (5 + 2,4)/(1,5·5 + 1,65·1,0·3) =
    // 7,4/12,45 = 0,5944; (6.10b): 7,4/(1,3·5 + 1,65·3) = 7,4/11,45 = 0,6463 →
    // η_fi = 0,5944 → N_fi,d = 118,9 kN.
    handwerk: { η_fi: "0.5944", N_fi_d: "118.9" },
  },
  {
    naam: "H11 — C24 160×400 ligger, driezijdig, onbeschermd, R60, η_fi = 0,45 (NB bij §2.4.2(3))",
    invoer: { houtsoort: 2, b_hout: 160, h_hout: 400, verhitting: 3, η_fi: 0.45, M_Ed: 40, V_Ed: 35 },
    // Met de hand: β_n = 0,8 (gezaagd, tabel 3.1); d_char,n = 0,8·60 = 48 mm;
    // k_0 = 1; d_ef = 48 + 7 = 55 mm → b_ef = 160 − 110 = 50 mm, h_ef = 400 − 55 =
    // 345 mm. W_ef = 50·345²/6 = 991 875 mm³; M_fi,d = 0,45·40 = 18 kNm →
    // σ = 18,15 N/mm²; f_m,d,fi = 1,25·24 = 30 → UC_m = 0,6049. V_fi,d = 0,45·35 =
    // 15,75 kN → τ = 1,5·15 750/(50·345) = 1,370; f_v,d,fi = 1,25·4,0 = 5,0 →
    // UC_v = 0,2739. Voldoet.
    handwerk: { d_char_n: "48.0", d_ef: "55.0", b_ef: "50.0", h_ef: "345.0", M_fi_d: "18.00", σ_m_d_fi: "18.15",
      UC_m: "0.6049", τ_d_fi: "1.370", UC_v: "0.2739" },
    oordeel: "voldoet",
  },
  {
    naam: "H9 — geen afmetingen: niet te bepalen",
    invoer: { b_hout: 0 },
    onvolledig: "vul de afmetingen in",
  },
  {
    naam: "H10 — kolom zonder kniklengte en zonder belasting: niet te bepalen",
    invoer: { werking_h: 3, L_fi: 0, N_Ed: 0, M_Ed: 0 },
    onvolledig: "vul de belasting bij brand en de kniklengte in",
  },
];

console.log("\n══ Hout ══");
for (const set of SETS_HOUT) {
  const v = { ...STANDAARD, ...HOUT_STANDAARD, ...set.invoer };
  const sv = Object.fromEntries(Object.entries(v).filter(([k]) => k !== "CC").map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, sv, scopeVoor(v));
  const r = uitwerkingHout(v);
  const slot = got.text.slice(got.text.lastIndexOf("Maatgevende UC"));

  if (set.onvolledig !== undefined || r.onvolledig) {
    const m = slot.match(/Maatgevende UC niet te bepalen: (.*?) → de doorsnede voldoet niet/);
    const ok = set.onvolledig !== undefined && r.onvolledig && m !== null && m[1].trim() === set.onvolledig;
    if (!ok) fouten++;
    console.log(`\n${set.naam}`);
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${m ? `"${m[1].trim()}" → voldoet niet` : "een UC"}   verwacht "${set.onvolledig ?? "—"}"`);
    continue;
  }

  fouten += toets(`${set.naam} — narekening`, got, verwachtingenHout(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  const m = slot.match(/Maatgevende UC = ([\d.]+|∞)/);
  const uc = m ? (m[1] === "∞" ? Infinity : Number(m[1])) : NaN;
  const okUc = r.UCmax === Infinity ? uc === Infinity : Math.abs(uc - r.UCmax) <= Math.max(r.UCmax * 0.002, 1e-6);
  const voldoet = /de houten doorsnede voldoet aan/.test(slot);
  const verwacht = set.oordeel ?? (r.UCmax <= 1 ? "voldoet" : "voldoet niet");
  const okOordeel = (voldoet ? "voldoet" : "voldoet niet") === verwacht && verwacht === (r.UCmax <= 1 ? "voldoet" : "voldoet niet");
  if (!okUc) fouten++;
  if (!okOordeel) fouten++;
  console.log(`  ${okUc ? "OK    " : "FOUT  "} UC_max     ons ${m ? m[1] : "—"}   narekening ${r.UCmax === Infinity ? "∞" : s4(r.UCmax)}`);
  console.log(`  ${okOordeel ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   verwacht ${verwacht}`);
}

// ── Beton (tabelmethode van NEN-EN 1992-1-2) ────────────────────────────────

/**
 * De tabelwaarden (b_min of h_s en a) zijn invoer; de norm stond niet ter
 * inzage. Hier worden de asafstand, de benuttingsgraad, de tabelkolom bij een
 * kolom en de UC nagerekend. Eenheden mm en kN.
 */
function uitwerkingBeton(v) {
  const uit = {};
  const eb = v.element_b;
  uit.a = eb <= 3 ? v.c_dek + v.d_beugel + v.d_staaf / 2 : v.c_dek + v.d_staaf / 2;
  const η = etaFi(v);
  const kolom = eb === 1;
  const E = Math.abs(v.bron_fi === 1 ? η * (kolom ? v.N_Ed : v.M_Ed) : kolom ? v.N_fi : v.M_fi);
  const R = kolom ? v.N_Rd : v.M_Rd;
  uit.E = E;
  const heeftμ = E > 0 && R > 0;
  uit.μ = heeftμ ? E / R : 0;
  uit.kol = uit.μ <= 0.2 ? 0.2 : uit.μ <= 0.5 ? 0.5 : 0.7;
  const maat = kolom ? Math.min(v.b_beton, v.h_beton) : eb <= 3 ? v.b_beton : v.h_beton;
  const tabel = eb <= 3 ? v.b_min : v.h_min;
  const geenA = !(maat > 0 && uit.a > 0);
  const geenT = !(tabel > 0 && v.a_min > 0);
  const geenE = !(E > 0);
  const geenR = !(R > 0);
  const geenK = kolom && !(v.l_0fi > 0);
  const geenW = kolom && !(v.A_s > 0);
  uit.onvolledig = [
    geenA && "de afmetingen", geenT && "de tabelwaarden", geenE && "de belasting bij brand", geenR && (kolom ? "N Rd" : "M Rd"),
    geenK && "de kniklengte bij brand", geenW && "de langswapening",
  ].filter(Boolean);
  uit.buiten = kolom && uit.μ > 0.7;
  uit.overbelast = !kolom && uit.μ > 1;

  // Methode A, §5.3.2(2): l_0,fi ≤ 3 m, e ≤ e_max (NB: 0,4·h bij een
  // kolombreedte ≥ 300 mm, anders 0,15·h) en A_s < 0,04·A_c.
  uit.toepasbaar = true;
  if (kolom) {
    const rond = v.vorm_b === 2;
    const N = Math.abs(v.bron_fi === 1 ? v.N_Ed : v.N_fi), M0 = Math.abs(v.bron_fi === 1 ? v.M_0Ed : v.M_0Ed_fi);
    uit.e = N > 0 ? (M0 / N) * 1000 : 0;
    uit.emax = (maat >= 300 ? 0.4 : 0.15) * (rond ? maat : v.h_beton);
    uit.Ac = rond ? (Math.PI * maat * maat) / 4 : v.b_beton * v.h_beton;
    uit.ρ = v.A_s / uit.Ac;
    uit.toepasbaar = v.l_0fi <= 3 && uit.e <= uit.emax && uit.ρ < 0.04;
  }

  // Balk: σ_s,fi/f_yk ≈ μ_fi/1,15 (5.2); θ_cr is de eerste temperatuur waarbij
  // kromme 1 van figuur 5.1 tot die verhouding is gezakt, niet boven 700 °C
  // (§5.2(8)); Δa = 0,1·(500 − θ_cr) (5.3), bij een doorgaande balk ≥ 0.
  // Vloer (tabel 5.8, niet genoemd in §5.2(7)): boven 0,6 niet aangetoond.
  const ks = (θ) => θ <= 350 ? 1 : θ <= 500 ? 1 - (0.4 * (θ - 350)) / 150 : θ <= 700 ? 0.61 - (0.5 * (θ - 500)) / 200 : 0.1 - (0.1 * (θ - 700)) / 500;
  uit.Δa = 0;
  uit.vloerOpen = false;
  if (!kolom && uit.μ > 0 && uit.μ <= 1) {
    uit.k = uit.μ / 1.15;
    if (eb <= 3) {
      let θ = 20;
      while (θ < 700 && ks(θ) > uit.k) θ = Math.round((θ + 0.01) * 100) / 100;
      uit.θcr = θ;
      uit.Δa = 0.1 * (500 - θ);
      if (eb === 3) uit.Δa = Math.max(uit.Δa, 0);
    } else {
      uit.vloerOpen = uit.k > 0.6;
    }
  }
  uit.anodig = v.a_min + uit.Δa;
  uit.UCb = tabel / maat;
  uit.UCa = uit.anodig / uit.a;
  uit.UCmax = Math.max(uit.UCb, uit.UCa);
  return uit;
}

/** "a, b en c": zoals het blad de ontbrekende invoer opsomt. */
const opsomming = (l) => (l.length <= 1 ? l.join("") : `${l.slice(0, -1).join(", ")} en ${l[l.length - 1]}`);

const BETON_STANDAARD = { materiaal: 3 };

const SETS_BETON = [
  {
    naam: "B1 — kolom 300×400, c = 30, Ø8 beugel, Ø16, N_Ed = 1500 kN, N_Rd = 3000 kN, R90; b_min = 250, a = 40 ingevuld",
    invoer: { b_beton: 300, h_beton: 400, N_Ed: 1500, N_Rd: 3000, eis_min: 90, b_min: 250, a_min: 40 },
    // Met de hand: a = 30 + 8 + 16/2 = 46 mm; N_0Ed,fi = 0,7·1500 = 1050 kN →
    // μ_fi = 1050/3000 = 0,35 → tabelkolom 0,5. b = min(300; 400) = 300 mm →
    // UC_b = 250/300 = 0,8333; UC_a = 40/46 = 0,8696 → UC = 0,8696: voldoet.
    handwerk: { a_hw: "46.0", E_fi_d: "1050", μ_fi: "0.3500", b_k: "300.0", UC_b: "0.8333", UC_a: "0.8696" },
    kolom: "0.5",
    oordeel: "voldoet",
  },
  {
    naam: "B2 — als B1 met N_Rd = 1400 kN: μ_fi = 0,75 buiten tabel 5.2a",
    invoer: { b_beton: 300, h_beton: 400, N_Ed: 1500, N_Rd: 1400, eis_min: 90, b_min: 250, a_min: 40 },
    // Met de hand: μ_fi = 1050/1400 = 0,75 > 0,7: methode A niet toepasbaar.
    handwerk: { μ_fi: "0.7500" },
    buiten: true,
  },
  {
    naam: "B3 — balk 250×500 vrij opgelegd, c = 25, Ø8, Ø20; b_min = 200, a = 45 ingevuld: Δa < 0",
    invoer: { element_b: 2, b_beton: 250, h_beton: 500, c_dek: 25, d_beugel: 8, d_staaf: 20, M_Ed: 100, M_Rd: 150, b_min: 200, a_min: 45 },
    // Met de hand: a = 25 + 8 + 10 = 43 mm. μ_fi = 0,7·100/150 = 0,4667;
    // σ_s,fi/f_yk = 0,4667/1,15 = 0,4058 < 0,6 → kromme 1, 500–700 °C:
    // 0,61 − 0,5·(θ − 500)/200 = 0,4058 → θ_cr = 500 + 400·(0,61 − 0,4058) =
    // 581,7 °C (§5.2(6)); Δa = 0,1·(500 − 581,7) = −8,17 mm (5.3) →
    // a_nodig = 45 − 8,17 = 36,83 mm → UC_a = 36,83/43 = 0,8566; UC_b = 200/250 =
    // 0,8 → UC = 0,8566: voldoet. (Zonder Δa: 45/43 = 1,047.)
    handwerk: { a_hw: "43.0", μ_fi: "0.4667", k_s_fi: "0.4058", θ_cr: "581.7", Δa: "-8.17", a_nodig: "36.83", UC_b: "0.8000", UC_a: "0.8566" },
    oordeel: "voldoet",
  },
  {
    naam: "B3b — als B3, doorgaande balk (tabel 5.6): alleen een vergroting van a",
    invoer: { element_b: 3, b_beton: 250, h_beton: 500, c_dek: 25, d_beugel: 8, d_staaf: 20, M_Ed: 100, M_Rd: 150, b_min: 200, a_min: 45 },
    // Met de hand: θ_cr = 581,7 °C → (5.3) −8,17 mm, maar bij een doorgaande
    // balk geen verlaging: Δa = 0 → UC_a = 45/43 = 1,047: voldoet niet.
    handwerk: { θ_cr: "581.7", Δa: "0", a_nodig: "45.0", UC_a: "1.047" },
    oordeel: "voldoet niet",
  },
  {
    naam: "B3c — balk vrij opgelegd met η_fi = 0,8 en M_Ed = M_Rd: σ_s,fi/f_yk > 0,6, Δa > 0",
    invoer: { element_b: 2, b_beton: 250, h_beton: 500, c_dek: 25, d_beugel: 8, d_staaf: 20, η_fi: 0.8, M_Ed: 150, M_Rd: 150, b_min: 200, a_min: 42 },
    // Met de hand: μ_fi = 0,8·150/150 = 0,8; σ_s,fi/f_yk = 0,8/1,15 = 0,6957 > 0,6
    // → kromme 1, 350–500 °C: 1 − 0,4·(θ − 350)/150 = 0,6957 → θ_cr = 350 +
    // 375·(1 − 0,6957) = 464,1 °C; Δa = 0,1·(500 − 464,1) = +3,59 mm →
    // a_nodig = 42 + 3,59 = 45,59 mm > a = 43 → UC_a = 1,060: voldoet niet.
    // (Zonder Δa: 42/43 = 0,977 "voldoet".)
    handwerk: { k_s_fi: "0.6957", θ_cr: "464.1", Δa: "3.59", a_nodig: "45.59", UC_a: "1.060" },
    oordeel: "voldoet niet",
  },
  {
    naam: "B4 — vloer eenzijdig dragend, h_s = 200, c = 25, Ø10; h_s,min = 100, a = 30 ingevuld: precies op de grens",
    invoer: { element_b: 4, h_beton: 200, c_dek: 25, d_staaf: 10, M_Ed: 100, M_Rd: 120, h_min: 100, a_min: 30 },
    // Met de hand: a = 25 + 5 = 30 mm → UC_a = 1,000; UC_b = 100/200 = 0,5 →
    // UC = 1,000: voldoet. μ_fi = 70/120 = 0,5833, σ_s,fi/f_yk ≈ 0,5833/1,15 = 0,5072.
    handwerk: { a_hw: "30.0", μ_fi: "0.5833", UC_b: "0.5000", UC_a: "1.000" },
    oordeel: "voldoet",
  },
  {
    naam: "B5 — vloer tweezijdig dragend zonder tabelwaarden: niet te bepalen",
    invoer: { element_b: 5, verhouding_b: 2, h_beton: 200, c_dek: 25, d_staaf: 10 },
    onvolledig: "vul de tabelwaarden in",
  },
  {
    naam: "B6 — kolom zonder N_Rd en zonder tabelwaarden: niet te bepalen",
    invoer: { N_Rd: 0 },
    onvolledig: "vul de tabelwaarden en N Rd in",
  },
  {
    naam: "B8 — balk 250×500 met M_fi = 200 kNm bij M_Rd = 150 kNm: μ_fi > 1",
    invoer: { element_b: 2, b_beton: 250, h_beton: 500, c_dek: 30, d_beugel: 8, d_staaf: 20, bron_fi: 2, M_fi: 200, M_Rd: 150,
      eis_min: 60, b_min: 200, a_min: 40 },
    // Met de hand: a = 30 + 8 + 10 = 48 mm → UC_a = 40/48 = 0,8333, UC_b = 200/250
    // = 0,8; de tabel zou voldoen. Maar μ_fi = 200/150 = 1,333 > 1: de belasting
    // bij brand is groter dan de capaciteit bij normale temperatuur, dus het
    // element voldoet niet (eerder gaf het blad hier "voldoet aan R 60").
    handwerk: { a_hw: "48.0", μ_fi: "1.333" },
    overbelast: true,
  },
  {
    naam: "B4b — vloer eenzijdig dragend als B4, M_Ed = M_Rd: σ_s,fi/f_yk > 0,6",
    invoer: { element_b: 4, h_beton: 200, c_dek: 25, d_staaf: 10, M_Ed: 100, M_Rd: 100, h_min: 100, a_min: 30 },
    // Met de hand: μ_fi = 0,7·100/100 = 0,7 → σ_s,fi/f_yk = 0,7/1,15 = 0,6087 > 0,6.
    // Tabel 5.8 hoort bij 0,6 (§5.2(4)) en §5.2(7) noemt tabel 5.8 niet: niet
    // aangetoond → voldoet niet (eerder: UC_a = 30/30 = 1,000 "voldoet").
    handwerk: { μ_fi: "0.7000", k_s_fi: "0.6087" },
    vloerOpen: true,
  },
  {
    naam: "B9 — kolom als B1 met l_0,fi = 3,5 m: methode A niet toepasbaar",
    invoer: { b_beton: 300, h_beton: 400, N_Ed: 1500, N_Rd: 3000, eis_min: 90, b_min: 250, a_min: 40, l_0fi: 3.5 },
    // Met de hand: l_0,fi = 3,5 m > 3 m (§5.3.2(2)) → buiten methode A, ook al is
    // UC = 0,8696 op de tabel: voldoet niet.
    handwerk: { UC_a: "0.8696" },
    nietToepasbaar: true,
  },
  {
    naam: "B10 — kolom 250×250, N_Ed = 800 kN, M_0Ed = 32 kNm: e > 0,15·h",
    invoer: { b_beton: 250, h_beton: 250, N_Ed: 800, M_0Ed: 32, N_Rd: 2000, eis_min: 60, b_min: 200, a_min: 36, A_s: 1608 },
    // Met de hand: e = 32/800 = 40 mm; kolombreedte 250 < 300 → e_max = 0,15·250 =
    // 37,5 mm (NB bij §5.3.2(2)) → e > e_max: methode A niet toepasbaar.
    // A_c = 62 500 mm², ρ = 1608/62 500 = 0,02573.
    handwerk: { e_fi: "40.0", e_max: "37.5", ρ_s: "0.02573" },
    nietToepasbaar: true,
  },
  {
    naam: "B10b — kolom 300×400, N_Ed = 1500 kN, M_0Ed = 200 kNm: e ≤ 0,4·h",
    invoer: { b_beton: 300, h_beton: 400, N_Ed: 1500, M_0Ed: 200, N_Rd: 3000, eis_min: 90, b_min: 250, a_min: 40 },
    // Met de hand: e = 200/1500 = 133,3 mm; kolombreedte 300 ≥ 300 → e_max =
    // 0,4·400 = 160 mm → binnen de voorwaarden; verder als B1: UC = 0,8696.
    handwerk: { e_fi: "133.3", e_max: "160.0", A_c: "120000", ρ_s: "0.01340", UC_a: "0.8696" },
    oordeel: "voldoet",
  },
  {
    naam: "B11 — kolom 300×400 met A_s = 4826 mm² (6Ø32): A_s ≥ 0,04·A_c",
    invoer: { b_beton: 300, h_beton: 400, N_Ed: 1500, N_Rd: 3000, eis_min: 90, b_min: 250, a_min: 40, A_s: 4826 },
    // Met de hand: ρ = 4826/120 000 = 0,04022 ≥ 0,04 → niet toepasbaar.
    handwerk: { ρ_s: "0.04022" },
    nietToepasbaar: true,
  },
  {
    naam: "B12 — ronde kolom Ø400 met A_s = 5100 mm²: A_c = π·D²/4",
    invoer: { vorm_b: 2, b_beton: 400, h_beton: 400, N_Ed: 1500, N_Rd: 3000, eis_min: 90, b_min: 250, a_min: 40, A_s: 5100 },
    // Met de hand: A_c = π·400²/4 = 125 664 mm² → ρ = 5100/125 664 = 0,04058 ≥ 0,04
    // → niet toepasbaar (als rechthoek 400·400 was het 0,0319 geweest).
    handwerk: { A_c: { waarde: "125664", tol: 50, waarom: "het blad drukt vier cijfers af" }, ρ_s: "0.04058" },
    nietToepasbaar: true,
  },
  {
    naam: "B13 — kolom zonder kniklengte en zonder wapening: niet te bepalen",
    invoer: { b_beton: 300, h_beton: 400, N_Ed: 1500, N_Rd: 3000, eis_min: 90, b_min: 250, a_min: 40, l_0fi: 0, A_s: 0 },
    onvolledig: "vul de kniklengte bij brand en de langswapening in",
  },
  {
    naam: "B14 — balk zonder belasting: de staalspanning is niet bekend",
    invoer: { element_b: 2, b_beton: 250, h_beton: 500, c_dek: 25, d_beugel: 8, d_staaf: 20, M_Ed: 0, M_Rd: 150, b_min: 200, a_min: 40 },
    onvolledig: "vul de belasting bij brand in",
  },
  {
    naam: "B7 — kolom aan één zijde verhit, R60",
    invoer: { zijde_b: 2, b_beton: 200, h_beton: 600, b_min: 150, a_min: 25 },
    // Met de hand: a = 46 mm; b = 200 mm → UC_b = 0,75, UC_a = 25/46 = 0,5435.
    handwerk: { UC_b: "0.7500", UC_a: "0.5435" },
    tekst: "aan één zijde is verhit",
    oordeel: "voldoet",
  },
];

console.log("\n══ Beton ══");
for (const set of SETS_BETON) {
  const v = { ...STANDAARD, ...BETON_STANDAARD, ...set.invoer };
  const sv = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, sv, scopeVoor(v));
  const r = uitwerkingBeton(v);
  const slot = got.text.slice(got.text.lastIndexOf("Maatgevende UC"));

  if (set.onvolledig !== undefined || r.onvolledig.length) {
    const m = slot.match(/Maatgevende UC niet te bepalen: (.*?) → het element voldoet niet/);
    const wil = `vul ${opsomming(r.onvolledig)} in`;
    const ons = m ? m[1].trim().replace(/ ,/g, ",") : null;
    const ok = set.onvolledig === wil && ons === set.onvolledig;
    if (!ok) fouten++;
    console.log(`\n${set.naam}`);
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${m ? `"${m[1].trim()}" → voldoet niet` : "een UC"}   verwacht "${set.onvolledig ?? "—"}", narekening "${wil}"`);
    continue;
  }

  const verwacht = { a_hw: ruim(r.a) };
  if (r.μ > 0) verwacht.μ_fi = ruim(r.μ);
  if (!r.buiten) Object.assign(verwacht, { UC_b: ruim(r.UCb), UC_a: ruim(r.UCa) });
  if (r.e !== undefined) Object.assign(verwacht, { e_fi: ruim(r.e), e_max: ruim(r.emax), A_c: ruim(r.Ac), ρ_s: ruim(r.ρ) });
  if (r.k !== undefined) verwacht.k_s_fi = ruim(r.k);
  if (r.θcr !== undefined) Object.assign(verwacht, { θ_cr: { waarde: s4(r.θcr), tol: 0.02 }, a_nodig: { waarde: s4(r.anodig), tol: 0.003 } });
  fouten += toets(`${set.naam} — narekening`, got, verwacht);
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  if (set.kolom !== undefined) {
    const m = got.text.match(/de kolom μ fi = ([\d.]+) af/);
    const ok = m !== null && m[1] === set.kolom && Number(m[1]) === r.kol;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} tabelkolom ons ${m ? m[1] : "—"}   verwacht ${set.kolom}`);
  }
  if (set.tekst !== undefined) {
    const ok = got.text.includes(set.tekst);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} tekst      "${set.tekst}"`);
  }
  if (r.buiten) {
    const ok = set.buiten === true && /niet te bepalen: μ fi > 0,7 valt buiten tabel 5.2a → het element voldoet niet/.test(slot);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    μ_fi > 0,7: buiten de tabel, voldoet niet`);
    continue;
  }
  if (!r.toepasbaar) {
    const ok = set.nietToepasbaar === true && /niet te bepalen: buiten de toepassingsvoorwaarden van §5\.3\.2\(2\), methode A niet toepasbaar → het element voldoet niet/.test(slot);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    buiten §5.3.2(2): methode A niet toepasbaar, voldoet niet`);
    continue;
  }
  if (r.vloerOpen) {
    const ok = set.vloerOpen === true && /tabel 5\.8 niet aangetoond → het element voldoet niet/.test(slot) && !/voldoet aan/.test(slot);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    vloer met σ_s,fi/f_yk > 0,6: niet aangetoond, voldoet niet`);
    continue;
  }
  if (r.overbelast) {
    const ok = set.overbelast === true && /niet te bepalen: μ fi > 1, .* → het element voldoet niet/.test(slot) && !/voldoet aan/.test(slot);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    balk of vloer met μ_fi > 1: voldoet niet`);
    continue;
  }
  const m = slot.match(/Maatgevende UC = ([\d.]+)/);
  const uc = m ? Number(m[1]) : NaN;
  const okUc = Math.abs(uc - r.UCmax) <= Math.max(r.UCmax * 0.002, 1e-6);
  const voldoet = /het element voldoet aan/.test(slot);
  const wil = set.oordeel ?? (r.UCmax <= 1 ? "voldoet" : "voldoet niet");
  const okOordeel = (voldoet ? "voldoet" : "voldoet niet") === wil && wil === (r.UCmax <= 1 ? "voldoet" : "voldoet niet");
  if (!okUc) fouten++;
  if (!okOordeel) fouten++;
  console.log(`  ${okUc ? "OK    " : "FOUT  "} UC_max     ons ${m ? m[1] : "—"}   narekening ${s4(r.UCmax)}`);
  console.log(`  ${okOordeel ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   verwacht ${wil}`);
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
