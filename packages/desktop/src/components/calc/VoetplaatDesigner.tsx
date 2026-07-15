import { useState } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { useLoadCaseStore } from "../../store/loadCaseStore";
import "./VoetplaatDesigner.css";

/**
 * Losstaand, interactief parametrisch beeld van de voetplaatverbinding.
 *
 * Leest/schrijft dezelfde invoervariabelen als de rekensheet
 * (`voetplaatverbinding.ts`) via de loadCaseStore, zodat de tekening en het
 * uitvoeringsdocument altijd in sync zijn. Elke maat op de tekening is
 * aanklikbaar → inline bewerkbaar; de drukweerstand-UC loopt live mee.
 *
 * Marker waarop we detecteren dat de actieve sheet de voetplaat is:
 */
const MARKER = "Voetplaatverbinding";

interface Prof { name: string; h: number; b: number; tw: number; tf: number }

// id → profieleigenschappen (mm). Gelijk aan de matrix in voetplaatverbinding.ts.
const PROFILES: Record<number, Prof> = {
  1: { name: "HEB 100", h: 100, b: 100, tw: 6, tf: 10 },
  2: { name: "HEB 120", h: 120, b: 120, tw: 6.5, tf: 11 },
  3: { name: "HEB 140", h: 140, b: 140, tw: 7, tf: 12 },
  4: { name: "HEB 160", h: 160, b: 160, tw: 8, tf: 13 },
  5: { name: "HEB 180", h: 180, b: 180, tw: 8.5, tf: 14 },
  6: { name: "HEB 200", h: 200, b: 200, tw: 9, tf: 15 },
  7: { name: "HEB 220", h: 220, b: 220, tw: 9.5, tf: 16 },
  8: { name: "HEB 240", h: 240, b: 240, tw: 10, tf: 17 },
  9: { name: "HEB 260", h: 260, b: 260, tw: 10, tf: 17.5 },
  10: { name: "HEB 280", h: 280, b: 280, tw: 10.5, tf: 18 },
  11: { name: "HEB 300", h: 300, b: 300, tw: 11, tf: 19 },
  12: { name: "HEB 320", h: 320, b: 300, tw: 11.5, tf: 20.5 },
  13: { name: "HEB 340", h: 340, b: 300, tw: 12, tf: 21.5 },
  14: { name: "HEB 360", h: 360, b: 300, tw: 12.5, tf: 22.5 },
  15: { name: "HEB 400", h: 400, b: 300, tw: 13.5, tf: 24 },
  16: { name: "HEA 100", h: 96, b: 100, tw: 5, tf: 8 },
  17: { name: "HEA 120", h: 114, b: 120, tw: 5, tf: 8 },
  18: { name: "HEA 140", h: 133, b: 140, tw: 5.5, tf: 8.5 },
  19: { name: "HEA 160", h: 152, b: 160, tw: 6, tf: 9 },
  20: { name: "HEA 180", h: 171, b: 180, tw: 6, tf: 9.5 },
  21: { name: "HEA 200", h: 190, b: 200, tw: 6.5, tf: 10 },
  22: { name: "HEA 220", h: 210, b: 220, tw: 7, tf: 11 },
  23: { name: "HEA 240", h: 230, b: 240, tw: 7.5, tf: 12 },
  24: { name: "HEA 260", h: 250, b: 260, tw: 7.5, tf: 12.5 },
  25: { name: "HEA 280", h: 270, b: 280, tw: 8, tf: 13 },
  26: { name: "HEA 300", h: 290, b: 300, tw: 8.5, tf: 14 },
  27: { name: "HEA 320", h: 310, b: 300, tw: 9, tf: 15.5 },
  28: { name: "HEA 340", h: 330, b: 300, tw: 9.5, tf: 16.5 },
  29: { name: "HEA 360", h: 350, b: 300, tw: 10, tf: 17.5 },
  30: { name: "HEA 400", h: 390, b: 300, tw: 11, tf: 19 },
  31: { name: "IPE 200", h: 200, b: 100, tw: 5.6, tf: 8.5 },
  32: { name: "IPE 220", h: 220, b: 110, tw: 5.9, tf: 9.2 },
  33: { name: "IPE 240", h: 240, b: 120, tw: 6.2, tf: 9.8 },
  34: { name: "IPE 270", h: 270, b: 135, tw: 6.6, tf: 10.2 },
  35: { name: "IPE 300", h: 300, b: 150, tw: 7.1, tf: 10.7 },
  36: { name: "IPE 330", h: 330, b: 160, tw: 7.5, tf: 11.5 },
  37: { name: "IPE 360", h: 360, b: 170, tw: 8, tf: 12.7 },
  38: { name: "IPE 400", h: 400, b: 180, tw: 8.6, tf: 13.5 },
};

