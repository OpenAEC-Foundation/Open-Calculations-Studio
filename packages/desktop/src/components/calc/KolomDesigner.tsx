import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Parametrisch beeld van een houten kolom op druk (+ eventueel buiging), volgens
 * NEN-EN 1995-1-1 §6.3.2. Vooraanzicht van de slanke kolom met bovenoplegging
 * (roloplegging + drukkracht F) en onderscharnier. Zelfde stijl als de andere
 * designers.
 *
 * De UC's in de kop en de voet zijn dezelfde toetsingen als in het rekenblad
 * (templates/kolom.ts, gecalibreerd op 3 de referentie-uitwerking-referenties): druk §6.1.4,
 * druk + buiging §6.2.4, afschuiving §6.1.7, knik §6.3.2, kip + knik §6.3.3.
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
// EN 338 karakteristiek — f_m,k, f_c,0,k, f_v,k, E_0,05 [N/mm²]
const MAT: Record<number, { fmk: number; fc0k: number; fvk: number; E005: number }> = {
  1: { fmk: 18, fc0k: 18, fvk: 3.4, E005: 6000 },
  2: { fmk: 24, fc0k: 21, fvk: 4.0, E005: 7400 },
  3: { fmk: 30, fc0k: 23, fvk: 4.0, E005: 8000 },
};
// k_mod gezaagd hout (EN 1995 Tabel 3.1) — [klimaatklasse 1/2, klimaatklasse 3]
const KMOD: Record<number, [number, number]> = {
  1: [0.6, 0.5], 2: [0.8, 0.65], 3: [0.9, 0.7],
};
const GAMMA_M = 1.3, K_M = 0.7, BETA_C = 0.2;

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
  const b = prof.b, h = prof.h;
  const L = d("L"), Lcr_y = d("Lcr_y"), Lcr_z = d("Lcr_z"), Lcr = d("Lcr");
  const N_Ed = d("N_Ed"), M_yA = d("M_yA_Ed"), M_yB = d("M_yB_Ed"), q_z = d("q_z_Ed");
  const sterkte = Math.round(d("sterkteklasse")), klim = Math.round(d("klimaatklasse"));
  const duur = Math.round(d("duurklasse"));

  // ── toetsing (zelfde regels als templates/kolom.ts) ──────────────────────
  const mat = MAT[sterkte] ?? MAT[2];
  const kmod = (KMOD[duur] ?? KMOD[1])[klim === 3 ? 1 : 0];
  const kh = (dim: number) => (dim < 150 ? Math.min((150 / dim) ** 0.2, 1.3) : 1);
  const fmyd = (kmod * mat.fmk * kh(h)) / GAMMA_M;      // k_h met de hoogte h
  const fmzd = (kmod * mat.fmk * kh(b)) / GAMMA_M;      // k_h met de breedte b
  const fc0d = (kmod * mat.fc0k) / GAMMA_M;             // géén k_h op druk
  const fvd = (kmod * mat.fvk) / GAMMA_M;

  const A = b * h;
  const Iy = (b * h ** 3) / 12, Iz = (h * b ** 3) / 12;
  const Wy = Iy / (h / 2);
  const Sy = (b * h ** 2) / 8;
  const iy = Math.sqrt(Iy / A), iz = Math.sqrt(Iz / A);

  // snedekrachten: eindmoment + veldmoment uit q_z, dwarskracht incl. koppelkracht
  const M_Ed = (Math.max(Math.abs(M_yA), Math.abs(M_yB)) + (q_z * (L / 1000) ** 2) / 8) * 1e6; // Nmm
  const V_Ed = (q_z * (L / 1000)) / 2 + Math.abs(M_yA - M_yB) / (L / 1000);                    // kN
  const sigC = (N_Ed * 1e3) / A;
  const sigMy = M_Ed / Wy;
  const tau = (V_Ed * 1e3 * Sy) / (b * Iy);

  // knik §6.3.2
  const relSlender = (lcr: number, i: number) => (lcr / i / Math.PI) * Math.sqrt(mat.fc0k / mat.E005);
  const lamRelY = relSlender(Lcr_y, iy), lamRelZ = relSlender(Lcr_z, iz);
  const kc = (lamRel: number) => {
    if (lamRel <= 0.3) return 1;
    const k = 0.5 * (1 + BETA_C * (lamRel - 0.3) + lamRel ** 2);
    return 1 / (k + Math.sqrt(k ** 2 - lamRel ** 2));
  };
  const kcy = kc(lamRelY), kcz = kc(lamRelZ);

  // kip §6.3.3 — l_ef = 0,9·L + 2h, begrensd op L; De referentie-uitwerking rekent hier met de
  // kolomlengte L, de ongesteunde lengte L_cr komt in §6.3.3 niet terug.
  const lef = Math.min(0.9 * L + 2 * h, L);
  const sigMcrit = ((0.78 * b ** 2) / (h * lef)) * mat.E005;
  const lamRelM = Math.sqrt(mat.fmk / sigMcrit);
  const kcrit = lamRelM <= 0.75 ? 1 : lamRelM <= 1.4 ? 1.56 - 0.75 * lamRelM : 1 / lamRelM ** 2;

  const UC_62 = sigC / fc0d;
  const UC_619 = (sigC / fc0d) ** 2 + sigMy / fmyd;
  const UC_620 = (sigC / fc0d) ** 2 + (K_M * sigMy) / fmyd;
  const UC_613 = tau / fvd;
  const UC_623 = sigC / (kcy * fc0d) + sigMy / fmyd;
  const UC_624 = sigC / (kcz * fc0d) + (K_M * sigMy) / fmyd;
  const UC_635 = (sigMy / (kcrit * fmyd)) ** 2 + sigC / (kcz * fc0d);
  const UC_max = Math.max(UC_62, UC_619, UC_620, UC_613, UC_623, UC_624, UC_635);
  const ok = UC_max <= 1.0;
  const fmt = (v: number, dec = 2) => v.toFixed(dec).replace(".", ",");
  void fmzd; // dit blad kent geen belasting om de zwakke as (σ_m,z,d = 0)

  // ── klikbare chips ────────────────────────────────────────────────────────
  function Dim(props: { name: string; value: number; x: number; y: number; step?: number; factor?: number; unit?: string; label?: string }) {
    const { name, value, x, y, step = 10, factor = 1, unit = "", label } = props;
    const disp = +(value * factor).toFixed(factor < 1 ? 2 : 0);
    const isEd = editing === name;
    return (
      <div className="vd-dim" style={{ left: x, top: y }}>
        {isEd ? (
          <input className="vd-dim-input" type="number" step={step} defaultValue={disp} autoFocus
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
      <div className="vd-head">
        <strong>Parametrisch beeld — kolom</strong>
        <span className={`vd-uc ${ok ? "ok" : "bad"}`}>
          UC<sub>max</sub> = {fmt(UC_max, 2)} {ok ? "✓ voldoet" : "✗ voldoet niet"}
        </span>
      </div>

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
          <label>Ongesteunde lengte L<sub>cr</sub>
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

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, justifyContent: "center", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Vooraanzicht</div>
            <div className="vd-stage" style={{ width: EW, height: EH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={EW} height={EH} className="vd-svg">
                {defs}

                {/* q_z verdeelde last (indien ≠ 0) — horizontale pijltjes op de kolom */}
                {q_z !== 0 && Array.from({ length: 6 }, (_, i) => {
                  const qy = yTop + 20 + i * ((colH - 40) / 5);
                  return <line key={i} x1={xc - colW / 2 - 26} y1={qy} x2={xc - colW / 2 - 2} y2={qy} className="vd-load" strokeWidth={2} markerEnd="url(#klLoad)" />;
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

                {/* moment M_y,A (boven) en M_y,B (onder), indien ≠ 0 */}
                {M_yA !== 0 && (
                  <path d={`M ${xc - 16} ${yTop + 4} A 16 16 0 1 1 ${xc + 16} ${yTop + 4}`} fill="none" stroke="#dc2626" strokeWidth={2} markerEnd="url(#klLoad)" />
                )}
                {M_yB !== 0 && (
                  <path d={`M ${xc - 16} ${yBot - 4} A 16 16 0 1 1 ${xc + 16} ${yBot - 4}`} fill="none" stroke="#dc2626" strokeWidth={2} markerEnd="url(#klLoad)" />
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
          profiel {prof.name} · λ<sub>rel,y</sub> {fmt(lamRelY, 2)} · λ<sub>rel,z</sub> {fmt(lamRelZ, 2)} · k<sub>c,y</sub> {fmt(kcy, 2)} · k<sub>c,z</sub> {fmt(kcz, 2)} · k<sub>crit</sub> {fmt(kcrit, 2)} · druk (6.2) {fmt(UC_62, 2)} · (6.19) {fmt(UC_619, 2)} · afschuiving {fmt(UC_613, 2)} · knik (6.23) {fmt(UC_623, 2)} · (6.24) {fmt(UC_624, 2)} · kip (6.35) {fmt(UC_635, 2)}
        </span>
      </div>
    </div>
  );
}
