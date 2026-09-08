import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Parametrisch beeld van een spuwer (noodoverlaat) in een dakrand-opstand.
 * Reproduceert het de referentie-uitwerking-invoerbeeld: links een doorsnede door de opstand
 * met het dakvlak op afschot, de drempelhoogte h_nd, de spuweropening h en de
 * waterstanden, rechts het vooraanzicht van de opening b × h in de opstand.
 * Beide aanzichten staan op één uniforme schaal.
 *
 * De UC in de kop en de voet is dezelfde toetsing als in het rekenblad
 * (templates/spuwer.ts, gecalibreerd op 5 de referentie-uitwerking-referenties):
 * Q_h = A·i_r (7.2), d_nd = 0,7·(Q_h/(b·n))^(2/3) (7.4), d_hw = d_nd + h_nd
 * (7.8), en h_min = 30 + d_hw − h_nd uit §7.3(3) getoetst op de spuwerhoogte h.
 */
const MARKER = "Spuwer";

/** Eén bron van waarheid voor de invoer — voedt de controls én de gedeelde store. */
// Defaults spiegelen de referentie-uitwerking-referentie 1S, zodat elk getoond getal tegen een
// referentieblad te leggen is (u.c. = 0,95 voldoet).
const DEFAULTS: Record<string, number> = {
  A_afv: 600,   // m²  — afvoergebied
  n_sp: 3,      // –   — aantal spuwers
  b_sp: 600,    // mm  — breedte spuwer
  h_sp: 80,     // mm  — hoogte spuwer (opening)
  h_nd: 50,     // mm  — hoogte onderzijde spuwer boven de dakbedekking
  t_ref: 50,    // jaar — ontwerplevensduur / referentieperiode
};

// Ontwerplevensduurklassen zoals elders in het project (EN 1990 NB tabel NB.1-2.1),
// met de regenintensiteit uit Tabel NB.1. Alle vier tegen een referentie geverifieerd.
const LEVENSDUUR: { v: number; label: string; ir: number }[] = [
  { v: 5, label: "5 jaar (tijdelijk)", ir: 0.000027 },
  { v: 15, label: "15 jaar (landbouw)", ir: 0.000041 },
  { v: 50, label: "50 jaar (gebouwen)", ir: 0.00005 },
  { v: 100, label: "100 jaar (monumentaal)", ir: 0.000056 },
];

const H_VERSTOP = 30;    // mm — extra vrije hoogte tegen verstopping, §7.3(3)

// Maten die het beeld opzetten maar geen invoer zijn — indicatief, alleen om de
// doorsnede leesbaar te maken.
const T_OPSTAND = 120;   // mm — dikte van de opstand/dakrand
const L_DAK = 180;       // mm — getoonde lengte dakvlak links van de opstand
const AFSCHOT = 4;       // mm — hoogteverschil over die lengte (afschot naar de spuwer)
const D_DAK = 80;        // mm — getoonde dikte dakconstructie
const H_BOVEN = 110;     // mm — getoonde opstand boven de spuweropening

