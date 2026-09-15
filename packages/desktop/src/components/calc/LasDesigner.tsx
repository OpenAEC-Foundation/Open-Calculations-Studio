import type { ReactNode } from "react";
import { useDesigner, Force, Ro, Defs, loadMark, fmt, clamp } from "./designerKit";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een hoeklas onder de zes belastingcomponenten.
 *
 * Het referentieprogramma toont hier een vast plaatje; dit beeld is
 * parametrisch: de lasfiguur L × b wordt in isometrie getekend, de keeldikte a
 * als driehoek in het bijgevoegde keeldetail, en elke belastingcomponent
 * verschijnt alleen als hij ongelijk aan nul is — zo blijft zichtbaar welke
 * componenten de verbinding werkelijk belasten.
 *
 * Isometrie met een simpele schuine projectie: x naar rechts, y in de diepte
 * (schuin omhoog-links), z omhoog. Dat is genoeg om de assen van de zes
 * componenten ondubbelzinnig te tonen.
 *
 * Nog geen toetsing — zie templates/lasberekening.ts.
 */
const MARKER = "Lasberekening";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];

const DEFAULTS: Record<string, number> = {
  staalsoort: 235, typelas: 1, langeverb: 0,
  L_las: 200, b_las: 120, a_las: 6,
  F_xEd: 0, F_yEd: 0, F_zEd: 0, M_xEd: 0, M_yEd: 0, M_zEd: 0,
};

