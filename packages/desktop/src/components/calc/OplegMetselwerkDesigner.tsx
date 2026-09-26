import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import { useBladUitkomst } from "./bladResultaat";
import { UitkomstKop } from "./designerKit";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Losstaand parametrisch beeld van een geconcentreerde oplegging op een
 * metselwerkwand (bijv. een liggereinde dat op de wand rust). Reproduceert het
 * beeld van de referentie-uitwerking: vooraanzicht van de wand met de opleg­plaat, de last­spreiding
 * onder 60° en de effectieve lengte l_efm, plus een dwarsdoorsnede.
 *
 * De toetsing (NEN-EN 1996-1-1 §6.1.3) staat alleen in het blad
 * (oplegMetselwerk.ts). De kop toont de maatgevende UC en het oordeel van het
 * blad, de voetregel de tussenwaarden uit dezelfde uitwerking. Eerder rekende
 * het beeld zelf na en keurde het op de nevenvoorwaarden af terwijl het blad
 * "voldoet" gaf.
 *
 * Marker waarop we detecteren dat de actieve sheet deze module is:
 */
const MARKER = "Oplegging op metselwerk";

// ── materiaal ───────────────────────────────────────────────────────────────
// Het percentage is het holtepercentage → steengroep. `kwal` bepaalt hoe de
// sterkteklasse van de steen wordt aangeduid: f_b-waarden, CS-klassen of
// G-klassen. K, α, β en de steengroep staan in het blad (tabel NB-2).
interface Steen { name: string; kwal: "fb" | "CS" | "G" }
const STENEN: Record<number, Steen> = {
  1: { name: "Baksteen <25%", kwal: "fb" },
  2: { name: "Baksteen <55%", kwal: "fb" },
  3: { name: "Kalkzandsteen <25%", kwal: "CS" },
  4: { name: "Kalkzandsteen <55%", kwal: "CS" },
  5: { name: "Betonsteen <25%", kwal: "fb" },
  6: { name: "Betonsteen <60%", kwal: "fb" },
  7: { name: "Cellenbeton <25%", kwal: "G" },
};
const MORTELTYPE: { v: number; label: string }[] = [
  { v: 1, label: "Metselmortel" }, { v: 2, label: "Lijmmortel" },
];
// Voeg-sterkteklassen per morteltype → f_m. Bij lijmmortel telt f_m alleen bij
// baksteen ≤ 25 % mee (β = 0,1, tabel NB-2); bij de andere stenen is β = 0.
const VOEG_METSEL = [5, 10, 15];
const VOEG_LIJM = [10, 12.5];
// Mortelvoeg evenwijdig aan het wandvlak: K maal 0,8 (§3.6.1.2(6)), in het blad.
const LANGSVOEG: { v: number; label: string }[] = [
  { v: 1, label: "geen" }, { v: 2, label: "wel (K × 0,8)" },
];
// Sterkteklasse-opties per aanduiding → genormaliseerde druksterkte f_b (N/mm²)
const KWALITEIT: Record<Steen["kwal"], { v: number; label: string }[]> = {
  fb: [5, 10, 15, 20, 25, 30, 35, 40].map((v) => ({ v, label: `fb ${v}` })),
  CS: [12, 16, 20, 24, 30].map((v) => ({ v, label: `CS${v}` })),
  G: [2, 3, 4, 6, 8].map((v) => ({ v, label: `G${v}` })),
};
const KWAL_DEFAULT: Record<Steen["kwal"], number> = { fb: 10, CS: 12, G: 4 };
// De stenennormen kennen alleen categorie I en II; γ_M volgt in het blad.
const CATEGORIE: { v: number; label: string }[] = [
  { v: 1, label: "I" },
  { v: 2, label: "II" },
];

/**
 * Eén bron van waarheid voor de invoer-defaults — gebruikt om de controls te
 * tonen én om de gedeelde store te seeden, zodat de evaluator (rekensheet) en
 * de designer nooit op verschillende defaults uitkomen.
 */