export default function SpuwerDesigner() {
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

  // Meet het beschikbare tekengebied zodat het beeld meegroeit met het paneel.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 860, h: 560 });

  const isSpuwer = source.includes(MARKER);
  useEffect(() => {
    if (!isSpuwer) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isSpuwer, activeId, seedBladWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(200, r.width), h: Math.max(220, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isSpuwer]);

  if (!isSpuwer) return null;

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
  const A_afv = d("A_afv");
  const n_sp = Math.max(1, Math.round(d("n_sp")));
  const b_sp = Math.max(1, d("b_sp"));
  const h_sp = Math.max(1, d("h_sp"));
  const h_nd = Math.max(0, d("h_nd"));
  const t_ref = Math.round(d("t_ref"));
  const i_r = (LEVENSDUUR.find((o) => o.v === t_ref) ?? LEVENSDUUR[2]).ir;   // Tabel NB.1

  // ── toetsing (zelfde regels als templates/spuwer.ts) ──────────────────────
  const b_tot = n_sp * b_sp;                        // mm — som van de spuwerbreedten
  const Q_h = A_afv * i_r;                          // m³/s — regenwaterdebiet (7.2)
  const b_m = b_sp / 1000;                          // m
  const d_nd = 0.7 * (Q_h / (b_m * n_sp)) ** (2 / 3) * 1000;   // mm (7.4)
  const d_hw = d_nd + h_nd;                         // mm — waterstand op het dak (7.8)
  const q_rw = (10 * d_hw) / 1000;                  // kN/m² — regenwater (10 kN/m³)
  const h_min = H_VERSTOP + d_hw - h_nd;            // mm — §7.3(3)
  const UC = h_sp > 0 ? h_min / h_sp : 0;
  const ok = UC <= 1.0;
  const d_min = d_nd > 0 ? (Q_h / n_sp) / (d_nd / 1000 / 0.29) ** 1.5 * 1000 : 0;  // mm (7.7)
  const A_op = (b_sp * h_sp) / 1e6;                 // doorstroomoppervlak per spuwer [m²]
  const fmt = (v: number, dec = 0) => v.toFixed(dec).replace(".", ",");

  // ── klikbare chips ────────────────────────────────────────────────────────
  function Dim(props: { name: string; value: number; x: number; y: number; step?: number; label?: string }) {
    const { name, value, x, y, step = 10, label } = props;
    const isEd = editing === name;
    return (
      <div className="vd-dim" style={{ left: x, top: y }}>
        {isEd ? (
          <input className="vd-dim-input" type="number" step={step} defaultValue={value} autoFocus
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
  /** Afgeleide maat — grijs en niet klikbaar. */
  function Ro(props: { text: string; x: number; y: number; title?: string }) {
    return (
      <div className="vd-dim-ro" style={{ left: props.x, top: props.y, color: "#6b7280" }} title={props.title}>
        {props.text}
      </div>
    );
  }

  const defs = (
    <defs>
      <marker id="spDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
      </marker>
      <marker id="spDimG" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <circle cx="5" cy="6" r="2.4" fill="#9ca3af" stroke="#9ca3af" strokeWidth="0.8" />
      </marker>
      <linearGradient id="spDek" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d1d5db" />
        <stop offset="100%" stopColor="#8b8f96" />
      </linearGradient>
    </defs>
  );
  const defsF = (
    <defs>
      <marker id="spDimF" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
      </marker>
    </defs>
  );

  // ── layout: doorsnede links, vooraanzicht rechts, elk een eigen schaal ─────
  // De doorsnede is een detail van de dakrand (korte dakstrook, dunne
  // constructie) en het vooraanzicht toont de volle spuwerbreedte; die twee
  // verhouden zich te ver uit elkaar voor één schaal.
  const capH = 26, gap = 18;
  const secMM = L_DAK + T_OPSTAND;                       // breedte doorsnede [mm]
  const secHMM = D_DAK + h_nd + h_sp + H_BOVEN;          // hoogte doorsnede [mm]
  // Naast elkaar zolang het past; in een smalle pane onder elkaar, zodat de
  // doorsnede de volle breedte krijgt in plaats van tot een streepje te krimpen.
  const stacked = box.w < 560;
  const SW = stacked ? box.w : Math.round((box.w - gap) * 0.55);
  const FW = stacked ? box.w : box.w - gap - SW;
  const SH = stacked ? (box.h - 2 * capH - gap) / 2 : box.h - capH;
  // Marges schalen mee met het paneel: bij een smalle pane mag de maatvoering
  // krimpen in plaats van de tekening op te eten.
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const mL = clamp(SW * 0.17, 24, 74);
  const mR = clamp(SW * 0.05, 6, 26);
  const mT = clamp(SH * 0.10, 40, 56);   // ruimte voor de b-maatlijn boven het vooraanzicht
  const mB = clamp(SH * 0.04, 8, 30);
  const fPad = clamp(FW * 0.08, 8, 20);
  // De maatlijnen links schalen mee met de beschikbare marge.
  const dimL = clamp(mL - 26, 12, 46);

  // ── doorsnede — eigen schaal, referentie is het dakvlak bij de opstand ────
  const s = Math.min((SH - mT - mB) / secHMM, (SW - mL - mR) / secMM);
  const xL = mL + Math.max(0, (SW - mL - mR - secMM * s) / 2);   // linkerrand tekening
  const xP0 = xL + L_DAK * s, xP1 = xP0 + T_OPSTAND * s;          // opstand
  const yOff = Math.max(0, (SH - mT - mB - secHMM * s) / 2);      // verticaal centreren
  const yRoof = mT + yOff + H_BOVEN * s + h_sp * s + h_nd * s;   // dakvlak bij de opstand
  const ySill = yRoof - h_nd * s;                                 // drempel = onderkant opening
  const yTop = ySill - h_sp * s;                                  // bovenkant opening
  const yWat = ySill - d_nd * s;                                  // waterlijn
  const y30 = yWat - H_VERSTOP * s;                               // waterlijn + 30 mm (7.3(3))
  const yBot = yRoof + D_DAK * s;                                 // onderkant tekening
  const yRoofL = yRoof - AFSCHOT * s;                             // dakvlak links (afschot)

  const yCap = yTop - H_BOVEN * s;                                 // bovenkant opstand

  // ── vooraanzicht — zelfde hóógteschaal als de doorsnede, zodat de opening
  //    exact uitlijnt. De breedte b vult het aanzicht en staat dus niet op
  //    dezelfde schaal; alleen het gat in de hoogte is maatvast.
  const bPx = Math.max(40, FW - 2 * fPad - 56);                   // getekende breedte opening
  const xF0 = fPad + 8, xF1 = xF0 + bPx;

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — spuwer (noodoverlaat)</strong>
        <span className={`vd-uc ${ok ? "ok" : "bad"}`}>
          u.c. = {fmt(UC, 2)} {ok ? "✓ voldoet" : "✗ voldoet niet"}
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Afvoer</span>
          <label>Afvoergebied A (m²)
            <input type="number" step={10} value={A_afv} onChange={(e) => setVal("A_afv", parseFloat(e.target.value))} />
          </label>
          <label>Aantal spuwers n
            <input type="number" step={1} min={1} value={n_sp} onChange={(e) => setVal("n_sp", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Spuwer (mm)</span>
          <label>Breedte spuwer b
            <input type="number" step={50} value={b_sp} onChange={(e) => setVal("b_sp", parseFloat(e.target.value))} />
          </label>
          <label>Hoogte spuwer h
            <input type="number" step={10} value={h_sp} onChange={(e) => setVal("h_sp", parseFloat(e.target.value))} />
          </label>
          <label title="Hoogte van de drempel (onderkant spuwer) boven het dakvlak">Drempelhoogte h<sub>nd</sub>
            <input type="number" step={10} value={h_nd} onChange={(e) => setVal("h_nd", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Regenintensiteit</span>
          <label title="Bepaalt de regenintensiteit i_r uit Tabel NB.1">Ontwerplevensduur
            <select value={t_ref} onChange={(e) => setVal("t_ref", parseInt(e.target.value))}>
              {LEVENSDUUR.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <span className="gd-note">i<sub>r</sub> = {i_r} [m³/s]/m² volgt uit Tabel NB.1 bij t = {t_ref} jaar.</span>
          <span className="gd-note">Q<sub>h</sub> = A·i<sub>r</sub> = {fmt(Q_h, 3)} m³/s · b<sub>tot</sub> = {fmt(b_tot)} mm ·
            d<sub>nd</sub> = {fmt(d_nd, 1)} mm · d<sub>hw</sub> = {fmt(d_hw, 1)} mm · q = {fmt(q_rw, 2)} kN/m²</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: stacked ? "column" : "row", alignItems: "center", justifyContent: "center", gap, flexWrap: "nowrap", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede — detail dakrand</div>
            <div className="vd-stage" style={{ width: SW, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={SW} height={SH} className="vd-svg">
                {defs}

                {/* dakconstructie op afschot, met de opstand als één doorlopend lichaam */}
                <path
                  d={`M ${xL} ${yRoofL} L ${xP0} ${yRoof} L ${xP0} ${ySill} L ${xP1} ${ySill} L ${xP1} ${yBot} L ${xL} ${yBot} Z`}
                  fill="url(#spDek)" stroke="#111827" strokeWidth={1.4}
                />
                {/* opstand bóven de spuweropening */}
                <rect x={xP0} y={yTop - H_BOVEN * s} width={T_OPSTAND * s} height={H_BOVEN * s} fill="#8b8f96" stroke="#111827" strokeWidth={1.4} />

                {/* water op het dak tot de waterlijn */}
                <path
                  d={`M ${xL} ${yWat} L ${xP1} ${yWat} L ${xP1} ${ySill} L ${xP0} ${ySill} L ${xP0} ${yRoof} L ${xL} ${yRoofL} Z`}
                  fill="#2563eb" fillOpacity={0.1} stroke="none"
                />
                {/* waterlijn + straal door de opening */}
                <line x1={xL} y1={yWat} x2={xP1} y2={yWat} stroke="#1d4ed8" strokeWidth={1.6} />
                <path d={`M ${xP1} ${yWat} q ${16 * s * 4} 2 ${26 * s * 4} 16`} fill="none" stroke="#1d4ed8" strokeWidth={1.6} />
                <path d={`M ${xP1} ${ySill} q ${16 * s * 4} 2 ${26 * s * 4} 16`} fill="none" stroke="#1d4ed8" strokeWidth={1.6} />

                {/* snijlijnen */}
                <line x1={xL} y1={yTop - H_BOVEN * s} x2={xL} y2={yBot + 8} stroke="#4b5563" strokeWidth={1} strokeDasharray="8 5" />
                <line x1={xL - 8} y1={yBot} x2={xP1 + 30} y2={yBot} stroke="#4b5563" strokeWidth={1} strokeDasharray="8 5" />
                <line x1={xP0} y1={yTop} x2={xP1 + 30} y2={yTop} stroke="#4b5563" strokeWidth={1} strokeDasharray="8 5" />

                {/* h — hoogte spuweropening */}
                <line x1={xL - dimL} y1={yTop} x2={xL - dimL} y2={ySill} className="vd-dimmeasure" markerStart="url(#spDim)" markerEnd="url(#spDim)" />
                <line x1={xL - dimL - 4} y1={yTop} x2={xL - 6} y2={yTop} className="vd-dimext" />
                <line x1={xL - dimL - 4} y1={ySill} x2={xL - 6} y2={ySill} className="vd-dimext" />
                {/* h_nd — drempelhoogte */}
                <line x1={xL - dimL} y1={ySill} x2={xL - dimL} y2={yRoof} className="vd-dimmeasure" markerStart="url(#spDim)" markerEnd="url(#spDim)" />
                <line x1={xL - dimL - 4} y1={yRoof} x2={xL - 6} y2={yRoof} className="vd-dimext" />

                {/* d_hw — waterstand op het dak (grijs, afgeleid) */}
                <line x1={xL + 55 * s} y1={yWat} x2={xL + 55 * s} y2={yRoof} stroke="#9ca3af" strokeWidth={1} markerStart="url(#spDimG)" markerEnd="url(#spDimG)" />
                {/* d_nd — waterhoogte boven de drempel */}
                <line x1={xL + 130 * s} y1={yWat} x2={xL + 130 * s} y2={ySill} stroke="#9ca3af" strokeWidth={1} markerStart="url(#spDimG)" markerEnd="url(#spDimG)" />
                {/* 30 mm extra hoogte tegen verstopping (§7.3(3)), vanaf de waterlijn
                    omhoog; steekt die boven de opening uit, dan voldoet de spuwer niet */}
                <line x1={xP0 + T_OPSTAND * s / 2} y1={y30} x2={xP0 + T_OPSTAND * s / 2} y2={yWat}
                  stroke={ok ? "#9ca3af" : "#dc2626"} strokeWidth={1.2} markerStart="url(#spDimG)" markerEnd="url(#spDimG)" />
                <line x1={xP0} y1={y30} x2={xP1} y2={y30}
                  stroke={ok ? "#9ca3af" : "#dc2626"} strokeWidth={1} strokeDasharray="5 3" />
              </svg>

              <Dim name="h_sp" value={h_sp} x={xL - dimL} y={(yTop + ySill) / 2} step={10} label="h" />
              <Dim name="h_nd" value={h_nd} x={xL - dimL} y={(ySill + yRoof) / 2} step={10} label="hnd" />
              <Ro text={`dhw=${fmt(d_hw)}`} x={xL + 55 * s} y={(yWat + yRoof) / 2} title="waterstand op het dak = hnd + dnd" />
              <Dim name="d_nd" value={d_nd} x={xL + 130 * s} y={(yWat + ySill) / 2} step={2} label="dnd" />
              <div className="vd-dim-ro" style={{ left: xP0 + T_OPSTAND * s / 2, top: (y30 + yWat) / 2, color: ok ? "#6b7280" : "#dc2626" }}
                title="30 mm vrije hoogte tegen verstopping (§7.3(3)) — moet binnen de spuweropening passen">
                {H_VERSTOP}
              </div>
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Vooraanzicht</div>
            <div className="vd-stage" style={{ width: FW, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={FW} height={SH} className="vd-svg">
                {defsF}
                {/* opstand: doorlopend vlak met snijlijnen links/rechts */}
                <line x1={fPad} y1={yCap} x2={FW - fPad} y2={yCap} stroke="#111827" strokeWidth={1.4} />
                <line x1={fPad} y1={yCap - 10} x2={fPad} y2={yBot + 8} stroke="#4b5563" strokeWidth={1} strokeDasharray="8 5" />
                <line x1={FW - fPad} y1={yCap - 10} x2={FW - fPad} y2={yBot + 8} stroke="#4b5563" strokeWidth={1} strokeDasharray="8 5" />
                <line x1={fPad} y1={yBot} x2={FW - fPad} y2={yBot} stroke="#4b5563" strokeWidth={1} strokeDasharray="8 5" />
                {/* dakvlak achter de opstand */}
                <line x1={fPad} y1={yRoof} x2={FW - fPad} y2={yRoof} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 3" />

                {/* de spuweropening — hoogte op schaal van de doorsnede, breedte vullend */}
                <rect x={xF0} y={yTop} width={bPx} height={h_sp * s} fill="#fff" stroke="#111827" strokeWidth={1.8} />

                {/* waterlijn door de opening */}
                <line x1={fPad} y1={yWat} x2={xF0} y2={yWat} stroke="#1d4ed8" strokeWidth={1.2} strokeDasharray="7 4" />
                <line x1={xF0} y1={yWat} x2={xF1} y2={yWat} stroke="#1d4ed8" strokeWidth={1.6} />
                <line x1={xF1} y1={yWat} x2={FW - fPad} y2={yWat} stroke="#1d4ed8" strokeWidth={1.2} strokeDasharray="7 4" />

                {/* b-maatlijn boven */}
                <line x1={xF0} y1={yCap - 24} x2={xF1} y2={yCap - 24} className="vd-dimmeasure" markerStart="url(#spDimF)" markerEnd="url(#spDimF)" />
                <line x1={xF0} y1={yCap - 28} x2={xF0} y2={yTop - 4} className="vd-dimext" />
                <line x1={xF1} y1={yCap - 28} x2={xF1} y2={yTop - 4} className="vd-dimext" />
                {/* h-maatlijn rechts van de opening — zelfde hoogte als in de doorsnede */}
                <line x1={xF1 + 26} y1={yTop} x2={xF1 + 26} y2={ySill} className="vd-dimmeasure" markerStart="url(#spDimF)" markerEnd="url(#spDimF)" />
                <line x1={xF1 + 4} y1={yTop} x2={xF1 + 30} y2={yTop} className="vd-dimext" />
                <line x1={xF1 + 4} y1={ySill} x2={xF1 + 30} y2={ySill} className="vd-dimext" />
              </svg>

              <Dim name="b_sp" value={b_sp} x={(xF0 + xF1) / 2} y={yCap - 24} step={50} label="b" />
              <Dim name="h_sp" value={h_sp} x={xF1 + 26} y={(yTop + ySill) / 2} step={10} label="h" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.<br />Doorsnede en vooraanzicht hebben elk een eigen schaal; de doorsnede is een detail van de dakrand.</span>
        <span className="vd-live">
          Q<sub>h</sub> = {fmt(Q_h, 3)} m³/s · b<sub>tot</sub> = {fmt(b_tot)} mm · d<sub>nd</sub> = {fmt(d_nd, 1)} mm ·
          d<sub>hw</sub> = {fmt(d_hw, 1)} mm · q = {fmt(q_rw, 2)} kN/m² · h<sub>min</sub> = 30 + d<sub>hw</sub> − h<sub>nd</sub> = {fmt(h_min, 1)} mm ·
          u.c. = {fmt(h_min, 1)}/{fmt(h_sp)} = {fmt(UC, 2)} · ronde spuwer d<sub>min</sub> = {fmt(d_min)} mm ·
          opening {fmt(b_sp)}×{fmt(h_sp)} mm ({fmt(A_op, 3)} m²)
        </span>
      </div>
    </div>
  );
}
