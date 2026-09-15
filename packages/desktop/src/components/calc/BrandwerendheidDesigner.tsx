import { useDesigner, Ro, Defs, IProfiel, fmt, clamp } from "./designerKit";
import { profiel, profielOpties, omtrek } from "./profielen";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van de brandwerendheid van een stalen profiel.
 *
 * Drie beelden:
 *   • Doorsnede met de bekleding — kokervormig of profielvolgend, drie- of
 *     vierzijdig verhit. De verhitte omtrek is dik rood getekend; dat is
 *     precies wat de profielfactor A_m/V bepaalt.
 *   • ISO 834-brandkromme — de vaste standaardbrandkromme
 *     θ_g = 20 + 345·log₁₀(8t + 1), met de brandwerendheidseis als verticale lijn.
 *   • Reductiefactor k_y,θ — de vaste tabel 3.1 uit EN 1993-1-2. De
 *     benuttingsgraad μ₀ wordt op de k-as afgezet en horizontaal doorgetrokken
 *     naar de kromme; waar hij die snijdt ligt de kritieke staaltemperatuur.
 *
 * Beide krommen zijn normgegevens, geen berekening. De staaltemperatuur in de
 * tijd (§4.2.5) vraagt een incrementele berekening en zit hier bewust nog niet
 * in — daardoor is er ook nog geen tijdstip waarop θ_a,cr bereikt wordt.
 *
 * Nog geen toetsing — zie templates/brandwerendheid.ts.
 */
const MARKER = "Brandwerendheid";

/** EN 1993-1-2 tabel 3.1 — reductiefactor voor de vloeigrens. */
const KY: [number, number][] = [
  [20, 1.0], [100, 1.0], [200, 1.0], [300, 1.0], [400, 1.0], [500, 0.78],
  [600, 0.47], [700, 0.23], [800, 0.11], [900, 0.06], [1000, 0.04], [1100, 0.02], [1200, 0.0],
];
/** Lineaire interpolatie in tabel 3.1. */
function kyTheta(T: number): number {
  if (T <= 20) return 1;
  if (T >= 1200) return 0;
  for (let i = 1; i < KY.length; i++) {
    const [T0, k0] = KY[i - 1], [T1, k1] = KY[i];
    if (T <= T1) return k0 + ((k1 - k0) * (T - T0)) / (T1 - T0);
  }
  return 0;
}
/** Omgekeerd: bij welke temperatuur zakt k_y,θ tot μ₀? Aflezing, geen formule. */
function thetaBijK(k: number): number {
  if (k >= 1) return 400;
  if (k <= 0) return 1200;
  for (let i = 1; i < KY.length; i++) {
    const [T0, k0] = KY[i - 1], [T1, k1] = KY[i];
    if (k >= k1 && k <= k0) return T0 + ((k - k0) * (T1 - T0)) / (k1 - k0);
  }
  return 1200;
}
/** ISO 834 standaardbrandkromme, t in minuten. */
const isoT = (t: number) => 20 + 345 * Math.log10(8 * t + 1);

const MATERIAAL: { v: number; label: string; lam: number; rho: number; c: number }[] = [
  { v: 1, label: "Gipskartonplaat", lam: 0.2, rho: 800, c: 1700 },
  { v: 2, label: "Vermiculiet-/perlietplaat", lam: 0.15, rho: 550, c: 1200 },
  { v: 3, label: "Spuitmortel", lam: 0.12, rho: 350, c: 1200 },
  { v: 4, label: "Steenwol", lam: 0.045, rho: 140, c: 1050 },
];

const DEFAULTS: Record<string, number> = {
  profiel: 5, eis_min: 60, verhitting: 4, schema: 1, benutting: 0.45,
  bekleed: 1, beklvorm: 1, beklmateriaal: 1,
  d_p: 18, lambda_p: 0.2, rho_p: 800, c_p: 1700,
};

