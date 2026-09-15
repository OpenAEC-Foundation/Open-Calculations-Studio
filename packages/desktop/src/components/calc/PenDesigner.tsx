import { useDesigner, Dim, Force, Ro, Defs, loadMark, HDim, VDim, fmt, clamp } from "./designerKit";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een penverbinding: een oogplaat in een vork.
 *
 * Twee aanzichten met één gedeelde horizontale schaal:
 *   • Aanzicht — de oogplaat met het gat d₀, de kopmaat a en de zijmaat c. De
 *     ronding van de kop volgt het gat, zoals bij een echte oogplaat.
 *   • Doorsnede — de oogplaat (dikte t) tussen de twee vorkplaten (a₁), met de
 *     speling c₁ ertussen en de kracht die zich over de twee vorkbenen
 *     verdeelt.
 *
 * De maten a en c hebben in EN 1993-1-8 tabel 3.9 minimumeisen die van de
 * plaatdikte en de staalsoort afhangen; die toetsing volgt later. Hier worden
 * ze alleen getekend.
 *
 * Nog geen toetsing — zie templates/penverbinding.ts.
 */
const MARKER = "Penverbinding";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const KWAL = [{ v: 46, label: "4.6" }, { v: 56, label: "5.6" }, { v: 88, label: "8.8" }, { v: 109, label: "10.9" }];

const DEFAULTS: Record<string, number> = {
  staalsoort: 235, penkwaliteit: 88, vervangbaar: 1,
  d_pen: 40, d_0: 42, a_oog: 47, c_oog: 32, t_oog: 20, t_vork: 10, c_1: 5,
  F_Ed: 0, F_Edser: 0,
};

