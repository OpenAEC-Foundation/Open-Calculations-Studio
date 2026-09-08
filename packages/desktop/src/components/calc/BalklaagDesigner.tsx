import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useProjectKFI, useProjectGetal, useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Losstaand parametrisch beeld van een balklaag (doorsnede): vloerhout op
 * houten balken, hart-op-hart afstand. Leest/schrijft dezelfde invoer als de
 * rekensheet (balklaag.ts) via het exemplaar in de projectstore; de unity
 * checks lopen live
 * mee (gespiegeld aan de template).
 */
const MARKER = "Balklaag";

interface Prof { name: string; b: number; h: number }
const PROFILES: Record<number, Prof> = {
  1: { name: "46×96", b: 46, h: 96 }, 2: { name: "46×146", b: 46, h: 146 },
  3: { name: "46×171", b: 46, h: 171 }, 4: { name: "46×196", b: 46, h: 196 },
  5: { name: "63×146", b: 63, h: 146 }, 6: { name: "63×171", b: 63, h: 171 },
  7: { name: "63×196", b: 63, h: 196 }, 8: { name: "63×221", b: 63, h: 221 },
  9: { name: "71×146", b: 71, h: 146 }, 10: { name: "71×171", b: 71, h: 171 },
  11: { name: "71×196", b: 71, h: 196 }, 12: { name: "71×221", b: 71, h: 221 },
  13: { name: "71×246", b: 71, h: 246 }, 14: { name: "71×271", b: 71, h: 271 },
  15: { name: "96×171", b: 96, h: 171 }, 16: { name: "96×196", b: 96, h: 196 },
  17: { name: "96×221", b: 96, h: 221 }, 18: { name: "96×246", b: 96, h: 246 },
  19: { name: "96×271", b: 96, h: 271 },
};

interface Mat { name: string; fmk: number; fvk: number; E: number; rho: number; gM: number }
const MATS: Record<number, Mat> = {
  1: { name: "C18", fmk: 18, fvk: 3.4, E: 9000, rho: 380, gM: 1.30 },
  2: { name: "C24", fmk: 24, fvk: 4.0, E: 11000, rho: 420, gM: 1.30 },
  3: { name: "C30", fmk: 30, fvk: 4.0, E: 12000, rho: 460, gM: 1.30 },
  4: { name: "GL24h", fmk: 24, fvk: 3.5, E: 11500, rho: 420, gM: 1.25 },
  5: { name: "GL28h", fmk: 28, fvk: 3.5, E: 12600, rho: 425, gM: 1.25 },
};
const DUUR: { v: number; label: string }[] = [
  { v: 1, label: "Kort" }, { v: 2, label: "Middellang" }, { v: 3, label: "Lang" }, { v: 4, label: "Blijvend" },
];
const KLIM: { v: number; label: string }[] = [
  { v: 1, label: "Klasse 1" }, { v: 2, label: "Klasse 2" }, { v: 3, label: "Klasse 3" },
];
const CAT: { v: number; label: string }[] = [
  { v: 2, label: "Vloer (woning/kantoor)" }, { v: 1, label: "Dak" }, { v: 3, label: "Zelf invullen" },
];
const GRENS: { v: number; label: string }[] = [
  { v: 0.004, label: "0,004 × L" }, { v: 0.003, label: "0,003 × L" }, { v: 0.002, label: "0,002 × L" },
];

/**
 * Eén bron van waarheid voor de invoer-defaults. Wordt zowel gebruikt om de
 * controls te tonen (via num()) als om de gedeelde store te seeden, zodat de
 * evaluator (rekensheet) en de designer nooit op verschillende defaults
 * uitkomen. Zonder seed valt de evaluator terug op de eerste @select-optie en
 * '0' voor `?`-velden — die wijken af van wat het beeld toont.
 */
const DEFAULTS: Record<string, number> = {
  profiel: 10, sterkteklasse: 2, duurklasse: 2, klimaat: 1,
  L_d: 5000, a_opl: 50, hoh: 450, t_vloer: 25,
  E_beschot: 7000, b_vloer: 5,
  g_k: 1.5, q_k: 1.0, Q_k: 2, belastingcat: 2,
  "ψ_0_zelf": 0.5, "ψ_2_zelf": 0.3, controleer: 1, grensfactor: 0.004,
  controleer_trilling: 1, "ζ": 0.01, a_tril: 1.0, b_tril: 120,
};

