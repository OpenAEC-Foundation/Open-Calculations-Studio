import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import { useBladUitkomst, ucTekst } from "./bladResultaat";
import { UitkomstKop } from "./designerKit";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Parametrisch beeld van een houten dakgording (gording) volgens NEN-EN 1995-1-1.
 * Doorsnede-aanzicht van het dakvlak (schuin of plat) met de gordingen als
 * loodrechte blokken op het dakvlak, hoek α, en de maatlijnen l, h, daklengte
 * en de h.o.h.-afstand van de gordingen. Zelfde stijl als de andere designers
 * (transparant, verticale scheidingslijn, streepjes-maatlijnen zonder pijlen,
 * responsief via ResizeObserver, gecentreerd, uniforme fit-schaal).
 *
 * Het beeld rekent zelf niets: de kop toont de maatgevende UC en het oordeel
 * van het blad (templates/gording.ts), de voetregel de afzonderlijke toetsen
 * uit dezelfde uitwerking. Eerder rekende het beeld een eigen, afwijkende
 * toetsing na.
 */
const MARKER = "Gording";

const DAK: { v: number; label: string }[] = [
  { v: 1, label: "Plat dak" }, { v: 2, label: "Schuin dak" },
];
// Gording-profielen (b × h in mm), dezelfde lijst als in het blad
const PROF: { v: number; label: string; b: number; h: number }[] = [
  { v: 1, label: "58 × 150", b: 58, h: 150 },
  { v: 2, label: "71 × 171", b: 71, h: 171 },
  { v: 3, label: "71 × 196", b: 71, h: 196 },
  { v: 4, label: "85 × 220", b: 85, h: 220 },
  { v: 5, label: "85 × 250", b: 85, h: 250 },
  { v: 6, label: "100 × 250", b: 100, h: 250 },
  { v: 7, label: "100 × 300", b: 100, h: 300 },
  { v: 8, label: "96 × 296", b: 96, h: 296 },
];
const STERKTE: { v: number; label: string }[] = [
  { v: 1, label: "C18" }, { v: 2, label: "C24" }, { v: 3, label: "C30" },
];
const KLIMAAT: { v: number; label: string }[] = [
  { v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" },
];
const GRENS: { v: number; label: string }[] = [
  { v: 0.004, label: "0,004 × L" }, { v: 0.003, label: "0,003 × L" }, { v: 0.002, label: "0,002 × L" },
];

// q_par staat op 0: een ontlasting door muurplaat en nokgording is gunstig en
// moet daar apart worden aangetoond, dus die vult de gebruiker zelf in.
const DEFAULTS: Record<string, number> = {
  dakType: 2, profiel: 5, L_dag: 5000, a_opl: 75, n_gording: 3,
  t_beschot: 18, I_manual: 0, I_beschot: 486000, E_beschot: 5000,
  sterkteklasse: 2, klimaatklasse: 1, l_h: 4500, h_v: 3000,
  g_pannen: 0.4, g_panlat: 0.04, g_dakplaat: 0.09899, g_plafond: 0.2, q_par: 0,
  Q_k: 2, q_var: 0,
  s_k: 0.70, sk_manual: 0, mu1_val: 0.702, mu1_manual: 0,
  z_wind: 9, windbron: 1, q_wind_hand: 0, c_pe_zuig: -0.7,
  controleer: 1, grensfactor: 0.004, dubbele: 1,
};

export default function GordingDesigner() {
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

  // De uitkomst en de toetsen van het blad zelf.
  const uitkomst = useBladUitkomst();
  const [editing, setEditing] = useState<string | null>(null);
  const [loadTab, setLoadTab] = useState(0);            // 0=permanent 1=veranderlijk 2=wind 3=sneeuw

  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 760, h: 540 });

  const isGording = source.includes(MARKER);
  // Seed ontbrekende invoerwaarden. Ook afhankelijk van het exemplaar, zodat na
  // de asynchrone hydratie uit de Tauri-store (die een verse seed kan
  // overschrijven) nieuw toegevoegde keys alsnog geseed worden. seedWaarden is
  // idempotent (return-early als niets ontbreekt) → geen render-loop.
  useEffect(() => {
    if (!isGording) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isGording, activeId, seedBladWaarden, exemplaar]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(240, r.width), h: Math.max(260, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isGording]);

  if (!isGording) return null;

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
  const dakType = Math.round(d("dakType"));
  const profIdx = Math.round(d("profiel"));
  const prof = PROF.find((p) => p.v === profIdx) ?? PROF[4];
  const L_dag = d("L_dag");
  const a_opl = d("a_opl");
  const nG = Math.max(1, Math.round(d("n_gording")));
  const tBeschot = d("t_beschot");
  const Imanual = Math.round(d("I_manual"));
  const Iauto = (1000 * tBeschot ** 3) / 12;            // I per m breedte = 1000·t³/12
  const Ebeschot = d("E_beschot");
  const sterkte = Math.round(d("sterkteklasse"));
  const lH = d("l_h");                                  // horizontale projectie [mm]
  const hV = dakType === 1 ? 0 : d("h_v");              // hoogte [mm]

  // permanente belasting
  const gP = d("g_pannen"), gPl = d("g_panlat"), gDp = d("g_dakplaat"), gPf = d("g_plafond");
  const Pgk = gP + gPl + gDp + gPf;
  const qPar = d("q_par");
  const controleer = Math.round(d("controleer"));
  const grens = d("grensfactor");
  const dubbele = Math.round(d("dubbele"));
  const klim = Math.round(d("klimaatklasse"));
  const Qk = d("Q_k"), qVar = d("q_var");
  const skManual = Math.round(d("sk_manual"));
  // NL uniforme grondwaarde (NEN-EN 1991-1-3 NB); het veld toont de s_k van het
  // blad, want boven 50 jaar ontwerplevensduur rekent het blad met bijlage D.
  const skAuto = 0.70;
  const mu1Manual = Math.round(d("mu1_manual"));
  const zWind = d("z_wind");
  const cpeZuig = d("c_pe_zuig");

  // ── afgeleide geometrie (alleen voor de tekening) ────────────────────────
  const alpha = dakType === 1 ? 0 : Math.atan2(hV, lH);  // rad
  const alphaDeg = (alpha * 180) / Math.PI;
  const slopeLen = Math.hypot(lH, hV);                   // daklengte [mm]
  const hohSlope = slopeLen / (nG + 1);                  // h.o.h. langs dakvlak

  // ── uitkomsten van het blad; "—" zolang het blad ze niet toont ─────────────
  const g = uitkomst?.getallen ?? {};
  const w = (naam: string) => (g[naam] === undefined ? "—" : ucTekst(g[naam]));
  // q_p staat op het blad als het blad hem berekent, anders de ingevulde q_wind.
  const qpBlad = g.q_p ?? g.q_wind;

  // ── layout: vult het tekengebied, gecentreerd, uniforme schaal ────────────
  const capH = 26;
  const W = box.w, H = box.h - capH;
  const mL = 70, mR = 78, mT = 40, mB = 52;
  const availW = W - mL - mR, availH = H - mT - mB;
  const sFit = Math.min(availW / Math.max(1, lH), hV > 10 ? availH / hV : Infinity);
  const s = Number.isFinite(sFit) ? sFit : availW / Math.max(1, lH);
  const Wpx = lH * s, Hpx = hV * s;
  const xE = mL + Math.max(0, (availW - Wpx) / 2);
  const yTop = mT + Math.max(0, (availH - Hpx) / 2);     // nok (rechtsboven)
  const yBot = yTop + Hpx;                               // dakvoet (linksonder)
  const E = { x: xE, y: yBot };                          // dakvoet
  const R = { x: xE + Wpx, y: yTop };                    // nok

  // eenheidsvectoren: u langs dakvlak (voet→nok), p loodrecht naar binnen (omlaag)
  const ux = Math.cos(alpha), uy = -Math.sin(alpha);
  const pX = Math.sin(alpha), pY = Math.cos(alpha);

  const tp = Math.max(6, tBeschot * s);                  // dakbeschot-dikte in px
  const offRoof = { x: pX * tp / 2, y: pY * tp / 2 };
  const bwPx = Math.max(4, prof.b * s);                  // gording-breedte langs dakvlak
  const depPx = Math.max(10, prof.h * s);               // gording-hoogte loodrecht

  // gording-blokken loodrecht op het dakvlak, hangend aan de binnenzijde
  const gordingen = Array.from({ length: nG }, (_, i) => {
    const frac = (i + 1) / (nG + 1);
    const B = { x: E.x + frac * Wpx, y: E.y - frac * Hpx };   // basispunt op dakvlak
    const c0 = { x: B.x - (bwPx / 2) * ux + offRoof.x, y: B.y - (bwPx / 2) * uy + offRoof.y };
    const c1 = { x: B.x + (bwPx / 2) * ux + offRoof.x, y: B.y + (bwPx / 2) * uy + offRoof.y };
    const c2 = { x: c1.x + depPx * pX, y: c1.y + depPx * pY };
    const c3 = { x: c0.x + depPx * pX, y: c0.y + depPx * pY };
    return { B, pts: `${c0.x},${c0.y} ${c1.x},${c1.y} ${c2.x},${c2.y} ${c3.x},${c3.y}` };
  });

  // dakbeschot-strook (dun timmerhout-vlak op het dakvlak)
  const roofPts = `${E.x - offRoof.x},${E.y - offRoof.y} ${R.x - offRoof.x},${R.y - offRoof.y} ${R.x + offRoof.x},${R.y + offRoof.y} ${E.x + offRoof.x},${E.y + offRoof.y}`;

  // daklengte-maatlijn (grijs), evenwijdig aan dakvlak, buitenzijde (−p, 30px)
  const dl = 30;
  const dE = { x: E.x - pX * dl, y: E.y - pY * dl };
  const dR = { x: R.x - pX * dl, y: R.y - pY * dl };

  // één h.o.h.-vak langs dakvlak (grijs), tussen dakvoet en 1e gording
  const g1 = { x: E.x + (1 / (nG + 1)) * Wpx, y: E.y - (1 / (nG + 1)) * Hpx };
  const hl = 16;
  const hE = { x: E.x + pX * hl, y: E.y + pY * hl };
  const hG = { x: g1.x + pX * hl, y: g1.y + pY * hl };

  const px = (v: number) => +v.toFixed(1);

  // ── klikbare blauwe maat-chips ────────────────────────────────────────────
  function Dim(props: { name: string; value: number; x: number; y: number; step?: number; label?: string; unit?: string }) {
    const { name, value, x, y, step = 100, label, unit = "" } = props;
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
            {label ? `${label}=` : ""}{Math.round(value)}{unit}
          </button>
        )}
      </div>
    );
  }

  const fmt = (v: number, dec = 2) => v.toFixed(dec).replace(".", ",");

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — gording" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Geometrie</span>
          <label>Daktype
            <select value={dakType} onChange={(e) => setVal("dakType", parseInt(e.target.value))}>
              {DAK.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Profiel (b×h)
            <select value={profIdx} onChange={(e) => setVal("profiel", parseInt(e.target.value))}>
              {PROF.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Dagmaat (mm)
            <input type="number" step={50} value={L_dag} onChange={(e) => setVal("L_dag", parseFloat(e.target.value))} />
          </label>
          <label>Opleglengte per oplegging (mm)
            <input type="number" step={5} value={a_opl} onChange={(e) => setVal("a_opl", parseFloat(e.target.value))} />
          </label>
          <label>Aantal gordingen
            <input type="number" step={1} min={1} value={nG} onChange={(e) => setVal("n_gording", parseInt(e.target.value))} />
          </label>
          <label>Dikte dakbeschot (mm)
            <input type="number" step={1} value={tBeschot} onChange={(e) => setVal("t_beschot", parseFloat(e.target.value))} />
          </label>
          <label style={{ gap: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={Imanual === 1} onChange={(e) => setVal("I_manual", e.target.checked ? 1 : 0)} style={{ width: "auto" }} />
              I dakbeschot (mm⁴)
            </span>
            <input type="number" step={1000} value={Imanual === 1 ? d("I_beschot") : Math.round(Iauto)} disabled={Imanual !== 1}
              onChange={(e) => setVal("I_beschot", parseFloat(e.target.value))} />
          </label>
          <label>E dakbeschot (N/mm²)
            <input type="number" step={100} value={Ebeschot} onChange={(e) => setVal("E_beschot", parseFloat(e.target.value))} />
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

          <span className="vd-ctrl-h">Belastingen</span>
          <div className="gd-tabs">
            {["Permanent", "Veranderlijk", "Wind", "Sneeuw"].map((t, i) => (
              <button key={i} type="button" className={`gd-tab${loadTab === i ? " active" : ""}`} onClick={() => setLoadTab(i)}>{t}</button>
            ))}
          </div>
          <div className="gd-tabbody">
            {loadTab === 0 && (
              <>
                <label>E.g. pannen (kN/m²)
                  <input type="number" step={0.01} value={gP} onChange={(e) => setVal("g_pannen", parseFloat(e.target.value))} />
                </label>
                <label>E.g. panlat + tengel (kN/m²)
                  <input type="number" step={0.01} value={gPl} onChange={(e) => setVal("g_panlat", parseFloat(e.target.value))} />
                </label>
                <label>E.g. dakplaat (kN/m²)
                  <input type="number" step={0.01} value={gDp} onChange={(e) => setVal("g_dakplaat", parseFloat(e.target.value))} />
                </label>
                <label>E.g. plafond (kN/m²)
                  <input type="number" step={0.01} value={gPf} onChange={(e) => setVal("g_plafond", parseFloat(e.target.value))} />
                </label>
                <label>P<sub>g,k</sub> (kN/m²)
                  <input type="number" value={+Pgk.toFixed(3)} disabled />
                </label>
              </>
            )}
            {loadTab === 1 && (
              <>
                <label>Q<sub>k</sub> geconcentreerd (kN)
                  <input type="number" step={0.5} value={Qk} onChange={(e) => setVal("Q_k", parseFloat(e.target.value))} />
                </label>
                <label>q<sub>k</sub> verdeeld (kN/m²)
                  <input type="number" step={0.1} value={qVar} onChange={(e) => setVal("q_var", parseFloat(e.target.value))} />
                </label>
                <div className="gd-note">Het blad toetst Q<sub>k</sub> en q<sub>k</sub> elk als eigen combinatie; q<sub>k</sub> = 0 laat die combinatie weg.</div>
              </>
            )}
            {loadTab === 2 && (
              <>
                <label>Hoogte boven maaiveld (m)
                  <input type="number" step={0.5} value={zWind} onChange={(e) => setVal("z_wind", parseFloat(e.target.value))} />
                </label>
                <label>Extreme stuwdruk q<sub>p</sub> (kN/m²)
                  <input type="number" value={qpBlad !== undefined ? +qpBlad.toFixed(3) : ""} disabled />
                </label>
                <label>c<sub>pe</sub> bij zuiging
                  <input type="number" step={0.1} value={cpeZuig} onChange={(e) => setVal("c_pe_zuig", parseFloat(e.target.value))} />
                </label>
                <div className="gd-note">Negatief, voor de dakzone van deze gording bij A = h.o.h. × L; het blad rekent opwaarts met c<sub>pi</sub> = +0,2.{dakType === 1 && <> Op een plat dak toetst het blad ook druk in zone I: c<sub>pe</sub> = +0,2 met c<sub>pi</sub> = −0,3.</>}</div>
              </>
            )}
            {loadTab === 3 && (
              <>
                <div className="gd-note">Nederland — uniforme grondwaarde (NEN-EN 1991-1-3 NB). μ<sub>1</sub> volgt uit de dakhelling.</div>
                <label style={{ gap: 6 }}>
                  <span className="gd-chk">
                    <input type="checkbox" checked={skManual === 1} onChange={(e) => setVal("sk_manual", e.target.checked ? 1 : 0)} />
                    Sneeuwbelasting s<sub>k</sub> (kN/m²)
                  </span>
                  <input type="number" step={0.05} value={skManual === 1 ? d("s_k") : (g.s_k ?? skAuto)} disabled={skManual !== 1} onChange={(e) => setVal("s_k", parseFloat(e.target.value))} />
                </label>
                <label style={{ gap: 6 }}>
                  <span className="gd-chk">
                    <input type="checkbox" checked={mu1Manual === 1} onChange={(e) => setVal("mu1_manual", e.target.checked ? 1 : 0)} />
                    Vormcoëfficiënt μ<sub>1</sub>
                  </span>
                  <input type="number" step={0.01} value={mu1Manual === 1 ? d("mu1_val") : g["μ_1"] !== undefined ? +g["μ_1"].toFixed(3) : ""} disabled={mu1Manual !== 1} onChange={(e) => setVal("mu1_val", parseFloat(e.target.value))} />
                </label>
              </>
            )}
          </div>
          <label>q∥ door muurplaat en nokgording (kN/m)
            <input type="number" step={0.1} value={qPar} onChange={(e) => setVal("q_par", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Opties</span>
          <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={controleer === 1} onChange={(e) => setVal("controleer", e.target.checked ? 1 : 0)} style={{ width: "auto" }} />
            Controleer doorbuiging
          </label>
          <label>Toelaatbare bijk. doorbuiging
            <select value={grens} onChange={(e) => setVal("grensfactor", parseFloat(e.target.value))}>
              {GRENS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={dubbele === 1} onChange={(e) => setVal("dubbele", e.target.checked ? 1 : 0)} style={{ width: "auto" }} />
            Dubbele buiging
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, justifyContent: "safe center", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Dwarsdoorsnede dakvlak &amp; gordingen</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                <defs>
                  <marker id="grDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                    <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
                  </marker>
                </defs>

                {/* hulp-driehoek (gestreept) */}
                <line x1={px(E.x)} y1={px(E.y)} x2={px(R.x)} y2={px(E.y)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 5" />
                <line x1={px(R.x)} y1={px(E.y)} x2={px(R.x)} y2={px(R.y)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 5" />

                {/* dakbeschot-strook */}
                <polygon points={roofPts} fill="#dbe4f5" stroke="#1d4ed8" strokeWidth={1.2} />

                {/* gordingen (loodrecht op dakvlak) */}
                {gordingen.map((g, i) => (
                  <polygon key={i} points={g.pts} fill="#E3C08A" stroke="#8B6F47" strokeWidth={1} />
                ))}

                {/* hoek α-boog + label (bij dakvoet) */}
                {dakType === 2 && (() => {
                  const rArc = Math.min(64, Wpx * 0.34);
                  const a0 = { x: E.x + rArc, y: E.y };
                  const a1 = { x: E.x + rArc * Math.cos(alpha), y: E.y - rArc * Math.sin(alpha) };
                  return (
                    <g>
                      <path d={`M ${px(a0.x)} ${px(a0.y)} A ${px(rArc)} ${px(rArc)} 0 0 0 ${px(a1.x)} ${px(a1.y)}`} fill="none" stroke="#6b7280" strokeWidth={1} />
                      <text x={px(E.x + rArc + 8)} y={px(E.y - rArc * 0.32)} style={{ fontSize: 11, fill: "#6b7280" }}>{fmt(alphaDeg, 1)}°</text>
                    </g>
                  );
                })()}

                {/* daklengte-maatlijn (grijs, langs dakvlak) */}
                <g className="vd-dimline">
                  <line x1={px(E.x)} y1={px(E.y)} x2={px(dE.x)} y2={px(dE.y)} className="vd-dimext" />
                  <line x1={px(R.x)} y1={px(R.y)} x2={px(dR.x)} y2={px(dR.y)} className="vd-dimext" />
                  <line x1={px(dE.x)} y1={px(dE.y)} x2={px(dR.x)} y2={px(dR.y)} className="vd-dimmeasure" markerStart="url(#grDim)" markerEnd="url(#grDim)" />
                  <text x={px((dE.x + dR.x) / 2)} y={px((dE.y + dR.y) / 2 - 6)} textAnchor="middle" style={{ fontSize: 11, fill: "#6b7280" }}>{Math.round(slopeLen)}</text>
                </g>

                {/* één h.o.h.-vak langs dakvlak (grijs) */}
                <g className="vd-dimline">
                  <line x1={px(E.x)} y1={px(E.y)} x2={px(hE.x)} y2={px(hE.y)} className="vd-dimext" />
                  <line x1={px(g1.x)} y1={px(g1.y)} x2={px(hG.x)} y2={px(hG.y)} className="vd-dimext" />
                  <line x1={px(hE.x)} y1={px(hE.y)} x2={px(hG.x)} y2={px(hG.y)} className="vd-dimmeasure" markerStart="url(#grDim)" markerEnd="url(#grDim)" />
                  <text x={px((hE.x + hG.x) / 2 + 6)} y={px((hE.y + hG.y) / 2 + 4)} style={{ fontSize: 10, fill: "#6b7280" }}>{Math.round(hohSlope)}</text>
                </g>

                {/* l-maat (blauw, onder) */}
                <g className="vd-dimline">
                  <line x1={px(E.x)} y1={px(E.y)} x2={px(E.x)} y2={px(E.y + mB - 12)} className="vd-dimext" />
                  <line x1={px(R.x)} y1={px(E.y)} x2={px(R.x)} y2={px(E.y + mB - 12)} className="vd-dimext" />
                  <line x1={px(E.x)} y1={px(E.y + mB - 18)} x2={px(R.x)} y2={px(E.y + mB - 18)} className="vd-dimmeasure" markerStart="url(#grDim)" markerEnd="url(#grDim)" />
                </g>

                {/* h-maat (blauw, rechts) */}
                {dakType === 2 && (
                  <g className="vd-dimline">
                    <line x1={px(R.x)} y1={px(R.y)} x2={px(R.x + mR - 22)} y2={px(R.y)} className="vd-dimext" />
                    <line x1={px(R.x)} y1={px(E.y)} x2={px(R.x + mR - 22)} y2={px(E.y)} className="vd-dimext" />
                    <line x1={px(R.x + mR - 28)} y1={px(R.y)} x2={px(R.x + mR - 28)} y2={px(E.y)} className="vd-dimmeasure" markerStart="url(#grDim)" markerEnd="url(#grDim)" />
                  </g>
                )}
              </svg>

              {/* klikbare chips */}
              <Dim name="l_h" value={lH} x={(E.x + R.x) / 2} y={E.y + mB - 18} step={100} label="l" unit=" mm" />
              {dakType === 2 && (
                <Dim name="h_v" value={hV} x={R.x + mR - 28} y={(R.y + E.y) / 2} step={100} label="h" unit=" mm" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">
          α = {fmt(alphaDeg, 1)}° · daklengte {Math.round(slopeLen)} mm · h.o.h. {Math.round(hohSlope)} mm · buiging (6.11) {w("UC_611")} · (6.12) {w("UC_612")} · afschuiving {w("UC_afsch")} · oplegdruk {w("UC_c90")} · kip {w("UC_kip")} · doorbuiging w<sub>y</sub> {w("UC_wy")} · w<sub>z</sub> {w("UC_wz")} · opwaarts {w("UC_w_op")}
        </span>
      </div>
    </div>
  );
}
