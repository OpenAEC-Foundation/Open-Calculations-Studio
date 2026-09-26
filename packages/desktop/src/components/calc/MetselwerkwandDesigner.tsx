import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import { useBladUitkomst } from "./bladResultaat";
import { UitkomstKop } from "./designerKit";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Parametrisch beeld van een dragende (ongewapende) metselwerkwand op druk,
 * volgens NEN-EN 1996-1-1 §6.1.2. Reproduceert het invoerbeeld van de referentie-uitwerking:
 * een vooraanzicht van de wand (ℓ × h) met N_Ed / N_Ed,max op de wandkop, en
 * een dwarsdoorsnede (t × h) met de momenten M_1Ed (kop), M_mEd (midden) en
 * M_2Ed (voet). Beide aanzichten staan op één uniforme schaal.
 *
 * Het beeld rekent zelf niets. De kop toont de maatgevende UC en het oordeel
 * van het blad (templates/metselwerkwand.ts), de voetregel de tussenwaarden
 * uit dezelfde uitwerking. Eerder rekende het beeld de hele toetsing na, en
 * kon het dus iets anders zeggen dan het blad ernaast.
 */
const MARKER = "Dragende metselwerkwand";

// ── randsteuning boven/onder → ρ_2 (EN 1996-1-1 §5.5.1.2(11)) ──────────────
// Dezelfde opties als het blad. 1-4 volgen de referentie-uitwerking; 5 en 6
// dekken een vloer aan één zijde met een te korte oplegging af.
const ONDERSTEUNING: { v: number; label: string }[] = [
  { v: 1, label: "wand met aan beide zijden betonvloer of -dak" },
  { v: 2, label: "betonvloer of -dak aan één zijde, oplegging ten minste ⅔·t" },
  { v: 3, label: "wand met aan beide zijden houten vloer of dak" },
  { v: 4, label: "houten vloer of dak aan één zijde, oplegging ten minste ⅔·t en 85 mm" },
  { v: 5, label: "betonvloer of -dak aan één zijde, oplegging korter dan ⅔·t" },
  { v: 6, label: "houten vloer of dak aan één zijde, kortere oplegging" },
];
const RANDEN: { v: number; label: string }[] = [
  { v: 2, label: "2" }, { v: 3, label: "3" }, { v: 4, label: "4" },
];

// ── metselwerk ──────────────────────────────────────────────────────────────
// Het percentage is het holtepercentage → steengroep. `kwal` bepaalt hoe de
// sterkteklasse van de steen wordt aangeduid: f_b-waarden, CS-klassen of
// G-klassen. K, α en β staan in het blad (tabel NB-2).
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
const VOEG_METSEL = [5, 10, 15];
const VOEG_LIJM = [10, 12.5];
const KWALITEIT: Record<Steen["kwal"], { v: number; label: string }[]> = {
  fb: [5, 10, 15, 20, 25, 30, 35, 40].map((v) => ({ v, label: `fb ${v}` })),
  CS: [12, 16, 20, 24, 30].map((v) => ({ v, label: `CS${v}` })),
  G: [2, 3, 4, 6, 8].map((v) => ({ v, label: `G${v}` })),
};
const KWAL_DEFAULT: Record<Steen["kwal"], number> = { fb: 10, CS: 12, G: 4 };
// EN 771-1 t/m 6 kent alleen categorie I en II; γ_M volgt in het blad.
const CATEGORIE: { v: number; label: string }[] = [
  { v: 1, label: "I" },
  { v: 2, label: "II" },
];

/** Eén bron van waarheid voor de invoer — voedt de controls én de gedeelde store. */
// Defaults spiegelen het invoerscherm van de referentie-uitwerking: kalkzandsteen CS12, M15,
// categorie I, ℓ = 1000, h = 2800, t = 120, N_Ed = N_Ed,max = 200 kN.
const DEFAULTS: Record<string, number> = {
  ondersteuning: 1, n_rand: 2,
  l_w: 1000, h_w: 2800, t_w: 120, L_v: 3000,
  steencategorie: 1, steensoort: 3, morteltype: 1, f_b: 12, f_m: 15, phi_inf: 0,
  N_Ed: 200, N_Ed_max: 200, M_1Ed: 0, M_mEd: 0, M_2Ed: 0,
};

