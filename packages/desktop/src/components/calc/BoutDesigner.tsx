import { useDesigner, Dim, Ro, Defs, loadMark, HDim, VDim, fmt, clamp } from "./designerKit";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld en toetsing van één bout volgens NEN-EN 1993-1-8 tabel 3.4.
 *
 * Twee aanzichten van een overlapverbinding, met één gedeelde horizontale
 * schaal zodat de bouten in de doorsnede recht onder die in het bovenaanzicht
 * staan. Plaat A loopt links door en eindigt rechts, plaat B andersom; de
 * krachten trekken ze uit elkaar, zodat e₁ aan beide einden de eindafstand in
 * de krachtsrichting is.
 *   • Bovenaanzicht — zeskantkoppen op sluitringen, het gat gestippeld,
 *     hartlijnen door de rijen en kolommen. Tabel 3.4 kent twee onafhankelijke
 *     assen: de positie in de krachtsrichting (eind- of binnenste bout) bepaalt
 *     α_d, de positie loodrecht daarop (rand- of binnenste bout) bepaalt k₁. De
 *     gekozen combinatie is gemarkeerd.
 *   • Doorsnede — de platen gearceerd, de bout in aanzicht met kop, sluitringen
 *     en moer op ISO-maten. De draad staat met het ISO-symbool (kerndiameter en
 *     draadeinde): of het afschuifvlak door de draad of door de schacht gaat,
 *     bepaalt of met A_s of met A gerekend wordt.
 *
 * De weerstanden in de kop en de voet zijn dezelfde toetsing als in het
 * rekenblad — zie templates/boutberekening.ts, dat op zes referentiebladen is
 * gecalibreerd. Wijkt hier iets af, dan lopen de twee uit de pas.
 */
const MARKER = "Boutberekening";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const KWAL = [
  { v: 46, label: "4.6" }, { v: 48, label: "4.8" }, { v: 56, label: "5.6" },
  { v: 58, label: "5.8" }, { v: 68, label: "6.8" }, { v: 88, label: "8.8" },
  { v: 109, label: "10.9" },
];
const MAAT = [12, 16, 20, 24, 27, 30, 36];
/** Gatdiameter d₀ volgens EN 1090-2 (normale gatspeling). */
const GAT: Record<number, number> = { 12: 13, 16: 18, 20: 22, 24: 26, 27: 30, 30: 33, 36: 39 };
/** Spanningsoppervlak van de draad A_s volgens ISO 898-1 [mm²]. */
const AS: Record<number, number> = { 12: 84.3, 16: 157, 20: 245, 24: 353, 27: 459, 30: 561, 36: 817 };
/** Sleutelwijdte s over de platte kanten (ISO 4014/4032) [mm]. */
const SW: Record<number, number> = { 12: 18, 16: 24, 20: 30, 24: 36, 27: 41, 30: 46, 36: 55 };
/** Maat e over de hoeken (ISO 4014/4032) [mm] — tevens de kopmaat in de tekening. */
const EW: Record<number, number> = { 12: 20.03, 16: 26.75, 20: 32.95, 24: 39.55, 27: 45.2, 30: 50.85, 36: 60.79 };
/** Kophoogte k (ISO 4014) [mm]. */
const KOP: Record<number, number> = { 12: 7.5, 16: 10, 20: 12.5, 24: 15, 27: 17, 30: 18.7, 36: 22.5 };
/** Moerhoogte m (ISO 4032) [mm]. */
const MOER: Record<number, number> = { 12: 10.8, 16: 14.8, 20: 18, 24: 21.5, 27: 23.8, 30: 25.6, 36: 31 };
/** Sluitring (ISO 7089): buitenmiddellijn en dikte [mm]. */
const RING: Record<number, [number, number]> = {
  12: [24, 2.5], 16: [30, 3], 20: [37, 3], 24: [44, 4], 27: [50, 4], 30: [56, 4], 36: [66, 5],
};
/** Treksterkte van het boutmateriaal f_ub [N/mm²] — tabel 3.1. */
const FUB: Record<number, number> = { 46: 400, 48: 400, 56: 500, 58: 500, 68: 600, 88: 800, 109: 1000 };
/** α_v bij een afschuifvlak door de draad — 0,6 voor 4.6/5.6/8.8, anders 0,5 (tabel 3.4). */
const AV: Record<number, number> = { 46: 0.6, 48: 0.5, 56: 0.6, 58: 0.5, 68: 0.5, 88: 0.6, 109: 0.5 };
/** Treksterkte plaatmateriaal f_u [N/mm²] — NB bij NEN-EN 1993-1-1, t ≤ 40 mm. */
const FU: Record<number, number> = { 235: 360, 275: 430, 355: 490 };

