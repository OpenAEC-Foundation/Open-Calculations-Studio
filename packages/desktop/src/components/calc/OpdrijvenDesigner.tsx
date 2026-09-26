import { useState } from "react";
import type { ReactNode } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import { useDesigner, Dim, Force, Ro, Defs, loadMark, betonFill, HDim, VDim, fmt, clamp, UitkomstKop } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het blad Opdrijven en drijvend lichaam
 * (templates/opdrijven.ts), per deel:
 *
 *   1. Opdrijven — doorsnede over de breedte van de kelder of bak met de
 *      rekenwaarde van de waterstand, de opwaartse waterdruk onder de vloer,
 *      het blijvende gewicht erop en eventuele trekpalen eronder.
 *   2. Zwaartepunt — bovenaanzicht (x–y) en zijaanzicht (x–z) met de lasten,
 *      het referentiepunt en de resultante.
 *   3. Drijvend lichaam — plattegrond met wanden, lasten en G, en een
 *      doorsnede met de waterlijn van de gekozen toestand, K, B, G en M, de
 *      scheefstand en het vrijboord aan de lage kant.
 *
 * Onder de tekeningen staat de lastentabel van deel 2 en 3. De omschrijving
 * per last kent het blad niet (de rekentaal heeft geen tekstinvoer); het beeld
 * bewaart haar als eigen instelling (`oms_1` …) bij het blad, zodat ze ook op
 * de afdruk staat.
 *
 * Het beeld rekent de toetsing niet na: de kop toont de UC en het oordeel van
 * het blad, en de getallen in de tekening (diepgang, KG, GM, φ, f, U_k, …)
 * komen uit de uitwerking. Alleen zolang het blad die niet geeft, tekent het
 * beeld met een eigen benadering.
 */
const MARKER = "Opdrijven en drijvend lichaam";

const DEFAULTS: Record<string, number> = {
  deel: 1,
  l_bak: 12, b_bak: 8, h_bak: 2.5, t_vl: 0.3, t_dak: 0, γ_c: 25, γ_w: 10,
  t_w1: 0.25, t_w2: 0.25, t_w3: 0.25, t_w4: 0.25,
  waterstand: 1, h_d: 1.6, h_k: 1.4, h_m: 1.2, G_ov: 600, G_bal: 0, n_tp: 0, R_t_k: 250, factoren: 1,
  n_last: 3,
  F_1: 300, x_1: 0.5, y_1: 0, z_1: 3.5,
  F_2: 60, x_2: 2, y_2: 1.5, z_2: 2.8,
  F_3: 40, x_3: -3, y_3: -1, z_3: 0.5,
  x_ref: 0, y_ref: 0, z_ref: 0,
  Q_v: 60, z_Q: 2.8, P_e: 20, e_P: 3, z_P: 3, F_w: 15, a_w: 3, φ_max: 5, f_min: 0.3, GM_min: 0.5,
};

const DELEN = [
  { v: 1, label: "Opdrijven van een kelder of bak (UPL)" },
  { v: 2, label: "Zwaartepunt van belastingen" },
  { v: 3, label: "Drijvend lichaam" },
];
const TOESTANDEN = [
  { k: "0", label: "In rust" },
  { k: "w", label: "Q + wind" },
  { k: "p", label: "Q + P" },
] as const;
type Toestand = (typeof TOESTANDEN)[number]["k"];

const WATER = "#2563eb";

/** Eén unity check uit het blad, gekleurd naar de uitkomst. */
function UcChip({ naam, uc }: { naam: string; uc: number | undefined }) {
  if (uc === undefined || !Number.isFinite(uc)) return <span className="vd-uc-nvt">{naam} —</span>;
  const staat = uc > 1 ? "bad" : uc > 0.9 ? "warn" : "ok";
  return <span className={`vd-uc-chip ${staat}`}>{naam} {fmt(uc, 2)}</span>;
}

