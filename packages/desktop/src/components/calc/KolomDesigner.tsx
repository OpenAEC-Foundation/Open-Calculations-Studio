import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import { useBladUitkomst } from "./bladResultaat";
import { UitkomstKop } from "./designerKit";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Parametrisch beeld van een houten kolom op druk (+ eventueel buiging), volgens
 * NEN-EN 1995-1-1 §6.3.2. Vooraanzicht van de slanke kolom met bovenoplegging
 * (roloplegging + drukkracht F) en onderscharnier. Zelfde stijl als de andere
 * designers.
 *
 * De UC's in de kop en de voet komen uit het doorgerekende blad
 * (templates/kolom.ts): het beeld rekent de toetsing niet na, dus beeld en
 * uitwerking tonen hetzelfde getal, ook in de norm-stand.
 */
const MARKER = "Houten kolom";

interface Prof { name: string; b: number; h: number }
const PROFILES: Record<number, Prof> = {
  1: { name: "38×140", b: 38, h: 140 }, 2: { name: "45×145", b: 45, h: 145 },
  3: { name: "45×195", b: 45, h: 195 }, 4: { name: "63×175", b: 63, h: 175 },
  5: { name: "75×175", b: 75, h: 175 }, 6: { name: "75×225", b: 75, h: 225 },
  7: { name: "100×100", b: 100, h: 100 }, 8: { name: "100×200", b: 100, h: 200 },
  9: { name: "100×300", b: 100, h: 300 }, 10: { name: "150×150", b: 150, h: 150 },
  11: { name: "44×144", b: 44, h: 144 }, 12: { name: "44×194", b: 44, h: 194 },
};
const STERKTE: { v: number; label: string }[] = [
  { v: 1, label: "C18" }, { v: 2, label: "C24" }, { v: 3, label: "C30" },
];
const KLIMAAT: { v: number; label: string }[] = [
  { v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" },
];
const DUURKLASSE: { v: number; label: string }[] = [
  { v: 1, label: "Blijvend" }, { v: 2, label: "Middellang" }, { v: 3, label: "Kort" },
];
const DEFAULTS: Record<string, number> = {
  profiel: 5, L: 3200, Lcr_y: 3200, Lcr_z: 3200, Lcr: 3200,
  N_Ed: 10, M_yA_Ed: 0, M_yB_Ed: 0, q_z_Ed: 0,
  sterkteklasse: 2, klimaatklasse: 1, duurklasse: 1,
};

export default function KolomDesigner() {
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

  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 760, h: 540 });

  const isKolom = source.includes(MARKER);
  useEffect(() => {
    if (!isKolom) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isKolom, activeId, seedBladWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(240, r.width), h: Math.max(260, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isKolom]);

  if (!isKolom) return null;

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
  const profId = Math.round(d("profiel"));
  const prof = PROFILES[profId] ?? PROFILES[5];
  const b = prof.b;
  const L = d("L"), Lcr_y = d("Lcr_y"), Lcr_z = d("Lcr_z"), Lcr = d("Lcr");
  const N_Ed = d("N_Ed"), M_yA = d("M_yA_Ed"), M_yB = d("M_yB_Ed"), q_z = d("q_z_Ed");
  const sterkte = Math.round(d("sterkteklasse")), klim = Math.round(d("klimaatklasse"));
  const duur = Math.round(d("duurklasse"));

  const fmt = (v: number, dec = 2) => v.toFixed(dec).replace(".", ",");
  // Tussenwaarden uit de uitwerking; "—" zolang het blad ze niet toont.
  const g = uitkomst?.getallen ?? {};
  const w = (naam: string, dec = 2) => (g[naam] === undefined ? "—" : fmt(g[naam], dec));

  // ── klikbare chips ────────────────────────────────────────────────────────
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
  function Force(props: { name: string; value: number; x: number; y: number; unit: string; label: string; step?: number }) {
    const { name, value, x, y, unit, label, step = 1 } = props;
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
          </button>
        )}
      </div>
    );
  }

  const defs = (
    <defs>
      <marker id="klDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
      </marker>
      <marker id="klLoad" markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1 L9 4.5 L1 8 Z" className="vd-loadfill" />
      </marker>
    </defs>
  );

  // ── layout: alleen vooraanzicht (kolom), vult de ruimte, gecentreerd ───────
  const capH = 26;
  const EW = box.w, EH = box.h - capH;

  // vooraanzicht: kolom vult de hoogte, dun (ware verhouding), gecentreerd
  const mT = 54, mB = 44, mLe = 40, mRe = 64;
  const colH = Math.max(40, EH - mT - mB);
  const sV = colH / L;                                     // verticale schaal
  const colW = Math.max(3, b * sV);                        // dunne kolom
  const xc = mLe + Math.max(0, (EW - mLe - mRe) / 2);      // hart kolom (gecentreerd)
  const yTop = mT, yBot = mT + colH;

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — kolom" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Profiel</span>
          <label>Profielnaam
            <select value={profId} onChange={(e) => setVal("profiel", parseInt(e.target.value))}>
              {Object.entries(PROFILES).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
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
          <label>Belastingsduurklasse
            <select value={duur} onChange={(e) => setVal("duurklasse", parseInt(e.target.value))}>
              {DUURKLASSE.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>

          <span className="vd-ctrl-h">Geometrie (mm)</span>
          <label>Kolomlengte L
            <input type="number" step={100} value={L} onChange={(e) => setVal("L", parseFloat(e.target.value))} />
          </label>
          <label>Kniklengte L<sub>cr,y</sub>
            <input type="number" step={100} value={Lcr_y} onChange={(e) => setVal("Lcr_y", parseFloat(e.target.value))} />
          </label>
          <label>Kniklengte L<sub>cr,z</sub>
            <input type="number" step={100} value={Lcr_z} onChange={(e) => setVal("Lcr_z", parseFloat(e.target.value))} />
          </label>
          <label title="Ongesteunde lengte voor kip (§6.3.3). In de referentiestand rekent de kiplengte met de kolomlengte L en telt L_cr niet mee; in de norm-stand telt max(L; L_cr).">Ongesteunde lengte L<sub>cr</sub>
            <input type="number" step={100} value={Lcr} onChange={(e) => setVal("Lcr", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Belastingen</span>
          <label>N<sub>Ed</sub> (kN)
            <input type="number" step={1} value={N_Ed} onChange={(e) => setVal("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>y,A,Ed</sub> (kNm)
            <input type="number" step={1} value={M_yA} onChange={(e) => setVal("M_yA_Ed", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>y,B,Ed</sub> (kNm)
            <input type="number" step={1} value={M_yB} onChange={(e) => setVal("M_yB_Ed", parseFloat(e.target.value))} />
          </label>
          <label>q<sub>z,Ed</sub> (kN/m)
            <input type="number" step={0.5} value={q_z} onChange={(e) => setVal("q_z_Ed", parseFloat(e.target.value))} />
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, justifyContent: "safe center", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Vooraanzicht</div>
            <div className="vd-stage" style={{ width: EW, height: EH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={EW} height={EH} className="vd-svg">
                {defs}

                {/* q_z verdeelde last (indien ≠ 0) — horizontale pijltjes op de kolom.
                    Positief duwt naar rechts, negatief (zuiging) van rechts naar links. */}
                {q_z !== 0 && Array.from({ length: 6 }, (_, i) => {
                  const qy = yTop + 20 + i * ((colH - 40) / 5);
                  return q_z > 0
                    ? <line key={i} x1={xc - colW / 2 - 26} y1={qy} x2={xc - colW / 2 - 2} y2={qy} className="vd-load" strokeWidth={2} markerEnd="url(#klLoad)" />
                    : <line key={i} x1={xc + colW / 2 + 26} y1={qy} x2={xc + colW / 2 + 2} y2={qy} className="vd-load" strokeWidth={2} markerEnd="url(#klLoad)" />;
                })}

                {/* kolom */}
                <rect x={xc - colW / 2} y={yTop} width={colW} height={colH} fill="#E3C08A" stroke="#3730a3" strokeWidth={1.4} />

                {/* onderscharnier (pin) */}
                <path d={`M ${xc} ${yBot} L ${xc - 10} ${yBot + 16} L ${xc + 10} ${yBot + 16} Z`} fill="#c7d2fe" stroke="#3730a3" strokeWidth={1.4} />
                <line x1={xc - 16} y1={yBot + 16} x2={xc + 16} y2={yBot + 16} stroke="#3730a3" strokeWidth={1.4} />
                {Array.from({ length: 5 }, (_, i) => (
                  <line key={i} x1={xc - 14 + i * 7} y1={yBot + 16} x2={xc - 20 + i * 7} y2={yBot + 23} stroke="#3730a3" strokeWidth={1} />
                ))}

                {/* bovenoplegging (roloplegging, horizontaal gesteund) */}
                <path d={`M ${xc + colW / 2} ${yTop + 8} L ${xc + colW / 2 + 14} ${yTop} L ${xc + colW / 2 + 14} ${yTop + 16} Z`} fill="#c7d2fe" stroke="#3730a3" strokeWidth={1.4} />
                <circle cx={xc + colW / 2 + 18} cy={yTop + 3} r={2.6} fill="#fff" stroke="#3730a3" strokeWidth={1.2} />
                <circle cx={xc + colW / 2 + 18} cy={yTop + 13} r={2.6} fill="#fff" stroke="#3730a3" strokeWidth={1.2} />
                <line x1={xc + colW / 2 + 22} y1={yTop - 3} x2={xc + colW / 2 + 22} y2={yTop + 19} stroke="#3730a3" strokeWidth={1.4} />

                {/* N_Ed drukkracht bovenop */}
                <line x1={xc} y1={yTop - 34} x2={xc} y2={yTop - 1} className="vd-load" strokeWidth={3} markerEnd="url(#klLoad)" />

                {/* moment M_y,A (boven) en M_y,B (onder), indien ≠ 0. Tekenafspraak
                    van het blad: M(x) = M_A(1−x/L) + M_B·x/L + q_z·x(L−x)/2, dus een
                    positief eindmoment buigt de kolom net als een positieve q_z naar
                    rechts. Het koppel draait dan boven linksom en onder rechtsom. */}
                {M_yA !== 0 && (
                  <path d={M_yA > 0
                      ? `M ${xc + 16} ${yTop + 4} A 16 16 0 1 0 ${xc - 16} ${yTop + 4}`
                      : `M ${xc - 16} ${yTop + 4} A 16 16 0 1 1 ${xc + 16} ${yTop + 4}`}
                    fill="none" stroke="#dc2626" strokeWidth={2} markerEnd="url(#klLoad)" />
                )}
                {M_yB !== 0 && (
                  <path d={M_yB > 0
                      ? `M ${xc - 16} ${yBot - 4} A 16 16 0 1 1 ${xc + 16} ${yBot - 4}`
                      : `M ${xc + 16} ${yBot - 4} A 16 16 0 1 0 ${xc - 16} ${yBot - 4}`}
                    fill="none" stroke="#dc2626" strokeWidth={2} markerEnd="url(#klLoad)" />
                )}

                {/* L-maat (rechts) */}
                <line x1={xc + colW / 2 + 60} y1={yTop} x2={xc + colW / 2 + 60} y2={yBot} className="vd-dimmeasure" markerStart="url(#klDim)" markerEnd="url(#klDim)" />
              </svg>

              <Force name="N_Ed" value={N_Ed} x={xc} y={yTop - 46} unit="kN" label="F" />
              <Dim name="L" value={L} x={xc + colW / 2 + 60} y={(yTop + yBot) / 2} step={100} label="L" unit="" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">
          profiel {prof.name} · M<sub>y,Ed</sub> {w("M_yEd")} kNm · λ<sub>rel,y</sub> {w("λ_rel_y")} · λ<sub>rel,z</sub> {w("λ_rel_z")} · k<sub>c,y</sub> {w("k_cy")} · k<sub>c,z</sub> {w("k_cz")} · k<sub>crit</sub> {w("k_crit")} · druk (6.2) {w("UC_62")} · (6.19) {w("UC_619")} · afschuiving {w("UC_613")} · knik (6.23) {w("UC_623")} · (6.24) {w("UC_624")} · kip (6.35) {w("UC_635")}
        </span>
      </div>
    </div>
  );
}