export default function BrandwerendheidDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const profId = Math.round(d("profiel"));
  const p = profiel(profId, 5);
  const eis = Math.round(d("eis_min"));
  const zijden = (Math.round(d("verhitting")) === 3 ? 3 : 4) as 3 | 4;
  const schema = Math.round(d("schema"));
  const mu = clamp(d("benutting"), 0.01, 1);
  const bekleed = Math.round(d("bekleed")) === 1;
  const vorm = Math.round(d("beklvorm"));          // 1 = koker, 2 = profielvolgend
  const mat = Math.round(d("beklmateriaal"));
  const dp = Math.max(0, d("d_p"));
  const lam = d("lambda_p"), rho = d("rho_p"), cp = d("c_p");

  // Profielfactor — pure geometrie, geen toetsing.
  const Am = omtrek(p, bekleed && vorm === 1, zijden);       // mm per m'
  const AmV = (Am / p.A) * 1000;                              // 1/m
  const Tcr = thetaBijK(mu);                                  // aflezing uit tabel 3.1

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(260, box.h - 2 * capH - gap);
  const DH = Math.max(120, totH * 0.40), GH = totH - DH;

  // doorsnede
  const sD = clamp(Math.min((W * 0.44 - 60) / (p.b + 2 * dp), (DH - 46) / (p.h + 2 * dp)), 0.02, 2);
  const dcx = W * 0.26, dcy = DH * 0.50;
  const dpPx = dp * sD, bw = (p.b * sD) / 2, bh = (p.h * sD) / 2;

  // grafieken naast elkaar
  const gW = (W - gap) / 2;
  const mL = 46, mR = 14, mT = 18, mB = 30;
  const cw = Math.max(40, gW - mL - mR), ch = Math.max(40, GH - mT - mB);
  const tMax = Math.max(120, eis * 1.6);
  const Tmax = 1200;
  const gx1 = (t: number) => mL + (t / tMax) * cw;
  const gy1 = (T: number) => mT + ch - (T / Tmax) * ch;
  const iso = Array.from({ length: 81 }, (_, i) => {
    const t = (tMax * i) / 80;
    return `${i === 0 ? "M" : "L"} ${gx1(t).toFixed(1)} ${gy1(isoT(t)).toFixed(1)}`;
  }).join(" ");

  const ox2 = gW + gap;
  const gx2 = (k: number) => ox2 + mL + k * cw;
  const gy2 = (T: number) => mT + ch - (T / Tmax) * ch;
  const kCurve = Array.from({ length: 121 }, (_, i) => {
    const T = (Tmax * i) / 120;
    return `${i === 0 ? "M" : "L"} ${gx2(kyTheta(T)).toFixed(1)} ${gy2(T).toFixed(1)}`;
  }).join(" ");

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — brandwerendheid</strong>
        <span className="vd-uc info">A<sub>m</sub>/V = {fmt(AmV)} 1/m · θ<sub>a,cr</sub> ≈ {fmt(Tcr)} °C</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Profiel en eis</span>
          <label>Staalprofiel
            <select value={profId} onChange={(e) => set("profiel", parseInt(e.target.value))}>
              {profielOpties().map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
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
              <option value={3}>Driezijdig (vloer erop)</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Schema
            <select style={{ width: "100%" }} value={schema} onChange={(e) => set("schema", parseInt(e.target.value))}>
              <option value={1}>Statisch bepaald</option>
              <option value={2}>Statisch onbepaald</option>
            </select>
          </label>
          <label title="Verhouding van de belasting in brand tot de weerstand bij normale temperatuur">Benuttingsgraad μ<sub>0</sub>
            <input type="number" step={0.05} min={0.01} max={1} value={mu} onChange={(e) => set("benutting", parseFloat(e.target.value))} />
          </label>

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
              <label>λ<sub>p</sub> (W/mK)
                <input type="number" step={0.01} value={lam} onChange={(e) => set("lambda_p", parseFloat(e.target.value))} />
              </label>
              <label>ρ<sub>p</sub> (kg/m³)
                <input type="number" step={50} value={rho} onChange={(e) => set("rho_p", parseFloat(e.target.value))} />
              </label>
              <label>c<sub>p</sub> (J/kgK)
                <input type="number" step={50} value={cp} onChange={(e) => set("c_p", parseFloat(e.target.value))} />
              </label>
            </>
          )}
          <span className="gd-note">Verhitte omtrek A<sub>m</sub> = {fmt(Am)} mm/m' · A = {fmt(p.A)} mm² →
            profielfactor A<sub>m</sub>/V = {fmt(AmV)} 1/m.</span>
          <span className="gd-note">Bij μ<sub>0</sub> = {fmt(mu, 2)} hoort k<sub>y,θ</sub> = μ<sub>0</sub> op θ ≈ {fmt(Tcr)} °C
            (afgelezen uit tabel 3.1).</span>
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
                    <text x={dcx} y={dcy - bh - dpPx - 22} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>vloer — niet verhit</text>
                  </g>
                )}
                <text x={dcx} y={dcy + bh + dpPx + 26} textAnchor="middle" style={{ fontSize: 11, fill: "#1e40af", fontWeight: 700 }}>{p.naam}</text>
              </svg>

              <Ro text={`Am/V = ${fmt(AmV)} 1/m`} x={dcx + bw + dpPx + 90} y={dcy - 10} kleur="#dc2626"
                title="profielfactor: verhitte omtrek gedeeld door het staaloppervlak" />
              {bekleed && dp > 0 && <Ro text={`dp=${fmt(dp)}`} x={dcx + bw + dpPx + 90} y={dcy + 14} kleur="#b45309" />}
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">ISO 834-brandkromme en reductiefactor k<sub>y,θ</sub> (EN 1993-1-2 tabel 3.1)</div>
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
                {[30, 60, 90, 120].filter((t) => t <= tMax).map((t) => (
                  <g key={t}>
                    <line x1={gx1(t)} y1={mT + ch} x2={gx1(t)} y2={mT + ch + 4} stroke="#9ca3af" strokeWidth={1} />
                    <text x={gx1(t)} y={mT + ch + 15} textAnchor="middle" style={{ fontSize: 9, fill: "#6b7280" }}>{t}′</text>
                  </g>
                ))}
                <path d={iso} fill="none" stroke="#dc2626" strokeWidth={2.2} />
                <text x={mL + cw * 0.52} y={gy1(isoT(tMax * 0.55)) - 8} style={{ fontSize: 10, fill: "#dc2626", fontWeight: 700 }}>ISO 834</text>
                {/* de eis als verticale lijn */}
                <line x1={gx1(eis)} y1={mT} x2={gx1(eis)} y2={mT + ch} stroke="#1e40af" strokeWidth={1.6} strokeDasharray="6 4" />
                <text x={gx1(eis) + 5} y={mT + 11} style={{ fontSize: 10, fill: "#1e40af", fontWeight: 700 }}>eis {eis}′</text>

                {/* ── rechts: reductiefactor tegen temperatuur ── */}
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
                <path d={kCurve} fill="none" stroke="#dc2626" strokeWidth={2.2} />
                <text x={ox2 + mL + cw * 0.06} y={mT + 12} style={{ fontSize: 10, fill: "#dc2626", fontWeight: 700 }}>k<tspan baselineShift="sub">y,θ</tspan></text>
                {/* μ0 afgezet en doorgetrokken naar de kromme */}
                <line x1={gx2(mu)} y1={mT + ch} x2={gx2(mu)} y2={gy2(Tcr)} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5 3" />
                <line x1={gx2(mu)} y1={gy2(Tcr)} x2={ox2 + mL} y2={gy2(Tcr)} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5 3" />
                <circle cx={gx2(mu)} cy={gy2(Tcr)} r={4} fill="#fff" stroke="#16a34a" strokeWidth={2} />
                <text x={gx2(mu) + 8} y={gy2(Tcr) - 7} style={{ fontSize: 10.5, fill: "#16a34a", fontWeight: 700 }}>
                  μ₀ = {fmt(mu, 2)} → {fmt(Tcr)} °C
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Beide krommen zijn normgegevens: de ISO 834-kromme en tabel 3.1 uit EN 1993-1-2.
          <br />De staaltemperatuur in de tijd vraagt de incrementele berekening van §4.2.5 en volgt met de toetsing.</span>
        <span className="vd-live">
          {p.naam} · eis {eis} min · {zijden}-zijdig verhit · {bekleed ? `${vorm === 1 ? "kokervormig" : "profielvolgend"} bekleed, ${MATERIAAL.find((m) => m.v === mat)?.label} ${fmt(dp)} mm` : "onbekleed"} ·
          λ<sub>p</sub> = {fmt(lam, 2)} W/mK · ρ<sub>p</sub> = {fmt(rho)} kg/m³ · c<sub>p</sub> = {fmt(cp)} J/kgK ·
          A<sub>m</sub>/V = {fmt(AmV)} 1/m · {schema === 1 ? "statisch bepaald" : "statisch onbepaald"} ·
          μ<sub>0</sub> = {fmt(mu, 2)} → θ<sub>a,cr</sub> ≈ {fmt(Tcr)} °C
        </span>
      </div>
    </div>
  );
}
