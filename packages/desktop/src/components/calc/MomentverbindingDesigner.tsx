import { useDesigner, Dim, Force, Ro, Defs, loadMark, Bout, Las, HDim, VDim, fmt, clamp, UitkomstKop } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import { profiel, profielOpties } from "./profielen";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een momentvaste ligger-kolomverbinding.
 *
 * Twee aanzichten met één gedeelde verticale schaal, zodat elke boutrij in het
 * zijaanzicht op dezelfde hoogte staat als in het kopplaataanzicht:
 *   • Zijaanzicht — de kolom in doorsnede, de ligger erop met de kopplaat
 *     ertussen en, als die gekozen is, de console eronder. De hartlijnen van
 *     de boutrijen lopen door tot in de kolom; het drukpunt staat erbij.
 *   • Kopplaataanzicht — de kopplaat met het liggerprofiel erachter en de
 *     bouten links en rechts van het lijf, met de maatketen e — p — … — rest.
 *
 * De rijen liggen zoals in het blad (templates/momentverbinding.ts): bij een
 * korte kopplaat de eerste op e_kp onder de bovenkant van de ligger; bij een
 * overstekende of doorlopende kopplaat steekt de plaat u_kp boven de ligger
 * uit, ligt rij 1 op e_kp onder de plaatrand en rij 2 op p_fl daaronder. Daarna
 * telkens p_kp. Ligt de laatste rij buiten de plaat, dan groeit de plaat mee.
 *
 * De toetsing zit in het blad; het beeld leest daar de UC en het oordeel uit.
 * Of de sluitring van een rij een flens of flenslas raakt, rekent het beeld met
 * dezelfde zones als het blad (bots_1 …): de flens met aan weerszijden het
 * lasbeen a·√2, verbreed met de straal van de sluitring. Zo'n rij wordt rood,
 * net als bij een uitstekende kopplaat een eerste rij die niet boven de ligger
 * ligt of een tweede rij die er nog boven ligt.
 */
const MARKER = "Momentverbinding";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const KWAL = [{ v: 46, label: "4.6" }, { v: 56, label: "5.6" }, { v: 88, label: "8.8" }, { v: 109, label: "10.9" }];
const MAAT = [12, 16, 20, 24, 27, 30];
const GAT: Record<number, number> = { 12: 13, 16: 18, 20: 22, 24: 26, 27: 30, 30: 33 };
/** Buitendiameter van de sluitring, ISO 7089 — als in het blad. */
const RING: Record<number, number> = { 12: 24, 16: 30, 20: 37, 24: 44, 27: 50, 30: 56 };
const KOLOMMEN = [13, 14, 15, 16, 17, 18, 19, 20, 6, 8, 10];
const LIGGERS = [21, 22, 23, 24, 25, 26, 27];

const DEFAULTS: Record<string, number> = {
  stabiliteit: 1, verbindingstype: 1, kopplaattype: 3,
  kolomprofiel: 14, liggerprofiel: 22, staalsoort: 235, boutkwaliteit: 88, boutmaat: 16,
  console: 2, n_boutrijen: 4, t_kp: 15, b_kp: 140, e_kp: 30, p_kp: 60, w_kp: 70,
  u_kp: 60, p_fl: 70,
  h_console: 120, l_console: 240, a_flens: 5, a_lijf: 3,
  L_b: 6000, M_Ed: 60, V_Ed: 80, N_c_Ed: 100,
};

const ROOD = "#dc2626";

