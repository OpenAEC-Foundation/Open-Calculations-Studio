/**
 * Controlescript voor de module Betondoorsnede (NEN-EN 1992-1-1 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript. Die volgt dezelfde
 *      normregels, maar rekent anders: de drukzonehoogte van de UGT met een
 *      rooster en halvering direct op x (het blad halveert op t = x/(h + x)),
 *      de nodige wapening voor A_s,min door te halveren op de oppervlakte (het
 *      blad lost de vierkantsvergelijking van het spanningsblok op), het
 *      scheurmoment met de excentriciteit e zelf, en de gescheurde doorsnede
 *      van de BGT met een vezelmodel (3000 vezels, beide kanten gedrukt
 *      geprobeerd), zonder de gesloten vormen S0 en S1 en zonder de regel
 *      waarmee het blad bij trek de trekzijde kiest. Het blad moet daar op
 *      vier significante cijfers mee overeenkomen.
 *   2. Voor het standaardgeval en een reeks andere gevallen de getallen van
 *      een handberekening, hieronder en bij de sets uitgeschreven: V_Ed precies
 *      op V_Rd,c en net erboven, wringing met een negatief moment, grote druk
 *      met de minimale excentriciteit, centrische trek in de BGT, wringing
 *      zonder dwarskracht bij V_Rd,c = 0, druk zonder moment bij ongelijke
 *      wapening, wringing die alle buigwapening opeist, de verschuivingsregel
 *      (ΔF_td) met en zonder rekenkundige beugels en tot M_Ed,max, A_s,min
 *      volgens de NB (scheurmoment, 1,25 × nodig, binnen de kern, trek),
 *      s_l,max en s_t,max volgens de NB, en een cot θ tussen 1 en 2,5.
 *
 * Verder: het oordeel in de slotzin, de lege-doorsnedetak (ook zonder staven),
 * de BGT zonder frequente belasting, de spiegeling van het moment en de
 * beginwaarden van het beeld.
 *
 * De M-κ-lijn (mk_lijn = 1, informatief) staat apart onderaan: een vezelmodel
 * (4000 vezels, halveren op de rek of de kromming) en een handberekening van
 * scheuren, vloeien en de uiterste toestand. Met de lijn aan moeten alle
 * andere uitkomsten en het oordeel gelijk blijven; de sets hierboven rekenen
 * zonder de lijn, zoals een bestaand blad na "Bladen bijwerken".
 *
 * Draaien:  node scripts/check-betondoorsnede.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";
import * as kern from "../packages/core/dist/index.js";

const tpl = laadTemplate("betondoorsnede.ts");
// laadTemplate knipt vanaf de eerste backtick in het bestand: staat er een in
// de kop, dan rekent dit script met de kop als bladtekst ervoor.
if (!tpl.startsWith('"Betondoorsnede')) {
  console.log("FOUT  de bladtekst begint niet met de kop; staat er een backtick in het commentaar erboven?");
  process.exit(1);
}

// ── Standaardinvoer (= beginwaarden van het beeld) ──────────────────────────
const STANDAARD = {
  b_dsn: 200, h_dsn: 300, betonklasse: 30, betonstaal: 2, c_dek: 25,
  n_onder: 2, d_onder: 16, n_midden: 2, d_midden: 8, n_boven: 2, d_boven: 12,
  d_beugel: 8, s_beugel: 150, n_sneden: 2,
  N_Ed: 0, M_Ed: 35, V_Ed: 50, T_Ed: 0, M_Ed_max: 0,
  N_fr: 0, M_fr: 20, "φ_kr": 2, milieuklasse: 2, belastingduur: 1, mk_lijn: 0,
};
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 0 };

/*
 * ── Handberekening, standaardgeval ──────────────────────────────────────────
 * 200×300, C30/37, B500B, c = 25; onder 2Ø16, tussenlaag 2Ø8, boven 2Ø12;
 * beugels Ø8-150 tweesnedig. N_Ed = 0, M_Ed = 35 kNm, V_Ed = 50 kN, T_Ed = 0,
 * M_Ed,max = 0 (dit is de doorsnede met het grootste moment);
 * BGT frequent M_fr = 20 kNm, φ = 2, XC2–XC4, langdurend.
 *
 * Materiaal: f_cd = 30/1,5 = 20; f_yd = 500/1,15 = 434,8; f_ctm = 0,3·30^⅔ = 2,896;
 * E_cm = 22 000·3,8^0,3 = 32 840 N/mm².
 * Lagen: A_s,o = 402,1; A_s,m = 100,5; A_s,b = 226,2 mm² (samen 728,8).
 * a_o = 300 − 25 − 8 − 8 = 259; a_b = 25 + 8 + 6 = 39; a_m = 149 mm.
 *
 * Dwarskracht (trek onderin, d = 259, A_sl = 402,1):
 *   k = 1 + √(200/259) = 1,879; ρ_l = 402,1/(200·259) = 0,007763;
 *   0,12·1,879·(100·0,007763·30)^⅓ = 0,12·1,879·2,856 = 0,6440 N/mm² ≥ v_min =
 *   0,035·1,879^1,5·√30 = 0,4937 → V_Rd,c = 0,6440·200·259 = 33,35 kN < V_Ed.
 *   z = 233,1; ν = 0,6·(1 − 30/250) = 0,528; q = 50 000/(200·233,1·0,528·20) =
 *   0,1016 ≤ 1/2,9 → cot θ = 2,5. A_sw = 100,5 mm².
 *   V_Rd,s = 100,5/150·233,1·434,8·2,5 = 169,8 kN → UC_V = 50/169,8 = 0,2944.
 *   V_Rd,max = 200·233,1·0,528·20/(2,5 + 0,4) = 169,8 kN → UC = 0,2945.
 *   (Dat V_Rd,s en V_Rd,max hier samenvallen is toeval van deze invoer.)
 *
 * Buiging (N = 0): M_Ed,max = 0, dus M_Ed,v = |M_Ed| = 35 kNm. Onder en
 * tussenlaag vloeien, de bovenlaag is elastisch:
 *   20·200·0,8·x + 226,2·200 000·0,0035·(x − 39)/x = 434,8·(402,1 + 100,5)
 *   → 3200·x² − 60 210·x − 6 175 000 = 0 → x_u = 54,33 mm; y_c = 43,47 mm.
 *   ε_s1 = 3,5·(259 − 54,33)/54,33 = 13,18 ‰ > 2,17 ‰; ε_sm = −6,10 ‰ (vloeit);
 *   ε_s2 = 3,5·(54,33 − 39)/54,33 = 0,988 ‰ → σ_s2 = 197,5 N/mm².
 *   F_c = 20·200·43,47 = 173,9; F_s1 = −174,8; F_sm = −43,71; F_s2 = 44,68 kN (Σ = 0).
 *   M_Rd = 173,9·(300 − 43,47)/2 + 174,8·109 − 43,71·1 + 44,68·111 = 46,27 kNm
 *   → UC_M = 35/46,27 = 0,7564.
 *
 * Wapeningsregels:
 *   A_s,min (NB bij 9.2.1.1(1)), zuivere buiging: M_E,min = W·f_ctm =
 *   200·300²/6·2,896 = 8,689 kNm. Enkelvoudig gewapend, d = 259:
 *   μ = 8,689·10⁶/(20·200·259²) = 0,03238 → y = 259·(1 − √(1 − 2μ)) = 8,528 mm →
 *   A_s,min1 = 20·200·8,528/434,8 = 78,46 mm². Voor M_Ed,v = 35: μ = 0,1304 →
 *   y = 36,33 → A = 334,3 → A_s,min2 = 1,25·334,3 = 417,8 mm².
 *   A_s,min = 78,46 → UC = 78,46/402,1 = 0,1951.
 *   A_s,tot/(0,04·200·300) = 0,3037; ρ_w = 100,5/(150·200) = 0,003351,
 *   ρ_w,min = 0,08·√30/500 = 0,000876 → 0,2615.
 *   V_Ed > V_Rd,c, dus rekenkundige beugels: s_l,max = min(0,75·259; 300) = 194,2
 *   → 150/194,2 = 0,7722. V_Ed = 50 ≤ 0,5·169,8 → s_t,max = 500 mm;
 *   s_t = 200 − 50 − 8 = 142 → 0,284.
 *
 * Scheurwijdte: α_e = 200 000/32 840 = 6,091; α_L = 6,091·(1 + 2) = 18,27.
 *   Zuivere buiging, gescheurd: ½·b·x² = α_L·ΣA_i·(a_i − x) →
 *   x = (√((α_L·ΣA)² + 2·b·α_L·ΣA_i·a_i) − α_L·ΣA)/b
 *     = (√(13 316² + 2·200·18,27·127 941) − 13 316)/200 = 100,2 mm.
 *   Eerste orde om het zwaartepunt: beton 116,99·10⁶, staal 18,27·8 492 000 =
 *   155,15·10⁶ → 272,1·10⁶ mm⁴; k = 20·10⁶/272,1·10⁶ = 0,07349 N/mm³;
 *   σ_s = 18,27·0,07349·(259 − 100,2) = 213,2 N/mm².
 *   h_c,ef = min(2,5·41; 199,8/3; 150) = 66,60 mm; ρ_p,eff = 402,1/(200·66,6) = 0,03019.
 *   Staafafstand 118 mm ≤ 5·(33 + 8) = 205 → (7.11):
 *   s_r,max = 3,4·33 + 0,8·0,5·0,425·16/0,03019 = 202,3 mm ≤ max(50 − 24; 15)·16 = 416.
 *   ε_sm − ε_cm = (213,2 − 0,4·2,896/0,03019·(1 + 6,091·0,03019))/200 000 =
 *   8,389·10⁻⁴ (≥ 0,6·213,2/200 000); w_k = 202,3·8,389·10⁻⁴ = 0,1697 mm
 *   → UC_w = 0,1697/0,3 = 0,5657.
 *
 * Maatgevend: s_l,max, UC_max = 0,7722 → voldoet.
 */
