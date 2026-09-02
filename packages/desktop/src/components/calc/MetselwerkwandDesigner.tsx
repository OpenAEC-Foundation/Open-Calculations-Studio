import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useProjectCC, useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Parametrisch beeld van een dragende (ongewapende) metselwerkwand op druk,
 * volgens NEN-EN 1996-1-1 §6.1.2. Reproduceert het de referentie-uitwerking-invoerbeeld:
 * een vooraanzicht van de wand (ℓ × h) met N_Ed / N_Ed,max op de wandkop, en
 * een dwarsdoorsnede (t × h) met de momenten M_1Ed (kop), M_mEd (midden) en
 * M_2Ed (voet). Beide aanzichten staan op één uniforme schaal.
 *
 * De UC's in de kop en de voet zijn dezelfde toetsingen als in het rekenblad
 * (templates/metselwerkwand.ts, gecalibreerd op 9 de referentie-uitwerking-referenties):
 * slankheid §5.5.1.4, de reductiefactoren Φ aan kop/voet (6.4) — inclusief de
 * lage-belastingstak met begrensde e_i en restmoment ΔM — en op halve hoogte
 * via bijlage G, N_Rd = Φ·ℓ·t·f_d (6.2), plus de extra toets bij constante
 * minimale eerste-orde excentriciteit (ρ_2 = 1,00 met behoud van de verticale
 * randsteuning, getoetst op N_Ed,max en overgeslagen zodra de eerste toets al
 * niet voldoet).
 */
const MARKER = "Dragende metselwerkwand";

// ── randsteuning boven/onder → ρ_2 (EN 1996-1-1 §5.5.1.2) ──────────────────
// Betonvloer/-dak geeft ρ_2 = 0,75, hout ρ_2 = 1,0. Bij een oplegging aan één
// zijde geldt 0,75 alleen als de opleglengte ≥ ⅔·t en ≥ 85 mm is. Dezelfde vier
// opties (en volgorde) als de referentie-uitwerking.
const ONDERSTEUNING: { v: number; label: string; rho2: number; hint?: string }[] = [
  { v: 1, label: "wand met aan beide zijden betonvloer of -dak", rho2: 0.75 },
  { v: 2, label: "betonvloer of -dak opgelegd aan één zijde van de wand", rho2: 0.75, hint: "vereist opleglengte ≥ ⅔·t en ≥ 85 mm" },
  { v: 3, label: "wand met aan beide zijden houten vloer of dak", rho2: 1.0 },
  { v: 4, label: "houten vloer of dak opgelegd aan één zijde van de wand", rho2: 1.0 },
];
const RANDEN: { v: number; label: string }[] = [
  { v: 2, label: "2" }, { v: 3, label: "3" }, { v: 4, label: "4" },
];

