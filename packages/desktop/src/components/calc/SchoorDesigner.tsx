import { useDesigner, Dim, Force, Ro, Defs, loadMark, Bout, Las, fmt, clamp } from "./designerKit";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een schoorverbinding: een hoekstaal onder een hoek op
 * een schetsplaat, met de bouten in één rij langs de schoor-as.
 *
 * Alles draait mee met de ingestelde hoek: het profiel, de boutrij en de
 * maatvoering e₁/p₁ staan in de as van de schoor, terwijl de schetsplaat
 * rechthoekig blijft. De lasdriehoekjes zitten op de twee aansluitranden van
 * de plaat.
 *
 * Nog geen toetsing — zie templates/schoorverbinding.ts.
 */
const MARKER = "Schoorverbinding";

interface Hoek { naam: string; h: number; t: number }
const HOEKPROFIEL: Record<number, Hoek> = {
  1: { naam: "L 40x40x4", h: 40, t: 4 },
  2: { naam: "L 45x45x5", h: 45, t: 5 },
  3: { naam: "L 50x50x5", h: 50, t: 5 },
  4: { naam: "L 60x60x6", h: 60, t: 6 },
  5: { naam: "L 70x70x7", h: 70, t: 7 },
  6: { naam: "L 80x80x8", h: 80, t: 8 },
  7: { naam: "L 90x90x9", h: 90, t: 9 },
  8: { naam: "L 100x100x10", h: 100, t: 10 },
};
const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const KWAL = [{ v: 46, label: "4.6" }, { v: 56, label: "5.6" }, { v: 88, label: "8.8" }, { v: 109, label: "10.9" }];
const MAAT = [12, 16, 20, 24];
const GAT: Record<number, number> = { 12: 13, 16: 18, 20: 22, 24: 26 };

const DEFAULTS: Record<string, number> = {
  hoekprofiel: 3, uitvoering: 1, staalsoort: 235, boutkwaliteit: 88, boutmaat: 16,
  n_bouten: 2, t_schets: 8, hoek: 35, e_1: 25, p_1: 55,
  b_schets: 170, h_schets: 120, a_las: 5, F_Ed: 40,
};