export default function OpdrijvenDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  const exemplaar = useActiefExemplaar();
  const alleenLezen = useAlleenLezen();
  const zetWaarde = useProjectStore((s) => s.zetWaarde);
  const [toestand, setToestand] = useState<Toestand>("p");
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const g = uitkomst?.getallen ?? {};
  const uit = (naam: string, terug: number) => (Number.isFinite(g[naam]) ? g[naam] : terug);
  const num = (e: { target: { value: string } }) => parseFloat(e.target.value.replace(",", "."));

  const deel = clamp(Math.round(d("deel")), 1, 3);
  const l = Math.max(0.5, d("l_bak")), b = Math.max(0.5, d("b_bak")), h = Math.max(0.3, d("h_bak"));
  const tvl = clamp(d("t_vl"), 0.01, h * 0.5), tdak = clamp(d("t_dak"), 0, h * 0.4);
  const tw = [1, 2, 3, 4].map((i) => clamp(d(`t_w${i}`), 0, Math.min(l, b) * 0.3));
  const nL = clamp(Math.round(d("n_last")), 0, 10);
  const lasten = Array.from({ length: nL }, (_, i) => ({
    i: i + 1, F: d(`F_${i + 1}`), x: d(`x_${i + 1}`), y: d(`y_${i + 1}`), z: d(`z_${i + 1}`),
    oms: exemplaar?.waarden?.[`oms_${i + 1}`] ?? "",
  }));
  const zetOms = (i: number, tekst: string) => zetWaarde(alleenLezen ? "" : (exemplaar?.id ?? ""), `oms_${i}`, tekst);

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const tweeBeelden = deel !== 1;
  // Bovengrens voor de hoogte van één tekening; elke tekening neemt daarvan
  // alleen wat haar schaal vraagt, zodat er geen lege band onder staat.
  const CH = clamp(tweeBeelden ? (box.h - 2 * capH - gap - 190) / 2 : box.h - capH - 40, 200, tweeBeelden ? 340 : 480);

  // ── invoerkolom per deel ──────────────────────────────────────────────────
  const veld = (naam: string, label: ReactNode, step = 0.05, title?: string) => (
    <label key={naam} title={title}>{label}
      <input type="number" step={step} value={d(naam)} onChange={(e) => set(naam, num(e))} />
    </label>
  );
  const bakVelden = (
    <>
      <span className="vd-ctrl-h">Bak (m)</span>
      {veld("l_bak", "Lengte l", 0.5)}
      {veld("b_bak", "Breedte b", 0.5)}
      {veld("h_bak", "Hoogte h", 0.1)}
      {veld("t_vl", "Vloer", 0.05)}
      {veld("t_dak", deel === 1 ? "Dak, 0 = open" : "Dek, 0 = open", 0.05)}
      {veld("t_w1", "Wand 1 (y = −b/2)", 0.05)}
      {veld("t_w2", "Wand 2 (y = +b/2)", 0.05)}
      {veld("t_w3", "Wand 3 (x = −l/2)", 0.05)}
      {veld("t_w4", "Wand 4 (x = +l/2)", 0.05)}
      {veld("γ_c", <>γ<sub>beton</sub> (kN/m³)</>, 0.5)}
      {veld("γ_w", <>γ<sub>water</sub> (kN/m³)</>, 0.01)}
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Deel 1 — opdrijven
  // ══════════════════════════════════════════════════════════════════════════
  // Tekenfuncties, geen componenten: als component zou React het beeld bij
  // elke render opnieuw opbouwen en een maat die bewerkt wordt de focus verliezen.
  function tekenDeel1() {
    const nb4 = Math.round(d("waterstand")) === 2;
    const hd = nb4 ? uit("h_d", 2 * d("h_k") - d("h_m")) : d("h_d");
    const nTp = Math.max(0, Math.round(d("n_tp")));
    const U = uit("U_k", d("γ_w") * Math.max(hd, 0) * l * b);
    const Gk = uit("G_stb_k", 0);
    const marge = Math.max(0.25 * b, 1);
    const zMin = -(nTp > 0 ? Math.max(0.6 * h, 1.2) : 0.35 * h);
    const zMax = Math.max(h, hd) + 0.3 * h;
    const s = Math.min((W - 100) / (b + 2 * marge), (CH - 60) / (zMax - zMin));
    const H1 = (zMax - zMin) * s + 60;
    const cx = W / 2;
    const X = (y: number) => cx + y * s;
    const Z = (z: number) => 22 + (zMax - z) * s;
    const xL = X(-b / 2), xR = X(b / 2);
    const bi0 = X(-b / 2 + tw[0]), bi1 = X(b / 2 - tw[1]);
    const pijlen = Array.from({ length: 7 }, (_, i) => X(-b / 2 + ((i + 0.5) * b) / 7));
    const palen = Array.from({ length: Math.min(nTp, 6) }, (_, i) => X(-b / 2 + ((i + 0.5) * b) / Math.min(nTp, 6)));
    return (
      <div className="vd-canvas">
        <div className="vd-caption">Doorsnede over de breedte</div>
        <div className="vd-stage" style={{ width: W, height: H1, background: "transparent", border: "none", borderRadius: 0 }}>
          <svg width={W} height={H1} className="vd-svg">
            <Defs k="o1" />
            {/* grondwater tot de rekenwaarde van de waterstand */}
            {hd > 0 && <rect x={X(-b / 2 - marge)} y={Z(hd)} width={(b + 2 * marge) * s} height={Z(zMin) - Z(hd)} fill={WATER} opacity={0.12} />}
            {hd > 0 && <line x1={X(-b / 2 - marge)} y1={Z(hd)} x2={X(b / 2 + marge)} y2={Z(hd)} stroke={WATER} strokeWidth={1.6} />}
            {hd > 0 && <path d={`M ${X(b / 2 + marge) - 22} ${Z(hd) - 9} l 7 9 l 7 -9 Z`} fill="none" stroke={WATER} strokeWidth={1.2} />}
            {/* trekpalen */}
            {palen.map((px, i) => (
              <rect key={i} x={px - 6} y={Z(0)} width={12} height={Z(zMin) - Z(0) - 4} fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="6 4" />
            ))}
            {/* de bak: vloer, wanden en dak */}
            <rect x={xL} y={Z(h)} width={b * s} height={h * s} fill={betonFill("o1")} stroke="#374151" strokeWidth={1.4} />
            <rect x={bi0} y={Z(h - tdak)} width={bi1 - bi0} height={(h - tdak - tvl) * s} fill="#ffffff" stroke="#374151" strokeWidth={1} />
            {/* opwaartse waterdruk op de vloer */}
            {hd > 0 && pijlen.map((px, i) => (
              <g key={i}>
                <line x1={px} y1={Z(0) + 38} x2={px} y2={Z(0) + 10} stroke={WATER} strokeWidth={2} />
                <path d={`M ${px - 4} ${Z(0) + 11} L ${px} ${Z(0) + 3} L ${px + 4} ${Z(0) + 11} Z`} fill={WATER} />
              </g>
            ))}
            {/* blijvend gewicht */}
            <line x1={cx} y1={Z(h) - 46} x2={cx} y2={Z(h) - 6} className="vd-load" strokeWidth={3} markerEnd={loadMark("o1")} />
            <HDim k="o1" x0={xL} x1={xR} y={Z(h) - 18} ext={Z(h) - 4} />
            <VDim k="o1" y0={Z(h)} y1={Z(0)} x={xR + marge * s + 22} ext={xR + 4} />
            {hd > 0 && <VDim k="o1" y0={Z(hd)} y1={Z(0)} x={xL - 26} ext={xL - 4} />}
          </svg>
          <Dim ctx={ctx} name="b_bak" value={b} x={(xL + xR) / 2 - 60} y={Z(h) - 18} step={0.5} label="b" dec={2} />
          <Dim ctx={ctx} name="h_bak" value={h} x={xR + marge * s + 22} y={(Z(h) + Z(0)) / 2} step={0.1} label="h" dec={2} />
          {hd > 0 && (nb4
            ? <Ro text={`hd=${fmt(hd, 2)}`} x={xL - 26} y={(Z(hd) + Z(0)) / 2} title="rekenwaarde van de waterstand, (NB.4)" />
            : <Dim ctx={ctx} name="h_d" value={hd} x={xL - 26} y={(Z(hd) + Z(0)) / 2} step={0.1} label="hd" dec={2} />)}
          <Force ctx={ctx} name="G_ov" value={d("G_ov")} x={cx + 58} y={Z(h) - 40} unit="kN" label="G_ov" step={50} />
          {Gk > 0 && <Ro text={`G_stb;k = ${fmt(Gk)} kN`} x={cx} y={(Z(h - tdak) + Z(tvl)) / 2} title="blijvend en weerstandbiedend (blad)" />}
          {hd > 0 && <Ro text={`U_k=${fmt(U)} kN`} x={cx} y={Z(0) + 50} kleur={WATER} title="opwaartse waterdruk op de onderkant bij h_d (blad)" />}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Deel 2 — zwaartepunt
  // ══════════════════════════════════════════════════════════════════════════
  function tekenDeel2() {
    const ref = { x: d("x_ref"), y: d("y_ref"), z: d("z_ref") };
    const R = lasten.reduce((s, q) => s + q.F, 0);
    const heeftR = Math.abs(R) > 1e-6;
    const xr = uit("x_R", heeftR ? lasten.reduce((s, q) => s + q.F * q.x, 0) / R : 0);
    const yr = uit("y_R", heeftR ? lasten.reduce((s, q) => s + q.F * q.y, 0) / R : 0);
    const zr = uit("z_R", heeftR ? lasten.reduce((s, q) => s + q.F * q.z, 0) / R : 0);
    const xs = [...lasten.map((q) => q.x), ref.x, xr, 0], ys = [...lasten.map((q) => q.y), ref.y, yr, 0], zs = [...lasten.map((q) => q.z), ref.z, zr, 0];
    const bereik = (v: number[]) => { const lo = Math.min(...v), hi = Math.max(...v); const m = Math.max(0.5, (hi - lo) * 0.15); return [lo - m, hi + m]; };
    const [x0, x1] = bereik(xs), [y0, y1] = bereik(ys), [z0, z1] = bereik(zs);
    const s = Math.min((W - 80) / (x1 - x0), (CH - 40) / Math.max(y1 - y0, z1 - z0));
    const X = (x: number) => W / 2 + (x - (x0 + x1) / 2) * s;
    const Fmax = Math.max(1, ...lasten.map((q) => Math.abs(q.F)));
    const r = (F: number) => clamp(16 * Math.sqrt(Math.abs(F) / Fmax), 4, 16);
    const aanzicht = (titel: string, k: string, v0: number, v1: number, V: (q: { y: number; z: number }) => number) => {
      const HA = (v1 - v0) * s + 40;
      const Y = (v: number) => HA / 2 - (v - (v0 + v1) / 2) * s;
      return (
        <div className="vd-canvas">
          <div className="vd-caption">{titel}</div>
          <div className="vd-stage" style={{ width: W, height: HA, background: "transparent", border: "none", borderRadius: 0 }}>
            <svg width={W} height={HA} className="vd-svg">
              <Defs k={k} />
              <line x1={X(x0)} y1={Y(0)} x2={X(x1)} y2={Y(0)} stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="6 4" />
              <line x1={X(0)} y1={Y(v0)} x2={X(0)} y2={Y(v1)} stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="6 4" />
              {lasten.map((q) => (
                <g key={q.i}>
                  <circle cx={X(q.x)} cy={Y(V(q))} r={r(q.F)} fill={q.F >= 0 ? "#dbeafe" : "#ffedd5"} stroke={q.F >= 0 ? "#1e40af" : "#c2410c"} strokeWidth={1.2} />
                  <text x={X(q.x)} y={Y(V(q)) + 3.5} fontSize={10} textAnchor="middle" fill="#111827">{q.i}</text>
                </g>
              ))}
              <path d={`M ${X(ref.x) - 7} ${Y(V(ref))} h 14 M ${X(ref.x)} ${Y(V(ref)) - 7} v 14`} stroke="#6b7280" strokeWidth={1.6} />
              {heeftR && (
                <>
                  <line x1={X(ref.x)} y1={Y(V(ref))} x2={X(xr)} y2={Y(V({ y: yr, z: zr }))} stroke="#dc2626" strokeWidth={1} strokeDasharray="4 3" />
                  <circle cx={X(xr)} cy={Y(V({ y: yr, z: zr }))} r={6} fill="none" stroke="#dc2626" strokeWidth={2} />
                  <path d={`M ${X(xr) - 4} ${Y(V({ y: yr, z: zr })) - 4} l 8 8 M ${X(xr) + 4} ${Y(V({ y: yr, z: zr })) - 4} l -8 8`} stroke="#dc2626" strokeWidth={1.6} />
                </>
              )}
            </svg>
            <Ro text="ref" x={X(ref.x) + 16} y={Y(V(ref)) + 12} />
            {heeftR && <Ro text={`R=${fmt(uit("R", R))} kN`} x={X(xr) + 44} y={Y(V({ y: yr, z: zr })) - 12} kleur="#dc2626" title="resultante in het zwaartepunt (blad)" />}
          </div>
        </div>
      );
    };
    return (
      <>
        {aanzicht("Bovenaanzicht (x naar rechts, y omhoog)", "o2a", y0, y1, (q) => q.y)}
        {aanzicht("Zijaanzicht (x naar rechts, z omhoog)", "o2b", z0, z1, (q) => q.z)}
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Deel 3 — drijvend lichaam
  // ══════════════════════════════════════════════════════════════════════════
  function tekenDeel3() {
    const gw = Math.max(0.1, d("γ_w"));
    const G = uit("G_tot", 0);
    const yG = uit("y_G", 0), zG = uit("z_G", h / 2);
    const t = toestand === "0"
      ? { d: uit("d_0", G / (gw * l * b)), KG: zG, GM: g.GM_0, φ: g.φ_0, f: g.f_0 }
      : toestand === "w"
        ? { d: uit("d_w", 0), KG: uit("KG_w", zG), GM: g.GM_w, φ: g.φ_w, f: g.f_w }
        : { d: uit("d_p", 0), KG: uit("KG_p", zG), GM: g.GM_p, φ: g.φ_p, f: g.f_p };
    const dT = Math.max(0.01, t.d);
    const KM = dT / 2 + (b * b) / (12 * dT);
    const φ = ((Number.isFinite(t.φ) ? t.φ : 0) * Math.PI) / 180;
    const kant = yG < 0 ? -1 : 1;                      // de lage kant: waar G naartoe ligt
    const eP = Math.abs(d("e_P"));

    // plattegrond
    const sp = Math.min((W - 100) / l, (clamp(CH * 0.8, 160, 280) - 50) / b);
    const PH = b * sp + 56;
    const px = (x: number) => W / 2 + x * sp, py = (y: number) => PH / 2 - 6 - y * sp;

    // doorsnede
    const zTop = Math.max(h, zG, t.KG) + 0.25 * h;
    const zMTop = Math.min(KM, zTop + 0.6 * h);
    const zMax = Math.max(zTop, zMTop + 0.15 * h);
    const zMin = -0.3 * h;
    const marge = 0.3 * b;
    const s = Math.min((W - 100) / (b + 2 * marge), (CH - 40) / (zMax - zMin));
    const H3 = (zMax - zMin) * s + 40;
    const X = (y: number) => W / 2 + y * s, Z = (z: number) => 20 + (zMax - z) * s;
    const zw = (y: number) => dT + Math.tan(φ) * y * kant;  // waterlijn in het vlak van de bak
    const yA = -b / 2 - marge, yB = b / 2 + marge;
    const punt = (label: string, z: number, kleur: string, titel: string) => (
      <g key={label}>
        <circle cx={X(0)} cy={Z(z)} r={3.5} fill={kleur} />
        <text x={X(0) + 8} y={Z(z) + 4} fontSize={11} fontWeight={700} fill={kleur}><title>{titel}</title>{label}</text>
      </g>
    );
    const yLaag = (kant * b) / 2;
    return (
      <>
        <div className="vd-canvas">
          <div className="vd-caption">Plattegrond (x naar rechts, y omhoog)</div>
          <div className="vd-stage" style={{ width: W, height: PH, background: "transparent", border: "none", borderRadius: 0 }}>
            <svg width={W} height={PH} className="vd-svg">
              <Defs k="o3a" />
              <rect x={px(-l / 2)} y={py(b / 2)} width={l * sp} height={b * sp} fill={betonFill("o3a")} stroke="#374151" strokeWidth={1.4} />
              <rect x={px(-l / 2 + tw[2])} y={py(b / 2 - tw[1])} width={(l - tw[2] - tw[3]) * sp} height={(b - tw[0] - tw[1]) * sp} fill="#ffffff" stroke="#374151" strokeWidth={1} />
              <line x1={px(-l / 2) - 10} y1={py(0)} x2={px(l / 2) + 10} y2={py(0)} stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="8 4 2 4" />
              <line x1={px(0)} y1={py(b / 2) - 10} x2={px(0)} y2={py(-b / 2) + 10} stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="8 4 2 4" />
              {lasten.map((q) => (
                <g key={q.i}>
                  <circle cx={px(q.x)} cy={py(q.y)} r={7} fill={q.F >= 0 ? "#dbeafe" : "#ffedd5"} stroke={q.F >= 0 ? "#1e40af" : "#c2410c"} strokeWidth={1.1} />
                  <text x={px(q.x)} y={py(q.y) + 3.5} fontSize={9} textAnchor="middle" fill="#111827">{q.i}</text>
                </g>
              ))}
              <circle cx={px(uit("x_G", 0))} cy={py(yG)} r={5} fill="#dc2626" />
              <HDim k="o3a" x0={px(-l / 2)} x1={px(l / 2)} y={py(-b / 2) + 18} ext={py(-b / 2) + 4} />
              <VDim k="o3a" y0={py(b / 2)} y1={py(-b / 2)} x={px(l / 2) + 22} ext={px(l / 2) + 4} />
            </svg>
            <Dim ctx={ctx} name="l_bak" value={l} x={W / 2} y={py(-b / 2) + 18} step={0.5} label="l" dec={2} />
            <Dim ctx={ctx} name="b_bak" value={b} x={px(l / 2) + 22} y={py(0)} step={0.5} label="b" dec={2} />
            <Ro text="G" x={px(uit("x_G", 0)) + 12} y={py(yG) - 10} kleur="#dc2626" title="gewichtszwaartepunt (blad)" />
          </div>
        </div>
        <div className="vd-canvas">
          <div className="vd-caption">Doorsnede, gezien vanaf wand 4 — {TOESTANDEN.find((o) => o.k === toestand)?.label}</div>
          <div className="vd-stage" style={{ width: W, height: H3, background: "transparent", border: "none", borderRadius: 0 }}>
            <svg width={W} height={H3} className="vd-svg">
              <Defs k="o3b" />
              {/* water onder de hellende waterlijn */}
              <path d={`M ${X(yA)} ${Z(zw(yA))} L ${X(yB)} ${Z(zw(yB))} L ${X(yB)} ${Z(zMin)} L ${X(yA)} ${Z(zMin)} Z`} fill={WATER} opacity={0.12} />
              {/* de bak */}
              <rect x={X(-b / 2)} y={Z(h)} width={b * s} height={h * s} fill={betonFill("o3b")} stroke="#374151" strokeWidth={1.4} />
              <rect x={X(-b / 2 + tw[0])} y={Z(h - tdak)} width={(b - tw[0] - tw[1]) * s} height={(h - tdak - tvl) * s} fill="#ffffff" stroke="#374151" strokeWidth={1} />
              {/* waterlijn zonder scheefstand en de hellende waterlijn */}
              <line x1={X(yA)} y1={Z(dT)} x2={X(yB)} y2={Z(dT)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 4" />
              <line x1={X(yA)} y1={Z(zw(yA))} x2={X(yB)} y2={Z(zw(yB))} stroke={WATER} strokeWidth={1.8} />
              {/* hartlijn en de punten K, B, G, M */}
              <line x1={X(0)} y1={Z(zMin)} x2={X(0)} y2={Z(zMax)} stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="8 4 2 4" />
              {punt("K", 0, "#374151", "kiel, onderkant van de bak")}
              {punt("B", dT / 2, WATER, "drukkingspunt, KB = d/2")}
              {punt("G", t.KG, "#dc2626", "gewichtszwaartepunt van de toestand")}
              {KM <= zMTop + 1e-9
                ? punt("M", KM, "#047857", "metacentrum, KM = KB + BM")
                : <path d={`M ${X(0)} ${Z(zMTop) + 14} L ${X(0)} ${Z(zMTop)} M ${X(0) - 5} ${Z(zMTop) + 6} L ${X(0)} ${Z(zMTop)} L ${X(0) + 5} ${Z(zMTop) + 6}`} stroke="#047857" strokeWidth={1.6} fill="none" />}
              {/* excentrische last of wind */}
              {toestand === "p" && d("P_e") > 0 && (
                <line x1={X(kant * Math.min(eP, b / 2 + marge * 0.8))} y1={Z(Math.max(d("z_P"), h)) - 46} x2={X(kant * Math.min(eP, b / 2 + marge * 0.8))} y2={Z(Math.max(d("z_P"), h)) - 6}
                  className="vd-load" strokeWidth={2.6} markerEnd={loadMark("o3b")} />
              )}
              {toestand === "w" && d("F_w") > 0 && (
                <line x1={X(-kant * (b / 2 + marge * 0.9))} y1={Z(h) - 24} x2={X(-kant * (b / 2)) - kant * 6} y2={Z(h) - 24}
                  className="vd-load" strokeWidth={2.6} markerEnd={loadMark("o3b")} />
              )}
              {/* maten: diepgang in het hart, vrijboord aan de lage kant */}
              <VDim k="o3b" y0={Z(dT)} y1={Z(0)} x={X(-kant * (b / 2 + marge * 0.55))} ext={X(-kant * b / 2)} />
              <VDim k="o3b" y0={Z(h)} y1={Z(zw(yLaag))} x={X(kant * (b / 2 + marge * 0.55))} ext={X(kant * b / 2)} />
              <HDim k="o3b" x0={X(-b / 2)} x1={X(b / 2)} y={Z(zMin) - 8} ext={Z(0) + 4} />
            </svg>
            <Ro text={`d=${fmt(dT, 2)}`} x={X(-kant * (b / 2 + marge * 0.55))} y={(Z(dT) + Z(0)) / 2} title="diepgang van de toestand (blad)" />
            <Ro text={`f=${fmt(t.f ?? 0, 2)}`} x={X(kant * (b / 2 + marge * 0.55))} y={(Z(h) + Z(zw(yLaag))) / 2}
              kleur={(t.f ?? 0) < d("f_min") ? "#dc2626" : undefined} title="vrijboord aan de lage hoek (blad)" />
            <Dim ctx={ctx} name="b_bak" value={b} x={W / 2} y={Z(zMin) - 8} step={0.5} label="b" dec={2} />
            {KM > zMTop + 1e-9 && <Ro text={`M ↑ KM=${fmt(KM, 2)}`} x={X(0) + 44} y={Z(zMTop) + 6} kleur="#047857" title="metacentrum boven de tekening" />}
            {Number.isFinite(t.φ) && <Ro text={`φ=${fmt(t.φ ?? 0, 2)}°`} x={X(-kant * b / 4)} y={Z(zw(-kant * b / 4)) - 12} kleur={WATER} title="scheefstand (blad)" />}
            {toestand === "p" && d("P_e") > 0 && <Force ctx={ctx} name="P_e" value={d("P_e")} x={X(kant * Math.min(eP, b / 2 + marge * 0.8)) + kant * 34} y={Z(Math.max(d("z_P"), h)) - 42} unit="kN" label="P" step={5} />}
            {toestand === "w" && d("F_w") > 0 && <Force ctx={ctx} name="F_w" value={d("F_w")} x={X(-kant * (b / 2 + marge * 0.6))} y={Z(h) - 40} unit="kN" label="F_w" step={5} />}
          </div>
        </div>
      </>
    );
  }

  // ── lastentabel (deel 2 en 3) ─────────────────────────────────────────────
  const cel = { padding: "2px 4px" } as const;
  const inv = { width: 62, fontSize: 11.5, padding: "2px 4px" } as const;
  const lastenTabel = (
    <div style={{ width: "100%", maxWidth: 640, fontSize: 11.5 }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #9ca3af", textAlign: "left" }}>
            <th style={cel}>#</th><th style={cel}>Omschrijving</th><th style={cel}>F (kN)</th>
            <th style={cel}>x (m)</th><th style={cel}>y (m)</th><th style={cel}>z (m)</th>
          </tr>
        </thead>
        <tbody>
          {lasten.map((q) => (
            <tr key={q.i}>
              <td style={cel}>{q.i}</td>
              <td style={cel}>
                <input type="text" value={q.oms} placeholder={`last ${q.i}`} style={{ width: "100%", fontSize: 11.5, padding: "2px 4px", boxSizing: "border-box" }}
                  onChange={(e) => zetOms(q.i, e.target.value)} />
              </td>
              {(["F", "x", "y", "z"] as const).map((k) => (
                <td key={k} style={cel}>
                  <input type="number" step={k === "F" ? 5 : 0.1} value={q[k]} style={inv} onChange={(e) => set(`${k}_${q.i}`, num(e))} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        {!alleenLezen && <button type="button" disabled={nL >= 10} onClick={() => set("n_last", nL + 1)}>+ last</button>}
        {!alleenLezen && <button type="button" disabled={nL <= 0} onClick={() => set("n_last", nL - 1)}>− last</button>}
        <span className="gd-note" style={{ alignSelf: "center" }}>
          {deel === 3 ? "x en y vanuit het midden van de bak, z vanaf de onderkant." : "Een negatieve last trekt af (sparing)."}
        </span>
      </div>
    </div>
  );

  // ── voetregel ─────────────────────────────────────────────────────────────
  const voet = deel === 1
    ? <>
        U<sub>k</sub> = {fmt(uit("U_k", 0))} kN · V<sub>dst;d</sub> = {fmt(uit("V_dst_d", 0))} kN ·
        G<sub>stb;d</sub> = {fmt(uit("G_stb_d", 0))} kN · R<sub>d</sub> = {fmt(uit("R_d", 0))} kN ·{" "}
        <UcChip naam="opdrijven" uc={g.UC_upl} />
      </>
    : deel === 2
      ? <>R = {fmt(uit("R", 0), 1)} kN · zwaartepunt ({fmt(uit("x_R", 0), 3)}; {fmt(uit("y_R", 0), 3)}; {fmt(uit("z_R", 0), 3)}) m ·
          e = ({fmt(uit("e_x", 0), 3)}; {fmt(uit("e_y", 0), 3)}; {fmt(uit("e_z", 0), 3)}) m</>
      : <>
          G = {fmt(uit("G_tot", 0))} kN · d = {fmt(uit("d_0", 0), 3)} m · KB = {fmt(uit("KB_0", 0), 3)} · KG = {fmt(uit("z_G", 0), 3)} ·
          KM = {fmt(uit("KM_0", 0), 3)} · GM = {fmt(uit("GM_0", 0), 3)} m ·{" "}
          <UcChip naam="GM" uc={g.UC_GM} /> <UcChip naam="scheefstand" uc={g.UC_φ} /> <UcChip naam="vrijboord" uc={g.UC_f} />
        </>;

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — opdrijven en drijvend lichaam" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        {/* Een lange invoerkolom scrolt zelf, anders loopt ze onder de voetregel door. */}
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Berekening</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Deel
            <select style={{ width: "100%", flex: "0 0 auto" }} value={deel} onChange={(e) => set("deel", parseInt(e.target.value))}>
              {DELEN.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>

          {deel !== 2 && bakVelden}

          {deel === 1 && (
            <>
              <span className="vd-ctrl-h">Water, ballast, palen</span>
              <label style={{ flexDirection: "column", alignItems: "stretch" }}>Waterstand
                <select style={{ width: "100%", flex: "0 0 auto" }} value={Math.round(d("waterstand"))} onChange={(e) => set("waterstand", parseInt(e.target.value))}>
                  <option value={1}>Rekenwaarde h_d ingevoerd</option>
                  <option value={2}>Uit h_k en h_m met (NB.4)</option>
                </select>
              </label>
              {Math.round(d("waterstand")) === 1
                ? veld("h_d", <>h<sub>d</sub> (m)</>, 0.1, "boven de onderkant van de vloer")
                : <>{veld("h_k", <>h<sub>k</sub> (m)</>, 0.1)}{veld("h_m", <>h<sub>m</sub> (m)</>, 0.1)}</>}
              {veld("G_ov", <>G<sub>overig</sub> (kN)</>, 50, "afwerking, installaties, bovenbouw")}
              {veld("G_bal", <>G<sub>ballast</sub> (kN)</>, 50)}
              {veld("n_tp", "Trekpalen (aantal)", 1)}
              {veld("R_t_k", <>R<sub>t;k</sub> per paal (kN)</>, 25)}
              <label style={{ flexDirection: "column", alignItems: "stretch" }}>Factoren
                <select style={{ width: "100%", flex: "0 0 auto" }} value={Math.round(d("factoren"))} onChange={(e) => set("factoren", parseInt(e.target.value))}>
                  <option value={1}>UPL, tabel A.15 (1,0 / 0,9)</option>
                  <option value={2}>EQU, tabel NB.3 (1,1 / 0,9)</option>
                </select>
              </label>
            </>
          )}

          {deel === 2 && (
            <>
              <span className="vd-ctrl-h">Referentiepunt (m)</span>
              {veld("x_ref", "x", 0.1)}
              {veld("y_ref", "y", 0.1)}
              {veld("z_ref", "z", 0.1)}
            </>
          )}

          {deel === 3 && (
            <>
              <span className="vd-ctrl-h">Veranderlijk</span>
              {veld("Q_v", <>Q<sub>v</sub> (kN)</>, 10, "veranderlijke vloerbelasting, met ψ, centrisch")}
              {veld("z_Q", <>z<sub>Q</sub> (m)</>, 0.1)}
              {veld("P_e", <>P<sub>e</sub> (kN)</>, 5, "excentrische last, bijvoorbeeld personen aan één zijde")}
              {veld("e_P", <>e<sub>P</sub> (m)</>, 0.1)}
              {veld("z_P", <>z<sub>P</sub> (m)</>, 0.1)}
              {veld("F_w", <>F<sub>wind</sub> (kN)</>, 5)}
              {veld("a_w", <>arm wind (m)</>, 0.1)}
              <span className="vd-ctrl-h">Eisen</span>
              {veld("φ_max", <>φ<sub>max</sub> (°)</>, 0.5)}
              {veld("f_min", <>f<sub>min</sub> (m)</>, 0.05)}
              {veld("GM_min", <>GM<sub>min</sub> (m)</>, 0.05)}
              <span className="vd-ctrl-h">Getekende toestand</span>
              <div className="gd-tabs">
                {TOESTANDEN.map((o) => (
                  <button key={o.k} type="button" className={`gd-tab${toestand === o.k ? " active" : ""}`} onClick={() => setToestand(o.k)}>{o.label}</button>
                ))}
              </div>
            </>
          )}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          {deel === 1 && tekenDeel1()}
          {deel === 2 && tekenDeel2()}
          {deel === 3 && tekenDeel3()}
          {deel !== 1 && lastenTabel}
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of een rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">{voet}</span>
      </div>
    </div>
  );
}
