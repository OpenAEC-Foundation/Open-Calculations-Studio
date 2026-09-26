import type { ReactNode } from "react";
import { useDesigner, Ro, Defs, IProfiel, fmt, clamp, UitkomstKop } from "./designerKit";
import { profiel, profielOpties, omtrek } from "./profielen";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van de brandwerendheid van een stalen profiel.
 *
 * Drie beelden:
 *   • Doorsnede met de bekleding — kokervormig of profielvolgend, drie- of
 *     vierzijdig verhit. De verhitte omtrek is dik rood getekend; dat is
 *     precies wat de profielfactor A_m/V of A_p/V bepaalt.
 *   • Temperatuur in de tijd — de ISO 834-kromme en de staaltemperatuur, met
 *     de eis als verticale lijn en de kritieke temperatuur als horizontale.
 *     Waar de staal die lijn kruist, ligt de brandwerendheid van het profiel.
 *   • Kritieke temperatuur — de benuttingsgraad tegen de temperatuur: zonder
 *     instabiliteit de kromme (4.22), bij kip of knik χ_fi·k_y,θ. Waar de
 *     benutting de kromme snijdt, ligt θ_a,cr.
 *
 * De staaltemperatuur rekent het beeld zelf, op dezelfde manier als het blad
 * (EN 1993-1-2 §4.2.5, stap 5 s onbekleed en 30 s bekleed), om hem als
 * kromme te kunnen tekenen. De kritieke temperatuur, de benutting, de UC en het
 * oordeel komen uit het doorgerekende blad (templates/brandwerendheid.ts); de
 * stip op de eis is de staaltemperatuur van het blad, zodat een verschil
 * meteen zichtbaar is.
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
  { v: 2, label: "Vermiculiet-/perlietplaat", lam: 0.15, rho: 550, c: 1200 },
  { v: 3, label: "Spuitmortel", lam: 0.12, rho: 350, c: 1200 },
  { v: 4, label: "Steenwol", lam: 0.2, rho: 150, c: 1200 },
];

const WERKING: { v: number; label: string }[] = [
  { v: 1, label: "Ligger, kip verhinderd" },
  { v: 2, label: "Ligger, kip mogelijk" },
  { v: 3, label: "Kolom op centrische druk" },
  { v: 4, label: "Trekstaaf" },
];

const DEFAULTS: Record<string, number> = {
  profiel: 5, staalsoort: 235, werking: 1, eis_min: 60, verhitting: 4, schema: 1,
  bron_fi: 1, M_Ed: 50, N_Ed: 500, η_fi: 0.7, M_fi: 35, N_fi: 350,
  L_kip: 5, C_1: 1.13, C_2: -0.45, L_fi: 3,
  bekleed: 1, beklvorm: 1, beklmateriaal: 1, d_p: 18, lambda_p: 0.2, rho_p: 800, c_p: 1700,
};

