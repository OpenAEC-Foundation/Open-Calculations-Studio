import { useDesigner, Dim, Ro, Defs, loadMark, Bout, HDim, VDim, fmt, clamp } from "./designerKit";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld en toetsing van één bout volgens NEN-EN 1993-1-8 tabel 3.4.
 *
 * Twee aanzichten met één gedeelde horizontale schaal, zodat de bouten in de
 * doorsnede recht onder die in het bovenaanzicht staan:
 *   • Bovenaanzicht — de plaat met vier bouten. Tabel 3.4 kent twee
 *     onafhankelijke assen: de positie in de krachtsrichting (eind- of
 *     binnenste bout) bepaalt α_d, de positie loodrecht daarop (rand- of
 *     binnenste bout) bepaalt k₁. De gekozen combinatie is gemarkeerd.
 *   • Doorsnede — de twee platen met de bout erdoor. Het afschuifvlak ligt op
 *     het scheidingsvlak; of dat door de draad of door de schacht gaat bepaalt
 *     of met A_s of met A gerekend wordt, en is te zien aan de draadaanduiding.
 *
 * De weerstanden in de kop en de voet zijn dezelfde toetsing als in het
 * rekenblad — zie templates/boutberekening.ts, dat op zes de referentie-uitwerking-bladen is
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
  const totH = Math.max(200, box.h - 2 * capH - gap);
  const PH = totH * 0.58, SH = totH - PH;                 // plan / snede
  const mL = clamp(W * 0.12, 52, 84), mR = clamp(W * 0.08, 30, 60);
  const mT = clamp(PH * 0.14, 26, 46), mB = clamp(PH * 0.18, 34, 56);
  // Plaatmaten volgen uit de rand- en steekafstanden.
  const L = 2 * e1 + p1;          // in de krachtsrichting
  const B = 2 * e2 + p2;          // loodrecht daarop
  const kolX = [e1, e1 + p1];     // hartlijnen langs de kracht
  const rijY = [e2, e2 + p2];
  // Eén schaal voor beide aanzichten, zodat de bouten uitlijnen.
  const sPlan = Math.min((W - mL - mR) / L, (PH - mT - mB) / B);
  const sSnede = Math.min(sPlan, (SH - 46) / (2 * t + dk));
  const s = Math.min(sPlan, sSnede * 1.6);

  const cx = mL + (W - mL - mR) / 2;
  const x0 = cx - (L * s) / 2;
  const px = (mm: number) => x0 + mm * s;
  const yPl0 = mT + Math.max(0, (PH - mT - mB - B * s) / 2);
  const py = (mm: number) => yPl0 + mm * s;
  const yPl1 = py(B);
  const boutR = Math.max(3.5, (d0 * s) / 2);

  // doorsnede
  const ySn = SH * 0.42;
  const tPx = Math.max(4, t * s);
  const kopPx = Math.max(5, dk * s * 0.5);
  const schachtPx = Math.max(3, M * s);

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
                {/* de doorlopende plaat */}
                <rect x={px(0)} y={yPl0} width={L * s} height={B * s} fill="#eef2f7" stroke="#374151" strokeWidth={1.4} />
                {/* de overlappende plaat, half zichtbaar */}
                <rect x={px(0) - 26} y={yPl0} width={px(e1 + p1 / 2) - px(0) + 26} height={B * s}
                  fill="#dbe7f6" fillOpacity={0.7} stroke="#1e40af" strokeWidth={1.2} strokeDasharray="7 4" />
                {/* bouten — de beschouwde bout volgt uit beide posities */}
                {rijY.map((my, j) => kolX.map((mx, i) => {
                  const markeer = i === pos - 1 && j === randpos - 1;
                  return (
                    <g key={`${mx}-${my}`}>
                      {markeer && <circle cx={px(mx)} cy={py(my)} r={boutR * 2.1} fill="#fde68a" fillOpacity={0.55} stroke="none" />}
                      <Bout cx={px(mx)} cy={py(my)} r={boutR} />
                    </g>
                  );
                }))}
                {/* krachtsrichting */}
                <line x1={px(0) - 62} y1={py(B / 2)} x2={px(0) - 8} y2={py(B / 2)}
                  className="vd-load" strokeWidth={3} markerEnd={loadMark("bp")} />
                {/* maatlijnen langs de kracht */}
                <HDim k="bp" x0={px(0)} x1={px(e1)} y={yPl1 + 24} ext={yPl1 + 4} />
                <HDim k="bp" x0={px(e1)} x1={px(e1 + p1)} y={yPl1 + 24} ext={yPl1 + 4} />
                <HDim k="bp" x0={px(e1 + p1)} x1={px(L)} y={yPl1 + 24} ext={yPl1 + 4} />
                {/* maatlijnen loodrecht */}
                <VDim k="bp" y0={yPl0} y1={py(e2)} x={px(L) + 26} ext={px(L) + 4} />
                <VDim k="bp" y0={py(e2)} y1={py(e2 + p2)} x={px(L) + 26} ext={px(L) + 4} />
                <VDim k="bp" y0={py(e2 + p2)} y1={yPl1} x={px(L) + 26} ext={px(L) + 4} />
              </svg>

              <Dim ctx={ctx} name="e_1" value={e1} x={px(e1 / 2)} y={yPl1 + 24} step={5} label="e1" />
              <Dim ctx={ctx} name="p_1" value={p1} x={px(e1 + p1 / 2)} y={yPl1 + 24} step={5} label="p1" />
              <Ro text={fmt(e1)} x={px(e1 + p1 + e1 / 2)} y={yPl1 + 24} title="gelijk aan e₁ aan de andere zijde" />
              <Dim ctx={ctx} name="e_2" value={e2} x={px(L) + 26} y={py(e2 / 2)} step={5} label="e2" />
              <Dim ctx={ctx} name="p_2" value={p2} x={px(L) + 26} y={py(e2 + p2 / 2)} step={5} label="p2" />
              <Ro text="F" x={px(0) - 46} y={py(B / 2) - 16} kleur="#dc2626" title="krachtsrichting" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede over de bouten</div>
            <div className="vd-stage" style={{ width: W, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={SH} className="vd-svg">
                <Defs k="bs" />
                {/* twee platen op elkaar */}
                <rect x={px(0) - 26} y={ySn - tPx} width={px(e1 + p1 / 2) - px(0) + 26} height={tPx}
                  fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                <rect x={px(0)} y={ySn} width={L * s} height={tPx} fill="#eef2f7" stroke="#374151" strokeWidth={1.3} />
                {/* afschuifvlak */}
                <line x1={px(0) - 34} y1={ySn} x2={px(L) + 12} y2={ySn} stroke="#dc2626" strokeWidth={1.4} strokeDasharray="7 4" />
                {/* bouten in doorsnede: kop, schacht met draad, moer */}
                {kolX.map((mx) => {
                  const ax = px(mx);
                  const yk0 = ySn - tPx - kopPx, ym1 = ySn + tPx + kopPx;
                  const draadVanaf = vlak === 1 ? ySn - tPx * 0.7 : ySn + tPx * 0.35;
                  const n = Math.max(2, Math.round((ym1 - draadVanaf) / 3.2));
                  return (
                    <g key={mx}>
                      <rect x={ax - schachtPx / 2} y={yk0} width={schachtPx} height={ym1 - yk0}
                        fill="#e8eaee" stroke="#4b5563" strokeWidth={1} />
                      {Array.from({ length: n }, (_, i) => (
                        <line key={i} x1={ax - schachtPx / 2} y1={draadVanaf + i * 3.2} x2={ax + schachtPx / 2} y2={draadVanaf + i * 3.2}
                          stroke="#9aa1ab" strokeWidth={0.6} />
                      ))}
                      <rect x={ax - kopPx} y={yk0} width={kopPx * 2} height={kopPx} fill="#f4f5f7" stroke="#374151" strokeWidth={1.1} />
                      <rect x={ax - kopPx} y={ym1 - kopPx} width={kopPx * 2} height={kopPx} fill="#f4f5f7" stroke="#374151" strokeWidth={1.1} />
                    </g>
                  );
                })}
                {/* plaatdikte */}
                <VDim k="bs" y0={ySn} y1={ySn + tPx} x={px(L) + 26} ext={px(L) + 6} />
              </svg>

              <Dim ctx={ctx} name="t_plaat" value={t} x={px(L) + 26} y={ySn + tPx / 2} step={1} label="t" />
              <Ro text={vlak === 1 ? "afschuifvlak door de draad" : "afschuifvlak door de schacht"}
                x={px(0) + 6} y={ySn - tPx - kopPx - 14} kleur="#dc2626"
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
