import { useDesigner, Dim, Force, Ro, Defs, loadMark, Bout, Las, HDim, VDim, fmt, clamp } from "./designerKit";
import { profiel, profielOpties } from "./profielen";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een momentvaste ligger-kolomverbinding.
 *
 * Twee aanzichten met één gedeelde verticale schaal, zodat elke boutrij in het
 * zijaanzicht op dezelfde hoogte staat als in het kopplaataanzicht:
 *   • Zijaanzicht — de kolom in doorsnede, de ligger erop met de kopplaat
 *     ertussen en, als die gekozen is, de console eronder. De hartlijnen van
 *     de boutrijen lopen door tot in de kolom.
 *   • Kopplaataanzicht — de kopplaat met het liggerprofiel erachter en de
 *     bouten links en rechts van het lijf, met de maatketen e — p — … — rest.
 *
 * De boutrijen worden vanaf de bovenkant van de kopplaat verdeeld: de eerste op
 * e_kp, daarna telkens p_kp. Ligt de laatste rij buiten de plaat, dan wordt de
 * plaat meegegroeid — de tekening blijft zo altijd consistent.
 *
 * Nog geen toetsing — zie templates/momentverbinding.ts.
 */
const MARKER = "Momentverbinding";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const KWAL = [{ v: 46, label: "4.6" }, { v: 56, label: "5.6" }, { v: 88, label: "8.8" }, { v: 109, label: "10.9" }];
const MAAT = [12, 16, 20, 24, 27, 30];
const GAT: Record<number, number> = { 12: 13, 16: 18, 20: 22, 24: 26, 27: 30, 30: 33 };
const KOLOMMEN = [13, 14, 15, 16, 17, 18, 19, 20, 6, 8, 10];
const LIGGERS = [21, 22, 23, 24, 25, 26, 27];

const DEFAULTS: Record<string, number> = {
  stabiliteit: 1, verbindingstype: 1, kopplaattype: 1,
  kolomprofiel: 14, liggerprofiel: 22, staalsoort: 235, boutkwaliteit: 88, boutmaat: 16,
  console: 2, n_boutrijen: 4, t_kp: 12, b_kp: 140, e_kp: 25, p_kp: 40, w_kp: 70,
  h_console: 120, l_console: 240, a_flens: 5, a_lijf: 3,
  L_b: 5000, M_Ed: 0, V_Ed: 0,
};