const HAND_STANDAARD = {
  A_s_o: "402.1", A_s_m: "100.5", A_s_b: "226.2", a_o: "259", a_b: "39", a_m: "149",
  f_cd: "20", f_yd: "434.8", f_ctm: "2.896",
  k_V: "1.879", ρ_l: "0.007763", v_min: "0.4937", V_Rd_c: "33.35", z: "233.1", ν: "0.528", A_sw: "100.5",
  cot_θ: "2.5", V_Rd_s: "169.8", V_Rd_max: "169.8", UC_V: "0.2944", UC_Vmax: "0.2945",
  M_Ed_v: "35", x_u: "54.33", y_c: "43.47", ε_s1: "13.18", F_c: "173.9", F_s1: "-174.8", F_sm: "-43.71", F_s2: "44.68",
  M_Rd: "46.27", UC_M: "0.7564",
  M_E_min: "8.689", A_s_min1: "78.46", A_s_min2: "417.8", A_s_min: "78.46", UC_As_min: "0.1951",
  UC_As_max: "0.3037", ρ_w: "0.003351", UC_ρw: "0.2615",
  s_l_max: "194.2", UC_sl: "0.7722", s_t: "142", s_t_max: "500", UC_st: "0.284",
  E_cm: "32840", α_e: "6.091", α_L: "18.27", x_fr: "100.2", σ_s: "213.2", h_c_ef: "66.6", ρ_p_eff: "0.03019",
  s_r_max: "202.3", w_k: "0.1697", UC_w: "0.5657", UC_max: "0.7722",
};

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
const ECU3 = 0.0035, EC3 = 0.00175, ES = 200000;

/** Wortel van een stijgende functie f op [lo, hi] door halveren; null zonder tekenwissel. */
function wortel(f, lo, hi, n = 200) {
  let flo = f(lo), fhi = f(hi);
  if (flo > 0 || fhi < 0) return null;
  for (let i = 0; i < n; i++) {
    const m = (lo + hi) / 2, fm = f(m);
    if (fm < 0) { lo = m; flo = fm; } else { hi = m; fhi = fm; }
  }
  return (lo + hi) / 2;
}

