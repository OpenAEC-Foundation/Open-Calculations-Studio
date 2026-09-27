import type { ReactNode } from "react";
import { useDesigner, Ro, Defs, IProfiel, fmt, clamp, UitkomstKop } from "./designerKit";
import { profiel, profielOpties, omtrek } from "./profielen";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van de brandwerendheid: staal, hout of beton, zoals de
 * keuze "materiaal" in het blad (templates/brandwerendheid.ts).
 *
 * Staal, drie beelden:
 *   • Doorsnede met de bekleding — kokervormig of profielvolgend, drie- of
 *     vierzijdig verhit. De verhitte omtrek is dik rood getekend; dat is
 *     precies wat de profielfactor A_m/V of A_p/V bepaalt.
 *   • Temperatuur in de tijd — de ISO 834-kromme en de staaltemperatuur, met
 *     de eis als verticale lijn en de kritieke temperatuur als horizontale.
 *     Waar de staal die lijn kruist, ligt de brandwerendheid van het profiel.
 *   • Kritieke temperatuur — de benuttingsgraad tegen de temperatuur: zonder
 *     instabiliteit de kromme (4.22), bij kip of knik χ_fi·k_y,θ. Waar de
 *     benutting de kromme snijdt, ligt θ_a,cr.
 *   De staaltemperatuur rekent het beeld zelf, op dezelfde manier als het blad
 *   (EN 1993-1-2 §4.2.5, stap 5 s onbekleed en 30 s bekleed), om hem als
 *   kromme te kunnen tekenen; de stip op de eis is de staaltemperatuur van het
 *   blad, zodat een verschil meteen zichtbaar is.
 *
 * Hout: de doorsnede met de koollaag (d_char,n), de laag zonder sterkte
 * (k_0·d_0) en de effectieve doorsnede na de eis, en de inbranddiepte in de
 * tijd, met of zonder bescherming (EN 1995-1-2 §3.4 en §4.2.2). De stip op de
 * eis is d_ef uit het blad.
 *
 * Beton: de doorsnede met de wapening op de asafstand a en, gestippeld, de
 * ingevulde tabelwaarden a en b_min (of h_s). De tabellen zelf staan niet in
 * het programma.
 *
 * De kritieke temperatuur, de benutting, de UC en het oordeel komen altijd uit
 * het doorgerekende blad.
 */
const MARKER = "Brandwerendheid";

/** EN 1993-1-2 tabel 3.1 — reductiefactor voor de vloeigrens. */
const KY: [number, number][] = [
  [20, 1.0], [100, 1.0], [200, 1.0], [300, 1.0], [400, 1.0], [500, 0.78],
  [600, 0.47], [700, 0.23], [800, 0.11], [900, 0.06], [1000, 0.04], [1100, 0.02], [1200, 0.0],
];
/** EN 1993-1-2 tabel 3.1 — reductiefactor voor de elasticiteitsmodulus. */
const KE: [number, number][] = [
  [20, 1.0], [100, 1.0], [200, 0.9], [300, 0.8], [400, 0.7], [500, 0.6],
  [600, 0.31], [700, 0.13], [800, 0.09], [900, 0.0675], [1000, 0.045], [1100, 0.0225], [1200, 0.0],
];
/** Lineaire interpolatie in tabel 3.1. */
function tabel(t: [number, number][], T: number): number {
  if (T <= 20) return 1;
  if (T >= 1200) return 0;
  for (let i = 1; i < t.length; i++) {
    const [T0, k0] = t[i - 1], [T1, k1] = t[i];
    if (T <= T1) return k0 + ((k1 - k0) * (T - T0)) / (T1 - T0);
  }
  return 0;
}
const kyTheta = (T: number) => tabel(KY, T);
const kETheta = (T: number) => Math.max(tabel(KE, T), 1e-4);

/** ISO 834 standaardbrandkromme, t in minuten. */
const isoT = (t: number) => 20 + 345 * Math.log10(8 * t + 1);

/** EN 1993-1-2 §3.4.1.2 — soortelijke warmte van staal [J/kgK]. */
function cA(T: number): number {
  if (T < 600) return 425 + 0.773 * T - 1.69e-3 * T * T + 2.22e-6 * T * T * T;
  if (T < 735) return 666 + 13002 / (738 - T);
  if (T < 900) return 545 + 17820 / (T - 731);
  return 650;
}

/** (4.22) — kritieke temperatuur bij benuttingsgraad μ₀. */
const thetaCr = (mu: number) => 39.19 * Math.log(1 / (0.9674 * Math.max(mu, 0.013) ** 3.833) - 1) + 482;

/**
 * Staaltemperatuur in de tijd, §4.2.5: onbekleed (4.25) met k_sh·A_m/V, bekleed
 * (4.27) met (4.28). Punten [t in min, θ in °C] na elke stap.
 */
function staalkromme(
  tEind: number,
  opt: { bekleed: false; kAmV: number } | { bekleed: true; ApV: number; dp: number; lam: number; rho: number; cp: number },
): [number, number][] {
  const dt = opt.bekleed ? 30 : 5;
  const gas = (s: number) => isoT(s / 60);
  const pnt: [number, number][] = [[0, 20]];
  let T = 20;
  for (let s = 0; s < tEind * 60 - 1e-9; s += dt) {
    const g = gas(s), c = cA(T);
    let d: number;
    if (opt.bekleed) {
      const phi = ((opt.cp * opt.rho) / (c * 7850)) * opt.dp * opt.ApV;
      d = ((opt.lam * opt.ApV) / (opt.dp * c * 7850)) * ((g - T) / (1 + phi / 3)) * dt - (Math.exp(phi / 10) - 1) * (gas(s + dt) - g);
      d = Math.max(d, 0);
    } else {
      const h = 25 * (g - T) + 0.7 * 5.67e-8 * ((g + 273) ** 4 - (T + 273) ** 4);
      d = (opt.kAmV / (c * 7850)) * h * dt;
    }
    T = Math.min(T + d, gas(s + dt));
    pnt.push([(s + dt) / 60, T]);
  }
  return pnt;
}

/**
 * Indicatieve waarden van de bekleding, effectief bij brand. De productbeoordeling
 * (NEN-EN 13381-4) gaat voor. Steenwol: de warmtegeleiding bij kamertemperatuur
 * (circa 0,045 W/mK) geeft bij brand een veel te lage staaltemperatuur.
 */
const MATERIAAL: { v: number; label: string; lam: number; rho: number; c: number }[] = [
  { v: 1, label: "Gipskartonplaat", lam: 0.2, rho: 800, c: 1700 },
  { v: 2, label: "Vermiculiet-/perlietplaat", lam: 0.2, rho: 800, c: 1200 },
  { v: 3, label: "Spuitmortel", lam: 0.12, rho: 350, c: 1200 },
  { v: 4, label: "Steenwol", lam: 0.2, rho: 150, c: 1200 },
];

const WERKING: { v: number; label: string }[] = [
  { v: 1, label: "Ligger, kip verhinderd" },
  { v: 2, label: "Ligger, kip mogelijk" },
  { v: 3, label: "Kolom op centrische druk" },
  { v: 4, label: "Trekstaaf" },
];

// ── Hout (EN 1995-1-2) ─────────────────────────────────────────────────────

const HOUTSOORT: { v: number; label: string; gl: boolean }[] = [
  { v: 1, label: "C18", gl: false }, { v: 2, label: "C24", gl: false }, { v: 3, label: "C30", gl: false },
  { v: 4, label: "GL24h", gl: true }, { v: 5, label: "GL28h", gl: true }, { v: 6, label: "GL32h", gl: true },
];
const WERKING_H: { v: number; label: string }[] = [
  { v: 1, label: "Ligger, kip verhinderd" },
  { v: 2, label: "Ligger, kip mogelijk" },
  { v: 3, label: "Kolom op druk (en buiging)" },
];
const BESCHERMING: { v: number; label: string }[] = [
  { v: 0, label: "Onbeschermd" },
  { v: 1, label: "Gipskarton type A of H" },
  { v: 2, label: "Gipskarton type F" },
  { v: 3, label: "Andere: t_ch en t_f zelf" },
];

/** Fasen van een beschermd oppervlak (§3.4.3): begin inbranden, bezwijken, einde van k_3. */
interface Fasen { tch: number; tf: number; ta: number; k2: number }

/**
 * t_ch (3.11), t_f (3.15 of invoer), k_2 (3.7 of invoer) en t_a (3.8)/(3.9),
 * zoals het blad; null zonder bescherming.
 */
