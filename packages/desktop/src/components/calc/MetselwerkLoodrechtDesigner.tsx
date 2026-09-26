import type { ReactNode } from "react";
import { useDesigner, Dim, Force, Ro, Defs, loadMark, betonFill, HDim, VDim, fmt, clamp, UitkomstKop, JaNee } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het blad Metselwerk loodrecht belast
 * (templates/metselwerkLoodrecht.ts), per geval:
 *
 *   1. Wand of strook — zijaanzicht van een staande strook (twee steunen of
 *      uitkragend) met de momentenlijn, bovenaanzicht van een liggende strook,
 *      of het aanzicht van een paneel met de gesteunde randen.
 *   2. Spouwmuur — doorsnede over een verdieping met beide bladen, de
 *      spouwankers en de steunen volgens de randvoorwaarde, en zo nodig het
 *      gevelstuk met het penant tussen twee openingen.
 *   3. Kelderwand — doorsnede met de aanvulling, de bovenbelasting en de
 *      verticale belasting.
 *   4. Stabiliteitswand — aanzicht met V, N en M en het gedrukte deel l_c.
 *
 * Het beeld rekent niet: de kop toont de UC en het oordeel van het blad, en de
 * getallen in de tekening (M_Ed, q_u, l_c, …) komen uit de uitwerking.
 * Materiaal en de overige invoer staan in het blad zelf.
 */
const MARKER = "Metselwerk loodrecht belast";

const DEFAULTS: Record<string, number> = {
  geval: 1,
  steensoort: 3, steencategorie: 1, f_b: 12, morteltype: 1, f_m: 10, langsvoeg: 1,
  steun: 1, t_w: 214, h_w: 2700, l_w: 4000, W_Ed: 0.9, bron_fx: 1, f_xk1: 0.2, f_xk2: 0.4,
  vert: 1, N_v_Ed: 20, α_2: 0.04,
  type_U: 2, type_R: 2, h_geb: 8, h_vd: 2.7, q_p: 0.85, bron_qu: 1, q_u: 1.0,
  penant: 1, b_01: 1.8, b_02: 0.9, b_2: 0.9, k_0: 1.3, k_1: 1.55,
  ca_keuze: 1, c_pe_10: 0.8, c_pi: 0.2, F_t_dec: 1.6, F_c_dec: 1.2, n_t: 5,
  t_k: 300, h_k: 2600, h_e: 2200, b_c: 4000, ρ_e: 18, q_k: 5, N_Ed_max: 180, N_Ed_min: 50,
  l_s: 3000, t_s: 100, f_vk0: 0.2, stootvoegen: 1, V_Ed: 20, N_s_Ed: 80, M_s_Ed: 60,
};

const GEVALLEN = [
  { v: 1, label: "Wand of strook loodrecht belast" },
  { v: 2, label: "Spouwmuur onder wind" },
  { v: 3, label: "Kelderwand met gronddruk" },
  { v: 4, label: "Stabiliteitswand op afschuiving" },
];
const STEUNEN = [
  { v: 1, label: "Staande strook, boven en onder gesteund" },
  { v: 2, label: "Staande strook, uitkragend" },
  { v: 3, label: "Liggende strook tussen twee steunen" },
  { v: 4, label: "Paneel langs 3 of 4 randen" },
];
const TYPE_U = [
  { v: 1, label: "U1 — beide bladen gemetseld" },
  { v: 2, label: "U2 — binnenblad gelijmd" },
  { v: 3, label: "U3 — beide bladen gelijmd" },
];
const TYPE_R = [
  { v: 1, label: "R1 — gesteund, gesteund" },
  { v: 2, label: "R2 — ongesteund, gesteund" },
  { v: 3, label: "R3 — gesteund, ongesteund" },
  { v: 4, label: "R4 — ongesteund, ongesteund" },
];
const CA = [
  { v: 1, label: "2,0 — overige gevallen" },
  { v: 2, label: "1,5 — stijf gesteund binnenblad" },
  { v: 3, label: "3,0 — binnenblad boven niet gesteund" },
];

