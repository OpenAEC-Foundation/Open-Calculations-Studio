import { useDesigner, Dim, Force, Ro, Defs, loadMark, betonFill, HDim, VDim, fmt, clamp, JaNee, UitkomstKop } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van het doorponsen van een vlakke plaat.
 *
 * Twee aanzichten met één gedeelde schaal:
 *   • Doorsnede — de plaat met de wapening op dekking, de kolom eronder en de
 *     ponskegel onder 26,6° (spreiding 1 : 2 over 2d), precies de spreiding
 *     waarop de controleperimeter u₁ gebaseerd is.
 *   • Plattegrond — de kolom met de controleperimeter u₁ op 2d volgens
 *     figuur 6.13/6.15: bij een rand- of hoekkolom loopt hij met rechte stukken
 *     dood op de plaatrand. Met ponswapening ook de omtrekken van de staven en
 *     de omtrek u_out,ef waarbuiten geen wapening meer nodig is.
 *
 * De toetsing staat in het blad (templates/ponsberekening.ts). De kop, de
 * getallen bij de invoer en de UC's in de voetregel komen uit het
 * doorgerekende blad; het beeld rekent zelf alleen de geometrie voor de
 * tekening.
 *
 * Bij een rand- of hoekkolom staat c₁ loodrecht op de rand. Positieve
 * excentriciteiten wijzen naar binnen: e_y naar rechts, e_z omhoog.
 */
const MARKER = "Ponsberekening";

const BETON = [20, 25, 30, 35, 40, 45, 50];
const BETONLABEL: Record<number, string> = {
  20: "C20/25", 25: "C25/30", 30: "C30/37", 35: "C35/45", 40: "C40/50", 45: "C45/55", 50: "C50/60",
};
const STAALSOORT = [{ v: 1, label: "B500A" }, { v: 2, label: "B500B" }, { v: 3, label: "B500C" }];
const DIAM = [8, 10, 12, 16, 20, 25];
const DIAM_SW = [6, 8, 10, 12, 16];

const DEFAULTS: Record<string, number> = {
  vorm: 1, plaats: 1, c_1: 300, c_2: 300, h_plaat: 200,
  betonklasse: 45, betonstaal: 2,
  d_wapy: 10, s_wapy: 250, d_wapz: 10, s_wapz: 250, eerstelaag: 1, c_dek: 25,
  V_Ed: 250, beta_keuze: 2, e_y: 0, e_z: 0, beta_hand: 1.15,
  ponswap: 0, d_sw: 10, n_sw: 16, n_om: 3, s_r: 120, a_sw: 80, hoek_pons: 90,
};

/**
 * Keuzelijst over de volle breedte onder zijn label. De compacte invoerkolom
 * geeft een veld `flex: 0 0 96px`; in een label met flexDirection column is dat
 * de hoogte, dus die gaat hier terug naar auto.
 */
const KOLOMKEUZE = { width: "100%", flex: "0 0 auto" } as const;

/** Eén unity check in de voetregel, gekleurd naar de uitkomst. */
function UcChip({ naam, uc }: { naam: string; uc: number | undefined }) {
  if (uc === undefined || !Number.isFinite(uc)) return <span className="vd-uc-nvt">{naam} —</span>;
  const staat = uc > 1 ? "bad" : uc > 0.9 ? "warn" : "ok";
  return <span className={`vd-uc-chip ${staat}`}>{naam} {fmt(uc, 2)}</span>;
}