export default function MomentverbindingDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const stab = Math.round(d("stabiliteit"));
  const vbType = Math.round(d("verbindingstype"));
  const kpType = Math.round(d("kopplaattype"));
  const kol = profiel(Math.round(d("kolomprofiel")), 14);
  const lig = profiel(Math.round(d("liggerprofiel")), 22);
  const fy = Math.round(d("staalsoort"));
  const kwal = Math.round(d("boutkwaliteit"));
  const M = Math.round(d("boutmaat"));
  const cons = Math.round(d("console"));
  const nRij = clamp(Math.round(d("n_boutrijen")), 1, 8);
  const tKp = Math.max(4, d("t_kp"));
  const bKp = Math.max(lig.b, d("b_kp"));
  const eKp = Math.max(1, d("e_kp")), pKp = Math.max(1, d("p_kp")), wKp = Math.max(1, d("w_kp"));
  const hCons = Math.max(0, d("h_console")), lCons = Math.max(0, d("l_console"));
  const aFl = Math.max(1, d("a_flens")), aLf = Math.max(1, d("a_lijf"));
  const Lb = Math.max(500, d("L_b")), MEd = d("M_Ed"), VEd = d("V_Ed");
  const d0 = GAT[M] ?? M + 2;

  // Kopplaathoogte volgt uit de boutverdeling, maar minstens de liggerhoogte.
  const rijAf = Array.from({ length: nRij }, (_, i) => eKp + i * pKp);   // vanaf de bovenkant
  const hKp = Math.max(lig.h + (cons > 0 ? hCons : 0), rijAf[nRij - 1] + eKp);
  const rest = hKp - rijAf[nRij - 1];

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 16;
  const W = box.w, H = Math.max(300, box.h - capH);
  // In een smalle pane passen twee aanzichten niet naast elkaar; dan onder
  // elkaar, elk over de volle breedte. De verticale schaal blijft gedeeld.
  const gestapeld = W < 560;
  const ZW = gestapeld ? W : Math.min(W * 0.60, W - 190);   // zijaanzicht
  const KWv = gestapeld ? W : W - ZW - gap;                 // kopplaataanzicht
  const VH = gestapeld ? Math.max(200, (H - gap - capH) / 2) : H;
  const offX = gestapeld ? 0 : ZW + gap;             // x-nulpunt van het tweede beeld

  const totMM = hKp + 160;                           // verticaal beeldgebied
  const s = clamp(Math.min((VH - 130) / totMM, (ZW - 150) / (kol.h + 320), (KWv - 120) / (bKp * 1.5)), 0.02, 1.6);

  // zijaanzicht — kolom links, ligger naar rechts
  const xKol = 74;                                   // linkerflens van de kolom
  const kolB = kol.h * s;                            // in zijaanzicht zien we de profielhoogte
  const xKp0 = xKol + kolB, xKp1 = xKp0 + tKp * s;
  const yTop = 76;                                   // bovenkant kopplaat
  const yLig1 = yTop + lig.h * s;                    // onderkant ligger
  const yKpB = yTop + hKp * s;                       // onderkant kopplaat
  const xLig1 = Math.min(ZW - 30, xKp1 + 210);
  const tfL = Math.max(2, lig.tf * s), twL = Math.max(2, lig.tw * s);
  const tfK = Math.max(2, kol.tf * s);
  const yRij = rijAf.map((a) => yTop + a * s);

  // kopplaataanzicht — zelfde verticale schaal
  const kcx = offX + KWv / 2;
  const xKp = kcx - (bKp * s) / 2;
  const boutR = Math.max(3.2, (d0 * s) / 2);
  const boutX = [kcx - (wKp * s) / 2, kcx + (wKp * s) / 2];

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — momentverbinding</strong>
        <span className="vd-uc info">{kol.naam} / {lig.naam} · {2 * nRij}× M{M}</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Systeem</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Stabiliteit
            <select style={{ width: "100%" }} value={stab} onChange={(e) => set("stabiliteit", parseInt(e.target.value))}>
              <option value={1}>Ongeschoord</option>
              <option value={2}>Geschoord</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Type verbinding
            <select style={{ width: "100%" }} value={vbType} onChange={(e) => set("verbindingstype", parseInt(e.target.value))}>
              <option value={1}>Geboute verbinding</option>
              <option value={2}>Gelaste verbinding</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Kopplaat
            <select style={{ width: "100%" }} value={kpType} onChange={(e) => set("kopplaattype", parseInt(e.target.value))}>
              <option value={1}>Korte kopplaat</option>
              <option value={2}>Doorlopende kopplaat</option>
              <option value={3}>Overstekende kopplaat</option>
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
          <label>Randafstand e (mm)
            <input type="number" step={5} value={eKp} onChange={(e) => set("e_kp", parseFloat(e.target.value))} />
          </label>
          <label>Steek p (mm)
            <input type="number" step={5} value={pKp} onChange={(e) => set("p_kp", parseFloat(e.target.value))} />
          </label>
          <label title="Horizontale hart-op-hart afstand van de bouten, links en rechts van het lijf">Boutafstand w (mm)
            <input type="number" step={5} value={wKp} onChange={(e) => set("w_kp", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Kopplaat en console</span>
          <label>Dikte kopplaat (mm)
            <input type="number" step={2} value={tKp} onChange={(e) => set("t_kp", parseFloat(e.target.value))} />
          </label>
          <label>Breedte kopplaat (mm)
            <input type="number" step={10} value={bKp} onChange={(e) => set("b_kp", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Console onder
            <select style={{ width: "100%" }} value={cons} onChange={(e) => set("console", parseInt(e.target.value))}>
              <option value={0}>Geen</option>
              <option value={1}>Console zonder flens</option>
              <option value={2}>Console met flens</option>
            </select>
          </label>
          {cons > 0 && (
            <>
              <label>Hoogte console (mm)
                <input type="number" step={10} value={hCons} onChange={(e) => set("h_console", parseFloat(e.target.value))} />
              </label>
              <label>Lengte console (mm)
                <input type="number" step={10} value={lCons} onChange={(e) => set("l_console", parseFloat(e.target.value))} />
              </label>
            </>
          )}
          <label>Keel flenslas a (mm)
            <input type="number" step={1} value={aFl} onChange={(e) => set("a_flens", parseFloat(e.target.value))} />
          </label>
          <label>Keel lijflas a (mm)
            <input type="number" step={1} value={aLf} onChange={(e) => set("a_lijf", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Kopplaat wordt {fmt(hKp)} mm hoog: {nRij} rij(en) op {fmt(eKp)} + {nRij - 1}×{fmt(pKp)},
            met {fmt(rest)} mm rest onderaan.</span>

          <span className="vd-ctrl-h">Belasting</span>
          <label>Overspanning L<sub>b</sub> (mm)
            <input type="number" step={500} value={Lb} onChange={(e) => set("L_b", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>Ed</sub> (kNm)
            <input type="number" step={5} value={MEd} onChange={(e) => set("M_Ed", parseFloat(e.target.value))} />
          </label>
          <label>V<sub>Ed</sub> (kN)
            <input type="number" step={10} value={VEd} onChange={(e) => set("V_Ed", parseFloat(e.target.value))} />
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: gestapeld ? "column" : "row", alignItems: gestapeld ? "stretch" : "flex-start", gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Zijaanzicht</div>
            <div className="vd-stage" style={{ width: ZW, height: VH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={ZW} height={VH} className="vd-svg">
                <Defs k="mz" />
                {/* kolom over de volle hoogte */}
                <rect x={xKol} y={20} width={kolB} height={H - 60} fill="#eaf1fb" stroke="#1e40af" strokeWidth={1.5} />
                <line x1={xKol + tfK} y1={20} x2={xKol + tfK} y2={H - 40} stroke="#1e40af" strokeWidth={0.9} />
                <line x1={xKol + kolB - tfK} y1={20} x2={xKol + kolB - tfK} y2={H - 40} stroke="#1e40af" strokeWidth={0.9} />
                <text x={xKol + kolB / 2} y={H - 24} textAnchor="middle" style={{ fontSize: 10.5, fill: "#1e40af", fontWeight: 700 }}>{kol.naam}</text>

                {/* kopplaat */}
                <rect x={xKp0} y={yTop} width={tKp * s} height={hKp * s} fill="#c9d9f0" stroke="#1e40af" strokeWidth={1.5} />

                {/* ligger */}
                <rect x={xKp1} y={yTop} width={xLig1 - xKp1} height={tfL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                <rect x={xKp1} y={yLig1 - tfL} width={xLig1 - xKp1} height={tfL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                <rect x={xKp1} y={yTop + tfL} width={xLig1 - xKp1} height={yLig1 - tfL - (yTop + tfL)} fill="#f2f6fc" stroke="#1e40af" strokeWidth={0.9} />
                <line x1={xKp1} y1={(yTop + yLig1) / 2} x2={xLig1} y2={(yTop + yLig1) / 2} stroke="#1e40af" strokeWidth={0.8} strokeDasharray="10 4 2 4" />
                <text x={(xKp1 + xLig1) / 2} y={yTop - 10} textAnchor="middle" style={{ fontSize: 10.5, fill: "#1e40af", fontWeight: 700 }}>
                  {lig.naam} · L<tspan baselineShift="sub">b</tspan> = {fmt(Lb)}
                </text>

                {/* console onder de ligger */}
                {cons > 0 && (
                  <g>
                    <path d={`M ${xKp1} ${yLig1} L ${xKp1} ${yLig1 + hCons * s} L ${xKp1 + lCons * s} ${yLig1} Z`}
                      fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                    {cons === 2 && (
                      <path d={`M ${xKp1} ${yLig1 + hCons * s} L ${xKp1 + lCons * s} ${yLig1} L ${xKp1 + lCons * s} ${yLig1 + tfL} L ${xKp1 + tfL * 1.2} ${yLig1 + hCons * s} Z`}
                        fill="#bfd3ee" stroke="#1e40af" strokeWidth={1.2} />
                    )}
                  </g>
                )}

                {/* lassen ligger op kopplaat */}
                <Las x={xKp1 + 1} y={yTop + tfL} a={Math.max(4, aFl * s * 2.2)} />
                <Las x={xKp1 + 1} y={yLig1 - tfL + Math.max(4, aLf * s * 2.2)} a={Math.max(3, aLf * s * 2.2)} />

                {/* boutrijen, doorgetrokken tot in de kolom */}
                {yRij.map((y, i) => (
                  <g key={i}>
                    <line x1={xKol + kolB * 0.18} y1={y} x2={xKp1 + 16} y2={y} stroke="#9ca3af" strokeWidth={0.9} strokeDasharray="9 3 2 3" />
                    <rect x={xKol + kolB - tfK - 4} y={y - Math.max(2, (M * s) / 2)} width={tfK + tKp * s + 10} height={Math.max(4, M * s)}
                      fill="#e8eaee" stroke="#4b5563" strokeWidth={1} />
                  </g>
                ))}

                {/* krachten */}
                {VEd !== 0 && (
                  <line x1={xKp1 + 40} y1={yTop - 42} x2={xKp1 + 40} y2={yTop - 4} className="vd-load" strokeWidth={3} markerEnd={loadMark("mz")} />
                )}
                {MEd !== 0 && (
                  <path d={`M ${xKp1 + 118} ${(yTop + yLig1) / 2 - 24} A 24 24 0 1 1 ${xKp1 + 119} ${(yTop + yLig1) / 2 - 24}`}
                    fill="none" stroke="#dc2626" strokeWidth={2.4} markerEnd={loadMark("mz")} />
                )}

                {/* maatvoering: kopplaathoogte */}
                <VDim k="mz" y0={yTop} y1={yKpB} x={xKol - 28} ext={xKol - 6} />
              </svg>

              <Ro text={`hkp=${fmt(hKp)}`} x={xKol - 28} y={(yTop + yKpB) / 2} title="kopplaathoogte volgt uit de boutverdeling" />
              <Dim ctx={ctx} name="t_kp" value={tKp} x={xKp0 + (tKp * s) / 2} y={yKpB + 18} step={2} label="t" />
              {cons > 0 && <Dim ctx={ctx} name="h_console" value={hCons} x={xKp1 + 26} y={yLig1 + (hCons * s) / 2} step={10} label="hc" />}
              {cons > 0 && <Dim ctx={ctx} name="l_console" value={lCons} x={xKp1 + (lCons * s) / 2} y={yLig1 + hCons * s + 14} step={10} label="lc" />}
              {VEd !== 0 && <Force ctx={ctx} name="V_Ed" value={VEd} x={xKp1 + 74} y={yTop - 50} unit="kN" label="V_Ed" />}
              {MEd !== 0 && <Force ctx={ctx} name="M_Ed" value={MEd} x={xKp1 + 156} y={(yTop + yLig1) / 2 - 34} unit="kNm" label="M_Ed" step={5} />}
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Kopplaat</div>
            <div className="vd-stage" style={{ width: KWv, height: VH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={KWv} height={VH} className="vd-svg">
                <Defs k="mk" />
                {/* kopplaat */}
                <rect x={xKp - offX} y={yTop} width={bKp * s} height={hKp * s} fill="#eef2f7" stroke="#1e40af" strokeWidth={1.5} />
                {/* liggerprofiel erachter */}
                <rect x={kcx - offX - (lig.b * s) / 2} y={yTop} width={lig.b * s} height={tfL} fill="#c9d9f0" stroke="#1e40af" strokeWidth={1.1} />
                <rect x={kcx - offX - (lig.b * s) / 2} y={yLig1 - tfL} width={lig.b * s} height={tfL} fill="#c9d9f0" stroke="#1e40af" strokeWidth={1.1} />
                <rect x={kcx - offX - twL / 2} y={yTop + tfL} width={twL} height={yLig1 - tfL - (yTop + tfL)} fill="#c9d9f0" stroke="#1e40af" strokeWidth={1.1} />
                {/* console-flens onderin */}
                {cons === 2 && (
                  <rect x={kcx - offX - (lig.b * s) / 2} y={yKpB - tfL} width={lig.b * s} height={tfL} fill="#bfd3ee" stroke="#1e40af" strokeWidth={1.1} />
                )}
                {/* bouten */}
                {yRij.map((y, i) => boutX.map((bx, j) => (
                  <Bout key={`${i}-${j}`} cx={bx - offX} cy={y} r={boutR} />
                )))}
                {/* maatketen verticaal */}
                <VDim k="mk" y0={yTop} y1={yRij[0]} x={xKp - offX - 26} ext={xKp - offX - 4} />
                {yRij.slice(0, -1).map((y, i) => (
                  <VDim key={i} k="mk" y0={y} y1={yRij[i + 1]} x={xKp - offX - 26} ext={xKp - offX - 4} />
                ))}
                <VDim k="mk" y0={yRij[nRij - 1]} y1={yKpB} x={xKp - offX - 26} ext={xKp - offX - 4} />
                {/* horizontale maten */}
                <HDim k="mk" x0={boutX[0] - offX} x1={boutX[1] - offX} y={yKpB + 22} ext={yKpB + 4} />
                <HDim k="mk" x0={xKp - offX} x1={xKp - offX + bKp * s} y={yKpB + 44} />
              </svg>

              <Dim ctx={ctx} name="e_kp" value={eKp} x={xKp - offX - 26} y={(yTop + yRij[0]) / 2} step={5} label="e" />
              {yRij.slice(0, -1).map((y, i) => (
                <Dim key={i} ctx={ctx} name="p_kp" value={pKp} x={xKp - offX - 26} y={(y + yRij[i + 1]) / 2} step={5} label="p" />
              ))}
              <Ro text={fmt(rest)} x={xKp - offX - 26} y={(yRij[nRij - 1] + yKpB) / 2} title="rest tot de onderkant van de kopplaat" />
              <Dim ctx={ctx} name="w_kp" value={wKp} x={kcx - offX} y={yKpB + 22} step={5} label="w" />
              <Dim ctx={ctx} name="b_kp" value={bKp} x={kcx - offX} y={yKpB + 44} step={10} label="b" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of rode belasting om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />Beide aanzichten delen één verticale schaal, dus elke boutrij staat links en rechts op dezelfde hoogte.</span>
        <span className="vd-live">
          {stab === 1 ? "ongeschoord" : "geschoord"} · {vbType === 1 ? "geboute" : "gelaste"} verbinding ·
          {kpType === 1 ? " korte" : kpType === 2 ? " doorlopende" : " overstekende"} kopplaat ·
          {kol.naam} / {lig.naam} S{fy} · {nRij} rijen × 2 M{M}–{KWAL.find((k) => k.v === kwal)?.label} ·
          kopplaat {fmt(bKp)}×{fmt(hKp)}×{fmt(tKp)} mm · e/p/w = {fmt(eKp)}/{fmt(pKp)}/{fmt(wKp)} ·
          {cons === 0 ? " geen console" : ` console ${fmt(hCons)}×${fmt(lCons)}`} · a = {fmt(aFl)}/{fmt(aLf)} mm ·
          M<sub>Ed</sub> = {fmt(MEd)} kNm · V<sub>Ed</sub> = {fmt(VEd)} kN
        </span>
      </div>
    </div>
  );
}
