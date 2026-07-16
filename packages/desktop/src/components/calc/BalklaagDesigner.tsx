import { useEffect, useState } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { useLoadCaseStore } from "../../store/loadCaseStore";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Losstaand parametrisch beeld van een balklaag (doorsnede): vloerhout op
 * houten balken, hart-op-hart afstand. Leest/schrijft dezelfde invoer als de
 * rekensheet (balklaag.ts) via de loadCaseStore; de unity checks lopen live
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
  profiel: 10, sterkteklasse: 2, duurklasse: 2, klimaat: 1, eigengewicht: 0,
  gevolgklasse: 1.0, L_d: 5000, a_opl: 50, hoh: 450, t_vloer: 25,
  g_vloerplaat: 1.5, g_wanden: 0, g_plafond: 0, g_overig: 0,
  q_k: 1.0, Q_k: 2, belastingcat: 2, verplaatsbaar: 0,
  "ψ_0_zelf": 0.5, "ψ_2_zelf": 0.3, controleer: 1, grensfactor: 0.004,
};

export default function BalklaagDesigner() {
  const source = useDocumentStore((s) => s.source);
  const activeId = useLoadCaseStore((s) => s.activeId);
  const valuesByCase = useLoadCaseStore((s) => s.valuesByCase);
  const setActiveValue = useLoadCaseStore((s) => s.setActiveValue);
  const seedActiveValues = useLoadCaseStore((s) => s.seedActiveValues);
  const [editing, setEditing] = useState<string | null>(null);

  // Push the displayed defaults into the shared store on open / case switch, so
  // the rekensheet evaluates with the same inputs the picture shows. Only fills
  // missing keys — user-set values are never overwritten.
  const isBalklaag = source.includes(MARKER);
  useEffect(() => {
    if (!isBalklaag) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedActiveValues(seed);
  }, [isBalklaag, activeId, seedActiveValues]);

  if (!isBalklaag) return null;

  const vals = valuesByCase[activeId] ?? {};
  const num = (name: string, def: number): number => {
    const raw = vals[name];
    if (raw === undefined || raw === "") return def;
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };
  const setVal = (name: string, value: number) => setActiveValue(name, String(value));

  // ── invoer (defaults uit gedeelde DEFAULTS-bron, zie boven) ───────────────
  const d = (name: string) => num(name, DEFAULTS[name]);
  const profId = Math.round(d("profiel"));
  const prof = PROFILES[profId] ?? PROFILES[DEFAULTS.profiel];
  const matId = Math.round(d("sterkteklasse"));
  const mat = MATS[matId] ?? MATS[DEFAULTS.sterkteklasse];
  const duur = Math.round(d("duurklasse"));
  const klim = Math.round(d("klimaat"));
  const eig = Math.round(d("eigengewicht"));
  const kfi = d("gevolgklasse");
  const Ld = d("L_d");
  const aOpl = d("a_opl");
  const hoh = d("hoh");
  const tVloer = d("t_vloer");
  const gVloer = d("g_vloerplaat");
  const gWand = d("g_wanden");
  const gPlaf = d("g_plafond");
  const gOver = d("g_overig");
  const qk = d("q_k");
  const Qk = d("Q_k");
  const cat = Math.round(d("belastingcat"));
  const verpl = Math.round(d("verplaatsbaar"));
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
  const gk = gVloer + gPlaf + gOver + (verpl === 0 ? gWand : 0); // kN/m² permanent
  const qkEff = qk + (verpl === 1 ? gWand : 0); // verplaatsbare wanden → variabel
  const gBalk = (A * 1e-6 * (eig === 550 ? 550 : mat.rho) * 9.81) / 1000; // kN/m
  const Pg = (hoh / 1000) * gk + gBalk; // kN/m = N/mm
  const qq = (hoh / 1000) * qkEff; // N/mm
  const ug = (5 / 384) * (Pg * Lth ** 4) / (mat.E * Iy);
  const uq = (5 / 384) * (qq * Lth ** 4) / (mat.E * Iy);
  const kr = 0.37 + (0.8 * hoh) / 1000 - tVloer ** 3 / 85700;
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
  const ucMax = controleer === 1 ? Math.max(ucDoor, ucBuig, ucAfsch) : Math.max(ucBuig, ucAfsch);
  const ok = ucMax <= 1.0;

  // ── doorsnede-tekening op schaal ─────────────────────────────────────────
  const W = 520, H = 300, m = 70, nJ = 4;
  const totalMM = (nJ - 1) * hoh + b;
  const s = Math.min((W - 2 * m) / totalMM, 150 / h);
  const jW = b * s, jH = h * s, sp = hoh * s, tV = Math.max(8, tVloer * s);
  const x0 = (W - ((nJ - 1) * sp + jW)) / 2;
  const yBoard = 64, yJoist = yBoard + tV;

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

      <div className="vd-body">
        <div className="vd-controls vd-compact">
          <span className="vd-ctrl-h">Algemeen</span>
          <label>Gevolgklasse
            <select value={kfi} onChange={(e) => setVal("gevolgklasse", parseFloat(e.target.value))}>
              <option value={0.9}>CC1</option>
              <option value={1.0}>CC2</option>
              <option value={1.1}>CC3</option>
            </select>
          </label>
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
          <label>Duurklasse
            <select value={duur} onChange={(e) => setVal("duurklasse", parseInt(e.target.value))}>
              {DUUR.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
            </select>
          </label>
          <label>Eigengewicht
            <select value={eig} onChange={(e) => setVal("eigengewicht", parseInt(e.target.value))}>
              <option value={0}>EN 338</option>
              <option value={550}>Referentie</option>
            </select>
          </label>

          <span className="vd-ctrl-h">Permanente belasting (kN/m²)</span>
          <label>e.g. vloerplaat
            <input type="number" step={0.1} value={gVloer} onChange={(e) => setVal("g_vloerplaat", parseFloat(e.target.value))} />
          </label>
          <label>e.g. scheidingswanden
            <input type="number" step={0.1} value={gWand} onChange={(e) => setVal("g_wanden", parseFloat(e.target.value))} />
          </label>
          <label>Scheidingswanden verplaatsbaar
            <select value={verpl} onChange={(e) => setVal("verplaatsbaar", parseInt(e.target.value))}>
              <option value={0}>Nee (vast)</option>
              <option value={1}>Ja (verplaatsbaar)</option>
            </select>
          </label>
          <label>e.g. plafond
            <input type="number" step={0.1} value={gPlaf} onChange={(e) => setVal("g_plafond", parseFloat(e.target.value))} />
          </label>
          <label>overig
            <input type="number" step={0.1} value={gOver} onChange={(e) => setVal("g_overig", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Veranderlijke belasting</span>
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
        </div>

        <div className="vd-canvases">
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: W, height: H }}>
              <svg width={W} height={H} className="vd-svg">
                {/* vloerhout */}
                <rect x={20} y={yBoard} width={W - 40} height={tV} style={{ fill: "#D9B382", stroke: "#8B6F47", strokeWidth: 1.5 }} />
                {/* balken */}
                {Array.from({ length: nJ }, (_, i) => (
                  <rect key={i} x={x0 + i * sp} y={yJoist} width={jW} height={jH} style={{ fill: "#E3C08A", stroke: "#8B6F47", strokeWidth: 1.5 }} />
                ))}
                {/* hoh maatlijn tussen balk 1 en 2 */}
                <line x1={x0 + jW / 2} y1={yJoist + jH + 18} x2={x0 + sp + jW / 2} y2={yJoist + jH + 18} className="vd-dimmeasure" markerStart="url(#bdDim)" markerEnd="url(#bdDim)" />
                <line x1={x0 + jW / 2} y1={yJoist + jH} x2={x0 + jW / 2} y2={yJoist + jH + 22} className="vd-dimext" />
                <line x1={x0 + sp + jW / 2} y1={yJoist + jH} x2={x0 + sp + jW / 2} y2={yJoist + jH + 22} className="vd-dimext" />
                <defs>
                  <marker id="bdDim" markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                    <path d="M9 1 L1 4.5 L9 8" className="vd-dimarrow" />
                  </marker>
                </defs>
              </svg>
              <Dim name="hoh" value={hoh} x={x0 + sp / 2 + jW / 2} y={yJoist + jH + 18} step={10} />
              <Dim name="t_vloer" value={tVloer} x={W - 60} y={yBoard + tV / 2} step={1} />
              <div className="vd-dim-ro" style={{ left: x0 + jW / 2, top: yJoist + jH / 2 }}>{b}×{h}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">
          {controleer === 1 ? `doorbuiging ${ucDoor.toFixed(2)} · ` : "doorbuiging n.v.t. · "}buiging {ucBuig.toFixed(2)} · afschuiving {ucAfsch.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
