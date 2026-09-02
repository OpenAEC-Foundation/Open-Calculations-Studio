import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useProjectGetal, useProjectKFI, useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Parametrisch beeld van een houten dakgording (gording) volgens NEN-EN 1995-1-1.
 * Doorsnede-aanzicht van het dakvlak (schuin of plat) met de gordingen als
 * loodrechte blokken op het dakvlak, hoek α, en de maatlijnen l, h, daklengte
 * en de h.o.h.-afstand van de gordingen. Zelfde stijl als de andere designers
 * (transparant, verticale scheidingslijn, streepjes-maatlijnen zonder pijlen,
 * responsief via ResizeObserver, gecentreerd, uniforme fit-schaal).
 *
 * NB: dit is (voorlopig) alleen het visueel — de rekenregels volgen nog.
 */
const MARKER = "Gording";

const DAK: { v: number; label: string }[] = [
  { v: 1, label: "Plat dak" }, { v: 2, label: "Schuin dak" },
];
// Gording-profielen (b × h in mm)
const PROF: { v: number; label: string; b: number; h: number }[] = [
  { v: 1, label: "58 × 150", b: 58, h: 150 },
  { v: 2, label: "71 × 171", b: 71, h: 171 },
  { v: 3, label: "71 × 196", b: 71, h: 196 },
  { v: 4, label: "85 × 220", b: 85, h: 220 },
  { v: 5, label: "85 × 250", b: 85, h: 250 },
  { v: 6, label: "100 × 250", b: 100, h: 250 },
  { v: 7, label: "100 × 300", b: 100, h: 300 },
];
const STERKTE: { v: number; label: string }[] = [
  { v: 1, label: "C18" }, { v: 2, label: "C24" }, { v: 3, label: "C30" },
];
// EN 338 karakteristiek — f_m,k, f_v,k, E_mean [N/mm²]
const MAT: Record<number, { fmk: number; fvk: number; E: number }> = {
  1: { fmk: 18, fvk: 3.4, E: 9000 },
  2: { fmk: 24, fvk: 4.0, E: 11000 },
  3: { fmk: 30, fvk: 4.0, E: 12000 },
};
const KLIMAAT: { v: number; label: string }[] = [
  { v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" },
];
// Windgebied NL (NEN-EN 1991-1-4 NB Tabel NB.1) — v_b0
const WINDGEBIED: { v: number; label: string; vb0: number }[] = [
  { v: 1, label: "I — Kust", vb0: 29.5 }, { v: 2, label: "II", vb0: 27.0 }, { v: 3, label: "III — Overig", vb0: 24.5 },
];
// Terreincategorie (NB Tabel NB.3) — z0, z_min
const TERREIN: { v: number; label: string; z0: number; zmin: number }[] = [
  { v: 1, label: "0 — Zee/kust", z0: 0.005, zmin: 1 },
  { v: 2, label: "II — Onbebouwd", z0: 0.2, zmin: 4 },
  { v: 3, label: "III — Bebouwd", z0: 0.5, zmin: 7 },
];
const GRENS: { v: number; label: string }[] = [
  { v: 0.004, label: "0,004 × L" }, { v: 0.003, label: "0,003 × L" }, { v: 0.002, label: "0,002 × L" },
];

const DEFAULTS: Record<string, number> = {
  dakType: 2, profiel: 5, L_dag: 5000, a_opl: 75, n_gording: 3,
  t_beschot: 18, I_manual: 0, I_beschot: 486000, E_beschot: 5000,
  sterkteklasse: 2, klimaatklasse: 1, l_h: 4500, h_v: 3000,
  g_pannen: 0.4, g_panlat: 0.04, g_dakplaat: 0.09899, g_plafond: 0.2, q_par: 1,
  varType: 1, Q_k: 2, q_var: 0,
  s_k: 0.70, sk_manual: 0, mu1_val: 0.702, mu1_manual: 0,
  z_wind: 9, windbron: 1, q_wind_hand: 0,
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

  // Windgebied en terreincategorie volgen uit de locatie van het project; de
  // referentiehoogte z_wind hoort wél bij dit constructiedeel.
  const windgebied = useProjectGetal("windgebied", 2);
  const terreincategorie = useProjectGetal("terreincategorie", 2);
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

  // Het rekenblad rekent q_p sinds backlogpunt 1 zélf uit windgebied,
  // terreincategorie en z_wind; de designer schreef hier vroeger een uitgerekende
  // q_wind naar de store, en dat is nu dood gewicht — het blad zou hem overschrijven.
  // De keten hieronder blijft bestaan voor het beeld in deze pane en is dezelfde
  // als die in gording.ts; scripts/check-gording.mjs (wind1 t/m wind7) bewaakt hem.

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
  const Ibeschot = Imanual === 1 ? d("I_beschot") : Iauto;
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
  // Gevolgklasse komt van het project, niet van dit blad.
  const KFI = useProjectKFI();
  const varType = Math.round(d("varType"));
  const Qk = d("Q_k"), qVar = d("q_var");
  const skManual = Math.round(d("sk_manual"));
  const skAuto = 0.70;                                  // NL uniforme grondwaarde (NEN-EN 1991-1-3 NB)
  const sk = skManual === 1 ? d("s_k") : skAuto;
  const mu1Manual = Math.round(d("mu1_manual"));
  const Cpe = 0.70, Cpi = -0.30;                        // vaste NB-waarden (zone F-G-H) → netto 1,0
  const wg = WINDGEBIED.find((w) => w.v === Math.round(windgebied)) ?? WINDGEBIED[1];
  const tc = TERREIN.find((t) => t.v === Math.round(terreincategorie)) ?? TERREIN[1];
  const zWind = d("z_wind");
  // Extreme stuwdruk q_p (NEN-EN 1991-1-4 NB) — reproduceert de referentie-uitwerking exact
  const vb = wg.vb0;                                    // c_dir=c_season=1
  const rhoLucht = 1.25;
  const zEff = Math.max(zWind, tc.zmin);
  const krWind = 0.19 * (tc.z0 / 0.05) ** 0.07;
  const cr = krWind * Math.log(zEff / tc.z0);
  const vm = cr * vb;                                   // c_o=1
  const Iv = 1 / Math.log(zEff / tc.z0);               // k_l=1, c_o=1
  const qpWind = ((1 + 7 * Iv) * 0.5 * rhoLucht * vm ** 2) / 1000;  // [kN/m²]

  // ── afgeleide geometrie ───────────────────────────────────────────────────
  const alpha = dakType === 1 ? 0 : Math.atan2(hV, lH);  // rad
  const alphaDeg = (alpha * 180) / Math.PI;
  const ca = Math.cos(alpha), sa = Math.sin(alpha);
  const slopeLen = Math.hypot(lH, hV);                   // daklengte [mm]
  const hohSlope = slopeLen / (nG + 1);                  // h.o.h. langs dakvlak

  // ── rekenregels (EN 1995-1-1) — gecalibreerd op de referentie-uitwerking (Set 1/2/3, exact) ──
  const mat = MAT[sterkte] ?? MAT[2];
  const gammaM = 1.30, km = 0.7;
  const kmod = klim === 3 ? 0.70 : 0.90;                 // duurklasse Kort (wind/sneeuw)
  const kdef = klim === 1 ? 0.60 : klim === 2 ? 0.80 : 2.00;
  const bP = prof.b, hP = prof.h;                        // b = zwakke-as-dikte, h = sterke-as-hoogte
  const A = bP * hP;
  const Iy = (bP * hP ** 3) / 12, Iz = (hP * bP ** 3) / 12;
  const Wy = Iy / (hP / 2), Wz = Iz / (bP / 2);
  const Sy = (bP * hP ** 2) / 8, Sz = (hP * bP ** 2) / 8;
  const kh = (dep: number) => (dep < 150 ? Math.min((150 / dep) ** 0.2, 1.3) : 1.0);
  const fmyd = (kmod * mat.fmk * kh(hP)) / gammaM;       // sterke as (diepte h)
  const fmzd = (kmod * mat.fmk * kh(bP)) / gammaM;       // zwakke as (diepte b)
  const fvd = (kmod * mat.fvk) / gammaM;
  const Emod = mat.E;
  const gG = (A * 5.5) / 1e6;                            // eigengewicht [kN/m] (550 kg/m³ · g=10)

  const slopeM = slopeLen / 1000, hohM = hohSlope / 1000;
  const Lth = L_dag + a_opl, LthM = Lth / 1000;          // theoretische overspanning [mm]/[m]

  // belastingsgeval 1 — permanent (⊥ = sterke as, ∥ = zwakke as)
  const PgPerp = Pgk * ca, PgPar = Pgk * sa;
  const PgParTot = slopeM * PgPar + nG * gG * sa;
  const PgParG = (PgParTot - qPar) / nG;                 // ∥ per gording (na ontlasting q∥)
  const PgPerpG = hohM * PgPerp + gG * ca;               // ⊥ per gording (incl. eigengewicht)
  const line = (q: number, I: number) => ({
    M: (q * LthM ** 2) / 8, V: (q * LthM) / 2, u: (5 / 384) * q * Lth ** 4 / (Emod * I),
  });
  const gPerp = line(PgPerpG, Iy), gPar = line(PgParG, Iz);

  // belastingsgeval 2 — veranderlijk: geconcentreerd Q_k (k_r kapt op 1,0; dakbeschot via 3e term)
  // of verdeeld q_k (op grondvlak, zoals sneeuw). Keuze via varType.
  const kr = Math.min(1, 0.37 + (0.8 * hohM) / 1.0 - (Ebeschot * Ibeschot) / 1e6 / 50000);
  const FQperp = Qk * ca * kr, FQpar = Qk * sa * kr;
  const pt = (F: number, I: number) => ({
    M: (F * LthM) / 4, V: F / kr, u: (1 / 48) * F * 1e3 * Lth ** 3 / (Emod * I),
  });
  const Qc_perp = pt(FQperp, Iy), Qc_par = pt(FQpar, Iz);
  Qc_perp.V = Qk * ca; Qc_par.V = Qk * sa;               // dwarskracht = volle puntlast-component
  const qv = hohM * qVar * ca;                           // verdeeld: verticale lijnlast [kN/m]
  const Qd_perp = line(qv * ca, Iy), Qd_par = line(qv * sa, Iz);
  const QPerp = varType === 2 ? Qd_perp : Qc_perp;       // actieve veranderlijke
  const QPar = varType === 2 ? Qd_par : Qc_par;

  // belastingsgeval 3 — sneeuw (μ1 uit dakhelling; per grondvlak → dakvlak)
  const mu1Auto = alphaDeg <= 30 ? 0.8 : alphaDeg >= 60 ? 0 : (0.8 * (60 - alphaDeg)) / 30;
  const mu1 = mu1Manual === 1 ? d("mu1_val") : mu1Auto;
  const Psn = mu1 * sk;
  const qsn = hohM * Psn * ca;                           // verticale lijnlast [kN/m]
  const snPerp = line(qsn * ca, Iy), snPar = line(qsn * sa, Iz);

  // belastingsgeval 4 — wind (alleen ⊥ op dakvlak)
  const Pw = (Cpe - Cpi) * qpWind;
  const qw = hohM * Pw;
  const wPerp = line(qw, Iy);

  // BGT — doorbuiging per richting (ψ2 = 0 voor dak/wind/sneeuw)
  const uVarPerp = Math.max(QPerp.u, snPerp.u, wPerp.u);
  const uVarPar = Math.max(QPar.u, snPar.u);
  const wfy = (1 + kdef) * gPerp.u + uVarPerp;
  const wfz = (1 + kdef) * gPar.u + uVarPar;
  const wlim = grens * Lth;
  const UC_wy = controleer === 1 ? wfy / wlim : 0;
  const UC_wz = controleer === 1 && dubbele === 1 ? wfz / wlim : 0;

  // UGT — 3 combinaties (permanent + één leidende veranderlijke), factoren γ·K_FI
  const gG_ = 1.2 * KFI, gQ_ = 1.5 * KFI;
  const combo = (vPerp: { M: number; V: number }, vPar: { M: number; V: number }) => ({
    My: gG_ * gPerp.M + gQ_ * vPerp.M, Mz: gG_ * gPar.M + gQ_ * vPar.M,
    Vz: gG_ * gPerp.V + gQ_ * vPerp.V, Vy: gG_ * gPar.V + gQ_ * vPar.V,
  });
  const zero = { M: 0, V: 0 };
  const combos = [combo(QPerp, QPar), combo(snPerp, snPar), combo(wPerp, zero)];
  const uc611 = (c: { My: number; Mz: number }) => (c.My * 1e6) / Wy / fmyd + (km * (c.Mz * 1e6)) / Wz / fmzd;
  const uc612 = (c: { My: number; Mz: number }) => (km * (c.My * 1e6)) / Wy / fmyd + (c.Mz * 1e6) / Wz / fmzd;
  const shear = (c: { Vz: number; Vy: number }) => {
    const ty = (c.Vz * 1e3 * Sy) / (bP * Iy), tz = (c.Vy * 1e3 * Sz) / (hP * Iz);
    return Math.hypot(ty, tz) / fvd;
  };
  const factorPar = dubbele === 1 ? 1 : 0;              // zonder dubbele buiging: alleen sterke as
  const UC_611 = Math.max(...combos.map((c) => (c.My * 1e6) / Wy / fmyd + factorPar * (km * (c.Mz * 1e6)) / Wz / fmzd));
  const UC_612 = dubbele === 1 ? Math.max(...combos.map(uc612)) : 0;
  const UC_shear = Math.max(...combos.map(shear));
  const UC_max = Math.max(UC_611, UC_612, UC_shear, UC_wy, UC_wz);
  const ok = UC_max <= 1.0;
  void uc611;

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
      <div className="vd-head">
        <strong>Parametrisch beeld — gording</strong>
        <span className={`vd-uc ${ok ? "ok" : "bad"}`}>
          UC<sub>max</sub> = {fmt(UC_max, 2)} {ok ? "✓ voldoet" : "✗ voldoet niet"}
        </span>
      </div>

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
          <label>Opleglengte (mm)
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
                <label style={{ gap: 6 }}>
                  <span className="gd-chk">
                    <input type="checkbox" checked={varType === 2} onChange={(e) => setVal("varType", e.target.checked ? 2 : 1)} />
                    Verdeeld q<sub>k</sub> (kN/m²)
                  </span>
                  <input type="number" step={0.1} value={qVar} disabled={varType !== 2} onChange={(e) => setVal("q_var", parseFloat(e.target.value))} />
                </label>
                <label>Q<sub>k</sub> geconcentreerd (kN)
                  <input type="number" step={0.5} value={Qk} disabled={varType === 2} onChange={(e) => setVal("Q_k", parseFloat(e.target.value))} />
                </label>
                <div className="gd-note">Aanvinken = verdeelde last q<sub>k</sub>; anders geconcentreerde last Q<sub>k</sub>.</div>
              </>
            )}
            {loadTab === 2 && (
              <>
                <label>Hoogte boven maaiveld (m)
                  <input type="number" step={0.5} value={zWind} onChange={(e) => setVal("z_wind", parseFloat(e.target.value))} />
                </label>
                <label>Extreme stuwdruk q<sub>p</sub> (kN/m²)
                  <input type="number" value={+qpWind.toFixed(3)} disabled />
                </label>
                <div className="gd-note">C<sub>pe</sub> = 0,70 (zone F-G-H), C<sub>pi</sub> = −0,30 — vaste NB-waarden.</div>
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
                  <input type="number" step={0.05} value={skManual === 1 ? d("s_k") : skAuto} disabled={skManual !== 1} onChange={(e) => setVal("s_k", parseFloat(e.target.value))} />
                </label>
                <label style={{ gap: 6 }}>
                  <span className="gd-chk">
                    <input type="checkbox" checked={mu1Manual === 1} onChange={(e) => setVal("mu1_manual", e.target.checked ? 1 : 0)} />
                    Vormcoëfficiënt μ<sub>1</sub>
                  </span>
                  <input type="number" step={0.01} value={mu1Manual === 1 ? d("mu1_val") : +mu1Auto.toFixed(3)} disabled={mu1Manual !== 1} onChange={(e) => setVal("mu1_val", parseFloat(e.target.value))} />
                </label>
              </>
            )}
          </div>
          <label>q∥ (kN/m)
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

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, justifyContent: "center", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Dwarsdoorsnede dakvlak &amp; gordingen</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                <defs>
                  <marker id="grDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                    <path d="M5 0.5 L5 11.5" className="vd-dimarrow" />
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
          α = {fmt(alphaDeg, 1)}° · daklengte {Math.round(slopeLen)} mm · h.o.h. {Math.round(hohSlope)} mm · buiging (6.11) {fmt(UC_611, 2)} · (6.12) {fmt(UC_612, 2)} · afschuiving {fmt(UC_shear, 2)} · doorbuiging w<sub>y</sub> {fmt(UC_wy, 2)} · w<sub>z</sub> {fmt(UC_wz, 2)}
        </span>
      </div>
    </div>
  );
}