const γ_M2 = 1.25;
const k_2 = 0.9;

const DEFAULTS: Record<string, number> = {
  staalsoort: 235, boutkwaliteit: 88, boutdiameter: 16,
  afschuifvlak: 1, boutpositie: 1, randpositie: 1,
  t_plaat: 20, e_1: 30, p_1: 80, e_2: 25, p_2: 60,
  n_v: 1, F_v_Ed: 0, F_t_Ed: 0, overlaptype: 1,
};

/** Zeskant met de platte kanten boven en onder, in bovenaanzicht. */
function zeskant(cx: number, cy: number, rHoek: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${cx + rHoek * Math.cos(a)},${cy + rHoek * Math.sin(a)}`;
  }).join(" ");
}

/** Verticale breuklijn: een zigzag in het midden, zoals op een werktekening. */
function breukPad(x: number, y0: number, y1: number, links: boolean): string {
  const m = (y0 + y1) / 2, a = Math.min(5, (y1 - y0) * 0.14), r = links ? -a : a;
  return `L ${x} ${y0} L ${x} ${m - 2 * a} L ${x + r} ${m - a} L ${x - r} ${m + a} L ${x} ${m + 2 * a} L ${x} ${y1}`;
}

/**
 * Kop of moer in zijaanzicht: breedte over de hoeken, twee ribben op een kwart,
 * en een afschuining aan de vrije kant.
 */
function Zeskantaanzicht(props: { ax: number; y: number; breedte: number; hoogte: number; afschuining: "boven" | "onder" }) {
  const { ax, y, breedte, hoogte, afschuining } = props;
  const xL = ax - breedte / 2, xR = ax + breedte / 2, c = Math.min(hoogte * 0.2, breedte * 0.08);
  const punten = afschuining === "boven"
    ? `${xL},${y + c} ${xL + c},${y} ${xR - c},${y} ${xR},${y + c} ${xR},${y + hoogte} ${xL},${y + hoogte}`
    : `${xL},${y} ${xR},${y} ${xR},${y + hoogte - c} ${xR - c},${y + hoogte} ${xL + c},${y + hoogte} ${xL},${y + hoogte - c}`;
  return (
    <g>
      <polygon points={punten} fill="#cbd5e1" stroke="#334155" strokeWidth={1.1} strokeLinejoin="round" />
      <line x1={ax - breedte / 4} y1={y} x2={ax - breedte / 4} y2={y + hoogte} stroke="#475569" strokeWidth={0.7} />
      <line x1={ax + breedte / 4} y1={y} x2={ax + breedte / 4} y2={y + hoogte} stroke="#475569" strokeWidth={0.7} />
    </g>
  );
}

export default function BoutDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef, xc } = ctx;

  const fy = Math.round(d("staalsoort"));
  const kwal = Math.round(d("boutkwaliteit"));
  const M = Math.round(d("boutdiameter"));
  const vlak = Math.round(d("afschuifvlak"));      // 1 = door de draad
  const pos = Math.round(d("boutpositie"));        // 1 = eindbout (krachtsrichting)
  const randpos = Math.round(d("randpositie"));    // 1 = randbout (loodrecht)
  const t = Math.max(1, d("t_plaat"));
  const e1 = Math.max(1, d("e_1")), p1 = Math.max(1, d("p_1"));
  const e2 = Math.max(1, d("e_2")), p2 = Math.max(1, d("p_2"));
  const nv = Math.max(1, Math.round(d("n_v")));
  const FvEd = Math.max(0, d("F_v_Ed")), FtEd = Math.max(0, d("F_t_Ed"));
  const overlap = Math.round(d("overlaptype"));    // 2 = enkele overlap, één boutrij
  const d0 = GAT[M] ?? M + 2, dk = EW[M] ?? M * 1.7;

  // ── toetsing volgens tabel 3.4 — spiegelt templates/boutberekening.ts ──────
  const A_s = AS[M] ?? (Math.PI * M * M) / 4;
  const A = (Math.PI * M * M) / 4;
  const f_ub = FUB[kwal] ?? 800;
  const f_u = FU[fy] ?? 360;
  // Splitspunt (register punt 6): §3.6.1(3) vraagt het gemiddelde van de maat
  // over de platte kanten en over de hoeken; de referentie-uitwerking vult alleen de
  // sleutelwijdte in. Dezelfde keuze als in templates/boutberekening.ts, anders
  // toont dit paneel een andere B_p,Rd dan de uitwerking ernaast.
  const d_m = xc ? (SW[M] ?? M * 1.5) : ((SW[M] ?? M * 1.5) + (EW[M] ?? M * 1.7)) / 2;

  const A_v = vlak === 1 ? A_s : A;
  const α_v = vlak === 1 ? (AV[kwal] ?? 0.6) : 0.6;

  const FtRd = (k_2 * f_ub * A_s) / γ_M2 / 1000;          // kN
  const FvRd = (α_v * f_ub * A_v) / γ_M2 / 1000;          // kN, per afschuifvlak
  const FvRdTot = nv * FvRd;

  const k1rand = (2.8 * e2) / d0 - 1.7;
  const k1bin = (1.4 * p2) / d0 - 1.7;
  const k_1 = Math.min(randpos === 1 ? k1rand : k1bin, 2.5);
  const α_d = pos === 1 ? e1 / (3 * d0) : p1 / (3 * d0) - 0.25;
  const α_b = Math.min(α_d, f_ub / f_u, 1.0);
  const FbRdTab = (k_1 * α_b * f_u * M * t) / γ_M2 / 1000;   // kN, tabel 3.4
  // §3.6.1(10): een enkele overlap met één boutrij kan de rotatie uit de
  // excentriciteit van het ene afschuifvlak niet opnemen; de stuikweerstand is
  // dan begrensd, en sluitringen onder kop én moer zijn vereist.
  const FbRdCap = (1.5 * f_u * M * t) / γ_M2 / 1000;
  const FbRd = overlap === 2 ? Math.min(FbRdTab, FbRdCap) : FbRdTab;
  const capBijt = overlap === 2 && FbRdCap < FbRdTab;
  const BpRd = (0.6 * Math.PI * d_m * t * f_u) / γ_M2 / 1000;

  const belast = FvEd + FtEd > 0;
  const UC = belast
    ? Math.max(FvEd / FvRdTot, FvEd / FbRd, FtEd / FtRd, FtEd / BpRd,
               FvEd / FvRdTot + FtEd / (1.4 * FtRd))
    : 0;

  // Minimum- en maximumeisen uit EN 1993-1-8 tabel 3.3. p₁ en p₂ tellen alleen
  // mee als de bout in die richting een binnenste bout is — net als in het blad.
  const pmax = Math.min(14 * t, 200);
  const eisen = [
    { naam: "e₁", w: e1, grens: 1.2 * d0, ok: e1 >= 1.2 * d0, actief: true },
    { naam: "e₂", w: e2, grens: 1.2 * d0, ok: e2 >= 1.2 * d0, actief: true },
    { naam: "p₁", w: p1, grens: 2.2 * d0, ok: p1 >= 2.2 * d0 && p1 <= pmax, actief: pos === 2 },
    { naam: "p₂", w: p2, grens: 2.4 * d0, ok: p2 >= 2.4 * d0 && p2 <= pmax, actief: randpos === 2 },
  ];
  const alleOk = eisen.every((e) => !e.actief || e.ok);
  const ok = belast ? UC <= 1.0 && alleOk : alleOk;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(220, box.h - 2 * capH - gap);
  const PH = totH * 0.56, SH = totH - PH;                 // plan / snede
  // Plaatmaten volgen uit de rand- en steekafstanden.
  const L = 2 * e1 + p1;          // overlap in de krachtsrichting
  const B = 2 * e2 + p2;          // loodrecht daarop
  const kolX = [e1, e1 + p1];     // hartlijnen langs de kracht
  const rijY = [e2, e2 + p2];
  // Buiten de overlap lopen de platen door tot een breuklijn; daarachter de krachten.
  // In een smal paneel worden die stukken korter, zodat de overlap de ruimte houdt.
  const extPx = clamp(W * 0.11, 30, 72), pijl = clamp(W * 0.08, 16, 44);
  const mL = extPx + pijl + 12, mR = extPx + pijl + 12;
  const xDim = Math.min(26, extPx * 0.6);   // maatketen loodrecht, over het doorlopende stuk van B
  const mT = clamp(PH * 0.12, 20, 40), mB = clamp(PH * 0.2, 38, 56);
  // ISO-maten van kop, moer en sluitring, voor de hoogte van de doorsnede.
  const kop = KOP[M] ?? 0.63 * M, moer = MOER[M] ?? 0.9 * M;
  const [dRing, hRing] = RING[M] ?? [1.9 * M, 0.2 * M];
  const uitsteek = 0.45 * M;
  const stapel = kop + hRing + 2 * t + hRing + moer + uitsteek;
  // Eén schaal voor beide aanzichten, zodat de bouten uitlijnen.
  const sPlan = Math.min((W - mL - mR) / L, (PH - mT - mB) / B);
  const sSnede = (SH - 30) / stapel;
  const s = Math.max(0.2, Math.min(sPlan, sSnede));

  const cx = mL + (W - mL - mR) / 2;
  const x0 = cx - (L * s) / 2;
  const px = (mm: number) => x0 + mm * s;
  const yPl0 = mT + Math.max(0, (PH - mT - mB - B * s) / 2);
  const py = (mm: number) => yPl0 + mm * s;
  const yPl1 = py(B);
  const xA0 = px(0) - extPx;      // plaat A: van de breuklijn links tot zijn einde bij L
  const xB1 = px(L) + extPx;      // plaat B: van zijn einde bij 0 tot de breuklijn rechts

  // doorsnede, van boven naar beneden: kop, sluitring, plaat A, plaat B, sluitring, moer
  const tPx = t * s;
  const yTop = Math.max(14, (SH - stapel * s) / 2);
  const yA0 = yTop + (kop + hRing) * s;
  const ySn = yA0 + tPx;                           // afschuifvlak
  const yB1 = ySn + tPx;
  const yMoer = yB1 + hRing * s;
  const yEind = yMoer + (moer + uitsteek) * s;
  // Draad: bij "door de draad" loopt hij tot boven het afschuifvlak door.
  const yDraad = vlak === 1 ? ySn - 0.35 * tPx : ySn + 0.4 * tPx;
  const hartlijn = { stroke: "#94a3b8", strokeWidth: 0.7, strokeDasharray: "12 3 2 3" };

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Boutberekening — tabel 3.4</strong>
        <span className={`vd-uc ${ok ? "ok" : "bad"}`}>
          {belast
            ? `u.c. = ${fmt(UC, 2)} ${UC <= 1.0 ? "✓ voldoet" : "✗ voldoet niet"}`
            : alleOk ? "✓ afstanden binnen tabel 3.3" : "✗ afstand buiten tabel 3.3"}
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Materiaal</span>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Boutkwaliteit
            <select value={kwal} onChange={(e) => set("boutkwaliteit", parseInt(e.target.value))}>
              {KWAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Boutdiameter
            <select value={M} onChange={(e) => set("boutdiameter", parseInt(e.target.value))}>
              {MAAT.map((m) => <option key={m} value={m}>M{m}</option>)}
            </select>
          </label>
          <span className="gd-note">
            d<sub>0</sub> = {fmt(d0)} mm · A<sub>s</sub> = {fmt(A_s)} mm² · A = {fmt(A)} mm² ·
            f<sub>ub</sub> = {fmt(f_ub)} · f<sub>u</sub> = {fmt(f_u)} N/mm²
          </span>

          <span className="vd-ctrl-h">Uitvoering</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Afschuifvlak
            <select style={{ width: "100%" }} value={vlak} onChange={(e) => set("afschuifvlak", parseInt(e.target.value))}>
              <option value={1}>door de draad</option>
              <option value={2}>door de schacht</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="Bepaalt α_d: een eindbout steunt op e₁, een binnenste bout op p₁">In de krachtsrichting
            <select style={{ width: "100%" }} value={pos} onChange={(e) => set("boutpositie", parseInt(e.target.value))}>
              <option value={1}>eindbout</option>
              <option value={2}>binnenste bout</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="Bepaalt k₁: een randbout steunt op e₂, een binnenste bout op p₂">Loodrecht op de kracht
            <select style={{ width: "100%" }} value={randpos} onChange={(e) => set("randpositie", parseInt(e.target.value))}>
              <option value={1}>randbout</option>
              <option value={2}>binnenste bout</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="§3.6.1(10): bij een enkele overlap met één boutrij is F_b,Rd begrensd op 1,5·f_u·d·t/γ_M2 en zijn sluitringen onder kop én moer vereist">Verbindingsvorm
            <select style={{ width: "100%" }} value={overlap} onChange={(e) => set("overlaptype", parseInt(e.target.value))}>
              <option value={1}>overige gevallen</option>
              <option value={2}>enkele overlap, één boutrij</option>
            </select>
          </label>
          <label>Plaatdikte t (mm)
            <input type="number" step={1} min={1} value={t} onChange={(e) => set("t_plaat", parseFloat(e.target.value))} />
          </label>
          <label title="Aantal afschuifvlakken van deze bout">Afschuifvlakken n<sub>v</sub>
            <input type="number" step={1} min={1} value={nv} onChange={(e) => set("n_v", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Afstanden (mm)</span>
          <label title="Eindafstand in de krachtsrichting">e<sub>1</sub>
            <input type="number" step={5} value={e1} onChange={(e) => set("e_1", parseFloat(e.target.value))} />
          </label>
          <label title="Steek in de krachtsrichting — telt alleen bij een binnenste bout">p<sub>1</sub>
            <input type="number" step={5} value={p1} onChange={(e) => set("p_1", parseFloat(e.target.value))} />
          </label>
          <label title="Eindafstand loodrecht op de kracht">e<sub>2</sub>
            <input type="number" step={5} value={e2} onChange={(e) => set("e_2", parseFloat(e.target.value))} />
          </label>
          <label title="Steek loodrecht op de kracht — telt alleen bij een binnenste bout">p<sub>2</sub>
            <input type="number" step={5} value={p2} onChange={(e) => set("p_2", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Tabel 3.3: {eisen.map((e) => (
            <span key={e.naam} style={{ color: !e.actief ? "#9ca3af" : e.ok ? "#047857" : "#b91c1c" }}>
              {e.naam} {e.actief ? `≥ ${fmt(e.grens, 1)}` : "n.v.t."}{" "}
            </span>
          ))}{(pos === 2 || randpos === 2) && <> · p ≤ {fmt(pmax)}</>}</span>

          <span className="vd-ctrl-h">Krachten (kN) — 0 = alleen weerstanden</span>
          <label title="Afschuifkracht op de bout">F<sub>v,Ed</sub>
            <input type="number" step={5} min={0} value={FvEd} onChange={(e) => set("F_v_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Trekkracht op de bout — inclusief eventuele hefboomkracht">F<sub>t,Ed</sub>
            <input type="number" step={5} min={0} value={FtEd} onChange={(e) => set("F_t_Ed", parseFloat(e.target.value))} />
          </label>
          {belast && (
            <span className="gd-note">
              afschuiving {fmt(FvEd / FvRdTot, 2)} · stuik {fmt(FvEd / FbRd, 2)} ·
              trek {fmt(FtEd / FtRd, 2)} · doorponsen {fmt(FtEd / BpRd, 2)} ·
              interactie {fmt(FvEd / FvRdTot + FtEd / (1.4 * FtRd), 2)}
            </span>
          )}
          {overlap === 2 && (
            <span className="gd-note" style={{ color: capBijt ? "#b45309" : undefined }}>
              §3.6.1(10): F<sub>b,Rd</sub> ≤ {fmt(FbRdCap, 1)} kN
              {capBijt ? " — maatgevend" : " — niet maatgevend"}. Sluitringen onder kop én moer vereist.
            </span>
          )}
          <span className="gd-note">Plaat volgt uit de afstanden: {fmt(L)} × {fmt(B)} mm.</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Bovenaanzicht</div>
            <div className="vd-stage" style={{ width: W, height: PH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={PH} className="vd-svg">
                <Defs k="bp" />
                {/* plaat B onder: van zijn einde bij 0 tot de breuklijn rechts */}
                <path d={`M ${px(0)} ${yPl0} L ${xB1} ${yPl0} ${breukPad(xB1, yPl0, yPl1, false)} L ${px(0)} ${yPl1} Z`}
                  fill="#eef1f5" stroke="#475569" strokeWidth={1.2} strokeLinejoin="round" />
                {/* plaat A boven: van de breuklijn links tot zijn einde bij L */}
                <path d={`M ${px(L)} ${yPl0} L ${xA0} ${yPl0} ${breukPad(xA0, yPl0, yPl1, true)} L ${px(L)} ${yPl1} Z`}
                  fill="#dce6f2" stroke="#334155" strokeWidth={1.3} strokeLinejoin="round" />
                {/* het einde van plaat B ligt onder plaat A */}
                <line x1={px(0)} y1={yPl0} x2={px(0)} y2={yPl1} stroke="#64748b" strokeWidth={1} strokeDasharray="5 3" />
                {/* hartlijnen */}
                {rijY.map((my) => <line key={`r${my}`} x1={xA0 + 10} y1={py(my)} x2={xB1 - 10} y2={py(my)} {...hartlijn} />)}
                {kolX.map((mx) => <line key={`k${mx}`} x1={px(mx)} y1={yPl0 - 14} x2={px(mx)} y2={yPl1 + 14} {...hartlijn} />)}
                {/* bouten: sluitring, zeskantkop, het gat gestippeld eronder */}
                {rijY.map((my, j) => kolX.map((mx, i) => {
                  const markeer = i === pos - 1 && j === randpos - 1;
                  const bx = px(mx), by = py(my);
                  return (
                    <g key={`${mx}-${my}`}>
                      {markeer && <circle cx={bx} cy={by} r={(dRing / 2) * s + 6} fill="#fde68a" fillOpacity={0.6} stroke="#f59e0b" strokeWidth={0.8} />}
                      <circle cx={bx} cy={by} r={(dRing / 2) * s} fill="#e2e8f0" stroke="#64748b" strokeWidth={0.8} />
                      <polygon points={zeskant(bx, by, (dk / 2) * s)} fill="#cbd5e1" stroke="#334155" strokeWidth={1.1} strokeLinejoin="round" />
                      <circle cx={bx} cy={by} r={((SW[M] ?? M * 1.5) / 2) * s * 0.96} fill="none" stroke="#475569" strokeWidth={0.6} />
                      <circle cx={bx} cy={by} r={(d0 / 2) * s} fill="none" stroke="#475569" strokeWidth={0.7} strokeDasharray="3 2" />
                    </g>
                  );
                }))}
                {/* krachten: plaat A naar links, plaat B naar rechts */}
                <line x1={xA0 - 8} y1={py(B / 2)} x2={xA0 - 8 - pijl} y2={py(B / 2)}
                  className="vd-load" strokeWidth={2.6} markerEnd={loadMark("bp")} />
                <line x1={xB1 + 8} y1={py(B / 2)} x2={xB1 + 8 + pijl} y2={py(B / 2)}
                  className="vd-load" strokeWidth={2.6} markerEnd={loadMark("bp")} />
                {/* maatlijnen langs de kracht */}
                <HDim k="bp" x0={px(0)} x1={px(e1)} y={yPl1 + 26} ext={yPl1 + 4} />
                <HDim k="bp" x0={px(e1)} x1={px(e1 + p1)} y={yPl1 + 26} ext={yPl1 + 4} />
                <HDim k="bp" x0={px(e1 + p1)} x1={px(L)} y={yPl1 + 26} ext={yPl1 + 4} />
                {/* maatlijnen loodrecht, over het doorlopende stuk van plaat B */}
                <VDim k="bp" y0={yPl0} y1={py(e2)} x={px(L) + xDim} ext={px(L) + 4} />
                <VDim k="bp" y0={py(e2)} y1={py(e2 + p2)} x={px(L) + xDim} ext={px(L) + 4} />
                <VDim k="bp" y0={py(e2 + p2)} y1={yPl1} x={px(L) + xDim} ext={px(L) + 4} />
              </svg>

              <Dim ctx={ctx} name="e_1" value={e1} x={px(e1 / 2)} y={yPl1 + 26} step={5} label="e1" />
              <Dim ctx={ctx} name="p_1" value={p1} x={px(e1 + p1 / 2)} y={yPl1 + 26} step={5} label="p1" />
              <Ro text={fmt(e1)} x={px(e1 + p1 + e1 / 2)} y={yPl1 + 26} title="gelijk aan e₁ aan de andere zijde" />
              <Dim ctx={ctx} name="e_2" value={e2} x={px(L) + xDim} y={py(e2 / 2)} step={5} label="e2" />
              <Dim ctx={ctx} name="p_2" value={p2} x={px(L) + xDim} y={py(e2 + p2 / 2)} step={5} label="p2" />
              <Ro text={fmt(e2)} x={px(L) + xDim} y={py(e2 + p2 + e2 / 2)} title="gelijk aan e₂ aan de andere zijde" />
              <Ro text="F" x={xA0 - 8 - pijl / 2} y={py(B / 2) - 15} kleur="#dc2626" title="kracht op plaat A" />
              <Ro text="F" x={xB1 + 8 + pijl / 2} y={py(B / 2) - 15} kleur="#dc2626" title="kracht op plaat B" />
              <Ro text="A" x={xA0 + 12} y={yPl0 + 11} title="plaat A, boven" />
              <Ro text="B" x={xB1 - 12} y={yPl0 + 11} title="plaat B, onder" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede over de bouten</div>
            <div className="vd-stage" style={{ width: W, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={SH} className="vd-svg">
                <Defs k="bs" />
                <defs>
                  <pattern id="bsArceringA" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#64748b" strokeWidth="0.8" />
                  </pattern>
                  <pattern id="bsArceringB" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#64748b" strokeWidth="0.8" />
                  </pattern>
                </defs>
                {/* plaat A boven en plaat B onder, gesneden en gearceerd */}
                {([
                  [`M ${px(L)} ${yA0} L ${xA0} ${yA0} ${breukPad(xA0, yA0, ySn, true)} L ${px(L)} ${ySn} Z`, "#dce6f2", "bsArceringA"],
                  [`M ${px(0)} ${ySn} L ${xB1} ${ySn} ${breukPad(xB1, ySn, yB1, false)} L ${px(0)} ${yB1} Z`, "#eef1f5", "bsArceringB"],
                ] as const).map(([d, kleur, arcering]) => (
                  <g key={arcering}>
                    <path d={d} fill={kleur} />
                    <path d={d} fill={`url(#${arcering})`} stroke="#334155" strokeWidth={1.2} strokeLinejoin="round" />
                  </g>
                ))}
                {/* afschuifvlak */}
                <line x1={xA0 - 4} y1={ySn} x2={xB1 + 4} y2={ySn} stroke="#dc2626" strokeWidth={1.3} strokeDasharray="7 4" />
                {/* bouten in aanzicht: gat, schacht, kop, sluitringen, moer */}
                {kolX.map((mx) => {
                  const ax = px(mx), rS = (M / 2) * s, rK = (M / 2) * s * 0.85;
                  return (
                    <g key={mx}>
                      <rect x={ax - (d0 / 2) * s} y={yA0} width={d0 * s} height={yB1 - yA0} fill="#ffffff" />
                      <line x1={ax - (d0 / 2) * s} y1={yA0} x2={ax - (d0 / 2) * s} y2={yB1} stroke="#334155" strokeWidth={0.9} />
                      <line x1={ax + (d0 / 2) * s} y1={yA0} x2={ax + (d0 / 2) * s} y2={yB1} stroke="#334155" strokeWidth={0.9} />
                      {/* schacht met afgeschuind einde */}
                      <polygon points={`${ax - rS},${yA0} ${ax + rS},${yA0} ${ax + rS},${yEind - 0.12 * M * s} ${ax + rS - 0.12 * M * s},${yEind} ${ax - rS + 0.12 * M * s},${yEind} ${ax - rS},${yEind - 0.12 * M * s}`}
                        fill="#e5e7eb" stroke="#475569" strokeWidth={0.9} strokeLinejoin="round" />
                      {/* draad: kerndiameter dun, draadeinde dik — zichtbaar in het gat en onder de moer */}
                      {[[yDraad, yB1], [yMoer + moer * s, yEind]].map(([ya, yb], i) => (
                        <g key={i}>
                          <line x1={ax - rK} y1={ya} x2={ax - rK} y2={yb} stroke="#475569" strokeWidth={0.6} />
                          <line x1={ax + rK} y1={ya} x2={ax + rK} y2={yb} stroke="#475569" strokeWidth={0.6} />
                        </g>
                      ))}
                      <line x1={ax - rS} y1={yDraad} x2={ax + rS} y2={yDraad} stroke="#1f2937" strokeWidth={1.4} />
                      {/* kop en sluitring boven, sluitring en moer onder */}
                      <Zeskantaanzicht ax={ax} y={yTop} breedte={dk * s} hoogte={kop * s} afschuining="boven" />
                      <rect x={ax - (dRing / 2) * s} y={yTop + kop * s} width={dRing * s} height={hRing * s} fill="#e2e8f0" stroke="#475569" strokeWidth={0.8} />
                      <rect x={ax - (dRing / 2) * s} y={yB1} width={dRing * s} height={hRing * s} fill="#e2e8f0" stroke="#475569" strokeWidth={0.8} />
                      <Zeskantaanzicht ax={ax} y={yMoer} breedte={dk * s} hoogte={moer * s} afschuining="onder" />
                      {/* hartlijn */}
                      <line x1={ax} y1={yTop - 10} x2={ax} y2={yEind + 10} {...hartlijn} />
                    </g>
                  );
                })}
                {/* krachten op de platen */}
                <line x1={xA0 - 8} y1={(yA0 + ySn) / 2} x2={xA0 - 8 - pijl} y2={(yA0 + ySn) / 2}
                  className="vd-load" strokeWidth={2.4} markerEnd={loadMark("bs")} />
                <line x1={xB1 + 8} y1={(ySn + yB1) / 2} x2={xB1 + 8 + pijl} y2={(ySn + yB1) / 2}
                  className="vd-load" strokeWidth={2.4} markerEnd={loadMark("bs")} />
                {/* verwijslijn naar het afschuifvlak, rechts van het einde van plaat A */}
                <line x1={px(L) + extPx / 2} y1={yA0 - 4} x2={px(L) + extPx / 2} y2={ySn} stroke="#dc2626" strokeWidth={0.9} />
                <circle cx={px(L) + extPx / 2} cy={ySn} r={1.8} fill="#dc2626" />
                {/* plaatdikte: links onder plaat A, waar plaat B begint */}
                <VDim k="bs" y0={ySn} y1={yB1} x={px(0) - 20} ext={px(0) - 4} />
              </svg>

              <Dim ctx={ctx} name="t_plaat" value={t} x={px(0) - 20} y={(ySn + yB1) / 2} step={1} label="t" />
              <Ro text={vlak === 1 ? "afschuifvlak door de draad" : "afschuifvlak door de schacht"}
                x={px(L) + extPx / 2 + 44} y={yA0 - 11} kleur="#dc2626"
                title={vlak === 1 ? "Rekent met A_s" : "Rekent met A"} />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De gele markering is de bout waarvoor de stuikweerstand bepaald wordt: de positie in
          de krachtsrichting bepaalt α<sub>d</sub>, die loodrecht daarop k<sub>1</sub>.</span>
        <span className="vd-live">
          F<sub>t,Rd</sub> = {fmt(FtRd, 1)} · F<sub>v,Rd</sub> = {fmt(FvRd, 1)} kN/vlak
          {nv > 1 && <> ({fmt(FvRdTot, 1)} over {nv})</>} ·
          F<sub>b,Rd</sub> = {fmt(FbRd, 1)}
          {capBijt && <> (§3.6.1(10) begrenst {fmt(FbRdTab, 1)} → {fmt(FbRdCap, 1)})</>} ·
          B<sub>p,Rd</sub> = {fmt(BpRd, 1)} kN ·
          k<sub>1</sub> = {fmt(k_1, 3)} · α<sub>d</sub> = {fmt(α_d, 3)} · α<sub>b</sub> = {fmt(α_b, 3)} ·
          α<sub>v</sub> = {fmt(α_v, 1)} · A<sub>v</sub> = {fmt(A_v)} mm²
        </span>
      </div>
    </div>
  );
}