const LAYOUTS: { v: number; label: string }[] = [
  { v: 1, label: "Plaat = profiel, 2 ankers" },
  { v: 2, label: "Plaat = profiel, 4 ankers" },
  { v: 3, label: "Plaat > profiel, 4 ankers" },
  { v: 4, label: "Plaat > profiel, 6 ankers (eerlijk)" },
  { v: 5, label: "6 ankers — dichtheid links" },
  { v: 6, label: "Plaat > profiel, 6 ankers — dichtheid rechts" },
];

const STAAL = [235, 275, 355];
const BETON: { v: number; label: string }[] = [
  { v: 20, label: "C20/25" }, { v: 25, label: "C25/30" }, { v: 30, label: "C30/37" },
  { v: 35, label: "C35/45" }, { v: 40, label: "C40/50" }, { v: 45, label: "C45/55" },
  { v: 50, label: "C50/60" },
];

/**
 * Anker-posities (mm, oorsprong = plaatmidden), met edge-afstand a maar
 * altijd buiten het profiel geklemd (gx,gy = halve profielafmetingen) zodat
 * de ankers nooit over het staal vallen.
 */
function anchorPositions(
  layout: number, dp: number, bp: number, a: number, gx: number, gy: number,
): [number, number][] {
  const ex = dp / 2, ey = bp / 2;
  const clr = Math.max(8, Math.min(dp, bp) * 0.04); // vrije ruimte tot het staal
  const xE = Math.min(ex - 3, Math.max(gx + clr, ex - a)); // buitenkolom langs d
  const yE = Math.min(ey - 3, Math.max(gy + clr, ey - a)); // rij langs b
  const xi = Math.min(ex - 3, gx + clr);                   // binnenkolom net buiten flens
  if (layout === 1) return [[-xE, 0], [xE, 0]];
  let cols: number[];
  if (layout === 2 || layout === 3) cols = [-xE, xE];
  else if (layout === 5) cols = [-xE, -xi, xE];
  else if (layout === 6) cols = [-xE, xi, xE];
  else cols = [-xE, 0, xE]; // layout 4 — eerlijk verdeeld
  const out: [number, number][] = [];
  for (const x of cols) { out.push([x, yE]); out.push([x, -yE]); }
  return out;
}