// Defaults spiegelen de referentieberekening (document1.pdf): cellenbeton G2,
// M15, t=150, a_t=100 → UC ≈ 12,66.
const DEFAULTS: Record<string, number> = {
  steensoort: 7, steencategorie: 1,
  morteltype: 1, f_b: 2, f_m: 15, langsvoeg: 1,
  N_Edc: 360, q_Edc: 5.5,
  h: 2800, t: 150, a_L: 200, a_t: 100, h_k: 250, a_1: 300, L_r: 2220, exc: 0,
};

const TAN60 = Math.tan(Math.PI / 3); // ≈ 1.732

export default function OplegMetselwerkDesigner() {
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
  // De uitkomst en de tussenwaarden van het blad zelf.
  const uitkomst = useBladUitkomst();

  // Meet de beschikbare tekengebied-grootte, zodat het beeld meegroeit met de
  // paneelbreedte (bv. als de scheiding met de uitwerking verschoven wordt).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 780, h: 540 });

  const isOpleg = source.includes(MARKER);
  useEffect(() => {
    if (!isOpleg) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isOpleg, activeId, seedBladWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(220, r.width), h: Math.max(240, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpleg]);

  if (!isOpleg) return null;

  const vals = exemplaar?.waarden ?? {};
  const num = (name: string, def: number): number => {
    const raw = vals[name];
    if (raw === undefined || raw === "") return def;
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };
  const setVal = (name: string, value: number) => zetBladWaarde(name, String(value));
  const d = (name: string) => num(name, DEFAULTS[name]);

  // ── invoer ────────────────────────────────────────────────────────────────
  const steenId = Math.round(d("steensoort"));
  const steen = STENEN[steenId] ?? STENEN[1];
  const catId = Math.round(d("steencategorie"));
  const morteltype = Math.round(d("morteltype"));     // 1 = metselmortel, 2 = lijmmortel
  const isLijm = morteltype === 2;
  const fb = d("f_b");
  const fmRaw = d("f_m");
  const langsvoeg = Math.round(d("langsvoeg"));        // 1 = geen, 2 = wel
  const N_Edc = d("N_Edc");   // kN
  const q_Edc = d("q_Edc");   // kN/m
  const h = d("h");           // mm — wandhoogte tot last
  const t = d("t");           // mm — wanddikte
  const a_L = d("a_L");       // mm — opleglengte (in wandvlak)
  const a_t = d("a_t");       // mm — oplegbreedte (over de dikte)
  const h_k = d("h_k");       // mm — hoogte keep (verdiepte balk)
  const a_1 = d("a_1");       // mm — afstand tot wandeinde (nabije rand)
  const L_r = d("L_r");       // mm — wandlengte rechts van oplegging
  const exc = d("exc");       // mm — excentriciteit

  // ── geometrie: effectieve hoogte + lastspreiding onder 60° (art. 6.1.3) ─────
  const h_c = Math.max(1, h - h_k);                    // hoogte tot lastniveau = h − h_k
  const reach = (0.5 * h_c) / TAN60;                   // spreiding per zijde, over ½·h_c
  const leftReach = Math.min(a_1, reach);              // l_efm;1 (begrensd door wandeinde)
  const rightReach = Math.min(L_r, reach);             // l_efm;2
  const l_efm = a_L + leftReach + rightReach;          // effectieve lengte op ½ hoogte
  const dLeftEnd = Math.min(a_1 * TAN60, 0.5 * h_c);   // diepte waar de linkerlijn het wandeinde raakt

  const fmt = (v: number, dec: number) => v.toFixed(dec).replace(".", ",");
  // Tussenwaarden uit de uitwerking; "—" zolang het blad ze niet toont.
  const g = uitkomst?.getallen ?? {};
  const w = (naam: string, dec: number) => (g[naam] === undefined ? "—" : fmt(g[naam], dec));

  // ── klikbare maat (HTML-chip over de tekening) ─────────────────────────────
  function Dim(props: { name: string; value: number; x: number; y: number; step?: number; label?: string }) {
    const { name, value, x, y, step = 5, label } = props;
    const isEd = editing === name;
    return (
      <div className="vd-dim" style={{ left: x, top: y }}>
        {isEd ? (
          <input className="vd-dim-input" type="number" step={step} defaultValue={value} autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => { setVal(name, parseFloat(e.target.value)); setEditing(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setVal(name, parseFloat((e.target as HTMLInputElement).value)); setEditing(null); }
              if (e.key === "Escape") setEditing(null);
            }} />
        ) : (
          <button className="vd-dim-num" title={`${label ?? name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {Number.isInteger(value) ? value : value.toFixed(0)}
          </button>
        )}
      </div>
    );
  }
  function Force(props: { name: string; value: number; x: number; y: number; unit: string; step?: number }) {
    const { name, value, x, y, unit, step = 10 } = props;
    const isEd = editing === name;
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
          <button className="vd-force-num" title={`${name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {Number.isInteger(value) ? value : value.toFixed(1)}<small>{unit}</small>
          </button>
        )}
      </div>
    );
  }

  // ── SVG defs (maat- en lastpijlen) ─────────────────────────────────────────
  const defs = (
    <defs>
      <marker id="omDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
      </marker>
      <marker id="omLoad" markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1 L9 4.5 L1 8 Z" className="vd-loadfill" />
      </marker>
      <pattern id="omBrick" patternUnits="userSpaceOnUse" width="40" height="24">
        <rect width="40" height="24" fill="#f1ece3" />
        <path d="M0 0 H40 M0 12 H40 M0 24 H40 M20 0 V12 M0 12 V24 M40 12 V24" stroke="#cbbfa8" strokeWidth="1" fill="none" />
      </pattern>
    </defs>
  );

  // ── layout: vult het gemeten tekengebied (box), gecentreerd, één UNIFORME schaal ─
  // De tekening vult altijd de beschikbare ruimte en groeit/krimpt mee met het
  // paneel. Eén schaal `s` voor beide aanzichten én voor x en y, dus alle
  // verhoudingen (ook de balkhoogte in de doorsnede) blijven dimensioneel correct.
  const capH = 26;                               // ruimte voor het onderschrift boven elke stage
  const gap = 18;
  const CW = Math.min(190, Math.max(70, box.w * 0.24));   // smalle doorsnede rechts
  const EW = box.w - CW - gap;                   // vooraanzicht krijgt de rest (past altijd)
  const EH = box.h - capH, CH = EH;              // stages vullen de hoogte
  const mL = 44, mT = 96, mR = 44, mB = 34;
  const cPad = 46;                               // horizontale marge in de doorsnede (maten)
  // In een smal paneel wordt de ruimte naast de marges negatief; dan krimpt de
  // tekening tot een ondergrens in plaats van met negatieve maten om te klappen.
  const availW = Math.max(20, EW - mL - mR), availH = Math.max(20, EH - mT - mB);
  const totalMM = a_1 + a_L + L_r;
  // Grootste schaal die zowel de wandhoogte, de wandbreedte als de dikte laat passen.
  const s = Math.min(availH / h, availW / totalMM, (CW - cPad) / Math.max(t, 1));
  const wallW = totalMM * s, wallH = h * s;
  const xW0 = mL + Math.max(0, (availW - wallW) / 2), xW1 = xW0 + wallW;
  const yW0 = Math.max(mT, (EH - wallH) / 2), yW1 = yW0 + wallH;  // verticaal gecentreerd
  const xPL = xW0 + a_1 * s, wPl = a_L * s, xPR = xPL + wPl, cx = (xPL + xPR) / 2;

  const bandH = 14;                                     // q_Edc-lastband (vast symbool)
  const blockH = h_k * s;                               // balk-hoogte (keep) op ware schaal
  const yBand = yW0 - bandH;                            // band op de wandkop = bovenkant balk
  const yPlate = yW0 + blockH;                          // onderkant balk = oplegplaat-niveau
  const platePx = 6;                                    // representatieve plaatdikte (vast)
  const yChain = yBand - 46;                            // maatketting bovenaan

  // lastspreiding (60°) — vanaf de oplegplaat (onderkant keep), over ½·h_c
  const yMid = yPlate + 0.5 * h_c * s;                  // niveau waarop l_efm wordt bepaald
  const xLeftEnd = xW0 + (a_1 - leftReach) * s;         // effectieve linker-rand op ½ hoogte
  const xRightEnd = xPR + rightReach * s;               // effectieve rechter-rand op ½ hoogte
  const yLeftHit = yPlate + dLeftEnd * s;               // waar de linkerlijn het wandeinde raakt

  // ── DWARSDOORSNEDE (rechts) — ZELFDE gedeelde schaal s, dus dimensioneel juist ─
  const cxc = CW / 2;
  const tPx = t * s, atPx = a_t * s;                    // dikte en oplegbreedte op ware schaal
  const yc0 = yW0, yc1 = yW1;
  const xc0 = cxc - tPx / 2, xc1 = cxc + tPx / 2;
  const xExc = cxc + exc * s;                           // excentrische plaatpositie

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — oplegging op metselwerk" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Metselwerk</span>
          <label>Steencategorie
            <select value={catId} onChange={(e) => setVal("steencategorie", parseInt(e.target.value))}>
              {CATEGORIE.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
            </select>
          </label>
          <label>Steensoort
            <select value={steenId} onChange={(e) => {
              const id = parseInt(e.target.value);
              setVal("steensoort", id);
              const nk = STENEN[id]?.kwal ?? "fb";
              if (!KWALITEIT[nk].some((k) => k.v === fb)) setVal("f_b", KWAL_DEFAULT[nk]);
            }}>
              {Object.entries(STENEN).map(([id, s]) => <option key={id} value={id}>{s.name}</option>)}
            </select>
          </label>
          <label>Kwaliteit steen
            <select value={fb} onChange={(e) => setVal("f_b", parseFloat(e.target.value))}>
              {KWALITEIT[steen.kwal].map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
            </select>
          </label>
          <label>Morteltype
            <select value={morteltype} onChange={(e) => {
              const mt = parseInt(e.target.value);
              setVal("morteltype", mt);
              const set = mt === 2 ? VOEG_LIJM : VOEG_METSEL;
              if (!set.includes(fmRaw)) setVal("f_m", set[set.length - 1]);
            }}>
              {MORTELTYPE.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </label>
          <label>Kwaliteit voeg
            <select value={fmRaw} onChange={(e) => setVal("f_m", parseFloat(e.target.value))}>
              {(isLijm ? VOEG_LIJM : VOEG_METSEL).map((m) => (
                <option key={m} value={m}>{isLijm ? `L_${m}` : `M${m}`}</option>
              ))}
            </select>
          </label>
          <label title="Mortelvoeg evenwijdig aan het wandvlak, over de hele wandlengte of een deel ervan (bijvoorbeeld een steense wand met strekkenlagen): K maal 0,8 (§3.6.1.2(6))">Langsvoeg
            <select value={langsvoeg} onChange={(e) => setVal("langsvoeg", parseInt(e.target.value))}>
              {LANGSVOEG.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>

          <span className="vd-ctrl-h">Belasting</span>
          <label>N<sub>Edc</sub> (kN)
            <input type="number" step={10} value={N_Edc} onChange={(e) => setVal("N_Edc", parseFloat(e.target.value))} />
          </label>
          <label>q<sub>Edc</sub> wand (kN/m)
            <input type="number" step={0.5} value={q_Edc} onChange={(e) => setVal("q_Edc", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Afmetingen (mm)</span>
          <label>Wandhoogte h
            <input type="number" step={50} value={h} onChange={(e) => setVal("h", parseFloat(e.target.value))} />
          </label>
          <label>Wanddikte t
            <input type="number" step={10} value={t} onChange={(e) => setVal("t", parseFloat(e.target.value))} />
          </label>
          <label>Opleglengte a<sub>L</sub>
            <input type="number" step={10} value={a_L} onChange={(e) => setVal("a_L", parseFloat(e.target.value))} />
          </label>
          <label>Oplegbreedte a<sub>t</sub>
            <input type="number" step={10} value={a_t} onChange={(e) => setVal("a_t", parseFloat(e.target.value))} />
          </label>
          <label title="Excentriciteit van de last t.o.v. het wandhart; de oplegplaat ligt gecentreerd onder de last">Excentriciteit e
            <input type="number" step={5} value={exc} onChange={(e) => setVal("exc", parseFloat(e.target.value))} />
          </label>
          <label>Hoogte oplegblok h<sub>k</sub>
            <input type="number" step={10} value={h_k} onChange={(e) => setVal("h_k", parseFloat(e.target.value))} />
          </label>
          <label>Afstand tot rand a<sub>1</sub>
            <input type="number" step={10} value={a_1} onChange={(e) => setVal("a_1", parseFloat(e.target.value))} />
          </label>
          <label>Wandlengte rechts L<sub>r</sub>
            <input type="number" step={50} value={L_r} onChange={(e) => setVal("L_r", parseFloat(e.target.value))} />
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", justifyContent: "safe center", gap, flexWrap: "nowrap", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Vooraanzicht</div>
            <div className="vd-stage" style={{ width: EW, height: EH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={EW} height={EH} className="vd-svg">
                {defs}
                {/* wand met metselwerk-textuur */}
                <rect x={xW0} y={yW0} width={wallW} height={wallH} fill="url(#omBrick)" stroke="#8a7a5c" strokeWidth={1.5} />

                {/* q_Edc verdeelde last over de VOLLE wandlengte */}
                <rect x={xW0} y={yBand} width={wallW} height={bandH} fill="#f8d7da" stroke="#c1868c" strokeWidth={1.2} />
                <line x1={xW0} y1={yBand - 16} x2={xW1} y2={yBand - 16} stroke="#dc2626" strokeWidth={1} />
                {Array.from({ length: 11 }, (_, i) => {
                  const qx = xW0 + 8 + i * ((wallW - 16) / 10);
                  return <line key={i} x1={qx} y1={yBand - 16} x2={qx} y2={yBand - 2} className="vd-load" markerEnd="url(#omLoad)" />;
                })}

                {/* balk verdiept in de wandkop (h_k) + rode oplegplaat aan de onderkant */}
                <rect x={xPL} y={yW0} width={wPl} height={blockH} fill="#dfe3ea" stroke="#5b6b8c" strokeWidth={1.2} />
                <rect x={xPL - 2} y={yPlate - platePx / 2} width={wPl + 4} height={platePx} className="vd-loadfill" />
                {/* N_Edc pijl — op de bovenkant van de balk */}
                <line x1={cx} y1={yBand - 22} x2={cx} y2={yW0 - 1} className="vd-load" strokeWidth={3} markerEnd="url(#omLoad)" />

                {/* lastspreiding onder 60° vanaf de oplegplaat (dashed rood) */}
                <line x1={xPL} y1={yPlate} x2={xLeftEnd} y2={yLeftHit} stroke="#dc2626" strokeWidth={1.2} strokeDasharray="6 4" />
                <line x1={xPR} y1={yPlate} x2={xRightEnd} y2={yMid} stroke="#dc2626" strokeWidth={1.2} strokeDasharray="6 4" />
                <path d={`M ${xRightEnd - 5} ${yMid} h 10 M ${xRightEnd} ${yMid - 5} v 10`} stroke="#dc2626" strokeWidth={1.2} />

                {/* verticale hulplijn plaat → halve hoogte */}
                <line x1={cx} y1={yPlate} x2={cx} y2={yMid} stroke="#9ca3af" strokeWidth={0.75} strokeDasharray="3 3" />

                {/* maatlijn-ketting boven: a_1 | a_L | L_r */}
                <g className="vd-dimline">
                  <line x1={xW0} y1={yChain} x2={xW0} y2={yBand} className="vd-dimext" />
                  <line x1={xPL} y1={yChain} x2={xPL} y2={yW0} className="vd-dimext" />
                  <line x1={xPR} y1={yChain} x2={xPR} y2={yW0} className="vd-dimext" />
                  <line x1={xW1} y1={yChain} x2={xW1} y2={yBand} className="vd-dimext" />
                  <line x1={xW0} y1={yChain} x2={xPL} y2={yChain} className="vd-dimmeasure" markerStart="url(#omDim)" markerEnd="url(#omDim)" />
                  <line x1={xPL} y1={yChain} x2={xPR} y2={yChain} className="vd-dimmeasure" markerStart="url(#omDim)" markerEnd="url(#omDim)" />
                  <line x1={xPR} y1={yChain} x2={xW1} y2={yChain} className="vd-dimmeasure" markerStart="url(#omDim)" markerEnd="url(#omDim)" />
                </g>

                {/* h — verticale maat links (tot bovenkant wand = bovenkant balk) */}
                <g className="vd-dimline">
                  <line x1={xW0 - 34} y1={yW0} x2={xW0} y2={yW0} className="vd-dimext" />
                  <line x1={xW0 - 34} y1={yW1} x2={xW0} y2={yW1} className="vd-dimext" />
                  <line x1={xW0 - 34} y1={yW0} x2={xW0 - 34} y2={yW1} className="vd-dimmeasure" markerStart="url(#omDim)" markerEnd="url(#omDim)" />
                </g>

                {/* h_k — verticale maat van de verdiepte balk (bovenkant wand → oplegplaat) */}
                <g className="vd-dimline">
                  <line x1={xPR + 26} y1={yW0} x2={xPR} y2={yW0} className="vd-dimext" />
                  <line x1={xPR + 26} y1={yPlate} x2={xPR} y2={yPlate} className="vd-dimext" />
                  <line x1={xPR + 26} y1={yW0} x2={xPR + 26} y2={yPlate} className="vd-dimmeasure" markerStart="url(#omDim)" markerEnd="url(#omDim)" />
                </g>

                {/* l_efm — horizontale maat op halve hoogte */}
                <g className="vd-dimline">
                  <line x1={xLeftEnd} y1={yMid} x2={xLeftEnd} y2={yMid + 30} className="vd-dimext" />
                  <line x1={xRightEnd} y1={yMid} x2={xRightEnd} y2={yMid + 30} className="vd-dimext" />
                  <line x1={xLeftEnd} y1={yMid + 30} x2={xRightEnd} y2={yMid + 30} className="vd-dimmeasure" markerStart="url(#omDim)" markerEnd="url(#omDim)" />
                </g>
              </svg>

              {/* editbare chips */}
              <Dim name="a_1" value={a_1} x={(xW0 + xPL) / 2} y={yChain} step={10} label="a₁" />
              <Dim name="a_L" value={a_L} x={cx} y={yChain} step={10} label="a_L" />
              <Dim name="L_r" value={L_r} x={(xPR + xW1) / 2} y={yChain} step={50} label="L_r" />
              <Dim name="h" value={h} x={xW0 - 34} y={(yW0 + yW1) / 2} step={50} label="h" />
              <Dim name="h_k" value={h_k} x={xPR + 26} y={(yW0 + yPlate) / 2} step={10} label="h_k" />
              <div className="vd-dim-ro" style={{ left: (xLeftEnd + xRightEnd) / 2, top: yMid + 30 }}>
                l<sub>efm</sub> = {l_efm.toFixed(0)}
              </div>
              <Force name="N_Edc" value={N_Edc} x={cx + wPl / 2 + 24} y={(yW0 + yPlate) / 2} unit="kN" />
              <div className="vd-dim-ro" style={{ left: (xPR + xW1) / 2, top: yChain + 18 }}>
                q<sub>Edc</sub> = {q_Edc} kN/m
              </div>
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: CW, height: CH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={CW} height={CH} className="vd-svg">
                {defs}
                <rect x={xc0} y={yc0} width={tPx} height={yc1 - yc0} fill="url(#omBrick)" stroke="#8a7a5c" strokeWidth={1.5} />
                {/* balk verdiept in de wandkop (evt. excentrisch) + plaat aan de onderkant */}
                <rect x={xExc - atPx / 2} y={yc0} width={atPx} height={blockH} fill="#dfe3ea" stroke="#5b6b8c" strokeWidth={1.2} />
                <rect x={xExc - atPx / 2 - 2} y={yc0 + blockH - platePx / 2} width={atPx + 4} height={platePx} className="vd-loadfill" />
                <line x1={xExc} y1={yc0 - 20} x2={xExc} y2={yc0 - 1} className="vd-load" strokeWidth={3} markerEnd="url(#omLoad)" />
                {/* x=0 hart-markering (bovenkant wand) */}
                <line x1={cxc} y1={yc0 - 6} x2={cxc} y2={yc0 + 22} stroke="#6b7280" strokeWidth={0.75} strokeDasharray="3 3" />
                <circle cx={cxc} cy={yc0 + 10} r={1.6} fill="#6b7280" />
                {/* a_t maat boven de wand */}
                <g className="vd-dimline">
                  <line x1={xExc - atPx / 2} y1={yc0 - 34} x2={xExc - atPx / 2} y2={yc0} className="vd-dimext" />
                  <line x1={xExc + atPx / 2} y1={yc0 - 34} x2={xExc + atPx / 2} y2={yc0} className="vd-dimext" />
                  <line x1={xExc - atPx / 2} y1={yc0 - 34} x2={xExc + atPx / 2} y2={yc0 - 34} className="vd-dimmeasure" markerStart="url(#omDim)" markerEnd="url(#omDim)" />
                </g>
                {/* h_k maat (verdiepte balk) */}
                <g className="vd-dimline">
                  <line x1={xc1 + 22} y1={yc0} x2={xExc + atPx / 2} y2={yc0} className="vd-dimext" />
                  <line x1={xc1 + 22} y1={yc0 + blockH} x2={xExc + atPx / 2} y2={yc0 + blockH} className="vd-dimext" />
                  <line x1={xc1 + 22} y1={yc0} x2={xc1 + 22} y2={yc0 + blockH} className="vd-dimmeasure" markerStart="url(#omDim)" markerEnd="url(#omDim)" />
                </g>
                {/* t maat onder */}
                <g className="vd-dimline">
                  <line x1={xc0} y1={yc1 + 8} x2={xc0} y2={yc1 + 30} className="vd-dimext" />
                  <line x1={xc1} y1={yc1 + 8} x2={xc1} y2={yc1 + 30} className="vd-dimext" />
                  <line x1={xc0} y1={yc1 + 24} x2={xc1} y2={yc1 + 24} className="vd-dimmeasure" markerStart="url(#omDim)" markerEnd="url(#omDim)" />
                </g>
              </svg>
              <Dim name="a_t" value={a_t} x={xExc} y={yc0 - 34} step={10} label="a_t" />
              <Dim name="t" value={t} x={cxc} y={yc1 + 24} step={10} label="t" />
              <div className="vd-dim-ro" style={{ left: xc1 + 22, top: yc0 + blockH / 2 }}>h<sub>k</sub></div>
              <div className="vd-dim-ro" style={{ left: cxc + 18, top: yc0 + 10 }}>x=0</div>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">
          f<sub>d</sub> = {w("f_d", 2)} N/mm² · h<sub>c</sub> = {w("h_c", 0)} · l<sub>efm</sub> = {w("l_efm", 0)} ·
          A<sub>b</sub>/A<sub>ef</sub> = {w("ratio_Ab", 2)} · β = {w("β", 2)} · N<sub>Rdc</sub> = {w("N_Rdc", 1)} kN ·
          N<sub>Ed</sub> = {w("N_Ed", 1)} kN
        </span>
      </div>
    </div>
  );
}
