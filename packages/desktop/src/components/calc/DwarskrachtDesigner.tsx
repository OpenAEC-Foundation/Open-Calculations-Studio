import { useDesigner, Dim, Force, Ro, Defs, loadMark, Bout, Las, HDim, VDim, fmt, clamp } from "./designerKit";
import { profiel, profielOpties } from "./profielen";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een scharnierende ligger-kolomverbinding.
 *
 * Twee aanzichten met één gedeelde verticale schaal:
 *   • Zijaanzicht — de kolom in doorsnede met de ligger erop, verbonden via
 *     een kopplaat, een lijfplaat of dubbel hoekstaal. De kopplaat blijft
 *     bewust korter dan de liggerhoogte: dat is precies wat de verbinding
 *     scharnierend maakt.
 *   • Kopplaataanzicht — de plaat met het liggerlijf erachter en de boutrijen,
 *     met de maatketen e — p — … — e.
 *
 * De plaathoogte volgt uit de boutverdeling (e + (n−1)·p + e), zodat de
 * tekening altijd klopt met de ingevoerde afstanden.
 *
 * Nog geen toetsing — zie templates/dwarskrachtverbinding.ts.
 */
const MARKER = "Dwarskrachtverbinding";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const KWAL = [{ v: 46, label: "4.6" }, { v: 56, label: "5.6" }, { v: 88, label: "8.8" }, { v: 109, label: "10.9" }];
const MAAT = [12, 16, 20, 24];
const GAT: Record<number, number> = { 12: 13, 16: 18, 20: 22, 24: 26 };
const KOLOMMEN = [4, 5, 6, 7, 8, 9, 10, 14, 16, 18, 20];
const LIGGERS = [21, 22, 23, 24, 25, 26, 27];

const DEFAULTS: Record<string, number> = {
  verbindingsvorm: 1, kolomprofiel: 7, liggerprofiel: 22,
  staalsoort: 235, boutkwaliteit: 88, boutmaat: 16, hartlijn: 1,
  n_boutrijen: 3, t_kp: 12, b_kp: 120, e_kp: 25, p_kp: 50, w_kp: 70,
  a_las: 5, V_Ed: 0,
};

