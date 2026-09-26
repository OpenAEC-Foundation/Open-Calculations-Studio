import { useDesigner, Dim, Force, Defs, loadMark, IProfiel, VDim, fmt, clamp, UitkomstKop } from "./designerKit";
import { useBladUitkomst, ucTekst } from "./bladResultaat";
import { profiel, profielOpties } from "./profielen";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het rekenblad "Stalen kolom" (templates/stalenKolom.ts).
 *
 * Links het knikschema: de kolom over de lengte L, met de opleggingen die bij
 * de knikvorm horen, de normaalkracht, de eindmomenten en de gelijkmatige last
 * q_z. Naast de kolom staan L en de drie kniklengtes als aparte maatlijnen,
 * zodat meteen zichtbaar is welke lengte afwijkt.
 *
 * In het midden de momentenlijn op dezelfde hoogte, getekend aan de getrokken
 * zijde. Zo is de tekenafspraak van het blad te zien: gelijk teken van M_yA en
 * M_yB is enkele kromming, en een positieve q_z geeft een positief veldmoment.
 *
 * Rechts de doorsnede op schaal, met de sterke en de zwakke as en het
 * aangrijpingspunt van q_z (gedrukte flens, zwaartepunt of getrokken flens).
 *
 * De toetsing zelf staat in het blad; de kop en de regel onderaan tonen de
 * uitkomsten die het blad geeft.
 */
const MARKER = "Stalen kolom";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const LASTHOOGTE = [
  { v: 1, label: "Op de gedrukte flens" },
  { v: 2, label: "In het zwaartepunt" },
  { v: 3, label: "Op de getrokken flens" },
];

// Een HEA 180 S235 van 3,2 m met 400 kN druk en eindmomenten in dubbele
// kromming. Dezelfde waarden als de standaardinvoer van
// scripts/check-stalenkolom.mjs.
const DEFAULTS: Record<string, number> = {
  profiel: 5, staalsoort: 235, knikvorm: 1,
  L_kolom: 3200, L_cry: 3200, L_crz: 3200, L_cr: 3200,
  N_Ed: 400, M_yA: 20, M_yB: -10, q_z: 0, lasthoogte: 1,
};