export default function MetselwerkwandDesigner() {
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

  // Meet het beschikbare tekengebied zodat het beeld meegroeit met het paneel.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 800, h: 560 });

  const isWand = source.includes(MARKER);
  useEffect(() => {
    if (!isWand) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isWand, activeId, seedBladWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(260, r.width), h: Math.max(280, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isWand]);

  if (!isWand) return null;

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
  const ondId = Math.round(d("ondersteuning"));
  const ond = ONDERSTEUNING.find((o) => o.v === ondId) ?? ONDERSTEUNING[0];
  const n = Math.round(d("n_rand"));
  const l_w = Math.max(1, d("l_w")), h_w = Math.max(1, d("h_w")), t_w = Math.max(1, d("t_w"));
  const L_v = Math.max(1, d("L_v"));
  const steenId = Math.round(d("steensoort"));
  const steen = STENEN[steenId] ?? STENEN[3];
  const catId = Math.round(d("steencategorie"));
  const morteltype = Math.round(d("morteltype"));
  const isLijm = morteltype === 2;
  const fb = d("f_b"), fmRaw = d("f_m"), phiInf = d("phi_inf");
  const N_Ed = d("N_Ed"), N_Ed_max = d("N_Ed_max");
  const M_1 = d("M_1Ed"), M_m = d("M_mEd"), M_2 = d("M_2Ed");

  // Een verticale randsteuning vervalt bij L_v ≥ 15·t (n = 3) resp. 30·t (n = 4).
  const nLim = n === 4 ? 30 * t_w : 15 * t_w;
  const fmt = (v: number, dec = 2) => v.toFixed(dec).replace(".", ",");
  // Tussenwaarden uit de uitwerking; "—" zolang het blad ze niet toont.
  const g = uitkomst?.getallen ?? {};
  const w = (naam: string, dec: number) => (g[naam] === undefined ? "—" : fmt(g[naam], dec));
  const nEff = g.n_eff ?? n;

  // ── klikbare chips ────────────────────────────────────────────────────────
  function Dim(props: { name: string; value: number; x: number; y: number; step?: number; label?: string }) {
    const { name, value, x, y, step = 10, label } = props;
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
          <button className="vd-dim-num" style={{ whiteSpace: "nowrap" }} title={`${label ?? name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {label ? `${label}=` : ""}{Number.isInteger(value) ? value : value.toFixed(0)}
          </button>
        )}
      </div>
    );
  }
  function Force(props: { name: string; value: number; x: number; y: number; unit: string; label: string; step?: number; note?: string }) {
    const { name, value, x, y, unit, label, step = 10, note } = props;
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
          <button className="vd-force-num" style={{ whiteSpace: "nowrap" }} title={`${name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {label}={Number.isInteger(value) ? value : value.toFixed(1)}<small>{unit}</small>
            {note ? <small style={{ color: "#6b7280", fontWeight: 600 }}> {note}</small> : null}
          </button>
        )}
      </div>
    );
  }

  // markers zijn per-SVG, dus de tweede stage krijgt zijn eigen set
  const defsSec = (
    <defs>
      <marker id="mwDim2" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
      </marker>
      <marker id="mwLoad2" markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1 L9 4.5 L1 8 Z" className="vd-loadfill" />
      </marker>
    </defs>
  );

  const defs = (
    <defs>
      <marker id="mwDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
      </marker>
      <marker id="mwLoad" markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1 L9 4.5 L1 8 Z" className="vd-loadfill" />
      </marker>
      <pattern id="mwBrick" patternUnits="userSpaceOnUse" width="40" height="24">
        <rect width="40" height="24" fill="#f1ece3" />
        <path d="M0 0 H40 M0 12 H40 M0 24 H40 M20 0 V12 M0 12 V24 M40 12 V24" stroke="#cbbfa8" strokeWidth="1" fill="none" />
      </pattern>
    </defs>
  );

  // ── layout: vooraanzicht links, doorsnede rechts, één uniforme schaal ─────
  const capH = 26, gap = 18;
  const CW = Math.min(300, Math.max(215, box.w * 0.34));   // doorsnede + momentenlijn
  const EW = box.w - CW - gap;
  const EH = box.h - capH, CH = EH;
  // mT is ruim: boven de wand staan drie gescheiden lagen — ℓ-maatlijn, de twee
  // krachtlabels, en de lastband met pijlen die op de wandkop landen.
  const mL = 52, mT = 116, mR = 40, mB = 40;
  const cSec = 96;                                          // ruimte in de rechterstage naast de doorsnede
  // In een smal paneel wordt de ruimte naast de marges negatief; dan krimpt de
  // tekening tot een ondergrens in plaats van met negatieve maten om te klappen.
  const availW = Math.max(20, EW - mL - mR), availH = Math.max(20, EH - mT - mB);
  const s = Math.min(availH / h_w, availW / l_w, (CW - cSec) / t_w);
  const wallW = l_w * s, wallH = h_w * s, tPx = Math.max(3, t_w * s);
  const xW0 = mL + Math.max(0, (availW - wallW) / 2), xW1 = xW0 + wallW;
  const yW0 = mT + Math.max(0, (availH - wallH) / 2), yW1 = yW0 + wallH;
  const yWm = (yW0 + yW1) / 2;
  const cx = (xW0 + xW1) / 2;
  // doorsnede staat links in de eigen stage; rechts ernaast de momentenlijn
  const xS0 = 14, xS1 = xS0 + tPx, cxS = (xS0 + xS1) / 2;

  // ── momentenlijn (rechts van de doorsnede) ────────────────────────────────
  // Nullijn op axisX, positief moment naar rechts. De lijn loopt parabolisch
  // door de drie waarden: M_1Ed (kop), M_mEd (halve hoogte) en M_2Ed (voet).
  const Amax = 30;                                          // maximale uitslag [px]
  const axisX = xS1 + 46 + Amax;
  const chipX = Math.min(axisX + Amax + 48, CW - 46);
  const Mmax = Math.max(Math.abs(M_1), Math.abs(M_m), Math.abs(M_2));
  const mx = (M: number) => axisX + (Mmax > 0 ? (M / Mmax) * Amax : 0);
  const x1 = mx(M_1), xm = mx(M_m), x2 = mx(M_2);
  const xc = 2 * xm - (x1 + x2) / 2;                        // Bézier-stuurpunt door het middelpunt
  const curve = `M ${x1} ${yW0} Q ${xc} ${yWm} ${x2} ${yW1}`;
  const area = `M ${axisX} ${yW0} L ${x1} ${yW0} Q ${xc} ${yWm} ${x2} ${yW1} L ${axisX} ${yW1} Z`;

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — dragende metselwerkwand" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Geometrie</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }} title={ond.label}>Ondersteuning
            <select style={{ width: "100%" }} value={ondId} onChange={(e) => setVal("ondersteuning", parseInt(e.target.value))}>
              {ONDERSTEUNING.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>n (gesteunde randen)
            <span className="mw-radios">
              {RANDEN.map((o) => (
                <label key={o.v} title={o.v === 2 ? "boven + onder" : o.v === 3 ? "boven + onder + één verticale rand" : "boven + onder + twee verticale randen"}>
                  <input type="radio" name="n_rand" checked={n === o.v} onChange={() => setVal("n_rand", o.v)} />{o.label}
                </label>
              ))}
            </span>
          </label>
          <label>Werkelijke lengte ℓ, wand of penant (mm)
            <input type="number" step={100} value={l_w} onChange={(e) => setVal("l_w", parseFloat(e.target.value))} />
          </label>
          <label>Wandhoogte h (mm)
            <input type="number" step={100} value={h_w} onChange={(e) => setVal("h_w", parseFloat(e.target.value))} />
          </label>
          <label>Wanddikte t (mm)
            <input type="number" step={10} value={t_w} onChange={(e) => setVal("t_w", parseFloat(e.target.value))} />
          </label>
          <label title={`Verticale randsteuning vervalt bij L_v ≥ ${nLim} mm → n = ${nEff}`}>Lengte l (mm): vrije rand–steun (n = 3) of tussen de steunen (n = 4)
            <input type="number" step={100} value={L_v} onChange={(e) => setVal("L_v", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Metselwerk</span>
          <label>Steencategorie
            <select value={catId} onChange={(e) => setVal("steencategorie", parseInt(e.target.value))}>
              {CATEGORIE.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Steensoort
            <select value={steenId} onChange={(e) => {
              const id = parseInt(e.target.value);
              setVal("steensoort", id);
              const kw = (STENEN[id] ?? STENEN[3]).kwal;
              if (!KWALITEIT[kw].some((o) => o.v === fb)) setVal("f_b", KWAL_DEFAULT[kw]);
            }}>
              {Object.entries(STENEN).map(([id, st]) => <option key={id} value={id}>{st.name}</option>)}
            </select>
          </label>
          <label>Kwaliteit steen
            <select value={fb} onChange={(e) => setVal("f_b", parseFloat(e.target.value))}>
              {KWALITEIT[steen.kwal].map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Morteltype
            <select value={morteltype} onChange={(e) => {
              const mt = parseInt(e.target.value);
              setVal("morteltype", mt);
              const opts = mt === 2 ? VOEG_LIJM : VOEG_METSEL;
              if (!opts.includes(fmRaw)) setVal("f_m", opts[opts.length - 1]);
            }}>
              {MORTELTYPE.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Kwaliteit voeg
            <select value={fmRaw} onChange={(e) => setVal("f_m", parseFloat(e.target.value))}>
              {(isLijm ? VOEG_LIJM : VOEG_METSEL).map((v) => <option key={v} value={v}>{(isLijm ? "L" : "M") + v}</option>)}
            </select>
          </label>
          <label title="Eindkruipcoëfficiënt voor e_k (6.8), tabel NB-3 — telt pas mee boven λ_c = 27 (NB bij 6.1.2.2(2))">Eindkruipgetal φ<sub>∞</sub>
            <input type="number" step={0.1} value={phiInf} onChange={(e) => setVal("phi_inf", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Belasting</span>
          <label>N<sub>Ed</sub> (kN)
            <input type="number" step={10} value={N_Ed} onChange={(e) => setVal("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Grootste normaalkracht uit de fundamentele combinaties, niet kleiner dan N_Ed (NB bij 5.5.1.1(5))">N<sub>Ed,max</sub> (kN)
            <input type="number" step={10} value={N_Ed_max} onChange={(e) => setVal("N_Ed_max", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>1Ed</sub> (kNm)
            <input type="number" step={1} value={M_1} onChange={(e) => setVal("M_1Ed", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>mEd</sub> (kNm)
            <input type="number" step={1} value={M_m} onChange={(e) => setVal("M_mEd", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>2Ed</sub> (kNm)
            <input type="number" step={1} value={M_2} onChange={(e) => setVal("M_2Ed", parseFloat(e.target.value))} />
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", justifyContent: "safe center", gap, flexWrap: "nowrap", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Vooraanzicht</div>
            <div className="vd-stage" style={{ width: EW, height: EH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={EW} height={EH} className="vd-svg">
                {defs}
                {/* wand */}
                <rect x={xW0} y={yW0} width={wallW} height={wallH} fill="url(#mwBrick)" stroke="#1e40af" strokeWidth={1.5} />

                {/* ℓ-maatlijn — bovenste laag, ruim boven de belasting */}
                <line x1={xW0} y1={yW0 - 100} x2={xW1} y2={yW0 - 100} className="vd-dimmeasure" markerStart="url(#mwDim)" markerEnd="url(#mwDim)" />
                <line x1={xW0} y1={yW0 - 104} x2={xW0} y2={yW0 - 84} className="vd-dimext" />
                <line x1={xW1} y1={yW0 - 104} x2={xW1} y2={yW0 - 84} className="vd-dimext" />

                {/* h-maatlijn links */}
                <line x1={xW0 - 34} y1={yW0} x2={xW0 - 34} y2={yW1} className="vd-dimmeasure" markerStart="url(#mwDim)" markerEnd="url(#mwDim)" />
                <line x1={xW0 - 38} y1={yW0} x2={xW0 - 4} y2={yW0} className="vd-dimext" />
                <line x1={xW0 - 38} y1={yW1} x2={xW0 - 4} y2={yW1} className="vd-dimext" />

                {/* lastband op de wandkop — N_Ed grijpt aan over de volle wandlengte */}
                <line x1={xW0} y1={yW0 - 34} x2={xW1} y2={yW0 - 34} stroke="#dc2626" strokeWidth={1.5} />
                {Array.from({ length: 7 }, (_, i) => {
                  const qx = xW0 + 6 + i * ((wallW - 12) / 6);
                  return <line key={i} x1={qx} y1={yW0 - 34} x2={qx} y2={yW0 - 2} className="vd-load" strokeWidth={2} markerEnd="url(#mwLoad)" />;
                })}
              </svg>

              <Dim name="l_w" value={l_w} x={cx} y={yW0 - 100} step={100} label="ℓ" />
              <Dim name="h_w" value={h_w} x={xW0 - 34} y={yWm} step={100} label="h" />
              <Force name="N_Ed_max" value={N_Ed_max} x={cx} y={yW0 - 74} unit="kN" label="N_Ed,max" note="(min.exc.-toets)" />
              <Force name="N_Ed" value={N_Ed} x={cx} y={yW0 - 52} unit="kN" label="N_Ed" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede + momentenlijn</div>
            <div className="vd-stage" style={{ width: CW, height: CH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={CW} height={CH} className="vd-svg">
                {defsSec}
                {/* wanddoorsnede */}
                <rect x={xS0} y={yW0} width={tPx} height={wallH} fill="#e5e7eb" stroke="#1e40af" strokeWidth={1.5} />

                {/* t-maatlijn boven */}
                <line x1={xS0} y1={yW0 - 40} x2={xS1} y2={yW0 - 40} className="vd-dimmeasure" markerStart="url(#mwDim2)" markerEnd="url(#mwDim2)" />
                <line x1={xS0} y1={yW0 - 44} x2={xS0} y2={yW0 - 6} className="vd-dimext" />
                <line x1={xS1} y1={yW0 - 44} x2={xS1} y2={yW0 - 6} className="vd-dimext" />

                {/* N_Ed op de wandkop */}
                <line x1={cxS} y1={yW0 - 30} x2={cxS} y2={yW0 - 2} className="vd-load" strokeWidth={3} markerEnd="url(#mwLoad2)" />

                {/* momentenlijn: nullijn op axisX, positief naar rechts, parabolisch
                    verloop door M_1Ed (kop) → M_mEd (midden) → M_2Ed (voet) */}
                <path d={area} fill="#dc2626" fillOpacity={0.12} stroke="none" />
                <path d={curve} fill="none" stroke="#dc2626" strokeWidth={1.8} />
                <line x1={axisX} y1={yW0 - 16} x2={axisX} y2={yW1 + 10} stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 3" />
                {([[yW0, x1], [yWm, xm], [yW1, x2]] as [number, number][]).map(([yv, xv], i) => (
                  <g key={i}>
                    <line x1={axisX} y1={yv} x2={xv} y2={yv} stroke="#dc2626" strokeWidth={1} />
                    <circle cx={xv} cy={yv} r={2.6} fill="#dc2626" />
                  </g>
                ))}
                <text x={axisX} y={yW0 - 22} textAnchor="middle" fontSize={9} fill="#6b7280">M [kNm]</text>
              </svg>

              <Dim name="t_w" value={t_w} x={cxS} y={yW0 - 52} step={10} label="t" />
              <Force name="M_1Ed" value={M_1} x={chipX} y={yW0 + 11} unit="kNm" label="M_1Ed" step={1} />
              <Force name="M_mEd" value={M_m} x={chipX} y={yWm} unit="kNm" label="M_mEd" step={1} />
              <Force name="M_2Ed" value={M_2} x={chipX} y={yW1 - 11} unit="kNm" label="M_2Ed" step={1} />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of rode belasting om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">
          n = {nEff}{nEff !== n ? ` (L_v ≥ ${nLim})` : ""} · ρ<sub>2</sub> = {w("rho_2", 2)}
          {g.e_t0 > g.e_grens ? ` (e_t = ${fmt(g.e_t0, 1)} > 0,25t = ${fmt(g.e_grens, 1)} mm → inklemming vervalt)` : ""} ·
          ρ<sub>n</sub> = {w("rho_n", 3)} · h<sub>ef</sub> = {w("h_ef", 0)} mm ·
          λ = {w("lam", 1)}/27 · f<sub>d</sub> = {w("f_d", 2)} N/mm² · e<sub>i,t</sub> = {w("e_it", 1)} · e<sub>mk</sub> = {w("e_mk", 1)} mm ·
          Φ<sub>i,t</sub> = {w("Phi_it", 3)} · Φ<sub>i,b</sub> = {w("Phi_ib", 3)} · Φ<sub>m</sub> = {w("Phi_m", 3)} ·
          N<sub>Rd</sub> = {w("N_Rd", 1)} kN · UC = {g.UC_1 !== undefined ? fmt(g.UC_1, 2) : uitkomst ? "∞" : "—"}
          {g.N_Rdm2 !== undefined ? ` · min.exc.: Φ_m2 = ${w("Phi_m2", 3)} · N_Rd,m2 = ${w("N_Rdm2", 1)} kN · UC = ${g.UC_2 !== undefined ? fmt(g.UC_2, 2) : "∞"}` : ""}
          {g.ratio_N <= 0.1 ? ` · lage-belastingstak (N_Ed/(ℓ·t·f_d) = ${fmt(g.ratio_N, 3)} ≤ 0,1): e_cap = ${w("e_cap", 1)} mm` : ""}
        </span>
      </div>
    </div>
  );
}
