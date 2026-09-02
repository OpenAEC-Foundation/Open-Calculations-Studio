import { useDesigner, Dim, Force, Ro, Defs, loadMark, betonFill, HDim, VDim, fmt, clamp } from "./designerKit";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van het doorponsen van een vlakke plaat.
 *
 * Twee aanzichten met één gedeelde horizontale schaal:
 *   • Doorsnede — de plaat met de wapening op dekking, de kolom eronder en de
 *     ponskegel onder 26,6° (spreiding 1 : 2 over 2d), precies de spreiding
 *     waarop de controleperimeter u₁ gebaseerd is.
 *   • Plattegrond — de kolomdoorsnede met de perimeters u₀ (op de kolomrand)
 *     en u₁ (op 2d, met afgeronde hoeken). Bij een rand- of hoekkolom wordt de
 *     perimeter afgekapt op de plaatrand, want daar loopt hij dood.
 *
 * De nuttige hoogte d volgt uit de plaatdikte, de dekking en de twee
 * wapeningsrichtingen — dat is geometrie, geen toetsing.
 *
 * Nog geen toetsing — zie templates/ponsberekening.ts.
 */
const MARKER = "Ponsberekening";

const BETON = [20, 25, 30, 35, 40, 45, 50];
const BETONLABEL: Record<number, string> = {
  20: "C20/25", 25: "C25/30", 30: "C30/37", 35: "C35/45", 40: "C40/50", 45: "C45/55", 50: "C50/60",
};
const STAALSOORT = [{ v: 1, label: "B500A" }, { v: 2, label: "B500B" }, { v: 3, label: "B500C" }];
const DIAM = [8, 10, 12, 16, 20, 25];

const DEFAULTS: Record<string, number> = {
  vorm: 1, plaats: 1, kolomkop: 0, c_1: 300, c_2: 300, h_plaat: 200,
  betonklasse: 45, betonstaal: 2,
  d_wapy: 10, s_wapy: 250, d_wapz: 10, s_wapz: 250, eerstelaag: 1,
  c_dek: 25, hoek_pons: 90, beta_keuze: 0, beta_hand: 1,
  V_Ed: 10, q_Ed: 0, e_y: 0, e_z: 0,
};