export default function PonsDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const vorm = Math.round(d("vorm"));                // 1 rechthoekig, 2 rond
  const plaats = Math.round(d("plaats"));            // 1 midden, 2 rand, 3 hoek
  const c1 = Math.max(50, d("c_1"));
  const c2 = vorm === 2 ? c1 : Math.max(50, d("c_2"));
  const hP = Math.max(80, d("h_plaat"));
  const fck = Math.round(d("betonklasse"));
  const staal = Math.round(d("betonstaal"));
  const dy = Math.max(6, d("d_wapy")), sy = Math.max(50, d("s_wapy"));
  const dz = Math.max(6, d("d_wapz")), sz = Math.max(50, d("s_wapz"));
  const eerst = Math.round(d("eerstelaag"));
  const cDek = Math.max(10, d("c_dek"));
  const betaKeuze = Math.round(d("beta_keuze"));    // 2 figuur 6.21N, 0 uit e, 1 handmatig
  const betaHand = d("beta_hand");
  const VEd = d("V_Ed");
  // De excentriciteit telt alleen als β eruit volgt; anders tekent het beeld haar niet.
  const ey = betaKeuze === 0 ? d("e_y") : 0, ez = betaKeuze === 0 ? d("e_z") : 0;
  const ponswap = Math.round(d("ponswap")) === 1;
  const dSw = Math.max(4, d("d_sw")), nSw = Math.max(1, Math.round(d("n_sw")));
  const nOm = Math.max(1, Math.round(d("n_om")));
  const sR = Math.max(10, d("s_r")), aSw = Math.max(0, d("a_sw"));
  const hoekPons = clamp(d("hoek_pons"), 45, 90);

  // Nuttige hoogte: de buitenste laag aan de trekzijde ligt op dekking.
  const dBuiten = eerst === 1 ? dy : dz;
  const dBinnen = eerst === 1 ? dz : dy;
  const dEffBuiten = hP - cDek - dBuiten / 2;
  const dEffBinnen = hP - cDek - dBuiten - dBinnen / 2;
  const dEffY = eerst === 1 ? dEffBuiten : dEffBinnen;
  const dEffZ = eerst === 1 ? dEffBinnen : dEffBuiten;
  const dEffLokaal = (dEffY + dEffZ) / 2;

  // Getallen uit het blad; zolang het blad ze niet toont de eigen geometrie.
  const g = uitkomst?.getallen ?? {};
  const dEff = g.d_eff ?? Math.max(1, dEffLokaal);
  const spreiding = 2 * dEff;                        // afstand van de kolomrand tot u₁
  const u1Blad = g.u_1;
  const u1Red = g.u_1_red;
  const aOut = g.a_out;
  const toon = (v: number | undefined, dec = 0) => (v === undefined ? "—" : fmt(v, dec));

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(280, box.h - 2 * capH - gap);
  const SH = Math.max(110, totH * 0.34), PH = totH - SH;

  const bereik = Math.max(spreiding, aOut ?? 0, ponswap ? aSw + (nOm - 1) * sR : 0);
  const veldMM = Math.max(c1, c2) + 2 * bereik + 2 * Math.max(140, bereik * 0.3);
  const s = clamp(Math.min((W - 120) / veldMM, (PH - 80) / veldMM, (SH - 70) / (hP * 2.4)), 0.005, 1.4);
  const halfF = (veldMM * s) / 2;
  const hw = (c1 * s) / 2, hh = (c2 * s) / 2;

  // doorsnede — bij een rand- of hoekkolom houdt de plaat op aan de buitenkant van de kolom
  const cxS = plaats >= 2 ? W * 0.46 - (halfF - hw) / 2 : W * 0.46;
  const yPl0 = 30, yPl1 = yPl0 + hP * s;
  const xPl0 = plaats >= 2 ? cxS - hw : cxS - halfF, xPl1 = cxS + halfF;
  const spr = spreiding * s;

  // plattegrond — rand links, bij een hoekkolom ook onder
  const cx = plaats >= 2 ? W * 0.46 - (halfF - hw) / 2 : W * 0.46;
  const pcy = plaats === 3 ? PH / 2 + (halfF - hh) / 2 : PH / 2;
  const R = spr;                                     // afstand tot u₁
  const randX = cx - hw, randY = pcy + hh;
  // Maat c₁ tussen de kolom en u₁: onder de kolom, bij een hoekkolom (onder is plaatrand) erboven.
  const c1MaatY = plaats === 3 ? pcy - hh - 30 : pcy + hh + 30;

  /** Omtrek op afstand a (px) van de kolomrand, afgekapt op de plaatrand(en). */
  function omtrek(a: number): string {
    if (plaats === 1) {
      if (vorm === 2) {
        const r = hw + a;
        return `M ${cx - r} ${pcy} A ${r} ${r} 0 1 1 ${cx + r} ${pcy} A ${r} ${r} 0 1 1 ${cx - r} ${pcy} Z`;
      }
      return `M ${cx - hw} ${pcy - hh - a} L ${cx + hw} ${pcy - hh - a} A ${a} ${a} 0 0 1 ${cx + hw + a} ${pcy - hh}`
        + ` L ${cx + hw + a} ${pcy + hh} A ${a} ${a} 0 0 1 ${cx + hw} ${pcy + hh + a} L ${cx - hw} ${pcy + hh + a}`
        + ` A ${a} ${a} 0 0 1 ${cx - hw - a} ${pcy + hh} L ${cx - hw - a} ${pcy - hh} A ${a} ${a} 0 0 1 ${cx - hw} ${pcy - hh - a} Z`;
    }
    if (vorm === 2) {
      const r = hw + a;
      return plaats === 2
        ? `M ${randX} ${pcy - r} L ${cx} ${pcy - r} A ${r} ${r} 0 0 1 ${cx} ${pcy + r} L ${randX} ${pcy + r}`
        : `M ${randX} ${pcy - r} L ${cx} ${pcy - r} A ${r} ${r} 0 0 1 ${cx + r} ${pcy} L ${cx + r} ${randY}`;
    }
    const boven = `M ${randX} ${pcy - hh - a} L ${cx + hw} ${pcy - hh - a} A ${a} ${a} 0 0 1 ${cx + hw + a} ${pcy - hh} L ${cx + hw + a} ${pcy + hh}`;
    return plaats === 2 ? `${boven} A ${a} ${a} 0 0 1 ${cx + hw} ${pcy + hh + a} L ${randX} ${pcy + hh + a}` : boven;
  }

  const betaTekst = betaKeuze === 2 ? "figuur 6.21N" : betaKeuze === 1 ? "handmatig" : "uit e (6.4.3)";

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — pons" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Geometrie (mm)</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Vorm
            <select style={KOLOMKEUZE} value={vorm} onChange={(e) => set("vorm", parseInt(e.target.value))}>
              <option value={1}>Rechthoekige kolom</option>
              <option value={2}>Ronde kolom</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="Rand- en hoekkolom liggen gelijk met de plaatrand; c₁ staat loodrecht op de rand">Plaats
            <select style={KOLOMKEUZE} value={plaats} onChange={(e) => set("plaats", parseInt(e.target.value))}>
              <option value={1}>Middenkolom</option>
              <option value={2}>Randkolom</option>
              <option value={3}>Hoekkolom</option>
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
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="De laag die het dichtst bij de getrokken zijde ligt; boven een kolom is dat de bovenwapening">Buitenste laag, trekzijde
            <select style={KOLOMKEUZE} value={eerst} onChange={(e) => set("eerstelaag", parseInt(e.target.value))}>
              <option value={1}>Langswapening y</option>
              <option value={2}>Langswapening z</option>
            </select>
          </label>
          <label>Dekking c
            <input type="number" step={5} value={cDek} onChange={(e) => set("c_dek", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">d<sub>y</sub> = {fmt(dEffY)} · d<sub>z</sub> = {fmt(dEffZ)} → d = {fmt(dEff)} mm ·
            2d = {fmt(spreiding)} mm.</span>

          <span className="vd-ctrl-h">Belasting</span>
          <label>V<sub>Ed</sub> (kN)
            <input type="number" step={10} value={VEd} onChange={(e) => set("V_Ed", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }} title="§6.4.3">Factor β
            <select style={KOLOMKEUZE} value={betaKeuze} onChange={(e) => set("beta_keuze", parseInt(e.target.value))}>
              <option value={2}>Vereenvoudigd, figuur 6.21N</option>
              <option value={0}>Uit de excentriciteit</option>
              <option value={1}>Handmatig</option>
            </select>
          </label>
          {betaKeuze === 0 && (
            <>
              <label title={plaats === 1 ? "M_Ed/V_Ed in de richting van c₁" : "In de richting van c₁, positief naar binnen"}>e<sub>y</sub> (mm)
                <input type="number" step={10} value={ey} onChange={(e) => set("e_y", parseFloat(e.target.value))} />
              </label>
              <label title={plaats === 3 ? "In de richting van c₂, positief naar binnen" : "M_Ed/V_Ed in de richting van c₂"}>e<sub>z</sub> (mm)
                <input type="number" step={10} value={ez} onChange={(e) => set("e_z", parseFloat(e.target.value))} />
              </label>
            </>
          )}
          {betaKeuze === 1 && (
            <label>β
              <input type="number" step={0.05} value={betaHand} onChange={(e) => set("beta_hand", parseFloat(e.target.value))} />
            </label>
          )}
          <span className="gd-note">u<sub>0</sub> = {toon(g.u_0)} · u<sub>1</sub> = {toon(u1Blad)} mm
            {u1Red !== undefined && <> · u<sub>1</sub>* = {toon(u1Red)} mm</>} · β = {toon(g["β"], 2)} ({betaTekst}).</span>

          <span className="vd-ctrl-h">Ponswapening</span>
          <JaNee label="Ponswapening" waarde={ponswap} onChange={(v) => set("ponswap", v ? 1 : 0)} />
          {ponswap && (
            <>
              <label>Staven
                <span style={{ display: "flex", gap: 4 }}>
                  <input type="number" step={1} min={1} value={d("n_sw")} style={{ width: 44 }}
                    title="Staven per omtrek" onChange={(e) => set("n_sw", parseFloat(e.target.value))} />
                  <select value={dSw} onChange={(e) => set("d_sw", parseFloat(e.target.value))}>
                    {DIAM_SW.map((x) => <option key={x} value={x}>Ø{x}</option>)}
                  </select>
                </span>
              </label>
              <label>Omtrekken
                <input type="number" step={1} min={1} value={d("n_om")} onChange={(e) => set("n_om", parseFloat(e.target.value))} />
              </label>
              <label title="Radiale afstand tussen de omtrekken, ten hoogste 0,75d">s<sub>r</sub>
                <input type="number" step={10} value={d("s_r")} onChange={(e) => set("s_r", parseFloat(e.target.value))} />
              </label>
              <label title="Afstand van de kolomrand tot de eerste omtrek, ten hoogste 0,5d">Eerste omtrek
                <input type="number" step={10} value={d("a_sw")} onChange={(e) => set("a_sw", parseFloat(e.target.value))} />
              </label>
              <label>Hoek α (°)
                <input type="number" step={5} min={45} max={90} value={d("hoek_pons")} onChange={(e) => set("hoek_pons", parseFloat(e.target.value))} />
              </label>
            </>
          )}
          {g.A_sw_nodig !== undefined && (
            <span className="gd-note">Nodig: A<sub>sw</sub> ≥ {fmt(g.A_sw_nodig)} mm² per omtrek bij s<sub>r</sub> = 0,75d.</span>
          )}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: W, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={SH} className="vd-svg">
                <Defs k="pd" />
                {/* plaat */}
                <rect x={xPl0} y={yPl0} width={xPl1 - xPl0} height={hP * s} fill={betonFill("pd")} stroke="#6b7280" strokeWidth={1.3} />
                {/* buitenste wapeningslaag aan de trekzijde, bovenin */}
                <line x1={xPl0 + 4} y1={yPl0 + cDek * s + 2} x2={xPl1 - 4} y2={yPl0 + cDek * s + 2} stroke="#111827" strokeWidth={1.6} />
                {Array.from({ length: 9 }, (_, i) => (
                  <circle key={i} cx={xPl0 + ((xPl1 - xPl0) * (i + 0.5)) / 9} cy={yPl0 + cDek * s + 6}
                    r={Math.max(1.4, dBinnen * s * 0.5)} fill="#111827" />
                ))}
                {/* kolom onder de plaat */}
                <rect x={cxS - hw} y={yPl1} width={c1 * s} height={SH - yPl1 - 26} fill={betonFill("pd")} stroke="#6b7280" strokeWidth={1.3} />
                {/* ponskegel: spreiding 1:2 over 2d; bij een rand- of hoekkolom alleen naar binnen */}
                {plaats === 1 && (
                  <line x1={cxS - hw} y1={yPl1} x2={cxS - hw - spr} y2={yPl0} stroke="#374151" strokeWidth={1.2} strokeDasharray="7 4" />
                )}
                <line x1={cxS + hw} y1={yPl1} x2={cxS + hw + spr} y2={yPl0} stroke="#374151" strokeWidth={1.2} strokeDasharray="7 4" />
                {/* ponswapening */}
                {ponswap && Array.from({ length: nOm }, (_, i) => {
                  // Onder de hoek α met het plaatvlak; de staaf staat op zijn omtrek op halve hoogte.
                  const x = cxS + hw + (aSw + i * sR) * s;
                  const y0 = yPl0 + cDek * s, y1 = yPl1 - cDek * s * 0.6;
                  const dx = (y1 - y0) / 2 / Math.tan((hoekPons * Math.PI) / 180);
                  return x + dx < xPl1 - 4 ? (
                    <line key={`sw${i}`} x1={x + dx} y1={y0} x2={x - dx} y2={y1}
                      stroke="#047857" strokeWidth={1.8} />
                  ) : null;
                })}
                {/* ponskracht */}
                <line x1={cxS} y1={SH - 8} x2={cxS} y2={yPl1 + 8} className="vd-load" strokeWidth={3.2} markerEnd={loadMark("pd")} />
                <VDim k="pd" y0={yPl0} y1={yPl1} x={xPl1 - 18} ext={xPl1 - 2} />
              </svg>

              <Dim ctx={ctx} name="h_plaat" value={hP} x={xPl1 - 18} y={(yPl0 + yPl1) / 2} step={10} label="h" />
              <Force ctx={ctx} name="V_Ed" value={VEd} x={cxS + 52} y={SH - 30} unit="kN" label="V_Ed" />
              {/* onder de plaat, naast de kolom: rechts staat de maat h, links is bij een randkolom geen plaat */}
              <Ro text={`d=${fmt(dEff)}`} x={cxS + hw + spr * 0.5 + 12} y={yPl1 + 14} title="nuttige hoogte, gemiddelde van beide richtingen" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Plattegrond — controleperimeter u<sub>1</sub> op 2d</div>
            <div className="vd-stage" style={{ width: W, height: PH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={PH} className="vd-svg">
                <Defs k="pp" />
                {/* plaatveld */}
                <rect x={plaats >= 2 ? randX : cx - halfF} y={pcy - halfF}
                  width={plaats >= 2 ? cx + halfF - randX : 2 * halfF} height={plaats === 3 ? randY - (pcy - halfF) : 2 * halfF}
                  fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="10 6" />
                {/* plaatrand bij een rand- of hoekkolom */}
                {plaats >= 2 && (
                  <line x1={randX} y1={pcy - halfF} x2={randX} y2={plaats === 3 ? randY : pcy + halfF}
                    stroke="#b45309" strokeWidth={2.2} />
                )}
                {plaats === 3 && (
                  <line x1={randX} y1={randY} x2={cx + halfF} y2={randY} stroke="#b45309" strokeWidth={2.2} />
                )}
                {/* u_out,ef: daarbuiten is geen ponswapening meer nodig */}
                {aOut !== undefined && aOut > 0 && (
                  <path d={omtrek(aOut * s)} fill="none" stroke="#dc2626" strokeWidth={1.1} strokeDasharray="3 4" />
                )}
                {/* omtrekken van de ponswapening */}
                {ponswap && Array.from({ length: nOm }, (_, i) => (
                  <path key={`om${i}`} d={omtrek((aSw + i * sR) * s)} fill="none" stroke="#047857" strokeWidth={1.1} />
                ))}
                {/* controleperimeter u1 */}
                <path d={omtrek(R)} fill="none" stroke="#374151" strokeWidth={1.4} strokeDasharray="8 5" />
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
                <HDim k="pp" x0={cx - hw} x1={cx + hw} y={c1MaatY} ext={plaats === 3 ? pcy - hh - 6 : pcy + hh + 6} />
                {vorm === 1 && <VDim k="pp" y0={pcy - hh} y1={pcy + hh} x={cx + hw + R + 32} ext={cx + hw + 6} />}
                {/* de spreiding 2d */}
                <line x1={cx + hw} y1={pcy - hh - R - 12} x2={cx + hw + R} y2={pcy - hh - R - 12}
                  className="vd-dimmeasure" />
              </svg>

              <Dim ctx={ctx} name="c_1" value={c1} x={cx} y={c1MaatY} step={25} label={vorm === 2 ? "c" : "c1"} />
              {vorm === 1 && <Dim ctx={ctx} name="c_2" value={c2} x={cx + hw + R + 32} y={pcy} step={25} label="c2" />}
              <Ro text={`2d=${fmt(spreiding)}`} x={cx + hw + R / 2} y={pcy - hh - R - 24} title="afstand van de kolomrand tot de controleperimeter" />
              {/* bij een hoekkolom is de onderkant plaatrand: daar het label rechtsboven */}
              <Ro text={`u1=${toon(u1Blad)}`} x={cx + hw + R * 0.72 + 30}
                y={plaats === 3 ? pcy - hh - R * 0.72 - 8 : pcy + hh + R * 0.72 + 8}
                title={plaats === 1 ? "controleperimeter, figuur 6.13" : "controleperimeter tot de plaatrand, figuur 6.15"} />
              {aOut !== undefined && aOut > 0 && (
                <Ro text="u_out,ef" kleur="#dc2626"
                  x={plaats === 3 ? randX + 34 : cx + hw + aOut * s * 0.72 + 30}
                  y={pcy - hh - aOut * s * (plaats === 3 ? 1 : 0.72) - 10}
                  title="(6.54): daarbuiten is geen ponswapening nodig; de buitenste omtrek ligt ten hoogste 1,5d daarbinnen" />
              )}
              {(ey !== 0 || ez !== 0) && (
                <Ro text={`e=(${fmt(ey)}; ${fmt(ez)})`} x={cx + ey * s + 32} y={pcy - ez * s - 16} kleur="#dc2626" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />{BETONLABEL[fck]} · {STAALSOORT.find((o) => o.v === staal)?.label} ·
          {vorm === 2 ? ` ronde kolom Ø${fmt(c1)}` : ` kolom ${fmt(c1)}×${fmt(c2)}`} ·
          {plaats === 1 ? " middenkolom" : plaats === 2 ? " randkolom" : " hoekkolom"} ·
          h = {fmt(hP)} mm · Ø{fmt(dy)}-{fmt(sy)} / Ø{fmt(dz)}-{fmt(sz)}
          {ponswap ? ` · ponswapening ${nOm}× ${nSw}Ø${fmt(dSw)}` : ""}</span>
        <span className="vd-live">
          {g.UC_cs !== undefined
            ? <UcChip naam="met ponswapening" uc={g.UC_cs} />
            : <UcChip naam="pons" uc={g.UC_pons} />}
          <UcChip naam="langs de kolom" uc={g.UC_vRd_max} />
          {g.UC_cs !== undefined && (
            <UcChip naam="detaillering" uc={Math.max(g.UC_uit ?? 0, g.UC_n ?? 0, g.UC_sr ?? 0, g.UC_a ?? 0, g.UC_h ?? 0, g.UC_st ?? 0, g.UC_st_uit ?? 0, g.UC_min ?? 0)} />
          )}
        </span>
      </div>
    </div>
  );
}