// ── metselwerk (zelfde tabellen als OplegMetselwerkDesigner) ────────────────
// Het percentage is het holtepercentage → steengroep (≤25 % = groep 1, hoger =
// groep 2), dat de factor K bepaalt. `kwal` bepaalt hoe de sterkteklasse van de
// steen wordt aangeduid: f_b-waarden, CS-klassen of G-klassen.
// f_k = K·f_b^α·f_m^β. Metselmortel heeft altijd α = 0,65 en β = 0,25; bij
// lijmmortel verschillen K, α en β per steensoort. Tegen een referentie
// geverifieerd: kalkzandsteen<25%+metselmortel, baksteen<25%+lijmmortel
// (K=0,8 α=0,75 β=0,1) en cellenbeton<25%+lijmmortel (K=0,8 α=0,85 β=0). De
// overige lijmmortel-cellen volgen dat patroon (klei → 0,75/0,10, overig →
// 0,85/0) en zijn NIET geverifieerd.
interface Steen { name: string; Km: number; Kl: number; al: number; bl: number; kwal: "fb" | "CS" | "G" }
const STENEN: Record<number, Steen> = {
  1: { name: "Baksteen <25%", Km: 0.6, Kl: 0.80, al: 0.75, bl: 0.10, kwal: "fb" },
  2: { name: "Baksteen <55%", Km: 0.5, Kl: 0.70, al: 0.75, bl: 0.10, kwal: "fb" },
  3: { name: "Kalkzandsteen <25%", Km: 0.6, Kl: 0.80, al: 0.85, bl: 0, kwal: "CS" },
  4: { name: "Kalkzandsteen <55%", Km: 0.5, Kl: 0.70, al: 0.85, bl: 0, kwal: "CS" },
  5: { name: "Betonsteen <25%", Km: 0.6, Kl: 0.80, al: 0.85, bl: 0, kwal: "fb" },
  6: { name: "Betonsteen <60%", Km: 0.5, Kl: 0.70, al: 0.85, bl: 0, kwal: "fb" },
  7: { name: "Cellenbeton <25%", Km: 0.6, Kl: 0.80, al: 0.85, bl: 0, kwal: "G" },
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
// Steencategorie → basis-γ_M (CC2 = CC3 = basis; alleen CC1 verlaagt met 0,2).
// EN 771-1 t/m 6 kent alleen categorie I en II.
const CATEGORIE: { v: number; label: string; base: number }[] = [
  { v: 1, label: "I", base: 1.7 },
  { v: 2, label: "II", base: 2.2 },
];

/** Eén bron van waarheid voor de invoer — voedt de controls én de gedeelde store. */
// Defaults spiegelen het de referentie-uitwerking-invoerscherm: kalkzandsteen CS12, M15,
// categorie I, ℓ = 1000, h = 2800, t = 120, N_Ed = N_Ed,max = 200 kN.
const DEFAULTS: Record<string, number> = {
  ondersteuning: 1, n_rand: 2,
  l_w: 1000, h_w: 2800, t_w: 120, L_v: 3000,
  steencategorie: 1, steensoort: 3, morteltype: 1, f_b: 12, f_m: 15, phi_inf: 0,
  N_Ed: 200, N_Ed_max: 200, M_1Ed: 0, M_mEd: 0, M_2Ed: 0,
};

const LAMBDA_MAX = 27; // §5.5.1.4 — grens slankheid ongewapende wand
const K_E = 700;       // E = 700·f_k (NB:2018), teruggerekend uit de referenties

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
  const cat = CATEGORIE.find((c) => c.v === catId) ?? CATEGORIE[0];
  // Gevolgklasse komt van het project, niet van dit blad.
  const cc = useProjectCC();
  const morteltype = Math.round(d("morteltype"));
  const isLijm = morteltype === 2;
  const fb = d("f_b"), fmRaw = d("f_m"), phiInf = d("phi_inf");
  const N_Ed = d("N_Ed"), N_Ed_max = d("N_Ed_max");
  const M_1 = d("M_1Ed"), M_m = d("M_mEd"), M_2 = d("M_2Ed");

  // ── materiaal (EN 1996-1-1 §3.6.1, form. 3.2) ─────────────────────────────
  const gammaM = cat.base - (cc === 1 ? 0.2 : 0);
  const alpha = isLijm ? steen.al : 0.65;
  const betaExp = isLijm ? steen.bl : 0.25;
  const K = isLijm ? steen.Kl : steen.Km;
  const f_k = K * fb ** alpha * Math.min(fmRaw, 20) ** betaExp;
  const f_d = f_k / gammaM;
  const E_mw = K_E * f_k;

  // ── effectieve hoogte en slankheid (§5.5.1.2 / §5.5.1.4) ──────────────────
  // Een verticale randsteuning telt alleen mee zolang L_v < 15·t (n = 3) resp.
  // 30·t (n = 4); daarboven valt de wand terug op n = 2. ρ_3/ρ_4 rekenen met
  // L_v, de afstand tussen de stijve verticale randen — niet met ℓ.
  // ρ_2 = 0,75 mag alleen als de excentriciteit aan de kop niet groter is dan
  // 0,25·t (§5.5.1.2(4)); daarboven vervalt de inklemming → ρ_2 = 1,00.
  const N_min0 = Math.max(Math.abs(N_Ed), 0.001);
  const e_t0 = Math.abs((M_1 * 1e6) / (N_min0 * 1e3));
  const e_grens = 0.25 * t_w;
  const rho2 = e_t0 > e_grens ? 1.0 : ond.rho2;
  const nLim = n === 4 ? 30 * t_w : 15 * t_w;
  const nEff = n === 2 ? 2 : L_v >= nLim ? 2 : n;
  /** ρ_n volgens (5.3)-(5.6) voor een gegeven ρ_2. */
  const rhoN = (r2: number) =>
    nEff === 3
      ? h_w <= 3.5 * L_v
        ? r2 / (1 + ((r2 * h_w) / (3 * L_v)) ** 2)
        : (1.5 * L_v) / h_w
      : nEff === 4
        ? h_w <= 1.15 * L_v
          ? r2 / (1 + ((r2 * h_w) / L_v) ** 2)
          : (0.5 * L_v) / h_w
        : r2;
  const rho = rhoN(rho2);
  const h_ef = rho * h_w;
  const t_ef = t_w;                     // enkelvoudig blad: t_ef = t
  const lambda = h_ef / t_ef;
  const UC_lam = lambda / LAMBDA_MAX;
  const e_init = h_ef / 450;
  const fmt = (v: number, dec = 2) => v.toFixed(dec).replace(".", ",");

  // ── toetsing §6.1.2.2 + bijlage G (zelfde regels als templates/metselwerkwand.ts) ──
  const N_min = Math.max(N_Ed, 0.001);                 // kN — voorkomt deling door nul
  const A_wall = l_w * t_w;                            // mm²
  const NRd = (phi: number) => (phi * A_wall * f_d) / 1e3;   // kN
  const ecc = (M: number) => Math.abs((M * 1e6) / (N_min * 1e3)); // kNm/kN → mm

  // Bij N_Ed/(ℓ·t·f_d) ≤ 0,1 wordt e_i begrensd op wat nog binnen de doorsnede
  // past; het afgekapte deel komt als restmoment ΔM terug op halve hoogte.
  const ratioN = (N_Ed * 1e3) / (A_wall * f_d);
  const e_cap = t_w / 2 - (N_Ed * 1e3) / (2 * l_w * f_d);
  const cap = (ef: number) => (ratioN > 0.1 ? ef : Math.min(ef, e_cap));
  const e_itf = Math.max(ecc(M_1) + e_init, 0.05 * t_w);
  const e_ibf = Math.max(ecc(M_2) + e_init, 0.05 * t_w);
  const e_it = cap(e_itf), e_ib = cap(e_ibf);
  const dM_t = ((e_itf - e_it) * N_Ed) / 1e3;          // kNm
  const dM_b = ((e_ibf - e_ib) * N_Ed) / 1e3;
  const Phi_it = 1 - (2 * e_it) / t_w;
  const Phi_ib = 1 - (2 * e_ib) / t_w;

  const e_m = ecc(M_m + (dM_t + dM_b) / 2) + e_init;
  const e_k = 0.002 * phiInf * (h_ef / t_ef) * Math.sqrt(t_w * e_m);
  const e_mk = Math.max(e_m + e_k, 0.05 * t_ef);
  /** Φ volgens bijlage G (G.1)-(G.4). */
  const phiG = (hef: number, emk: number) => {
    const A1 = 1 - (2 * emk) / t_w;
    const lamF = (hef / t_ef) * Math.sqrt(f_k / E_mw);
    const u = (lamF - 0.063) / (0.73 - (1.17 * emk) / t_ef);
    return A1 * Math.exp(-(u * u) / 2);
  };
  const Phi_m = phiG(h_ef, e_mk);
  const N_Rd = Math.min(NRd(Phi_it), NRd(Phi_ib), NRd(Phi_m));
  const UC_1 = N_Rd > 0 ? N_Ed / N_Rd : 0;

  // Extra toets bij constante minimale eerste-orde excentriciteit: ρ_2 = 1,00,
  // maar een verticale randsteuning blijft meetellen. de referentie-uitwerking slaat deze
  // toets over zodra de vorige al niet voldoet.
  const h_ef2 = rhoN(1.0) * h_w;
  const e_m2 = Math.max(10, h_ef2 / 300);
  const minExc = UC_1 <= 1.0;
  const lambda2 = h_ef2 / t_ef;
  const e_mk2 = Math.max(e_m2 + e_k, 0.05 * t_w);
  const Phi_m2 = phiG(h_ef2, e_mk2);
  const N_Rdm2 = NRd(Phi_m2);
  const UC_2 = minExc && N_Rdm2 > 0 ? N_Ed_max / N_Rdm2 : 0;
  const UC_lam2 = minExc ? lambda2 / LAMBDA_MAX : 0;
  void e_m2;

  const UC_max = Math.max(UC_lam, UC_lam2, UC_1, UC_2);
  const ok = UC_max <= 1.0;

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
  function Force(props: { name: string; value: number; x: number; y: number; unit: string; label: string; step?: number; note?: string }) {
    const { name, value, x, y, unit, label, step = 10, note } = props;
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
        <path d="M5 0.5 L5 11.5" className="vd-dimarrow" />
      </marker>
      <marker id="mwLoad2" markerWidth="11" markerHeight="9" refX="9" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1 L9 4.5 L1 8 Z" className="vd-loadfill" />
      </marker>
    </defs>
  );

  const defs = (
    <defs>
      <marker id="mwDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M5 0.5 L5 11.5" className="vd-dimarrow" />
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
  const availW = EW - mL - mR, availH = EH - mT - mB;
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
      <div className="vd-head">
        <strong>Parametrisch beeld — dragende metselwerkwand</strong>
        <span className={`vd-uc ${ok ? "ok" : "bad"}`}>
          UC<sub>max</sub> = {fmt(UC_max, 2)} {ok ? "✓ voldoet" : "✗ voldoet niet"}
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Geometrie</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }} title={ond.hint ?? `ρ₂ = ${ond.rho2}`}>Ondersteuning
            <select style={{ width: "100%" }} value={ondId} onChange={(e) => setVal("ondersteuning", parseInt(e.target.value))}>
              {ONDERSTEUNING.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>n (ingeklemde randen)
            <span className="mw-radios">
              {RANDEN.map((o) => (
                <label key={o.v} title={o.v === 2 ? "boven + onder" : o.v === 3 ? "boven + onder + één verticale rand" : "boven + onder + twee verticale randen"}>
                  <input type="radio" name="n_rand" checked={n === o.v} onChange={() => setVal("n_rand", o.v)} />{o.label}
                </label>
              ))}
            </span>
          </label>
          <label>Wandlengte ℓ (mm)
            <input type="number" step={100} value={l_w} onChange={(e) => setVal("l_w", parseFloat(e.target.value))} />
          </label>
          <label>Wandhoogte h (mm)
            <input type="number" step={100} value={h_w} onChange={(e) => setVal("h_w", parseFloat(e.target.value))} />
          </label>
          <label>Wanddikte t (mm)
            <input type="number" step={10} value={t_w} onChange={(e) => setVal("t_w", parseFloat(e.target.value))} />
          </label>
          <label title={`Verticale randsteuning vervalt bij L_v ≥ ${nLim} mm → n = ${nEff}`}>Afstand gesteunde rand L<sub>v</sub> (mm)
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
          <label title="Eindkruipgetal voor e_k (6.7) — NB:2018 geeft 0">Eindkruipgetal φ<sub>∞</sub>
            <input type="number" step={0.1} value={phiInf} onChange={(e) => setVal("phi_inf", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Belasting</span>
          <label>N<sub>Ed</sub> (kN)
            <input type="number" step={10} value={N_Ed} onChange={(e) => setVal("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label>N<sub>Ed,max</sub> (kN)
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

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap, flexWrap: "nowrap", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
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
          n = {nEff}{nEff !== n ? ` (L_v ≥ ${nLim})` : ""} · ρ<sub>2</sub> = {fmt(rho2, 2)}
          {e_t0 > e_grens ? ` (e_t = ${fmt(e_t0, 1)} > 0,25t = ${fmt(e_grens, 1)} mm → inklemming vervalt)` : ""} ·
          ρ<sub>n</sub> = {fmt(rho, 3)} · h<sub>ef</sub> = {Math.round(h_ef)} mm ·
          λ = {fmt(lambda, 1)}/27 · f<sub>d</sub> = {fmt(f_d, 2)} N/mm² · e<sub>i,t</sub> = {fmt(e_it, 1)} · e<sub>mk</sub> = {fmt(e_mk, 1)} mm ·
          Φ<sub>i,t</sub> = {fmt(Phi_it, 3)} · Φ<sub>i,b</sub> = {fmt(Phi_ib, 3)} · Φ<sub>m</sub> = {fmt(Phi_m, 3)} ·
          N<sub>Rd</sub> = {fmt(N_Rd, 2)} kN · UC = {fmt(UC_1, 2)}
          {minExc ? ` · min.exc.: Φ_m2 = ${fmt(Phi_m2, 3)} · N_Rd,m2 = ${fmt(N_Rdm2, 2)} kN · UC = ${fmt(UC_2, 2)}` : ""}
          {ratioN <= 0.1 ? ` · lage-belastingstak (N_Ed/(ℓ·t·f_d) = ${fmt(ratioN, 3)} ≤ 0,1): e_cap = ${fmt(e_cap, 1)} mm` : ""}
        </span>
      </div>
    </div>
  );
}