export default function PonsDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const vorm = Math.round(d("vorm"));                // 1 rechthoekig, 2 rond
  const plaats = Math.round(d("plaats"));            // 1 midden, 2 rand, 3 hoek
  const kop = Math.round(d("kolomkop"));
  const c1 = Math.max(50, d("c_1"));
  const c2 = vorm === 2 ? c1 : Math.max(50, d("c_2"));
  const hP = Math.max(80, d("h_plaat"));
  const fck = Math.round(d("betonklasse"));
  const staal = Math.round(d("betonstaal"));
  const dy = Math.max(6, d("d_wapy")), sy = Math.max(50, d("s_wapy"));
  const dz = Math.max(6, d("d_wapz")), sz = Math.max(50, d("s_wapz"));
  const eerst = Math.round(d("eerstelaag"));
  const cDek = Math.max(10, d("c_dek"));
  const hoekPons = clamp(d("hoek_pons"), 30, 90);
  const betaKeuze = Math.round(d("beta_keuze"));
  const betaHand = d("beta_hand");
  const VEd = d("V_Ed"), qEd = d("q_Ed"), ey = d("e_y"), ez = d("e_z");

  // Nuttige hoogte — het gemiddelde van beide richtingen, zoals §6.4.2 voorschrijft.
  const dOnder = eerst === 1 ? dy : dz;
  const dBoven = eerst === 1 ? dz : dy;
  const dEffY = hP - cDek - dOnder / 2;
  const dEffZ = hP - cDek - dOnder - dBoven / 2;
  const dEff = (dEffY + dEffZ) / 2;
  const spreiding = 2 * dEff;                        // afstand van de kolomrand tot u₁

  // Perimeters — puur geometrisch.
  const u0 = vorm === 2 ? Math.PI * c1 : 2 * (c1 + c2);
  const u1 = vorm === 2 ? Math.PI * (c1 + 2 * spreiding) : 2 * (c1 + c2) + 2 * Math.PI * spreiding;
  const fracties: Record<number, number> = { 1: 1, 2: 0.5, 3: 0.25 };
  const u1eff = u1 * (plaats === 1 ? 1 : plaats === 2 ? 0.5 : 0.25);

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(280, box.h - 2 * capH - gap);
  const SH = Math.max(110, totH * 0.34), PH = totH - SH;

  const veldMM = Math.max(c1, c2) + 2 * spreiding + 2 * Math.max(140, spreiding * 0.7);
  const s = clamp(Math.min((W - 120) / veldMM, (PH - 80) / veldMM, (SH - 70) / (hP * 2.4)), 0.005, 1.4);
  const cx = W * 0.46;

  // doorsnede
  const yPl0 = 30, yPl1 = yPl0 + hP * s;
  const halfC1 = (c1 * s) / 2;
  const xPl0 = cx - (veldMM * s) / 2, xPl1 = cx + (veldMM * s) / 2;
  const spr = spreiding * s;

  // plattegrond
  const pcy = SH > 0 ? PH / 2 : PH / 2;
  const hw = (c1 * s) / 2, hh = (c2 * s) / 2;
  const R = spr;                                     // hoekstraal van u₁

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — pons</strong>
        <span className="vd-uc info">d = {fmt(dEff)} mm · u<sub>1</sub> = {fmt(u1eff)} mm</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Geometrie (mm)</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Vorm
            <select style={{ width: "100%" }} value={vorm} onChange={(e) => set("vorm", parseInt(e.target.value))}>
              <option value={1}>Rechthoekige kolom</option>
              <option value={2}>Ronde kolom</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="Bepaalt hoeveel van de controleperimeter meedoet en welke β van toepassing is">Plaats
            <select style={{ width: "100%" }} value={plaats} onChange={(e) => set("plaats", parseInt(e.target.value))}>
              <option value={1}>Geen rand (middenkolom)</option>
              <option value={2}>Randkolom</option>
              <option value={3}>Hoekkolom</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Kolomkop
            <select style={{ width: "100%" }} value={kop} onChange={(e) => set("kolomkop", parseInt(e.target.value))}>
              <option value={0}>geen</option>
              <option value={1}>rechthoekige kolomkop</option>
              <option value={2}>ronde kolomkop</option>
            </select>
          </label>
          <label>{vorm === 2 ? "Diameter c" : "Kolomafmeting c₁"}
            <input type="number" step={25} value={c1} onChange={(e) => set("c_1", parseFloat(e.target.value))} />
          </label>
          {vorm === 1 && (
            <label>Kolomafmeting c₂
              <input type="number" step={25} value={c2} onChange={(e) => set("c_2", parseFloat(e.target.value))} />
            </label>
          )}
          <label>Plaatdikte h
            <input type="number" step={10} value={hP} onChange={(e) => set("h_plaat", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Beton en wapening</span>
          <label>Sterkteklasse
            <select value={fck} onChange={(e) => set("betonklasse", parseInt(e.target.value))}>
              {BETON.map((v) => <option key={v} value={v}>{BETONLABEL[v]}</option>)}
            </select>
          </label>
          <label>Betonstaalsoort
            <select value={staal} onChange={(e) => set("betonstaal", parseInt(e.target.value))}>
              {STAALSOORT.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Langswapening y
            <span style={{ display: "flex", gap: 4 }}>
              <select value={dy} onChange={(e) => set("d_wapy", parseFloat(e.target.value))}>
                {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
              </select>
              <input type="number" step={25} min={50} value={sy} style={{ width: 58 }}
                onChange={(e) => set("s_wapy", parseFloat(e.target.value))} />
            </span>
          </label>
          <label>Langswapening z
            <span style={{ display: "flex", gap: 4 }}>
              <select value={dz} onChange={(e) => set("d_wapz", parseFloat(e.target.value))}>
                {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
              </select>
              <input type="number" step={25} min={50} value={sz} style={{ width: 58 }}
                onChange={(e) => set("s_wapz", parseFloat(e.target.value))} />
            </span>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Onderste laag
            <select style={{ width: "100%" }} value={eerst} onChange={(e) => set("eerstelaag", parseInt(e.target.value))}>
              <option value={1}>Langswapening y</option>
              <option value={2}>Langswapening z</option>
            </select>
          </label>
          <label>Dekking c
            <input type="number" step={5} value={cDek} onChange={(e) => set("c_dek", parseFloat(e.target.value))} />
          </label>
          <label>Hoek ponswapening (°)
            <input type="number" step={5} min={30} max={90} value={hoekPons} onChange={(e) => set("hoek_pons", parseFloat(e.target.value))} />
          </label>
          <label className="gd-chk" title="β handmatig opgeven in plaats van berekenen volgens §6.4.3">
            <input type="checkbox" checked={betaKeuze === 1} onChange={(e) => set("beta_keuze", e.target.checked ? 1 : 0)} />
            β handmatig
          </label>
          {betaKeuze === 1 && (
            <label>β
              <input type="number" step={0.05} value={betaHand} onChange={(e) => set("beta_hand", parseFloat(e.target.value))} />
            </label>
          )}
          <span className="gd-note">d<sub>y</sub> = {fmt(dEffY)} · d<sub>z</sub> = {fmt(dEffZ)} → d = {fmt(dEff)} mm ·
            spreiding 2d = {fmt(spreiding)} mm.</span>
          <span className="gd-note">u<sub>0</sub> = {fmt(u0)} mm · u<sub>1</sub> = {fmt(u1)} mm ·
            meedoend {fmt(fracties[plaats] * 100)} % → {fmt(u1eff)} mm.</span>

          <span className="vd-ctrl-h">Belasting</span>
          <label>V<sub>Ed</sub> (kN)
            <input type="number" step={10} value={VEd} onChange={(e) => set("V_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Belasting op de plaat binnen de controleperimeter, mag van V_Ed worden afgetrokken">q<sub>Ed</sub> (kN/m²)
            <input type="number" step={1} value={qEd} onChange={(e) => set("q_Ed", parseFloat(e.target.value))} />
          </label>
          <label>Excentriciteit e<sub>y</sub> (mm)
            <input type="number" step={10} value={ey} onChange={(e) => set("e_y", parseFloat(e.target.value))} />
          </label>
          <label>Excentriciteit e<sub>z</sub> (mm)
            <input type="number" step={10} value={ez} onChange={(e) => set("e_z", parseFloat(e.target.value))} />
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: W, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={SH} className="vd-svg">
                <Defs k="pd" />
                {/* plaat */}
                <rect x={xPl0} y={yPl0} width={xPl1 - xPl0} height={hP * s} fill={betonFill("pd")} stroke="#6b7280" strokeWidth={1.3} />
                {/* wapening als puntjes op de dekking */}
                <line x1={xPl0 + 4} y1={yPl0 + cDek * s + 2} x2={xPl1 - 4} y2={yPl0 + cDek * s + 2} stroke="#111827" strokeWidth={1.6} />
                {Array.from({ length: 9 }, (_, i) => (
                  <circle key={i} cx={xPl0 + ((xPl1 - xPl0) * (i + 0.5)) / 9} cy={yPl0 + cDek * s + 6}
                    r={Math.max(1.4, dy * s * 0.5)} fill="#111827" />
                ))}
                {/* kolom onder de plaat */}
                <rect x={cx - halfC1} y={yPl1} width={c1 * s} height={SH - yPl1 - 26} fill={betonFill("pd")} stroke="#6b7280" strokeWidth={1.3} />
                {/* ponskegel: spreiding 1:2 over 2d */}
                <line x1={cx - halfC1} y1={yPl1} x2={cx - halfC1 - spr} y2={yPl0} stroke="#374151" strokeWidth={1.2} strokeDasharray="7 4" />
                <line x1={cx + halfC1} y1={yPl1} x2={cx + halfC1 + spr} y2={yPl0} stroke="#374151" strokeWidth={1.2} strokeDasharray="7 4" />
                {/* ponskracht */}
                <line x1={cx} y1={SH - 8} x2={cx} y2={yPl1 + 8} className="vd-load" strokeWidth={3.2} markerEnd={loadMark("pd")} />
                <VDim k="pd" y0={yPl0} y1={yPl1} x={xPl1 - 18} ext={xPl1 - 2} />
              </svg>

              <Dim ctx={ctx} name="h_plaat" value={hP} x={xPl1 - 18} y={(yPl0 + yPl1) / 2} step={10} label="h" />
              <Force ctx={ctx} name="V_Ed" value={VEd} x={cx + 52} y={SH - 30} unit="kN" label="V_Ed" />
              <Ro text={`d=${fmt(dEff)}`} x={cx - halfC1 - spr - 30} y={yPl0 + (hP * s) / 2} title="nuttige hoogte, gemiddelde van beide richtingen" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Plattegrond — controleperimeter u<sub>1</sub> op 2d</div>
            <div className="vd-stage" style={{ width: W, height: PH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={PH} className="vd-svg">
                <Defs k="pp" />
                {/* plaatveld */}
                <rect x={cx - (veldMM * s) / 2} y={pcy - (veldMM * s) / 2} width={veldMM * s} height={veldMM * s}
                  fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="10 6" />
                {/* plaatrand bij een rand- of hoekkolom */}
                {plaats >= 2 && (
                  <line x1={cx - hw} y1={pcy - (veldMM * s) / 2} x2={cx - hw} y2={pcy + (veldMM * s) / 2}
                    stroke="#b45309" strokeWidth={2.2} />
                )}
                {plaats === 3 && (
                  <line x1={cx - (veldMM * s) / 2} y1={pcy - hh} x2={cx + (veldMM * s) / 2} y2={pcy - hh}
                    stroke="#b45309" strokeWidth={2.2} />
                )}
                {/* controleperimeter u1 met afgeronde hoeken */}
                {vorm === 2 ? (
                  <circle cx={cx} cy={pcy} r={hw + R} fill="none" stroke="#6b7280" strokeWidth={1.3} strokeDasharray="8 5" />
                ) : (
                  <rect x={cx - hw - R} y={pcy - hh - R} width={2 * (hw + R)} height={2 * (hh + R)} rx={R} ry={R}
                    fill="none" stroke="#6b7280" strokeWidth={1.3} strokeDasharray="8 5" />
                )}
                {/* de kolom (u0) */}
                {vorm === 2 ? (
                  <circle cx={cx} cy={pcy} r={hw} fill={betonFill("pp")} stroke="#1e40af" strokeWidth={1.5} />
                ) : (
                  <rect x={cx - hw} y={pcy - hh} width={2 * hw} height={2 * hh} fill={betonFill("pp")} stroke="#1e40af" strokeWidth={1.5} />
                )}
                {/* hart en excentriciteit */}
                <line x1={cx - 9} y1={pcy} x2={cx + 9} y2={pcy} stroke="#dc2626" strokeWidth={1.1} />
                <line x1={cx} y1={pcy - 9} x2={cx} y2={pcy + 9} stroke="#dc2626" strokeWidth={1.1} />
                {(ey !== 0 || ez !== 0) && (
                  <g>
                    <line x1={cx} y1={pcy} x2={cx + ey * s} y2={pcy - ez * s} stroke="#dc2626" strokeWidth={1.6} />
                    <circle cx={cx + ey * s} cy={pcy - ez * s} r={4} fill="#fff" stroke="#dc2626" strokeWidth={2} />
                  </g>
                )}
                {/* maten */}
                <HDim k="pp" x0={cx - hw} x1={cx + hw} y={pcy + hh + 30} ext={pcy + hh + 6} />
                {vorm === 1 && <VDim k="pp" y0={pcy - hh} y1={pcy + hh} x={cx + hw + R + 32} ext={cx + hw + 6} />}
                {/* de spreiding 2d */}
                <line x1={cx + hw} y1={pcy - hh - R - 14} x2={cx + hw + R} y2={pcy - hh - R - 14}
                  className="vd-dimmeasure" />
              </svg>

              <Dim ctx={ctx} name="c_1" value={c1} x={cx} y={pcy + hh + 30} step={25} label="c1" />
              {vorm === 1 && <Dim ctx={ctx} name="c_2" value={c2} x={cx + hw + R + 32} y={pcy} step={25} label="c2" />}
              <Ro text={`2d=${fmt(spreiding)}`} x={cx + hw + R / 2} y={pcy - hh - R - 26} title="afstand van de kolomrand tot de controleperimeter" />
              <Ro text={`u1=${fmt(u1eff)}`} x={cx - hw - R - 46} y={pcy - hh - R + 8}
                title={plaats === 1 ? "volledige perimeter" : "afgekapt op de plaatrand"} />
              {(ey !== 0 || ez !== 0) && (
                <Ro text={`e=(${fmt(ey)}; ${fmt(ez)})`} x={cx + ey * s + 32} y={pcy - ez * s - 16} kleur="#dc2626" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De controleperimeter volgt de spreiding 1 : 2 uit de doorsnede; bij een rand- of hoekkolom loopt hij dood op de plaatrand.</span>
        <span className="vd-live">
          {BETONLABEL[fck]} · {STAALSOORT.find((o) => o.v === staal)?.label} ·
          {vorm === 2 ? `ronde kolom Ø${fmt(c1)}` : `kolom ${fmt(c1)}×${fmt(c2)}`} ·
          plaat h = {fmt(hP)} mm · dekking {fmt(cDek)} · Ø{fmt(dy)}-{fmt(sy)} / Ø{fmt(dz)}-{fmt(sz)} ·
          d = {fmt(dEff)} mm · u<sub>0</sub> = {fmt(u0)} · u<sub>1</sub> = {fmt(u1eff)} mm ·
          {plaats === 1 ? "middenkolom" : plaats === 2 ? "randkolom" : "hoekkolom"} ·
          {kop === 0 ? " geen kolomkop" : kop === 1 ? " rechthoekige kop" : " ronde kop"} ·
          V<sub>Ed</sub> = {fmt(VEd)} kN · q<sub>Ed</sub> = {fmt(qEd)} kN/m² · e = ({fmt(ey)}; {fmt(ez)}) mm ·
          ponswapening onder {fmt(hoekPons)}°{betaKeuze === 1 ? ` · β = ${fmt(betaHand, 2)}` : ""}
        </span>
      </div>
    </div>
  );
}
