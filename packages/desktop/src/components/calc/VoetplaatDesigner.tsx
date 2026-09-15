import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een voetplaatverbinding (kolomvoet), opgezet volgens
 * dezelfde structuur als de overige modules: één DEFAULTS-bron die de gedeelde
 * store seedt, een ResizeObserver zodat het beeld met het paneel meegroeit,
 * klikbare maten en krachten, en een live UC in de kop.
 *
 * Twee aanzichten onder elkaar met één gedeelde horizontale schaal en
 * x-uitlijning, zodat de ankers in het vooraanzicht recht boven die in het
 * bovenaanzicht staan:
 *   • Vooraanzicht — snede over de plaatlengte d_p: kolom met hoeklas, voetplaat
 *     t_p, ondersabeling t_g, fundatieblok h_b en de ankers tot h_ef.
 *   • Bovenaanzicht — voetplaat d_p × b_p met het profiel en de ankerposities,
 *     die volgen uit de randafstanden e_d en e_b.
 *
 * NB: dit is de visuele herbouw. De rekensheet (voetplaatverbinding.ts) hangt
 * nog aan het oude geometriemodel (c_rand / d_extra / layout); die wordt
 * hierna gelijkgetrokken zodra het invoermodel vaststaat.
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

const STAAL: { v: number; label: string }[] = [
  { v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" },
];
const BETON: { v: number; label: string }[] = [
  { v: 20, label: "C20/25" }, { v: 25, label: "C25/30" }, { v: 30, label: "C30/37" },
  { v: 35, label: "C35/45" }, { v: 40, label: "C40/50" }, { v: 45, label: "C45/55" },
  { v: 50, label: "C50/60" },
];
const ANKERS: { v: number; label: string }[] = [
  { v: 12, label: "M 12" }, { v: 16, label: "M 16" }, { v: 20, label: "M 20" },
  { v: 24, label: "M 24" }, { v: 30, label: "M 30" }, { v: 36, label: "M 36" },
];
const KWALITEIT: { v: number; label: string }[] = [
  { v: 4.6, label: "4.6" }, { v: 5.6, label: "5.6" }, { v: 8.8, label: "8.8" }, { v: 10.9, label: "10.9" },
];
/**
 * Ankeropzetten. `pos` geeft de hartposities in mm t.o.v. het plaatmidden;
 * xE/yE zijn de buitenste hartlijnen (plaathelft minus randafstand). Elke opzet
 * krijgt een pictogram in de picker, net als in de referentie-uitwerking.
 */
/**
 * Ankeropzetten. Coordinaten in mm t.o.v. het plaatmidden; x loopt langs d_p
 * (de profielhoogte h), y langs b_p (de profielbreedte b). In de plattegrond
 * ligt de H met de flenzen verticaal en het lijf horizontaal, dus de twee
 * "gaten" van de H zitten boven en onder het lijf, tussen de flenzen in.
 *
 * `flush` = de voetplaat steekt in de d-richting niet buiten het profiel uit;
 * d_p wordt dan afgekapt op de profielhoogte.
 */
interface AnkGeo { xE: number; yE: number; h: number; b: number; tf: number; tw: number }
interface Opzet {
  v: number; n: number; label: string; hint: string; flush?: boolean;
  pos: (g: AnkGeo) => [number, number][];
}
/** Hart van een gat van de H: tussen de lijfzijde en de flenstip. */
const yGat = (g: AnkGeo) => (g.tw / 2 + g.b / 2) / 2;
/** Binnenzijde van de flens, en een positie er net naast. */
const xBinnen = (g: AnkGeo) => Math.max(0, g.h / 2 - g.tf);
const xNaast = (g: AnkGeo) => Math.max(0, xBinnen(g) - 55);
/** Vier hoeken van de plaat. */
const hoeken = (g: AnkGeo): [number, number][] =>
  [[-g.xE, g.yE], [g.xE, g.yE], [-g.xE, -g.yE], [g.xE, -g.yE]];

const ANKEROPZET: Opzet[] = [
  { v: 1, n: 2, label: "2 ankers", flush: true,
    hint: "plaat gelijk met het profiel; 2 ankers in de gaten van de H",
    pos: (g) => [[0, yGat(g)], [0, -yGat(g)]] },
  { v: 2, n: 4, label: "4 ankers",
    hint: "normale plaat, 4 ankers in de hoeken",
    pos: (g) => hoeken(g) },
  { v: 3, n: 6, label: "6 ankers",
    hint: "4 in de hoeken + 2 tussen de flenzen, op dezelfde as als de hoeken",
    pos: (g) => [...hoeken(g), [0, g.yE], [0, -g.yE]] },
  { v: 4, n: 6, label: "6 ankers",
    hint: "als 3, maar de middelste ankers richting de linkerflens",
    pos: (g) => [...hoeken(g), [-xNaast(g), g.yE], [-xNaast(g), -g.yE]] },
  { v: 5, n: 6, label: "6 ankers",
    hint: "als 3, maar de middelste ankers richting de rechterflens",
    pos: (g) => [...hoeken(g), [xNaast(g), g.yE], [xNaast(g), -g.yE]] },
  { v: 6, n: 4, label: "4 ankers", flush: true,
    hint: "plaat gelijk met het profiel; 4 ankers in de gaten van de H",
    pos: (g) => {
      const xh = xBinnen(g) / 2, yg = yGat(g);
      return [[-xh, yg], [xh, yg], [-xh, -yg], [xh, -yg]];
    } },
];

/**
 * Ligging van de voetplaat op het fundatieblok. Bepaalt welke betonranden
 * dichtbij liggen en dus meetellen bij de kegelbreuk-toetsen.
 */
const POSITIE: { v: number; label: string; randen: number }[] = [
  { v: 1, label: "Midden — geen rand", randen: 0 },
  { v: 2, label: "1 rand", randen: 1 },
  { v: 3, label: "2 randen — hoek", randen: 2 },
  { v: 4, label: "2 randen — tegenover elkaar", randen: 2 },
  { v: 5, label: "3 randen", randen: 3 },
  { v: 6, label: "4 randen — alzijdig", randen: 4 },
];
const VERANKERING: { v: number; label: string }[] = [
  { v: 1, label: "vloeigrens" }, { v: 2, label: "trekspanning" },
];
const STATISCH: { v: number; label: string }[] = [
  { v: 1, label: "statisch bepaald" }, { v: 2, label: "statisch onbepaald" },
];

/** Eén bron van waarheid voor de invoer — voedt de controls én de gedeelde store. */
// Defaults spiegelen het de referentie-uitwerking-invoerscherm: HEB300 S235, hoeklas 6,
// 4× M24-8.8, plaat 460 × 380 × 25, ondersabeling 30, fundatie 300, h_ef 200,
// C25/30, N_Ed = 300 kN.
const DEFAULTS: Record<string, number> = {
  profile: 11, staalsoort: 235, hoeklas: 6,
  t_p: 25, d_p: 460, b_p: 380,
  ank_opzet: 2, d_anker: 24, kwaliteit: 8.8, e_d: 40, e_b: 40, h_ef: 200,
  gatspeling: 1, n_afschuiving: 2, wrijving: 1, verankering: 1,
  t_g: 30, betonklasse: 25, h_b: 300, c_min: 30, positie: 1, gescheurd: 1,
  N_Ed: 300, V_Ed: 0, M_Ed: 0, statisch: 1,
};

// Maten die alleen het beeld opzetten — geen invoer.
const H_KOLOM = 420;     // mm — getoonde kolomlengte boven de voetplaat
const OVERSTEK = 90;     // mm — getoonde fundatie-oversteek naast de voetplaat

export default function VoetplaatDesigner() {
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
  const [box, setBox] = useState({ w: 720, h: 760 });

  const isVoetplaat = source.includes(MARKER);
  useEffect(() => {
    if (!isVoetplaat) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isVoetplaat, activeId, seedBladWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(240, r.width), h: Math.max(340, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isVoetplaat]);

  if (!isVoetplaat) return null;

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
  const profileId = Math.round(d("profile"));
  const prof = PROFILES[profileId] ?? PROFILES[11];
  const fy = Math.round(d("staalsoort"));
  const a_las = Math.max(0, d("hoeklas"));
  const t_p = Math.max(1, d("t_p"));
  const b_p = Math.max(prof.b, d("b_p"));
  const opzetId = Math.round(d("ank_opzet"));
  const opzet = ANKEROPZET.find((o) => o.v === opzetId) ?? ANKEROPZET[1];
  // Bij een flush-opzet steekt de plaat niet buiten het profiel uit.
  const d_p = opzet.flush ? Math.min(d("d_p"), prof.h) : Math.max(prof.h, d("d_p"));
  const gatspeling = Math.round(d("gatspeling"));
  const n_afsch = Math.round(d("n_afschuiving"));
  const wrijving = Math.round(d("wrijving"));
  const verankering = Math.round(d("verankering"));
  const gescheurd = Math.round(d("gescheurd"));
  const statisch = Math.round(d("statisch"));
  const d_anker = d("d_anker");
  const kwal = d("kwaliteit");
  const e_d = Math.max(1, d("e_d"));
  const e_b = Math.max(1, d("e_b"));
  const h_ef = Math.max(1, d("h_ef"));
  const t_g = Math.max(0, d("t_g"));
  const fck = Math.round(d("betonklasse"));
  const h_b = Math.max(1, d("h_b"));
  const c_min = d("c_min");
  const positie = Math.round(d("positie"));
  const N_Ed = d("N_Ed"), V_Ed = d("V_Ed"), M_Ed = d("M_Ed");

  // ── ankerposities (mm t.o.v. plaatmidden) ─────────────────────────────────
  // Buitenste kolommen op e_d van de plaatrand, daartussen gelijk verdeeld;
  // rijen op e_b van de rand. De maatvoering volgt dus rechtstreeks uit e_d/e_b.
  const xEnd = d_p / 2 - e_d, yEnd = b_p / 2 - e_b;
  const ankGeo: AnkGeo = { xE: xEnd, yE: yEnd, h: prof.h, b: prof.b, tf: prof.tf, tw: prof.tw };
  const anchors = opzet.pos(ankGeo);
  const nAnk = opzet.n;
  // Unieke x-hartlijnen — die tekenen we in het vooraanzicht.
  const colsX = [...new Set(anchors.map((a) => a[0]))].sort((a, b) => a - b);
  const rijenY = [...new Set(anchors.map((a) => a[1]))].sort((a, b) => b - a);

  // ── live drukweerstand (spiegelt voetplaatverbinding.ts §8) ───────────────
  const A_c0 = b_p * d_p;
  const A_c1 = Math.min(b_p + h_b, 3 * b_p) * Math.min(d_p + h_b, 3 * d_p);
  const k_j = Math.min(3, Math.sqrt(A_c1 / A_c0));
  const f_cd = fck / 1.5;
  const f_jd = (2 / 3) * k_j * f_cd;
  const cc = t_p * Math.sqrt(fy / (3 * f_jd));
  // Naar buiten kan de drukprent niet verder dan het plaatoverstek c_p reiken.
  const c_p = (d_p - prof.h) / 2;
  const A_pr_f = (prof.tf + cc + Math.min(cc, c_p)) * Math.min(prof.b + 2 * cc, b_p);
  const A_pr_w = (prof.tw + 2 * cc) * Math.max(0, prof.h - 2 * prof.tf - 2 * cc);
  const A_prent = 2 * A_pr_f + A_pr_w;
  const N_Rd = (f_jd * A_prent) / 1000; // kN
  const UC_druk = N_Rd > 0 ? N_Ed / N_Rd : 0;
  const ok = UC_druk <= 1.0;
  const fmt = (v: number, dec = 0) => v.toFixed(dec).replace(".", ",");

  // ── klikbare chips ────────────────────────────────────────────────────────
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
          <button className="vd-dim-num" style={{ whiteSpace: "nowrap" }} title={`${label ?? name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {label ? `${label}=` : ""}{Number.isInteger(value) ? value : value.toFixed(0)}
          </button>
        )}
      </div>
    );
  }
  function Force(props: { name: string; value: number; x: number; y: number; unit: string; label: string; step?: number }) {
    const { name, value, x, y, unit, label, step = 10 } = props;
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
  /**
   * Pictogram van een ankeropzet: voetplaat, H-profiel en de ankerposities,
   * op de werkelijke verhoudingen van de huidige plaat.
   */
  function OpzetIcon({ o }: { o: Opzet }) {
    const w = 62, h = 46, m = 5;
    const dpi = o.flush ? Math.min(d("d_p"), prof.h) : Math.max(prof.h, d("d_p"));
    const gi: AnkGeo = { xE: dpi / 2 - e_d, yE: yEnd, h: prof.h, b: prof.b, tf: prof.tf, tw: prof.tw };
    const si = Math.min((w - 2 * m) / Math.max(dpi, d_p), (h - 2 * m) / b_p);
    const cxi = w / 2, cyi = h / 2;
    const pw = dpi * si, ph = b_p * si;
    const iw = prof.h * si, ih = prof.b * si;
    const itf = Math.max(1.5, prof.tf * si), itw = Math.max(1.5, prof.tw * si);
    return (
      <svg width={w} height={h}>
        <rect x={cxi - pw / 2} y={cyi - ph / 2} width={pw} height={ph} fill="#eef3fb" stroke="#1e40af" strokeWidth={1} />
        <rect x={cxi - iw / 2} y={cyi - ih / 2} width={itf} height={ih} fill="#3b82f6" />
        <rect x={cxi + iw / 2 - itf} y={cyi - ih / 2} width={itf} height={ih} fill="#3b82f6" />
        <rect x={cxi - iw / 2} y={cyi - itw / 2} width={iw} height={itw} fill="#3b82f6" />
        {o.pos(gi).map(([mx, my], i) => (
          <g key={i}>
            <circle cx={cxi + mx * si} cy={cyi - my * si} r={2.1} fill="#fff" stroke="#1e40af" strokeWidth={1} />
            <line x1={cxi + mx * si - 3.2} y1={cyi - my * si} x2={cxi + mx * si + 3.2} y2={cyi - my * si} stroke="#1e40af" strokeWidth={0.7} />
            <line x1={cxi + mx * si} y1={cyi - my * si - 3.2} x2={cxi + mx * si} y2={cyi - my * si + 3.2} stroke="#1e40af" strokeWidth={0.7} />
          </g>
        ))}
      </svg>
    );
  }

  /** Afgeleide maat — grijs, niet klikbaar. */
  const Ro = (p: { text: string; x: number; y: number; title?: string }) => (
    <div className="vd-dim-ro" style={{ left: p.x, top: p.y, color: "#6b7280" }} title={p.title}>{p.text}</div>
  );

  const defs = (k: string) => (
    <defs>
      <marker id={`vpDim${k}`} markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
      </marker>
      <marker id={`vpLoad${k}`} markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1 L9 4.5 L1 8 Z" className="vd-loadfill" />
      </marker>
      <linearGradient id={`vpBeton${k}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dcdee2" />
        <stop offset="100%" stopColor="#a9adb4" />
      </linearGradient>
    </defs>
  );

  // ── layout: aanzichten onder elkaar, één gedeelde horizontale schaal ──────
  const capH = 26, gap = 14;
  const fndMM = d_p + 2 * OVERSTEK;                      // breedte fundatie [mm]
  const elevHMM = H_KOLOM + t_p + t_g + h_b;             // hoogte vooraanzicht [mm]
  const planHMM = b_p + 2 * OVERSTEK;                    // hoogte bovenaanzicht [mm]
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const W = box.w;
  // De marges moeten de maatkolommen kunnen herbergen: links t_p/h_ef, rechts
  // t_g/h_b. Een chip is ~25 px halfbreed, de maatlijn staat 24-28 px uit de rand.
  const mL = clamp(W * 0.13, 56, 86), mR = clamp(W * 0.11, 52, 76);
  const availW = W - mL - mR;
  const totH = Math.max(200, box.h - 2 * capH - gap);
  const EH = (totH * elevHMM) / (elevHMM + planHMM);     // hoogte naar rato van de mm
  const PH = totH - EH;
  // mT moet de N-pijl én het bijschrift erboven kunnen herbergen.
  const mT = clamp(EH * 0.12, 46, 62), mB = clamp(EH * 0.12, 30, 52);
  const pT = clamp(PH * 0.08, 16, 30), pB = clamp(PH * 0.12, 26, 44);
  // Eén horizontale schaal voor beide aanzichten → de ankers lijnen uit.
  const s = Math.min(
    availW / fndMM,
    (EH - mT - mB) / elevHMM,
    (PH - pT - pB) / planHMM,
  );
  const cx = mL + availW / 2;                            // hart, gedeeld
  const xF0 = cx - (fndMM * s) / 2, xF1 = cx + (fndMM * s) / 2;
  const xP0 = cx - (d_p * s) / 2, xP1 = cx + (d_p * s) / 2;

  // vooraanzicht (y)
  const yTopE = mT + Math.max(0, (EH - mT - mB - elevHMM * s) / 2);
  const yPlate = yTopE + H_KOLOM * s;                    // bovenkant voetplaat
  const yPlateB = yPlate + t_p * s;                      // onderkant voetplaat
  const yGroutB = yPlateB + t_g * s;                     // bovenkant beton
  const yFndB = yGroutB + h_b * s;                       // onderkant fundatie
  const yAncB = yGroutB + h_ef * s;                      // ankerkop op h_ef
  const colW = prof.h * s, xC0 = cx - colW / 2, xC1 = cx + colW / 2;
  const tfPx = Math.max(2, prof.tf * s), twPx = Math.max(2, prof.tw * s);
  const dAnkPx = Math.max(2.5, d_anker * s * 0.8);   // getekende schachtdikte
  const boutR = Math.max(3, dAnkPx * 0.55);          // straal in de plattegrond
  const lasPx = Math.max(3, a_las * s * 1.5);
  // Momentboog: boven de ankermoeren, zodat hij er niet doorheen loopt.
  const momR = Math.max(16, Math.min(colW * 0.3, 34));
  const yMom = yPlate - Math.max(3, dAnkPx * 0.45) - Math.max(4, dAnkPx * 0.95) - 16;

  // bovenaanzicht (y) — eigen verticale positie, zelfde schaal s
  const yTopP = pT + Math.max(0, (PH - pT - pB - planHMM * s) / 2);
  const cyP = yTopP + (planHMM * s) / 2;
  const yPl0 = cyP - (b_p * s) / 2, yPl1 = cyP + (b_p * s) / 2;
  const yFn0 = cyP - (planHMM * s) / 2, yFn1 = cyP + (planHMM * s) / 2;
  const hW = prof.h * s, hH = prof.b * s;
  const px = (mx: number) => cx + mx * s;
  const py = (my: number) => cyP - my * s;

  /**
   * Maatketen: plaatrand → elke ankerhartlijn → plaatrand. De segmenten worden
   * gemeten uit de werkelijke posities, want bij de opzetten in de gaten van de
   * H liggen de ankers niet op de randafstand. Het segment dat exact gelijk is
   * aan e_d/e_b blijft klikbaar; de rest is een afgeleide (grijze) maat.
   */
  const keten = (rand: number, hartlijnen: number[], randAfstand: number) => {
    const pts = [-rand, ...[...hartlijnen].sort((a, b) => a - b), rand];
    return pts.slice(0, -1).map((p0, i) => {
      const p1 = pts[i + 1];
      const lengte = p1 - p0;
      return { p0, p1, mid: (p0 + p1) / 2, lengte, isRand: Math.abs(lengte - randAfstand) < 0.5 };
    });
  };
  const ketenE = keten(d_p / 2, colsX, e_d);
  const ketenP = keten(b_p / 2, rijenY, e_b);

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — voetplaatverbinding</strong>
        <span className={`vd-uc ${ok ? "ok" : "bad"}`}>
          UC<sub>druk</sub> = {fmt(UC_druk, 2)} {ok ? "✓ voldoet" : "✗ voldoet niet"}
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Kolom</span>
          <label>Profiel
            <select value={profileId} onChange={(e) => setVal("profile", parseInt(e.target.value))}>
              {Object.entries(PROFILES).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
            </select>
          </label>
          <label>Staalsoort
            <select value={fy} onChange={(e) => setVal("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Hoeklas a (mm)
            <input type="number" step={1} value={a_las} onChange={(e) => setVal("hoeklas", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Voetplaat (mm)</span>
          <label>Dikte t<sub>p</sub>
            <input type="number" step={5} value={t_p} onChange={(e) => setVal("t_p", parseFloat(e.target.value))} />
          </label>
          <label title={opzet.flush
            ? "Deze ankeropzet vraagt een plaat die niet buiten het profiel uitsteekt; d_p is afgekapt op de profielhoogte"
            : "Plaatmaat in de richting van de profielhoogte h"}>Lengte d<sub>p</sub>
            <input type="number" step={10} value={d_p} onChange={(e) => setVal("d_p", parseFloat(e.target.value))} />
          </label>
          {opzet.flush && (
            <span className="gd-note">Deze opzet houdt de plaat binnen het profiel: d<sub>p</sub> ≤ h = {fmt(prof.h)} mm.</span>
          )}
          <label title="Plaatmaat in de richting van de profielbreedte b">Breedte b<sub>p</sub>
            <input type="number" step={10} value={b_p} onChange={(e) => setVal("b_p", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Ankers</span>
          <div className="vd-layouts" style={{ padding: 0, border: "none" }}>
            <div className="vd-layouts-row">
              {ANKEROPZET.map((o) => (
                <button key={o.v} type="button" title={o.hint}
                  className={`vd-layout-thumb ${o.v === opzetId ? "active" : ""}`}
                  onClick={() => setVal("ank_opzet", o.v)}>
                  <span className="vd-layout-num">{o.n}</span>
                  <OpzetIcon o={o} />
                </button>
              ))}
            </div>
            <div className="vd-layouts-active">{opzet.n} ankers — {opzet.hint}</div>
          </div>
          <label>Maat
            <select value={d_anker} onChange={(e) => setVal("d_anker", parseFloat(e.target.value))}>
              {ANKERS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Kwaliteit
            <select value={kwal} onChange={(e) => setVal("kwaliteit", parseFloat(e.target.value))}>
              {KWALITEIT.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label title="Randafstand in de richting van d_p">Randafstand e<sub>d</sub>
            <input type="number" step={5} value={e_d} onChange={(e) => setVal("e_d", parseFloat(e.target.value))} />
          </label>
          <label title="Randafstand in de richting van b_p">Randafstand e<sub>b</sub>
            <input type="number" step={5} value={e_b} onChange={(e) => setVal("e_b", parseFloat(e.target.value))} />
          </label>
          <label>Verankeringsdiepte h<sub>ef</sub>
            <input type="number" step={10} value={h_ef} onChange={(e) => setVal("h_ef", parseFloat(e.target.value))} />
          </label>
          <label className="gd-chk" title="Normale gatspeling volgens EN 1090-2; anders vergrote gaten">
            <input type="checkbox" checked={gatspeling === 1} onChange={(e) => setVal("gatspeling", e.target.checked ? 1 : 0)} />
            normale gatspeling
          </label>
          <label>Bouten op afschuiving
            <input type="number" step={1} min={0} value={n_afsch} onChange={(e) => setVal("n_afschuiving", parseFloat(e.target.value))} />
          </label>
          <label className="gd-chk" title="Wrijving tussen voetplaat en ondersabeling meerekenen bij de afschuifweerstand">
            <input type="checkbox" checked={wrijving === 1} onChange={(e) => setVal("wrijving", e.target.checked ? 1 : 0)} />
            wrijvingsweerstand
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Verankeringslengte baseren op
            <span className="mw-radios">
              {VERANKERING.map((o) => (
                <label key={o.v}>
                  <input type="radio" name="vp_verankering" checked={verankering === o.v} onChange={() => setVal("verankering", o.v)} />{o.label}
                </label>
              ))}
            </span>
          </label>

          <span className="vd-ctrl-h">Beton</span>
          <label>Sterkteklasse
            <select value={fck} onChange={(e) => setVal("betonklasse", parseInt(e.target.value))}>
              {BETON.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Ondersabeling t<sub>g</sub>
            <input type="number" step={5} value={t_g} onChange={(e) => setVal("t_g", parseFloat(e.target.value))} />
          </label>
          <label>Fundatiehoogte h<sub>b</sub>
            <input type="number" step={25} value={h_b} onChange={(e) => setVal("h_b", parseFloat(e.target.value))} />
          </label>
          <label>Dekking c<sub>min</sub>
            <input type="number" step={5} value={c_min} onChange={(e) => setVal("c_min", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="Welke betonranden liggen dicht bij de ankers — bepaalt de kegelbreuk-toetsen">Positie op het fundatieblok
            <select style={{ width: "100%" }} value={positie} onChange={(e) => setVal("positie", parseInt(e.target.value))}>
              {POSITIE.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label className="gd-chk" title="Gescheurd beton — maatgevend voor de verankeringstoetsen">
            <input type="checkbox" checked={gescheurd === 1} onChange={(e) => setVal("gescheurd", e.target.checked ? 1 : 0)} />
            gescheurd beton
          </label>

          <span className="vd-ctrl-h">Belasting</span>
          <label>N<sub>Ed</sub> (kN)
            <input type="number" step={10} value={N_Ed} onChange={(e) => setVal("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label>V<sub>Ed</sub> (kN)
            <input type="number" step={10} value={V_Ed} onChange={(e) => setVal("V_Ed", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>Ed</sub> (kNm)
            <input type="number" step={5} value={M_Ed} onChange={(e) => setVal("M_Ed", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="Bij een statisch onbepaalde constructie mag herverdeling worden meegenomen">Constructie
            <select style={{ width: "100%" }} value={statisch} onChange={(e) => setVal("statisch", parseInt(e.target.value))}>
              {STATISCH.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Vooraanzicht</div>
            <div className="vd-stage" style={{ width: W, height: EH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={EH} className="vd-svg">
                {defs("E")}

                {/* fundatieblok */}
                <rect x={xF0} y={yGroutB} width={fndMM * s} height={h_b * s} fill="url(#vpBetonE)" stroke="#6b7280" strokeWidth={1.2} />
                {/* ondersabeling, met afschuining naar de plaatrand */}
                <path d={`M ${xP0} ${yPlateB} L ${xP1} ${yPlateB} L ${xP1 + t_g * s} ${yGroutB} L ${xP0 - t_g * s} ${yGroutB} Z`}
                  fill="#c9ccd2" stroke="#6b7280" strokeWidth={1.1} />
                {/* voetplaat */}
                <rect x={xP0} y={yPlate} width={d_p * s} height={t_p * s} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.4} />

                {/* kolom — flenzen aan weerszijden zichtbaar */}
                <rect x={xC0} y={yTopE} width={colW} height={H_KOLOM * s} fill="#eaf1fb" stroke="#1e40af" strokeWidth={1.4} />
                <line x1={xC0 + tfPx} y1={yTopE} x2={xC0 + tfPx} y2={yPlate} stroke="#1e40af" strokeWidth={0.9} />
                <line x1={xC1 - tfPx} y1={yTopE} x2={xC1 - tfPx} y2={yPlate} stroke="#1e40af" strokeWidth={0.9} />
                {/* hoeklas a aan weerszijden van de kolomvoet */}
                <path d={`M ${xC0} ${yPlate - lasPx} L ${xC0} ${yPlate} L ${xC0 - lasPx} ${yPlate} Z`} fill="#1e40af" opacity={0.5} />
                <path d={`M ${xC1} ${yPlate - lasPx} L ${xC1} ${yPlate} L ${xC1 + lasPx} ${yPlate} Z`} fill="#1e40af" opacity={0.5} />

                {/* ankers — sluitring op de plaat, zeskantmoer, draadstang met
                    draadaanduiding, en een ankerplaat op h_ef */}
                {colsX.map((mx, i) => {
                  const ax = px(mx);
                  const rw = dAnkPx * 1.9, rh = Math.max(2.5, dAnkPx * 0.45);   // sluitring
                  const nw = dAnkPx * 1.55, nh = Math.max(4, dAnkPx * 0.95);    // moer
                  const yRing = yPlate - rh, yNut = yRing - nh;
                  const aw = dAnkPx * 2.4, ah = Math.max(4, dAnkPx * 0.8);      // ankerplaat
                  const nDraad = Math.max(2, Math.round(nh / 2));
                  return (
                    <g key={i}>
                      {/* hartlijn */}
                      <line x1={ax} y1={yNut - 12} x2={ax} y2={yFndB + 12} stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="8 3 2 3" />
                      {/* draadstang */}
                      <rect x={ax - dAnkPx / 2} y={yNut} width={dAnkPx} height={yAncB - yNut} fill="#e8eaee" stroke="#4b5563" strokeWidth={1} />
                      {/* draadaanduiding op het vrije deel boven de plaat */}
                      {Array.from({ length: nDraad }, (_, k) => (
                        <line key={k} x1={ax - dAnkPx / 2} y1={yNut + 2 + k * 2.6} x2={ax + dAnkPx / 2} y2={yNut + 2 + k * 2.6}
                          stroke="#9aa1ab" strokeWidth={0.5} />
                      ))}
                      {/* zeskantmoer: vlak met twee ribben */}
                      <rect x={ax - nw / 2} y={yNut} width={nw} height={nh} fill="#f4f5f7" stroke="#374151" strokeWidth={1.1} />
                      <line x1={ax - nw / 2} y1={yNut + nh / 3} x2={ax + nw / 2} y2={yNut + nh / 3} stroke="#9aa1ab" strokeWidth={0.6} />
                      <line x1={ax - nw / 2} y1={yNut + (2 * nh) / 3} x2={ax + nw / 2} y2={yNut + (2 * nh) / 3} stroke="#9aa1ab" strokeWidth={0.6} />
                      {/* sluitring op de voetplaat */}
                      <rect x={ax - rw / 2} y={yRing} width={rw} height={rh} fill="#dfe2e7" stroke="#374151" strokeWidth={1} />
                      {/* ankerplaat op de verankeringsdiepte */}
                      <rect x={ax - aw / 2} y={yAncB - ah} width={aw} height={ah} fill="#eceef1" stroke="#374151" strokeWidth={1.1} />
                    </g>
                  );
                })}

                {/* belasting */}
                <line x1={cx} y1={yTopE - 28} x2={cx} y2={yTopE - 2} className="vd-load" strokeWidth={3.5} markerEnd="url(#vpLoadE)" />
                {/* dwarskracht op de kolomvoet — altijd getekend, ook bij nul */}
                <line x1={xP0 - 66} y1={yPlate - 16} x2={xP0 - 6} y2={yPlate - 16} className="vd-load" strokeWidth={3} markerEnd="url(#vpLoadE)" />
                {/* moment om de kolomvoet — altijd getekend, ook bij nul */}
                <path d={`M ${cx - momR} ${yMom} A ${momR} ${momR} 0 1 1 ${cx + momR} ${yMom}`}
                  fill="none" stroke="#dc2626" strokeWidth={2.4} markerEnd="url(#vpLoadE)" />

                {/* maatlijnen */}
                <line x1={xP0 - 28} y1={yPlate} x2={xP0 - 28} y2={yPlateB} className="vd-dimmeasure" markerStart="url(#vpDimE)" markerEnd="url(#vpDimE)" />
                <line x1={xF1 + 24} y1={yPlateB} x2={xF1 + 24} y2={yGroutB} className="vd-dimmeasure" markerStart="url(#vpDimE)" markerEnd="url(#vpDimE)" />
                <line x1={xF1 + 24} y1={yGroutB} x2={xF1 + 24} y2={yFndB} className="vd-dimmeasure" markerStart="url(#vpDimE)" markerEnd="url(#vpDimE)" />
                <line x1={xP0 - 28} y1={yGroutB} x2={xP0 - 28} y2={yAncB} className="vd-dimmeasure" markerStart="url(#vpDimE)" markerEnd="url(#vpDimE)" />
                {/* maatketen onder: plaatrand → elke ankerhartlijn → plaatrand */}
                {ketenE.map((k, i) => (
                  <line key={i} x1={px(k.p0)} y1={yFndB + 28} x2={px(k.p1)} y2={yFndB + 28}
                    className="vd-dimmeasure" markerStart="url(#vpDimE)" markerEnd="url(#vpDimE)" />
                ))}
                {colsX.map((mx, i) => (
                  <line key={i} x1={px(mx)} y1={yFndB} x2={px(mx)} y2={yFndB + 34} className="vd-dimext" />
                ))}
              </svg>

              <Force name="N_Ed" value={N_Ed} x={cx + 52} y={yTopE - 32} unit="kN" label="N_Ed" />
              <Force name="V_Ed" value={V_Ed} x={xP0 - 48} y={yPlate - 32} unit="kN" label="V_Ed" />
              <Force name="M_Ed" value={M_Ed} x={cx + momR + 46} y={yMom - 8} unit="kNm" label="M_Ed" step={5} />
              <Dim name="t_p" value={t_p} x={xP0 - 28} y={yPlate + (t_p * s) / 2} step={5} label="tp" />
              <Dim name="t_g" value={t_g} x={xF1 + 24} y={(yPlateB + yGroutB) / 2} step={5} label="tg" />
              <Dim name="h_b" value={h_b} x={xF1 + 24} y={(yGroutB + yFndB) / 2} step={25} label="hb" />
              <Dim name="h_ef" value={h_ef} x={xP0 - 28} y={(yGroutB + yAncB) / 2} step={10} label="hef" />
              {ketenE.map((k, i) => k.isRand
                ? <Dim key={i} name="e_d" value={e_d} x={px(k.mid)} y={yFndB + 28} step={5} />
                : <Ro key={i} text={fmt(k.lengte)} x={px(k.mid)} y={yFndB + 28} title="gemeten uit de ankerposities" />)}
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Bovenaanzicht</div>
            <div className="vd-stage" style={{ width: W, height: PH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={PH} className="vd-svg">
                {defs("P")}

                {/* fundatieblok */}
                <rect x={xF0} y={yFn0} width={fndMM * s} height={planHMM * s} fill="#cfd2d7" stroke="#6b7280" strokeWidth={1.1} strokeDasharray="9 5" />
                {/* voetplaat */}
                <rect x={xP0} y={yPl0} width={d_p * s} height={b_p * s} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.4} />

                {/* profiel — H liggend: flenzen verticaal, lijf horizontaal */}
                <rect x={cx - hW / 2} y={cyP - hH / 2} width={tfPx} height={hH} fill="#3b82f6" stroke="#1e40af" strokeWidth={1.1} />
                <rect x={cx + hW / 2 - tfPx} y={cyP - hH / 2} width={tfPx} height={hH} fill="#3b82f6" stroke="#1e40af" strokeWidth={1.1} />
                <rect x={cx - hW / 2 + tfPx} y={cyP - twPx / 2} width={hW - 2 * tfPx} height={twPx} fill="#3b82f6" stroke="#1e40af" strokeWidth={1.1} />

                {/* ankers */}
                {anchors.map(([mx, my], i) => (
                  <g key={i}>
                    <circle cx={px(mx)} cy={py(my)} r={boutR} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.2} />
                    <line x1={px(mx) - boutR * 1.6} y1={py(my)} x2={px(mx) + boutR * 1.6} y2={py(my)} stroke="#1e40af" strokeWidth={0.8} />
                    <line x1={px(mx)} y1={py(my) - boutR * 1.6} x2={px(mx)} y2={py(my) + boutR * 1.6} stroke="#1e40af" strokeWidth={0.8} />
                  </g>
                ))}

                {/* maatlijnen: e_b — h.o.h. — e_b links, b_p rechts, d_p onder */}
                {ketenP.map((k, i) => (
                  <line key={i} x1={xP0 - 28} y1={py(k.p0)} x2={xP0 - 28} y2={py(k.p1)}
                    className="vd-dimmeasure" markerStart="url(#vpDimP)" markerEnd="url(#vpDimP)" />
                ))}
                {rijenY.map((my, i) => (
                  <line key={i} x1={xP0 - 34} y1={py(my)} x2={xP0 - 4} y2={py(my)} className="vd-dimext" />
                ))}
                <line x1={xP1 + 26} y1={yPl0} x2={xP1 + 26} y2={yPl1} className="vd-dimmeasure" markerStart="url(#vpDimP)" markerEnd="url(#vpDimP)" />
                <line x1={xP0} y1={yFn1 + 24} x2={xP1} y2={yFn1 + 24} className="vd-dimmeasure" markerStart="url(#vpDimP)" markerEnd="url(#vpDimP)" />
              </svg>

              {ketenP.map((k, i) => k.isRand
                ? <Dim key={i} name="e_b" value={e_b} x={xP0 - 28} y={py(k.mid)} step={5} />
                : <Ro key={i} text={fmt(k.lengte)} x={xP0 - 28} y={py(k.mid)} title="gemeten uit de ankerposities" />)}
              <Dim name="b_p" value={b_p} x={xP1 + 26} y={cyP} step={10} label="bp" />
              <Dim name="d_p" value={d_p} x={cx} y={yFn1 + 24} step={10} label="dp" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />Beide aanzichten delen één horizontale schaal, dus de ankers staan recht boven elkaar.</span>
        <span className="vd-live">
          {prof.name} S{fy} · a = {fmt(a_las)} · plaat {fmt(d_p)}×{fmt(b_p)}×{fmt(t_p)} · {nAnk}× M{fmt(d_anker)}–{kwal} ·
          h.o.h. {fmt(2 * xEnd)}×{fmt(2 * yEnd)} · {POSITIE.find((o) => o.v === positie)?.randen}× rand ·
          {gescheurd === 1 ? " gescheurd ·" : " ongescheurd ·"}{wrijving === 1 ? " met wrijving ·" : ""} {n_afsch} op afschuiving ·
          C{fck} · k<sub>j</sub> = {fmt(k_j, 2)} ·
          f<sub>jd</sub> = {fmt(f_jd, 2)} N/mm² · A<sub>prent</sub> = {fmt(A_prent)} mm² · N<sub>Rd</sub> = {fmt(N_Rd)} kN
        </span>
      </div>
    </div>
  );
}