export default function LasDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const fy = Math.round(d("staalsoort"));
  const type = Math.round(d("typelas"));
  const lang = Math.round(d("langeverb"));
  const L = Math.max(1, d("L_las")), b = Math.max(1, d("b_las")), a = Math.max(0.5, d("a_las"));
  const Fx = d("F_xEd"), Fy = d("F_yEd"), Fz = d("F_zEd");
  const Mx = d("M_xEd"), My = d("M_yEd"), Mz = d("M_zEd");

  // Kerngrootheden van de lasfiguur — geometrie, nog geen weerstand.
  const A_las = type === 1 ? 2 * a * L : a * L;     // dubbele hoeklas resp. stomplas
  const W_las = (2 * a * L * L) / 6;                // weerstandsmoment om de sterke as
  const belast = Fx || Fy || Fz || Mx || My || Mz;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(220, box.h - 2 * capH - gap);
  const IH = totH * 0.68, KH = totH - IH;            // isometrie / keeldetail

  // schuine projectie
  const dep = 0.42;                                   // diepteverkorting
  const ang = -0.52;                                  // rad, richting van de diepte-as
  const sMax = Math.min((W - 150) / (L + b * dep * 1.6), (IH - 96) / (b * 0.9 + b * dep));
  const s = clamp(sMax, 0.05, 1.4);
  const P = (x: number, y: number, z: number): [number, number] => [
    x * s + y * dep * s * Math.cos(ang), -z * s + y * dep * s * Math.sin(ang),
  ];
  const ox = W * 0.44, oy = IH * 0.56;
  const pt = (x: number, y: number, z: number) => {
    const [dx, dy] = P(x, y, z);
    return `${(ox + dx).toFixed(1)},${(oy + dy).toFixed(1)}`;
  };
  const p2 = (x: number, y: number, z: number): [number, number] => {
    const [dx, dy] = P(x, y, z);
    return [ox + dx, oy + dy];
  };

  // Het lasvlak ligt in het xz-vlak op y = 0: L in de x-richting, b in de z.
  const vlak = `${pt(-L / 2, 0, 0)} ${pt(L / 2, 0, 0)} ${pt(L / 2, 0, b)} ${pt(-L / 2, 0, b)}`;
  // Het aangelaste plaatdeel steekt in de y-richting weg.
  const flens = `${pt(-L / 2, 0, 0)} ${pt(L / 2, 0, 0)} ${pt(L / 2, b * 1.15, 0)} ${pt(-L / 2, b * 1.15, 0)}`;

  /** Rechte pijl van punt naar punt, met label. */
  const Pijl = ({ from, to, kleur = "#dc2626" }: { from: [number, number]; to: [number, number]; kleur?: string }) => (
    <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={kleur} strokeWidth={2.6} markerEnd={loadMark("li")} />
  );
  /** Gebogen pijl die een moment om een as aanduidt. */
  const Boog = ({ c, r, kleur = "#dc2626" }: { c: [number, number]; r: number; kleur?: string }) => (
    <path d={`M ${c[0] - r} ${c[1]} A ${r} ${r * 0.55} 0 1 1 ${c[0] + r} ${c[1]}`}
      fill="none" stroke={kleur} strokeWidth={2.2} markerEnd={loadMark("li")} />
  );

  const O = p2(0, 0, b / 2);
  const komp: { naam: string; v: number; el: ReactNode; lx: number; ly: number; eenheid: string }[] = [
    { naam: "F_xEd", v: Fx, eenheid: "kN", lx: p2(L / 2, 0, b)[0] + 20, ly: p2(L / 2, 0, b)[1] - 54,
      el: <Pijl from={p2(L / 2, 0, b)} to={[p2(L / 2, 0, b)[0], p2(L / 2, 0, b)[1] - 46]} /> },
    { naam: "F_yEd", v: Fy, eenheid: "kN", lx: p2(L / 2, b, 0)[0] + 26, ly: p2(L / 2, b, 0)[1] + 10,
      el: <Pijl from={p2(L / 2, 0, 0)} to={p2(L / 2, b * 1.5, 0)} /> },
    { naam: "F_zEd", v: Fz, eenheid: "kN", lx: p2(-L / 2, 0, 0)[0] - 78, ly: p2(-L / 2, 0, b / 2)[1] - 6,
      el: <Pijl from={[p2(-L / 2, 0, b / 2)[0] - 62, p2(-L / 2, 0, b / 2)[1]]} to={p2(-L / 2, 0, b / 2)} /> },
    { naam: "M_xEd", v: Mx, eenheid: "kNm", lx: O[0] - 18, ly: O[1] - 62,
      el: <Boog c={[O[0], O[1] - 34]} r={Math.max(16, L * s * 0.16)} /> },
    { naam: "M_yEd", v: My, eenheid: "kNm", lx: p2(L / 2, b, 0)[0] + 4, ly: p2(L / 2, b, 0)[1] + 40,
      el: <Boog c={[p2(L / 2, b * 0.6, 0)[0], p2(L / 2, b * 0.6, 0)[1] + 26]} r={Math.max(14, b * s * 0.2)} /> },
    { naam: "M_zEd", v: Mz, eenheid: "kNm", lx: p2(-L / 2, 0, 0)[0] - 74, ly: p2(-L / 2, 0, 0)[1] + 34,
      el: <Boog c={[p2(-L / 2, 0, 0)[0] - 34, p2(-L / 2, 0, 0)[1] + 22]} r={Math.max(14, L * s * 0.12)} /> },
  ];

  // keeldetail
  const kS = clamp((KH - 42) / (a * 2.4), 0.6, 9);
  const kx = W * 0.30, ky = KH * 0.74, aP = a * kS;

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — lasberekening</strong>
        <span className="vd-uc info">a = {fmt(a)} mm · A<sub>w</sub> = {fmt(A_las)} mm²</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Hoeklas</span>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Type las
            <select style={{ width: "100%" }} value={type} onChange={(e) => set("typelas", parseInt(e.target.value))}>
              <option value={1}>Hoeklas</option>
              <option value={2}>Stompe las (volledige doorlassing)</option>
            </select>
          </label>
          <label>Lengte L (mm)
            <input type="number" step={10} value={L} onChange={(e) => set("L_las", parseFloat(e.target.value))} />
          </label>
          <label>Breedte b (mm)
            <input type="number" step={10} value={b} onChange={(e) => set("b_las", parseFloat(e.target.value))} />
          </label>
          <label>Keeldikte a (mm)
            <input type="number" step={1} min={1} value={a} onChange={(e) => set("a_las", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="Bij lange lassen wordt de weerstand gereduceerd met β_Lw (EN 1993-1-8 §4.11)">Lange verbinding
            <select style={{ width: "100%" }} value={lang} onChange={(e) => set("langeverb", parseInt(e.target.value))}>
              <option value={0}>niet van toepassing</option>
              <option value={1}>overlapverbinding β_Lw,1</option>
              <option value={2}>langsstijver β_Lw,2</option>
            </select>
          </label>
          <span className="gd-note">Keelvlak A<sub>w</sub> = {fmt(A_las)} mm² · W<sub>w</sub> = {fmt(W_las)} mm³ (om de sterke as).</span>

          <span className="vd-ctrl-h">Belastingen</span>
          {([["F_xEd", "F", "x", "kN"], ["F_yEd", "F", "y", "kN"], ["F_zEd", "F", "z", "kN"],
             ["M_xEd", "M", "x", "kNm"], ["M_yEd", "M", "y", "kNm"], ["M_zEd", "M", "z", "kNm"]] as const).map(([nm, sym, sub, eh]) => (
            <label key={nm}>{sym}<sub>{sub},Ed</sub> ({eh})
              <input type="number" step={sym === "F" ? 10 : 5} value={d(nm)} onChange={(e) => set(nm, parseFloat(e.target.value))} />
            </label>
          ))}
          {!belast && <span className="gd-note">Alle componenten zijn nul — vul er één in om de pijl in het beeld te zien.</span>}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Lasfiguur en belastingcomponenten</div>
            <div className="vd-stage" style={{ width: W, height: IH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={IH} className="vd-svg">
                <Defs k="li" />
                {/* aangelast plaatdeel, liggend */}
                <polygon points={flens} fill="#eef2f7" stroke="#1e40af" strokeWidth={1.3} />
                {/* het lasvlak, staand */}
                <polygon points={vlak} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.6} />
                {/* de las zelf als band langs de voet */}
                <polygon points={`${pt(-L / 2, 0, 0)} ${pt(L / 2, 0, 0)} ${pt(L / 2, 0, Math.min(b * 0.16, a * 3))} ${pt(-L / 2, 0, Math.min(b * 0.16, a * 3))}`}
                  fill="#1e40af" fillOpacity={0.35} stroke="#1e40af" strokeWidth={1} />
                {/* assenkruis in het hart */}
                <line x1={O[0]} y1={O[1]} x2={p2(L / 2, 0, b / 2)[0]} y2={p2(L / 2, 0, b / 2)[1]}
                  stroke="#dc2626" strokeWidth={0.9} strokeDasharray="7 3 2 3" />
                {/* alleen de componenten die daadwerkelijk belasten */}
                {komp.map((k) => k.v !== 0 && <g key={k.naam}>{k.el}</g>)}
              </svg>

              {komp.map((k) => k.v !== 0 && (
                <Force key={k.naam} ctx={ctx} name={k.naam} value={k.v} x={k.lx} y={k.ly}
                  unit={k.eenheid} label={k.naam.replace("_", "").replace("Ed", "")} step={k.eenheid === "kN" ? 10 : 5} />
              ))}
              <Ro text={`L = ${fmt(L)}`} x={ox} y={p2(0, 0, 0)[1] + 26} title="lengte van de lasfiguur" />
              <Ro text={`b = ${fmt(b)}`} x={p2(-L / 2, 0, b / 2)[0] - 30} y={p2(-L / 2, 0, b / 2)[1] + 26} title="breedte van de lasfiguur" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Keeldetail</div>
            <div className="vd-stage" style={{ width: W, height: KH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={KH} className="vd-svg">
                <Defs k="lk" />
                {/* de twee te verbinden delen */}
                <rect x={kx - aP * 3.4} y={ky} width={aP * 7} height={Math.max(5, aP * 0.9)} fill="#eef2f7" stroke="#374151" strokeWidth={1.2} />
                <rect x={kx - Math.max(3, aP * 0.45)} y={ky - aP * 4} width={Math.max(5, aP * 0.9)} height={aP * 4} fill="#eef2f7" stroke="#374151" strokeWidth={1.2} />
                {/* de hoeklas aan weerszijden, met het keelvlak gestippeld */}
                {[-1, 1].map((zij) => (
                  <g key={zij}>
                    <path d={`M ${kx + zij * Math.max(3, aP * 0.45)} ${ky} L ${kx + zij * Math.max(3, aP * 0.45)} ${ky - aP * 1.41} L ${kx + zij * (Math.max(3, aP * 0.45) + aP * 1.41)} ${ky} Z`}
                      fill="#1e40af" fillOpacity={0.4} stroke="#1e40af" strokeWidth={1.2} />
                    <line x1={kx + zij * Math.max(3, aP * 0.45)} y1={ky - aP * 1.41}
                      x2={kx + zij * (Math.max(3, aP * 0.45) + aP * 1.41)} y2={ky}
                      stroke="#dc2626" strokeWidth={1.3} strokeDasharray="5 3" />
                  </g>
                ))}
                <text x={kx + aP * 4.4} y={ky - aP * 0.9} style={{ fontSize: 11, fill: "#dc2626", fontWeight: 700 }}>keelvlak</text>
                <text x={kx - aP * 6.6} y={ky - aP * 0.9} textAnchor="end" style={{ fontSize: 11, fill: "#1e40af", fontWeight: 700 }}>a = {fmt(a)}</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />Alleen componenten ongelijk aan nul worden getekend; het keeldetail toont het vlak waarop straks getoetst wordt.</span>
        <span className="vd-live">
          S{fy} · {type === 1 ? "dubbele hoeklas" : "stompe las"} · L × b = {fmt(L)} × {fmt(b)} mm · a = {fmt(a)} mm ·
          A<sub>w</sub> = {fmt(A_las)} mm² · W<sub>w</sub> = {fmt(W_las)} mm³ ·
          {lang === 0 ? " geen β_Lw-reductie" : lang === 1 ? " β_Lw,1" : " β_Lw,2"} ·
          F = ({fmt(Fx)}; {fmt(Fy)}; {fmt(Fz)}) kN · M = ({fmt(Mx)}; {fmt(My)}; {fmt(Mz)}) kNm
        </span>
      </div>
    </div>
  );
}