export default function BrandwerendheidDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // De uitkomst van het blad zelf: θ_a,cr, μ₀, UC en oordeel. Vóór de return
  // hieronder, zodat de volgorde van de hooks vast blijft.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;
  const g = uitkomst?.getallen ?? {};
  const uitBlad = (naam: string): number | null => (Number.isFinite(g[naam]) ? g[naam] : null);

  const profId = Math.round(d("profiel"));
  const p = profiel(profId, 5);
  const fy = Math.round(d("staalsoort"));
  const werking = clamp(Math.round(d("werking")), 1, 4);
  const buiging = werking <= 2;
  const eis = Math.round(d("eis_min"));
  const zijden = (Math.round(d("verhitting")) === 3 ? 3 : 4) as 3 | 4;
  const schema = Math.round(d("schema"));
  const bron = Math.round(d("bron_fi")) === 2 ? 2 : 1;
  const bekleed = Math.round(d("bekleed")) === 1;
  const vorm = Math.round(d("beklvorm"));          // 1 = koker, 2 = profielvolgend
  const mat = Math.round(d("beklmateriaal"));
  const dp = Math.max(0, d("d_p"));
  const lam = d("lambda_p"), rho = d("rho_p"), cp = d("c_p");

  // Profielfactor — pure geometrie.
  const Am = omtrek(p, bekleed && vorm === 1, zijden);       // mm per m'
  const AmV = (Am / p.A) * 1000;                              // 1/m
  const AbV = (omtrek(p, true, zijden) / p.A) * 1000;         // kastwaarde
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
  const instab = (werking === 2 || werking === 3) && lamFi !== null;
  const muR = instab && Efi !== null && R0 !== null && R0 > 0 ? Efi / R0 : mu0;
  const alfa = 0.65 * Math.sqrt(235 / fy);
  const rFi = (T: number) => {
    const l = (lamFi ?? 0) * Math.sqrt(kyTheta(T) / kETheta(T));
    const phi = 0.5 * (1 + alfa * l + l * l);
    return kyTheta(T) / (phi + Math.sqrt(phi * phi - l * l));
  };
  // Klasse 4 (het blad toont dan geen μ₀) of μ₀ > 1: θ_a,cr volgt dan niet uit een kromme.
  const klasse4 = Tcr !== null && mu0 === null;
  const opKromme = Tcr !== null && !klasse4 && muR !== null && mu0 !== null && mu0 <= 1;
  const tKr = Tcr !== null ? kromme.find(([, T]) => T >= Tcr)?.[0] ?? null : null;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(260, box.h - 2 * capH - gap);
  const DH = Math.max(120, totH * 0.40), GH = totH - DH;

  // doorsnede
  const sD = clamp(Math.min((W * 0.44 - 60) / (p.b + 2 * dp), (DH - 46) / (p.h + 2 * dp)), 0.02, 2);
  const dcx = W * 0.26, dcy = DH * 0.50;
  const dpPx = bekleed ? dp * sD : 0, bw = (p.b * sD) / 2, bh = (p.h * sD) / 2;

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
  const staal = kromme.filter((_, i) => i % stap === 0 || i === kromme.length - 1)
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

  const numveld = (naam: string, label: ReactNode, stapje: number) => (
    <label>{label}
      <input type="number" step={stapje} value={d(naam)} onChange={(e) => set(naam, parseFloat(e.target.value))} />
    </label>
  );

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — brandwerendheid" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Profiel en eis</span>
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
          <label>Brandwerendheidseis
            <select value={eis} onChange={(e) => set("eis_min", parseInt(e.target.value))}>
              {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minuten</option>)}
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
                {numveld("η_fi", <>η<sub>fi</sub></>, 0.05)}
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
          <span className="gd-note">Verhitte omtrek {fmt(Am)} mm/m' · A = {fmt(p.A)} mm² →
            {bekleed ? <> A<sub>p</sub>/V</> : <> A<sub>m</sub>/V</>} = {fmt(AmV)} 1/m{!bekleed && <>, k<sub>sh</sub> = {fmt(ksh, 2)}</>}.</span>
          <span className="gd-note">
            {Tcr === null
              ? "De kritieke temperatuur volgt uit het blad."
              : <>θ<sub>a,cr</sub> = {fmt(Tcr)} °C (blad){Tat !== null && <>; na {eis} min θ<sub>a</sub> = {fmt(Tat)} °C</>}
                  {tKr !== null ? <>; bereikt na {fmt(tKr)} min.</> : <>; niet bereikt binnen {fmt(tMax)} min.</>}</>}
          </span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
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
                  <path d={`M ${dcx - bw - dpPx} ${dcy - bh - dpPx} h ${2 * (bw + dpPx)} v ${2 * dpPx + Math.max(2, p.tf * sD)}
                            h ${-(bw + dpPx - Math.max(2, p.tw * sD) / 2 - dpPx)} v ${2 * bh - 2 * Math.max(2, p.tf * sD) - 2 * dpPx}
                            h ${bw + dpPx - Math.max(2, p.tw * sD) / 2 - dpPx} v ${2 * dpPx + Math.max(2, p.tf * sD)}
                            h ${-2 * (bw + dpPx)} v ${-(2 * dpPx + Math.max(2, p.tf * sD))}
                            h ${bw + dpPx - Math.max(2, p.tw * sD) / 2 - dpPx} v ${-(2 * bh - 2 * Math.max(2, p.tf * sD) - 2 * dpPx)}
                            h ${-(bw + dpPx - Math.max(2, p.tw * sD) / 2 - dpPx)} Z`}
                    fill="#fef3c7" stroke="#b45309" strokeWidth={1.3} />
                ))}
                {/* het profiel */}
                <IProfiel cx={dcx} cy={dcy} h={p.h} b={p.b} tw={p.tw} tf={p.tf} s={sD} />
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
                    <text x={dcx} y={dcy - bh - dpPx - 22} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>vloer of wand — niet verhit</text>
                  </g>
                )}
                <text x={dcx} y={dcy + bh + dpPx + 26} textAnchor="middle" style={{ fontSize: 11, fill: "#1e40af", fontWeight: 700 }}>{p.naam} S{fy}</text>
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
                <path d={staal} fill="none" stroke="#1e3a8a" strokeWidth={2.2} />
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
                      {klasse4 ? "klasse 4: θa,cr = 350 °C" : "μ₀ > 1: bezwijkt al bij 20 °C"}
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>De ISO 834-kromme, tabel 3.1 en (4.22) zijn normgegevens; de staalkromme volgt §4.2.5 met stappen van {bekleed ? "30" : "5"} s.
          <br />θ<sub>a,cr</sub>, μ<sub>0</sub>, de UC en het oordeel komen uit het blad.</span>
        <span className="vd-live">
          {p.naam} S{fy} · {WERKING.find((w) => w.v === werking)?.label.toLowerCase()} · eis {eis} min · {zijden}-zijdig verhit ·{" "}
          {bekleed ? `${vorm === 1 ? "kokervormig" : "profielvolgend"} bekleed, ${MATERIAAL.find((m) => m.v === mat)?.label} ${fmt(dp)} mm` : "onbekleed"} ·
          {bekleed ? <> A<sub>p</sub>/V</> : <> A<sub>m</sub>/V</>} = {fmt(AmV)} 1/m
          {mu0 !== null && mu0 > 0 && <> · μ<sub>0</sub> = {fmt(mu0, 2)}</>}
          {Tcr !== null && <> · θ<sub>a,cr</sub> = {fmt(Tcr)} °C</>}
          {Tat !== null && <> · θ<sub>a</sub>({eis}′) = {fmt(Tat)} °C</>}
        </span>
      </div>
    </div>
  );
}