function fasen(bekl: number, hp: number, tchIn: number, tfIn: number, k2In: number, bn: number): Fasen | null {
  if (bekl === 0) return null;
  const tch = bekl <= 2 ? Math.max(2.8 * hp - 14, 0) : Math.max(tchIn, 0);
  const tf = Math.max(bekl === 1 ? tch : tfIn, tch);
  const k2 = bekl === 1 ? 1 : bekl === 2 ? 1 - 0.018 * hp : k2In;
  const ta = tf <= tch
    ? Math.min(2 * tf, 25 / (2 * bn) + tf)
    : Math.max((25 - (tf - tch) * k2 * bn) / (2 * bn) + tf, tf);
  return { tch, tf, ta, k2 };
}

/** Inbranddiepte d_char,n na t minuten (3.2), met bescherming volgens §3.4.3.2. */
function inbranding(t: number, bn: number, f: Fasen | null): number {
  if (!f) return bn * t;
  const { tch, tf, ta, k2 } = f;
  if (t <= tch) return 0;
  if (t <= tf) return k2 * bn * (t - tch);
  const df = k2 * bn * (tf - tch);
  if (t <= ta) return df + 2 * bn * (t - tf);
  return df + 2 * bn * (ta - tf) + bn * (t - ta);
}

/** k_0: tabel 4.1, of bij t_ch > 20 min lineair tot t_ch (§4.2.2(3)). */
const kNul = (t: number, f: Fasen | null) => (f && f.tch > 20 ? Math.min(t / f.tch, 1) : Math.min(t / 20, 1));

// ── Beton (EN 1992-1-2, tabelmethode) ──────────────────────────────────────

const ELEMENT_B: { v: number; label: string; tabel: string }[] = [
  { v: 1, label: "Kolom, methode A", tabel: "5.2a" },
  { v: 2, label: "Balk, vrij opgelegd", tabel: "5.5" },
  { v: 3, label: "Balk, doorgaand", tabel: "5.6" },
  { v: 4, label: "Vloer, eenzijdig dragend", tabel: "5.8" },
  { v: 5, label: "Vloer, tweezijdig dragend", tabel: "5.8" },
];

const DEFAULTS: Record<string, number> = {
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

/** Wat elk materiaaldeel van het beeld nodig heeft. */
interface Deel {
  d: (naam: string) => number;
  set: (naam: string, waarde: number) => void;
  uitBlad: (naam: string) => number | null;
  numveld: (naam: string, label: ReactNode, stapje: number) => ReactNode;
  keuze: (naam: string, label: ReactNode, waarde: number, opties: { v: number; label: string }[]) => ReactNode;
  W: number;
  totH: number;
  eis: number;
  gap: number;
}

/** De drie stukken van het beeld: invoer, tekening en voetregel. */
interface Stukken { invoer: ReactNode; tekening: ReactNode; voet: ReactNode }

export default function BrandwerendheidDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // De uitkomst van het blad zelf: θ_a,cr, μ₀, UC en oordeel. Vóór de return
  // hieronder, zodat de volgorde van de hooks vast blijft.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;
  const g = uitkomst?.getallen ?? {};
  const uitBlad = (naam: string): number | null => (Number.isFinite(g[naam]) ? g[naam] : null);

  const materiaal = clamp(Math.round(d("materiaal")), 1, 3);
  const eis = Math.round(d("eis_min"));

  const numveld = (naam: string, label: ReactNode, stapje: number) => (
    <label key={naam}>{label}
      <input type="number" step={stapje} value={d(naam)} onChange={(e) => set(naam, parseFloat(e.target.value))} />
    </label>
  );
  const keuze = (naam: string, label: ReactNode, waarde: number, opties: { v: number; label: string }[]) => (
    <label key={naam} style={{ flexDirection: "column", alignItems: "stretch" }}>{label}
      <select style={{ width: "100%" }} value={waarde} onChange={(e) => set(naam, parseInt(e.target.value))}>
        {opties.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  );

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(260, box.h - 2 * capH - gap);
  const deel: Deel = { d, set, uitBlad, numveld, keuze, W, totH, eis, gap };
  const stukken = materiaal === 2 ? hout(deel) : materiaal === 3 ? beton(deel) : staal(deel);

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — brandwerendheid" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Materiaal en eis</span>
          <label>Materiaal
            <select value={materiaal} onChange={(e) => set("materiaal", parseInt(e.target.value))}>
              <option value={1}>Staal</option>
              <option value={2}>Hout</option>
              <option value={3}>Beton</option>
            </select>
          </label>
          <label>Brandwerendheidseis
            <select value={eis} onChange={(e) => set("eis_min", parseInt(e.target.value))}>
              {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minuten</option>)}
            </select>
          </label>
          {stukken.invoer}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          {stukken.tekening}
        </div>
      </div>

      <div className="vd-foot">{stukken.voet}</div>
    </div>
  );
}

/** Belasting bij brand, gedeeld door hout en beton: η_fi·E_d of de rekenwaarde zelf. */
function belastingInvoer(p: Deel, velden: { naam: string; fi: string; label: ReactNode; eenheid: string; stap: number }[]): ReactNode {
  const { d, numveld, keuze } = p;
  const bron = Math.round(d("bron_fi")) === 2 ? 2 : 1;
  const etaUit = Math.round(d("eta_uit")) === 2;
  return (
    <>
      {keuze("bron_fi", "Belasting bij brand", bron, [
        { v: 1, label: "ηfi × rekenwaarde bij normale temperatuur" },
        { v: 2, label: "Rekenwaarde bij brand (6.11b)" },
      ])}
      {velden.map((v) => bron === 1
        ? numveld(v.naam, <>{v.label}<sub>Ed</sub> ({v.eenheid})</>, v.stap)
        : numveld(v.fi, <>{v.label}<sub>fi,d</sub> ({v.eenheid})</>, v.stap))}
      {bron === 1 && (etaUit
        ? <span className="gd-note">η<sub>fi</sub> uit G<sub>k</sub> en Q<sub>k,1</sub>: zie het blad.</span>
        : numveld("η_fi", <>η<sub>fi</sub></>, 0.05))}
    </>
  );
}

// ── Staal ──────────────────────────────────────────────────────────────────

