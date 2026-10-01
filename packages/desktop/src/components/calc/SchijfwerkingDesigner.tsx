import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import { useBladUitkomst } from "./bladResultaat";
import { UitkomstKop } from "./designerKit";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Parametrisch beeld van een houten wandschijf (schijfwerking / racking volgens
 * NEN-EN 1995-1-1 §9.2.4). Vooraanzicht van het stijl-en-regelwerk met beplating
 * (board-voegen), plus een horizontale doorsnede met de dubbelzijdige beplating
 * en de stijlen. In dezelfde stijl als de andere designers (transparant,
 * scheidingslijn, streepjes-maatlijnen, responsief, gecentreerd, uniforme schaal).
 *
 * Het beeld rekent zelf niets: de kop toont de maatgevende UC en het oordeel
 * van het blad (templates/schijfwerking.ts), de voetregel de afzonderlijke
 * toetsen uit dezelfde uitwerking. Eerder rekende het beeld de toetsing na.
 */
const MARKER = "Schijfwerking";

const VERBINDING: { v: number; label: string }[] = [
  { v: 1, label: "Schroef" }, { v: 2, label: "Nagel" },
];
const ZIJDIG: { v: number; label: string }[] = [
  { v: 1, label: "1 (enkelzijdig)" }, { v: 2, label: "2 (dubbelzijdig)" },
];
// Detail aan de rand A-C: loopt de regel (boven/onderregel) door over de stijl,
// of loopt de stijl door tot de rand?
const DETAIL: { v: number; label: string }[] = [
  { v: 1, label: "Regel doorlopend" }, { v: 2, label: "Stijl doorlopend" },
];
const STERKTE: { v: number; label: string }[] = [
  { v: 1, label: "C18" }, { v: 2, label: "C24" }, { v: 3, label: "C30" },
];
const KLIMAAT: { v: number; label: string }[] = [
  { v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" },
];

const DEFAULTS: Record<string, number> = {
  verbindingsmiddel: 1, F_f_Rd: 0.42, s_verb: 150, n_zijdig: 2,
  t_bepl: 12, t_stijl: 76, b_stijl: 184, t_regel: 76, b_regel: 184,
  detail_AC: 1, sterkteklasse: 2, klimaatklasse: 1,
  b: 7200, h: 2600, bi: 1220, hoh: 610,
  F1: 5, F2: 5, F_ivEd: 20,
};

export default function SchijfwerkingDesigner() {
  // Invoer hoort bij het exemplaar dat openstaat: twee bladen van dezelfde
  // module delen niets, ook al gebruiken ze dezelfde variabelenamen.
  // Welk blad getekend wordt: normaal het actieve, in de afdruk het blad dat de
  // context aanwijst. `alleenLezen` houdt daar het schrijven tegen.
  const exemplaar = useActiefExemplaar();
  const alleenLezen = useAlleenLezen();
  const activeId = alleenLezen ? "" : (exemplaar?.id ?? "");
  const zetWaarde = useProjectStore((s) => s.zetWaarde);
  const seedWaarden = useProjectStore((s) => s.seedWaarden);
  const source = exemplaar?.source ?? "";
  const zetBladWaarde = useCallback(
    (naam: string, waarde: string) => zetWaarde(activeId, naam, waarde),
    [activeId, zetWaarde],
  );
  const seedBladWaarden = useCallback(
    (defaults: Record<string, string>) => seedWaarden(activeId, defaults),
    [activeId, seedWaarden],
  );
  const [editing, setEditing] = useState<string | null>(null);
  // De uitkomst en de toetsen van het blad zelf.
  const uitkomst = useBladUitkomst();

  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 760, h: 540 });

  const isSchijf = source.includes(MARKER);
  useEffect(() => {
    if (!isSchijf) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isSchijf, activeId, seedBladWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(240, r.width), h: Math.max(260, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isSchijf]);

  if (!isSchijf) return null;

  const vals = exemplaar?.waarden ?? {};
  const num = (name: string, def: number): number => {
    const raw = vals[name];
    if (raw === undefined || raw === "") return def;
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };
  const setVal = (name: string, value: number) => zetBladWaarde(name, String(value));
  const d = (name: string) => num(name, DEFAULTS[name]);

  // ── invoer ──────────────────────────────────────────────────────────────
  const verb = Math.round(d("verbindingsmiddel"));
  const F_f_Rd = d("F_f_Rd");
  const s_verb = d("s_verb");
  const nZij = Math.round(d("n_zijdig"));
  const tBepl = d("t_bepl");
  const tStijl = d("t_stijl");
  const bStijl = d("b_stijl");
  const tRegel = d("t_regel");
  const bRegel = d("b_regel");
  const detail = Math.round(d("detail_AC"));
  const sterkte = Math.round(d("sterkteklasse"));
  const klim = Math.round(d("klimaatklasse"));
  const b = d("b"), h = d("h"), bi = d("bi"), hoh = d("hoh");
  const F1 = d("F1"), F2 = d("F2"), F_ivEd = d("F_ivEd");

  // Toetsen uit de uitwerking; "—" zolang het blad ze niet toont.
  const fmt = (v: number, dec: number) => v.toFixed(dec).replace(".", ",");
  const g = uitkomst?.getallen ?? {};
  const w = (naam: string, dec: number) => (g[naam] === undefined ? "—" : fmt(g[naam], dec));
  // Anker, glijden en plaat toont het blad alleen als hun capaciteit is
  // ingevuld; anders zijn ze niet getoetst (en zegt de slotzin dat ook).
  const open = (naam: string) => (g[naam] !== undefined ? fmt(g[naam], 2) : uitkomst ? "niet getoetst" : "—");

  // ── klikbare maat/kracht-chips ────────────────────────────────────────────
  function Dim(props: { name: string; value: number; x: number; y: number; step?: number; factor?: number; unit?: string; label?: string }) {
    const { name, value, x, y, step = 10, factor = 1, unit = "", label } = props;
    const disp = +(value * factor).toFixed(factor < 1 ? 2 : 0);
    const isEd = editing === name;
    return (
      <div className="vd-dim" style={{ left: x, top: y }}>
        {isEd ? (
          <input className="vd-dim-input" type="number" step={step} defaultValue={disp} autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => { setVal(name, parseFloat(e.target.value) / factor); setEditing(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setVal(name, parseFloat((e.target as HTMLInputElement).value) / factor); setEditing(null); }
              if (e.key === "Escape") setEditing(null);
            }} />
        ) : (
          <button className="vd-dim-num" style={{ whiteSpace: "nowrap" }} title={`${label ?? name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {label ? `${label}=` : ""}{disp}{unit}
          </button>
        )}
      </div>
    );
  }
  function Force(props: { name: string; value: number; x: number; y: number; label: string; step?: number; id?: string; title?: string }) {
    const { name, value, x, y, label, step = 1, title } = props;
    const editId = props.id ?? name;                     // los van `name`: zo kunnen twee chips
    const isEd = editing === editId;                     // dezelfde waarde tonen zonder elkaars focus te stelen
    return (
      <div className="vd-force" style={{ left: x, top: y }}>
        {isEd ? (
          <input className="vd-dim-input" type="number" step={step} defaultValue={value} autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => { setVal(name, parseFloat(e.target.value)); setEditing(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setVal(name, parseFloat((e.target as HTMLInputElement).value)); setEditing(null); }
              if (e.key === "Escape") setEditing(null);
            }} />
        ) : (
          <button className="vd-force-num" title={`${title ?? label} — klik om te wijzigen`} onClick={() => setEditing(editId)}>
            {label}={Number.isInteger(value) ? value : value.toFixed(1)}<small>kN</small>
          </button>
        )}
      </div>
    );
  }

  const defs = (
    <defs>
      <marker id="swDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
      </marker>
      <marker id="swLoad" markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1 L9 4.5 L1 8 Z" className="vd-loadfill" />
      </marker>
    </defs>
  );

  // ── layout: vult het gemeten tekengebied, gecentreerd, uniforme schaal ─────
  const capH = 26;
  const W = box.w, H = box.h - capH;
  // Ruimte voor de krachten F_i,v,Ed links onder en rechts boven; met 66 en 84
  // vielen die chips half buiten het tekenvlak.
  const mL = 104, mR = 118, mT = 46, mB = 40;
  const gapMid = 46;                                   // ruimte tussen aanzicht en doorsnede
  const secDepth = bStijl + 2 * tBepl;                 // doorsnede-dikte (wanddiepte)
  // In een smal paneel wordt de ruimte naast de marges negatief; dan krimpt de
  // tekening tot een ondergrens in plaats van met negatieve maten om te klappen.
  const availW = Math.max(20, W - mL - mR);
  const s = Math.min(availW / b, Math.max(20, H - mT - mB - gapMid) / (h + secDepth));  // uniforme fit-schaal
  const Wpx = b * s, Hpx = h * s;
  const xW0 = mL + Math.max(0, (availW - Wpx) / 2), xW1 = xW0 + Wpx;
  const contentH = Hpx + gapMid + secDepth * s;
  const yE0 = mT + Math.max(0, (H - mT - mB - contentH) / 2), yE1 = yE0 + Hpx;
  const ySec0 = yE1 + gapMid, ySec1 = ySec0 + secDepth * s;

  // In het aanzicht zie je van een regel zijn dikte; de breedte loopt de wand in.
  // Met b_regel (184) werd een regel van 76 mm ruim twee keer te dik getekend.
  const regelPx = Math.max(3, tRegel * s);             // regel-hoogte in aanzicht
  const stijlPx = Math.max(2, tStijl * s);             // stijl-breedte
  const beplPx = Math.max(2, tBepl * s);               // beplatingsdikte in doorsnede
  // detail A-C: regel doorlopend (regel over de volle breedte) of stijl doorlopend
  // (eindstijlen full-height, regels ertussen)
  const railX0 = detail === 2 ? xW0 + stijlPx : xW0;
  const railW = detail === 2 ? Math.max(0, Wpx - 2 * stijlPx) : Wpx;

  // Stijl- en plaatnaadposities (mm vanaf links). De tussenstijlen staan op
  // hart-op-hartafstand hoh vanaf de linkerrand, de naden op veelvouden van de
  // plaatbreedte b_i: met b_i = 2·hoh valt elke naad op het hart van een stijl,
  // zoals in de uitvoering. Eerder werden stijlen en naden elk gelijkmatig over
  // de wandlengte verdeeld; een naad viel dan naast een stijl en de maat b_i
  // klopte niet met de getekende naad. De kopstijlen staan aan beide randen.
  const studXs: number[] = [0];
  if (hoh > 0) for (let x = hoh; x < b - tStijl && studXs.length < 400; x += hoh) studXs.push(x);
  studXs.push(b);
  const boardXs: number[] = [];
  if (bi > 0) for (let x = bi; x < b - 1 && boardXs.length < 200; x += bi) boardXs.push(x);
  // De hoh-maat loopt van hart tot hart van twee opeenvolgende tussenstijlen;
  // vanaf de wandrand gemeten kwam hij uit op de buitenkant van de kopstijl.
  const hohA = studXs.length > 3 ? studXs[1] : 0;
  const hohB = studXs.length > 3 ? studXs[2] : Math.min(hoh, b);
  // Een restpaneel smaller dan h/4 telt in het blad niet mee (9.2.4.2(2)); het
  // beeld toont het grijs, zoals het beeld van de HSB-stabiliteit. Een blad uit
  // een oudere versie (eigen kopie van de rekentekst) rekende met de hele
  // wandlengte; dan tekent het beeld het restpaneel gewoon mee.
  const perPaneel = source.includes("b_rest");
  const nPlaat = bi > 0 ? Math.floor(b / bi) : 0;
  const restPaneel = b - nPlaat * bi;
  const restTeltNiet = perPaneel && bi > 0 && restPaneel > 1 && restPaneel < h / 4;
  const px = (mm: number) => xW0 + mm * s;
  // Linkerkant van een stijl. De tussenstijlen staan op hun hartlijn; de
  // kopstijlen liggen met hun buitenkant gelijk met de wandrand. Op de rand
  // gecentreerd stonden ze half buiten de wand.
  const laatsteStijl = studXs.length - 1;
  const stijlX = (mm: number, i: number) =>
    i === 0 ? xW0 : i === laatsteStijl ? xW1 - stijlPx : px(mm) - stijlPx / 2;

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — schijfwerking" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Verbinding</span>
          <label>Verbindingsmiddel
            <select value={verb} onChange={(e) => setVal("verbindingsmiddel", parseInt(e.target.value))}>
              {VERBINDING.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Rekenwaarde F<sub>f,Rd</sub> (kN)
            <input type="number" step={0.01} value={F_f_Rd} onChange={(e) => setVal("F_f_Rd", parseFloat(e.target.value))} />
          </label>
          <label>H.o.h. verbindingsmiddel (mm)
            <input type="number" step={10} value={s_verb} onChange={(e) => setVal("s_verb", parseFloat(e.target.value))} />
          </label>
          <label>Aantal zijdige beplating
            <select value={nZij} onChange={(e) => setVal("n_zijdig", parseInt(e.target.value))}>
              {ZIJDIG.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Dikte beplating (mm)
            <input type="number" step={1} value={tBepl} onChange={(e) => setVal("t_bepl", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Stijl &amp; regel</span>
          <label>Dikte stijl (mm)
            <input type="number" step={1} value={tStijl} onChange={(e) => setVal("t_stijl", parseFloat(e.target.value))} />
          </label>
          <label>Breedte stijl (mm)
            <input type="number" step={1} value={bStijl} onChange={(e) => setVal("b_stijl", parseFloat(e.target.value))} />
          </label>
          <label>Dikte regel (mm)
            <input type="number" step={1} value={tRegel} onChange={(e) => setVal("t_regel", parseFloat(e.target.value))} />
          </label>
          <label>Breedte regel (mm)
            <input type="number" step={1} value={bRegel} onChange={(e) => setVal("b_regel", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Detail &amp; materiaal</span>
          <label>Detailaansluiting A-C
            <select value={detail} onChange={(e) => setVal("detail_AC", parseInt(e.target.value))}>
              {DETAIL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Sterkteklasse
            <select value={sterkte} onChange={(e) => setVal("sterkteklasse", parseInt(e.target.value))}>
              {STERKTE.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Klimaatklasse
            <select value={klim} onChange={(e) => setVal("klimaatklasse", parseInt(e.target.value))}>
              {KLIMAAT.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, justifyContent: "safe center", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Vooraanzicht &amp; doorsnede</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                {defs}

                {/* ── VOORAANZICHT ─────────────────────────────────────────── */}
                {/* stijlen + regels eerst — bij "Stijl doorlopend" lopen alleen de
                    KOPSTIJLEN door. De beplating komt er daarna overheen. */}
                {(() => {
                  const stud = (mm: number, i: number, full: boolean) => (
                    <rect key={i} x={stijlX(mm, i)} y={full ? yE0 : yE0 + regelPx}
                      width={stijlPx} height={full ? Hpx : Math.max(0, Hpx - 2 * regelPx)}
                      fill="#E3C08A" stroke="#8B6F47" strokeWidth={0.8} />
                  );
                  const railTop = <rect key="rt" x={railX0} y={yE0} width={railW} height={regelPx} fill="#E3C08A" stroke="#8B6F47" strokeWidth={1} />;
                  const railBot = <rect key="rb" x={railX0} y={yE1 - regelPx} width={railW} height={regelPx} fill="#E3C08A" stroke="#8B6F47" strokeWidth={1} />;
                  const last = studXs.length - 1;
                  const mids = studXs.map((mm, i) => (i === 0 || i === last ? null : stud(mm, i, false)));
                  if (detail === 1) {
                    // regel doorlopend: alle stijlen tussen de regels, regels over de volle breedte
                    return <>{mids}{stud(studXs[0], 0, false)}{stud(studXs[last], last, false)}{railTop}{railBot}</>;
                  }
                  // stijl doorlopend: alleen de kopstijlen full-height, regels ertussen
                  return <>{mids}{railTop}{railBot}{stud(studXs[0], 0, true)}{stud(studXs[last], last, true)}</>;
                })()}
                {/* beplating tot de rand: de platen dekken de hele wand, ook de
                    regels en de kopstijlen. Doorschijnend, zodat het raamwerk
                    erachter zichtbaar blijft. */}
                <rect x={xW0} y={yE0} width={Wpx} height={Hpx} fill="#dbe4f5" fillOpacity={0.55} />
                {restTeltNiet && (
                  <>
                    <rect x={px(nPlaat * bi)} y={yE0} width={Math.max(0, xW1 - px(nPlaat * bi))} height={Hpx} fill="#9ca3af" fillOpacity={0.45} />
                    <text x={(px(nPlaat * bi) + xW1) / 2} y={(yE0 + yE1) / 2} textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(-90 ${(px(nPlaat * bi) + xW1) / 2} ${(yE0 + yE1) / 2})`}
                      style={{ fontSize: 10, fill: "#374151" }}>telt niet mee (&lt; h/4)</text>
                  </>
                )}
                {/* beplatingsvoegen (dashed) */}
                {boardXs.map((mm, i) => (
                  <line key={i} x1={px(mm)} y1={yE0} x2={px(mm)} y2={yE1} stroke="#1d4ed8" strokeWidth={1} strokeDasharray="6 4" />
                ))}
                {/* omtrek opnieuw (over de vullingen) */}
                <rect x={xW0} y={yE0} width={Wpx} height={Hpx} fill="none" stroke="#1d4ed8" strokeWidth={1.5} />

                {/* hoekletters A B C D */}
                <text x={xW0 - 6} y={yE0 - 6} textAnchor="end" style={{ fontSize: 12, fontWeight: 700, fill: "#374151" }}>A</text>
                <text x={xW1 + 6} y={yE0 - 6} textAnchor="start" style={{ fontSize: 12, fontWeight: 700, fill: "#374151" }}>B</text>
                <text x={xW0 - 6} y={yE1 + 14} textAnchor="end" style={{ fontSize: 12, fontWeight: 700, fill: "#374151" }}>C</text>
                <text x={xW1 + 6} y={yE1 + 14} textAnchor="start" style={{ fontSize: 12, fontWeight: 700, fill: "#374151" }}>D</text>

                {/* krachten: F1 & F2 verticaal omlaag */}
                <line x1={xW0 + 12} y1={yE0 - 30} x2={xW0 + 12} y2={yE0 - 1} className="vd-load" strokeWidth={3} markerEnd="url(#swLoad)" />
                <line x1={xW1 - 12} y1={yE0 - 30} x2={xW1 - 12} y2={yE0 - 1} className="vd-load" strokeWidth={3} markerEnd="url(#swLoad)" />
                {/* F_i,v,Ed horizontaal (schuifkracht) — bovenaan bij B naar links,
                    onderaan bij C de tegengestelde basisreactie naar rechts (racking-koppel) */}
                <line x1={xW1 + 52} y1={yE0 + 10} x2={xW1 + 5} y2={yE0 + 10} className="vd-load" strokeWidth={3} markerEnd="url(#swLoad)" />
                <line x1={xW0 - 52} y1={yE1} x2={xW0 - 5} y2={yE1} className="vd-load" strokeWidth={3} markerEnd="url(#swLoad)" />

                {/* bi-maat (boven) */}
                <g className="vd-dimline">
                  <line x1={xW0} y1={yE0 + regelPx + 8} x2={xW0} y2={yE0 + regelPx + 26} className="vd-dimext" />
                  <line x1={px(bi)} y1={yE0 + regelPx + 8} x2={px(bi)} y2={yE0 + regelPx + 26} className="vd-dimext" />
                  <line x1={xW0} y1={yE0 + regelPx + 20} x2={px(bi)} y2={yE0 + regelPx + 20} className="vd-dimmeasure" markerStart="url(#swDim)" markerEnd="url(#swDim)" />
                </g>
                {/* hoh-maat (onder-links) */}
                <g className="vd-dimline">
                  <line x1={px(hohA)} y1={yE1 - regelPx - 26} x2={px(hohA)} y2={yE1 - regelPx - 8} className="vd-dimext" />
                  <line x1={px(hohB)} y1={yE1 - regelPx - 26} x2={px(hohB)} y2={yE1 - regelPx - 8} className="vd-dimext" />
                  <line x1={px(hohA)} y1={yE1 - regelPx - 20} x2={px(hohB)} y2={yE1 - regelPx - 20} className="vd-dimmeasure" markerStart="url(#swDim)" markerEnd="url(#swDim)" />
                </g>
                {/* h-maat (rechts) — schone verticale maatlijn, zonder extensielijnen */}
                <line x1={xW1 + 42} y1={yE0} x2={xW1 + 42} y2={yE1} className="vd-dimmeasure" markerStart="url(#swDim)" markerEnd="url(#swDim)" />
                {/* b-maat (onder de doorsnede) */}
                <g className="vd-dimline">
                  <line x1={xW0} y1={ySec1 + 8} x2={xW0} y2={ySec1 + 26} className="vd-dimext" />
                  <line x1={xW1} y1={ySec1 + 8} x2={xW1} y2={ySec1 + 26} className="vd-dimext" />
                  <line x1={xW0} y1={ySec1 + 20} x2={xW1} y2={ySec1 + 20} className="vd-dimmeasure" markerStart="url(#swDim)" markerEnd="url(#swDim)" />
                </g>

                {/* ── DOORSNEDE (horizontaal) ──────────────────────────────── */}
                {/* beplating boven (+ onder bij dubbelzijdig) */}
                <rect x={xW0} y={ySec0} width={Wpx} height={beplPx} fill="#dbe4f5" stroke="#1d4ed8" strokeWidth={1} />
                {nZij >= 2 && (
                  <rect x={xW0} y={ySec1 - beplPx} width={Wpx} height={beplPx} fill="#dbe4f5" stroke="#1d4ed8" strokeWidth={1} />
                )}
                {/* stijlen in doorsnede (oranje) */}
                {studXs.map((mm, i) => (
                  <rect key={i} x={stijlX(mm, i)} y={ySec0 + beplPx} width={stijlPx} height={bStijl * s} fill="#E3C08A" stroke="#8B6F47" strokeWidth={0.8} />
                ))}
                <text x={xW1} y={ySec0 - 6} textAnchor="end" style={{ fontSize: 10, fontWeight: 600, fill: "#6b7280" }}>doorsnede ({nZij}-zijdig)</text>
              </svg>

              {/* klikbare chips */}
              <Dim name="bi" value={bi} x={(xW0 + px(bi)) / 2} y={yE0 + regelPx + 20} step={10} label="bi" unit=" mm" />
              <Dim name="hoh" value={hoh} x={(px(hohA) + px(hohB)) / 2} y={yE1 - regelPx - 20} step={10} label="hoh" unit=" mm" />
              <Dim name="h" value={h} x={xW1 + 42} y={(yE0 + yE1) / 2} step={0.1} factor={0.001} label="h" unit=" m" />
              <Dim name="b" value={b} x={(xW0 + xW1) / 2} y={ySec1 + 20} step={0.1} factor={0.001} label="b" unit=" m" />
              {/* F1 en F2 zijn rekenwaarden (6.10b): het blad telt ze op bij F_i,t,Ed. */}
              <Force name="F1" value={F1} x={xW0 + 12} y={yE0 - 40} label="F1,Ed"
                title="rekenwaarde (6.10b) van de verticale last op eindstijl A" />
              <Force name="F2" value={F2} x={xW1 - 12} y={yE0 - 40} label="F2,Ed"
                title="rekenwaarde (6.10b) van de verticale last op eindstijl B" />
              <Force name="F_ivEd" id="F_ivEd@top" value={F_ivEd} x={xW1 + 66} y={yE0 - 8} label="Fi,v,Ed" />
              <Force name="F_ivEd" id="F_ivEd@bot" value={F_ivEd} x={xW0 - 52} y={yE1 - 18} label="Fi,v,Ed" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">
          c<sub>i</sub> = {w("c_i", 2)} · F<sub>i,v,Rd</sub> = {w("F_ivRd", 1)} kN · sterkte {g.UC_sterkte !== undefined ? fmt(g.UC_sterkte, 2) : uitkomst ? "∞" : "—"} ·
          h.o.h. {w("UC_hoh", 2)} · druk⊥ {detail === 1 ? w("UC_druk90", 2) : "n.v.t. (stijl doorlopend)"} · plooi {w("UC_plooi", 2)} · stijl {w("UC_stijl", 2)} ·
          anker {open("UC_anker")} · glijden {open("UC_glijden")} · plaat {open("UC_plaat")}
        </span>
      </div>
    </div>
  );
}