export default function DwarskrachtDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const vorm = Math.round(d("verbindingsvorm"));      // 1 kopplaat, 2 lijfplaat, 3 hoekstaal
  const kol = profiel(Math.round(d("kolomprofiel")), 7);
  const lig = profiel(Math.round(d("liggerprofiel")), 22);
  const fy = Math.round(d("staalsoort"));
  const kwal = Math.round(d("boutkwaliteit"));
  const M = Math.round(d("boutmaat"));
  const hart = Math.round(d("hartlijn"));
  const nRij = clamp(Math.round(d("n_boutrijen")), 1, 8);
  const tKp = Math.max(4, d("t_kp"));
  const bKp = Math.max(40, d("b_kp"));
  const eKp = Math.max(1, d("e_kp")), pKp = Math.max(1, d("p_kp")), wKp = Math.max(1, d("w_kp"));
  const aLas = Math.max(1, d("a_las"));
  const VEd = d("V_Ed");
  const d0 = GAT[M] ?? M + 2;

  // Plaathoogte volgt uit de boutverdeling en past binnen de liggerhoogte.
  const hKp = 2 * eKp + (nRij - 1) * pKp;
  const past = hKp <= lig.h - 2 * lig.tf;
  const rijAf = Array.from({ length: nRij }, (_, i) => eKp + i * pKp);

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 16;
  const W = box.w, H = Math.max(280, box.h - capH);
  // In een smalle pane passen twee aanzichten niet naast elkaar; dan onder
  // elkaar, elk over de volle breedte. De verticale schaal blijft gedeeld.
  const gestapeld = W < 560;
  const ZW = gestapeld ? W : Math.min(W * 0.60, W - 180);
  const KWv = gestapeld ? W : W - ZW - gap;
  const VH = gestapeld ? Math.max(200, (H - gap - capH) / 2) : H;
  const offX = gestapeld ? 0 : ZW + gap;             // x-nulpunt van het tweede beeld
  const s = clamp(Math.min((VH - 130) / (lig.h + 130), (ZW - 150) / (kol.h + 300), (KWv - 110) / (bKp * 1.6)), 0.02, 1.8);

  const xKol = 70, kolB = kol.h * s;
  const xKp0 = xKol + kolB, xKp1 = xKp0 + tKp * s;
  const yTop = 74;                                   // bovenkant ligger
  const yLig1 = yTop + lig.h * s;
  const xLig1 = Math.min(ZW - 30, xKp1 + 200);
  const tfL = Math.max(2, lig.tf * s), twL = Math.max(2, lig.tw * s);
  const tfK = Math.max(2, kol.tf * s);
  // De plaat zit gecentreerd op de liggerhoogte.
  const yKp0 = yTop + (lig.h * s - hKp * s) / 2, yKp1 = yKp0 + hKp * s;
  const yRij = rijAf.map((a) => yKp0 + a * s);

  const kcx = offX + KWv / 2;
  const xKp = kcx - (bKp * s) / 2;
  const boutR = Math.max(3.2, (d0 * s) / 2);
  const boutX = [kcx - (wKp * s) / 2, kcx + (wKp * s) / 2];

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — dwarskrachtverbinding</strong>
        <span className={`vd-uc ${past ? "ok" : "bad"}`}>
          {past ? `✓ plaat ${fmt(hKp)} mm past in het lijf` : `✗ plaat ${fmt(hKp)} mm hoger dan het lijf`}
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Systeem</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Vorm
            <select style={{ width: "100%" }} value={vorm} onChange={(e) => set("verbindingsvorm", parseInt(e.target.value))}>
              <option value={1}>Kopplaat</option>
              <option value={2}>Lijfplaat (schetsplaat)</option>
              <option value={3}>Dubbel hoekstaal</option>
            </select>
          </label>
          <label>Kolomprofiel
            <select value={Math.round(d("kolomprofiel"))} onChange={(e) => set("kolomprofiel", parseInt(e.target.value))}>
              {profielOpties(KOLOMMEN).map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Liggerprofiel
            <select value={Math.round(d("liggerprofiel"))} onChange={(e) => set("liggerprofiel", parseInt(e.target.value))}>
              {profielOpties(LIGGERS).map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
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
          <label>Aantal boutrijen
            <input type="number" step={1} min={1} max={8} value={nRij} onChange={(e) => set("n_boutrijen", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Hartlijn bouten
            <select style={{ width: "100%" }} value={hart} onChange={(e) => set("hartlijn", parseInt(e.target.value))}>
              <option value={1}>versprongen</option>
              <option value={2}>in lijn</option>
            </select>
          </label>
          <label>Randafstand e (mm)
            <input type="number" step={5} value={eKp} onChange={(e) => set("e_kp", parseFloat(e.target.value))} />
          </label>
          <label>Steek p (mm)
            <input type="number" step={5} value={pKp} onChange={(e) => set("p_kp", parseFloat(e.target.value))} />
          </label>
          <label>Boutafstand w (mm)
            <input type="number" step={5} value={wKp} onChange={(e) => set("w_kp", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Plaat</span>
          <label>Dikte (mm)
            <input type="number" step={2} value={tKp} onChange={(e) => set("t_kp", parseFloat(e.target.value))} />
          </label>
          <label>Breedte (mm)
            <input type="number" step={10} value={bKp} onChange={(e) => set("b_kp", parseFloat(e.target.value))} />
          </label>
          <label>Keeldikte las a (mm)
            <input type="number" step={1} value={aLas} onChange={(e) => set("a_las", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Plaathoogte 2·{fmt(eKp)} + {nRij - 1}×{fmt(pKp)} = {fmt(hKp)} mm ·
            liggerlijf {fmt(lig.h - 2 * lig.tf)} mm hoog.</span>

          <span className="vd-ctrl-h">Belasting</span>
          <label>V<sub>Ed</sub> (kN)
            <input type="number" step={10} value={VEd} onChange={(e) => set("V_Ed", parseFloat(e.target.value))} />
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: gestapeld ? "column" : "row", alignItems: gestapeld ? "stretch" : "flex-start", gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Zijaanzicht</div>
            <div className="vd-stage" style={{ width: ZW, height: VH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={ZW} height={VH} className="vd-svg">
                <Defs k="dz" />
                {/* kolom */}
                <rect x={xKol} y={20} width={kolB} height={H - 60} fill="#eaf1fb" stroke="#1e40af" strokeWidth={1.5} />
                <line x1={xKol + tfK} y1={20} x2={xKol + tfK} y2={H - 40} stroke="#1e40af" strokeWidth={0.9} />
                <line x1={xKol + kolB - tfK} y1={20} x2={xKol + kolB - tfK} y2={H - 40} stroke="#1e40af" strokeWidth={0.9} />
                <text x={xKol + kolB / 2} y={H - 24} textAnchor="middle" style={{ fontSize: 10.5, fill: "#1e40af", fontWeight: 700 }}>{kol.naam}</text>

                {/* verbindingsplaat — korter dan de ligger, dat maakt het scharnier */}
                <rect x={xKp0} y={yKp0} width={tKp * s} height={hKp * s}
                  fill={past ? "#c9d9f0" : "#fecaca"} stroke={past ? "#1e40af" : "#b91c1c"} strokeWidth={1.5} />

                {/* ligger */}
                <rect x={xKp1} y={yTop} width={xLig1 - xKp1} height={tfL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                <rect x={xKp1} y={yLig1 - tfL} width={xLig1 - xKp1} height={tfL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                <rect x={xKp1} y={yTop + tfL} width={xLig1 - xKp1} height={yLig1 - tfL - (yTop + tfL)} fill="#f2f6fc" stroke="#1e40af" strokeWidth={0.9} />
                <text x={(xKp1 + xLig1) / 2} y={yTop - 10} textAnchor="middle" style={{ fontSize: 10.5, fill: "#1e40af", fontWeight: 700 }}>{lig.naam}</text>

                {/* las plaat op kolom */}
                <Las x={xKp0 + 1} y={yKp1} a={Math.max(4, aLas * s * 2.2)} />
                <Las x={xKp0 + 1} y={yKp0 + Math.max(4, aLas * s * 2.2)} a={Math.max(4, aLas * s * 2.2)} />

                {/* boutrijen */}
                {yRij.map((y, i) => (
                  <g key={i}>
                    <line x1={xKol + kolB * 0.3} y1={y} x2={xKp1 + 20} y2={y} stroke="#9ca3af" strokeWidth={0.9} strokeDasharray="9 3 2 3" />
                    <rect x={xKp0 - 4} y={y - Math.max(2, (M * s) / 2)} width={tKp * s + Math.max(6, twL) + 10} height={Math.max(4, M * s)}
                      fill="#e8eaee" stroke="#4b5563" strokeWidth={1} />
                  </g>
                ))}

                {/* dwarskracht op de oplegging */}
                <line x1={xKp1 + 26} y1={yTop - 44} x2={xKp1 + 26} y2={yTop - 4} className="vd-load" strokeWidth={3.2} markerEnd={loadMark("dz")} />

                <VDim k="dz" y0={yTop} y1={yLig1} x={xLig1 + 24} ext={xLig1 + 4} />
                <VDim k="dz" y0={yKp0} y1={yKp1} x={xKol - 26} ext={xKol - 4} />
              </svg>

              <Force ctx={ctx} name="V_Ed" value={VEd} x={xKp1 + 62} y={yTop - 52} unit="kN" label="V_Ed" />
              <Ro text={`h=${fmt(lig.h)}`} x={xLig1 + 24} y={(yTop + yLig1) / 2} title="liggerhoogte" />
              <Ro text={`${fmt(hKp)}`} x={xKol - 26} y={(yKp0 + yKp1) / 2} kleur={past ? "#6b7280" : "#b91c1c"}
                title="plaathoogte, volgt uit de boutverdeling" />
              <Dim ctx={ctx} name="t_kp" value={tKp} x={xKp0 + (tKp * s) / 2} y={yKp1 + 18} step={2} label="t" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Aanzicht op de plaat</div>
            <div className="vd-stage" style={{ width: KWv, height: VH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={KWv} height={VH} className="vd-svg">
                <Defs k="dk" />
                {/* liggerprofiel op de achtergrond */}
                <rect x={kcx - offX - (lig.b * s) / 2} y={yTop} width={lig.b * s} height={tfL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.1} />
                <rect x={kcx - offX - (lig.b * s) / 2} y={yLig1 - tfL} width={lig.b * s} height={tfL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.1} />
                <rect x={kcx - offX - twL / 2} y={yTop + tfL} width={twL} height={yLig1 - tfL - (yTop + tfL)} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.1} />
                {/* de plaat ervoor */}
                <rect x={xKp - offX} y={yKp0} width={bKp * s} height={hKp * s}
                  fill="#eef2f7" fillOpacity={0.92} stroke={past ? "#1e40af" : "#b91c1c"} strokeWidth={1.5} />
                {/* bouten */}
                {yRij.map((y, i) => boutX.map((bx, j) => (
                  <Bout key={`${i}-${j}`} cx={bx - offX + (hart === 1 && i % 2 === 1 ? (j === 0 ? -1 : 1) * 3 : 0)} cy={y} r={boutR} />
                )))}
                {/* maatketen */}
                <VDim k="dk" y0={yKp0} y1={yRij[0]} x={xKp - offX - 26} ext={xKp - offX - 4} />
                {yRij.slice(0, -1).map((y, i) => (
                  <VDim key={i} k="dk" y0={y} y1={yRij[i + 1]} x={xKp - offX - 26} ext={xKp - offX - 4} />
                ))}
                <VDim k="dk" y0={yRij[nRij - 1]} y1={yKp1} x={xKp - offX - 26} ext={xKp - offX - 4} />
                <HDim k="dk" x0={boutX[0] - offX} x1={boutX[1] - offX} y={yKp1 + 22} ext={yKp1 + 4} />
                <HDim k="dk" x0={xKp - offX} x1={xKp - offX + bKp * s} y={yKp1 + 44} />
              </svg>

              <Dim ctx={ctx} name="e_kp" value={eKp} x={xKp - offX - 26} y={(yKp0 + yRij[0]) / 2} step={5} label="e" />
              {yRij.slice(0, -1).map((y, i) => (
                <Dim key={i} ctx={ctx} name="p_kp" value={pKp} x={xKp - offX - 26} y={(y + yRij[i + 1]) / 2} step={5} label="p" />
              ))}
              <Ro text={fmt(eKp)} x={xKp - offX - 26} y={(yRij[nRij - 1] + yKp1) / 2} title="gelijk aan e aan de onderzijde" />
              <Dim ctx={ctx} name="w_kp" value={wKp} x={kcx - offX} y={yKp1 + 22} step={5} label="w" />
              <Dim ctx={ctx} name="b_kp" value={bKp} x={kcx - offX} y={yKp1 + 44} step={10} label="b" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De plaat blijft bewust korter dan de liggerhoogte; dat geeft de verbinding de rotatiecapaciteit van een scharnier.</span>
        <span className="vd-live">
          {vorm === 1 ? "kopplaat" : vorm === 2 ? "lijfplaat" : "dubbel hoekstaal"} · {kol.naam} / {lig.naam} S{fy} ·
          {nRij} rijen × 2 M{M}–{KWAL.find((k) => k.v === kwal)?.label} ({hart === 1 ? "versprongen" : "in lijn"}) ·
          plaat {fmt(bKp)}×{fmt(hKp)}×{fmt(tKp)} mm · e/p/w = {fmt(eKp)}/{fmt(pKp)}/{fmt(wKp)} ·
          a = {fmt(aLas)} mm · V<sub>Ed</sub> = {fmt(VEd)} kN
        </span>
      </div>
    </div>
  );
}
