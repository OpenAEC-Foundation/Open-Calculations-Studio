import { useState } from "react";
import { useDesigner, Dim, Force, Ro, Defs, HDim, VDim, loadMark, fmt, clamp } from "./designerKit";
import { useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het rekenblad "Stabiliteit HSB-wanden".
 *
 * Twee aanzichten:
 *   • Plattegrond — de wanden in de beschouwde richting op hun positie x, in de
 *     lastrichting getekend met hun lengte, met de gevel en de werklijn van de
 *     horizontale belasting (midden van de gevel plus de excentriciteit).
 *   • Aanzicht — één wand met zijn panelen, de stijlen op hart-op-hartafstand
 *     en de ankers aan beide einden.
 *
 * Het beeld rekent zelf niets. De sterkte in het wandvlak, de verdeling en de
 * toetsen staan in het rekenblad; zo is er geen tweede rekenweg die uit de pas
 * kan lopen.
 */
const MARKER = "Stabiliteit HSB-wanden";

const WANDEN = [1, 2, 3, 4, 5, 6];

const ZIJDEN = [
  { v: 1, label: "A" }, { v: 2, label: "B" }, { v: 3, label: "A + B" },
  { v: 4, label: "2× A" }, { v: 5, label: "2× B" },
];

// Een woning van 10 m breed: twee gevelwanden en een binnenwand. OSB met
// gladde nagels als beplating A, gipskarton met schroeven als beplating B.
const DEFAULTS: Record<string, number> = {
  klimaat: 1, lastinvoer: 1, F_w_k: 20, F_v_Ed: 30, B_gevel: 10, e_F: 0,
  sterkteklasse: 6, b_st: 38, h_st: 140, hoh: 600, n_eind: 2, h_w: 2600,
  plaat_A: 1, t_A: 12, b_pl_A: 1200, s_A: 100, f_v_A: 6.8,
  bevestiging_A: 1, d_A: 2.8, l_A: 65, bron_A: 1, f_u_A: 600, F_ax_A: 0, ρ_pl_A: 450, F_f_Rd_A: 0.4,
  plaat_B: 5, t_B: 12.5, b_pl_B: 1200, s_B: 100, f_v_B: 6.8,
  bevestiging_B: 3, d_B: 2.75, l_B: 35, bron_B: 1, f_u_B: 600, F_ax_B: 0, ρ_pl_B: 450, F_f_Rd_B: 0.3,
  n_wanden: 3, cat_Q: 1, F_a_Rd: 15, v_Rd: 8, naad: 0, gelijke_k: 0,
  L_1: 3600, zijden_1: 1, x_1: 0, G_k_1: 4, Q_k_1: 2, w_k_1: 0.6,
  L_2: 2400, zijden_2: 3, x_2: 10, G_k_2: 4, Q_k_2: 2, w_k_2: 0.6,
  L_3: 3000, zijden_3: 5, x_3: 5, G_k_3: 6, Q_k_3: 3, w_k_3: 0,
  L_4: 2400, zijden_4: 1, x_4: 2.5, G_k_4: 4, Q_k_4: 2, w_k_4: 0,
  L_5: 2400, zijden_5: 1, x_5: 7.5, G_k_5: 4, Q_k_5: 2, w_k_5: 0,
  L_6: 2400, zijden_6: 1, x_6: 8.5, G_k_6: 4, Q_k_6: 2, w_k_6: 0,
};

export default function HsbStabiliteitDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  const [toon, setToon] = useState(1);
  // In de afdruk valt er niets te klikken; dan ook geen aanwijzing daarvoor.
  const afdruk = useAlleenLezen();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const n = clamp(Math.round(d("n_wanden")), 1, 6);
  const wanden = WANDEN.slice(0, n).map((j) => ({
    j,
    L: Math.max(0, d(`L_${j}`)),
    x: d(`x_${j}`),
    z: Math.round(d(`zijden_${j}`)),
  }));
  const actief = wanden[Math.min(toon, n) - 1];

  const B = Math.max(0.1, d("B_gevel"));
  const eF = d("e_F");
  const xF = B / 2 + eF;
  const lastWind = Math.round(d("lastinvoer")) === 1;
  const F = lastWind ? d("F_w_k") : d("F_v_Ed");
  const hw = Math.max(1, d("h_w"));
  const hoh = Math.max(1, d("hoh"));
  // Beplating A zit erop bij A, A + B en 2× A; alleen B bij B en 2× B.
  const bpl = Math.max(1, actief.z === 2 || actief.z === 5 ? d("b_pl_B") : d("b_pl_A"));

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(260, box.h - 2 * capH - gap);
  const PH = totH * 0.52, AH = totH - PH;
  const mL = clamp(W * 0.08, 36, 64), mR = clamp(W * 0.08, 36, 64);

  // plattegrond: x langs de gevel (m), wandlengte in de lastrichting (mm)
  const xLo = Math.min(0, ...wanden.map((w) => w.x));
  const xHi = Math.max(B, xF, ...wanden.map((w) => w.x));
  const sx = (W - mL - mR) / Math.max(0.001, xHi - xLo);
  const X = (x: number) => mL + (x - xLo) * sx;
  const Lmax = Math.max(1, ...wanden.map((w) => w.L));
  const yGevel = PH - 58;
  const sy = (yGevel - 64) / Lmax;
  const yMid = (yGevel + 14) / 2 + 6;
  // De lengtechip staat op de wand zelf: ernaast botst hij met de chip van een
  // buurwand zodra het tekenvlak smal is. De maat van de gevel staat op een
  // kwart, zodat hij niet onder de werklijn van de last valt.
  const xMaatB = X(0) + (X(B) - X(0)) * (xF > B / 2 ? 0.25 : 0.75);

  // aanzicht van één wand, op schaal
  const se = clamp(Math.min((W - mL - mR - 60) / Math.max(1, actief.L), (AH - 90) / hw), 0.005, 2);
  const ex0 = (W - actief.L * se) / 2, ex1 = ex0 + actief.L * se;
  const ey0 = 34, ey1 = ey0 + hw * se;
  const nPaneel = Math.floor(actief.L / bpl);
  const rest = actief.L - nPaneel * bpl;
  const nStijl = Math.floor(actief.L / hoh);

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — stabiliteit HSB-wanden</strong>
        <span className="vd-uc info">{n} {n === 1 ? "wand" : "wanden"} · gevel {fmt(B, 1)} m</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Wanden</span>
          <label>Aantal
            <select value={n} onChange={(e) => set("n_wanden", parseInt(e.target.value))}>
              {WANDEN.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </label>
          {wanden.map((w) => (
            <div key={w.j} style={{ display: "contents" }}>
              <span className="vd-ctrl-h">Wand {w.j}</span>
              <label>Lengte L (mm)
                <input type="number" step={100} min={0} value={w.L} onChange={(e) => set(`L_${w.j}`, parseFloat(e.target.value))} />
              </label>
              <label>Beplating
                <select value={w.z} onChange={(e) => set(`zijden_${w.j}`, parseInt(e.target.value))}>
                  {ZIJDEN.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label>Positie x (m)
                <input type="number" step={0.5} value={w.x} onChange={(e) => set(`x_${w.j}`, parseFloat(e.target.value))} />
              </label>
            </div>
          ))}
          <span className="gd-note">De belastingen per wand, de beplating en de verankering staan in het rekenblad.</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Plattegrond — wanden in de lastrichting</div>
            <div className="vd-stage" style={{ width: W, height: PH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={PH} className="vd-svg">
                <Defs k="hp" />
                {/* de gevel die de wind vangt */}
                <line x1={X(0)} y1={yGevel} x2={X(B)} y2={yGevel} stroke="#374151" strokeWidth={2.4} />
                <HDim k="hp" x0={X(0)} x1={X(B)} y={yGevel + 16} ext={yGevel + 4} />
                {wanden.map((w) => {
                  const h = Math.max(3, w.L * sy);
                  const kies = w.j === actief.j;
                  return (
                    <g key={w.j} style={{ cursor: "pointer" }} onClick={() => setToon(w.j)}>
                      <rect x={X(w.x) - 4} y={yMid - h / 2} width={8} height={h}
                        fill={kies ? "#B45309" : "#E3C08A"} stroke="#8B6F47" strokeWidth={1} />
                      <text x={X(w.x)} y={yMid - h / 2 - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#374151">{w.j}</text>
                    </g>
                  );
                })}
                {/* werklijn van de belasting */}
                <line x1={X(xF)} y1={PH - 4} x2={X(xF)} y2={yGevel + 4} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("hp")} />
                <line x1={X(B / 2)} y1={16} x2={X(B / 2)} y2={yGevel - 4} stroke="#9CA3AF" strokeWidth={0.9} strokeDasharray="6 4" />
              </svg>

              {wanden.map((w) => (
                <Dim key={w.j} ctx={ctx} name={`L_${w.j}`} value={w.L} x={X(w.x)} y={yMid} step={100} label={`L${w.j}`} />
              ))}
              <Dim ctx={ctx} name="B_gevel" value={B} x={xMaatB} y={yGevel + 16} step={0.5} dec={1} label="B" />
              <Force ctx={ctx} name={lastWind ? "F_w_k" : "F_v_Ed"} value={F} x={X(xF) - 56} y={PH - 16} unit="kN" label={lastWind ? "F_w,k" : "F_v,Ed"} />
              <Dim ctx={ctx} name="e_F" value={eF} x={X(xF) + 40} y={PH - 16} step={0.1} dec={2} label="e" />
              <Ro text="midden" x={X(B / 2)} y={8} />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">
              Aanzicht wand {actief.j}{afdruk ? "" : " — klik in de plattegrond op een wand om die te tonen"}
            </div>
            <div className="vd-stage" style={{ width: W, height: AH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={AH} className="vd-svg">
                <Defs k="ha" />
                {Array.from({ length: nPaneel }, (_, i) => (
                  <rect key={i} x={ex0 + i * bpl * se} y={ey0} width={bpl * se} height={hw * se}
                    fill="#F5E6C8" stroke="#8B6F47" strokeWidth={1} />
                ))}
                {rest > 1 && (
                  <rect x={ex0 + nPaneel * bpl * se} y={ey0} width={rest * se} height={hw * se}
                    fill={rest >= hw / 4 ? "#F5E6C8" : "#E5E7EB"} stroke="#8B6F47" strokeWidth={1} />
                )}
                {Array.from({ length: nStijl + 1 }, (_, i) => (
                  <line key={i} x1={ex0 + i * hoh * se} y1={ey0} x2={ex0 + i * hoh * se} y2={ey1}
                    stroke="#8B6F47" strokeWidth={0.8} strokeDasharray="3 3" />
                ))}
                <rect x={ex0} y={ey0} width={actief.L * se} height={hw * se} fill="none" stroke="#374151" strokeWidth={1.6} />
                <rect x={ex0 - 3} y={ey0} width={6} height={hw * se} fill="#B45309" />
                <rect x={ex1 - 3} y={ey0} width={6} height={hw * se} fill="#B45309" />
                {/* ankers aan beide einden */}
                <line x1={ex0} y1={ey1} x2={ex0} y2={ey1 + 18} stroke="#B45309" strokeWidth={2.2} />
                <line x1={ex1} y1={ey1} x2={ex1} y2={ey1 + 18} stroke="#B45309" strokeWidth={2.2} />
                <line x1={ex0 - 30} y1={ey1 + 1} x2={ex1 + 30} y2={ey1 + 1} stroke="#374151" strokeWidth={1.2} />
                <HDim k="ha" x0={ex0} x1={ex1} y={ey1 + 38} ext={ey1 + 20} />
                <VDim k="ha" y0={ey0} y1={ey1} x={ex0 - 26} ext={ex0 - 6} />
                <HDim k="ha" x0={ex0} x1={ex0 + Math.min(hoh, actief.L) * se} y={ey0 - 14} ext={ey0 - 2} />
              </svg>

              <Dim ctx={ctx} name={`L_${actief.j}`} value={actief.L} x={(ex0 + ex1) / 2} y={ey1 + 38} step={100} label="L" />
              <Dim ctx={ctx} name="h_w" value={hw} x={ex0 - 26} y={(ey0 + ey1) / 2} step={50} label="h" />
              <Dim ctx={ctx} name="hoh" value={hoh} x={ex0 + Math.min(hoh, actief.L) * se / 2} y={ey0 - 14} step={10} label="hoh" />
              {rest > 1 && rest < hw / 4 && (
                <Ro text="telt niet mee" x={ex0 + (nPaneel * bpl + rest / 2) * se} y={(ey0 + ey1) / 2}
                  title="Een paneel smaller dan h/4 draagt niet bij (§9.2.4.2(2))" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De toetsing (sterkte in het wandvlak, verdeling, ankers, eindstijl) staat in het rekenblad.</span>
        <span className="vd-live">
          {wanden.map((w) => `wand ${w.j}: ${fmt(w.L)} mm, ${ZIJDEN.find((o) => o.v === w.z)?.label ?? "?"}, x = ${fmt(w.x, 1)} m`).join(" · ")}
          {" · "}plaatbreedte {fmt(bpl)} mm · hoh {fmt(hoh)} mm · h {fmt(hw)} mm
        </span>
      </div>
    </div>
  );
}