export default function MomentverbindingDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const stab = Math.round(d("stabiliteit"));
  const vbType = Math.round(d("verbindingstype"));
  const geb = vbType === 1;                             // geboute kopplaat
  const kpType = Math.round(d("kopplaattype"));
  const ext = geb && kpType !== 1;                      // plaat steekt boven de ligger uit
  const kol = profiel(Math.round(d("kolomprofiel")), 14);
  const lig = profiel(Math.round(d("liggerprofiel")), 22);
  const fy = Math.round(d("staalsoort"));
  const kwal = Math.round(d("boutkwaliteit"));
  const M = Math.round(d("boutmaat"));
  const cons = Math.round(d("console"));
  const nRij = clamp(Math.round(d("n_boutrijen")), 1, 8);
  const tKpIn = d("t_kp");
  const tKp = geb ? Math.max(4, tKpIn) : 0;              // getekend; het blad keurt t ≤ 0 af
  const bKp = Math.max(lig.b, d("b_kp"));
  const eKp = Math.max(1, d("e_kp")), pKp = Math.max(1, d("p_kp")), wKp = Math.max(1, d("w_kp"));
  const uKp = ext ? Math.max(1, d("u_kp")) : 0;
  const pFl = Math.max(1, d("p_fl"));
  const hConsIn = d("h_console"), lConsIn = d("l_console");
  const hCons = cons > 0 ? Math.max(0, hConsIn) : 0, lCons = Math.max(0, lConsIn);  // getekend; het blad keurt h, l ≤ 0 af
  const aFl = Math.max(1, d("a_flens")), aLf = Math.max(1, d("a_lijf"));
  const Lb = d("L_b"), MEd = d("M_Ed"), VEd = d("V_Ed"), NcEd = d("N_c_Ed");
  const d0 = GAT[M] ?? M + 2;

  // Diepte vanaf de bovenkant van de ligger, naar beneden positief (als het blad).
  const yPlaat = ext ? -uKp : 0;
  const rijY = Array.from({ length: nRij }, (_, i) =>
    i === 0 ? yPlaat + eKp : yPlaat + eKp + (ext ? pFl : pKp) + (i - 1) * pKp);
  const onderNom = lig.h + hCons + (geb && kpType === 2 ? uKp : 0);
  const onder = geb ? Math.max(onderNom, rijY[nRij - 1] + eKp) : lig.h + hCons;
  const hKp = onder - yPlaat;                                  // kopplaathoogte
  const rest = onder - rijY[nRij - 1];
  // Drukpunt (figuur 6.15): de flens van de console, anders de onderflens.
  const tfV = cons === 2 ? lig.tf * Math.sqrt(1 + (hCons / Math.max(lCons, 1)) ** 2) : lig.tf;  // schuine flens op het plaatvlak
  const yDruk = cons === 2 ? lig.h + hCons - tfV / 2 : lig.h - lig.tf / 2;
  // Zones van flens en flenslas (diepte), verbreed met de straal van de sluitring.
  const been = Math.SQRT2 * aFl, rw = (RING[M] ?? 2 * M) / 2;
  // Een buitenlas kan alleen waar de kopplaat buiten de flens uitsteekt (als het blad).
  const lasBoven = ext ? 1 : 0, lasOnder = geb && kpType === 2 ? 1 : 0;
  const zones: [number, number][] = [[-lasBoven * been, lig.tf + been], [lig.h - lig.tf - been, lig.h + (cons === 2 ? 1 : lasOnder) * been]];
  if (cons === 2) zones.push([lig.h + hCons - tfV - been, lig.h + hCons + lasOnder * been]);
  const botst = rijY.map((y) => zones.some(([o, u]) => y > o - rw && y < u + rw));
  // Bij een uitstekende kopplaat hoort rij 1 boven de ligger en rij 2 eronder;
  // anders keurt het blad af (ok_ext).
  const rij1Onder = ext && rijY[0] >= 0;
  const rij2Boven = ext && nRij >= 2 && rijY[1] <= 0;
  const bots = (i: number) => geb && (botst[i] || (rij1Onder && i === 0) || (rij2Boven && i === 1));
  const nBots = geb ? botst.filter(Boolean).length : 0;

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
  const yKpT = 76;                                   // bovenkant kopplaat
  const yLig0 = yKpT - yPlaat * s;                   // bovenkant ligger
  const yLig1 = yLig0 + lig.h * s;                   // onderkant ligger
  const yKpB = yKpT + hKp * s;                       // onderkant kopplaat
  const yConsB = yLig1 + hCons * s;                  // onderkant console
  const xLig1 = Math.min(ZW - 30, xKp1 + 210);
  const tfL = Math.max(2, lig.tf * s), twL = Math.max(2, lig.tw * s);
  const tfK = Math.max(2, kol.tf * s);
  const yRij = rijY.map((a) => yLig0 + a * s);
  const yC = yLig0 + yDruk * s;

  // kopplaataanzicht — zelfde verticale schaal
  const kcx = offX + KWv / 2;
  const xKp = kcx - (bKp * s) / 2;
  const boutR = Math.max(3.2, (d0 * s) / 2);
  const boutX = [kcx - (wKp * s) / 2, kcx + (wKp * s) / 2];
  const kettingY = [yKpT, ...yRij, yKpB];            // maatketen e — p — … — rest

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — momentverbinding" uitkomst={uitkomst} />

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
          {geb && (
            <label style={{ flexDirection: "column", alignItems: "stretch" }}>Kopplaat
              <select style={{ width: "100%" }} value={kpType} onChange={(e) => set("kopplaattype", parseInt(e.target.value))}>
                <option value={1}>Korte kopplaat</option>
                <option value={2}>Doorlopende kopplaat</option>
                <option value={3}>Overstekende kopplaat</option>
              </select>
            </label>
          )}
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

          {geb && (
            <>
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
              <label title="Van de bovenrand van de kopplaat tot de bovenste boutrij">Randafstand e (mm)
                <input type="number" step={5} value={eKp} onChange={(e) => set("e_kp", parseFloat(e.target.value))} />
              </label>
              {ext && (
                <>
                  <label title="Hoe ver de kopplaat boven de ligger uitsteekt">Uitsteek u (mm)
                    <input type="number" step={5} value={uKp} onChange={(e) => set("u_kp", parseFloat(e.target.value))} />
                  </label>
                  <label title="Van de rij boven de trekflens tot de eerste rij eronder">Steek over flens (mm)
                    <input type="number" step={5} value={pFl} onChange={(e) => set("p_fl", parseFloat(e.target.value))} />
                  </label>
                </>
              )}
              <label title="Steek van de rijen onder de trekflens">Steek p (mm)
                <input type="number" step={5} value={pKp} onChange={(e) => set("p_kp", parseFloat(e.target.value))} />
              </label>
              <label title="Horizontale hart-op-hart afstand van de bouten, links en rechts van het lijf">Boutafstand w (mm)
                <input type="number" step={5} value={wKp} onChange={(e) => set("w_kp", parseFloat(e.target.value))} />
              </label>
            </>
          )}

          <span className="vd-ctrl-h">{geb ? "Kopplaat, console en lassen" : "Console en lassen"}</span>
          {geb && (
            <>
              <label>Dikte kopplaat (mm)
                <input type="number" step={2} value={tKpIn} onChange={(e) => set("t_kp", parseFloat(e.target.value))} />
              </label>
              <label>Breedte kopplaat (mm)
                <input type="number" step={10} value={bKp} onChange={(e) => set("b_kp", parseFloat(e.target.value))} />
              </label>
            </>
          )}
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
                <input type="number" step={10} value={hConsIn} onChange={(e) => set("h_console", parseFloat(e.target.value))} />
              </label>
              <label>Lengte console (mm)
                <input type="number" step={10} value={lConsIn} onChange={(e) => set("l_console", parseFloat(e.target.value))} />
              </label>
            </>
          )}
          <label>Keel flenslas a (mm)
            <input type="number" step={1} value={aFl} onChange={(e) => set("a_flens", parseFloat(e.target.value))} />
          </label>
          <label>Keel lijflas a (mm)
            <input type="number" step={1} value={aLf} onChange={(e) => set("a_lijf", parseFloat(e.target.value))} />
          </label>
          {geb && (
            <span className="gd-note">Kopplaat {fmt(hKp)} mm hoog, {fmt(rest)} mm onder de laatste rij.
              {nBots > 0 && <><br /><span style={{ color: ROOD }}>{nBots} rij(en) raken met de sluitring een flens of flenslas.</span></>}
              {rij1Onder && <><br /><span style={{ color: ROOD }}>Rij 1 ligt niet boven de ligger; maak de uitsteek groter dan e.</span></>}
              {rij2Boven && <><br /><span style={{ color: ROOD }}>Rij 2 ligt ook boven de ligger; maak de steek over de flens groter.</span></>}
            </span>
          )}

          <span className="vd-ctrl-h">Belasting</span>
          <label>M<sub>Ed</sub> (kNm)
            <input type="number" step={5} value={MEd} onChange={(e) => set("M_Ed", parseFloat(e.target.value))} />
          </label>
          <label>V<sub>Ed</sub> (kN)
            <input type="number" step={10} value={VEd} onChange={(e) => set("V_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Normaalkracht in de kolom, druk positief; voor k_wc">N<sub>c,Ed</sub> (kN)
            <input type="number" step={50} value={NcEd} onChange={(e) => set("N_c_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Overspanning van de ligger, voor de classificatie naar stijfheid">Overspanning L<sub>b</sub> (mm)
            <input type="number" step={500} value={Lb} onChange={(e) => set("L_b", parseFloat(e.target.value))} />
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
                {geb && <rect x={xKp0} y={yKpT} width={tKp * s} height={hKp * s} fill="#c9d9f0" stroke="#1e40af" strokeWidth={1.5} />}

                {/* ligger */}
                <rect x={xKp1} y={yLig0} width={xLig1 - xKp1} height={tfL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                <rect x={xKp1} y={yLig1 - tfL} width={xLig1 - xKp1} height={tfL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                <rect x={xKp1} y={yLig0 + tfL} width={xLig1 - xKp1} height={yLig1 - tfL - (yLig0 + tfL)} fill="#f2f6fc" stroke="#1e40af" strokeWidth={0.9} />
                <line x1={xKp1} y1={(yLig0 + yLig1) / 2} x2={xLig1} y2={(yLig0 + yLig1) / 2} stroke="#1e40af" strokeWidth={0.8} strokeDasharray="10 4 2 4" />
                <text x={(xKp1 + xLig1) / 2} y={Math.min(yLig0, yKpT) - 10} textAnchor="middle" style={{ fontSize: 10.5, fill: "#1e40af", fontWeight: 700 }}>
                  {lig.naam} · L<tspan baselineShift="sub">b</tspan> = {fmt(Lb)}
                </text>

                {/* console onder de ligger */}
                {cons > 0 && (
                  <g>
                    <path d={`M ${xKp1} ${yLig1} L ${xKp1} ${yConsB} L ${xKp1 + lCons * s} ${yLig1} Z`}
                      fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                    {cons === 2 && (
                      <path d={`M ${xKp1} ${yConsB} L ${xKp1 + lCons * s} ${yLig1} L ${xKp1 + lCons * s} ${yLig1 + tfL} L ${xKp1 + tfL * 1.2} ${yConsB} Z`}
                        fill="#bfd3ee" stroke="#1e40af" strokeWidth={1.2} />
                    )}
                  </g>
                )}

                {/* lassen ligger op kopplaat of kolom */}
                <Las x={xKp1 + 1} y={yLig0 + tfL + Math.max(4, aFl * s * 2.2)} a={Math.max(4, aFl * s * 2.2)} />
                <Las x={xKp1 + 1} y={yLig1 - tfL} a={Math.max(3, aLf * s * 2.2)} />

                {/* drukpunt */}
                <path d={`M ${xKp0 - 1} ${yC} l -7 -5 l 0 10 Z`} fill={ROOD} opacity={0.75} />

                {/* boutrijen, doorgetrokken tot in de kolom */}
                {geb && yRij.map((y, i) => {
                  const kleur = bots(i) ? ROOD : "#4b5563";
                  return (
                    <g key={i}>
                      <line x1={xKol + kolB * 0.18} y1={y} x2={xKp1 + 16} y2={y} stroke={bots(i) ? ROOD : "#9ca3af"} strokeWidth={0.9} strokeDasharray="9 3 2 3" />
                      <rect x={xKol + kolB - tfK - 4} y={y - Math.max(2, (M * s) / 2)} width={tfK + tKp * s + 10} height={Math.max(4, M * s)}
                        fill={bots(i) ? "#fee2e2" : "#e8eaee"} stroke={kleur} strokeWidth={1} />
                    </g>
                  );
                })}

                {/* krachten */}
                {VEd !== 0 && (
                  <line x1={xKp1 + 40} y1={yLig0 - 42} x2={xKp1 + 40} y2={yLig0 - 4} className="vd-load" strokeWidth={3} markerEnd={loadMark("mz")} />
                )}
                {MEd !== 0 && (
                  <path d={`M ${xKp1 + 118} ${(yLig0 + yLig1) / 2 - 24} A 24 24 0 1 1 ${xKp1 + 119} ${(yLig0 + yLig1) / 2 - 24}`}
                    fill="none" stroke="#dc2626" strokeWidth={2.4} markerEnd={loadMark("mz")} />
                )}

                {/* maatvoering: kopplaathoogte */}
                <VDim k="mz" y0={geb ? yKpT : yLig0} y1={geb ? yKpB : yConsB} x={xKol - 28} ext={xKol - 6} />
              </svg>

              <Ro text={`${geb ? "hkp" : "h"}=${fmt(geb ? hKp : lig.h + hCons)}`} x={xKol - 28} y={((geb ? yKpT : yLig0) + (geb ? yKpB : yConsB)) / 2}
                title={geb ? "kopplaathoogte volgt uit de boutverdeling" : "hoogte van ligger en console"} />
              <Ro text="c" x={xKp0 - 14} y={yC} kleur={ROOD} title="drukpunt (figuur 6.15)" />
              {geb && <Dim ctx={ctx} name="t_kp" value={tKp} x={xKp0 + (tKp * s) / 2} y={yKpB + 18} step={2} label="t" />}
              {cons > 0 && <Dim ctx={ctx} name="h_console" value={hCons} x={xKp1 + 26} y={yLig1 + (hCons * s) / 2} step={10} label="hc" />}
              {cons > 0 && <Dim ctx={ctx} name="l_console" value={lCons} x={xKp1 + (lCons * s) / 2} y={yConsB + 14} step={10} label="lc" />}
              {VEd !== 0 && <Force ctx={ctx} name="V_Ed" value={VEd} x={xKp1 + 74} y={yLig0 - 50} unit="kN" label="V_Ed" />}
              {MEd !== 0 && <Force ctx={ctx} name="M_Ed" value={MEd} x={xKp1 + 156} y={(yLig0 + yLig1) / 2 - 34} unit="kNm" label="M_Ed" step={5} />}
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">{geb ? "Kopplaat" : "Aansluiting op de kolomflens"}</div>
            <div className="vd-stage" style={{ width: KWv, height: VH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={KWv} height={VH} className="vd-svg">
                <Defs k="mk" />
                {/* kopplaat */}
                {geb && <rect x={xKp - offX} y={yKpT} width={bKp * s} height={hKp * s} fill="#eef2f7" stroke="#1e40af" strokeWidth={1.5} />}
                {/* liggerprofiel erachter */}
                <rect x={kcx - offX - (lig.b * s) / 2} y={yLig0} width={lig.b * s} height={tfL} fill="#c9d9f0" stroke="#1e40af" strokeWidth={1.1} />
                <rect x={kcx - offX - (lig.b * s) / 2} y={yLig1 - tfL} width={lig.b * s} height={tfL} fill="#c9d9f0" stroke="#1e40af" strokeWidth={1.1} />
                <rect x={kcx - offX - twL / 2} y={yLig0 + tfL} width={twL}
                  height={(cons > 0 ? yConsB - (cons === 2 ? tfL : 0) : yLig1 - tfL) - (yLig0 + tfL)} fill="#c9d9f0" stroke="#1e40af" strokeWidth={1.1} />
                {/* console-flens onderin */}
                {cons === 2 && (
                  <rect x={kcx - offX - (lig.b * s) / 2} y={yConsB - tfL} width={lig.b * s} height={tfL} fill="#bfd3ee" stroke="#1e40af" strokeWidth={1.1} />
                )}
                {/* bouten */}
                {geb && yRij.map((y, i) => boutX.map((bx, j) => (
                  <Bout key={`${i}-${j}`} cx={bx - offX} cy={y} r={boutR} kleur={bots(i) ? ROOD : undefined} />
                )))}
                {/* maatketen verticaal */}
                {geb && kettingY.slice(0, -1).map((y, i) => (
                  <VDim key={i} k="mk" y0={y} y1={kettingY[i + 1]} x={xKp - offX - 26} ext={xKp - offX - 4} />
                ))}
                {/* horizontale maten */}
                {geb && <HDim k="mk" x0={boutX[0] - offX} x1={boutX[1] - offX} y={yKpB + 22} ext={yKpB + 4} />}
                {geb && <HDim k="mk" x0={xKp - offX} x1={xKp - offX + bKp * s} y={yKpB + 44} />}
              </svg>

              {geb && (
                <>
                  <Dim ctx={ctx} name="e_kp" value={eKp} x={xKp - offX - 26} y={(yKpT + yRij[0]) / 2} step={5} label="e" />
                  {yRij.slice(0, -1).map((y, i) => (
                    ext && i === 0
                      ? <Dim key={i} ctx={ctx} name="p_fl" value={pFl} x={xKp - offX - 26} y={(y + yRij[i + 1]) / 2} step={5} label="pfl" />
                      : <Dim key={i} ctx={ctx} name="p_kp" value={pKp} x={xKp - offX - 26} y={(y + yRij[i + 1]) / 2} step={5} label="p" />
                  ))}
                  <Ro text={fmt(rest)} x={xKp - offX - 26} y={(yRij[nRij - 1] + yKpB) / 2} title="rest tot de onderkant van de kopplaat" />
                  {ext && <Dim ctx={ctx} name="u_kp" value={uKp} x={xKp - offX + bKp * s + 24} y={(yKpT + yLig0) / 2} step={5} label="u" />}
                  <Dim ctx={ctx} name="w_kp" value={wKp} x={kcx - offX} y={yKpB + 22} step={5} label="w" />
                  <Dim ctx={ctx} name="b_kp" value={bKp} x={kcx - offX} y={yKpB + 44} step={10} label="b" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of rode belasting om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />Beide aanzichten delen één verticale schaal. Rode boutrij: de sluitring raakt een flens of flenslas, rij 1 ligt niet boven of rij 2 ligt boven de ligger. Rood driehoekje: drukpunt.</span>
        <span className="vd-live">
          {stab === 1 ? "ongeschoord" : "geschoord"} · {geb ? "geboute" : "gelaste"} verbinding ·
          {geb && (kpType === 1 ? " korte kopplaat ·" : kpType === 2 ? " doorlopende kopplaat ·" : " overstekende kopplaat ·")}
          {" "}{kol.naam} / {lig.naam} S{fy} ·
          {geb && <> {nRij} rijen × 2 M{M}–{KWAL.find((k) => k.v === kwal)?.label} · kopplaat {fmt(bKp)}×{fmt(hKp)}×{fmt(tKp)} mm ·</>}
          {cons === 0 ? " geen console" : ` console ${fmt(hCons)}×${fmt(lCons)}`} · a = {fmt(aFl)}/{fmt(aLf)} mm ·
          M<sub>Ed</sub> = {fmt(MEd)} kNm · V<sub>Ed</sub> = {fmt(VEd)} kN
        </span>
      </div>
    </div>
  );
}