function uitwerking(v) {
  const r = {};
  const b = v.b_dsn, h = v.h_dsn, c = v.c_dek, fck = v.betonklasse;
  const fcd = fck / 1.5, fyd = 500 / 1.15;
  const fctm = 0.3 * fck ** (2 / 3);
  const Ecm = 22000 * ((fck + 8) / 10) ** 0.3;
  const opp = (n, dia) => (n * Math.PI * dia * dia) / 4;
  const L = {
    o: { A: opp(v.n_onder, v.d_onder), a: h - c - v.d_beugel - v.d_onder / 2, n: v.n_onder, dia: v.d_onder },
    b: { A: opp(v.n_boven, v.d_boven), a: c + v.d_beugel + v.d_boven / 2, n: v.n_boven, dia: v.d_boven },
  };
  L.m = { A: opp(v.n_midden, v.d_midden), a: (L.o.a + L.b.a) / 2, n: v.n_midden, dia: v.d_midden };
  const Atot = L.o.A + L.m.A + L.b.A;
  const bi = b - 2 * (c + v.d_beugel);
  r.geldig = Atot > 0 && v.n_onder * v.d_onder <= bi && v.n_midden * v.d_midden <= bi && v.n_boven * v.d_boven <= bi &&
    L.o.a - v.d_onder / 2 > L.b.a + v.d_boven / 2 && v.n_sneden >= 2 && v.s_beugel > 0 && v.d_beugel > 0;
  if (!r.geldig) return r;
  Object.assign(r, { fcd, fyd, fctm, Ecm, Ao: L.o.A, Am: L.m.A, Ab: L.b.A, ao: L.o.a, ab: L.b.a, am: L.m.a });

  const NEd = v.N_Ed * 1e3, MEd = v.M_Ed * 1e6, VEd = Math.abs(v.V_Ed) * 1e3, TEd = Math.abs(v.T_Ed) * 1e6;
  const MEdMax = v.M_Ed_max * 1e6;
  // Trekzijde: die van M_Ed, bij M_Ed = 0 die van M_Ed,max, anders die van M_fr.
  const teken = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
  const sU = teken(v.M_Ed) || teken(v.M_Ed_max) || (v.M_fr < 0 ? -1 : 1);
  const trek = sU > 0 ? L.o : L.b;
  const d = sU > 0 ? L.o.a : h - L.b.a;
  const a2 = sU > 0 ? L.b.a : h - L.o.a; // de andere laag, vanaf de gedrukte rand
  r.d = d;

  // Dwarskracht (6.2)
  const k = Math.min(1 + Math.sqrt(200 / d), 2);
  const rhol = Math.min(trek.A / (b * d), 0.02);
  const scp = Math.min(NEd / (b * h), 0.2 * fcd);
  const vmin = 0.035 * k ** 1.5 * Math.sqrt(fck);
  const VRdc = Math.max(Math.max((0.18 / 1.5) * k * (100 * rhol * fck) ** (1 / 3), vmin) + 0.15 * scp, 0) * b * d;
  const z = 0.9 * d, nu = 0.6 * (1 - fck / 250);
  const Asw = opp(v.n_sneden, v.d_beugel);
  const tef = Math.min(Math.max((b * h) / (2 * (b + h)), 2 * Math.max(L.b.a, h - L.o.a)), b / 2);
  const Ak = (b - tef) * (h - tef), uk = 2 * (b - tef + h - tef);
  // cot θ: de grootste in [1; 2,5] waarbij (6.29) — zonder wringing (6.9) — net voldoet.
  const q = VEd / (b * z * nu * fcd) + TEd / (2 * nu * fcd * Ak * tef);
  const f629 = (ct) => (ct + 1 / ct) * q - 1;
  // f629 stijgt op [1; 2,5]: negatief bij 1, positief bij 2,5 — de wortel is de grootste cot θ die voldoet.
  const cot = f629(2.5) <= 0 ? 2.5 : f629(1) > 0 ? 1 : wortel(f629, 1, 2.5);
  const VRds = (Asw / v.s_beugel) * z * fyd * cot;
  const VRdmax = (b * z * nu * fcd) / (cot + 1 / cot);
  Object.assign(r, { k, rhol, scp, vmin, VRdc, z, nu, Asw, cot, VRds, VRdmax, tef, Ak, uk });
  let AslT = 0;
  // Rekenkundige dwarskrachtwapening nodig? Dat bepaalt a_l en s_l,max (NB bij 9.2.2(6)).
  let beugelsNodig;
  if (TEd > 0) {
    const TRdc = 2 * Ak * tef * ((0.7 * fctm) / 1.5);
    const TRdmax = (2 * nu * fcd * Ak * tef) / (cot + 1 / cot);
    r.UCVmax = TEd / TRdmax + VEd / VRdmax;
    r.UC631 = TEd / TRdc + (VEd > 0 ? VEd / VRdc : 0);
    if (r.UC631 <= 1) { r.UCV = r.UC631; beugelsNodig = false; }
    else {
      r.UCV = (VEd / (z * fyd * cot * v.n_sneden) + TEd / (2 * Ak * fyd * cot)) / (opp(1, v.d_beugel) / v.s_beugel);
      AslT = (TEd * uk * cot) / (2 * Ak * fyd);
      beugelsNodig = true;
    }
    Object.assign(r, { TRdc, TRdmax });
  } else {
    r.UCVmax = VEd / VRdmax;
    beugelsNodig = !(VEd <= VRdc && VRdc > 0) && VEd > 0;
    r.UCV = VEd <= VRdc && VRdc > 0 ? VEd / VRdc : VEd / VRds;
  }
  r.AslT = AslT;
  const bk = b - tef, hk = h - tef;
  const AT = { o: (AslT * (bk + (v.n_midden > 0 ? hk / 2 : hk))) / uk, m: (AslT * (v.n_midden > 0 ? hk : 0)) / uk };
  AT.b = AT.o;
  r.UCTl = Math.max(...["o", "m", "b"].map((i) => (AT[i] > 0 ? AT[i] / L[i].A : 0)));

  // Verschuivingsregel (9.2.1.3(2)): ΔF_td·z = |V_Ed|·a_l, ten hoogste M_Ed,max (6.2.3(7)).
  // a_l = z·cot θ/2 met rekenkundige beugels (9.2), anders d (6.2.2(5)).
  if (MEdMax === 0) r.Mv = Math.abs(MEd);
  else {
    r.al = beugelsNodig ? (z * cot) / 2 : d;
    r.Mv = Math.min(Math.abs(MEd) + VEd * r.al, Math.max(Math.abs(MEdMax), Math.abs(MEd)));
  }

  // Buiging met normaalkracht (§6.1), met de lagen verminderd met de wringingswapening
  const red = { o: Math.max(L.o.A - AT.o, 0), m: Math.max(L.m.A - AT.m, 0), b: Math.max(L.b.A - AT.b, 0) };
  const Ared = red.o + red.m + red.b;
  const rek = (x, dd) => (x <= h ? (ECU3 * (x - dd)) / x : (EC3 * (x - dd)) / (x - h / 2));
  const sig = (e) => Math.min(Math.max(ES * e, -fyd), fyd);
  /** N en M (druk positief, M om het zwaartepunt) bij drukzone x vanaf de rand die o aanwijst. */
  const NM = (x, o) => {
    const yc = Math.min(0.8 * x, h);
    let N = fcd * b * yc, M = fcd * b * yc * (h / 2 - yc / 2);
    for (const i of ["o", "m", "b"]) {
      const dd = o > 0 ? L[i].a : h - L[i].a;
      const F = red[i] * sig(rek(x, dd));
      N += F;
      M += F * (h / 2 - dd);
    }
    return { N, M };
  };
  const zoekX = (o) => {
    // Rooster van 1e−6·h tot 1e4·h, dan halveren binnen het eerste interval met de tekenwissel.
    let vorig = 1e-6 * h;
    for (let j = 1; j <= 1000; j++) {
      const x = h * 10 ** (-6 + j / 100);
      if (NM(x, o).N - NEd >= 0) return wortel((t) => NM(t, o).N - NEd, vorig, x);
      vorig = x;
    }
    return null;
  };
  const NRdmax = fcd * b * h + Ared * Math.min(ES * EC3, fyd);
  const NRdmin = -fyd * Ared;
  r.NRdmax = NRdmax; r.NRdmin = NRdmin;
  r.UCN = NEd > 0 ? NEd / NRdmax : NEd < 0 ? NEd / NRdmin : 0;
  // Minimale excentriciteit bij druk (6.1(4)), in de richting van M_Ed.
  r.e0 = Math.max(h / 30, 20);
  r.Me0 = NEd > 0 ? NEd * r.e0 : 0;
  r.Mrek = Math.max(r.Mv, r.Me0);
  if (r.UCN >= 1) r.UCM = r.UCN;
  else if (Ared <= 0 && NEd <= 0 && r.Mv !== 0) r.UCM = Infinity; // wringing laat niets over voor de buiging
  else {
    const x1 = zoekX(sU), x2 = zoekX(-sU);
    const MRd = NM(x1, sU).M, Mt = NM(x2, -sU).M;
    const Mmin = Math.max(-Mt, 0);
    const lagen = sU > 0 ? ["o", "m", "b"] : ["b", "m", "o"];
    const dd = (i) => (sU > 0 ? L[i].a : h - L[i].a);
    Object.assign(r, {
      xu: x1, yc: Math.min(0.8 * x1, h), MRd, Mmin,
      es1: -rek(x1, dd(lagen[0])) * 1000,
      Fc: fcd * b * Math.min(0.8 * x1, h),
      Fs1: red[lagen[0]] * sig(rek(x1, dd(lagen[0]))),
      Fsm: red.m * sig(rek(x1, dd("m"))),
      Fs2: red[lagen[2]] * sig(rek(x1, dd(lagen[2]))),
    });
    const m = r.Mrek;
    r.Mt = Mt;
    // Zonder M_Ed en bij druk werkt e_0 naar beide kanten: de zwakste kant telt. Een toeslag uit de
    // verschuiving (M_Ed,max bij M_Ed = 0) telt alleen naar de trekzijde, e_0 blijft ook de andere kant op.
    r.beideKanten = NEd > 0 && MEd === 0;
    r.UCM = MRd <= 0 ? Infinity
      : r.beideKanten ? (Mt <= 0 ? Infinity : Math.max(m / MRd, r.Me0 / Mt))
      : Mmin > m ? Mmin / m : m / MRd;
  }

  // A_s,min volgens de NB bij 9.2.1.1(1): min(A_s,min1; A_s,min2).
  // Nodige trekwapening (enkelvoudig, staal vloeit): halveren op A tot het moment om het
  // zwaartepunt klopt, met F_c = n + A·f_yd en y = F_c/(f_cd·b). Ligt de resultante tussen de
  // lagen (trek), dan de hefboomregel om de andere laag. Past het niet binnen y_lim (staal
  // vloeit niet meer), dan de dubbel gewapende vorm met drukwapening op a2.
  const ylim = 0.8 * (ECU3 / (ECU3 + fyd / ES)) * d;
  const nodig = (m, n) => {
    if (m + n * (d - h / 2) <= 0) return (m - n * (h / 2 - a2)) / ((d - a2) * fyd);
    const MR = (A) => { const Fc = n + A * fyd, y = Fc / (fcd * b); return Fc * (h / 2 - y / 2) + A * fyd * (d - h / 2); };
    const lo = Math.max(0, -n / fyd), hi = (fcd * b * ylim - n) / fyd;
    if (hi >= lo) {
      if (MR(lo) >= m) return lo;
      if (MR(hi) >= m) return wortel((A) => MR(A) - m, lo, hi);
    }
    const Mlim = fcd * b * ylim * (d - ylim / 2);
    return Math.max((fcd * b * ylim + (m + n * (d - h / 2) - Mlim) / (d - a2) - n) / fyd, 0);
  };
  const W = (b * h * h) / 6, Ac = b * h, Mv = r.Mv;
  // Het scheurmoment bij de excentriciteit e = M/|N| (NB): druk M = W·f_ctm/(1 − W/(A_c·e)),
  // trek M = W·f_ctm/(1 + W/(A_c·e)), zuivere buiging W·f_ctm; N = M/e. Bij druk binnen de kern
  // (e ≤ W/A_c) scheurt de doorsnede niet.
  r.kern = NEd > 0 && Mv / NEd <= W / Ac;
  if (r.kern) r.As1 = 0;
  else {
    const e = NEd !== 0 ? Mv / Math.abs(NEd) : Infinity;
    if (NEd === 0) { r.MEmin = W * fctm; r.NEmin = 0; }
    else if (NEd > 0) { r.MEmin = (W * fctm) / (1 - W / (Ac * e)); r.NEmin = r.MEmin / e; }
    else { r.NEmin = -(W * fctm) / (e + W / Ac); r.MEmin = -r.NEmin * e; }
    r.As1 = nodig(r.MEmin, r.NEmin);
  }
  r.As2 = 1.25 * nodig(Mv, NEd);
  r.Asmin = Math.min(r.As1, r.As2);
  r.UCAsmin = r.Asmin <= 0 ? 0 : r.Asmin / trek.A;
  r.UCAsmax = Atot / (0.04 * b * h);
  r.rhow = Asw / (v.s_beugel * b);
  r.rhowmin = (0.08 * Math.sqrt(fck)) / 500;
  r.UCrhow = r.rhowmin / r.rhow;
  // s_l,max (NB bij 9.2.2(6)): 300 mm, met rekenkundige beugels ook ≤ 0,75·d; bij wringing u/8, b, h.
  const sl0 = beugelsNodig ? Math.min(0.75 * d, 300) : 300;
  r.slmax = TEd > 0 ? Math.min(sl0, (2 * (b + h)) / 8, b, h) : sl0;
  r.UCsl = v.s_beugel / r.slmax;
  r.st = (b - 2 * c - v.d_beugel) / (v.n_sneden - 1);
  // s_t,max (NB bij 9.2.2(8)): 500 mm bij V_Ed ≤ 0,5·V_Rd,max, anders 0,75·d ≤ 500 mm.
  r.stmax = VEd <= 0.5 * VRdmax ? 500 : Math.min(0.75 * d, 500);
  r.UCst = r.st / r.stmax;
  // 9.2.3(4): bij wringing een langsstaaf in elke hoek en ≤ 350 mm h.o.h. langs de beugel.
  if (TEd > 0) {
    if (v.n_onder < 2 || v.n_boven < 2) r.UCslT = Infinity;
    else {
      const verticaal = v.n_midden >= 2 ? (L.o.a - L.b.a) / 2 : L.o.a - L.b.a;
      const horizontaal = Math.max((bi - v.d_onder) / (v.n_onder - 1), (bi - v.d_boven) / (v.n_boven - 1));
      r.sT = Math.max(verticaal, horizontaal);
      r.UCslT = r.sT / 350;
    }
  } else r.UCslT = 0;

  // Scheurwijdte (§7.3.4) onder de frequente combinatie: vezelmodel van de gescheurde doorsnede
  const phit = v.belastingduur === 1 ? v["φ_kr"] : 0;
  const ae = ES / Ecm, aL = ae * (1 + phit), Eeff = Ecm / (1 + phit);
  const Nq = v.N_fr * 1e3, Mq = v.M_fr * 1e6;
  r.aL = aL; r.ae = ae;
  r.nietGetoetst = Nq === 0 && Mq === 0;
  if (r.nietGetoetst) { r.sigs = 0; r.UCw = 0; return r; }
  const nf = 3000, dy = h / nf;
  /** Resultanten per eenheid kromming, rek ε(y) = s·(x − y), y vanaf de bovenrand, druk positief. */
  const res = (x, s) => {
    let N = 0, M = 0;
    for (let j = 0; j < nf; j++) {
      const y = (j + 0.5) * dy, e = s * (x - y);
      if (e > 0) { const F = Eeff * e * b * dy; N += F; M += F * (h / 2 - y); }
    }
    for (const i of ["o", "m", "b"]) {
      const F = L[i].A * ES * s * (x - L[i].a);
      N += F; M += F * (h / 2 - L[i].a);
    }
    return { N, M };
  };
  let sls = null;
  for (const s of [1, -1]) {
    const f = (x) => { const q2 = res(x, s); return q2.N * Mq - q2.M * Nq; };
    const pts = [];
    for (let j = -400; j <= 400; j++) pts.push(h * (0.5 + Math.sinh(j / 60) * 2));
    for (let j = 0; j < pts.length - 1; j++) {
      let lo = pts[j], hi = pts[j + 1], flo = f(lo), fhi = f(hi);
      if (flo === 0 || flo * fhi > 0) continue;
      for (let it = 0; it < 80; it++) {
        const mid = (lo + hi) / 2, fm = f(mid);
        if (fm * flo > 0) { lo = mid; flo = fm; } else { hi = mid; fhi = fm; }
      }
      const x = (lo + hi) / 2, q2 = res(x, s);
      const kap = Math.abs(Mq) > 0 ? Mq / q2.M : Nq / q2.N;
      if (kap > 0 && Number.isFinite(kap)) { sls = { x, s, kap }; break; }
    }
    if (sls) break;
  }
  if (!sls) { r.sigs = 0; r.UCw = 0; return r; }
  const tz = sls.s > 0 ? L.o : L.b;
  const aQ1 = sls.s > 0 ? L.o.a : h - L.b.a;
  const xq = sls.s > 0 ? sls.x : h - sls.x;
  r.sigs = -ES * sls.s * (sls.x - tz.a) * sls.kap; // trek positief
  r.xq = xq;
  if (r.sigs <= 0) { r.UCw = 0; return r; }
  const cl = c + v.d_beugel;
  const hcef = xq > 0 ? Math.min(2.5 * (h - aQ1), (h - xq) / 3, h / 2) : Math.min(2.5 * (h - aQ1), h / 2);
  const rp = tz.A / (b * hcef);
  const k2 = xq > 0 ? 0.5 : (h - 2 * xq) / (2 * (h - xq));
  const sO = tz.n > 1 ? (b - 2 * cl - tz.dia) / (tz.n - 1) : b;
  // (7.11) met de bovengrens max(50 − 0,8·f_ck; 15)·Ø (NB), of (7.14)
  const srmax = sO <= 5 * (cl + tz.dia / 2)
    ? Math.min(3.4 * cl + (0.8 * k2 * 0.425 * tz.dia) / rp, Math.max(50 - 0.8 * fck, 15) * tz.dia)
    : 1.3 * (h - Math.max(xq, 0));
  const kt = v.belastingduur === 1 ? 0.4 : 0.6;
  const de = Math.max((r.sigs - ((kt * fctm) / rp) * (1 + ae * rp)) / ES, (0.6 * r.sigs) / ES);
  const wmax = v.milieuklasse === 1 ? 0.4 : v.milieuklasse === 2 ? 0.3 : 0.2;
  Object.assign(r, { hcef, rp, k2, srmax, de, wk: srmax * de, wmax, UCw: (srmax * de) / wmax });
  return r;
}