export default function StalenKolomDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const profId = Math.round(d("profiel"));
  const p = profiel(profId, 5);
  const fy = Math.round(d("staalsoort"));
  const knik = Math.round(d("knikvorm"));
  const lastH = clamp(Math.round(d("lasthoogte")), 1, 3);
  const L = Math.max(100, d("L_kolom"));
  const Lcry = Math.max(1, d("L_cry")), Lcrz = Math.max(1, d("L_crz")), Lcr = Math.max(1, d("L_cr"));
  const N = d("N_Ed"), MA = d("M_yA"), MB = d("M_yB"), qz = d("q_z");

  // Uitkomsten van het blad; "—" zolang het blad ze niet toont.
  const g = uitkomst?.getallen ?? {};
  const w = (naam: string) => (g[naam] === undefined ? "—" : ucTekst(g[naam]));
  // Slankheid uit het blad; zolang dat er niet is uit de profieltabel (bruto A).
  const lam1 = 93.9 * Math.sqrt(235 / fy);
  const lamY = g["λ_y"] ?? (knik === 2 ? Math.max(Lcry, L) : Lcry) / p.iy / lam1;
  const lamZ = g["λ_z"] ?? Lcrz / p.iz / lam1;
  const maatgevend = lamZ >= lamY ? "z" : "y";

  // Momentverloop van boven (ξ = 0, M_yA) naar onder (ξ = 1, M_yB) [kNm].
  const Mq = (qz * (L / 1000) ** 2) / 8;
  const Mx = (xi: number) => MA + (MB - MA) * xi + 4 * Mq * xi * (1 - xi);
  const xiExt = Mq !== 0 ? clamp(0.5 + (MB - MA) / (8 * Mq), 0, 1) : 0.5;
  const Mext = Mx(xiExt);
  const Mabs = Math.max(Math.abs(MA), Math.abs(MB), Math.abs(Mext));

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 16;
  // 12 px minder breed: ruimte voor de schuifbalk van het tekengebied
  const W = box.w - 12, H = Math.max(260, box.h - capH);
  // Knikschema en momentenlijn staan altijd naast elkaar, op dezelfde hoogte.
  // In een smalle pane staat de doorsnede daaronder in plaats van ernaast.
  const gestapeld = W < 560;
  const MW = gestapeld ? clamp(W * 0.24, 70, 110) : 110;            // breedte momentenlijn
  const KW = gestapeld ? W - MW - gap : Math.min((W - MW) * 0.6, W - MW - 150 - 2 * gap);
  const DW = gestapeld ? W : W - KW - MW - 2 * gap;                 // breedte doorsnede
  // Twee bijschriften boven elkaar zijn iets hoger dan capH; 8 px speling
  // houdt de schuifbalk weg.
  const KH = gestapeld ? Math.max(190, (H - gap - capH - 8) * 0.70) : H - 8;
  const DH = gestapeld ? Math.max(120, (H - gap - capH - 8) * 0.30) : H - 8;

  const mT = 58, mB = 46;
  const sL = (KH - mT - mB) / L;                    // verticale schaal [px/mm]
  const cx = KW * 0.3;
  const yTop = mT, yBot = mT + L * sL;
  const kolPx = clamp(p.h * sL * 3, 6, 28);          // getekende kolom: hoogte h in het vlak van buiging
  // Vier maatlijnen dicht op elkaar; de chips staan trapsgewijs en mogen over
  // de naastgelegen lijn vallen. Een chip is ongeveer 60 px breed.
  const dimX = [0, 1, 2, 3].map((i) => cx + kolPx / 2 + 30 + i * 34);
  const vierdeMaat = dimX[3] + 22 <= KW;

  // dwarsdoorsnede
  // iets links van het midden: rechts staan de bijschriften van de flenzen
  const sD = clamp(Math.min((DW - 72) / p.b, (DH - 130) / p.h), 0.02, 2.2);
  const dcx = (DW - 56) / 2 + 8, dcy = DH * 0.42;
  const hPx = p.h * sD, bPx = p.b * sD;

  /** Oplegtekens: scharnier onder, en boven een rol (verplaatsbaar) of geleider. */
  const Steun = ({ y, onder }: { y: number; onder: boolean }) => (
    <g>
      <polygon points={`${cx},${y} ${cx - 13},${y + (onder ? 17 : -17)} ${cx + 13},${y + (onder ? 17 : -17)}`}
        fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.5} />
      {onder
        ? <line x1={cx - 20} y1={y + 17} x2={cx + 20} y2={y + 17} stroke="#1e40af" strokeWidth={2} />
        : knik === 2
          ? [-7, 7].map((o) => <circle key={o} cx={cx + o} cy={y - 21} r={4} fill="#fff" stroke="#1e40af" strokeWidth={1.4} />)
          : <line x1={cx - 20} y1={y - 17} x2={cx + 20} y2={y - 17} stroke="#1e40af" strokeWidth={2} />}
    </g>
  );

  /**
   * Eindmoment als boog om het kolomeinde. Een positief moment trekt de
   * rechterzijde (de zijde waar een positieve q_z naartoe wijst): boven
   * linksom, onder rechtsom. Begin en eind wisselen met de draairichting,
   * zodat de cirkel bij elk teken om dezelfde plek (de kolomas) blijft.
   */
  const boog = (y: number, M: number, boven: boolean) => {
    const rechtsom = boven ? M < 0 : M > 0;
    return rechtsom
      ? `M ${cx + 26} ${y + 1} A 26 26 0 1 1 ${cx + 26} ${y}`
      : `M ${cx + 26} ${y} A 26 26 0 1 0 ${cx + 26} ${y + 1}`;
  };

  // momentenlijn: nullijn in het midden, positief naar rechts (getrokken zijde)
  const m0 = MW / 2;
  const sM = Mabs > 0 ? (MW / 2 - 14) / Mabs : 0;
  const mPunten = Array.from({ length: 41 }, (_, i) => {
    const xi = i / 40;
    return `${m0 + Mx(xi) * sM},${yTop + xi * L * sL}`;
  });
  const mVlak = `${m0},${yTop} ${mPunten.join(" ")} ${m0},${yBot}`;
  const toonExt = Mq !== 0 && xiExt > 0.02 && xiExt < 0.98;

  // doorsnede: q_z van boven naar beneden, de gedrukte flens boven
  const yFlensBoven = dcy - hPx / 2, yFlensOnder = dcy + hPx / 2;
  const qPijl = lastH === 1
    ? { y0: yFlensBoven - 34, y1: yFlensBoven - 2 }
    : lastH === 2
      ? { y0: yFlensBoven - 34, y1: dcy - 3 }
      : { y0: yFlensOnder + 2, y1: yFlensOnder + 34 };

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — stalen kolom" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Profiel</span>
          <label>Staalprofiel
            <select value={profId} onChange={(e) => set("profiel", parseInt(e.target.value))}>
              {profielOpties().map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <span className="gd-note">i<sub>y</sub> = {fmt(p.iy, 1)} mm · i<sub>z</sub> = {fmt(p.iz, 1)} mm · A = {fmt(p.A)} mm²</span>

          <span className="vd-ctrl-h">Geometrie (mm)</span>
          <label>Kolomlengte L
            <input type="number" step={100} value={L} onChange={(e) => set("L_kolom", parseFloat(e.target.value))} />
          </label>
          <label title="Kniklengte voor buigknik om de sterke as">Kniklengte L<sub>cr,y</sub>
            <input type="number" step={100} value={Lcry} onChange={(e) => set("L_cry", parseFloat(e.target.value))} />
          </label>
          <label title="Kniklengte voor buigknik om de zwakke as">Kniklengte L<sub>cr,z</sub>
            <input type="number" step={100} value={Lcrz} onChange={(e) => set("L_crz", parseFloat(e.target.value))} />
          </label>
          <label title="Ongesteunde lengte voor kip: de afstand tussen de gaffels">Ongesteunde lengte L<sub>cr</sub>
            <input type="number" step={100} value={Lcr} onChange={(e) => set("L_cr", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Knikvorm om de y-as
            <select style={{ width: "100%" }} value={knik} onChange={(e) => set("knikvorm", parseInt(e.target.value))}>
              <option value={1}>Niet verplaatsbare knopen</option>
              <option value={2}>Verplaatsbare knopen</option>
            </select>
          </label>
          {knik === 2 && Lcry < L && (
            <span className="gd-note" style={{ color: "#b45309" }}>Verplaatsbare knopen: het blad rekent met L<sub>cr,y</sub> = L.</span>
          )}
          <span className="gd-note">Relatieve slankheid λ̄<sub>y</sub> = {fmt(lamY, 2)} · λ̄<sub>z</sub> = {fmt(lamZ, 2)} —
            de {maatgevend === "z" ? "zwakke" : "sterke"} as is maatgevend voor knik.</span>

          <span className="vd-ctrl-h">Belastingen</span>
          <label>N<sub>Ed</sub> (kN)
            <input type="number" step={10} value={N} onChange={(e) => set("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Buigend moment bovenaan; positief trekt de zijde waar een positieve q_z naartoe wijst">M<sub>yA,Ed</sub> (kNm)
            <input type="number" step={5} value={MA} onChange={(e) => set("M_yA", parseFloat(e.target.value))} />
          </label>
          <label title="Buigend moment onderaan; gelijk teken als M_yA is enkele kromming">M<sub>yB,Ed</sub> (kNm)
            <input type="number" step={5} value={MB} onChange={(e) => set("M_yB", parseFloat(e.target.value))} />
          </label>
          <label>q<sub>z,Ed</sub> (kN/m)
            <input type="number" step={1} value={qz} onChange={(e) => set("q_z", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Aangrijpingspunt van q<sub>z</sub>
            <select style={{ width: "100%" }} value={lastH} onChange={(e) => set("lasthoogte", parseInt(e.target.value))}>
              {LASTHOOGTE.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: gestapeld ? "column" : "row", alignItems: gestapeld ? "stretch" : "flex-start", gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div style={{ display: "flex", flexDirection: "row", gap, alignItems: "flex-start" }}>
            <div className="vd-canvas">
              <div className="vd-caption">Knikschema</div>
              <div className="vd-stage" style={{ width: KW, height: KH, background: "transparent", border: "none", borderRadius: 0 }}>
                <svg width={KW} height={KH} className="vd-svg">
                  <Defs k="sk" />
                  {/* de kolom */}
                  <rect x={cx - kolPx / 2} y={yTop} width={kolPx} height={L * sL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.5} />
                  <line x1={cx} y1={yTop} x2={cx} y2={yBot} stroke="#1e40af" strokeWidth={0.9} strokeDasharray="10 4 2 4" />
                  <Steun y={yBot} onder />
                  <Steun y={yTop} onder={false} />

                  {/* normaalkracht bovenaan */}
                  <line x1={cx} y1={yTop - 46} x2={cx} y2={yTop - 4} className="vd-load" strokeWidth={3.2} markerEnd={loadMark("sk")} />

                  {/* eindmomenten */}
                  {MA !== 0 && <path d={boog(yTop + 14, MA, true)} fill="none" stroke="#dc2626" strokeWidth={2.2} markerEnd={loadMark("sk")} />}
                  {MB !== 0 && <path d={boog(yBot - 15, MB, false)} fill="none" stroke="#dc2626" strokeWidth={2.2} markerEnd={loadMark("sk")} />}

                  {/* gelijkmatige last loodrecht op de kolom, in de richting van q_z */}
                  {qz !== 0 && Array.from({ length: 7 }, (_, i) => {
                    const y = yTop + ((L * sL) / 6) * i;
                    const xk = cx - kolPx / 2;
                    return qz > 0
                      ? <line key={i} x1={xk - 34} y1={y} x2={xk - 4} y2={y} className="vd-load" strokeWidth={2} markerEnd={loadMark("sk")} />
                      : <line key={i} x1={xk - 2} y1={y} x2={xk - 32} y2={y} className="vd-load" strokeWidth={2} markerEnd={loadMark("sk")} />;
                  })}
                  {qz !== 0 && <line x1={cx - kolPx / 2 - 34} y1={yTop} x2={cx - kolPx / 2 - 34} y2={yBot} stroke="#dc2626" strokeWidth={1.4} />}

                  {/* L en de kniklengtes als aparte maatkolommen */}
                  <VDim k="sk" y0={yTop} y1={yBot} x={dimX[0]} ext={cx + kolPx / 2 + 6} />
                  <VDim k="sk" y0={yTop} y1={yTop + Math.min(Lcry, L) * sL} x={dimX[1]} />
                  <VDim k="sk" y0={yTop} y1={yTop + Math.min(Lcrz, L) * sL} x={dimX[2]} />
                  {vierdeMaat && <VDim k="sk" y0={yTop} y1={yTop + Math.min(Lcr, L) * sL} x={dimX[3]} />}
                </svg>

                <Force ctx={ctx} name="N_Ed" value={N} x={cx + 34} y={yTop - 56} unit="kN" label="N_Ed" />
                {MA !== 0 && <Force ctx={ctx} name="M_yA" value={MA} x={cx + 30} y={yTop - 30} unit="kNm" label="M_yA" step={5} />}
                {MB !== 0 && <Force ctx={ctx} name="M_yB" value={MB} x={cx + 30} y={yBot + 6} unit="kNm" label="M_yB" step={5} />}
                {qz !== 0 && <Force ctx={ctx} name="q_z" value={qz} x={Math.max(38, cx - kolPx / 2 - 60)} y={(yTop + yBot) / 2 - 12} unit="kN/m" label="q_z" step={1} />}
                {/* de chips trapsgewijs, zodat ze bij gelijke lengtes niet over elkaar vallen */}
                <Dim ctx={ctx} name="L_kolom" value={L} x={dimX[0]} y={(yTop + yBot) / 2 - 33} step={100} label="L" />
                <Dim ctx={ctx} name="L_cry" value={Lcry} x={dimX[1]} y={yTop + (Math.min(Lcry, L) * sL) / 2 - 11} step={100} label="Lcr,y" />
                <Dim ctx={ctx} name="L_crz" value={Lcrz} x={dimX[2]} y={yTop + (Math.min(Lcrz, L) * sL) / 2 + 11} step={100} label="Lcr,z" />
                {vierdeMaat && <Dim ctx={ctx} name="L_cr" value={Lcr} x={dimX[3]} y={yTop + (Math.min(Lcr, L) * sL) / 2 + 33} step={100} label="Lcr" title="Ongesteunde lengte voor kip — klik om te wijzigen" />}
              </div>
            </div>

            <div className="vd-canvas">
              <div className="vd-caption">M<sub>y</sub>-lijn</div>
              <div className="vd-stage" style={{ width: MW, height: KH, background: "transparent", border: "none", borderRadius: 0 }}>
                <svg width={MW} height={KH} className="vd-svg">
                  <line x1={m0} y1={yTop} x2={m0} y2={yBot} stroke="#374151" strokeWidth={1.2} />
                  {Mabs > 0 && <polygon points={mVlak} fill="rgba(239,68,68,0.18)" stroke="none" />}
                  {Mabs > 0 && <polyline points={mPunten.join(" ")} fill="none" stroke="#dc2626" strokeWidth={2} strokeLinejoin="round" />}
                  {MA !== 0 && <text x={m0 + (MA > 0 ? 4 : -4)} y={yTop - 6} textAnchor={MA > 0 ? "start" : "end"} style={{ fontSize: 10, fill: "#dc2626", fontWeight: 700 }}>{fmt(MA, 1)}</text>}
                  {MB !== 0 && <text x={m0 + (MB > 0 ? 4 : -4)} y={yBot + 14} textAnchor={MB > 0 ? "start" : "end"} style={{ fontSize: 10, fill: "#dc2626", fontWeight: 700 }}>{fmt(MB, 1)}</text>}
                  {toonExt && (
                    <>
                      <circle cx={m0 + Mext * sM} cy={yTop + xiExt * L * sL} r={2.6} fill="#dc2626" />
                      <text x={m0 + Mext * sM + (Mext >= 0 ? -4 : 4)} y={yTop + xiExt * L * sL - 6} textAnchor={Mext >= 0 ? "end" : "start"}
                        style={{ fontSize: 10, fill: "#dc2626", fontWeight: 700, stroke: "#fff", strokeWidth: 3, paintOrder: "stroke" }}>{fmt(Mext, 1)}</text>
                    </>
                  )}
                  {Mabs === 0 && <text x={m0} y={(yTop + yBot) / 2} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>geen buiging</text>}
                  <text x={m0} y={KH - 20} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>kNm, aan de</text>
                  <text x={m0} y={KH - 8} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>getrokken zijde</text>
                </svg>
              </div>
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: DW, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={DW} height={DH} className="vd-svg">
                <Defs k="sd" />
                <IProfiel cx={dcx} cy={dcy} h={p.h} b={p.b} tw={p.tw} tf={p.tf} s={sD} />
                {/* assen */}
                <line x1={dcx - bPx / 2 - 16} y1={dcy} x2={dcx + bPx / 2 + 16} y2={dcy}
                  stroke="#dc2626" strokeWidth={1} strokeDasharray="9 4 2 4" />
                <line x1={dcx} y1={dcy - hPx / 2 - 16} x2={dcx} y2={dcy + hPx / 2 + 16}
                  stroke="#dc2626" strokeWidth={1} strokeDasharray="9 4 2 4" />
                <text x={dcx + bPx / 2 + 20} y={dcy + 4} style={{ fontSize: 11, fill: "#dc2626", fontWeight: 700 }}>y</text>
                <text x={dcx + 8} y={dcy + hPx / 2 + 26} style={{ fontSize: 11, fill: "#dc2626", fontWeight: 700 }}>z</text>
                {/* aangrijpingspunt van q_z; grijs zolang er geen q_z is */}
                <line x1={dcx + 14} y1={qPijl.y0} x2={dcx + 14} y2={qPijl.y1} className={qz !== 0 ? "vd-load" : undefined}
                  stroke={qz !== 0 ? undefined : "#9ca3af"} strokeWidth={2.4} markerEnd={qz !== 0 ? loadMark("sd") : undefined} />
                <text x={dcx + 22} y={(qPijl.y0 + qPijl.y1) / 2 + 4} style={{ fontSize: 10, fill: qz !== 0 ? "#dc2626" : "#9ca3af", fontWeight: 700 }}>q_z</text>
                <text x={dcx + bPx / 2 + 4} y={yFlensBoven + 4} style={{ fontSize: 9, fill: "#6b7280" }}>gedrukt</text>
                <text x={dcx + bPx / 2 + 4} y={yFlensOnder + 4} style={{ fontSize: 9, fill: "#6b7280" }}>getrokken</text>
                <text x={dcx} y={dcy + hPx / 2 + 48} textAnchor="middle" style={{ fontSize: 11, fill: "#1e40af", fontWeight: 700 }}>
                  {p.naam}
                </text>
                <text x={dcx} y={dcy + hPx / 2 + 62} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>
                  {fmt(p.h)} × {fmt(p.b)} · t<tspan baselineShift="sub" fontSize={8}>f</tspan>={fmt(p.tf, 1)} · t<tspan baselineShift="sub" fontSize={8}>w</tspan>={fmt(p.tw, 1)}
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of rode belasting om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De momentenlijn staat aan de getrokken zijde; de doorsnede toont waar q<sub>z</sub> aangrijpt, met de gedrukte flens boven.</span>
        <span className="vd-live">
          {p.naam} S{fy} · L = {fmt(L)} mm · L<sub>cr,y</sub>/L<sub>cr,z</sub>/L<sub>cr</sub> = {fmt(Lcry)}/{fmt(Lcrz)}/{fmt(Lcr)} mm ·
          {knik === 1 ? " niet verplaatsbaar" : " verplaatsbaar"} · N<sub>Ed</sub> = {fmt(N)} kN · M<sub>Ed</sub> = {fmt(Mabs, 1)} kNm ·
          UC dwarskracht {w("UC_V")} · doorsnede {w("UC_d")} · knik {w("UC_N")} · kip {w("UC_LT")} ·
          (6.61) {w("UC_661")} · (6.62) {w("UC_662")}
        </span>
      </div>
    </div>
  );
}
