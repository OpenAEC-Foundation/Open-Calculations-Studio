import { useDesigner, Dim, Force, Ro, Defs, HDim, VDim, loadMark, fmt, clamp, JaNee } from "./designerKit";
import { useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het rekenblad "Nagel- en schroefverbinding".
 *
 * Twee aanzichten:
 *   • Doorsnede langs het verbindingsmiddel — de elementen in volgorde van kop
 *     naar punt, met hun dikte, en de nagel of schroef op lengte. Bij een
 *     geprofileerde nagel of schroef is het deel met profiel of draad getekend.
 *   • Aanzicht van het element aan de puntzijde — het patroon van n₁ × n₂
 *     verbindingsmiddelen met de afstanden a₁ tot a₄, de vezelrichting en de
 *     kracht onder de hoek α.
 *
 * Het beeld rekent zelf niets; sterkte, groep en afstandseisen staan in het
 * rekenblad. Alleen de indringdiepte, een zuiver meetkundige maat, staat erbij.
 */
const MARKER = "Nagel- en schroefverbinding";

const OPBOUW = [
  { v: 1, label: "Hout – hout" },
  { v: 2, label: "Hout – hout – hout" },
  { v: 3, label: "Plaat – hout" },
  { v: 4, label: "Staalplaat – hout" },
  { v: 5, label: "Hout – staal – hout" },
];
const MIDDEL = [
  { v: 1, label: "Gladde nagel" },
  { v: 2, label: "Vierkante of gegroefde nagel" },
  { v: 3, label: "Ring- of schroefnagel" },
  { v: 4, label: "Schroef" },
];

// Twee planken C24 van 38 en 71 mm, verbonden met tien gladde nagels 3,4 × 90
// in twee rijen. De schroef- en plaatvelden krijgen waarden die bij deze
// diameter passen, zodat omschakelen geen onzin oplevert.
const DEFAULTS: Record<string, number> = {
  klimaat: 1, duur: 3, opbouw: 1, klasse_1: 6, klasse_2: 6, t_1: 38, t_2: 71,
  plaat: 1, "ρ_pl": 420, t_s: 5,
  middel: 1, d_v: 3.4, l_v: 90, d_h: 8, f_u: 600, d_1: 2.4, l_g: 60,
  f_head_k: 10, f_tens_k: 3.5, "ρ_a": 350, f_ax_in: 12, "α_s": 90,
  f_ax_nk: 4.5, f_head_nk: 10, voorboren: 0, M_y_in: 0, f_head_p: 10,
  n_1: 5, n_2: 2, versprongen: 0, a_1: 40, a_2: 25, a_3: 60, a_4: 25,
  eind: 1, rand: 0, "α": 0, F_v_Ed: 4, F_ax_Ed: 0, ax_lang: 0,
};

type Soort = "hout" | "plaat" | "staal";
interface Laag { soort: Soort; t: number; naam: string | null; label: string }

const VULLING: Record<Soort, { fill: string; stroke: string }> = {
  hout: { fill: "#F5E6C8", stroke: "#8B6F47" },
  plaat: { fill: "#E7DDC7", stroke: "#7C6A4A" },
  staal: { fill: "#dbe7f6", stroke: "#1e40af" },
};

export default function NagelSchroefDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // In de afdruk valt er niets te klikken; dan ook geen aanwijzing daarvoor.
  const afdruk = useAlleenLezen();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const opbouw = clamp(Math.round(d("opbouw")), 1, 5);
  const middel = clamp(Math.round(d("middel")), 1, 4);
  const voorboren = Math.round(d("voorboren")) === 1;
  const t1 = Math.max(0.5, d("t_1")), t2 = Math.max(0.5, d("t_2")), ts = Math.max(0.5, d("t_s"));
  const dv = Math.max(0.5, d("d_v")), lv = Math.max(1, d("l_v")), dh = Math.max(dv, d("d_h"));
  const d1 = Math.min(dv, Math.max(0.3, d("d_1")));
  const lg = Math.max(0, Math.min(lv, middel === 1 ? 0 : d("l_g")));
  const n1 = clamp(Math.round(d("n_1")), 1, 40), n2 = clamp(Math.round(d("n_2")), 1, 12);
  const a1 = Math.max(1, d("a_1")), a2 = Math.max(1, d("a_2")), a3 = Math.max(1, d("a_3")), a4 = Math.max(1, d("a_4"));
  const alfa = clamp(d("α"), 0, 90);
  const eindBelast = Math.round(d("eind")) === 1, randBelast = Math.round(d("rand")) === 1;
  const versprongen = Math.round(d("versprongen")) === 1;
  const Fv = d("F_v_Ed"), Fax = d("F_ax_Ed");

  // Lagen van kop naar punt.
  const lagen: Laag[] =
    opbouw === 1 ? [{ soort: "hout", t: t1, naam: "t_1", label: "t1" }, { soort: "hout", t: t2, naam: "t_2", label: "t2" }]
    : opbouw === 2 ? [{ soort: "hout", t: t1, naam: "t_1", label: "t1" }, { soort: "hout", t: t2, naam: "t_2", label: "t2" }, { soort: "hout", t: t1, naam: null, label: "t1" }]
    : opbouw === 3 ? [{ soort: "plaat", t: t1, naam: "t_1", label: "t1" }, { soort: "hout", t: t2, naam: "t_2", label: "t2" }]
    : opbouw === 4 ? [{ soort: "staal", t: ts, naam: "t_s", label: "ts" }, { soort: "hout", t: t2, naam: "t_2", label: "t2" }]
    : [{ soort: "hout", t: t1, naam: "t_1", label: "t1" }, { soort: "staal", t: ts, naam: "t_s", label: "ts" }, { soort: "hout", t: t1, naam: null, label: "t1" }];
  const dikte = lagen.reduce((s, l) => s + l.t, 0);
  // Indringdiepte: wat van de stift in het laatste element steekt.
  const voorPunt = dikte - lagen[lagen.length - 1].t;
  const tpen = Math.max(0, Math.min(lv - voorPunt, lagen[lagen.length - 1].t));

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(300, box.h - 2 * capH - gap);
  const SH = totH * 0.46, AH = totH - SH;
  // Smalle marges: in de weergave naast de uitwerking is het paneel vaak smal.
  const mL = clamp(W * 0.12, 30, 80), mR = clamp(W * 0.1, 30, 70);

  // doorsnede
  const s = clamp((W - mL - mR) / Math.max(dikte, lv), 0.2, 12);
  const x0 = mL;
  const cy = SH * 0.55;
  const hEl = clamp(SH * 0.42, 56, 150);
  const yTop = cy - hEl / 2, yBot = cy + hEl / 2;
  const laagX: number[] = [];
  lagen.reduce((x, l) => { laagX.push(x); return x + l.t * s; }, x0);
  const xPunt = x0 + lv * s;
  const schachtH = Math.max(2, dv * s), kopH = Math.max(7, dh * s), kernH = Math.max(1.5, d1 * s);
  const punt = Math.min(Math.max(2 * dv * s, 5), lv * s * 0.2);
  const draadX0 = xPunt - lg * s;
  const draadStap = Math.max(3, Math.min(8, dv * s * 0.9));
  const draad = lg > 0 ? Math.floor((lg * s - punt) / draadStap) : 0;
  const pijlAx = Math.min(40, mL - 6);

  // aanzicht met patroon: het element is zo breed als de rijen met hun
  // randafstanden en loopt rechts door (breuklijn). De maten staan onder en
  // rechts, de kracht in een eigen inzet erboven, zodat niets over de
  // verbindingsmiddelen valt.
  const lengte = a3 + (n1 - 1) * a1 + Math.max(a1, a3) * 1.2;
  const hoogte = 2 * a4 + (n2 - 1) * a2;
  const inzetH = 92, onderH = 58, rechtsB = 92;
  const sa = clamp(Math.min((W - mL - rechtsB) / lengte, (AH - inzetH - onderH) / hoogte), 0.05, 8);
  const ax0 = mL;
  const ay0 = inzetH + Math.max(0, (AH - inzetH - onderH - hoogte * sa) / 2);
  const ay1 = ay0 + hoogte * sa;
  const ax1 = ax0 + lengte * sa;
  const px = (i: number) => ax0 + (a3 + i * a1) * sa;
  const py = (i: number, j: number) => ay1 - (a4 + j * a2) * sa - (versprongen && i % 2 === 1 ? dv * sa : 0);
  const rDot = clamp(dv * sa * 0.6, 2.4, 6);
  // maatlijnen: a3 en a1 onder het element (verspringend), a4 en a2 rechts
  const yA3 = ay1 + 16, yA1 = ay1 + 38;
  const xA4 = Math.max(ax1, px(n1 - 1)) + 26, xA2 = xA4 + 40;
  // Kracht op de verbindingsmiddelen: naar het eind als dat belast is, naar de
  // rand als die belast is. Getekend in een inzet boven het element.
  const cxF = clamp((px(0) + px(n1 - 1)) / 2, ax0 + 60, Math.max(ax0 + 60, W - mR - 60)), cyF = inzetH * 0.5;
  const rad = (alfa * Math.PI) / 180;
  const fx = (eindBelast ? -1 : 1) * Math.cos(rad), fy = (randBelast ? 1 : -1) * Math.sin(rad);
  const fl = 38;
  const fxEnd = cxF + fx * fl, fyEnd = cyF + fy * fl;
  // Boogje voor α tussen de vezelrichting (naar het eind of ervan af) en de kracht.
  const rBoog = 24, sx = eindBelast ? -1 : 1;
  const th0 = Math.atan2(0, sx), th1 = Math.atan2(fy, fx);
  let dth = th1 - th0;
  while (dth > Math.PI) dth -= 2 * Math.PI;
  while (dth <= -Math.PI) dth += 2 * Math.PI;
  const boog = `M ${cxF + sx * rBoog} ${cyF} A ${rBoog} ${rBoog} 0 0 ${dth > 0 ? 1 : 0} ${cxF + fx * rBoog} ${cyF + fy * rBoog}`;
  const thMid = th0 + dth / 2;

  const middelLabel = MIDDEL.find((m) => m.v === middel)?.label ?? "";
  const opbouwLabel = OPBOUW.find((o) => o.v === opbouw)?.label ?? "";

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — nagel- en schroefverbinding</strong>
        <span className="vd-uc info">{n1 * n2}× {middelLabel.toLowerCase()} {fmt(dv, 1)} × {fmt(lv)} · {opbouwLabel.toLowerCase()}</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Verbinding</span>
          <label>Opbouw
            <select value={opbouw} onChange={(e) => set("opbouw", parseInt(e.target.value))}>
              {OPBOUW.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Verbindingsmiddel
            <select value={middel} onChange={(e) => set("middel", parseInt(e.target.value))}>
              {MIDDEL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <JaNee label="Voorgeboord" waarde={voorboren} onChange={(v) => set("voorboren", v ? 1 : 0)} />

          <span className="vd-ctrl-h">Patroon</span>
          <label>In een rij n<sub>1</sub>
            <input type="number" step={1} min={1} value={n1} onChange={(e) => set("n_1", parseFloat(e.target.value))} />
          </label>
          <label>Aantal rijen n<sub>2</sub>
            <input type="number" step={1} min={1} value={n2} onChange={(e) => set("n_2", parseFloat(e.target.value))} />
          </label>
          <JaNee label="Rij verspringt 1d" waarde={versprongen} onChange={(v) => set("versprongen", v ? 1 : 0)} />
          <JaNee label="Eind belast" waarde={eindBelast} onChange={(v) => set("eind", v ? 1 : 0)} />
          <JaNee label="Rand belast" waarde={randBelast} onChange={(v) => set("rand", v ? 1 : 0)} />
          <span className="gd-note">Totaal {n1 * n2} stuks; indringdiepte t<sub>pen</sub> = {fmt(tpen)} mm.</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede langs het verbindingsmiddel</div>
            <div className="vd-stage" style={{ width: W, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={SH} className="vd-svg">
                <Defs k="ns" />
                {lagen.map((l, i) => (
                  <rect key={i} x={laagX[i]} y={yTop} width={l.t * s} height={hEl}
                    fill={VULLING[l.soort].fill} stroke={VULLING[l.soort].stroke} strokeWidth={1.3} />
                ))}
                {/* doorsnede van hout: jaarringen als dunne lijnen */}
                {lagen.map((l, i) => l.soort === "hout" && (
                  <g key={`r${i}`} opacity={0.35}>
                    {[0.25, 0.5, 0.75].map((f) => (
                      <line key={f} x1={laagX[i] + 2} y1={yTop + hEl * f} x2={laagX[i] + l.t * s - 2} y2={yTop + hEl * f}
                        stroke="#8B6F47" strokeWidth={0.6} strokeDasharray="5 4" />
                    ))}
                  </g>
                ))}
                {/* verbindingsmiddel */}
                <rect x={x0} y={cy - schachtH / 2} width={Math.max(0, lv * s - punt)} height={schachtH} fill="#9ca3af" stroke="#374151" strokeWidth={0.8} />
                {lg > 0 && (
                  <g>
                    <rect x={draadX0} y={cy - kernH / 2} width={Math.max(0, lg * s - punt)} height={kernH} fill="#6b7280" />
                    {Array.from({ length: Math.max(0, draad) }, (_, k) => (
                      <line key={k} x1={draadX0 + k * draadStap} y1={cy - schachtH / 2 - 1} x2={draadX0 + k * draadStap + draadStap * 0.6} y2={cy + schachtH / 2 + 1}
                        stroke="#374151" strokeWidth={0.9} />
                    ))}
                  </g>
                )}
                <polygon points={`${xPunt - punt},${cy - schachtH / 2} ${xPunt},${cy} ${xPunt - punt},${cy + schachtH / 2}`} fill="#9ca3af" stroke="#374151" strokeWidth={0.8} />
                <rect x={x0 - 3} y={cy - kopH / 2} width={3} height={kopH} fill="#374151" />
                {/* maten: dikte per laag boven, lengte onder */}
                {lagen.map((l, i) => (
                  <HDim key={`m${i}`} k="ns" x0={laagX[i]} x1={laagX[i] + l.t * s} y={yTop - 16} ext={yTop - 3} />
                ))}
                <HDim k="ns" x0={x0} x1={xPunt} y={yBot + 22} ext={cy + schachtH / 2 + 3} />
                {/* dwarskracht: element 1 omhoog, element 2 omlaag */}
                <line x1={laagX[0] + (lagen[0].t * s) / 2} y1={yBot + 46} x2={laagX[0] + (lagen[0].t * s) / 2} y2={yBot + 8}
                  className="vd-load" strokeWidth={2.6} markerEnd={loadMark("ns")} />
                {Fax > 0 && (
                  <line x1={x0 - 4} y1={cy} x2={x0 - pijlAx} y2={cy} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("ns")} />
                )}
              </svg>

              {lagen.map((l, i) => l.naam ? (
                <Dim key={`d${i}`} ctx={ctx} name={l.naam} value={l.t} x={laagX[i] + (l.t * s) / 2} y={yTop - 16} step={l.soort === "staal" ? 1 : 2} label={l.label} dec={l.t % 1 ? 1 : 0} />
              ) : (
                <Ro key={`d${i}`} text={`${l.label}=${fmt(l.t)}`} x={laagX[i] + (l.t * s) / 2} y={yTop - 16} title="gelijk aan element 1" />
              ))}
              <Dim ctx={ctx} name="l_v" value={lv} x={(x0 + xPunt) / 2} y={yBot + 22} step={5} label="l" />
              <Dim ctx={ctx} name="d_v" value={dv} x={Math.min(W - 30, xPunt + 26)} y={cy - 12} step={0.1} label="d" dec={1} />
              <Ro text={`tpen=${fmt(tpen)}`} x={laagX[lagen.length - 1] + (lagen[lagen.length - 1].t * s) / 2} y={yBot - 18}
                title="lengte van de stift in het element aan de puntzijde" />
              <Ro text={`Fv=${fmt(Fv, 1)} kN`} x={laagX[0] + (lagen[0].t * s) / 2} y={yBot + 50} kleur="#dc2626" title="wijzig in het aanzicht hieronder" />
              <Force ctx={ctx} name="F_ax_Ed" value={Fax} x={x0 + 30} y={yTop - 42} unit="kN" label="Fax" step={0.5} dec={1} />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Aanzicht van het element aan de puntzijde</div>
            <div className="vd-stage" style={{ width: W, height: AH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={AH} className="vd-svg">
                <Defs k="np" />
                <path d={`M ${ax1} ${ay0} L ${ax0} ${ay0} L ${ax0} ${ay1} L ${ax1} ${ay1}`} fill="#F5E6C8" stroke="#8B6F47" strokeWidth={1.3} />
                {/* breuklijn: het element loopt rechts door */}
                <path d={`M ${ax1} ${ay0} L ${ax1} ${(ay0 + ay1) / 2 - 5} L ${ax1 - 5} ${(ay0 + ay1) / 2} L ${ax1 + 5} ${(ay0 + ay1) / 2 + 5} L ${ax1} ${(ay0 + ay1) / 2 + 10} L ${ax1} ${ay1}`}
                  fill="#F5E6C8" stroke="#8B6F47" strokeWidth={0.9} strokeDasharray="6 3" />
                {/* vezelrichting */}
                {[0.3, 0.7].map((f) => (
                  <line key={f} x1={ax0 + 4} y1={ay0 + (ay1 - ay0) * f} x2={ax1 - 12} y2={ay0 + (ay1 - ay0) * f}
                    stroke="#8B6F47" strokeWidth={0.5} strokeDasharray="14 6" opacity={0.35} />
                ))}
                {/* eind en rand; belast in rood */}
                <line x1={ax0} y1={ay0} x2={ax0} y2={ay1} stroke={eindBelast ? "#b91c1c" : "#8B6F47"} strokeWidth={eindBelast ? 3 : 1.4} />
                <line x1={ax0} y1={ay1} x2={ax1} y2={ay1} stroke={randBelast ? "#b91c1c" : "#8B6F47"} strokeWidth={randBelast ? 3 : 1.4} />
                {Array.from({ length: n1 }, (_, i) => Array.from({ length: n2 }, (_, j) => (
                  <g key={`${i}-${j}`}>
                    <circle cx={px(i)} cy={py(i, j)} r={rDot} fill="#e5e7eb" stroke="#374151" strokeWidth={1.1} />
                    <circle cx={px(i)} cy={py(i, j)} r={Math.max(0.8, rDot * 0.35)} fill="#374151" />
                  </g>
                )))}
                {/* maten onder en rechts */}
                <HDim k="np" x0={ax0} x1={px(0)} y={yA3} ext={ay1 + 3} />
                {n1 > 1 && <HDim k="np" x0={px(0)} x1={px(1)} y={yA1} ext={py(0, 0) + rDot + 2} />}
                <VDim k="np" y0={py(n1 - 1, 0)} y1={ay1} x={xA4} ext={px(n1 - 1) + rDot + 2} />
                {n2 > 1 && <VDim k="np" y0={py(n1 - 1, 1)} y1={py(n1 - 1, 0)} x={xA2} ext={px(n1 - 1) + rDot + 2} />}
                {/* inzet: richting van de kracht op de verbindingsmiddelen */}
                <line x1={cxF - fl * 1.1} y1={cyF} x2={cxF + fl * 1.1} y2={cyF} stroke="#8B6F47" strokeWidth={0.7} strokeDasharray="8 4" />
                <text x={cxF + fl * 1.1 + 4} y={cyF + 3} fill="#8B6F47" fontSize={10}>vezel</text>
                {alfa > 0.5 && <path d={boog} fill="none" stroke="#b91c1c" strokeWidth={0.9} strokeDasharray="3 2" />}
                <line x1={cxF} y1={cyF} x2={fxEnd} y2={fyEnd} className="vd-load" strokeWidth={2.8} markerEnd={loadMark("np")} />
                <circle cx={cxF} cy={cyF} r={2.6} fill="#b91c1c" />
                <text x={ax0 + 2} y={ay1 + 54} fill="#6b7280" fontSize={10}>
                  rood: {[eindBelast && "belast eind", randBelast && "belaste rand"].filter(Boolean).join(" en ") || "geen belast eind of rand"}
                </text>
              </svg>

              <Dim ctx={ctx} name="a_3" value={a3} x={(ax0 + px(0)) / 2} y={yA3} step={5} label="a3" />
              {n1 > 1 && <Dim ctx={ctx} name="a_1" value={a1} x={(px(0) + px(1)) / 2} y={yA1} step={5} label="a1" />}
              <Dim ctx={ctx} name="a_4" value={a4} x={xA4} y={(py(n1 - 1, 0) + ay1) / 2} step={5} label="a4" />
              {n2 > 1 && <Dim ctx={ctx} name="a_2" value={a2} x={xA2} y={(py(n1 - 1, 1) + py(n1 - 1, 0)) / 2} step={5} label="a2" />}
              <Force ctx={ctx} name="F_v_Ed" value={Fv} x={fxEnd + fx * 30} y={fyEnd + fy * 16 - 10} unit="kN" label="Fv" step={1} dec={1} />
              <Dim ctx={ctx} name="α" value={alfa} x={cxF + Math.cos(thMid) * (rBoog + 20) - (alfa > 0.5 ? 0 : sx * 20)} y={cyF + Math.sin(thMid) * (rBoog + 20) - 10 + (alfa > 0.5 ? 0 : -14)} step={15} label="α" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>
          {afdruk ? "" : "Klik op een blauwe maat of een rode kracht om die te wijzigen — stroomt direct terug in de rekensheet."}
          {!afdruk && <br />}
          De sterkte, de groep en de eisen aan de afstanden staan in het rekenblad.
        </span>
        <span className="vd-live">
          {opbouwLabel} · {middelLabel.toLowerCase()} d = {fmt(dv, 1)} mm, l = {fmt(lv)} mm
          {middel === 4 ? `, kern ${fmt(d1, 1)} mm` : ""}{voorboren ? " · voorgeboord" : ""} ·
          {" "}{n2} × {n1} stuks · a1 = {fmt(a1)} · {n2 > 1 ? `a2 = ${fmt(a2)} · ` : ""}a3 = {fmt(a3)} · a4 = {fmt(a4)} ·
          {" "}α = {fmt(alfa)}° · F<sub>v,Ed</sub> = {fmt(Fv, 1)} kN{Fax > 0 ? ` · F_ax,Ed = ${fmt(Fax, 1)} kN` : ""}
        </span>
      </div>
    </div>
  );
}