// ── Van de uitwerking naar de namen in het blad ─────────────────────────────
const s4 = (x) => String(Number(x.toPrecision(4)));
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.001, 1e-6) });

function verwachtingen(r, v) {
  const uit = {
    k_V: ruim(r.k), ρ_l: ruim(r.rhol), σ_cp: ruim(r.scp), v_min: ruim(r.vmin), V_Rd_c: ruim(r.VRdc / 1e3),
    z: ruim(r.z), ν: ruim(r.nu), A_sw: ruim(r.Asw), cot_θ: ruim(r.cot), V_Rd_s: ruim(r.VRds / 1e3),
    V_Rd_max: ruim(r.VRdmax / 1e3), UC_V: ruim(r.UCV), UC_Vmax: ruim(r.UCVmax),
    M_Ed_v: ruim(r.Mv / 1e6), A_s_min2: ruim(r.As2), A_s_min: ruim(r.Asmin), UC_As_min: ruim(r.UCAsmin), UC_As_max: ruim(r.UCAsmax),
    ρ_w: ruim(r.rhow), ρ_w_min: ruim(r.rhowmin), UC_ρw: ruim(r.UCrhow), s_l_max: ruim(r.slmax), UC_sl: ruim(r.UCsl),
    s_t: ruim(r.st), s_t_max: ruim(r.stmax), UC_st: ruim(r.UCst),
  };
  if (!r.nietGetoetst) Object.assign(uit, { α_e: ruim(r.ae), α_L: ruim(r.aL) });
  if (v.M_Ed_max !== 0) uit.a_l = ruim(r.al);
  if (!r.kern) Object.assign(uit, { M_E_min: ruim(r.MEmin / 1e6), N_E_min: ruim(r.NEmin / 1e3), A_s_min1: ruim(r.As1) });
  if (v.T_Ed !== 0) {
    if (Number.isFinite(r.UCslT)) Object.assign(uit, { s_T: ruim(r.sT), UC_sl_T: ruim(r.UCslT) });
    Object.assign(uit, { t_ef: ruim(r.tef), A_k: ruim(r.Ak), u_k: ruim(r.uk), T_Rd_c: ruim(r.TRdc / 1e6), T_Rd_max: ruim(r.TRdmax / 1e6), UC_631: ruim(r.UC631) });
    if (r.AslT > 0) Object.assign(uit, { A_sl_T: ruim(r.AslT), UC_Tl: ruim(r.UCTl) });
  }
  if (v.N_Ed > 0) Object.assign(uit, { N_Rd_max: ruim(r.NRdmax / 1e3), UC_N: ruim(r.UCN), e_0: ruim(r.e0), M_e0: ruim(r.Me0 / 1e6) });
  if (v.N_Ed < 0) Object.assign(uit, { N_Rd_min: ruim(r.NRdmin / 1e3), UC_N: ruim(r.UCN) });
  if (r.UCN < 1 && r.xu !== undefined) {
    Object.assign(uit, {
      x_u: ruim(r.xu), y_c: ruim(r.yc), ε_s1: ruim(r.es1), F_c: ruim(r.Fc / 1e3), M_Rd: ruim(r.MRd / 1e6),
    });
    // Een kracht die door afronding bij nul ligt, heeft geen vier significante cijfers.
    for (const [naam, F] of [["F_s1", r.Fs1], ["F_sm", r.Fsm], ["F_s2", r.Fs2]]) {
      uit[naam] = { waarde: s4(F / 1e3), tol: Math.max(Math.abs(F / 1e3) * 0.001, 1e-3) };
    }
    if (r.beideKanten && r.Mt > 0 && r.MRd > 0) uit.M_Rd_t = ruim(r.Mt / 1e6);
    else if (!r.beideKanten && r.Mmin > r.Mrek) uit.M_Rd_min = ruim(r.Mmin / 1e6);
  }
  if (r.UCN < 1 && Number.isFinite(r.UCM)) uit.UC_M = ruim(r.UCM);
  if (r.sigs > 0) {
    Object.assign(uit, {
      σ_s: ruim(r.sigs), h_c_ef: ruim(r.hcef), ρ_p_eff: ruim(r.rp), s_r_max: ruim(r.srmax),
      Δε_sm: ruim(r.de), w_k: ruim(r.wk), w_max: ruim(r.wmax), UC_w: ruim(r.UCw),
    });
    if (r.xq > 0) uit.x_fr = ruim(r.xq);
    else uit.k_2 = ruim(r.k2);
  }
  const UCs = [r.UCN, r.UCM, r.UCV, r.UCVmax, r.UCTl, r.UCAsmin, r.UCAsmax, r.UCrhow, r.UCsl, r.UCst, r.UCslT, r.UCw];
  r.UCmax = Math.max(...UCs);
  if (Number.isFinite(r.UCmax)) uit.UC_max = ruim(r.UCmax);
  return uit;
}

/** Het oordeel zoals de rapportkop het leest: de laatste slotzin "Maatgevende UC = … → …". */
function slotzin(text) {
  const i = text.lastIndexOf("Maatgevende UC");
  if (i < 0) return null;
  const zin = text.slice(i, i + 240);
  return { voldoet: !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin), zin };
}