export default function VoetplaatDesigner() {
  const source = useDocumentStore((s) => s.source);
  const activeId = useLoadCaseStore((s) => s.activeId);
  const valuesByCase = useLoadCaseStore((s) => s.valuesByCase);
  const setActiveValue = useLoadCaseStore((s) => s.setActiveValue);
  const [editing, setEditing] = useState<string | null>(null);

  const isVoetplaat = source.includes(MARKER);
  if (!isVoetplaat) return null;

  const vals = valuesByCase[activeId] ?? {};
  const num = (name: string, def: number): number => {
    const raw = vals[name];
    if (raw === undefined || raw === "") return def;
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };
  const setVal = (name: string, value: number) => setActiveValue(name, String(value));

  // ── invoer ─────────────────────────────────────────────────────────────
  const profileId = Math.round(num("profile", 11));
  const prof = PROFILES[profileId] ?? PROFILES[11];
  const fy = Math.round(num("staalsoort", 235));
  const layout = Math.round(num("layout", 2));
  const t_p = num("t_p", 25);
  const c_rand = num("c_rand", 50);
  const d_extra = num("d_extra", 100);
  const a_anker = num("a_anker", 35);
  const h_b = num("h_b", 300);
  const h_ef = num("h_ef", 200);
  const t_g = num("t_g", 30);
  const N_Ed = num("N_Ed", 300);
  const V_Ed = num("V_Ed", 0);
  const M_Ed = num("M_Ed", 0);
  const fck = Math.round(num("betonklasse", 25));

  // ── afgeleide geometrie ─────────────────────────────────────────────────
  const plaatLanger = layout === 3 || layout === 4 || layout === 6 ? 1 : 0;
  const b_p = prof.b + 2 * c_rand;
  const d_p = prof.h + 2 * c_rand + plaatLanger * d_extra;

  // ── live drukweerstand (spiegelt voetplaatverbinding.ts §8) ─────────────
  const A_c0 = b_p * d_p;
  const A_c1 = Math.min(b_p + h_b, 3 * b_p) * Math.min(d_p + h_b, 3 * d_p);
  const k_j = Math.min(3, Math.sqrt(A_c1 / A_c0));
  const f_cd = fck / 1.5;
  const f_jd = (2 / 3) * k_j * f_cd;
  const c = t_p * Math.sqrt(fy / (3 * f_jd));
  const A_pr_f = (prof.tf + 2 * c) * Math.min(prof.b + 2 * c, b_p);
  const A_pr_w = (prof.tw + 2 * c) * Math.max(0, prof.h - 2 * prof.tf - 2 * c);
  const A_prent = 2 * A_pr_f + A_pr_w;
  const N_Rd = (f_jd * A_prent) / 1000; // kN
  const UC_druk = N_Ed > 0 ? N_Ed / N_Rd : 0;
  const ucOk = UC_druk <= 1.0;

  // ── tekenhelpers ────────────────────────────────────────────────────────
  // Klikbare maat als HTML-chip, absoluut gepositioneerd over de tekening.
  function Dim(props: {
    name: string; value: number; x: number; y: number;
    label: string; step?: number;
  }) {
    const { name, value, x, y, label, step = 5 } = props;
    const isEd = editing === name;
    return (
      <div className="vd-dim" style={{ left: x, top: y }}>
        {isEd ? (
          <input
            className="vd-dim-input"
            type="number"
            step={step}
            defaultValue={value}
            autoFocus
            onBlur={(e) => { setVal(name, parseFloat(e.target.value)); setEditing(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setVal(name, parseFloat((e.target as HTMLInputElement).value)); setEditing(null); }
              if (e.key === "Escape") setEditing(null);
            }}
          />
        ) : (
          <button className="vd-dim-num" title={`${label} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {Number.isInteger(value) ? value : value.toFixed(0)}
          </button>
        )}
      </div>
    );
  }

  // Bewerkbaar krachtlabel (rood) — N, V of M op de tekening.
  function Force(props: { name: string; value: number; x: number; y: number; unit: string; step?: number }) {
    const { name, value, x, y, unit, step = 10 } = props;
    const isEd = editing === name;
    return (
      <div className="vd-force" style={{ left: x, top: y }}>
        {isEd ? (
          <input
            className="vd-dim-input"
            type="number"
            step={step}
            defaultValue={value}
            autoFocus
            onBlur={(e) => { setVal(name, parseFloat(e.target.value)); setEditing(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setVal(name, parseFloat((e.target as HTMLInputElement).value)); setEditing(null); }
              if (e.key === "Escape") setEditing(null);
            }}
          />
        ) : (
          <button className="vd-force-num" title={`${name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {Number.isInteger(value) ? value : value.toFixed(0)}<small>{unit}</small>
          </button>
        )}
      </div>
    );
  }

  // ── maatlijn-helpers (SVG) ──────────────────────────────────────────────
  const defsDim = (
    <defs>
      <marker id="vdDim" markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M9 1 L1 4.5 L9 8" className="vd-dimarrow" />
      </marker>
      <marker id="vdArrow" markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1 L9 4.5 L1 8 Z" className="vd-loadfill" />
      </marker>
    </defs>
  );
  const dimH = (xa: number, xb: number, y: number, featY: number, key?: string) => (
    <g className="vd-dimline" key={key}>
      <line x1={xa} y1={featY} x2={xa} y2={y} />
      <line x1={xb} y1={featY} x2={xb} y2={y} />
      <line x1={xa} y1={y} x2={xb} y2={y} className="vd-dimmeasure" markerStart="url(#vdDim)" markerEnd="url(#vdDim)" />
    </g>
  );
  const dimV = (ya: number, yb: number, x: number, featX: number, key?: string) => (
    <g className="vd-dimline" key={key}>
      <line x1={featX} y1={ya} x2={x} y2={ya} />
      <line x1={featX} y1={yb} x2={x} y2={yb} />
      <line x1={x} y1={ya} x2={x} y2={yb} className="vd-dimmeasure" markerStart="url(#vdDim)" markerEnd="url(#vdDim)" />
    </g>
  );

  // ── Gedeelde horizontale schaal: zij- en bovenaanzicht delen breedte + x-uitlijning ──
  const SW = 520, Sm = 80;
  const sH = Math.min((SW - 2 * Sm) / d_p, 300 / b_p); // px per mm (beide aanzichten)
  const plLeft = Sm, plWs = d_p * sH, plRight = plLeft + plWs;
  const colCx = plLeft + plWs / 2;                     // hart profiel (gedeeld)

  // ── ZIJAANZICHT (elevatie) ──────────────────────────────────────────────
  const SH = 430;
  const colPx = 158;                                   // schematische kolomhoogte
  const stackMM = t_p + t_g + h_b;
  const yColTop = 46;                                  // kopruimte voor N-pijl
  const sV = (SH - yColTop - colPx - 52) / stackMM;    // verticale (schematische) schaal
  const yPlateTop = yColTop + colPx;
  const yPlateBot = yPlateTop + t_p * sV;
  const yGroutBot = yPlateBot + t_g * sV;
  const yFndBot = yGroutBot + h_b * sV;
  const yAncBot = yGroutBot + h_ef * sV;
  const colW = Math.max(20, prof.h * sH);              // profieldiepte op ware schaal
  const colLeft = colCx - colW / 2;
  const mR = Math.min(colW * 0.34, colPx * 0.46);      // straal halve-cirkel moment
  const mBase = yPlateTop - 3;                          // diameter net boven het beton

  // ── BOVENAANZICHT (plattegrond) — zelfde schaal + x-uitlijning als elevatie ──
  const gx = prof.h / 2, gy = prof.b / 2;
  const anchors = anchorPositions(layout, d_p, b_p, a_anker, gx, gy);
  const ancMx = anchors.map((p) => p[0]);
  const ancLeftPx = colCx + Math.min(...ancMx) * sH;
  const ancRightPx = colCx + Math.max(...ancMx) * sH;
  const pdW = d_p * sH, pdH = b_p * sH;                 // plaat (px) — pdW = elevatieplaat
  const phW = prof.h * sH, phH = prof.b * sH;           // profiel (px)
  const ftf = Math.max(3, prof.tf * sH), ftw = Math.max(3, prof.tw * sH);
  const cxT = colCx, cyT = 40 + pdH / 2;
  const TW = SW, TH = cyT + pdH / 2 + 78;
  const mmToPxT = (mx: number, my: number): [number, number] => [cxT + mx * sH, cyT - my * sH];
  const plL = plLeft, plR = plRight, plT = cyT - pdH / 2, plB = cyT + pdH / 2;
  const prT = cyT - phH / 2; // profiel-bovenkant (voor c_rand-maatlijn)

  // ── mini-preview van de actuele ankerverdeling (naast de dropdown) ────────
  const pvW = 168, pvH = 116, pvm = 10;
  const pvS = Math.min((pvW - 2 * pvm) / d_p, (pvH - 2 * pvm) / b_p);
  const pvCx = pvW / 2, pvCy = pvH / 2;
  const pvPW = d_p * pvS, pvPH = b_p * pvS;
  const pvHW = prof.h * pvS, pvHH = prof.b * pvS;
  const pvTf = Math.max(2, prof.tf * pvS), pvTw = Math.max(2, prof.tw * pvS);

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — voetplaatverbinding</strong>
        <span className={`vd-uc ${ucOk ? "ok" : "bad"}`}>
          UC<sub>druk</sub> = {UC_druk.toFixed(3)} {ucOk ? "✓ voldoet" : "✗ voldoet niet"}
        </span>
      </div>

            <div className="vd-body">
            <div className="vd-controls">
              <label>Profiel
                <select value={profileId} onChange={(e) => setVal("profile", parseInt(e.target.value))}>
                  {Object.entries(PROFILES).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
                </select>
              </label>
              <label>Staalsoort
                <select value={fy} onChange={(e) => setVal("staalsoort", parseInt(e.target.value))}>
                  {STAAL.map((s) => <option key={s} value={s}>S{s}</option>)}
                </select>
              </label>
              <label>Betonklasse
                <select value={fck} onChange={(e) => setVal("betonklasse", parseInt(e.target.value))}>
                  {BETON.map((b) => <option key={b.v} value={b.v}>{b.label}</option>)}
                </select>
              </label>
              <label>Ankerverdeling
                <select value={layout} onChange={(e) => setVal("layout", parseInt(e.target.value))}>
                  {LAYOUTS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
                </select>
              </label>
              <div className="vd-preview">
                <svg width={pvW} height={pvH}>
                  <rect x={pvCx - pvPW / 2} y={pvCy - pvPH / 2} width={pvPW} height={pvPH} className="vd-plate2" />
                  <rect x={pvCx - pvHW / 2} y={pvCy - pvHH / 2} width={pvTf} height={pvHH} className="vd-steel" />
                  <rect x={pvCx + pvHW / 2 - pvTf} y={pvCy - pvHH / 2} width={pvTf} height={pvHH} className="vd-steel" />
                  <rect x={pvCx - pvHW / 2} y={pvCy - pvTw / 2} width={pvHW} height={pvTw} className="vd-steel" />
                  {anchors.map(([mx, my], i) => (
                    <circle key={i} cx={pvCx + mx * pvS} cy={pvCy - my * pvS} r={3.2} className="vd-bolt" />
                  ))}
                </svg>
              </div>
              {plaatLanger === 1 && (
                <label>d<sub>extra</sub> (mm)
                  <input type="number" step={20} value={d_extra} onChange={(e) => setVal("d_extra", parseFloat(e.target.value))} />
                </label>
              )}
            </div>

            <div className="vd-canvases">
              {/* ── ZIJAANZICHT ── */}
              <div className="vd-canvas">
                <div className="vd-caption">Zijaanzicht</div>
                <div className="vd-stage" style={{ width: SW, height: SH }}>
                  <svg width={SW} height={SH} className="vd-svg">
                    {defsDim}
                    <rect x={plLeft} y={yGroutBot} width={plWs} height={yFndBot - yGroutBot} className="vd-concrete" />
                    <rect x={plLeft} y={yPlateBot} width={plWs} height={yGroutBot - yPlateBot} className="vd-grout" />
                    <rect x={plLeft} y={yPlateTop} width={plWs} height={yPlateBot - yPlateTop} className="vd-plate" />
                    <rect x={colLeft} y={yColTop} width={colW} height={colPx} className="vd-col" />
                    <line x1={colLeft + colW / 2} y1={yColTop} x2={colLeft + colW / 2} y2={yPlateTop} className="vd-web" />
                    {/* ankers */}
                    {[ancLeftPx, ancRightPx].map((ax, i) => (
                      <path key={i} d={`M ${ax} ${yPlateTop} L ${ax} ${yAncBot} q 0 10 ${ax < colCx ? 10 : -10} 10`} className="vd-anchor" />
                    ))}
                    {/* krachten: N (verticaal omlaag), V (horizontaal), M (moment) */}
                    <line x1={colCx} y1={8} x2={colCx} y2={yColTop} className="vd-load" markerEnd="url(#vdArrow)" />
                    <line x1={colLeft - 48} y1={yPlateTop - 16} x2={colLeft} y2={yPlateTop - 16} className="vd-load" markerEnd="url(#vdArrow)" />
                    <path
                      d={`M ${colCx - mR} ${mBase} A ${mR} ${mR} 0 0 1 ${colCx + mR} ${mBase}`}
                      className="vd-load" fill="none" markerEnd="url(#vdArrow)"
                    />
                    {/* maatlijnen */}
                    {dimV(yPlateTop, yPlateBot, plRight + 22, plRight, "tp")}
                    {dimV(yPlateBot, yGroutBot, plRight + 22, plRight, "tg")}
                    {dimV(yGroutBot, yAncBot, plRight + 52, plRight, "hef")}
                    {dimV(yGroutBot, yFndBot, plLeft - 28, plLeft, "hb")}
                    {dimH(plLeft, plRight, yFndBot + 26, yFndBot, "dp")}
                  </svg>
                  <Force name="N_Ed" value={N_Ed} x={colCx + 20} y={18} unit="kN" />
                  <Force name="V_Ed" value={V_Ed} x={colLeft - 68} y={yPlateTop - 16} unit="kN" />
                  <Force name="M_Ed" value={M_Ed} x={colCx} y={mBase - mR - 12} unit="kNm" />
                  <Dim name="t_p" value={t_p} x={plRight + 22} y={yPlateTop - 5} label="t_p" step={1} />
                  <Dim name="t_g" value={t_g} x={plRight + 22} y={yGroutBot + 5} label="t_g" step={5} />
                  <Dim name="h_ef" value={h_ef} x={plRight + 52} y={(yGroutBot + yAncBot) / 2} label="h_ef" step={10} />
                  <Dim name="h_b" value={h_b} x={plLeft - 28} y={(yGroutBot + yFndBot) / 2} label="h_b" step={50} />
                  <div className="vd-dim-ro" style={{ left: (plLeft + plRight) / 2, top: yFndBot + 26 }}>
                    d<sub>p</sub> = {d_p.toFixed(0)}
                  </div>
                </div>
              </div>

              {/* ── BOVENAANZICHT ── */}
              <div className="vd-canvas">
                <div className="vd-caption">Bovenaanzicht</div>
                <div className="vd-stage" style={{ width: TW, height: TH }}>
                  <svg width={TW} height={TH} className="vd-svg">
                    {defsDim}
                    <rect x={plL} y={plT} width={pdW} height={pdH} className="vd-plate2" />
                    {/* H-profiel */}
                    <rect x={cxT - phW / 2} y={cyT - phH / 2} width={ftf} height={phH} className="vd-steel" />
                    <rect x={cxT + phW / 2 - ftf} y={cyT - phH / 2} width={ftf} height={phH} className="vd-steel" />
                    <rect x={cxT - phW / 2} y={cyT - ftw / 2} width={phW} height={ftw} className="vd-steel" />
                    {/* ankers (geklemd buiten het profiel) */}
                    {anchors.map(([mx, my], i) => {
                      const [px, py] = mmToPxT(mx, my);
                      return <circle key={i} cx={px} cy={py} r={6} className="vd-bolt" />;
                    })}
                    {/* maatlijnen */}
                    {dimH(plL, plR, plB + 30, plB, "dp")}
                    {dimH(plL, ancLeftPx, plB + 56, plB, "aa")}
                    {dimV(plT, plB, plR + 30, plR, "bp")}
                    {dimV(plT, prT, plL - 30, plL, "cr")}
                  </svg>
                  <div className="vd-dim-ro" style={{ left: (plL + plR) / 2, top: plB + 30 }}>
                    d<sub>p</sub> = {d_p.toFixed(0)}
                  </div>
                  <div className="vd-dim-ro" style={{ left: plR + 30, top: cyT }}>
                    b<sub>p</sub> = {b_p.toFixed(0)}
                  </div>
                  <Dim name="a_anker" value={a_anker} x={(plL + ancLeftPx) / 2} y={plB + 56} label="a_anker" step={5} />
                  <Dim name="c_rand" value={c_rand} x={plL - 30} y={(plT + prT) / 2} label="c_rand" step={5} />
                </div>
              </div>
            </div>
            </div>

            <div className="vd-foot">
              <span>Klik op een blauwe maat om die te wijzigen — de waarde stroomt direct terug in de rekensheet en het uitvoeringsdocument.</span>
              <span className="vd-live">A<sub>prent</sub> = {A_prent.toFixed(0)} mm² · f<sub>jd</sub> = {f_jd.toFixed(2)} N/mm² · N<sub>Rd</sub> = {N_Rd.toFixed(0)} kN</span>
            </div>
    </div>
  );
}