function staal(p: Deel): Stukken {
  const { d, set, uitBlad, numveld, W, totH, eis, gap } = p;
  const profId = Math.round(d("profiel"));
  const prof = profiel(profId, 5);
  const fy = Math.round(d("staalsoort"));
  const werking = clamp(Math.round(d("werking")), 1, 4);
  const buiging = werking <= 2;
  const zijden = (Math.round(d("verhitting")) === 3 ? 3 : 4) as 3 | 4;
  const schema = Math.round(d("schema"));
  // κ_1 < 1 alleen met een beton- of staalplaatbetonvloer aan de vierde zijde.
  const betonvloer = werking === 1 && zijden === 3 && Math.round(d("vloer")) === 1;
  const bron = Math.round(d("bron_fi")) === 2 ? 2 : 1;
  const etaUit = Math.round(d("eta_uit")) === 2;
  const bekleed = Math.round(d("bekleed")) === 1;
  const vorm = Math.round(d("beklvorm"));          // 1 = koker, 2 = profielvolgend
  const mat = Math.round(d("beklmateriaal"));
  const dp = Math.max(0, d("d_p"));
  const lam = d("lambda_p"), rho = d("rho_p"), cp = d("c_p");

  // Profielfactor — pure geometrie.
  const Am = omtrek(prof, bekleed && vorm === 1, zijden);       // mm per m'
  const AmV = (Am / prof.A) * 1000;                              // 1/m
  const AbV = (omtrek(prof, true, zijden) / prof.A) * 1000;      // kastwaarde
  const ksh = (0.9 * AbV) / AmV;

  // Staaltemperatuur in de tijd, tot iets voorbij de eis.
  const tMax = Math.max(120, eis * 1.6);
  const kromme = bekleed && dp > 0
    ? staalkromme(tMax, { bekleed: true, ApV: AmV, dp: dp / 1000, lam, rho, cp })
    : staalkromme(tMax, { bekleed: false, kAmV: ksh * AmV });

  // Uit het blad.
  const Tcr = uitBlad("θ_a_cr");
  const Tat = uitBlad("θ_a_t");
  const mu0 = uitBlad("μ_0");
  const lamFi = uitBlad(werking === 2 ? "λ_LT" : "λ_z");
  const Efi = uitBlad("E_fi_d"), R0 = uitBlad("R_0");
  // Klasse 4: het blad toont dan A_eff (knikweerstand bij 20 °C) en θ_a,cr = 350 °C.
  const klasse4 = uitBlad("A_eff") !== null;
  const instab = (werking === 2 || werking === 3) && lamFi !== null && !klasse4;
  const muR = instab && Efi !== null && R0 !== null && R0 > 0 ? Efi / R0 : mu0;
  const alfa = 0.65 * Math.sqrt(235 / fy);
  const rFi = (T: number) => {
    const l = (lamFi ?? 0) * Math.sqrt(kyTheta(T) / kETheta(T));
    const phi = 0.5 * (1 + alfa * l + l * l);
    return kyTheta(T) / (phi + Math.sqrt(phi * phi - l * l));
  };
  // Klasse 4 of μ₀ > 1: θ_a,cr volgt dan niet uit een kromme.
  const opKromme = Tcr !== null && !klasse4 && muR !== null && mu0 !== null && mu0 <= 1;
  const tKr = Tcr !== null ? kromme.find(([, T]) => T >= Tcr)?.[0] ?? null : null;

  // ── layout ────────────────────────────────────────────────────────────────
  const DH = Math.max(120, totH * 0.40), GH = totH - DH;

  // doorsnede
  const sD = clamp(Math.min((W * 0.44 - 60) / (prof.b + 2 * dp), (DH - 46) / (prof.h + 2 * dp)), 0.02, 2);
  const dcx = W * 0.26, dcy = DH * 0.50;
  const dpPx = bekleed ? dp * sD : 0, bw = (prof.b * sD) / 2, bh = (prof.h * sD) / 2;

  // grafieken naast elkaar
  const gW = (W - gap) / 2;
  const mL = 46, mR = 14, mT = 18, mB = 30;
  const cw = Math.max(40, gW - mL - mR), ch = Math.max(40, GH - mT - mB);
  const Tmax = 1200;
  const gx1 = (t: number) => mL + (t / tMax) * cw;
  const gy1 = (T: number) => mT + ch - (T / Tmax) * ch;
  const iso = Array.from({ length: 81 }, (_, i) => {
    const t = (tMax * i) / 80;
    return `${i === 0 ? "M" : "L"} ${gx1(t).toFixed(1)} ${gy1(isoT(t)).toFixed(1)}`;
  }).join(" ");
  const stap = Math.max(1, Math.floor(kromme.length / 200));
  const staalPad = kromme.filter((_, i) => i % stap === 0 || i === kromme.length - 1)
    .map(([t, T], i) => `${i === 0 ? "M" : "L"} ${gx1(t).toFixed(1)} ${gy1(T).toFixed(1)}`).join(" ");

  const ox2 = gW + gap;
  const gx2 = (k: number) => ox2 + mL + clamp(k, 0, 1) * cw;
  const gy2 = (T: number) => mT + ch - (T / Tmax) * ch;
  const kCurve = Array.from({ length: 121 }, (_, i) => {
    const T = (Tmax * i) / 120;
    return `${i === 0 ? "M" : "L"} ${gx2(kyTheta(T)).toFixed(1)} ${gy2(T).toFixed(1)}`;
  }).join(" ");
  const crCurve = instab
    ? Array.from({ length: 119 }, (_, i) => {
        const T = 20 + (1170 * i) / 118;
        return `${i === 0 ? "M" : "L"} ${gx2(rFi(T)).toFixed(1)} ${gy2(T).toFixed(1)}`;
      }).join(" ")
    : Array.from({ length: 100 }, (_, i) => {
        const m = 0.013 + ((1 - 0.013) * i) / 99;
        return `${i === 0 ? "M" : "L"} ${gx2(m).toFixed(1)} ${gy2(thetaCr(m)).toFixed(1)}`;
      }).join(" ");

  const invoer = (
    <>
      <span className="vd-ctrl-h">Profiel</span>
      <label>Staalprofiel
        <select value={profId} onChange={(e) => set("profiel", parseInt(e.target.value))}>
          {profielOpties().map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      </label>
      <label>Staalsoort
        <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
          {[235, 275, 355].map((f) => <option key={f} value={f}>S{f}</option>)}
        </select>
      </label>
      <label style={{ flexDirection: "column", alignItems: "stretch" }}>Verhitting
        <select style={{ width: "100%" }} value={zijden} onChange={(e) => set("verhitting", parseInt(e.target.value))}>
          <option value={4}>Vierzijdig</option>
          <option value={3}>Driezijdig (vloer of wand aan de vierde zijde)</option>
        </select>
      </label>

      <span className="vd-ctrl-h">Werking en belasting</span>
      <label style={{ flexDirection: "column", alignItems: "stretch" }}>Werking
        <select style={{ width: "100%" }} value={werking} onChange={(e) => set("werking", parseInt(e.target.value))}>
          {WERKING.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      </label>
      {werking === 1 && (
        <label style={{ flexDirection: "column", alignItems: "stretch" }}>Doorsnede met het grootste moment
          <select style={{ width: "100%" }} value={schema} onChange={(e) => set("schema", parseInt(e.target.value))}>
            <option value={1}>In het veld, of statisch bepaald</option>
            <option value={2}>Boven een tussensteunpunt</option>
          </select>
        </label>
      )}
      {werking === 1 && zijden === 3 && (
        <label style={{ flexDirection: "column", alignItems: "stretch" }}>Aan de vierde zijde
          <select style={{ width: "100%" }} value={betonvloer ? 1 : 0} onChange={(e) => set("vloer", parseInt(e.target.value))}>
            <option value={0}>Een andere vloer of een wand</option>
            <option value={1}>Een beton- of staalplaatbetonvloer</option>
          </select>
        </label>
      )}
      <label style={{ flexDirection: "column", alignItems: "stretch" }}>Belasting bij brand
        <select style={{ width: "100%" }} value={bron} onChange={(e) => set("bron_fi", parseInt(e.target.value))}>
          <option value={1}>ηfi × rekenwaarde bij normale temperatuur</option>
          <option value={2}>Rekenwaarde bij brand (6.11b)</option>
        </select>
      </label>
      {bron === 1
        ? <>
            {buiging
              ? numveld("M_Ed", <>M<sub>Ed</sub> (kNm)</>, 5)
              : numveld("N_Ed", <>N<sub>Ed</sub> (kN)</>, 25)}
            {etaUit
              ? <span className="gd-note">η<sub>fi</sub> uit G<sub>k</sub> en Q<sub>k,1</sub>: zie het blad.</span>
              : numveld("η_fi", <>η<sub>fi</sub></>, 0.05)}
          </>
        : buiging
          ? numveld("M_fi", <>M<sub>fi,d</sub> (kNm)</>, 5)
          : numveld("N_fi", <>N<sub>fi,d</sub> (kN)</>, 25)}
      {werking === 2 && (
        <>
          {numveld("L_kip", <>L<sub>kip</sub> (m)</>, 0.25)}
          {numveld("C_1", <>C<sub>1</sub></>, 0.05)}
          {numveld("C_2", <>C<sub>2</sub></>, 0.05)}
        </>
      )}
      {werking === 3 && numveld("L_fi", <>l<sub>fi</sub> (m)</>, 0.25)}

      <span className="vd-ctrl-h">Bekleding</span>
      <label className="gd-chk">
        <input type="checkbox" checked={bekleed} onChange={(e) => set("bekleed", e.target.checked ? 1 : 0)} />
        bekleed
      </label>
      {bekleed && (
        <>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Vorm
            <select style={{ width: "100%" }} value={vorm} onChange={(e) => set("beklvorm", parseInt(e.target.value))}>
              <option value={1}>Kokervormig bekleed</option>
              <option value={2}>Profielvolgend bekleed</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Materiaal
            <select style={{ width: "100%" }} value={mat}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                const m = MATERIAAL.find((o) => o.v === v);
                set("beklmateriaal", v);
                if (m) { set("lambda_p", m.lam); set("rho_p", m.rho); set("c_p", m.c); }
              }}>
              {MATERIAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Dikte d<sub>p</sub> (mm)
            <input type="number" step={1} min={0} value={dp} onChange={(e) => set("d_p", parseFloat(e.target.value))} />
          </label>
          <label title="Effectieve waarde bij brand, uit de productbeoordeling">λ<sub>p</sub> (W/mK)
            <input type="number" step={0.01} value={lam} onChange={(e) => set("lambda_p", parseFloat(e.target.value))} />
          </label>
          <label>ρ<sub>p</sub> (kg/m³)
            <input type="number" step={50} value={rho} onChange={(e) => set("rho_p", parseFloat(e.target.value))} />
          </label>
          <label>c<sub>p</sub> (J/kgK)
            <input type="number" step={50} value={cp} onChange={(e) => set("c_p", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Indicatieve waarden bij brand; de productbeoordeling (NEN-EN 13381-4) gaat voor.</span>
        </>
      )}
      <span className="gd-note">Verhitte omtrek {fmt(Am)} mm/m' · A = {fmt(prof.A)} mm² →
        {bekleed ? <> A<sub>p</sub>/V</> : <> A<sub>m</sub>/V</>} = {fmt(AmV)} 1/m{!bekleed && <>, k<sub>sh</sub> = {fmt(ksh, 2)}</>}.</span>
      <span className="gd-note">
        {Tcr === null
          ? "De kritieke temperatuur volgt uit het blad."
          : <>θ<sub>a,cr</sub> = {fmt(Tcr)} °C (blad){Tat !== null && <>; na {eis} min θ<sub>a</sub> = {fmt(Tat)} °C</>}
              {tKr !== null ? <>; bereikt na {fmt(tKr)} min.</> : <>; niet bereikt binnen {fmt(tMax)} min.</>}</>}
      </span>
    </>
  );

  const tekening = (
    <>
      <div className="vd-canvas">
        <div className="vd-caption">Doorsnede met bekleding — verhitte omtrek in rood</div>
        <div className="vd-stage" style={{ width: W, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
          <svg width={W} height={DH} className="vd-svg">
            <Defs k="bd" />
            {/* bekleding */}
            {bekleed && dp > 0 && (vorm === 1 ? (
              <rect x={dcx - bw - dpPx} y={dcy - bh - dpPx} width={2 * (bw + dpPx)} height={2 * (bh + dpPx)}
                fill="#fef3c7" stroke="#b45309" strokeWidth={1.3} />
            ) : (
              <path d={`M ${dcx - bw - dpPx} ${dcy - bh - dpPx} h ${2 * (bw + dpPx)} v ${2 * dpPx + Math.max(2, prof.tf * sD)}
                        h ${-(bw + dpPx - Math.max(2, prof.tw * sD) / 2 - dpPx)} v ${2 * bh - 2 * Math.max(2, prof.tf * sD) - 2 * dpPx}
                        h ${bw + dpPx - Math.max(2, prof.tw * sD) / 2 - dpPx} v ${2 * dpPx + Math.max(2, prof.tf * sD)}
                        h ${-2 * (bw + dpPx)} v ${-(2 * dpPx + Math.max(2, prof.tf * sD))}
                        h ${bw + dpPx - Math.max(2, prof.tw * sD) / 2 - dpPx} v ${-(2 * bh - 2 * Math.max(2, prof.tf * sD) - 2 * dpPx)}
                        h ${-(bw + dpPx - Math.max(2, prof.tw * sD) / 2 - dpPx)} Z`}
                fill="#fef3c7" stroke="#b45309" strokeWidth={1.3} />
            ))}
            {/* het profiel */}
            <IProfiel cx={dcx} cy={dcy} h={prof.h} b={prof.b} tw={prof.tw} tf={prof.tf} s={sD} />
            {/* verhitte omtrek */}
            {(() => {
              const r = bekleed && vorm === 1 ? dpPx : 0;
              const x0 = dcx - bw - r, x1 = dcx + bw + r, y0 = dcy - bh - r, y1 = dcy + bh + r;
              return zijden === 4
                ? <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="none" stroke="#dc2626" strokeWidth={2.6} />
                : <path d={`M ${x0} ${y0} L ${x0} ${y1} L ${x1} ${y1} L ${x1} ${y0}`} fill="none" stroke="#dc2626" strokeWidth={2.6} />;
            })()}
            {zijden === 3 && (
              <g>
                <rect x={dcx - bw - dpPx - 24} y={dcy - bh - dpPx - 16} width={2 * (bw + dpPx) + 48} height={14}
                  fill="#d1d5db" stroke="#6b7280" strokeWidth={1.1} />
                <text x={dcx} y={dcy - bh - dpPx - 22} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>{betonvloer ? "betonvloer" : "vloer of wand"} — niet verhit</text>
              </g>
            )}
            <text x={dcx} y={dcy + bh + dpPx + 26} textAnchor="middle" style={{ fontSize: 11, fill: "#1e40af", fontWeight: 700 }}>{prof.naam} S{fy}</text>
          </svg>

          <Ro text={`${bekleed ? "Ap/V" : "Am/V"} = ${fmt(AmV)} 1/m`} x={dcx + bw + dpPx + 90} y={dcy - 10} kleur="#dc2626"
            title="profielfactor: verhitte omtrek gedeeld door het staaloppervlak" />
          {bekleed && dp > 0 && <Ro text={`dp=${fmt(dp)}`} x={dcx + bw + dpPx + 90} y={dcy + 14} kleur="#b45309" />}
        </div>
      </div>

      <div className="vd-canvas">
        <div className="vd-caption">Temperatuur in de tijd (ISO 834 en staal) en de kritieke temperatuur</div>
        <div className="vd-stage" style={{ width: W, height: GH, background: "transparent", border: "none", borderRadius: 0 }}>
          <svg width={W} height={GH} className="vd-svg">
            <Defs k="bg" />
            {/* ── links: temperatuur tegen tijd ── */}
            <line x1={mL} y1={mT} x2={mL} y2={mT + ch} stroke="#6b7280" strokeWidth={1} />
            <line x1={mL} y1={mT + ch} x2={mL + cw} y2={mT + ch} stroke="#6b7280" strokeWidth={1} />
            {[200, 400, 600, 800, 1000, 1200].map((T) => (
              <g key={T}>
                <line x1={mL} y1={gy1(T)} x2={mL + cw} y2={gy1(T)} stroke="#e5e7eb" strokeWidth={1} />
                <text x={mL - 6} y={gy1(T) + 3.5} textAnchor="end" style={{ fontSize: 9, fill: "#9ca3af" }}>{T}</text>
              </g>
            ))}
            {[30, 60, 90, 120, 150, 180].filter((t) => t <= tMax).map((t) => (
              <g key={t}>
                <line x1={gx1(t)} y1={mT + ch} x2={gx1(t)} y2={mT + ch + 4} stroke="#9ca3af" strokeWidth={1} />
                <text x={gx1(t)} y={mT + ch + 15} textAnchor="middle" style={{ fontSize: 9, fill: "#6b7280" }}>{t}′</text>
              </g>
            ))}
            <path d={iso} fill="none" stroke="#dc2626" strokeWidth={2.2} />
            <text x={mL + cw * 0.52} y={gy1(isoT(tMax * 0.55)) - 8} style={{ fontSize: 10, fill: "#dc2626", fontWeight: 700 }}>ISO 834</text>
            <path d={staalPad} fill="none" stroke="#1e3a8a" strokeWidth={2.2} />
            <text x={mL + cw * 0.72} y={gy1(kromme[Math.floor(kromme.length * 0.72)]?.[1] ?? 20) + 14}
              style={{ fontSize: 10, fill: "#1e3a8a", fontWeight: 700 }}>staal</text>
            {/* de kritieke temperatuur */}
            {Tcr !== null && (
              <g>
                <line x1={mL} y1={gy1(Tcr)} x2={mL + cw} y2={gy1(Tcr)} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5 3" />
                <text x={mL + 4} y={gy1(Tcr) - 5} style={{ fontSize: 10, fill: "#16a34a", fontWeight: 700 }}>θa,cr = {fmt(Tcr)} °C</text>
              </g>
            )}
            {tKr !== null && Tcr !== null && (
              <g>
                <circle cx={gx1(tKr)} cy={gy1(Tcr)} r={4} fill="#fff" stroke="#16a34a" strokeWidth={2} />
                <text x={gx1(tKr) + 6} y={gy1(Tcr) + 14} style={{ fontSize: 10, fill: "#16a34a", fontWeight: 700 }}>{fmt(tKr)}′</text>
              </g>
            )}
            {/* de eis als verticale lijn, met de staaltemperatuur van het blad */}
            <line x1={gx1(eis)} y1={mT} x2={gx1(eis)} y2={mT + ch} stroke="#1e40af" strokeWidth={1.6} strokeDasharray="6 4" />
            <text x={gx1(eis) + 5} y={mT + 11} style={{ fontSize: 10, fill: "#1e40af", fontWeight: 700 }}>eis {eis}′</text>
            {Tat !== null && (
              <g>
                <circle cx={gx1(eis)} cy={gy1(Tat)} r={4} fill="#1e3a8a" stroke="#fff" strokeWidth={1.5} />
                <text x={gx1(eis) + 7} y={gy1(Tat) + 4} style={{ fontSize: 10, fill: "#1e3a8a", fontWeight: 700 }}>{fmt(Tat)} °C</text>
              </g>
            )}

            {/* ── rechts: benutting tegen temperatuur ── */}
            <line x1={ox2 + mL} y1={mT} x2={ox2 + mL} y2={mT + ch} stroke="#6b7280" strokeWidth={1} />
            <line x1={ox2 + mL} y1={mT + ch} x2={ox2 + mL + cw} y2={mT + ch} stroke="#6b7280" strokeWidth={1} />
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => (
              <g key={k}>
                <line x1={gx2(k)} y1={mT} x2={gx2(k)} y2={mT + ch} stroke="#e5e7eb" strokeWidth={1} />
                <text x={gx2(k)} y={mT + ch + 15} textAnchor="middle" style={{ fontSize: 9, fill: "#6b7280" }}>{k.toFixed(1)}</text>
              </g>
            ))}
            {[200, 400, 600, 800, 1000, 1200].map((T) => (
              <text key={T} x={ox2 + mL - 6} y={gy2(T) + 3.5} textAnchor="end" style={{ fontSize: 9, fill: "#9ca3af" }}>{T}</text>
            ))}
            <path d={kCurve} fill="none" stroke="#9ca3af" strokeWidth={1.4} />
            <text x={gx2(0.84)} y={gy2(470) - 4} style={{ fontSize: 9, fill: "#9ca3af" }}>k<tspan baselineShift="sub">y,θ</tspan></text>
            <path d={crCurve} fill="none" stroke="#dc2626" strokeWidth={2.2} />
            <text x={ox2 + mL + cw * 0.06} y={mT + 12} style={{ fontSize: 10, fill: "#dc2626", fontWeight: 700 }}>
              {instab ? "χfi·ky,θ" : "(4.22)"}
            </text>
            {/* de staaltemperatuur na de eis */}
            {Tat !== null && (
              <g>
                <line x1={ox2 + mL} y1={gy2(Tat)} x2={ox2 + mL + cw} y2={gy2(Tat)} stroke="#1e3a8a" strokeWidth={1.2} strokeDasharray="3 3" />
                <text x={ox2 + mL + cw - 2} y={gy2(Tat) - 4} textAnchor="end" style={{ fontSize: 9.5, fill: "#1e3a8a" }}>θa na {eis}′</text>
              </g>
            )}
            {/* de benutting afgezet en doorgetrokken naar de kromme */}
            {Tcr !== null && opKromme && muR !== null && (
              <g>
                <line x1={gx2(muR)} y1={mT + ch} x2={gx2(muR)} y2={gy2(Tcr)} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5 3" />
                <line x1={gx2(muR)} y1={gy2(Tcr)} x2={ox2 + mL} y2={gy2(Tcr)} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5 3" />
                <circle cx={gx2(muR)} cy={gy2(Tcr)} r={4} fill="#fff" stroke="#16a34a" strokeWidth={2} />
                <text x={gx2(muR) + 8} y={gy2(Tcr) - 7} style={{ fontSize: 10.5, fill: "#16a34a", fontWeight: 700 }}>
                  {instab ? "Efi,d/R0" : "μ₀"} = {fmt(muR, 2)} → {fmt(Tcr)} °C
                </text>
              </g>
            )}
            {Tcr !== null && !opKromme && (
              <g>
                <line x1={ox2 + mL} y1={gy2(Tcr)} x2={ox2 + mL + cw} y2={gy2(Tcr)} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5 3" />
                <text x={ox2 + mL + 6} y={gy2(Tcr) - 6} style={{ fontSize: 10.5, fill: "#16a34a", fontWeight: 700 }}>
                  {mu0 !== null && mu0 > 1 ? "μ₀ > 1: bezwijkt al bij 20 °C" : "klasse 4: θa,cr = 350 °C"}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </>
  );

  const voet = (
    <>
      <span>De ISO 834-kromme, tabel 3.1 en (4.22) zijn normgegevens; de staalkromme volgt §4.2.5 met stappen van {bekleed ? "30" : "5"} s.
        <br />θ<sub>a,cr</sub>, μ<sub>0</sub>, de UC en het oordeel komen uit het blad.</span>
      <span className="vd-live">
        {prof.naam} S{fy} · {WERKING.find((w) => w.v === werking)?.label.toLowerCase()} · eis {eis} min · {zijden}-zijdig verhit ·{" "}
        {bekleed ? `${vorm === 1 ? "kokervormig" : "profielvolgend"} bekleed, ${MATERIAAL.find((m) => m.v === mat)?.label} ${fmt(dp)} mm` : "onbekleed"} ·
        {bekleed ? <> A<sub>p</sub>/V</> : <> A<sub>m</sub>/V</>} = {fmt(AmV)} 1/m
        {mu0 !== null && mu0 > 0 && <> · μ<sub>0</sub> = {fmt(mu0, 2)}</>}
        {Tcr !== null && <> · θ<sub>a,cr</sub> = {fmt(Tcr)} °C</>}
        {Tat !== null && <> · θ<sub>a</sub>({eis}′) = {fmt(Tat)} °C</>}
      </span>
    </>
  );

  return { invoer, tekening, voet };
}

// ── Hout ───────────────────────────────────────────────────────────────────

function hout(p: Deel): Stukken {
  const { d, uitBlad, numveld, keuze, W, totH, eis } = p;
  const soort = clamp(Math.round(d("houtsoort")), 1, 6);
  const gl = HOUTSOORT[soort - 1].gl;
  const bn = gl ? 0.7 : 0.8;
  const werking = clamp(Math.round(d("werking_h")), 1, 3);
  const ligger = werking <= 2;
  const zijden = Math.round(d("verhitting")) === 3 ? 3 : 4;
  const b = Math.max(0, d("b_hout")), h = Math.max(0, d("h_hout"));
  const bekl = clamp(Math.round(d("bekl_h")), 0, 3);
  const hp = Math.max(0, d("h_p"));
  const f = fasen(bekl, hp, d("t_ch"), d("t_f"), d("k_2"), bn);

  // Het beeld rekent de inbranding zelf, om hem in de tijd te tekenen; d_ef bij
  // de eis komt uit het blad.
  const dchar = inbranding(eis, bn, f);
  const k0 = kNul(eis, f);
  const defEigen = dchar + 7 * k0;
  const def = uitBlad("d_ef") ?? defEigen;
  const dcharBlad = uitBlad("d_char_n") ?? dchar;
  const bef = Math.max(b - 2 * def, 0);
  const hef = Math.max(h - (zijden === 3 ? 1 : 2) * def, 0);

  // Wanneer is de doorsnede op? d_ef = b/2 (of h/2, of h bij driezijdig).
  const dOp = Math.min(b / 2, zijden === 3 ? h : h / 2);
  const tMax = Math.max(120, eis * 1.6);
  const dAt = (t: number) => inbranding(t, bn, f) + 7 * kNul(t, f);
  let tOp: number | null = null;
  for (let t = 0; t <= tMax; t += 0.25) if (dAt(t) >= dOp && dOp > 0) { tOp = t; break; }

  // ── layout ────────────────────────────────────────────────────────────────
  const DH = Math.max(140, totH * 0.52), GH = totH - DH;

  // doorsnede
  const s = b > 0 && h > 0 ? clamp(Math.min((W * 0.5 - 80) / b, (DH - 60) / h), 0.05, 4) : 1;
  const cx = W * 0.3, cy = DH * 0.5 + (zijden === 3 ? 8 : 0);
  const x0 = cx - (b * s) / 2, y0 = cy - (h * s) / 2, x1 = x0 + b * s, y1 = y0 + h * s;
  const top = zijden === 3 ? 0 : 1;   // brandt de bovenzijde in?
  const inset = (dd: number) => ({
    x: x0 + dd * s, y: y0 + top * dd * s,
    w: Math.max(0, b * s - 2 * dd * s), h: Math.max(0, h * s - (1 + top) * dd * s),
  });
  const r1 = inset(dcharBlad), r2 = inset(def);

  // inbranding in de tijd
  const mL = 46, mR = 14, mT = 18, mB = 30;
  const cw = Math.max(40, W - mL - mR), ch = Math.max(40, GH - mT - mB);
  const dMax = Math.max(40, Math.ceil((Math.max(dAt(tMax), dOp) * 1.08) / 10) * 10);
  const gx = (t: number) => mL + (t / tMax) * cw;
  const gy = (dd: number) => mT + ch - (clamp(dd, 0, dMax) / dMax) * ch;
  const pad = (fn: (t: number) => number) => Array.from({ length: 161 }, (_, i) => {
    const t = (tMax * i) / 160;
    return `${i === 0 ? "M" : "L"} ${gx(t).toFixed(1)} ${gy(fn(t)).toFixed(1)}`;
  }).join(" ");
  const stapY = dMax > 120 ? 40 : 20;

  const UCm = uitBlad("UC_m"), UCv = uitBlad("UC_v"), UCc = uitBlad("UC_c");

  const invoer = (
    <>
      <span className="vd-ctrl-h">Doorsnede</span>
      {keuze("houtsoort", "Sterkteklasse", soort, HOUTSOORT)}
      {numveld("b_hout", <>Breedte b (mm)</>, 10)}
      {numveld("h_hout", <>Hoogte h (mm)</>, 10)}
      {keuze("werking_h", "Werking", werking, WERKING_H)}
      {keuze("verhitting", "Verhitting", zijden, [
        { v: 4, label: "Vierzijdig" },
        { v: 3, label: "Driezijdig (bovenzijde of wandzijde niet verhit)" },
      ])}

      <span className="vd-ctrl-h">Belasting bij brand</span>
      {belastingInvoer(p, ligger
        ? [{ naam: "M_Ed", fi: "M_fi", label: "M", eenheid: "kNm", stap: 5 }, { naam: "V_Ed", fi: "V_fi", label: "V", eenheid: "kN", stap: 5 }]
        : [{ naam: "N_Ed", fi: "N_fi", label: "N", eenheid: "kN", stap: 25 }, { naam: "M_Ed", fi: "M_fi", label: "M", eenheid: "kNm", stap: 5 }])}
      {werking === 2 && numveld("l_ef", <>ℓ<sub>ef</sub> kip (m)</>, 0.25)}
      {werking === 3 && numveld("L_fi", <>l<sub>fi</sub> knik (m)</>, 0.25)}

      <span className="vd-ctrl-h">Bescherming</span>
      {keuze("bekl_h", "Bescherming", bekl, BESCHERMING)}
      {(bekl === 1 || bekl === 2) && numveld("h_p", <>Plaatdikte h<sub>p</sub> (mm)</>, 0.5)}
      {bekl === 3 && numveld("t_ch", <>t<sub>ch</sub> (min)</>, 1)}
      {bekl >= 2 && numveld("t_f", <>t<sub>f</sub> (min)</>, 1)}
      {bekl === 3 && numveld("k_2", <>k<sub>2</sub></>, 0.05)}
      {f && (
        <span className="gd-note">t<sub>ch</sub> = {fmt(f.tch, 1)} min, t<sub>f</sub> = {fmt(f.tf, 1)} min, t<sub>a</sub> = {fmt(f.ta, 1)} min
          {bekl === 2 && <>, k<sub>2</sub> = {fmt(f.k2, 2)}</>}.</span>
      )}
      <span className="gd-note">
        Na {eis} min: d<sub>char,n</sub> = {fmt(dcharBlad, 1)} mm, d<sub>ef</sub> = {fmt(def, 1)} mm (β<sub>n</sub> = {fmt(bn, 1)} mm/min, k<sub>0</sub> = {fmt(k0, 2)})
        → {fmt(bef)} × {fmt(hef)} mm{tOp !== null ? <>; doorsnede op na {fmt(tOp)} min.</> : "."}
      </span>
    </>
  );

  const tekening = (
    <>
      <div className="vd-canvas">
        <div className="vd-caption">Doorsnede na {eis} minuten — koollaag, laag zonder sterkte (k<sub>0</sub>·d<sub>0</sub>) en effectieve doorsnede</div>
        <div className="vd-stage" style={{ width: W, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
          <svg width={W} height={DH} className="vd-svg">
            <Defs k="hd" />
            {b > 0 && h > 0 && (
              <g>
                {zijden === 3 && (
                  <g>
                    <rect x={x0 - 30} y={y0 - 16} width={b * s + 60} height={16} fill="#d1d5db" stroke="#6b7280" strokeWidth={1.1} />
                    <text x={cx} y={y0 - 22} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>vloer of wand — niet verhit</text>
                  </g>
                )}
                {bekl > 0 && (
                  <path d={zijden === 3
                    ? `M ${x0 - 5} ${y0} L ${x0 - 5} ${y1 + 5} L ${x1 + 5} ${y1 + 5} L ${x1 + 5} ${y0}`
                    : `M ${x0 - 5} ${y0 - 5} H ${x1 + 5} V ${y1 + 5} H ${x0 - 5} Z`}
                    fill="none" stroke="#b45309" strokeWidth={4} opacity={0.55} />
                )}
                <rect x={x0} y={y0} width={b * s} height={h * s} fill="#3f3f46" stroke="#18181b" strokeWidth={1.2} />
                {r1.w > 0 && r1.h > 0 && <rect x={r1.x} y={r1.y} width={r1.w} height={r1.h} fill="#fdba74" />}
                {r2.w > 0 && r2.h > 0 && <rect x={r2.x} y={r2.y} width={r2.w} height={r2.h} fill="#e7c79a" stroke="#92400e" strokeWidth={1.4} />}
                {/* verhitte zijden */}
                {zijden === 4
                  ? <rect x={x0} y={y0} width={b * s} height={h * s} fill="none" stroke="#dc2626" strokeWidth={2.4} />
                  : <path d={`M ${x0} ${y0} L ${x0} ${y1} L ${x1} ${y1} L ${x1} ${y0}`} fill="none" stroke="#dc2626" strokeWidth={2.4} />}
                <text x={cx} y={y1 + 22} textAnchor="middle" style={{ fontSize: 11, fill: "#92400e", fontWeight: 700 }}>
                  {HOUTSOORT[soort - 1].label} {fmt(b)}×{fmt(h)}
                </text>
                {/* legenda */}
                {[
                  { c: "#3f3f46", t: `koollaag d_char,n = ${fmt(dcharBlad, 1)} mm` },
                  { c: "#fdba74", t: `zonder sterkte k0·d0 = ${fmt(def - dcharBlad, 1)} mm` },
                  { c: "#e7c79a", t: `effectief ${fmt(bef)} × ${fmt(hef)} mm` },
                ].map((l, i) => (
                  <g key={i}>
                    <rect x={W * 0.6} y={DH * 0.3 + i * 20} width={12} height={12} fill={l.c} stroke="#6b7280" strokeWidth={0.8} />
                    <text x={W * 0.6 + 18} y={DH * 0.3 + i * 20 + 10} style={{ fontSize: 10.5, fill: "#374151" }}>{l.t}</text>
                  </g>
                ))}
                {bef <= 0 || hef <= 0
                  ? <text x={W * 0.6} y={DH * 0.3 + 72} style={{ fontSize: 11, fill: "#b91c1c", fontWeight: 700 }}>geen effectieve doorsnede over</text>
                  : <text x={W * 0.6} y={DH * 0.3 + 72} style={{ fontSize: 10.5, fill: "#374151" }}>
                      {ligger
                        ? `UC buiging ${UCm !== null ? fmt(UCm, 2) : "—"} · afschuiving ${UCv !== null ? fmt(UCv, 2) : "—"} (blad)`
                        : `UC druk en knik ${UCc !== null ? fmt(UCc, 2) : "—"} (blad)`}
                    </text>}
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="vd-canvas">
        <div className="vd-caption">Inbranddiepte in de tijd — d<sub>char,n</sub> en d<sub>ef</sub>; de doorsnede is op bij d<sub>ef</sub> = {fmt(dOp)} mm</div>
        <div className="vd-stage" style={{ width: W, height: GH, background: "transparent", border: "none", borderRadius: 0 }}>
          <svg width={W} height={GH} className="vd-svg">
            <line x1={mL} y1={mT} x2={mL} y2={mT + ch} stroke="#6b7280" strokeWidth={1} />
            <line x1={mL} y1={mT + ch} x2={mL + cw} y2={mT + ch} stroke="#6b7280" strokeWidth={1} />
            {Array.from({ length: Math.floor(dMax / stapY) }, (_, i) => (i + 1) * stapY).map((dd) => (
              <g key={dd}>
                <line x1={mL} y1={gy(dd)} x2={mL + cw} y2={gy(dd)} stroke="#e5e7eb" strokeWidth={1} />
                <text x={mL - 6} y={gy(dd) + 3.5} textAnchor="end" style={{ fontSize: 9, fill: "#9ca3af" }}>{dd}</text>
              </g>
            ))}
            {[30, 60, 90, 120, 150, 180].filter((t) => t <= tMax).map((t) => (
              <g key={t}>
                <line x1={gx(t)} y1={mT + ch} x2={gx(t)} y2={mT + ch + 4} stroke="#9ca3af" strokeWidth={1} />
                <text x={gx(t)} y={mT + ch + 15} textAnchor="middle" style={{ fontSize: 9, fill: "#6b7280" }}>{t}′</text>
              </g>
            ))}
            <text x={mL + 4} y={mT + 10} style={{ fontSize: 9, fill: "#6b7280" }}>mm</text>
            {f && [["tch", f.tch], ["tf", f.tf], ["ta", f.ta]].filter(([, t]) => (t as number) > 0 && (t as number) <= tMax).map(([n, t]) => (
              <g key={n as string}>
                <line x1={gx(t as number)} y1={mT} x2={gx(t as number)} y2={mT + ch} stroke="#b45309" strokeWidth={1} strokeDasharray="2 3" />
                <text x={gx(t as number) + 3} y={mT + ch - 4} style={{ fontSize: 9, fill: "#b45309" }}>{n as string}</text>
              </g>
            ))}
            {dOp > 0 && (
              <g>
                <line x1={mL} y1={gy(dOp)} x2={mL + cw} y2={gy(dOp)} stroke="#b91c1c" strokeWidth={1.3} strokeDasharray="6 3" />
                <text x={mL + cw - 4} y={gy(dOp) - 4} textAnchor="end" style={{ fontSize: 9.5, fill: "#b91c1c" }}>doorsnede op</text>
              </g>
            )}
            <path d={pad((t) => inbranding(t, bn, f))} fill="none" stroke="#3f3f46" strokeWidth={2.2} />
            <path d={pad(dAt)} fill="none" stroke="#ea580c" strokeWidth={2} strokeDasharray="7 3" />
            <text x={gx(tMax * 0.8)} y={gy(inbranding(tMax * 0.8, bn, f)) + 14} style={{ fontSize: 10, fill: "#3f3f46", fontWeight: 700 }}>dchar,n</text>
            <text x={gx(tMax * 0.62)} y={gy(dAt(tMax * 0.62)) - 7} style={{ fontSize: 10, fill: "#ea580c", fontWeight: 700 }}>def</text>
            <line x1={gx(eis)} y1={mT} x2={gx(eis)} y2={mT + ch} stroke="#1e40af" strokeWidth={1.6} strokeDasharray="6 4" />
            <text x={gx(eis) + 5} y={mT + 11} style={{ fontSize: 10, fill: "#1e40af", fontWeight: 700 }}>eis {eis}′</text>
            <circle cx={gx(eis)} cy={gy(def)} r={4} fill="#ea580c" stroke="#fff" strokeWidth={1.5} />
            <text x={gx(eis) + 7} y={gy(def) + 4} style={{ fontSize: 10, fill: "#9a3412", fontWeight: 700 }}>{fmt(def, 1)} mm</text>
          </svg>
        </div>
      </div>
    </>
  );

  const voet = (
    <>
      <span>β<sub>n</sub> (tabel 3.1), d<sub>0</sub> = 7 mm en k<sub>0</sub> (tabel 4.1) zijn normgegevens; de inbranding met bescherming volgt §3.4.3.
        <br />d<sub>ef</sub> bij de eis, de UC en het oordeel komen uit het blad.</span>
      <span className="vd-live">
        {HOUTSOORT[soort - 1].label} {fmt(b)}×{fmt(h)} · {WERKING_H[werking - 1].label.toLowerCase()} · eis {eis} min · {zijden}-zijdig verhit ·{" "}
        {BESCHERMING[bekl].label.toLowerCase()} · d<sub>ef</sub> = {fmt(def, 1)} mm → {fmt(bef)} × {fmt(hef)} mm
      </span>
    </>
  );

  return { invoer, tekening, voet };
}

// ── Beton ──────────────────────────────────────────────────────────────────

function beton(p: Deel): Stukken {
  const { d, uitBlad, numveld, keuze, W, totH, eis } = p;
  const el = clamp(Math.round(d("element_b")), 1, 5);
  const kolom = el === 1, balk = el === 2 || el === 3, vloer = el >= 4;
  const eenZijde = kolom && Math.round(d("zijde_b")) === 2;
  const b = Math.max(0, d("b_beton")), h = Math.max(0, d("h_beton"));
  const c = Math.max(0, d("c_dek")), db = vloer ? 0 : Math.max(0, d("d_beugel")), ds = Math.max(0, d("d_staaf"));
  const a = c + db + ds / 2;
  const amin = Math.max(0, d("a_min"));
  const bmin = Math.max(0, d(vloer ? "h_min" : "b_min"));
  const mu = uitBlad("μ_fi");
  const UCb = uitBlad("UC_b"), UCa = uitBlad("UC_a");
  const tabel = ELEMENT_B[el - 1].tabel;

  // ── layout: één doorsnede over de volle hoogte ────────────────────────────
  const H = totH + 24;
  const breedte = vloer ? 600 : b;            // een vloerstrook van 600 mm
  const hoogte = h;
  const s = breedte > 0 && hoogte > 0 ? clamp(Math.min((W * 0.55 - 60) / breedte, (H - 90) / hoogte), 0.05, 3) : 1;
  const cx = W * 0.32, cy = H * 0.5 + 10;
  const x0 = cx - (breedte * s) / 2, y0 = cy - (hoogte * s) / 2, x1 = x0 + breedte * s, y1 = y0 + hoogte * s;

  // Staven: een kolom rondom, een balk onderin, een vloer onderin h.o.h. 150.
  const staven: [number, number][] = [];
  if (breedte > 0 && hoogte > 0) {
    if (kolom) {
      const nx = b >= 300 ? 3 : 2, ny = h >= 300 ? 3 : 2;
      for (let i = 0; i < nx; i++) {
        const x = a + ((b - 2 * a) * i) / (nx - 1);
        staven.push([x, a], [x, h - a]);
      }
      for (let j = 1; j < ny - 1; j++) {
        const y = a + ((h - 2 * a) * j) / (ny - 1);
        staven.push([a, y], [b - a, y]);
      }
    } else if (balk) {
      const n = b >= 300 ? 4 : b >= 200 ? 3 : 2;
      for (let i = 0; i < n; i++) staven.push([a + ((b - 2 * a) * i) / (n - 1), h - a]);
    } else {
      for (let x = 75; x < 600; x += 150) staven.push([x, h - a]);
    }
  }
  const px = (x: number) => x0 + x * s, py = (y: number) => y0 + y * s;
  const rStaaf = Math.max(2, (ds / 2) * s);

  // De verhitte zijden: kolom rondom (of één zijde), balk onder en opzij, vloer onder.
  const verhit = kolom
    ? (eenZijde ? `M ${x0} ${y1} L ${x1} ${y1}` : `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`)
    : balk ? `M ${x0} ${y0} L ${x0} ${y1} L ${x1} ${y1} L ${x1} ${y0}` : `M ${x0} ${y1} L ${x1} ${y1}`;

  const invoer = (
    <>
      <span className="vd-ctrl-h">Element</span>
      {keuze("element_b", "Element", el, ELEMENT_B)}
      {kolom && keuze("zijde_b", "Verhitting", eenZijde ? 2 : 1, [
        { v: 1, label: "Aan meer dan één zijde" },
        { v: 2, label: "Aan één zijde (kolom in een wand)" },
      ])}
      {kolom && keuze("vorm_b", "Doorsnede", Math.round(d("vorm_b")) === 2 ? 2 : 1, [
        { v: 1, label: "Rechthoekig" },
        { v: 2, label: "Rond, b = h = de diameter" },
      ])}
      {el === 5 && keuze("verhouding_b", "Overspanningen", Math.round(d("verhouding_b")) === 2 ? 2 : 1, [
        { v: 1, label: "ly/lx hooguit 1,5" },
        { v: 2, label: "ly/lx tussen 1,5 en 2" },
      ])}
      {!vloer && numveld("b_beton", <>Breedte b (mm)</>, 10)}
      {numveld("h_beton", vloer ? <>Dikte h<sub>s</sub> (mm)</> : kolom ? <>Diepte h (mm)</> : <>Hoogte h (mm)</>, 10)}
      {numveld("c_dek", vloer ? <>Dekking onderwapening (mm)</> : <>Dekking op de beugel (mm)</>, 5)}
      {!vloer && numveld("d_beugel", <>Beugel Ø (mm)</>, 2)}
      {numveld("d_staaf", <>Hoofdwapening Ø (mm)</>, 2)}
      {kolom && numveld("A_s", <>A<sub>s</sub> langswapening (mm²)</>, 50)}
      {kolom && numveld("l_0fi", <>l<sub>0,fi</sub> kniklengte bij brand (m)</>, 0.1)}

      <span className="vd-ctrl-h">Belasting bij brand</span>
      {belastingInvoer(p, kolom
        ? [{ naam: "N_Ed", fi: "N_fi", label: "N", eenheid: "kN", stap: 25 },
           { naam: "M_0Ed", fi: "M_0Ed_fi", label: <>M<sub>0</sub></>, eenheid: "kNm", stap: 5 }]
        : [{ naam: "M_Ed", fi: "M_fi", label: "M", eenheid: "kNm", stap: 5 }])}
      {kolom ? numveld("N_Rd", <>N<sub>Rd</sub> (kN)</>, 50) : numveld("M_Rd", <>M<sub>Rd</sub> (kNm)</>, 5)}

      <span className="vd-ctrl-h">Uit tabel {tabel}, R {eis}</span>
      {numveld(vloer ? "h_min" : "b_min", vloer ? <>h<sub>s</sub> uit de tabel (mm)</> : <>b<sub>min</sub> uit de tabel (mm)</>, 5)}
      {numveld("a_min", <>a uit de tabel (mm)</>, 1)}
      <span className="gd-note">
        De tabellen van NEN-EN 1992-1-2 staan niet in het programma: lees b<sub>min</sub> (of h<sub>s</sub>) en a zelf af
        {kolom && mu !== null && <> in de kolom μ<sub>fi</sub> = {mu <= 0.2 ? "0,2" : mu <= 0.5 ? "0,5" : mu <= 0.7 ? "0,7" : "— (buiten de tabel)"}</>}.
      </span>
      <span className="gd-note">a = c + {vloer ? "" : "Ø_beugel + "}Ø/2 = {fmt(a, 1)} mm{mu !== null && <>; μ<sub>fi</sub> = {fmt(mu, 2)} (blad)</>}.</span>
    </>
  );

  const tekening = (
    <div className="vd-canvas">
      <div className="vd-caption">Doorsnede met de asafstand a — gestippeld de ingevulde tabelwaarden (a en {vloer ? "hs" : "bmin"}); verhit in rood</div>
      <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
        <svg width={W} height={H} className="vd-svg">
          <Defs k="bt" />
          {breedte > 0 && hoogte > 0 && (
            <g>
              {balk && (
                <g>
                  <rect x={x0 - 60} y={y0 - 18} width={breedte * s + 120} height={18} fill="#d1d5db" stroke="#6b7280" strokeWidth={1.1} />
                  <text x={cx} y={y0 - 24} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>vloer — niet verhit</text>
                </g>
              )}
              {eenZijde && (
                <g>
                  <rect x={x0 - 40} y={y0 - 14} width={breedte * s + 80} height={14} fill="#d1d5db" stroke="#6b7280" strokeWidth={1.1} />
                  <text x={cx} y={y0 - 20} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>wand — niet verhit aan deze zijden</text>
                </g>
              )}
              <rect x={x0} y={y0} width={breedte * s} height={hoogte * s} fill="#d6d9de" stroke="#4b5563" strokeWidth={1.3} />
              {/* de ingevulde tabelwaarde a vanaf de verhitte zijden */}
              {amin > 0 && (
                <path d={kolom && !eenZijde
                  ? `M ${px(amin)} ${py(amin)} H ${px(b - amin)} V ${py(h - amin)} H ${px(amin)} Z`
                  : balk ? `M ${px(amin)} ${y0} V ${py(h - amin)} H ${px(b - amin)} V ${y0}`
                  : `M ${x0} ${py(h - amin)} H ${x1}`}
                  fill="none" stroke={amin > a ? "#b91c1c" : "#16a34a"} strokeWidth={1.4} strokeDasharray="5 3" />
              )}
              {/* de ingevulde b_min of h_s */}
              {bmin > 0 && (vloer
                ? <line x1={x0} y1={y1 - bmin * s} x2={x1} y2={y1 - bmin * s} stroke={bmin > h ? "#b91c1c" : "#7c3aed"} strokeWidth={1.3} strokeDasharray="2 3" />
                : <rect x={cx - (bmin * s) / 2} y={kolom ? cy - (Math.min(bmin, h) * s) / 2 : y0} width={bmin * s} height={kolom ? Math.min(bmin, h) * s : hoogte * s}
                    fill="none" stroke={bmin > Math.min(b, kolom ? h : b) ? "#b91c1c" : "#7c3aed"} strokeWidth={1.3} strokeDasharray="2 3" />)}
              {!vloer && db > 0 && (
                <rect x={px(c + db / 2)} y={balk ? y0 + 4 : py(c + db / 2)} width={Math.max(0, (b - 2 * c - db) * s)}
                  height={Math.max(0, (balk ? h - c - db / 2 : h - 2 * c - db) * s - (balk ? 4 : 0))}
                  fill="none" stroke="#1f2937" strokeWidth={Math.max(1, db * s)} opacity={0.5} rx={3} />
              )}
              {staven.map(([x, y], i) => <circle key={i} cx={px(x)} cy={py(y)} r={rStaaf} fill="#1e3a8a" />)}
              <path d={verhit} fill="none" stroke="#dc2626" strokeWidth={2.6} />
            </g>
          )}
          {breedte > 0 && hoogte > 0 && (
            <text x={cx} y={y1 + 24} textAnchor="middle" style={{ fontSize: 11, fill: "#374151", fontWeight: 700 }}>
              {ELEMENT_B[el - 1].label} · {vloer ? `hs = ${fmt(h)} mm` : `${fmt(b)} × ${fmt(h)} mm`}
            </text>
          )}
          {[
            { c: "#1e3a8a", t: `a = ${fmt(a, 1)} mm${amin > 0 ? ` (tabel ${fmt(amin)} mm)` : ""}` },
            { c: "#7c3aed", t: vloer ? `hs = ${fmt(h)} mm${bmin > 0 ? ` (tabel ${fmt(bmin)} mm)` : ""}` : `b = ${fmt(kolom ? Math.min(b, h) : b)} mm${bmin > 0 ? ` (tabel ${fmt(bmin)} mm)` : ""}` },
          ].map((l, i) => (
            <g key={i}>
              <rect x={W * 0.66} y={H * 0.3 + i * 20} width={12} height={12} fill={l.c} />
              <text x={W * 0.66 + 18} y={H * 0.3 + i * 20 + 10} style={{ fontSize: 10.5, fill: "#374151" }}>{l.t}</text>
            </g>
          ))}
          <text x={W * 0.66} y={H * 0.3 + 58} style={{ fontSize: 10.5, fill: "#374151" }}>
            {UCa !== null && UCb !== null ? `UC maat ${fmt(UCb, 2)} · UC a ${fmt(UCa, 2)} (blad)` : "vul de tabelwaarden in"}
          </text>
        </svg>
      </div>
    </div>
  );

  const voet = (
    <>
      <span>Tabelmethode (NEN-EN 1992-1-2 hoofdstuk 5): de tabelwaarden zijn invoer, uit tabel {tabel} bij R {eis}.
        <br />μ<sub>fi</sub>, de UC en het oordeel komen uit het blad.</span>
      <span className="vd-live">
        {ELEMENT_B[el - 1].label} · eis {eis} min · a = {fmt(a, 1)} mm
        {mu !== null && <> · μ<sub>fi</sub> = {fmt(mu, 2)}</>}
      </span>
    </>
  );

  return { invoer, tekening, voet };
}