// ── Sets ────────────────────────────────────────────────────────────────────
const SETS = [
  { naam: "1 — standaard: 200×300 C30/37, 2Ø16/2Ø8/2Ø12, Ø8-150, M_Ed 35, V_Ed 50, M_fr 20", invoer: {}, handwerk: HAND_STANDAARD },
  {
    naam: "2 — grensgeval V_Ed = V_Rd,c: nog zonder rekenkundige dwarskrachtwapening",
    invoer: { V_Ed: 33.35 },
    // Met de hand: V_Rd,c = 33,354 kN (zie 1) ≥ 33,35 → UC_V = V_Ed/V_Rd,c = 0,9999.
    handwerk: { V_Rd_c: "33.35", UC_V: { waarde: "0.9999", tol: 0.00015, waarom: "V_Ed ligt op de afrondgrens van V_Rd,c" } },
  },
  {
    naam: "3 — net boven V_Rd,c: de beugels nemen het over (6.2.1(4) → 6.2.3)",
    invoer: { V_Ed: 33.4 },
    // Met de hand: 33,4 > 33,354 → UC_V = 33,4/169,8 = 0,1967. De sprong van 1,0 naar 0,2 is die van de norm.
    handwerk: { UC_V: "0.1967" },
  },
  {
    naam: "4 — negatief moment, druk en wringing: trek boven, (6.31) overschreden, langswapening gaat af",
    invoer: { M_Ed: -30, N_Ed: 150, V_Ed: 60, T_Ed: 8 },
    // Met de hand: trek boven, d = 300 − 39 = 261, A_sl = 226,2 mm².
    // t_ef = max(60 000/1000; 2·max(39; 41)) = 82 mm; A_k = 118·218 = 25 724 mm²; u_k = 672 mm.
    // q = 60 000/(200·234,9·0,528·20) + 8·10⁶/(2·0,528·20·25 724·82) = 0,1209 + 0,1796 = 0,3005
    // ≤ 1/2,9 → cot θ = 2,5. T_Rd,max = 2·0,528·20·25 724·82/2,9 = 15,36 kNm;
    // V_Rd,max = 200·234,9·0,528·20/2,9 = 171,1 kN → (6.29): 8/15,36 + 60/171,1 = 0,8715.
    // f_ctd = 0,7·2,896/1,5 = 1,352 → T_Rd,c = 2·25 724·82·1,352 = 5,702 kNm.
    // V_Rd,c: k = 1,875, ρ_l = 0,004333 → 0,12·1,875·13,00^⅓ = 0,5292 + 0,15·2,5 = 0,9042 N/mm²
    // → 47,20 kN. (6.31): 8/5,702 + 60/47,20 = 2,674 > 1.
    // Beugelsnede: 60 000/(234,9·434,8·2,5·2) + 8·10⁶/(2·25 724·434,8·2,5) = 0,1175 + 0,1431 =
    // 0,2606 mm²/mm tegen 50,27/150 = 0,3351 → UC_V = 0,7775.
    // (6.28): ΣA_sl = 8·10⁶·672·2,5/(2·25 724·434,8) = 600,8 mm²; per laag (118 + 109)/672 → 203,0
    // onder en boven, 218/672 → 194,9 in de tussenlaag → tussenlaag 194,9/100,5 = 1,939.
    // 9.2.3(4): binnen de beugel 200 − 2·33 = 134 mm; boven 134 − 12 = 122, onder 134 − 16 = 118,
    // de staande wand (259 − 39)/2 = 110 → grootste 122 mm → UC = 122/350 = 0,3486.
    // A_s,min: druk met e = 30/150 = 200 mm > h/6: M_E,min = 8,689/(1 − 3·10⁶/(60 000·200)) = 11,59 kNm,
    // N_E,min = 11,59/0,2 = 57,93 kN. Om de trekwapening (d = 261): 11,59 + 57,93·0,111 = 18,02 kNm →
    // μ = 18,02·10⁶/(4000·261²) = 0,06612 → y = 17,87 mm → A_s,min1 = (71,47 − 57,93)·10³/434,8 = 31,15 mm².
    handwerk: {
      t_ef: "82", A_k: "25720", u_k: "672", cot_θ: "2.5", T_Rd_max: "15.36", V_Rd_max: "171.1", UC_Vmax: "0.8715",
      T_Rd_c: "5.702", V_Rd_c: "47.2", UC_631: "2.674", UC_V: "0.7775", A_sl_T: "600.8", UC_Tl: "1.939",
      s_T: "122", UC_sl_T: "0.3486", M_E_min: "11.59", N_E_min: "57.93", A_s_min1: "31.15",
    },
  },
  {
    naam: "5 — grensgeval trek: N_Ed = −300 kN vraagt een moment van ten minste M_Rd,min",
    invoer: { N_Ed: -300, M_Ed: 5 },
  },
  {
    naam: "6 — trek zonder moment: de doorsnede bezwijkt (M_Rd,min > 0)",
    invoer: { N_Ed: -300, M_Ed: 0 },
    // A_s,min bij centrische trek: e = 0 → N_E,min = −W·f_ctm/(W/A_c) = −A_c·f_ctm = −173,8 kN, M_E,min = 0.
    // De resultante ligt tussen de lagen: om de bovenlaag (a_2 = 39) A_s,min1 = 173,8·10³·111/(220·434,8)
    // = 201,7 mm²; A_s,min2 = 1,25·300·10³·111/(220·434,8) = 435,2 mm² → A_s,min = 201,7 mm².
    handwerk: { M_E_min: "0", N_E_min: "-173.8", A_s_min1: "201.7", A_s_min2: "435.2", A_s_min: "201.7" },
  },
  { naam: "7 — normaalkracht groter dan N_Rd,max", invoer: { N_Ed: 2000 } },
  {
    naam: "8 — grote druk zonder moment: de minimale excentriciteit e_0 (6.1(4)) is maatgevend",
    invoer: { N_Ed: 1300, M_Ed: 0 },
    // Met de hand: N_Rd,max = 20·200·300 + 728,8·350 = 1455 kN → UC_N = 0,8934. De drukzone ligt
    // voorbij h (spil C): x = 345 geeft F_c = 3200·345 = 1104 kN, onder ε = 1,75·86/195 = 0,772 ‰
    // → 62,1 kN, tussenlaag 1,759 ‰ → 35,4 kN, boven vloeit → 98,4 kN; samen 1300 kN.
    // M_Rd = 1104·(300 − 276)/2 − 62,1·109 + 35,4·1 + 98,4·111 = 17,41 kNm.
    // e_0 = max(300/30; 20) = 20 mm → M_e0 = 1300·0,020 = 26 kNm → UC_M = 26/17,41 = 1,49: voldoet niet.
    handwerk: { N_Rd_max: "1455", UC_N: "0.8934", x_u: "345.1", M_Rd: "17.41", e_0: "20", M_e0: "26", UC_M: "1.49" },
  },
  {
    naam: "9 — BGT: centrische trek, de bovenzijde is de trekzijde",
    invoer: { N_fr: -150, M_fr: 0 },
    // Met de hand, alleen staal (geheel getrokken). Trekspanning t = p + q·u, u = a − 150 mm:
    // boven / midden / onder u = −111 / −1 / +109. ΣA = 728,8; ΣA·u = 18 623; ΣA·u² = 7 564 680.
    // Momentevenwicht ΣA·t·u = 0 → p = −q·ΣAu²/ΣAu = −406,2·q; krachtevenwicht ΣA·t = 150 000 →
    // q = 150 000/(18 623 − 728,8·406,2) = −0,5407 N/mm³ en p = 219,6 N/mm².
    // Boven t = 219,6 + 0,5407·111 = 279,6 N/mm², onder 160,7: de bovenzijde is de trekzijde,
    // hoewel het zwaartepunt van de wapening onder het midden ligt.
    // Nullijn op u = 406,2 → vanaf de minst getrokken (onder)rand x = −256,2 mm;
    // k_2 = (300 + 2·256,2)/(2·(300 + 256,2)) = 0,7303 (7.13). h_c,ef = min(2,5·39; 150) = 97,5 mm;
    // ρ_p,eff = 226,2/(200·97,5) = 0,01160. Staafafstand 122 ≤ 5·(33 + 6) → (7.11):
    // 3,4·33 + 0,8·0,7303·0,425·12/0,0116 = 369,1 mm, meer dan de bovengrens van de NB
    // max(50 − 0,8·30; 15)·12 = 312 mm → s_r,max = 312 mm.
    // ε_sm − ε_cm = (279,6 − 0,4·2,896/0,0116·(1 + 6,091·0,0116))/200 000 = 8,634·10⁻⁴
    // → w_k = 312·8,634·10⁻⁴ = 0,2694 mm → UC_w = 0,898 (zonder de bovengrens 1,062).
    handwerk: { σ_s: "279.6", k_2: "0.7303", h_c_ef: "97.5", ρ_p_eff: "0.0116", s_r_max: "312", w_k: "0.2694", UC_w: "0.898" },
  },
  { naam: "10 — BGT: trek met een klein moment, geheel getrokken aan de onderzijde", invoer: { N_fr: -150, M_fr: 5 } },
  { naam: "11 — BGT: grote druk, geen trek in de wapening, geen scheuren", invoer: { N_fr: 800, M_fr: 10 } },
  { naam: "12 — BGT: druk en buiging, gedeeltelijk gescheurd", invoer: { N_fr: 150, M_fr: 30 } },
  {
    naam: "13 — brede balk zonder tussenlaag, kortdurend: staven verder dan 5(c + Ø/2), (7.14)",
    invoer: { b_dsn: 600, n_onder: 3, n_midden: 0, belastingduur: 2, M_Ed: 60, n_sneden: 4 },
  },
  { naam: "14 — negatief moment ook in de BGT, XD/XS", invoer: { M_Ed: -25, M_fr: -15, milieuklasse: 3, V_Ed: -40 } },
  {
    naam: "15 — hoge balk C45/55, Ø25, druk en een kleine wringing binnen (6.31): alleen minimumwapening",
    invoer: { b_dsn: 350, h_dsn: 700, betonklasse: 45, n_onder: 4, d_onder: 25, n_midden: 2, d_midden: 12, n_boven: 3, d_boven: 16, d_beugel: 10, s_beugel: 200, n_sneden: 2, N_Ed: 600, M_Ed: 380, V_Ed: 220, T_Ed: 1.5, N_fr: 400, M_fr: 220, "φ_kr": 1.6 },
  },
  {
    naam: "16 — zware wringing met een kleine cot θ: drukdiagonalen maatgevend",
    invoer: { T_Ed: 25, V_Ed: 120, s_beugel: 100, d_beugel: 10 },
  },
  { naam: "17 — alleen onderwapening, groot moment: bovenlaag leeg", invoer: { n_boven: 0, n_midden: 0, n_onder: 3, d_onder: 20, M_Ed: 70, M_fr: 40 } },
  {
    naam: "18 — wringing zonder dwarskracht bij een trekkracht die V_Rd,c opheft: (6.31) zonder 0/0",
    invoer: { N_Ed: -300, M_Ed: 8, V_Ed: 0, T_Ed: 2 },
    // Met de hand: σ_cp = −5 N/mm² → 0,6440 − 0,75 < 0 → V_Rd,c = 0. t_ef = 82, A_k = 25 724 mm²,
    // T_Rd,c = 5,702 kNm (zie 4) → (6.31): 2/5,702 + 0 = 0,3507 ≤ 1, alleen minimumwapening.
    handwerk: { V_Rd_c: "0", T_Rd_c: "5.702", UC_631: "0.3507", UC_V: "0.3507" },
  },
  {
    naam: "19 — druk zonder moment, zware wapening boven: e_0 naar beide kanten, de zwakke kant telt",
    invoer: { d_onder: 12, d_boven: 16, N_Ed: 1100, M_Ed: 0, V_Ed: 20, M_fr: 5 },
    // Met de hand: a_o = 300 − 25 − 8 − 6 = 261, a_b = 41, a_m = 151; M_e0 = 1100·0,020 = 22 kNm.
    // Gedrukt boven (2Ø16 gedrukt): x = 276,4 → F_c = 3200·276,4 = 884,4 kN; onder ε = 3,5·15,4/276,4
    // = 0,195 ‰ → 8,8 kN; midden 1,588 ‰ → 31,9 kN; boven vloeit → 174,8 kN; samen 1100 kN.
    // M_Rd = 884,4·(300 − 221,1)/2 − 8,8·111 − 31,9·1 + 174,8·109 = 52,93 kNm.
    // Gedrukt onder (2Ø12 gedrukt) is dezelfde doorsnede als het standaardgeval gespiegeld: x = 292,2 →
    // F_c = 935,1 kN; laag op 259 vanaf de gedrukte rand 0,398 ‰ → 32,0 kN; midden 1,715 ‰ → 34,5 kN;
    // 2Ø12 vloeit → 98,4 kN. M_Rd,t = 935,1·33,11 − 32,0·109 + 34,5·1 + 98,4·111 = 38,42 kNm.
    // UC_M = 22/min(52,93; 38,42) = 0,5726; met alleen de kant van M_fr was het 22/52,93 = 0,4156.
    handwerk: { M_e0: "22", x_u: "276.4", M_Rd: "52.93", M_Rd_t: "38.42", UC_M: "0.5726" },
  },
  {
    naam: "20 — zware wringing: de langswapening voor wringing laat niets over voor de buiging",
    invoer: { T_Ed: 40 },
    // Met de hand: cot θ = 1 (drukdiagonalen), ΣA_sl = 40·10⁶·672·1/(2·25 724·434,8) = 1202 mm²;
    // onder en boven elk 1202·227/672 = 406 mm² > 402,1 en 226,2, midden 390 mm² > 100,5 → niets over,
    // M_Ed = 35 kNm heeft geen weerstand: UC_M = ∞.
    handwerk: { A_sl_T: "1202" },
  },
  {
    naam: "21 — verschuivingsregel: niet de doorsnede met het grootste moment (M_Ed,max = 60), ΔF_td (6.18)",
    invoer: { M_Ed_max: 60 },
    // Met de hand: beugels rekenkundig nodig (V_Ed 50 > V_Rd,c 33,35), cot θ = 2,5 →
    // a_l = z·cot θ/2 = 233,1·1,25 = 291,4 mm; ΔF_td = 0,5·50·2,5 = 62,5 kN = 50·291,4/233,1.
    // M_Ed,v = min(35 + 50·0,2914; 60) = 49,57 kNm → UC_M = 49,57/46,27 = 1,071: voldoet niet.
    // (Als trekkracht: 35/0,2331 + 62,5 = 212,7 kN, meer dan A_s·f_yd = 174,8 kN.)
    // A_s,min2 = 1,25 × de nodige voor 49,57 kNm: μ = 0,1847 → y = 53,34 → 490,7 mm² → 613,4 mm².
    handwerk: { a_l: "291.4", M_Ed_v: "49.57", UC_M: "1.071", A_s_min2: "613.4", UC_max: "1.071" },
  },
  {
    naam: "22 — verschuivingsregel zonder rekenkundige beugels: a_l = d (6.2.2(5)), s_l,max = 300 mm (NB)",
    invoer: { M_Ed_max: 60, V_Ed: 30 },
    // Met de hand: V_Ed 30 ≤ V_Rd,c 33,35 → a_l = d = 259 mm; M_Ed,v = 35 + 30·0,259 = 42,77 kNm
    // → UC_M = 42,77/46,27 = 0,9243. Geen rekenkundige dwarskrachtwapening → s_l,max = 300 mm →
    // UC = 150/300 = 0,5; UC_V = 30/33,35 = 0,8995.
    handwerk: { a_l: "259", M_Ed_v: "42.77", UC_M: { waarde: "0.9243", tol: 0.00015, waarom: "M_Rd = 46,272" }, s_l_max: "300", UC_sl: "0.5", UC_V: "0.8995" },
  },
  {
    naam: "23 — eindoplegging: M_Ed = 0, de verschoven momentenlijn van M_Ed,max = 40 geeft trek onder",
    invoer: { M_Ed: 0, M_Ed_max: 40 },
    // Met de hand: trekzijde die van M_Ed,max (onder); M_Ed,v = min(0 + 50·0,2914; 40) = 14,57 kNm
    // → UC_M = 14,57/46,27 = 0,3149. Zelfde als F_Ed = |V_Ed|·a_l/z = 62,5 kN (9.3).
    // A_s,min2: μ = 14,57·10⁶/268,3·10⁶ = 0,05430 → y = 14,47 mm → 133,1 mm² → 166,4 mm²; A_s,min1 = 78,46.
    handwerk: { M_Ed_v: "14.57", UC_M: { waarde: "0.3149", tol: 0.00015, waarom: "M_Rd = 46,272" }, A_s_min2: "166.4", A_s_min: "78.46" },
  },
  {
    naam: "24 — verschuivingsregel begrensd door M_Ed,max: M_Ed/z + ΔF_td ≤ M_Ed,max/z (6.2.3(7))",
    invoer: { M_Ed_max: 40 },
    // Met de hand: 35 + 14,57 = 49,57 > 40 → M_Ed,v = 40 kNm → UC_M = 40/46,27 = 0,8645.
    handwerk: { M_Ed_v: "40", UC_M: { waarde: "0.8645", tol: 0.00015, waarom: "M_Rd = 46,272" } },
  },
  {
    naam: "25 — licht belast: A_s,min2 = 1,25 × nodig is kleiner dan het scheurmoment vraagt (NB)",
    invoer: { M_Ed: 5 },
    // Met de hand: μ = 5·10⁶/268,3·10⁶ = 0,01863 → y = 259·(1 − √0,96273) = 4,872 mm → A = 44,82 mm²
    // → A_s,min2 = 56,03 < A_s,min1 = 78,46 → A_s,min = 56,03 → UC = 56,03/402,1 = 0,1393.
    handwerk: { A_s_min1: "78.46", A_s_min2: "56.03", A_s_min: "56.03", UC_As_min: "0.1393" },
  },
  {
    naam: "26 — druk binnen de kern: de doorsnede scheurt niet, A_s,min = 0 (NB)",
    invoer: { N_Ed: 500, M_Ed: 5 },
    // Met de hand: e = 5/500 = 10 mm ≤ h/6 = 50 → A_s,min1 = 0. Om de trekwapening 5 + 500·0,109 =
    // 59,5 kNm → μ = 0,2217 → F_c = 4000·259·(1 − √0,5565) = 263,2 kN < 500 → geen trekwapening nodig,
    // A_s,min2 = 0. V_Rd,c = (0,6440 + 0,15·4)·200·259 = 64,4 kN > 50 → s_l,max = 300 mm.
    handwerk: { A_s_min2: "0", A_s_min: "0", UC_As_min: "0", s_l_max: "300" },
  },
  {
    naam: "27 — trek met buiging: het scheurmoment bij e = 200 mm (NB bij 9.2.1.1(1))",
    invoer: { N_Ed: -100, M_Ed: 20 },
    // Met de hand: e = 20/100 = 200 mm; W/(A_c·e) = 3·10⁶/(60 000·200) = 0,25 →
    // M_E,min = 8,689/1,25 = 6,952 kNm, N_E,min = −6,952/0,2 = −34,76 kN. Om de trekwapening:
    // 6,952 − 34,76·0,109 = 3,162 kNm → μ = 0,01179 → y = 3,071 mm → F_c = 12,28 kN →
    // A_s,min1 = (12,28 + 34,76)·10³/434,8 = 108,2 mm² → UC = 108,2/402,1 = 0,2691.
    handwerk: { M_E_min: "6.952", N_E_min: "-34.76", A_s_min1: "108.2", A_s_min: "108.2", UC_As_min: "0.2691" },
  },
  {
    naam: "28 — dunne plaatstrook met grote dekking: A_s,min volgens de NB ruim boven (9.1N), voldoet niet",
    invoer: { h_dsn: 200, c_dek: 40, d_beugel: 10, n_onder: 2, d_onder: 6, n_midden: 0, n_boven: 2, d_boven: 6, M_Ed: 3, V_Ed: 10, M_fr: 2 },
    // Met de hand: d = 200 − 40 − 10 − 3 = 147; A_s = 2Ø6 = 56,55 mm².
    // A_s,min1: W·f_ctm = 200·200²/6·2,896 = 3,862 kNm → μ = 3,862·10⁶/(4000·147²) = 0,04468 →
    // y = 6,722 mm → 61,84 mm². A_s,min2: μ = 3·10⁶/86,44·10⁶ = 0,03471 → y = 5,194 → 47,78 mm² → 59,73.
    // A_s,min = 59,73 → UC = 59,73/56,55 = 1,056: voldoet niet. (9.1N) gaf 0,001506·200·147 = 44,28 mm²
    // (UC 0,783, voldoet): dat lag hier aan de onveilige kant.
    handwerk: { M_E_min: "3.862", A_s_min1: "61.84", A_s_min2: "59.73", A_s_min: "59.73", UC_As_min: "1.056" },
  },
  {
    naam: "29 — hoge balk met rekenkundige beugels: s_l,max = 300 mm in plaats van 0,75·d (NB bij 9.2.2(6))",
    invoer: { h_dsn: 700, s_beugel: 250, V_Ed: 120, M_Ed: 100, M_fr: 60 },
    // Met de hand: d = 700 − 25 − 8 − 8 = 659; V_Rd,c = 51,3 kN < 120 → beugels rekenkundig nodig;
    // s_l,max = min(0,75·659 = 494,3; 300) = 300 → UC = 250/300 = 0,8333 (met (9.6N) alleen 0,5058).
    // V_Rd,max = 200·593,1·0,528·20/2,9 = 431,9 kN; 120 ≤ 216,0 → s_t,max = 500 mm → 142/500 = 0,284.
    handwerk: { V_Rd_max: "431.9", s_l_max: "300", UC_sl: "0.8333", s_t_max: "500", UC_st: "0.284" },
  },
  {
    naam: "30 — hoge balk, grote dwarskracht: s_t,max = 0,75·d ≤ 500 mm bij V_Ed > 0,5·V_Rd,max (NB bij 9.2.2(8))",
    invoer: { h_dsn: 700, V_Ed: 250, M_Ed: 100, M_fr: 60 },
    // Met de hand: 250 > 0,5·431,9 = 216,0 → s_t,max = min(494,3; 500) = 494,3 → UC = 142/494,3 = 0,2873.
    handwerk: { s_t_max: "494.3", UC_st: "0.2873", s_l_max: "300", UC_sl: "0.5" },
  },
  {
    naam: "31 — wringing met maar één staaf boven: geen langsstaaf in elke hoek (9.2.3(4))",
    invoer: { T_Ed: 2, n_boven: 1, s_beugel: 100 },
    // Met de hand: s_l,max = min(194,2; 300; 2·500/8 = 125; 200; 300) = 125 → UC = 100/125 = 0,8; de andere
    // toetsen voldoen, alleen 9.2.3(4) niet: boven ligt maar één staaf → UC_sl,T = ∞, voldoet niet.
    handwerk: { s_l_max: "125", UC_sl: "0.8" },
  },
  {
    naam: "32 — geen frequente belasting ingevuld: de scheurwijdte is niet getoetst, het oordeel volgt de UGT",
    invoer: { N_fr: 0, M_fr: 0 },
    handwerk: { UC_max: "0.7722" },
  },
  {
    naam: "33 — grote dwarskracht: cot θ tussen 1 en 2,5 uit de drukdiagonalen, ook in a_l",
    invoer: { V_Ed: 200, M_Ed_max: 100 },
    // Met de hand: q = 200 000/(200·233,1·0,528·20) = 0,4063 > 1/2,9 → cot θ + 1/cot θ = 1/q = 2,461 →
    // cot θ = (2,461 + √(2,461² − 4))/2 = 1,948. V_Rd,max = 492,3/(1,948 + 0,5133) = 200,0 kN (UC 1,0);
    // V_Rd,s = 100,5/150·233,1·434,8·1,948 = 132,3 kN → UC_V = 1,511. V_Ed > 0,5·V_Rd,max →
    // s_t,max = 0,75·259 = 194,2 mm → 142/194,2 = 0,731. a_l = 233,1·1,948/2 = 227,1 mm →
    // M_Ed,v = 35 + 200·0,2271 = 80,41 kNm (< 100) → UC_M = 80,41/46,27 = 1,738.
    handwerk: { cot_θ: "1.948", V_Rd_max: "200", V_Rd_s: "132.3", UC_V: "1.511", s_t_max: "194.2", UC_st: "0.731", a_l: "227.1", M_Ed_v: "80.41", UC_M: "1.738" },
  },
  {
    naam: "34 — druk zonder moment met een verschuiving naar onder: e_0 blijft ook de andere kant op tellen",
    invoer: { d_onder: 12, d_boven: 16, N_Ed: 1100, M_Ed: 0, V_Ed: 20, M_fr: 5, M_Ed_max: 40 },
    // Met de hand: de doorsnede van 19, trek onder via M_Ed,max. V_Rd,c = (0,5292 + 0,15·4)·200·261 =
    // 58,94 kN > 20 → a_l = d = 261 mm → M_Ed,v = 20·0,261 = 5,22 kNm, minder dan M_e0 = 22 kNm.
    // Naar onder: 22/52,93 = 0,4156; de andere kant op: 22/38,42 = 0,5726 → UC_M = 0,5726, zoals in 19.
    handwerk: { V_Rd_c: "58.94", a_l: "261", M_Ed_v: "5.22", M_Rd: "52.93", M_Rd_t: "38.42", UC_M: "0.5726" },
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, PROJECT);
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);
  const oordeel = slotzin(got.text);
  const ok = oordeel !== null && oordeel.voldoet === r.UCmax <= 1;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${oordeel ? (oordeel.voldoet ? "voldoet" : "voldoet niet") : "geen slotzin"}   narekening ${r.UCmax <= 1 ? "voldoet" : "voldoet niet"} (UC_max ${s4(r.UCmax)})`);
  if (!ok) fouten++;
  if (!Number.isFinite(r.UCmax)) {
    const oneindig = /Maatgevende UC = ∞/.test(got.text);
    console.log(`  ${oneindig ? "OK    " : "FOUT  "} UC_max    ∞ in de slotzin`);
    if (!oneindig) fouten++;
  }
  if (r.nietGetoetst) {
    // Zonder frequente belasting zegt het blad dat de scheurwijdte niet getoetst is, en rekent het geen w_k.
    const gemeld = /de scheurwijdte is niet getoetst/.test(got.text) && got.values.w_k === undefined && got.values.UC_w === undefined;
    console.log(`  ${gemeld ? "OK    " : "FOUT  "} BGT       "niet getoetst" gemeld, geen w_k`);
    if (!gemeld) fouten++;
  }
}

// ── Spiegeling: een negatief moment op de gespiegelde lagen geeft hetzelfde ──
{
  console.log("\nSpiegeling: onder en boven verwisseld en de momenten omgekeerd");
  const a = { ...STANDAARD, N_Ed: 80, T_Ed: 4, V_Ed: 70, M_Ed_max: 45 };
  const bSp = { ...a, n_onder: a.n_boven, d_onder: a.d_boven, n_boven: a.n_onder, d_boven: a.d_onder, M_Ed: -a.M_Ed, M_Ed_max: -a.M_Ed_max, M_fr: -a.M_fr };
  const ga = reken(tpl, Object.fromEntries(Object.entries(a).map(([k, x]) => [k, String(x)])), PROJECT).values;
  const gb = reken(tpl, Object.fromEntries(Object.entries(bSp).map(([k, x]) => [k, String(x)])), PROJECT).values;
  for (const naam of ["x_u", "M_Rd", "a_l", "M_Ed_v", "UC_M", "A_s_min", "UC_As_min", "V_Rd_c", "UC_V", "UC_Vmax", "s_l_max", "x_fr", "σ_s", "w_k", "UC_max"]) {
    const ok = ga[naam] !== undefined && ga[naam] === gb[naam];
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(10)} ${ga[naam]}   gespiegeld ${gb[naam]}`);
  }
}

