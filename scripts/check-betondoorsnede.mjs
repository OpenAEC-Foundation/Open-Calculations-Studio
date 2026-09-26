/**
 * Controlescript voor de module Betondoorsnede (NEN-EN 1992-1-1 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript. Die volgt dezelfde
 *      normregels, maar rekent anders: de drukzonehoogte van de UGT met een
 *      rooster en halvering direct op x (het blad halveert op t = x/(h + x)),
 *      en de gescheurde doorsnede van de BGT met een vezelmodel (3000 vezels,
 *      beide kanten gedrukt geprobeerd), zonder de gesloten vormen S0 en S1 en
 *      zonder de regel waarmee het blad bij trek de trekzijde kiest. Het blad
 *      moet daar op vier significante cijfers mee overeenkomen.
 *   2. Voor het standaardgeval en zes andere gevallen de getallen van een
 *      handberekening, hieronder en bij de sets uitgeschreven: V_Ed precies op
 *      V_Rd,c en net erboven, wringing met een negatief moment, grote druk met
 *      de minimale excentriciteit, centrische trek in de BGT en wringing
 *      zonder dwarskracht bij V_Rd,c = 0.
 *
 * Verder: het oordeel in de slotzin, de lege-doorsnedetak (ook zonder staven),
 * de spiegeling van het moment en de beginwaarden van het beeld.
 *
 * Draaien:  node scripts/check-betondoorsnede.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

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
  N_Ed: 0, M_Ed: 35, V_Ed: 50, T_Ed: 0,
  N_qp: 0, M_qp: 20, "φ_kr": 2, milieuklasse: 2, belastingduur: 1,
};
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 0 };

/*
 * ── Handberekening, standaardgeval ──────────────────────────────────────────
 * 200×300, C30/37, B500B, c = 25; onder 2Ø16, tussenlaag 2Ø8, boven 2Ø12;
 * beugels Ø8-150 tweesnedig. N_Ed = 0, M_Ed = 35 kNm, V_Ed = 50 kN, T_Ed = 0;
 * BGT M_qp = 20 kNm, φ = 2, XC2–XC4, langdurend.
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
 * Buiging (N = 0): onder en tussenlaag vloeien, de bovenlaag is elastisch:
 *   20·200·0,8·x + 226,2·200 000·0,0035·(x − 39)/x = 434,8·(402,1 + 100,5)
 *   → 3200·x² − 60 210·x − 6 175 000 = 0 → x_u = 54,33 mm; y_c = 43,47 mm.
 *   ε_s1 = 3,5·(259 − 54,33)/54,33 = 13,18 ‰ > 2,17 ‰; ε_sm = −6,10 ‰ (vloeit);
 *   ε_s2 = 3,5·(54,33 − 39)/54,33 = 0,988 ‰ → σ_s2 = 197,5 N/mm².
 *   F_c = 20·200·43,47 = 173,9; F_s1 = −174,8; F_sm = −43,71; F_s2 = 44,68 kN (Σ = 0).
 *   M_Rd = 173,9·(300 − 43,47)/2 + 174,8·109 − 43,71·1 + 44,68·111 = 46,27 kNm
 *   → UC_M = 35/46,27 = 0,7564.
 *
 * Wapeningsregels: A_s,min = max(0,26·2,896/500; 0,0013)·200·259 = 78,02 mm² →
 *   UC = 0,1940; A_s,tot/(0,04·200·300) = 0,3037; ρ_w = 100,5/(150·200) = 0,003351,
 *   ρ_w,min = 0,08·√30/500 = 0,000876 → 0,2615; s_l,max = 0,75·259 = 194,2 →
 *   150/194,2 = 0,7722; s_t = 200 − 50 − 8 = 142 → 142/194,2 = 0,7310.
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
 *   s_r,max = 3,4·33 + 0,8·0,5·0,425·16/0,03019 = 202,3 mm.
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
  x_u: "54.33", y_c: "43.47", ε_s1: "13.18", F_c: "173.9", F_s1: "-174.8", F_sm: "-43.71", F_s2: "44.68",
  M_Rd: "46.27", UC_M: "0.7564",
  A_s_min: "78.02", UC_As_min: "0.194", UC_As_max: "0.3037", ρ_w: "0.003351", UC_ρw: "0.2615",
  s_l_max: "194.2", UC_sl: "0.7722", s_t: "142", UC_st: "0.731",
  E_cm: "32840", α_e: "6.091", α_L: "18.27", x_qp: "100.2", σ_s: "213.2", h_c_ef: "66.6", ρ_p_eff: "0.03019",
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
  const fcd = fck / 1.5, fyd = 500 / 1.15, fyk = 500;
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
  const sU = v.M_Ed < 0 ? -1 : v.M_Ed > 0 ? 1 : v.M_qp < 0 ? -1 : 1;
  const trek = sU > 0 ? L.o : L.b;
  const d = sU > 0 ? L.o.a : h - L.b.a;
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
  const cot = f629(2.5) <= 0 ? 2.5 : f629(1) > 0 ? 1 : wortel((ct) => -f629(ct), 1, 2.5);
  const VRds = (Asw / v.s_beugel) * z * fyd * cot;
  const VRdmax = (b * z * nu * fcd) / (cot + 1 / cot);
  Object.assign(r, { k, rhol, scp, vmin, VRdc, z, nu, Asw, cot, VRds, VRdmax, tef, Ak, uk });
  let AslT = 0;
  if (TEd > 0) {
    const TRdc = 2 * Ak * tef * ((0.7 * fctm) / 1.5);
    const TRdmax = (2 * nu * fcd * Ak * tef) / (cot + 1 / cot);
    r.UCVmax = TEd / TRdmax + VEd / VRdmax;
    r.UC631 = TEd / TRdc + (VEd > 0 ? VEd / VRdc : 0);
    if (r.UC631 <= 1) r.UCV = r.UC631;
    else {
      r.UCV = (VEd / (z * fyd * cot * v.n_sneden) + TEd / (2 * Ak * fyd * cot)) / (opp(1, v.d_beugel) / v.s_beugel);
      AslT = (TEd * uk * cot) / (2 * Ak * fyd);
    }
    Object.assign(r, { TRdc, TRdmax });
  } else {
    r.UCVmax = VEd / VRdmax;
    r.UCV = VEd <= VRdc && VRdc > 0 ? VEd / VRdc : VEd / VRds;
  }
  r.AslT = AslT;
  const bk = b - tef, hk = h - tef;
  const AT = { o: (AslT * (bk + (v.n_midden > 0 ? hk / 2 : hk))) / uk, m: (AslT * (v.n_midden > 0 ? hk : 0)) / uk };
  AT.b = AT.o;
  r.UCTl = Math.max(...["o", "m", "b"].map((i) => (AT[i] > 0 ? AT[i] / L[i].A : 0)));

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
  r.Mrek = Math.max(Math.abs(MEd), r.Me0);
  if (r.UCN >= 1) r.UCM = r.UCN;
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
    r.UCM = MRd <= 0 ? Infinity : Mmin > m ? Mmin / m : m / MRd;
  }

  // Wapeningsregels (§9.2)
  r.Asmin = Math.max((0.26 * fctm) / fyk, 0.0013) * b * d;
  r.UCAsmin = r.Asmin / trek.A;
  r.UCAsmax = Atot / (0.04 * b * h);
  r.rhow = Asw / (v.s_beugel * b);
  r.rhowmin = (0.08 * Math.sqrt(fck)) / 500;
  r.UCrhow = r.rhowmin / r.rhow;
  r.slmax = TEd > 0 ? Math.min(0.75 * d, (2 * (b + h)) / 8, b, h) : 0.75 * d;
  r.UCsl = v.s_beugel / r.slmax;
  r.st = (b - 2 * c - v.d_beugel) / (v.n_sneden - 1);
  r.stmax = Math.min(0.75 * d, 600);
  r.UCst = r.st / r.stmax;

  // Scheurwijdte (§7.3.4): vezelmodel van de gescheurde doorsnede
  const phit = v.belastingduur === 1 ? v["φ_kr"] : 0;
  const ae = ES / Ecm, aL = ae * (1 + phit), Eeff = Ecm / (1 + phit);
  const Nq = v.N_qp * 1e3, Mq = v.M_qp * 1e6;
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
  if (Nq !== 0 || Mq !== 0) {
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
  }
  r.aL = aL; r.ae = ae;
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
  const srmax = sO <= 5 * (cl + tz.dia / 2) ? 3.4 * cl + (0.8 * k2 * 0.425 * tz.dia) / rp : 1.3 * (h - Math.max(xq, 0));
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
    A_s_min: ruim(r.Asmin), UC_As_min: ruim(r.UCAsmin), UC_As_max: ruim(r.UCAsmax),
    ρ_w: ruim(r.rhow), ρ_w_min: ruim(r.rhowmin), UC_ρw: ruim(r.UCrhow), s_l_max: ruim(r.slmax), UC_sl: ruim(r.UCsl),
    s_t: ruim(r.st), s_t_max: ruim(r.stmax), UC_st: ruim(r.UCst), α_e: ruim(r.ae), α_L: ruim(r.aL),
  };
  if (v.T_Ed !== 0) {
    Object.assign(uit, { t_ef: ruim(r.tef), A_k: ruim(r.Ak), u_k: ruim(r.uk), T_Rd_c: ruim(r.TRdc / 1e6), T_Rd_max: ruim(r.TRdmax / 1e6), UC_631: ruim(r.UC631) });
    if (r.AslT > 0) Object.assign(uit, { A_sl_T: ruim(r.AslT), UC_Tl: ruim(r.UCTl) });
  }
  if (v.N_Ed > 0) Object.assign(uit, { N_Rd_max: ruim(r.NRdmax / 1e3), UC_N: ruim(r.UCN), e_0: ruim(r.e0), M_e0: ruim(r.Me0 / 1e6) });
  if (v.N_Ed < 0) Object.assign(uit, { N_Rd_min: ruim(r.NRdmin / 1e3), UC_N: ruim(r.UCN) });
  if (r.UCN < 1) {
    Object.assign(uit, {
      x_u: ruim(r.xu), y_c: ruim(r.yc), ε_s1: ruim(r.es1), F_c: ruim(r.Fc / 1e3), M_Rd: ruim(r.MRd / 1e6),
    });
    // Een kracht die door afronding bij nul ligt, heeft geen vier significante cijfers.
    for (const [naam, F] of [["F_s1", r.Fs1], ["F_sm", r.Fsm], ["F_s2", r.Fs2]]) {
      uit[naam] = { waarde: s4(F / 1e3), tol: Math.max(Math.abs(F / 1e3) * 0.001, 1e-3) };
    }
    if (r.Mmin > r.Mrek) uit.M_Rd_min = ruim(r.Mmin / 1e6);
  }
  if (r.UCN < 1 && Number.isFinite(r.UCM)) uit.UC_M = ruim(r.UCM);
  if (r.sigs > 0) {
    Object.assign(uit, {
      σ_s: ruim(r.sigs), h_c_ef: ruim(r.hcef), ρ_p_eff: ruim(r.rp), s_r_max: ruim(r.srmax),
      Δε_sm: ruim(r.de), w_k: ruim(r.wk), w_max: ruim(r.wmax), UC_w: ruim(r.UCw),
    });
    if (r.xq > 0) uit.x_qp = ruim(r.xq);
    else uit.k_2 = ruim(r.k2);
  }
  const UCs = [r.UCN, r.UCM, r.UCV, r.UCVmax, r.UCTl, r.UCAsmin, r.UCAsmax, r.UCrhow, r.UCsl, r.UCst, r.UCw];
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
  { naam: "1 — standaard: 200×300 C30/37, 2Ø16/2Ø8/2Ø12, Ø8-150, M_Ed 35, V_Ed 50, M_qp 20", invoer: {}, handwerk: HAND_STANDAARD },
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
    handwerk: {
      t_ef: "82", A_k: "25720", u_k: "672", cot_θ: "2.5", T_Rd_max: "15.36", V_Rd_max: "171.1", UC_Vmax: "0.8715",
      T_Rd_c: "5.702", V_Rd_c: "47.2", UC_631: "2.674", UC_V: "0.7775", A_sl_T: "600.8", UC_Tl: "1.939",
    },
  },
  {
    naam: "5 — grensgeval trek: N_Ed = −300 kN vraagt een moment van ten minste M_Rd,min",
    invoer: { N_Ed: -300, M_Ed: 5 },
  },
  { naam: "6 — trek zonder moment: de doorsnede bezwijkt (M_Rd,min > 0)", invoer: { N_Ed: -300, M_Ed: 0 } },
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
    invoer: { N_qp: -150, M_qp: 0 },
    // Met de hand, alleen staal (geheel getrokken). Trekspanning t = p + q·u, u = a − 150 mm:
    // boven / midden / onder u = −111 / −1 / +109. ΣA = 728,8; ΣA·u = 18 623; ΣA·u² = 7 564 680.
    // Momentevenwicht ΣA·t·u = 0 → p = −q·ΣAu²/ΣAu = −406,2·q; krachtevenwicht ΣA·t = 150 000 →
    // q = 150 000/(18 623 − 728,8·406,2) = −0,5407 N/mm³ en p = 219,6 N/mm².
    // Boven t = 219,6 + 0,5407·111 = 279,6 N/mm², onder 160,7: de bovenzijde is de trekzijde,
    // hoewel het zwaartepunt van de wapening onder het midden ligt.
    // Nullijn op u = 406,2 → vanaf de minst getrokken (onder)rand x = −256,2 mm;
    // k_2 = (300 + 2·256,2)/(2·(300 + 256,2)) = 0,7303 (7.13). h_c,ef = min(2,5·39; 150) = 97,5 mm;
    // ρ_p,eff = 226,2/(200·97,5) = 0,01160. Staafafstand 122 ≤ 5·(33 + 6) → (7.11):
    // s_r,max = 3,4·33 + 0,8·0,7303·0,425·12/0,0116 = 369,1 mm.
    // ε_sm − ε_cm = (279,6 − 0,4·2,896/0,0116·(1 + 6,091·0,0116))/200 000 = 8,634·10⁻⁴
    // → w_k = 0,3187 mm → UC_w = 1,062: voldoet niet.
    handwerk: { σ_s: "279.6", k_2: "0.7303", h_c_ef: "97.5", ρ_p_eff: "0.0116", s_r_max: "369.1", w_k: "0.3187", UC_w: "1.062" },
  },
  { naam: "10 — BGT: trek met een klein moment, geheel getrokken aan de onderzijde", invoer: { N_qp: -150, M_qp: 5 } },
  { naam: "11 — BGT: grote druk, geen trek in de wapening, geen scheuren", invoer: { N_qp: 800, M_qp: 10 } },
  { naam: "12 — BGT: druk en buiging, gedeeltelijk gescheurd", invoer: { N_qp: 150, M_qp: 30 } },
  {
    naam: "13 — brede balk zonder tussenlaag, kortdurend: staven verder dan 5(c + Ø/2), (7.14)",
    invoer: { b_dsn: 600, n_onder: 3, n_midden: 0, belastingduur: 2, M_Ed: 60, n_sneden: 4 },
  },
  { naam: "14 — negatief moment ook in de BGT, XD/XS", invoer: { M_Ed: -25, M_qp: -15, milieuklasse: 3, V_Ed: -40 } },
  {
    naam: "15 — hoge balk C45/55, Ø25, druk en een kleine wringing binnen (6.31): alleen minimumwapening",
    invoer: { b_dsn: 350, h_dsn: 700, betonklasse: 45, n_onder: 4, d_onder: 25, n_midden: 2, d_midden: 12, n_boven: 3, d_boven: 16, d_beugel: 10, s_beugel: 200, n_sneden: 2, N_Ed: 600, M_Ed: 380, V_Ed: 220, T_Ed: 1.5, N_qp: 400, M_qp: 220, "φ_kr": 1.6 },
  },
  {
    naam: "16 — zware wringing met een kleine cot θ: drukdiagonalen maatgevend",
    invoer: { T_Ed: 25, V_Ed: 120, s_beugel: 100, d_beugel: 10 },
  },
  { naam: "17 — alleen onderwapening, groot moment: bovenlaag leeg", invoer: { n_boven: 0, n_midden: 0, n_onder: 3, d_onder: 20, M_Ed: 70, M_qp: 40 } },
  {
    naam: "18 — wringing zonder dwarskracht bij een trekkracht die V_Rd,c opheft: (6.31) zonder 0/0",
    invoer: { N_Ed: -300, M_Ed: 8, V_Ed: 0, T_Ed: 2 },
    // Met de hand: σ_cp = −5 N/mm² → 0,6440 − 0,75 < 0 → V_Rd,c = 0. t_ef = 82, A_k = 25 724 mm²,
    // T_Rd,c = 5,702 kNm (zie 4) → (6.31): 2/5,702 + 0 = 0,3507 ≤ 1, alleen minimumwapening.
    handwerk: { V_Rd_c: "0", T_Rd_c: "5.702", UC_631: "0.3507", UC_V: "0.3507" },
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
}

// ── Spiegeling: een negatief moment op de gespiegelde lagen geeft hetzelfde ──
{
  console.log("\nSpiegeling: onder en boven verwisseld en de momenten omgekeerd");
  const a = { ...STANDAARD, N_Ed: 80, T_Ed: 4, V_Ed: 70 };
  const bSp = { ...a, n_onder: a.n_boven, d_onder: a.d_boven, n_boven: a.n_onder, d_boven: a.d_onder, M_Ed: -a.M_Ed, M_qp: -a.M_qp };
  const ga = reken(tpl, Object.fromEntries(Object.entries(a).map(([k, x]) => [k, String(x)])), PROJECT).values;
  const gb = reken(tpl, Object.fromEntries(Object.entries(bSp).map(([k, x]) => [k, String(x)])), PROJECT).values;
  for (const naam of ["x_u", "M_Rd", "UC_M", "V_Rd_c", "UC_V", "UC_Vmax", "x_qp", "σ_s", "w_k", "UC_max"]) {
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
  const velden = [...tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)].map((m) => m[1]);
  const keuzes = [...tpl.matchAll(/@select\s+(\S+)/g)].map((m) => m[1]);
  const mist = [...velden, ...keuzes].filter((k) => !(k in beeld));
  const ok2 = mist.length === 0;
  if (!ok2) fouten++;
  console.log(`  ${ok2 ? "OK    " : "FOUT  "} ${velden.length} invoervelden en ${keuzes.length} keuzes${ok2 ? " hebben een beginwaarde" : `, zonder beginwaarde: ${mist.join(", ")}`}`);
}

afronden(fouten, "Betondoorsnede");