export default function BalklaagDesigner() {
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
  const [box, setBox] = useState({ w: 620, h: 360 });

  // Push the displayed defaults into the shared store on open / case switch, so
  // the rekensheet evaluates with the same inputs the picture shows. Only fills
  // missing keys — user-set values are never overwritten.
  const isBalklaag = source.includes(MARKER);
  useEffect(() => {
    if (!isBalklaag) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isBalklaag, activeId, seedBladWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(220, r.width), h: Math.max(200, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isBalklaag]);

  // Projectwaarden: hooks, dus ze moeten vóór de vroege return staan. Anders
  // roept deze component in de ene render meer hooks aan dan in de andere en
  // klapt React eruit zodra het paneel van blad wisselt.
  const kfi = useProjectKFI();
  const xc = Math.round(useProjectGetal("rekenwijze", 1)) === 1;

  if (!isBalklaag) return null;

  const vals = exemplaar?.waarden ?? {};
  const num = (name: string, def: number): number => {
    const raw = vals[name];
    if (raw === undefined || raw === "") return def;
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };
  const setVal = (name: string, value: number) => zetBladWaarde(name, String(value));

  // ── invoer (defaults uit gedeelde DEFAULTS-bron, zie boven) ───────────────
  const d = (name: string) => num(name, DEFAULTS[name]);
  const profId = Math.round(d("profiel"));
  const prof = PROFILES[profId] ?? PROFILES[DEFAULTS.profiel];
  const matId = Math.round(d("sterkteklasse"));
  const mat = MATS[matId] ?? MATS[DEFAULTS.sterkteklasse];
  const duur = Math.round(d("duurklasse"));
  const klim = Math.round(d("klimaat"));
  // Het eigen gewicht is een splitspunt: De referentie-uitwerking rekent 550 kg/m³ met g = 10,
  // de norm ρ_mean uit EN 338 met g = 9,81. Die keuze staat in de
  // projectgegevens en niet in dit paneel — het blad leest hem daar ook.
  const Ld = d("L_d");
  const aOpl = d("a_opl");
  const hoh = d("hoh");
  const tVloer = d("t_vloer");
  const eBeschot = d("E_beschot");
  const bVloer = d("b_vloer");
  const gk = d("g_k");
  const qk = d("q_k");
  const Qk = d("Q_k");
  const cat = Math.round(d("belastingcat"));
  const tril = Math.round(d("controleer_trilling"));
  const zeta = d("ζ");
  const aTril = d("a_tril");
  const bTril = d("b_tril");
  const psi0zelf = d("ψ_0_zelf");
  const psi2zelf = d("ψ_2_zelf");
  const psi2 = cat === 1 ? 0 : cat === 2 ? 0.3 : psi2zelf;
  const controleer = Math.round(d("controleer"));
  const grens = d("grensfactor");

  const { b, h } = prof;
  // ── doorsnede + checks (gespiegeld aan balklaag.ts), in N en mm ──────────
  const A = b * h, Iy = (b * h ** 3) / 12, Wy = (b * h ** 2) / 6, Sy = (b * h ** 2) / 8;
  const kmod12 = duur === 1 ? 0.9 : duur === 2 ? 0.8 : duur === 3 ? 0.7 : 0.6;
  const kmod3 = duur === 1 ? 0.7 : duur === 2 ? 0.65 : duur === 3 ? 0.55 : 0.5;
  const kmod = klim === 3 ? kmod3 : kmod12;
  const kdef = klim === 1 ? 0.6 : klim === 2 ? 0.8 : 2.0;
  const fmd = (kmod * mat.fmk) / mat.gM, fvd = (kmod * mat.fvk) / mat.gM;
  const Lth = Ld + aOpl;
  const qkEff = qk;
  const gBalk = xc ? (A * 1e-6 * 550 * 10) / 1000 : (A * 1e-6 * mat.rho * 9.81) / 1000; // kN/m
  const Pg = (hoh / 1000) * gk + gBalk; // kN/m = N/mm
  const qq = (hoh / 1000) * qkEff; // N/mm
  const ug = (5 / 384) * (Pg * Lth ** 4) / (mat.E * Iy);
  const uq = (5 / 384) * (qq * Lth ** 4) / (mat.E * Iy);
  // Concentratiefactor: derde term = (EI)_l/EI_ref met (EI)_l = E_beschot·t³/12
  // per mm plaatbreedte. De E-modulus van het beschot is nu invoer, zodat een
  // stijver of slapper beschot ook echt doorwerkt.
  const kr = Math.min(1, 0.37 + (0.8 * hoh) / 1000 - (eBeschot * tVloer ** 3) / 12 / 50000000);
  const FQ = Qk * kr; // kN
  const uQ = (1 / 48) * (FQ * 1000 * Lth ** 3) / (mat.E * Iy);
  const uvar = Math.max(uq, uQ);
  const wfin = (1 + kdef) * ug + (1 + psi2 * kdef) * uvar;
  const wlim = grens * Lth;
  const ucDoor = wfin / wlim;

  const Mg = (Pg * Lth ** 2) / 8, Mq = (qq * Lth ** 2) / 8, MQ = (FQ * 1000 * Lth) / 4; // N·mm
  const Vg = (Pg * Lth) / 2, Vq = (qq * Lth) / 2, VQ = FQ * 1000; // N
  const MyEd = kfi * Math.max(1.2 * Mg + 1.5 * Mq, 1.2 * Mg + 1.5 * MQ);
  const VzEd = kfi * Math.max(1.2 * Vg + 1.5 * Vq, 1.2 * Vg + 1.5 * VQ);
  const ucBuig = MyEd / Wy / fmd;
  const ucAfsch = (VzEd * Sy) / (b * Iy) / fvd;
  // ── trillingen §7.3.3 — in SI: N, m, kg ───────────────────────────────────
  const Lm = Lth / 1000;                                  // overspanning [m]
  const EIb = (mat.E * 1e6 * (Iy * 1e-12)) / (hoh / 1000); // (EI)_b [Nm²/m]
  const EIl = (eBeschot * 1e6 * (1 * (tVloer / 1000) ** 3)) / 12; // (EI)_l [Nm²/m]
  const mOpp = (gk + gBalk / (hoh / 1000)) * 1000 / 9.81;  // massa [kg/m²], permanent
  const f1 = (Math.PI / (2 * Lm ** 2)) * Math.sqrt(EIb / mOpp);
  // Criterium 1 — stijfheid onder 1 kN (7.3): w/F ≤ a
  const wPerKN = ((1000 * kr) * Lth ** 3) / (48 * mat.E * Iy); // mm per kN
  const ucTrilA = wPerKN / aTril;
  // Criterium 2 — responssnelheid (7.4/7.6/7.7)
  const n40 = Math.pow(Math.max(0, (40 / f1) ** 2 - 1) * (bVloer / Lm) ** 4 * (EIl / EIb), 0.25);
  const vResp = (4 * (0.4 + 0.6 * n40)) / (mOpp * bVloer * Lm + 200);
  const vLim = Math.pow(bTril, f1 * zeta - 1);
  const ucTrilV = vResp / vLim;
  const ucTril = Math.max(ucTrilA, ucTrilV);

  const ucs = [ucBuig, ucAfsch];
  if (controleer === 1) ucs.push(ucDoor);
  if (tril === 1) ucs.push(ucTril);
  const ucMax = Math.max(...ucs);
  const ok = ucMax <= 1.0;

  // ── doorsnede-tekening — vult het gemeten tekengebied, gecentreerd ─────────
  // Eén uniforme fit-schaal: het beeld groeit/krimpt evenredig mee met het
  // paneel en blijft dimensioneel correct (x = y).
  const capH = 26;                                 // ruimte voor het onderschrift boven de stage
  const nJ = 4;
  const W = box.w, H = box.h - capH;               // stage vult het gebied
  const mX = 46, mTop = 26, mBot = 48;             // marges (px)
  const totalMM = (nJ - 1) * hoh + b;              // breedte van de balken-groep
  const availW = W - 2 * mX, availH = H - mTop - mBot;
  // grootste schaal die zowel de breedte als de hoogte (vloerhout + balk) laat passen
  const s = Math.min(availW / totalMM, availH / (tVloer + h));
  const jW = b * s, jH = h * s, sp = hoh * s, tV = Math.max(6, tVloer * s);
  const groupW = (nJ - 1) * sp + jW;               // getekende breedte van de balken
  const x0 = (W - groupW) / 2;                     // horizontaal gecentreerd
  const boardL = Math.min(mX, x0 - sp * 0.4), boardR = Math.max(W - mX, x0 + groupW + sp * 0.4);
  const blockH = tV + jH;
  const yBoard = mTop + Math.max(0, (availH - blockH) / 2);  // verticaal gecentreerd
  const yJoist = yBoard + tV;

  function Dim(props: { name: string; value: number; x: number; y: number; step?: number }) {
    const { name, value, x, y, step = 5 } = props;
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
          <button className="vd-dim-num" title={`${name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {Number.isInteger(value) ? value : value.toFixed(0)}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — balklaag</strong>
        <span className={`vd-uc ${ok ? "ok" : "bad"}`}>
          UC<sub>max</sub> = {ucMax.toFixed(2)} {ok ? "✓ voldoet" : "✗ voldoet niet"}
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Algemeen</span>
          <span className="vd-ctrl-h">Geometrie</span>
          <label>Profiel (b×h)
            <select value={profId} onChange={(e) => setVal("profiel", parseInt(e.target.value))}>
              {Object.entries(PROFILES).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
            </select>
          </label>
          <label>Dagmaat (mm)
            <input type="number" step={100} value={Ld} onChange={(e) => setVal("L_d", parseFloat(e.target.value))} />
          </label>
          <label>Opleglengte (mm)
            <input type="number" step={5} value={aOpl} onChange={(e) => setVal("a_opl", parseFloat(e.target.value))} />
          </label>
          <label>H.o.h. afstand (mm)
            <input type="number" step={10} value={hoh} onChange={(e) => setVal("hoh", parseFloat(e.target.value))} />
          </label>
          <label>Dikte vloerhout (mm)
            <input type="number" step={1} value={tVloer} onChange={(e) => setVal("t_vloer", parseFloat(e.target.value))} />
          </label>
          <label>E-modulus beschot (N/mm²)
            <input type="number" step={100} value={eBeschot} onChange={(e) => setVal("E_beschot", parseFloat(e.target.value))} />
          </label>
          <label>Breedte vloerveld (m)
            <input type="number" step={0.5} value={bVloer} onChange={(e) => setVal("b_vloer", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Materiaal</span>
          <label>Sterkteklasse
            <select value={matId} onChange={(e) => setVal("sterkteklasse", parseInt(e.target.value))}>
              {Object.entries(MATS).map(([id, mm]) => <option key={id} value={id}>{mm.name}</option>)}
            </select>
          </label>
          <label>Klimaatklasse
            <select value={klim} onChange={(e) => setVal("klimaat", parseInt(e.target.value))}>
              {KLIM.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
            </select>
          </label>
          <label>Belastingduurklasse
            <select value={duur} onChange={(e) => setVal("duurklasse", parseInt(e.target.value))}>
              {DUUR.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
            </select>
          </label>

          <span className="vd-ctrl-h">Belasting</span>
          <label>g<sub>k</sub> (kN/m²)
            <input type="number" step={0.1} value={gk} onChange={(e) => setVal("g_k", parseFloat(e.target.value))} />
          </label>
          <label>q<sub>k</sub> (kN/m²)
            <input type="number" step={0.5} value={qk} onChange={(e) => setVal("q_k", parseFloat(e.target.value))} />
          </label>
          <label>Q<sub>k</sub> (kN)
            <input type="number" step={0.5} value={Qk} onChange={(e) => setVal("Q_k", parseFloat(e.target.value))} />
          </label>
          <label>Categorie (ψ-waarden)
            <select value={cat} onChange={(e) => {
              const v = parseInt(e.target.value); setVal("belastingcat", v);
              if (v === 1) { setVal("ψ_0_zelf", 0); setVal("ψ_2_zelf", 0); }
              else if (v === 2) { setVal("ψ_0_zelf", 0.5); setVal("ψ_2_zelf", 0.3); }
            }}>
              {CAT.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
            </select>
          </label>
          {cat === 3 && (
            <>
              <label>ψ<sub>0</sub>
                <input type="number" step={0.1} value={psi0zelf} onChange={(e) => setVal("ψ_0_zelf", parseFloat(e.target.value))} />
              </label>
              <label>ψ<sub>2</sub>
                <input type="number" step={0.1} value={psi2zelf} onChange={(e) => setVal("ψ_2_zelf", parseFloat(e.target.value))} />
              </label>
            </>
          )}

          <span className="vd-ctrl-h">Doorbuiging</span>
          <label>Controleer doorbuiging
            <select value={controleer} onChange={(e) => setVal("controleer", parseInt(e.target.value))}>
              <option value={1}>Ja</option>
              <option value={0}>Nee</option>
            </select>
          </label>
          <label>Toelaatbare bijkomende doorbuiging
            <select value={grens} onChange={(e) => setVal("grensfactor", parseFloat(e.target.value))}>
              {GRENS.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
            </select>
          </label>

          <span className="vd-ctrl-h">Trilling (§7.3.3)</span>
          <label>Controleer trilling
            <select value={tril} onChange={(e) => setVal("controleer_trilling", parseInt(e.target.value))}>
              <option value={1}>Ja</option>
              <option value={0}>Nee</option>
            </select>
          </label>
          {tril === 1 && (
            <>
              <label>ζ — demping
                <input type="number" step={0.005} value={zeta} onChange={(e) => setVal("ζ", parseFloat(e.target.value))} />
              </label>
              <label>a (mm/kN)
                <input type="number" step={0.1} value={aTril} onChange={(e) => setVal("a_tril", parseFloat(e.target.value))} />
              </label>
              <label>b (—)
                <input type="number" step={5} value={bTril} onChange={(e) => setVal("b_tril", parseFloat(e.target.value))} />
              </label>
            </>
          )}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, justifyContent: "center", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                <defs>
                  <marker id="bdDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                    <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
                  </marker>
                </defs>
                {/* vloerhout */}
                <rect x={boardL} y={yBoard} width={boardR - boardL} height={tV} style={{ fill: "#D9B382", stroke: "#8B6F47", strokeWidth: 1.5 }} />
                {/* balken */}
                {Array.from({ length: nJ }, (_, i) => (
                  <rect key={i} x={x0 + i * sp} y={yJoist} width={jW} height={jH} style={{ fill: "#E3C08A", stroke: "#8B6F47", strokeWidth: 1.5 }} />
                ))}
                {/* hoh maatlijn tussen balk 1 en 2 */}
                <line x1={x0 + jW / 2} y1={yJoist + jH + 18} x2={x0 + sp + jW / 2} y2={yJoist + jH + 18} className="vd-dimmeasure" markerStart="url(#bdDim)" markerEnd="url(#bdDim)" />
                <line x1={x0 + jW / 2} y1={yJoist + jH} x2={x0 + jW / 2} y2={yJoist + jH + 22} className="vd-dimext" />
                <line x1={x0 + sp + jW / 2} y1={yJoist + jH} x2={x0 + sp + jW / 2} y2={yJoist + jH + 22} className="vd-dimext" />
              </svg>
              <Dim name="hoh" value={hoh} x={x0 + sp / 2 + jW / 2} y={yJoist + jH + 18} step={10} />
              <Dim name="t_vloer" value={tVloer} x={boardR - 26} y={yBoard + tV / 2} step={1} />
              <div className="vd-dim-ro" style={{ left: x0 + jW / 2, top: yJoist + jH / 2 }}>{b}×{h}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">
          {controleer === 1 ? `doorbuiging ${ucDoor.toFixed(2)} · ` : "doorbuiging n.v.t. · "}
          buiging {ucBuig.toFixed(2)} · afschuiving {ucAfsch.toFixed(2)}
          {tril === 1
            ? ` · trilling ${ucTril.toFixed(2)} (f₁ = ${f1.toFixed(1)} Hz)`
            : " · trilling n.v.t."}
        </span>
      </div>
    </div>
  );
}