export default function SchoorDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const profId = Math.round(d("hoekprofiel"));
  const prof = HOEKPROFIEL[profId] ?? HOEKPROFIEL[3];
  const uitv = Math.round(d("uitvoering"));
  const fy = Math.round(d("staalsoort"));
  const kwal = Math.round(d("boutkwaliteit"));
  const M = Math.round(d("boutmaat"));
  const n = Math.max(1, Math.round(d("n_bouten")));
  const tS = Math.max(1, d("t_schets"));
  const hoek = clamp(d("hoek"), 5, 85);
  const e1 = Math.max(1, d("e_1")), p1 = Math.max(1, d("p_1"));
  const bS = Math.max(20, d("b_schets")), hS = Math.max(20, d("h_schets"));
  const aLas = Math.max(1, d("a_las"));
  const F = d("F_Ed");
  const d0 = GAT[M] ?? M + 2;

  const rad = (hoek * Math.PI) / 180;
  const ux = Math.cos(rad), uy = -Math.sin(rad);          // eenheidsvector langs de schoor
  const nx = -uy, ny = ux;                                // loodrecht erop
  // Lengte van de boutrij vanaf de plaathoek, plus wat overstek voorbij de laatste bout.
  const rijL = e1 + (n - 1) * p1;
  const profL = rijL + e1 + 90;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24;
  const W = box.w, H = Math.max(240, box.h - capH);
  const mm = Math.max(bS, hS) + profL * 0.9;
  const s = clamp(Math.min((W - 120) / (mm * 1.05), (H - 90) / (mm * 0.82)), 0.05, 3);
  // Oorsprong = de linkeronderhoek van de schetsplaat; de schoor vertrekt daaruit.
  const ox = W * 0.30, oy = H * 0.80;
  const px = (x: number, y: number): [number, number] => [ox + x * s, oy - y * s];

  const [gx0, gy0] = px(0, 0);
  const [gx1, gy1] = px(bS, hS);
  /** Punt op afstand `l` langs de schoor-as, `o` er loodrecht op. */
  const as = (l: number, o = 0): [number, number] => px(l * ux + o * nx, -(l * uy) + o * ny);

  const bouten = Array.from({ length: n }, (_, i) => as(e1 + i * p1));
  const boutR = Math.max(3.5, (d0 * s) / 2);
  const punt = as(profL);
  const staart = as(-6);

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — schoorverbinding</strong>
        <span className="vd-uc info">{prof.naam} · {n}× M{M} · {fmt(hoek)}°</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Schoor</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Hoekprofiel
            <select style={{ width: "100%" }} value={profId} onChange={(e) => set("hoekprofiel", parseInt(e.target.value))}>
              {Object.entries(HOEKPROFIEL).map(([id, p]) => <option key={id} value={id}>{p.naam}</option>)}
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Uitvoering
            <select style={{ width: "100%" }} value={uitv} onChange={(e) => set("uitvoering", parseInt(e.target.value))}>
              <option value={1}>enkel hoekstaal</option>
              <option value={2}>dubbel hoekstaal (rug aan rug)</option>
            </select>
          </label>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label title="Hoek van de schoor met de horizontaal">Hoek (°)
            <input type="number" step={5} min={5} max={85} value={hoek} onChange={(e) => set("hoek", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Bouten</span>
          <label>Kwaliteit
            <select value={kwal} onChange={(e) => set("boutkwaliteit", parseInt(e.target.value))}>
              {KWAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Boutmaat
            <select value={M} onChange={(e) => set("boutmaat", parseInt(e.target.value))}>
              {MAAT.map((m) => <option key={m} value={m}>M{m}</option>)}
            </select>
          </label>
          <label>Aantal bouten
            <input type="number" step={1} min={1} max={6} value={n} onChange={(e) => set("n_bouten", parseFloat(e.target.value))} />
          </label>
          <label>Randafstand e<sub>1</sub> (mm)
            <input type="number" step={5} value={e1} onChange={(e) => set("e_1", parseFloat(e.target.value))} />
          </label>
          <label>Steek p<sub>1</sub> (mm)
            <input type="number" step={5} value={p1} onChange={(e) => set("p_1", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Schetsplaat</span>
          <label>Dikte (mm)
            <input type="number" step={1} min={1} value={tS} onChange={(e) => set("t_schets", parseFloat(e.target.value))} />
          </label>
          <label>Breedte (mm)
            <input type="number" step={10} value={bS} onChange={(e) => set("b_schets", parseFloat(e.target.value))} />
          </label>
          <label>Hoogte (mm)
            <input type="number" step={10} value={hS} onChange={(e) => set("h_schets", parseFloat(e.target.value))} />
          </label>
          <label>Keeldikte las a (mm)
            <input type="number" step={1} min={1} value={aLas} onChange={(e) => set("a_las", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Belasting</span>
          <label>F<sub>Ed</sub> (kN)
            <input type="number" step={10} value={F} onChange={(e) => set("F_Ed", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Boutrij {fmt(rijL)} mm lang · gat d<sub>0</sub> = {fmt(d0)} mm ·
            {uitv === 2 ? " dubbel, symmetrisch aangesloten" : " enkelzijdig aangesloten (excentriciteit)"}</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Aanzicht op de schetsplaat</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                <Defs k="sc" />
                {/* schetsplaat */}
                <rect x={gx0} y={gy1} width={gx1 - gx0} height={gy0 - gy1} fill="#f3f4f6" stroke="#1e40af" strokeWidth={1.5} />
                {/* hoekstaal langs de as */}
                <polygon
                  points={[as(-6, prof.h / 2), as(profL, prof.h / 2), as(profL, -prof.h / 2), as(-6, -prof.h / 2)]
                    .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
                  fill="#dbe7f6" fillOpacity={0.75} stroke="#1e40af" strokeWidth={1.5} />
                {/* het aangesloten been, iets donkerder */}
                <polygon
                  points={[as(-6, prof.h / 2), as(profL, prof.h / 2), as(profL, prof.h / 2 - prof.t * 2.4), as(-6, prof.h / 2 - prof.t * 2.4)]
                    .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
                  fill="#bfd3ee" stroke="#1e40af" strokeWidth={1} />
                {/* hartlijn van de schoor */}
                <line x1={staart[0]} y1={staart[1]} x2={punt[0]} y2={punt[1]} stroke="#dc2626" strokeWidth={1} strokeDasharray="9 4 2 4" />
                {/* hoekmarkering met de horizontaal */}
                <path d={`M ${gx0 + 46} ${gy0} A 46 46 0 0 0 ${gx0 + 46 * ux} ${gy0 + 46 * uy}`} fill="none" stroke="#374151" strokeWidth={1} />
                <line x1={gx0} y1={gy0} x2={gx1} y2={gy0} stroke="#374151" strokeWidth={0.8} strokeDasharray="5 3" />
                {/* bouten */}
                {bouten.map((p, i) => <Bout key={i} cx={p[0]} cy={p[1]} r={boutR} />)}
                {/* lassen langs de twee aansluitranden */}
                <Las x={gx0 + 10} y={gy1 + 14} a={Math.max(4, aLas * s * 1.6)} />
                <Las x={gx0 + 10} y={gy0 - 4} a={Math.max(4, aLas * s * 1.6)} />
                {/* schoorkracht */}
                <line x1={punt[0] - 4} y1={punt[1] - 4} x2={punt[0] + 54 * ux} y2={punt[1] + 54 * uy}
                  className="vd-load" strokeWidth={3} markerEnd={loadMark("sc")} />
                {/* maatlijnen langs de as */}
                <line x1={as(0, -prof.h / 2 - 26)[0]} y1={as(0, -prof.h / 2 - 26)[1]} x2={as(e1, -prof.h / 2 - 26)[0]} y2={as(e1, -prof.h / 2 - 26)[1]}
                  className="vd-dimmeasure" />
                <line x1={as(e1, -prof.h / 2 - 26)[0]} y1={as(e1, -prof.h / 2 - 26)[1]} x2={as(e1 + p1, -prof.h / 2 - 26)[0]} y2={as(e1 + p1, -prof.h / 2 - 26)[1]}
                  className="vd-dimmeasure" />
                {/* plaatmaten */}
                <line x1={gx0} y1={gy0 + 22} x2={gx1} y2={gy0 + 22} className="vd-dimmeasure" />
                <line x1={gx0 - 22} y1={gy0} x2={gx0 - 22} y2={gy1} className="vd-dimmeasure" />
              </svg>

              <Dim ctx={ctx} name="e_1" value={e1} x={as(e1 / 2, -prof.h / 2 - 26)[0]} y={as(e1 / 2, -prof.h / 2 - 26)[1]} step={5} label="e1" />
              {n > 1 && <Dim ctx={ctx} name="p_1" value={p1} x={as(e1 + p1 / 2, -prof.h / 2 - 26)[0]} y={as(e1 + p1 / 2, -prof.h / 2 - 26)[1]} step={5} label="p1" />}
              <Dim ctx={ctx} name="b_schets" value={bS} x={(gx0 + gx1) / 2} y={gy0 + 22} step={10} />
              <Dim ctx={ctx} name="h_schets" value={hS} x={gx0 - 22} y={(gy0 + gy1) / 2} step={10} />
              <Dim ctx={ctx} name="hoek" value={hoek} x={gx0 + 58} y={gy0 - 20} step={5} label="°" />
              <Force ctx={ctx} name="F_Ed" value={F} x={punt[0] + 54 * ux + 30} y={punt[1] + 54 * uy - 14} unit="kN" label="F_Ed" />
              <Ro text={`a=${fmt(aLas)}`} x={gx0 + 30} y={gy1 + 8} title="keeldikte van de las" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />Profiel, boutrij en maatvoering draaien mee met de ingestelde hoek.</span>
        <span className="vd-live">
          {prof.naam} {uitv === 2 ? "(dubbel)" : "(enkel)"} S{fy} · {n}× M{M}–{KWAL.find((k) => k.v === kwal)?.label} ·
          e<sub>1</sub>/p<sub>1</sub> = {fmt(e1)}/{fmt(p1)} · schetsplaat {fmt(bS)}×{fmt(hS)}×{fmt(tS)} mm ·
          a = {fmt(aLas)} mm · hoek {fmt(hoek)}° · F<sub>Ed</sub> = {fmt(F)} kN
        </span>
      </div>
    </div>
  );
}