// ── Een doorsnede zonder (passende) wapening: geen toetsing, wel een oordeel ──
for (const [naam, invoer] of [
  ["alle invoer 1, zoals de rendercontrole", Object.fromEntries(Object.keys(STANDAARD).map((k) => [k, 1]))],
  ["geen staven", { ...STANDAARD, n_onder: 0, n_midden: 0, n_boven: 0 }],
]) {
  console.log(`\nOngeldige doorsnede (${naam})`);
  const got = reken(tpl, Object.fromEntries(Object.entries(invoer).map(([k, x]) => [k, String(x)])), PROJECT);
  const oordeel = slotzin(got.text);
  const ok = /er valt niets te toetsen/.test(got.text) && oordeel?.voldoet === false && got.values.UC_max === undefined && !/NaN/.test(got.text);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} melding, "voldoet niet", geen UC_max en geen NaN`);
}

// ── M-κ-lijn (mk_lijn = 1): vezelmodel en handberekening ─────────────────────
/*
 * Handberekening, standaardgeval zonder normaalkracht (trek onder, gedrukt boven);
 * lagen vanaf de gedrukte rand: 2Ø16 op 259 (402,1 mm²), 2Ø8 op 149 (100,5), 2Ø12 op 39 (226,2).
 *
 * Ongescheurd, ideële doorsnede met α_e = 200 000/32 837 = 6,091 (verdrongen beton verwaarloosd):
 *   A_i = 60 000 + 6,091·728,8 = 64 439 mm²;
 *   y_i = (200·300²/2 + 6,091·(402,1·259 + 100,5·149 + 226,2·39))/64 439 = 151,8 mm;
 *   I_i = 200·300³/12 + 60 000·1,76² + 6,091·(402,1·107,2² + 100,5·2,76² + 226,2·112,8²) = 4,959·10⁸ mm⁴
 *   → EI = 32 837·4,959·10⁸ = 16 280 kNm².
 *   Scheuren: κ_r = (2,896/32 837)/(300 − 151,8) = 5,950·10⁻⁷ /mm = 5,950·10⁻⁴ /m;
 *   M_r = EI·κ_r = 9,689 kNm.
 * Vloeien van de onderste laag (ε_yd = 434,8/200 000 = 2,174 ‰), parabool (3.17) met ε_c2 = 2 ‰:
 *   drukzone x = 88,42 mm → κ_y = 2,174·10⁻³/(259 − 88,42) = 1,2745·10⁻⁵ /mm = 0,01274 /m;
 *   ε_c = κ·x = 1,127 ‰, η = 0,5635 → F_c = 20·200·88,42·(η − η²/3) = 161,9 kN,
 *   aangrijpend op x·(1 − (2η/3 − η²/4)/(η − η²/3)) = 31,18 mm van de rand;
 *   boven σ = 200 000·κ·(88,42 − 39) = 126,0 N/mm², midden −154,4 N/mm²;
 *   evenwicht 161,9 + 28,5 − 15,5 − 174,8 = 0 kN.
 *   M_y = 161,9·118,82 + 28,50·111 − 15,52·1 + 174,8·109 = 41,44 kNm.
 * Uiterste toestand, ε_cu2 = 3,5 ‰ (spil B): de parabool-rechthoek geeft F_c = (17/21)·f_cd·b·x
 *   op (99/238)·x van de rand. Onder en midden vloeien, boven elastisch:
 *   3238·x + 226,2·700·(x − 39)/x = 434,8·502,7 → 3238·x² − 60 210·x − 6 175 000 = 0 → x = 53,95 mm;
 *   κ_u = 3,5·10⁻³/53,95 = 0,06488 /m; σ_boven = 700·14,95/53,95 = 193,9 N/mm²;
 *   M_u = 174,7·(150 − 22,44) + 43,87·111 + 174,8·109 − 43,71·1 = 46,16 kNm
 *   (het spanningsblok van §5 gaf 46,27 kNm).
 */
{
  console.log("\nM-κ-lijn: vezelmodel, handberekening en een blad dat verder niet verandert");
  /** Vezelmodel: parabool-rechthoek over 4000 vezels, staal bilineair; halveren op de kromming. */
  const mkVezel = (v) => {
    const b = v.b_dsn, h = v.h_dsn, c = v.c_dek, fck = v.betonklasse;
    const fcd = fck / 1.5, fyd = 500 / 1.15, ES = 200000;
    const fctm = 0.3 * fck ** (2 / 3), Ecm = 22000 * ((fck + 8) / 10) ** 0.3;
    const opp = (n, dia) => (n * Math.PI * dia * dia) / 4;
    const ao = h - c - v.d_beugel - v.d_onder / 2, ab = c + v.d_beugel + v.d_boven / 2, am = (ao + ab) / 2;
    const tk = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
    const sU = tk(v.M_Ed) || tk(v.M_Ed_max) || (v.M_fr < 0 ? -1 : 1);
    // De getrokken laag eerst, diepten vanaf de gedrukte rand.
    const lagen = sU > 0
      ? [{ A: opp(v.n_onder, v.d_onder), p: ao }, { A: opp(v.n_midden, v.d_midden), p: am }, { A: opp(v.n_boven, v.d_boven), p: ab }]
      : [{ A: opp(v.n_boven, v.d_boven), p: h - ab }, { A: opp(v.n_midden, v.d_midden), p: h - am }, { A: opp(v.n_onder, v.d_onder), p: h - ao }];
    const nf = 4000, dy = h / nf, ec2 = 0.002, ecu2 = 0.0035, eyd = fyd / ES;
    const sc = (e) => (e <= 0 ? 0 : e < ec2 ? fcd * (1 - (1 - e / ec2) ** 2) : fcd);
    const ss = (e) => Math.max(-fyd, Math.min(fyd, ES * e));
    const NM = (et, k) => {
      let N = 0, M = 0;
      for (let j = 0; j < nf; j++) { const y = (j + 0.5) * dy, F = sc(et - k * y) * b * dy; N += F; M += F * (h / 2 - y); }
      for (const L of lagen) { const F = L.A * ss(et - k * L.p); N += F; M += F * (h / 2 - L.p); }
      return { N, M };
    };
    const halveer = (f, lo, hi) => {
      const flo = f(lo);
      for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if ((f(m) < 0) === (flo < 0)) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    // Ongescheurd met vezels: beton E_cm op trek en druk, staal E_s.
    let EA = 0, ESy = 0, EIo = 0;
    for (let j = 0; j < nf; j++) { const y = (j + 0.5) * dy, E = Ecm * b * dy; EA += E; ESy += E * y; EIo += E * y * y; }
    for (const L of lagen) { EA += ES * L.A; ESy += ES * L.A * L.p; EIo += ES * L.A * L.p * L.p; }
    const yi = ESy / EA, EI = EIo - EA * yi * yi;
    const Atot = lagen.reduce((s, L) => s + L.A, 0);
    const py = lagen.find((L) => L.A > 0).p;
    const punten = (N) => {
      const r = {};
      let ku = halveer((k) => NM(ecu2, k).N - N, 1e-9, 1), eu = ecu2;
      if (ecu2 - ku * h > 0) { ku = halveer((k) => NM(ec2 + (3 * k * h) / 7, k).N - N, 1e-9, (7 * ec2) / (4 * h)); eu = ec2 + (3 * ku * h) / 7; }
      r.ku = ku; r.Mu = NM(eu, ku).M;
      r.vl = eu - ku * py <= -eyd;
      if (r.vl) { r.ky = halveer((k) => NM(k * py - eyd, k).N - N, 1e-12, ku); r.My = NM(r.ky * py - eyd, r.ky).M; }
      const ei = N / EA;
      r.rok = ei + fctm / Ecm > 0;
      r.kr = Math.max((ei + fctm / Ecm) / (h - yi), 0);
      r.M0 = N * (h / 2 - yi);
      r.Mr = r.M0 + EI * r.kr;
      return r;
    };
    return { EI, yi, Nmax: fcd * b * h + Atot * Math.min(ES * ec2, fyd), Nmin: -Atot * fyd, punten };
  };
  const MK_SETS = [
    {
      naam: "standaard, met N_Ed = 400 kN",
      invoer: { N_Ed: 400 },
      handwerk: {
        EI_I: "16280", y_i: "151.8", κ_r_0: "0.000595", M_r_0: "9.689", κ_y_0: "0.01274", M_y_0: "41.44",
        κ_u_0: "0.06488", M_u_0: "46.16",
      },
    },
    { naam: "trek N_Ed = −100 kN: scheurt eerder, grotere κ_u", invoer: { N_Ed: -100 } },
    { naam: "grote druk N_Ed = 1200 kN: spil C, de wapening vloeit niet", invoer: { N_Ed: 1200 } },
    { naam: "negatief moment: gedrukt aan de onderzijde", invoer: { M_Ed: -30, M_fr: -15 } },
    { naam: "alleen onderwapening", invoer: { n_boven: 0, n_midden: 0, n_onder: 3, d_onder: 20, M_Ed: 70, M_fr: 40 } },
    {
      naam: "hoge balk C45/55 met druk en wringing",
      invoer: { b_dsn: 350, h_dsn: 700, betonklasse: 45, n_onder: 4, d_onder: 25, n_midden: 2, d_midden: 12, n_boven: 3, d_boven: 16, d_beugel: 10, s_beugel: 200, N_Ed: 600, M_Ed: 380, V_Ed: 220, T_Ed: 1.5, N_fr: 400, M_fr: 220, "φ_kr": 1.6 },
    },
  ];
  const ruimMk = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.0015, 1e-9) });
  for (const set of MK_SETS) {
    const v = { ...STANDAARD, ...set.invoer, mk_lijn: 1 };
    const naar = (o) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, String(x)]));
    const got = reken(tpl, naar(v), PROJECT);
    const zonder = reken(tpl, naar({ ...v, mk_lijn: 0 }), PROJECT);
    const m = mkVezel(v);
    const p0 = m.punten(0);
    const uit = {
      EI_I: ruimMk(m.EI / 1e9), y_i: ruimMk(m.yi), M_r_0: ruimMk(p0.Mr / 1e6), κ_r_0: ruimMk(p0.kr * 1000),
      M_u_0: ruimMk(p0.Mu / 1e6), κ_u_0: ruimMk(p0.ku * 1000),
    };
    if (p0.vl) Object.assign(uit, { M_y_0: ruimMk(p0.My / 1e6), κ_y_0: ruimMk(p0.ky * 1000) });
    const metN = v.N_Ed !== 0 && v.N_Ed * 1e3 > 0.999 * m.Nmin && v.N_Ed * 1e3 < 0.999 * m.Nmax;
    let pN = null;
    if (metN) {
      pN = m.punten(v.N_Ed * 1e3);
      Object.assign(uit, { M_0_N: { waarde: s4(pN.M0 / 1e6), tol: Math.max(Math.abs(pN.M0 / 1e6) * 0.0015, 1e-3) }, M_u_N: ruimMk(pN.Mu / 1e6), κ_u_N: ruimMk(pN.ku * 1000) });
      if (pN.rok) Object.assign(uit, { M_r_N: ruimMk(pN.Mr / 1e6), κ_r_N: ruimMk(pN.kr * 1000) });
      if (pN.vl) Object.assign(uit, { M_y_N: ruimMk(pN.My / 1e6), κ_y_N: ruimMk(pN.ky * 1000) });
    }
    fouten += toets(`M-κ ${set.naam} — vezelmodel`, got, uit);
    if (set.handwerk) fouten += toets(`M-κ ${set.naam} — handberekening`, got, set.handwerk);
    // Zonder vloeien vóór de uiterste toestand toont het blad geen vloeipunt.
    const vloeiOk = (p0.vl === (got.values.M_y_0 !== undefined)) && (!metN || pN.vl === (got.values.M_y_N !== undefined));
    // De lijn is informatief: alle andere uitkomsten en het oordeel blijven gelijk.
    const anders = Object.keys(zonder.values).filter((k) => zonder.values[k] !== got.values[k]);
    const oordeel = slotzin(got.text)?.zin === slotzin(zonder.text)?.zin;
    // Geen NaN of foutmelding, en in de tekening alleen getallen.
    const svg = kern.process(tpl, naar(v), undefined, PROJECT);
    const tekeningen = svg.match(/<svg[\s\S]*?<\/svg>/g) || [];
    const attrs = tekeningen.flatMap((t) => [...t.matchAll(/\s(x|y|x1|y1|x2|y2|cx|cy|r|width|height)="([^"]*)"/g)].map((a) => a[2]));
    const schoon = !/NaN|Error|Undefined|niet gedefinieerd/.test(got.text) && tekeningen.length > 0 &&
      attrs.every((a) => /^\s*-?[\d.]+(e[-+]?\d+)?(em|ex|px|pt|mm|%)?\s*$/i.test(a));
    for (const [ok, wat] of [[vloeiOk, "vloeipunt alleen als de wapening vóór de uiterste toestand vloeit"],
      [anders.length === 0, `overige uitkomsten gelijk${anders.length ? `, anders: ${anders.slice(0, 5).join(", ")}` : ""}`],
      [oordeel, "oordeel gelijk"], [schoon, `geen NaN of fout, tekening met ${attrs.length} getallen`]]) {
      console.log(`  ${ok ? "OK    " : "FOUT  "} ${wat}`);
      if (!ok) fouten++;
    }
  }
}

// ── De beginwaarden van het beeld zijn de standaardinvoer van dit script ─────
{
  console.log("\nBeginwaarden van het beeld tegen de standaardinvoer");
  const tsx = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/components/calc/BetondoorsnedeDesigner.tsx"), "utf8");
  const blok = tsx.match(/const DEFAULTS[^{]*\{([^}]+)\}/)[1];
  const beeld = Object.fromEntries([...blok.matchAll(/"?([\p{L}_][\p{L}\p{N}_]*)"?: (-?[\d.]+)/gu)].map((m) => [m[1], Number(m[2])]));
  const verschil = [...new Set([...Object.keys(beeld), ...Object.keys(STANDAARD)])].filter((k) => beeld[k] !== STANDAARD[k]);
  const ok = verschil.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${Object.keys(beeld).length} beginwaarden${ok ? " gelijk" : `, verschil in ${verschil.join(", ")}`}`);
  // Elk invoerveld en elke keuze van het blad heeft een beginwaarde in het beeld.
  // Een naam met een komma in het blad (M_Ed,max) staat in het beeld met een liggend streepje.
  const velden = [...tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)].map((m) => m[1].replace(/,/g, "_"));
  const keuzes = [...tpl.matchAll(/@select\s+(\S+)/g)].map((m) => m[1]);
  const mist = [...velden, ...keuzes].filter((k) => !(k in beeld));
  const ok2 = mist.length === 0;
  if (!ok2) fouten++;
  console.log(`  ${ok2 ? "OK    " : "FOUT  "} ${velden.length} invoervelden en ${keuzes.length} keuzes${ok2 ? " hebben een beginwaarde" : `, zonder beginwaarde: ${mist.join(", ")}`}`);
}

afronden(fouten, "Betondoorsnede");