const STEEN = "#f1ece3", STEENLIJN = "#8a7a5c", GROND = "#e8dcc4", MOMENT = "#7c3aed";

/** Rij belastingspijlen loodrecht op een vlak, van (x0,y0)→(x1,y1) verdeeld. */
function Pijlen(props: { k: string; n: number; van: (i: number) => [number, number]; naar: (i: number) => [number, number] }) {
  return (
    <g>
      {Array.from({ length: props.n }, (_, i) => {
        const [x1, y1] = props.van(i), [x2, y2] = props.naar(i);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="vd-load" markerEnd={loadMark(props.k)} />;
      })}
    </g>
  );
}

/** Een tekenvlak met onderschrift; de kinderen tekenen in (w × h). */
function Vlak({ titel, w, h, svg, chips }: { titel: ReactNode; w: number; h: number; svg: ReactNode; chips?: ReactNode }) {
  return (
    <div className="vd-canvas">
      <div className="vd-caption">{titel}</div>
      <div className="vd-stage" style={{ width: w, height: h, background: "transparent", border: "none", borderRadius: 0 }}>
        <svg width={w} height={h} className="vd-svg">{svg}</svg>
        {chips}
      </div>
    </div>
  );
}

export default function MetselwerkLoodrechtDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const g = uitkomst?.getallen ?? {};
  const w = (naam: string, dec: number) => (Number.isFinite(g[naam]) ? fmt(g[naam], dec) : "—");
  const geval = clamp(Math.round(d("geval")), 1, 4);
  const keuze = (naam: string, opties: { v: number; label: string }[], label: string) => (
    <label style={{ flexDirection: "column", alignItems: "stretch" }}>{label}
      <select style={{ width: "100%" }} value={Math.round(d(naam))} onChange={(e) => set(naam, parseInt(e.target.value))}>
        {opties.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  );

  const W = Math.max(260, box.w);
  const H = Math.max(260, box.h - 56);

  let beeld: ReactNode = null;
  let voet: ReactNode = null;
  let bediening: ReactNode = null;

  if (geval === 1) {
    const steun = clamp(Math.round(d("steun")), 1, 4);
    const t = Math.max(10, d("t_w")), h = Math.max(100, d("h_w")), l = Math.max(100, d("l_w"));
    const mv = steun !== 3 && Math.round(d("vert")) === 2;
    bediening = (
      <>
        {keuze("steun", STEUNEN, "Ondersteuning")}
        {steun !== 3 && (
          <JaNee label="Gunstige verticale belasting" waarde={mv} onChange={(v) => set("vert", v ? 2 : 1)} />
        )}
      </>
    );
    voet = <>f<sub>xd1</sub> = {w("f_xd1", 3)} · f<sub>xd2</sub> = {w("f_xd2", 3)} N/mm²{mv && <> · f<sub>xd1,app</sub> = {w("f_xd1_app", 3)}</>}
      {steun === 4 ? <> · μ = {w("μ", 2)} · M<sub>Ed1</sub> = {w("M_Ed1", 2)} · M<sub>Ed2</sub> = {w("M_Ed2", 2)} kNm</>
        : <> · M<sub>Ed</sub> = {w("M_Ed", 2)} · M<sub>Rd</sub> = {w("M_Rd", 2)} kNm per m</>}</>;

    if (steun <= 2) {
      // Zijaanzicht van een staande strook; dikte overdreven waar nodig.
      const s = Math.min((H - 110) / h, 1);
      const tPx = clamp(t * s, 12, W * 0.12);
      const cx = W * 0.42, x0 = cx - tPx / 2, x1 = cx + tPx / 2;
      const yT = 48, yB = yT + h * s;
      const mX = x1 + 70, mA = Math.min(70, W - mX - 30);
      const M = (z: number) => (steun === 1 ? 4 * z * (1 - z) : z * z); // z = 0 boven, 1 onder
      const pad = Array.from({ length: 21 }, (_, i) => {
        const z = i / 20;
        return `${i === 0 ? "M" : "L"} ${mX + M(z) * mA} ${yT + z * (yB - yT)}`;
      }).join(" ");
      beeld = (
        <Vlak titel={steun === 1 ? "Zijaanzicht — staande strook op twee steunen" : "Zijaanzicht — uitkragende wand"} w={W} h={H}
          svg={<>
            <Defs k="m1" />
            <rect x={x0} y={yT} width={tPx} height={yB - yT} fill={STEEN} stroke={STEENLIJN} strokeWidth={1.5} />
            {steun === 1 ? (
              <>
                <rect x={x1} y={yT - 12} width={56} height={12} fill={betonFill("m1")} stroke="#6b7280" />
                <rect x={x1} y={yB} width={56} height={12} fill={betonFill("m1")} stroke="#6b7280" />
                <path d={`M ${x0 - 2} ${yT} l -8 -6 v 12 Z M ${x0 - 2} ${yB} l -8 -6 v 12 Z`} fill="#374151" />
              </>
            ) : (
              <rect x={x0 - 60} y={yB} width={tPx + 120} height={16} fill={GROND} stroke="#a58d5f" />
            )}
            <Pijlen k="m1" n={8} van={(i) => [x0 - 46, yT + (i + 0.5) * (yB - yT) / 8]} naar={(i) => [x0 - 3, yT + (i + 0.5) * (yB - yT) / 8]} />
            <line x1={mX} y1={yT} x2={mX} y2={yB} stroke="#9ca3af" strokeWidth={0.8} />
            <path d={`${pad} L ${mX} ${yB}`} fill="none" stroke={MOMENT} strokeWidth={1.4} />
            <VDim k="m1" y0={yT} y1={yB} x={x0 - 70} ext={x0 - 4} />
            <HDim k="m1" x0={x0} x1={x1} y={yB + (steun === 1 ? 32 : 36)} ext={yB + 2} />
          </>}
          chips={<>
            <Dim ctx={ctx} name="h_w" value={h} x={x0 - 70} y={(yT + yB) / 2} step={100} label="h" />
            <Dim ctx={ctx} name="t_w" value={t} x={cx} y={yB + (steun === 1 ? 32 : 36)} step={10} label="t" />
            <Force ctx={ctx} name="W_Ed" value={d("W_Ed")} x={x0 - 46} y={yT - 22} unit="kN/m²" label="W" step={0.1} dec={2} />
            <Ro text={`M_Ed = ${w("M_Ed", 2)} kNm`} x={mX + mA * 0.5} y={steun === 1 ? (yT + yB) / 2 : yB + 16} kleur={MOMENT} />
          </>} />
      );
    } else if (steun === 3) {
      // Bovenaanzicht van een liggende strook tussen twee verticale steunen.
      const s = Math.min((W - 100) / l, 1);
      const tPx = clamp(t * s, 12, 60);
      const x0 = (W - l * s) / 2, x1 = x0 + l * s, cy = H * 0.36;
      beeld = (
        <Vlak titel="Bovenaanzicht — liggende strook" w={W} h={H}
          svg={<>
            <Defs k="m3" />
            <rect x={x0} y={cy - tPx / 2} width={x1 - x0} height={tPx} fill={STEEN} stroke={STEENLIJN} strokeWidth={1.5} />
            <rect x={x0 - 18} y={cy - tPx / 2 - 20} width={18} height={tPx + 40} fill={betonFill("m3")} stroke="#6b7280" />
            <rect x={x1} y={cy - tPx / 2 - 20} width={18} height={tPx + 40} fill={betonFill("m3")} stroke="#6b7280" />
            <Pijlen k="m3" n={9} van={(i) => [x0 + (i + 0.5) * (x1 - x0) / 9, cy + tPx / 2 + 44]} naar={(i) => [x0 + (i + 0.5) * (x1 - x0) / 9, cy + tPx / 2 + 3]} />
            <HDim k="m3" x0={x0} x1={x1} y={cy - tPx / 2 - 40} ext={cy - tPx / 2 - 4} />
            <VDim k="m3" y0={cy - tPx / 2} y1={cy + tPx / 2} x={x1 + 44} ext={x1 + 20} />
          </>}
          chips={<>
            <Dim ctx={ctx} name="l_w" value={l} x={(x0 + x1) / 2} y={cy - tPx / 2 - 40} step={100} label="l" />
            <Dim ctx={ctx} name="t_w" value={t} x={x1 + 44} y={cy} step={10} label="t" />
            <Force ctx={ctx} name="W_Ed" value={d("W_Ed")} x={(x0 + x1) / 2} y={cy + tPx / 2 + 62} unit="kN/m²" label="W" step={0.1} dec={2} />
            <Ro text="breukvlak loodrecht op de lintvoegen: f_xd2" x={(x0 + x1) / 2} y={cy + tPx / 2 + 88} />
          </>} />
      );
    } else {
      // Aanzicht van een paneel; de bovenrand kan vrij of gesteund zijn.
      const s = Math.min((W - 80) / l, (H - 150) / h);
      const x0 = (W - l * s) / 2, x1 = x0 + l * s, yT = 50, yB = yT + h * s;
      const rif = Math.min((x1 - x0) / 2, (yB - yT) / 2);
      beeld = (
        <Vlak titel="Aanzicht — paneel (α₂ uit bijlage E)" w={W} h={H}
          svg={<>
            <Defs k="m4" />
            <rect x={x0} y={yT} width={x1 - x0} height={yB - yT} fill={STEEN} stroke={STEENLIJN} strokeWidth={1} />
            <path d={`M ${x0} ${yT} V ${yB} H ${x1} V ${yT}`} fill="none" stroke="#374151" strokeWidth={4} />
            <line x1={x0} y1={yT} x2={x1} y2={yT} stroke="#374151" strokeWidth={2} strokeDasharray="7 5" />
            <path d={`M ${x0} ${yB} L ${x0 + rif} ${yB - rif} L ${x1 - rif} ${yB - rif} L ${x1} ${yB} M ${x0 + rif} ${yB - rif} L ${x0} ${yT} M ${x1 - rif} ${yB - rif} L ${x1} ${yT}`}
              fill="none" stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 4" />
            <HDim k="m4" x0={x0} x1={x1} y={yB + 30} ext={yB + 4} />
            <VDim k="m4" y0={yT} y1={yB} x={x0 - 34} ext={x0 - 6} />
          </>}
          chips={<>
            <Dim ctx={ctx} name="l_w" value={l} x={(x0 + x1) / 2} y={yB + 30} step={100} label="l" />
            <Dim ctx={ctx} name="h_w" value={h} x={x0 - 34} y={(yT + yB) / 2} step={100} label="h" />
            <Ro text="bovenrand vrij of gesteund — kies de tabel van figuur E.1" x={(x0 + x1) / 2} y={yT - 14} />
            <Dim ctx={ctx} name="α_2" value={d("α_2")} x={(x0 + x1) / 2} y={(yT + yB) / 2 - 12} step={0.005} dec={3} label="α₂" />
            <Ro text={`μ = ${w("μ", 2)} · h/l = ${fmt(h / l, 2)}`} x={(x0 + x1) / 2} y={(yT + yB) / 2 + 14} />
            <Force ctx={ctx} name="W_Ed" value={d("W_Ed")} x={(x0 + x1) / 2} y={yB + 58} unit="kN/m²" label="W" step={0.1} dec={2} />
          </>} />
      );
    }
  } else if (geval === 2) {
    const R = clamp(Math.round(d("type_R")), 1, 4);
    const buitenGesteund = R === 1 || R === 3, binnenGesteund = R <= 2;
    const hv = Math.max(0.5, d("h_vd"));
    const pen = Math.round(d("penant")) === 2;
    bediening = (
      <>
        {keuze("type_U", TYPE_U, "Type (hechtsterkte)")}
        {keuze("type_R", TYPE_R, "Randvoorwaarde (buiten, binnen)")}
        {keuze("ca_keuze", CA, "Factor c_a spouwankers")}
        <JaNee label="Penant tussen openingen" waarde={pen} onChange={(v) => set("penant", v ? 2 : 1)} />
      </>
    );
    voet = <>q<sub>u</sub> = {w("q_u", 2)} kN/m² · UC spouwmuur = {w("UC_sm", 2)}{pen && <> · k<sub>p</sub> = {w("k_p", 2)} · UC penant = {w("UC_pen", 2)}</>}
      {" "}· W<sub>Ed</sub> = {w("W_a_Ed", 2)} kN/m² · n<sub>t,nodig</sub> = {w("n_t_nodig", 2)} per m² · UC ankers = {w("UC_ank", 2)}</>;

    const WA = W;
    const HA = pen ? Math.max(240, H * 0.55) : H;
    const yT = 46, yB = HA - 50, cx = WA * 0.5;
    const blad = 18, spouw = 30;
    const xb0 = cx - spouw / 2 - blad, xb1 = cx - spouw / 2, xi0 = cx + spouw / 2, xi1 = xi0 + blad;
    const steunTeken = (x: number, y: number, links: boolean) => (
      <path d={links ? `M ${x - 1} ${y} l -9 -6 v 12 Z` : `M ${x + 1} ${y} l 9 -6 v 12 Z`} fill="#374151" />
    );
    const doorsnede = (
      <Vlak key="d" titel="Doorsnede over een verdieping" w={WA} h={HA}
        svg={<>
          <Defs k="s1" />
          <rect x={xb0} y={yT - 10} width={blad} height={yB - yT + 20} fill={STEEN} stroke={STEENLIJN} strokeWidth={1.3} />
          <rect x={xi0} y={yT - 10} width={blad} height={yB - yT + 20} fill={STEEN} stroke={STEENLIJN} strokeWidth={1.3} />
          <rect x={xi1} y={yT - 8} width={Math.min(80, WA - xi1 - 10)} height={14} fill={betonFill("s1")} stroke="#6b7280" />
          <rect x={xi1} y={yB - 6} width={Math.min(80, WA - xi1 - 10)} height={14} fill={betonFill("s1")} stroke="#6b7280" />
          {Array.from({ length: 6 }, (_, i) => {
            const y = yT + ((i + 0.5) * (yB - yT)) / 6;
            return <line key={i} x1={xb1 - 5} y1={y} x2={xi0 + 5} y2={y + 3} stroke="#1d4ed8" strokeWidth={1.4} />;
          })}
          {buitenGesteund && <>{steunTeken(xb0, yT, true)}{steunTeken(xb0, yB, true)}</>}
          {binnenGesteund && <>{steunTeken(xi1, yT + 14, false)}{steunTeken(xi1, yB - 10, false)}</>}
          <Pijlen k="s1" n={7} van={(i) => [xb0 - 50, yT + ((i + 0.5) * (yB - yT)) / 7]} naar={(i) => [xb0 - 3, yT + ((i + 0.5) * (yB - yT)) / 7]} />
          <VDim k="s1" y0={yT} y1={yB} x={xi1 + 96 > WA - 10 ? xb0 - 70 : xi1 + 96} ext={xi1 + 96 > WA - 10 ? xb0 - 6 : xi1 + 4} />
        </>}
        chips={<>
          <Dim ctx={ctx} name="h_vd" value={hv} x={xi1 + 96 > WA - 10 ? xb0 - 70 : xi1 + 96} y={(yT + yB) / 2 + 20} step={0.1} dec={2} label="l" />
          <Force ctx={ctx} name="q_p" value={d("q_p")} x={Math.max(56, xb0 - 30)} y={yT - 26} unit="kN/m²" label="q_p" step={0.05} dec={2} />
          <Ro text="buitenblad" x={(xb0 + xb1) / 2} y={yB + 24} />
          <Ro text="binnenblad" x={(xi0 + xi1) / 2 + 10} y={yB + 38} />
          <Ro text={`q_u = ${w("q_u", 2)} kN/m²`} x={Math.min(xi1 + 60, WA - 60)} y={yT - 30} kleur="#1d4ed8" />
        </>} />
    );
    let gevel: ReactNode = null;
    if (pen) {
      const b01 = Math.max(0, d("b_01")), b02 = Math.max(0, d("b_02")), b2 = Math.max(0.05, d("b_2"));
      const WB = W, HB = Math.max(200, H - HA - 40);
      const rand = 0.5, tot = b01 + b2 + b02 + 2 * rand;
      const s = Math.min((WB - 40) / tot, (HB - 110) / hv);
      const x0 = (WB - tot * s) / 2, yG = 44, yO = yG + hv * s;
      const xo1 = x0 + rand * s, xp = xo1 + b01 * s, xo2 = xp + b2 * s, xe = xo2 + b02 * s;
      const opening = (xa: number, xb: number) => (
        <g>
          <rect x={xa} y={yG + 0.2 * hv * s} width={xb - xa} height={0.62 * hv * s} fill="#eef2f7" stroke="#6b7280" />
          <path d={`M ${xa} ${yG + 0.2 * hv * s} L ${xb} ${yG + 0.82 * hv * s} M ${xb} ${yG + 0.2 * hv * s} L ${xa} ${yG + 0.82 * hv * s}`} stroke="#9ca3af" strokeWidth={0.8} />
        </g>
      );
      gevel = (
        <Vlak key="g" titel="Gevel — penant tussen twee openingen" w={WB} h={HB}
          svg={<>
            <Defs k="s2" />
            <rect x={x0} y={yG} width={tot * s} height={yO - yG} fill={STEEN} stroke={STEENLIJN} strokeWidth={1} strokeDasharray="5 4" />
            {b01 > 0 && opening(xo1, xp)}
            {b02 > 0 && opening(xo2, xe)}
            <rect x={xp} y={yG} width={xo2 - xp} height={yO - yG} fill="#e9dcc3" stroke={STEENLIJN} strokeWidth={1.5} />
            <HDim k="s2" x0={xo1} x1={xp} y={yO + 26} ext={yO + 4} />
            <HDim k="s2" x0={xp} x1={xo2} y={yO + 26} ext={yO + 4} />
            <HDim k="s2" x0={xo2} x1={xe} y={yO + 26} ext={yO + 4} />
          </>}
          chips={<>
            <Dim ctx={ctx} name="b_01" value={b01} x={(xo1 + xp) / 2} y={yO + 26} step={0.1} dec={2} label="b01" />
            <Dim ctx={ctx} name="b_2" value={b2} x={(xp + xo2) / 2} y={yO + 52} step={0.1} dec={2} label="b2" />
            <Dim ctx={ctx} name="b_02" value={b02} x={(xo2 + xe) / 2} y={yO + 26} step={0.1} dec={2} label="b02" />
            <Ro text="b01 is de breedste opening" x={(x0 + x0 + tot * s) / 2} y={yO + 74} />
            <Ro text={`q_ep = ${w("q_ep", 2)} kN/m²`} x={(xp + xo2) / 2} y={yG - 12} kleur="#dc2626" />
          </>} />
      );
    }
    beeld = <>{doorsnede}{gevel}</>;
  } else if (geval === 3) {
    const t = Math.max(50, d("t_k")), h = Math.max(200, d("h_k")), he = clamp(d("h_e"), 0, h * 1.5);
    voet = <>f<sub>d</sub> = {w("f_d", 2)} N/mm² · β = {w("β_k", 1)} · N<sub>Rd,max</sub> = {w("N_Rd_max", 1)} kN · N<sub>Ed,min</sub> nodig = {w("N_Ed_nodig", 1)} kN per m</>;
    const s = Math.min((H - 120) / Math.max(h, he), 0.2);
    const tPx = clamp(t * s, 16, W * 0.1);
    const cx = W * 0.55, x0 = cx - tPx / 2, x1 = cx + tPx / 2;
    const yT = 64, yB = yT + h * s, yM = yB - he * s;
    beeld = (
      <Vlak titel="Doorsnede kelderwand" w={W} h={H}
        svg={<>
          <Defs k="k1" />
          <rect x={20} y={yM} width={x0 - 20} height={yB - yM + 16} fill={GROND} stroke="#a58d5f" />
          <rect x={x0} y={yT} width={tPx} height={yB - yT} fill={STEEN} stroke={STEENLIJN} strokeWidth={1.5} />
          <rect x={x0} y={yT - 14} width={Math.min(W - x0 - 20, 150)} height={14} fill={betonFill("k1")} stroke="#6b7280" />
          <rect x={x1} y={yB - 12} width={Math.min(W - x1 - 20, 136)} height={12} fill={betonFill("k1")} stroke="#6b7280" />
          <path d={`M ${x0 - 2} ${yM} L ${x0 - 2 - Math.min(70, x0 - 40)} ${yB} L ${x0 - 2} ${yB} Z`} fill="#dc2626" opacity={0.12} stroke="#dc2626" strokeWidth={0.8} />
          <Pijlen k="k1" n={5} van={(i) => [30 + i * (x0 - 60) / 4, yM - 30]} naar={(i) => [30 + i * (x0 - 60) / 4, yM - 2]} />
          <line x1={cx} y1={yT - 58} x2={cx} y2={yT - 16} className="vd-load" strokeWidth={3} markerEnd={loadMark("k1")} />
          <VDim k="k1" y0={yT} y1={yB} x={x1 + 170 < W - 10 ? x1 + 170 : W - 16} ext={x1 + 4} />
          <VDim k="k1" y0={yM} y1={yB} x={x0 - 24} />
          <HDim k="k1" x0={x0} x1={x1} y={yB + 36} ext={yB + 2} />
        </>}
        chips={<>
          <Dim ctx={ctx} name="h_k" value={h} x={x1 + 170 < W - 10 ? x1 + 170 : W - 16} y={(yT + yB) / 2} step={100} label="h" />
          <Dim ctx={ctx} name="h_e" value={he} x={x0 - 24} y={(yM + yB) / 2} step={100} label="hₑ" />
          <Dim ctx={ctx} name="t_k" value={t} x={cx} y={yB + 36} step={10} label="t" />
          <Force ctx={ctx} name="N_Ed_max" value={d("N_Ed_max")} x={cx + 70} y={yT - 50} unit="kN" label="N_max" />
          <Force ctx={ctx} name="N_Ed_min" value={d("N_Ed_min")} x={cx + 70} y={yT - 26} unit="kN" label="N_min" />
          <Force ctx={ctx} name="q_k" value={d("q_k")} x={(20 + x0) / 2} y={yM - 44} unit="kN/m²" label="q" step={0.5} dec={1} />
          <Dim ctx={ctx} name="b_c" value={d("b_c")} x={(20 + x0) / 2} y={yB + 36} step={500} label="b_c" title="afstand tussen de dwarswanden (in de plattegrond)" />
        </>} />
    );
  } else {
    const l = Math.max(200, d("l_s"));
    const hTek = 0.5 * l;
    bediening = keuze("stootvoegen", [{ v: 1, label: "Gevuld, (3.5)" }, { v: 2, label: "Ongevuld, (3.6)" }], "Stootvoegen");
    voet = <>e = {w("e_s", 0)} mm · l<sub>c</sub> = {w("l_c", 0)} mm · σ<sub>d</sub> = {w("σ_d", 3)} · f<sub>vd</sub> = {w("f_vd", 3)} N/mm² · V<sub>Rd</sub> = {w("V_Rd", 1)} kN</>;
    const s = Math.min((W - 110) / l, (H - 170) / hTek);
    const x0 = (W - l * s) / 2, x1 = x0 + l * s, yT = 76, yB = yT + hTek * s;
    const lc = Number.isFinite(g["l_c"]) ? clamp(g["l_c"], 0, l) : l;
    const xc = x1 - lc * s;
    const vol = lc >= l - 0.5;
    beeld = (
      <Vlak titel="Aanzicht stabiliteitswand" w={W} h={H}
        svg={<>
          <Defs k="w1" />
          <rect x={x0} y={yT} width={x1 - x0} height={yB - yT} fill={STEEN} stroke={STEENLIJN} strokeWidth={1.5} />
          <rect x={x0 - 30} y={yB} width={x1 - x0 + 60} height={10} fill={betonFill("w1")} stroke="#6b7280" />
          <line x1={x0 - 70} y1={yT + 8} x2={x0 - 4} y2={yT + 8} className="vd-load" strokeWidth={3} markerEnd={loadMark("w1")} />
          <line x1={(x0 + x1) / 2} y1={yT - 52} x2={(x0 + x1) / 2} y2={yT - 3} className="vd-load" strokeWidth={3} markerEnd={loadMark("w1")} />
          {vol ? (
            <rect x={x0} y={yB + 10} width={x1 - x0} height={22} fill="#dc2626" opacity={0.15} stroke="#dc2626" strokeWidth={0.8} />
          ) : (
            <path d={`M ${xc} ${yB + 10} L ${x1} ${yB + 10} L ${x1} ${yB + 40} Z`} fill="#dc2626" opacity={0.15} stroke="#dc2626" strokeWidth={0.8} />
          )}
          <HDim k="w1" x0={x0} x1={x1} y={yB + 62} ext={yB + 12} />
        </>}
        chips={<>
          <Dim ctx={ctx} name="l_s" value={l} x={(x0 + x1) / 2} y={yB + 62} step={100} label="l" />
          <Dim ctx={ctx} name="t_s" value={d("t_s")} x={(x0 + x1) / 2} y={(yT + yB) / 2 + 14} step={10} label="t" />
          <Force ctx={ctx} name="V_Ed" value={d("V_Ed")} x={x0 - 44} y={yT - 12} unit="kN" label="V" />
          <Force ctx={ctx} name="N_s_Ed" value={d("N_s_Ed")} x={(x0 + x1) / 2 + 52} y={yT - 40} unit="kN" label="N" />
          <Force ctx={ctx} name="M_s_Ed" value={d("M_s_Ed")} x={(x0 + x1) / 2} y={(yT + yB) / 2 - 14} unit="kNm" label="M" />
          <Ro text={`l_c = ${w("l_c", 0)} mm`} x={(xc + x1) / 2} y={yB + 24} kleur="#dc2626" />
        </>} />
    );
  }

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — metselwerk loodrecht belast" uitkomst={uitkomst} />
      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Geval</span>
          {keuze("geval", GEVALLEN, "Berekening")}
          {bediening && <span className="vd-ctrl-h">Keuzes</span>}
          {bediening}
          <span className="gd-note">Materiaal, sterkten en de overige invoer staan in het blad.</span>
        </div>
        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: geval === 2 && Math.round(d("penant")) === 2 ? "column" : "row", alignItems: geval === 2 && Math.round(d("penant")) === 2 ? "center" : "flex-start", justifyContent: "safe center", gap: 16, flexWrap: "nowrap", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          {beeld}
        </div>
      </div>
      <div className="vd-foot">
        <span>Klik op een blauwe maat of een rode last om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">{voet}</span>
      </div>
    </div>
  );
}