export default function PenDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const fy = Math.round(d("staalsoort"));
  const kwal = Math.round(d("penkwaliteit"));
  const verv = Math.round(d("vervangbaar"));
  const dp = Math.max(1, d("d_pen"));
  const d0 = Math.max(dp, d("d_0"));
  const a = Math.max(1, d("a_oog")), c = Math.max(1, d("c_oog"));
  const t = Math.max(1, d("t_oog")), a1 = Math.max(1, d("t_vork")), c1 = Math.max(0, d("c_1"));
  const F = d("F_Ed"), Fser = d("F_Edser");

  // Geometrie van de oogplaat: het gathart ligt op `a` van de kop.
  const Rkop = d0 / 2 + a;                 // straal van de ronde kop
  const Hplaat = d0 + 2 * c;               // hoogte van de plaat ter plaatse van het gat
  const Lschaft = Rkop * 1.9;              // getoonde lengte van de rechte schacht
  const Ltot = Lschaft + Rkop;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(220, box.h - 2 * capH - gap);
  const AH = totH * 0.56, SH = totH - AH;
  const mL = clamp(W * 0.10, 44, 76), mR = clamp(W * 0.12, 54, 92);
  const s = clamp(Math.min((W - mL - mR) / Ltot, (AH - 62) / (Math.max(Hplaat, 2 * Rkop) * 1.04)), 0.05, 3);

  const x0 = mL;                                   // linkerrand van de schacht
  const cxGat = x0 + Lschaft * s;                  // hart van het gat
  const cyA = AH * 0.52;
  const rGat = (d0 * s) / 2, rKop = Rkop * s;
  const halfH = (Hplaat * s) / 2;

  // Contour: rechte schacht die overgaat in de ronde kop.
  const contour = `M ${x0} ${cyA - halfH} L ${cxGat} ${cyA - halfH} `
    + `A ${rKop} ${rKop} 0 0 1 ${cxGat} ${cyA + halfH} L ${x0} ${cyA + halfH} Z`;

  // doorsnede
  const cyS = SH * 0.48;
  const tPx = Math.max(5, t * s), a1Px = Math.max(4, a1 * s), c1Px = Math.max(2, c1 * s);
  const halfPak = tPx / 2 + c1Px + a1Px;
  const rPen = Math.max(4, (dp * s) / 2);

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — penverbinding</strong>
        <span className="vd-uc info">Ø{fmt(dp)} in gat Ø{fmt(d0)} · {verv === 1 ? "vervangbaar" : "vast"}</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Materiaal</span>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Kwaliteit pen
            <select value={kwal} onChange={(e) => set("penkwaliteit", parseInt(e.target.value))}>
              {KWAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label className="gd-chk" title="Is de pen vervangbaar, dan geldt bovendien een contactspanningseis in de BGT (§3.13.2(4))">
            <input type="checkbox" checked={verv === 1} onChange={(e) => set("vervangbaar", e.target.checked ? 1 : 0)} />
            pen moet vervangbaar zijn
          </label>

          <span className="vd-ctrl-h">Pen en gat (mm)</span>
          <label>Pendiameter d
            <input type="number" step={2} min={1} value={dp} onChange={(e) => set("d_pen", parseFloat(e.target.value))} />
          </label>
          <label>Gatdiameter d<sub>0</sub>
            <input type="number" step={1} min={1} value={d0} onChange={(e) => set("d_0", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Speling d<sub>0</sub> − d = {fmt(d0 - dp)} mm.</span>

          <span className="vd-ctrl-h">Oogplaat (mm)</span>
          <label title="Afstand van het gat tot de kop van de plaat">Kopmaat a
            <input type="number" step={5} min={1} value={a} onChange={(e) => set("a_oog", parseFloat(e.target.value))} />
          </label>
          <label title="Afstand van het gat tot de zijkant van de plaat">Zijmaat c
            <input type="number" step={5} min={1} value={c} onChange={(e) => set("c_oog", parseFloat(e.target.value))} />
          </label>
          <label>Dikte t
            <input type="number" step={2} min={1} value={t} onChange={(e) => set("t_oog", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Vork (mm)</span>
          <label>Dikte per vorkplaat a<sub>1</sub>
            <input type="number" step={2} min={1} value={a1} onChange={(e) => set("t_vork", parseFloat(e.target.value))} />
          </label>
          <label>Speling c<sub>1</sub>
            <input type="number" step={1} min={0} value={c1} onChange={(e) => set("c_1", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Pakketbreedte 2·(a<sub>1</sub> + c<sub>1</sub>) + t = {fmt(2 * (a1 + c1) + t)} mm.</span>

          <span className="vd-ctrl-h">Belasting</span>
          <label>F<sub>Ed</sub> (kN)
            <input type="number" step={10} value={F} onChange={(e) => set("F_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Karakteristieke waarde voor de contactspanning in de bruikbaarheidsgrenstoestand">F<sub>Ed,ser</sub> (kN)
            <input type="number" step={10} value={Fser} onChange={(e) => set("F_Edser", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Plaathoogte volgt uit het gat: d<sub>0</sub> + 2c = {fmt(Hplaat)} mm.</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Aanzicht oogplaat</div>
            <div className="vd-stage" style={{ width: W, height: AH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={AH} className="vd-svg">
                <Defs k="pa" />
                <path d={contour} fill="#eef2f7" stroke="#1e40af" strokeWidth={1.6} />
                <circle cx={cxGat} cy={cyA} r={rGat} fill="#fff" stroke="#1e40af" strokeWidth={1.6} />
                {/* hartlijnen */}
                <line x1={x0 - 12} y1={cyA} x2={cxGat + rKop + 16} y2={cyA} stroke="#dc2626" strokeWidth={1} strokeDasharray="10 4 2 4" />
                <line x1={cxGat} y1={cyA - rGat - 22} x2={cxGat} y2={cyA + rGat + 22} stroke="#1e40af" strokeWidth={0.9} />
                {/* snijlijn links */}
                <line x1={x0} y1={cyA - halfH - 8} x2={x0} y2={cyA + halfH + 8} stroke="#4b5563" strokeWidth={1} strokeDasharray="8 5" />
                {/* trekkracht */}
                <line x1={x0 - 62} y1={cyA} x2={x0 - 8} y2={cyA} className="vd-load" strokeWidth={3} markerEnd={loadMark("pa")} />
                {/* maatlijnen: d0 en a boven, c aan de rechterzijde */}
                <HDim k="pa" x0={cxGat - rGat} x1={cxGat + rGat} y={cyA - halfH - 26} ext={cyA - halfH - 6} />
                <HDim k="pa" x0={cxGat + rGat} x1={cxGat + rKop} y={cyA - halfH - 26} ext={cyA - halfH - 6} />
                <VDim k="pa" y0={cyA - halfH} y1={cyA - rGat} x={cxGat + rKop + 24} ext={cxGat + rKop + 4} />
                <VDim k="pa" y0={cyA + rGat} y1={cyA + halfH} x={cxGat + rKop + 24} ext={cxGat + rKop + 4} />
              </svg>

              <Dim ctx={ctx} name="d_0" value={d0} x={cxGat} y={cyA - halfH - 26} step={1} label="d0" />
              <Dim ctx={ctx} name="a_oog" value={a} x={(cxGat + rGat + cxGat + rKop) / 2} y={cyA - halfH - 26} step={5} label="a" />
              <Dim ctx={ctx} name="c_oog" value={c} x={cxGat + rKop + 24} y={(cyA - halfH + cyA - rGat) / 2} step={5} label="c" />
              <Ro text={`c=${fmt(c)}`} x={cxGat + rKop + 24} y={(cyA + rGat + cyA + halfH) / 2} title="gelijk aan c aan de onderzijde" />
              <Force ctx={ctx} name="F_Ed" value={F} x={x0 - 46} y={cyA - 30} unit="kN" label="F_Ed" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede over de pen</div>
            <div className="vd-stage" style={{ width: W, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={SH} className="vd-svg">
                <Defs k="ps" />
                {/* oogplaat in het midden */}
                <rect x={x0} y={cyS - tPx / 2} width={cxGat - x0 + rKop} height={tPx} fill="#eef2f7" stroke="#1e40af" strokeWidth={1.4} />
                {/* de twee vorkplaten */}
                {[-1, 1].map((z) => (
                  <rect key={z} x={cxGat - rKop * 1.1} y={cyS + z * (tPx / 2 + c1Px) - (z > 0 ? 0 : a1Px)}
                    width={W - mR - (cxGat - rKop * 1.1)} height={a1Px} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.4} />
                ))}
                {/* de pen door het pakket */}
                <rect x={cxGat - rPen} y={cyS - halfPak - 8} width={rPen * 2} height={2 * halfPak + 16}
                  fill="#e8eaee" stroke="#374151" strokeWidth={1.3} />
                <line x1={cxGat} y1={cyS - halfPak - 16} x2={cxGat} y2={cyS + halfPak + 16} stroke="#1e40af" strokeWidth={0.9} strokeDasharray="9 4 2 4" />
                {/* krachten: F op de oogplaat, F/2 op elk vorkbeen */}
                <line x1={x0 - 58} y1={cyS} x2={x0 - 6} y2={cyS} className="vd-load" strokeWidth={3} markerEnd={loadMark("ps")} />
                {[-1, 1].map((z) => (
                  <line key={z} x1={W - mR - 52} y1={cyS + z * (tPx / 2 + c1Px + a1Px / 2)} x2={W - mR + 2} y2={cyS + z * (tPx / 2 + c1Px + a1Px / 2)}
                    className="vd-load" strokeWidth={2.6} markerEnd={loadMark("ps")} />
                ))}
                {/* pakketmaten */}
                <VDim k="ps" y0={cyS - tPx / 2} y1={cyS + tPx / 2} x={cxGat - rKop * 1.1 - 22} ext={cxGat - rKop * 1.1 - 4} />
                <VDim k="ps" y0={cyS + tPx / 2 + c1Px} y1={cyS + tPx / 2 + c1Px + a1Px} x={W - mR + 22} ext={W - mR + 4} />
              </svg>

              <Dim ctx={ctx} name="t_oog" value={t} x={cxGat - rKop * 1.1 - 22} y={cyS} step={2} label="t" />
              <Dim ctx={ctx} name="t_vork" value={a1} x={W - mR + 22} y={cyS + tPx / 2 + c1Px + a1Px / 2} step={2} label="a1" />
              <Ro text={`c1=${fmt(c1)}`} x={cxGat + rKop * 0.5} y={cyS + tPx / 2 + c1Px / 2} title="speling tussen oogplaat en vork" />
              <Ro text="F/2" x={W - mR - 24} y={cyS - (tPx / 2 + c1Px + a1Px / 2) - 18} kleur="#dc2626" />
              <Ro text="F/2" x={W - mR - 24} y={cyS + (tPx / 2 + c1Px + a1Px / 2) + 6} kleur="#dc2626" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De kop van de oogplaat volgt het gat: de straal is d<sub>0</sub>/2 + a.</span>
        <span className="vd-live">
          S{fy} · pen Ø{fmt(dp)} kwaliteit {KWAL.find((k) => k.v === kwal)?.label} · gat Ø{fmt(d0)} ·
          a = {fmt(a)} · c = {fmt(c)} · t = {fmt(t)} · vork 2× {fmt(a1)} met speling {fmt(c1)} ·
          plaathoogte {fmt(Hplaat)} mm · F<sub>Ed</sub> = {fmt(F)} kN · F<sub>Ed,ser</sub> = {fmt(Fser)} kN ·
          {verv === 1 ? " vervangbaar" : " niet vervangbaar"}
        </span>
      </div>
    </div>
  );
}
