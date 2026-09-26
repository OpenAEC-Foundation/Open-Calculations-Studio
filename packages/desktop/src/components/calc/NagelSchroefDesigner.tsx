import type { ReactNode } from "react";
import { useDesigner, Dim, Force, Ro, Defs, HDim, VDim, loadMark, fmt, clamp, JaNee, type DesignerCtx } from "./designerKit";
import { useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het rekenblad "Nagel- en schroefverbinding".
 *
 * Twee aanzichten:
 *   • Doorsnede langs het verbindingsmiddel — de elementen in volgorde van kop
 *     naar punt, met hun dikte, en de nagel of schroef op lengte. Bij een
 *     geprofileerde nagel of schroef is het deel met profiel of draad getekend.
 *   • Aanzicht van het element aan de puntzijde — het patroon van n₁ × n₂
 *     verbindingsmiddelen met de afstanden a₁ tot a₄, de vezelrichting en de
 *     kracht onder de hoek α. Is bij een kracht onder een hoek de hoogte h
 *     ingevuld, dan toont het aanzicht het element dat op splijten wordt
 *     getoetst, op die hoogte.
 *
 * Het beeld rekent zelf niets; sterkte, groep en afstandseisen staan in het
 * rekenblad. Alleen de indringdiepte, een zuiver meetkundige maat, staat erbij.
 *
 * Bij de ambachtelijke verbindingen (soort 2 tot en met 4) één aanzicht in het
 * vlak van de verbinding: de keep in zijaanzicht met het keepvlak en het
 * voorhout, pen-en-gat in zijaanzicht met de pen in het gat en de toognagel,
 * de zwaluwstaart in het vlak waarin hij uitwaaiert. Het drukvlak staat in rood.
 */
const MARKER = "Nagel- en schroefverbinding";

const SOORT = [
  { v: 1, label: "Nagels en schroeven" },
  { v: 2, label: "Keep" },
  { v: 3, label: "Pen-en-gat" },
  { v: 4, label: "Zwaluwstaart" },
];

const OPBOUW = [
  { v: 1, label: "Hout – hout" },
  { v: 2, label: "Hout – hout – hout" },
  { v: 3, label: "Plaat – hout" },
  { v: 4, label: "Staalplaat – hout" },
  { v: 5, label: "Hout – staal – hout" },
];
// Dezelfde keuzes als in het rekenblad; `kort` voor de kop en de voetregel.
const MIDDEL = [
  { v: 1, label: "Gladde nagel", kort: "gladde nagel" },
  { v: 2, label: "Vierkante of gegroefde nagel, niet geprofileerd", kort: "vierkante of gegroefde nagel" },
  { v: 3, label: "Ring-, schroef- of andere geprofileerde nagel (EN 14592)", kort: "geprofileerde nagel" },
  { v: 4, label: "Schroef", kort: "schroef" },
];

// Twee planken C24 van 38 en 71 mm, verbonden met tien gladde nagels 3,4 × 90
// in twee rijen. De schroef- en plaatvelden krijgen waarden die bij deze
// diameter passen, zodat omschakelen geen onzin oplevert.
// Voor de ambachtelijke verbindingen: een schoor 100 × 140 onder 40° in een
// balk van 200 hoog; een regel 100 × 180 met een pen 40 × 120 in een stijl van
// 140, met één toognagel van 20 mm (sterkten als voorbeeld, zie EN 338 voor de
// klasse van de toognagel); een zwaluwstaart 60/90 × 60 in een balk van 140.
const DEFAULTS: Record<string, number> = {
  soort: 1,
  klimaat: 1, duur: 3, opbouw: 1, klasse_1: 6, klasse_2: 6, t_1: 38, t_2: 71,
  plaat: 1, "ρ_pl": 420, t_s: 5,
  middel: 1, d_v: 3.4, l_v: 90, d_h: 8, f_u: 600, d_1: 2.4, l_g: 60,
  f_head_k: 10, f_tens_k: 3.5, "ρ_a": 350, f_ax_in: 12, "α_s": 90,
  f_ax_nk: 4.5, f_head_nk: 10, voorboren: 0, M_y_in: 0, f_head_p: 10,
  n_1: 5, n_2: 2, versprongen: 0, a_1: 40, a_2: 25, a_3: 60, a_4: 25,
  eind: 1, rand: 0, "α": 0, F_v_Ed: 4, F_ax_Ed: 0, ax_lang: 0,
  keepvorm: 1, "β_k": 40, b_k: 100, h_s: 140, h_k: 200, t_v: 40, l_vh: 300, N_s_Ed: 30,
  stand: 2, b_p: 40, h_p: 120, l_p: 80, b_2: 100, h_2: 180, a_o: 30, l_1: 140, h_1: 140, e_g: 60,
  V_Ed: 6, N_c_Ed: 0, N_t_Ed: 4, toognagel: 1, n_t: 1, d_t: 20, e_t: 40, f_v_k_t: 3, f_c_90_k_t: 8,
  b_zh: 60, b_ze: 90, l_z: 60, t_z: 60, a_k: 100,
};

// Element 2 (schoor, pen, zwaluwstaart) iets donkerder dan element 1.
const VULLING_2 = { fill: "#EBD3A6", stroke: "#8B6F47" };
const RAD = Math.PI / 180;

interface Ambacht { kop: ReactNode; bediening: ReactNode; tekening: ReactNode; voet: ReactNode }

/**
 * Het aanzicht van een keep, pen-en-gat of zwaluwstaart. Tekent in mm en
 * schaalt het geheel in het vak van W × H; de klikbare maten schrijven in het
 * blad, net als bij de stiftvormige verbindingen.
 */
function ambachtBeeld(ctx: DesignerCtx, soort: number, W: number, H: number, afdruk: boolean): Ambacht {
  const { d, set } = ctx;
  const capH = 24;
  const CH = Math.max(260, H - capH);
  const mL = 56, mR = 86, mT = 56, mB = 58;
  // Schaal en verschuiving voor een kader [x0, x1] × [y0, y1] in mm.
  const pas = (x0: number, x1: number, y0: number, y1: number) => {
    const s = clamp(Math.min((W - mL - mR) / Math.max(1, x1 - x0), (CH - mT - mB) / Math.max(1, y1 - y0)), 0.05, 6);
    const ox = mL + ((W - mL - mR) - (x1 - x0) * s) / 2 - x0 * s;
    const oy = mT + ((CH - mT - mB) - (y1 - y0) * s) / 2 - y0 * s;
    return { s, X: (x: number) => ox + x * s, Y: (y: number) => oy + y * s };
  };
  const pts = (p: { x: number; y: number }[], X: (x: number) => number, Y: (y: number) => number) =>
    p.map((q) => `${X(q.x)},${Y(q.y)}`).join(" ");
  const titel = SOORT.find((o) => o.v === soort)?.label ?? "";

  let tekening: ReactNode = null, bediening: ReactNode = null, badge = "", live = "";

  if (soort === 2) {
    // ── Keep: zijaanzicht, element 1 liggend, de schoor van linksboven ──
    const beta = clamp(d("β_k"), 5, 85);
    const vorm = Math.round(d("keepvorm")) === 2 ? 2 : 1;
    const phi = vorm === 1 ? beta / 2 : beta;
    const tv = Math.max(1, d("t_v")), hk = Math.max(tv + 1, d("h_k")), hs = Math.max(1, d("h_s"));
    const lvh = Math.max(1, d("l_vh")), bk = d("b_k"), N = d("N_s_Ed");
    const T = { x: 0, y: 0 };
    const B = { x: -tv * Math.tan(phi * RAD), y: tv };
    const C = { x: B.x - tv / Math.tan(beta * RAD), y: 0 };
    const u = { x: -Math.cos(beta * RAD), y: -Math.sin(beta * RAD) };
    const n = { x: Math.sin(beta * RAD), y: -Math.cos(beta * RAD) };
    const Ls = Math.max(2.2 * hs, 1.6 * hk);
    const Eu = { x: B.x + hs * n.x, y: B.y + hs * n.y };
    const S1 = { x: B.x + Ls * u.x, y: B.y + Ls * u.y }, S2 = { x: Eu.x + Ls * u.x, y: Eu.y + Ls * u.y };
    const xL = Math.min(C.x, S1.x, S2.x) - 0.4 * hk, xE = lvh;
    const { s, X, Y } = pas(xL, xE, Math.min(S1.y, S2.y, Eu.y), hk);
    const M = { x: (S1.x + S2.x) / 2, y: (S1.y + S2.y) / 2 };
    const pijl = 46 / s;
    const A0 = { x: M.x + u.x * pijl, y: M.y + u.y * pijl };
    tekening = (
      <div className="vd-canvas">
        <div className="vd-caption">Zijaanzicht: schoor (element 2) in de keep van element 1</div>
        <div className="vd-stage" style={{ width: W, height: CH, background: "transparent", border: "none", borderRadius: 0 }}>
          <svg width={W} height={CH} className="vd-svg">
            <Defs k="nk" />
            <polygon points={pts([{ x: xL, y: 0 }, C, B, T, { x: xE, y: 0 }, { x: xE, y: hk }, { x: xL, y: hk }], X, Y)}
              fill={VULLING.hout.fill} stroke={VULLING.hout.stroke} strokeWidth={1.3} />
            <line x1={X(xL)} y1={Y(0)} x2={X(xL)} y2={Y(hk)} stroke="#F5E6C8" strokeWidth={2} />
            <line x1={X(xL)} y1={Y(0)} x2={X(xL)} y2={Y(hk)} stroke="#8B6F47" strokeWidth={0.9} strokeDasharray="6 3" />
            {[0.35, 0.65, 0.88].map((f) => (
              <line key={f} x1={X(xL) + 6} y1={Y(hk * f)} x2={X(xE) - 6} y2={Y(hk * f)} stroke="#8B6F47" strokeWidth={0.5} strokeDasharray="14 6" opacity={0.35} />
            ))}
            <polygon points={pts([B, T, Eu, S2, S1], X, Y)} fill={VULLING_2.fill} stroke={VULLING_2.stroke} strokeWidth={1.3} />
            {[0.33, 0.66].map((f) => (
              <line key={f} x1={X(B.x + n.x * hs * f + u.x * hs * 0.4)} y1={Y(B.y + n.y * hs * f + u.y * hs * 0.4)}
                x2={X(B.x + n.x * hs * f + u.x * Ls * 0.95)} y2={Y(B.y + n.y * hs * f + u.y * Ls * 0.95)}
                stroke="#8B6F47" strokeWidth={0.5} strokeDasharray="14 6" opacity={0.35} />
            ))}
            {/* keepvlak (druk) en afschuifvlak van het voorhout */}
            <line x1={X(B.x)} y1={Y(B.y)} x2={X(T.x)} y2={Y(T.y)} stroke="#b91c1c" strokeWidth={3} />
            <line x1={X(B.x)} y1={Y(tv)} x2={X(xE)} y2={Y(tv)} stroke="#b91c1c" strokeWidth={1} strokeDasharray="5 3" />
            {/* maten */}
            <HDim k="nk" x0={X(T.x)} x1={X(xE)} y={Y(0) - 16} ext={Y(0) - 3} />
            <VDim k="nk" y0={Y(0)} y1={Y(tv)} x={X(xE) + 18} ext={X(xE) + 3} />
            <VDim k="nk" y0={Y(0)} y1={Y(hk)} x={X(xE) + 52} ext={X(xE) + 3} />
            <line x1={X(A0.x)} y1={Y(A0.y)} x2={X(M.x)} y2={Y(M.y)} className="vd-load" strokeWidth={2.8} markerEnd={loadMark("nk")} />
            <text x={X(xL) + 4} y={Y(hk) + 44} fill="#6b7280" fontSize={10}>rood: keepvlak (druk) en afschuifvlak van het voorhout</text>
          </svg>
          <Dim ctx={ctx} name="l_vh" value={lvh} x={(X(T.x) + X(xE)) / 2} y={Y(0) - 16} step={10} label="lv" />
          <Dim ctx={ctx} name="t_v" value={tv} x={X(xE) + 18} y={(Y(0) + Y(tv)) / 2} step={5} label="tv" />
          <Dim ctx={ctx} name="h_k" value={hk} x={X(xE) + 52} y={(Y(0) + Y(hk)) / 2 + 10} step={10} label="h" />
          <Dim ctx={ctx} name="β_k" value={beta} x={X(C.x) - 34} y={Y(0) - 22} step={5} label="β" />
          <Dim ctx={ctx} name="h_s" value={hs} x={X(B.x + u.x * Ls * 0.55 + n.x * hs * 1.15)} y={Y(B.y + u.y * Ls * 0.55 + n.y * hs * 1.15)} step={10} label="hs" />
          <Dim ctx={ctx} name="b_k" value={bk} x={X(xL) + 30} y={Y(hk) + 16} step={10} label="b" title="breedte van het keepvlak — klik om te wijzigen" />
          <Force ctx={ctx} name="N_s_Ed" value={N} x={X(A0.x)} y={Y(A0.y) - 22} unit="kN" label="N" step={5} dec={1} />
        </div>
      </div>
    );
    bediening = (
      <label>Keepvlak
        <select value={vorm} onChange={(e) => set("keepvorm", parseInt(e.target.value))}>
          <option value={1}>Op de middellijn</option>
          <option value={2}>Haaks op de schoor</option>
        </select>
      </label>
    );
    badge = `β = ${fmt(beta)}° · tv = ${fmt(tv)} mm · N = ${fmt(N, 1)} kN`;
    live = `keepvlak ${vorm === 1 ? "op de middellijn" : "haaks op de schoor"} · b = ${fmt(bk)} mm · voorhout ${fmt(lvh)} mm`;
  } else if (soort === 3) {
    // ── Pen-en-gat: zijaanzicht, element 2 komt van rechts ──
    const stand = Math.round(d("stand")) === 1 ? 1 : 2;
    const hp = Math.max(1, d("h_p")), lp = Math.max(1, d("l_p")), h2 = Math.max(hp, d("h_2"));
    const ao = clamp(d("a_o"), 0, h2 - hp), l1 = Math.max(lp, d("l_1")), bp = d("b_p"), b2 = d("b_2");
    const peg = Math.round(d("toognagel")) === 1, dt = Math.max(1, d("d_t")), et = clamp(d("e_t"), 0, l1);
    const V = d("V_Ed"), Nc = d("N_c_Ed"), Nt = d("N_t_Ed");
    const h1 = Math.max(hp + 1, d("h_1")), eg = clamp(d("e_g"), 0, h1 - hp);
    // Bij een balk (stand 1) is element 1 een doorsnede van h1 hoog; bij een stijl loopt hij door.
    const yMb = stand === 1 ? h1 - eg : h2 - ao, yMt = yMb - hp;
    const y2b = yMb + ao, y2a = y2b - h2;
    const y1a = stand === 1 ? 0 : y2a - 0.5 * h2, y1b = stand === 1 ? h1 : y2b + 0.5 * h2;
    const L2 = Math.max(1.4 * h2, 1.1 * l1);
    const { s, X, Y } = pas(0, l1 + L2, Math.min(y1a, y2a), Math.max(y1b, y2b));
    const yTop = Math.min(Y(y1a), Y(y2a));
    tekening = (
      <div className="vd-canvas">
        <div className="vd-caption">Zijaanzicht: element 2 met de pen in het gat van element 1{stand === 1 ? " (balk, in doorsnede)" : " (stijl)"}</div>
        <div className="vd-stage" style={{ width: W, height: CH, background: "transparent", border: "none", borderRadius: 0 }}>
          <svg width={W} height={CH} className="vd-svg">
            <Defs k="np3" />
            <rect x={X(0)} y={Y(y1a)} width={l1 * s} height={(y1b - y1a) * s} fill={VULLING.hout.fill} stroke={VULLING.hout.stroke} strokeWidth={1.3} />
            {stand === 1 ? (
              [0.18, 0.32].map((f) => (
                <ellipse key={f} cx={X(l1 * 0.3)} cy={Y((y1a + y1b) / 2)} rx={l1 * s * f * 1.4} ry={(y1b - y1a) * s * f} fill="none" stroke="#8B6F47" strokeWidth={0.6} opacity={0.35} />
              ))
            ) : (
              <>
                {[0.25, 0.5, 0.75].map((f) => (
                  <line key={f} x1={X(l1 * f)} y1={Y(y1a) + 4} x2={X(l1 * f)} y2={Y(y1b) - 4} stroke="#8B6F47" strokeWidth={0.5} strokeDasharray="14 6" opacity={0.35} />
                ))}
                <line x1={X(0)} y1={Y(y1a)} x2={X(l1)} y2={Y(y1a)} stroke="#F5E6C8" strokeWidth={2} />
                <line x1={X(0)} y1={Y(y1a)} x2={X(l1)} y2={Y(y1a)} stroke="#8B6F47" strokeWidth={0.9} strokeDasharray="6 3" />
                <line x1={X(0)} y1={Y(y1b)} x2={X(l1)} y2={Y(y1b)} stroke="#F5E6C8" strokeWidth={2} />
                <line x1={X(0)} y1={Y(y1b)} x2={X(l1)} y2={Y(y1b)} stroke="#8B6F47" strokeWidth={0.9} strokeDasharray="6 3" />
              </>
            )}
            <rect x={X(l1)} y={Y(y2a)} width={L2 * s} height={h2 * s} fill={VULLING_2.fill} stroke={VULLING_2.stroke} strokeWidth={1.3} />
            {[0.3, 0.7].map((f) => (
              <line key={f} x1={X(l1) + 6} y1={Y(y2a + h2 * f)} x2={X(l1 + L2) - 6} y2={Y(y2a + h2 * f)} stroke="#8B6F47" strokeWidth={0.5} strokeDasharray="14 6" opacity={0.35} />
            ))}
            {/* de pen in het gat, als verborgen lijn */}
            <rect x={X(l1 - lp)} y={Y(yMt)} width={lp * s} height={hp * s} fill={VULLING_2.fill} stroke={VULLING_2.stroke} strokeWidth={1} strokeDasharray="4 3" />
            <line x1={X(l1 - lp)} y1={Y(yMb)} x2={X(l1)} y2={Y(yMb)} stroke="#b91c1c" strokeWidth={3} />
            {peg && (stand === 2 ? (
              <circle cx={X(l1 - et)} cy={Y((yMt + yMb) / 2)} r={Math.max(2.5, (dt / 2) * s)} fill="#e5e7eb" stroke="#374151" strokeWidth={1.1} />
            ) : (
              <rect x={X(l1 - et - dt / 2)} y={Y(y1a)} width={Math.max(2, dt * s)} height={(y1b - y1a) * s} fill="#e5e7eb" stroke="#374151" strokeWidth={0.9} strokeDasharray="4 3" opacity={0.8} />
            ))}
            {/* maten */}
            <HDim k="np3" x0={X(l1 - lp)} x1={X(l1)} y={yTop - 16} ext={Y(yMt)} />
            <HDim k="np3" x0={X(0)} x1={X(l1)} y={Y(y1b) + 18} ext={Y(y1b) + 3} />
            <VDim k="np3" y0={Y(y2a)} y1={Y(y2b)} x={X(l1 + L2) + 18} ext={X(l1 + L2) + 3} />
            <VDim k="np3" y0={Y(yMt)} y1={Y(yMb)} x={X(l1) + 20} />
            {ao > 0 && <VDim k="np3" y0={Y(yMb)} y1={Y(y2b)} x={X(l1) + 50} />}
            {stand === 1 && <VDim k="np3" y0={Y(y1a)} y1={Y(y1b)} x={X(0) - 18} ext={X(0) - 3} />}
            {stand === 1 && <VDim k="np3" y0={Y(yMb)} y1={Y(y1b)} x={X(0) - 44} ext={X(0) - 3} />}
            {peg && <HDim k="np3" x0={X(l1 - et)} x1={X(l1)} y={Y(y1b) + 42} ext={Y(y1b) + 3} />}
            {/* krachten op element 2 */}
            {V > 0 && <line x1={X(l1 + L2 * 0.6)} y1={Y(y2a) - 40} x2={X(l1 + L2 * 0.6)} y2={Y(y2a) - 2} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("np3")} />}
            {Nt > 0 && <line x1={X(l1 + L2) + 4} y1={Y(y2a + h2 * 0.5)} x2={X(l1 + L2) + 42} y2={Y(y2a + h2 * 0.5)} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("np3")} />}
            {Nc > 0 && <line x1={X(l1 + L2) + 42} y1={Y(y2a + h2 * 0.25)} x2={X(l1 + L2) + 4} y2={Y(y2a + h2 * 0.25)} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("np3")} />}
            <text x={X(0)} y={Y(y1b) + 70} fill="#6b7280" fontSize={10}>rood: stuikvlak onder de pen{peg ? "; grijs: de toognagel" : ""}</text>
          </svg>
          <Dim ctx={ctx} name="l_p" value={lp} x={(X(l1 - lp) + X(l1)) / 2} y={yTop - 16} step={5} label="lp" />
          <Dim ctx={ctx} name="l_1" value={l1} x={(X(0) + X(l1)) / 2} y={Y(y1b) + 18} step={10} label="l1" />
          <Dim ctx={ctx} name="h_2" value={h2} x={X(l1 + L2) + 18} y={(Y(y2a) + Y(y2b)) / 2 + 12} step={10} label="h2" />
          <Dim ctx={ctx} name="h_p" value={hp} x={X(l1) + 20} y={(Y(yMt) + Y(yMb)) / 2} step={5} label="hp" />
          {ao > 0 && <Dim ctx={ctx} name="a_o" value={ao} x={X(l1) + 50} y={(Y(yMb) + Y(y2b)) / 2} step={5} label="ao" />}
          {stand === 1 && <Dim ctx={ctx} name="h_1" value={h1} x={X(0) - 18} y={(Y(y1a) + Y(y1b)) / 2 - 12} step={10} label="h1" />}
          {stand === 1 && <Dim ctx={ctx} name="e_g" value={eg} x={X(0) - 44} y={(Y(yMb) + Y(y1b)) / 2} step={5} label="eg" />}
          {peg && <Dim ctx={ctx} name="e_t" value={et} x={(X(l1 - et) + X(l1)) / 2} y={Y(y1b) + 42} step={5} label="et" />}
          {peg && <Dim ctx={ctx} name="d_t" value={dt} x={X(l1 - et)} y={Y((yMt + yMb) / 2) - 26} step={2} label="d" />}
          <Dim ctx={ctx} name="b_p" value={bp} x={X(l1 + L2 * 0.35)} y={Y(y2b) + 16} step={5} label="bp" title="dikte van de pen — klik om te wijzigen" />
          <Dim ctx={ctx} name="b_2" value={b2} x={X(l1 + L2 * 0.75)} y={Y(y2b) + 16} step={10} label="b2" title="breedte van element 2 — klik om te wijzigen" />
          {stand === 2 && <Dim ctx={ctx} name="h_1" value={d("h_1")} x={X(l1 * 0.5)} y={Y(y1a) + 12} step={10} label="h1" title="dikte van de stijl — klik om te wijzigen" />}
          <Force ctx={ctx} name="V_Ed" value={V} x={X(l1 + L2 * 0.6)} y={Y(y2a) - 62} unit="kN" label="V" step={1} dec={1} />
          <Force ctx={ctx} name="N_t_Ed" value={Nt} x={X(l1 + L2) + 34} y={Y(y2a + h2 * 0.5) + 6} unit="kN" label="Nt" step={1} dec={1} />
          <Force ctx={ctx} name="N_c_Ed" value={Nc} x={X(l1 + L2) + 34} y={Y(y2a + h2 * 0.25) - 26} unit="kN" label="Nc" step={1} dec={1} />
        </div>
      </div>
    );
    bediening = (
      <>
        <label>Element 1
          <select value={stand} onChange={(e) => set("stand", parseInt(e.target.value))}>
            <option value={1}>Balk: vezel loodrecht op V</option>
            <option value={2}>Stijl: vezel evenwijdig aan V</option>
          </select>
        </label>
        <JaNee label="Toognagel" waarde={peg} onChange={(v) => set("toognagel", v ? 1 : 0)} />
      </>
    );
    badge = `pen ${fmt(bp)} × ${fmt(hp)} × ${fmt(lp)}${peg ? ` · toognagel ${fmt(dt)}` : ""}`;
    live = `${stand === 1 ? "balk in balk" : "regel in stijl"} · V = ${fmt(V, 1)} kN${Nc > 0 ? ` · Nc = ${fmt(Nc, 1)} kN` : ""}${Nt > 0 ? ` · Nt = ${fmt(Nt, 1)} kN` : ""}`;
  } else {
    // ── Zwaluwstaart: in het vlak waarin hij uitwaaiert; element 2 komt van onder ──
    const bzh = Math.max(1, d("b_zh")), bze = Math.max(bzh + 1, d("b_ze")), lz = Math.max(1, d("l_z"));
    const l1 = Math.max(lz + 1, d("l_1")), ak = Math.max(0, d("a_k")), tz = d("t_z"), Nt = d("N_t_Ed");
    const uit = Math.max(1.1 * l1, 100);
    const xl = -bze / 2 - uit, xr = ak > 0 ? bze / 2 + ak : bze / 2 + uit;
    const L2 = Math.max(1.3 * l1, 140);
    const { X, Y } = pas(xl, xr, 0, l1 + L2);
    const staart = [{ x: -bzh / 2, y: l1 }, { x: bzh / 2, y: l1 }, { x: bze / 2, y: l1 - lz }, { x: -bze / 2, y: l1 - lz }];
    tekening = (
      <div className="vd-canvas">
        <div className="vd-caption">Aanzicht in het vlak van de zwaluwstaart: element 2 trekt naar onder</div>
        <div className="vd-stage" style={{ width: W, height: CH, background: "transparent", border: "none", borderRadius: 0 }}>
          <svg width={W} height={CH} className="vd-svg">
            <Defs k="nz" />
            <rect x={X(xl)} y={Y(0)} width={X(xr) - X(xl)} height={Y(l1) - Y(0)} fill={VULLING.hout.fill} stroke={VULLING.hout.stroke} strokeWidth={1.3} />
            {[{ x: xl, breuk: true }, { x: xr, breuk: ak <= 0 }].filter((r) => r.breuk).map((r) => (
              <g key={r.x}>
                <line x1={X(r.x)} y1={Y(0)} x2={X(r.x)} y2={Y(l1)} stroke="#F5E6C8" strokeWidth={2} />
                <line x1={X(r.x)} y1={Y(0)} x2={X(r.x)} y2={Y(l1)} stroke="#8B6F47" strokeWidth={0.9} strokeDasharray="6 3" />
              </g>
            ))}
            {[0.3, 0.6].map((f) => (
              <line key={f} x1={X(xl) + 6} y1={Y((l1 - lz) * f)} x2={X(xr) - 6} y2={Y((l1 - lz) * f)} stroke="#8B6F47" strokeWidth={0.5} strokeDasharray="14 6" opacity={0.35} />
            ))}
            <rect x={X(-bzh / 2)} y={Y(l1)} width={X(bzh / 2) - X(-bzh / 2)} height={Y(l1 + L2) - Y(l1)} fill={VULLING_2.fill} stroke={VULLING_2.stroke} strokeWidth={1.3} />
            <polygon points={pts(staart, X, Y)} fill={VULLING_2.fill} stroke={VULLING_2.stroke} strokeWidth={1.3} />
            {[0.33, 0.66].map((f) => (
              <line key={f} x1={X(-bzh / 2 + bzh * f)} y1={Y(l1 - lz * 0.8)} x2={X(-bzh / 2 + bzh * f)} y2={Y(l1 + L2) - 6} stroke="#8B6F47" strokeWidth={0.5} strokeDasharray="14 6" opacity={0.35} />
            ))}
            <line x1={X(-bzh / 2)} y1={Y(l1)} x2={X(-bze / 2)} y2={Y(l1 - lz)} stroke="#b91c1c" strokeWidth={3} />
            <line x1={X(bzh / 2)} y1={Y(l1)} x2={X(bze / 2)} y2={Y(l1 - lz)} stroke="#b91c1c" strokeWidth={3} />
            {/* maten */}
            <HDim k="nz" x0={X(-bze / 2)} x1={X(bze / 2)} y={Y(l1 - lz) - 16} ext={Y(l1 - lz) - 3} />
            <HDim k="nz" x0={X(-bzh / 2)} x1={X(bzh / 2)} y={Y(l1) + 22} />
            <VDim k="nz" y0={Y(l1 - lz)} y1={Y(l1)} x={X(bze / 2) + 22} ext={X(bze / 2) + 3} />
            <VDim k="nz" y0={Y(0)} y1={Y(l1)} x={X(xl) + 22} />
            {ak > 0 && <HDim k="nz" x0={X(bze / 2)} x1={X(xr)} y={Y(0) - 16} ext={Y(0) - 3} />}
            <line x1={X(0)} y1={Y(l1 + L2) + 2} x2={X(0)} y2={Y(l1 + L2) + 40} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("nz")} />
            <text x={X(xl)} y={Y(l1) + 16} fill="#6b7280" fontSize={10}>rood: de schuine vlakken (druk)</text>
          </svg>
          <Dim ctx={ctx} name="b_ze" value={bze} x={X(0)} y={Y(l1 - lz) - 16} step={5} label="be" />
          <Dim ctx={ctx} name="b_zh" value={bzh} x={X(0)} y={Y(l1) + 22} step={5} label="bh" />
          <Dim ctx={ctx} name="l_z" value={lz} x={X(bze / 2) + 22} y={(Y(l1 - lz) + Y(l1)) / 2} step={5} label="lz" />
          <Dim ctx={ctx} name="l_1" value={l1} x={X(xl) + 22} y={(Y(0) + Y(l1)) / 2} step={10} label="l1" />
          {ak > 0 && <Dim ctx={ctx} name="a_k" value={ak} x={(X(bze / 2) + X(xr)) / 2} y={Y(0) - 16} step={10} label="ak" />}
          <Dim ctx={ctx} name="t_z" value={tz} x={X(xr) - 40} y={Y(l1) + 24} step={5} label="t" title="dikte van de zwaluwstaart — klik om te wijzigen" />
          <Force ctx={ctx} name="N_t_Ed" value={Nt} x={X(0) + 46} y={Y(l1 + L2) + 18} unit="kN" label="Nt" step={1} dec={1} />
        </div>
      </div>
    );
    bediening = (
      <JaNee label="Kops einde bij element 1" waarde={ak > 0} onChange={(v) => set("a_k", v ? Math.max(ak, 100) : 0)} />
    );
    const gamma = (Math.atan((bze - bzh) / (2 * lz)) * 180) / Math.PI;
    badge = `${fmt(bzh)}/${fmt(bze)} × ${fmt(lz)} · γ = ${fmt(gamma, 1)}°`;
    live = `dikte t = ${fmt(tz)} mm · Nt = ${fmt(Nt, 1)} kN${ak > 0 ? ` · ${fmt(ak)} mm tot het kopse einde` : " · element 1 loopt door"}`;
  }

  return {
    kop: (
      <div className="vd-head">
        <strong>Parametrisch beeld — {titel.toLowerCase()}</strong>
        <span className="vd-uc info">{badge}</span>
      </div>
    ),
    bediening,
    tekening,
    voet: (
      <div className="vd-foot">
        <span>
          {afdruk ? "" : "Klik op een blauwe maat of een rode kracht om die te wijzigen — stroomt direct terug in de rekensheet."}
          {!afdruk && <br />}
          De toetsing, met de algemene toetsen uit §6 van EN 1995-1-1, staat in het rekenblad.
        </span>
        <span className="vd-live">{titel} · {live}</span>
      </div>
    ),
  };
}

type Soort = "hout" | "plaat" | "staal";
interface Laag { soort: Soort; t: number; naam: string | null; label: string }

const VULLING: Record<Soort, { fill: string; stroke: string }> = {
  hout: { fill: "#F5E6C8", stroke: "#8B6F47" },
  plaat: { fill: "#E7DDC7", stroke: "#7C6A4A" },
  staal: { fill: "#dbe7f6", stroke: "#1e40af" },
};

export default function NagelSchroefDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // In de afdruk valt er niets te klikken; dan ook geen aanwijzing daarvoor.
  const afdruk = useAlleenLezen();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  // Keep, pen-en-gat en zwaluwstaart hebben een eigen aanzicht; de omlijsting
  // (en het vak dat wrapRef meet) blijft hetzelfde.
  const soort = clamp(Math.round(d("soort")), 1, 4);
  const amb = soort >= 2 ? ambachtBeeld(ctx, soort, box.w, box.h, afdruk) : null;
  const soortKeuze = (
    <>
      <span className="vd-ctrl-h">Verbinding</span>
      <label>Soort
        <select value={soort} onChange={(e) => set("soort", parseInt(e.target.value))}>
          {SOORT.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      </label>
    </>
  );

  const opbouw = clamp(Math.round(d("opbouw")), 1, 5);
  const middel = clamp(Math.round(d("middel")), 1, 4);
  const voorboren = Math.round(d("voorboren")) === 1;
  const t1 = Math.max(0.5, d("t_1")), t2 = Math.max(0.5, d("t_2")), ts = Math.max(0.5, d("t_s"));
  const dv = Math.max(0.5, d("d_v")), lv = Math.max(1, d("l_v")), dh = Math.max(dv, d("d_h"));
  const d1 = Math.min(dv, Math.max(0.3, d("d_1")));
  // Een gladde of een niet-geprofileerde vierkante nagel heeft geen deel met
  // profiel; het blad vraagt l_g dan ook niet.
  const lg = Math.max(0, Math.min(lv, middel <= 2 ? 0 : d("l_g")));
  const n1 = clamp(Math.round(d("n_1")), 1, 40), n2 = clamp(Math.round(d("n_2")), 1, 12);
  const a1 = Math.max(1, d("a_1")), a2 = Math.max(1, d("a_2")), a3 = Math.max(1, d("a_3")), a4 = Math.max(1, d("a_4"));
  // De scherpe hoek tussen kracht en vezel, zoals het blad ermee rekent: 150° is 30°.
  const aMod = Math.abs(d("α")) % 180;
  const alfa = Math.min(aMod, 180 - aMod);
  // Bij een kracht onder een hoek vraagt het blad de hoogte h van het element
  // (splijten); is die bekend, dan krijgt het aanzicht die hoogte.
  const h90 = d("h_90");
  const groepH = a4 + (n2 - 1) * a2;
  const metH = alfa > 0 && h90 > groepH;
  const eindBelast = Math.round(d("eind")) === 1, randBelast = Math.round(d("rand")) === 1;
  // Is de rand bij a4 onbelast terwijl de kracht een hoek maakt, dan is de
  // rand aan de overkant belast; daar toetst het blad splijten.
  const overkantBelast = !randBelast && alfa > 0;
  const versprongen = Math.round(d("versprongen")) === 1;
  const Fv = d("F_v_Ed"), Fax = d("F_ax_Ed");

  // Lagen van kop naar punt.
  const lagen: Laag[] =
    opbouw === 1 ? [{ soort: "hout", t: t1, naam: "t_1", label: "t1" }, { soort: "hout", t: t2, naam: "t_2", label: "t2" }]
    : opbouw === 2 ? [{ soort: "hout", t: t1, naam: "t_1", label: "t1" }, { soort: "hout", t: t2, naam: "t_2", label: "t2" }, { soort: "hout", t: t1, naam: null, label: "t1" }]
    : opbouw === 3 ? [{ soort: "plaat", t: t1, naam: "t_1", label: "t1" }, { soort: "hout", t: t2, naam: "t_2", label: "t2" }]
    : opbouw === 4 ? [{ soort: "staal", t: ts, naam: "t_s", label: "ts" }, { soort: "hout", t: t2, naam: "t_2", label: "t2" }]
    : [{ soort: "hout", t: t1, naam: "t_1", label: "t1" }, { soort: "staal", t: ts, naam: "t_s", label: "ts" }, { soort: "hout", t: t1, naam: null, label: "t1" }];
  const dikte = lagen.reduce((s, l) => s + l.t, 0);
  // Indringdiepte: wat van de stift in het laatste element steekt.
  const voorPunt = dikte - lagen[lagen.length - 1].t;
  const tpen = Math.max(0, Math.min(lv - voorPunt, lagen[lagen.length - 1].t));

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(300, box.h - 2 * capH - gap);
  const SH = totH * 0.46, AH = totH - SH;
  // Smalle marges: in de weergave naast de uitwerking is het paneel vaak smal.
  const mL = clamp(W * 0.12, 30, 80), mR = clamp(W * 0.1, 30, 70);

  // doorsnede
  const s = clamp((W - mL - mR) / Math.max(dikte, lv), 0.2, 12);
  const x0 = mL;
  const cy = SH * 0.55;
  const hEl = clamp(SH * 0.42, 56, 150);
  const yTop = cy - hEl / 2, yBot = cy + hEl / 2;
  const laagX: number[] = [];
  lagen.reduce((x, l) => { laagX.push(x); return x + l.t * s; }, x0);
  const xPunt = x0 + lv * s;
  const schachtH = Math.max(2, dv * s), kopH = Math.max(7, dh * s), kernH = Math.max(1.5, d1 * s);
  const punt = Math.min(Math.max(2 * dv * s, 5), lv * s * 0.2);
  const draadX0 = xPunt - lg * s;
  const draadStap = Math.max(3, Math.min(8, dv * s * 0.9));
  const draad = lg > 0 ? Math.floor((lg * s - punt) / draadStap) : 0;
  const pijlAx = Math.min(40, mL - 6);

  // aanzicht met patroon: het element is zo breed als de rijen met hun
  // randafstanden en loopt rechts door (breuklijn). De maten staan onder en
  // rechts, de kracht in een eigen inzet erboven, zodat niets over de
  // verbindingsmiddelen valt.
  const lengte = a3 + (n1 - 1) * a1 + Math.max(a1, a3) * 1.2;
  const hoogte = metH ? h90 : 2 * a4 + (n2 - 1) * a2;
  const inzetH = 92, onderH = 58, rechtsB = 92;
  const sa = clamp(Math.min((W - mL - rechtsB) / lengte, (AH - inzetH - onderH) / hoogte), 0.05, 8);
  const ax0 = mL;
  const ay0 = inzetH + Math.max(0, (AH - inzetH - onderH - hoogte * sa) / 2);
  const ay1 = ay0 + hoogte * sa;
  const ax1 = ax0 + lengte * sa;
  const px = (i: number) => ax0 + (a3 + i * a1) * sa;
  const py = (i: number, j: number) => ay1 - (a4 + j * a2) * sa - (versprongen && i % 2 === 1 ? dv * sa : 0);
  const rDot = clamp(dv * sa * 0.6, 2.4, 6);
  // maatlijnen: a3 en a1 onder het element (verspringend), a4 en a2 rechts
  const yA3 = ay1 + 16, yA1 = ay1 + 38;
  const xA4 = Math.max(ax1, px(n1 - 1)) + 26, xA2 = xA4 + 40;
  // Kracht op de verbindingsmiddelen: naar het eind als dat belast is, naar de
  // rand als die belast is. Getekend in een inzet boven het element.
  const cxF = clamp((px(0) + px(n1 - 1)) / 2, ax0 + 60, Math.max(ax0 + 60, W - mR - 60)), cyF = inzetH * 0.5;
  const rad = (alfa * Math.PI) / 180;
  const fx = (eindBelast ? -1 : 1) * Math.cos(rad), fy = (randBelast ? 1 : -1) * Math.sin(rad);
  const fl = 38;
  const fxEnd = cxF + fx * fl, fyEnd = cyF + fy * fl;
  // Boogje voor α tussen de vezelrichting (naar het eind of ervan af) en de kracht.
  const rBoog = 24, sx = eindBelast ? -1 : 1;
  const th0 = Math.atan2(0, sx), th1 = Math.atan2(fy, fx);
  let dth = th1 - th0;
  while (dth > Math.PI) dth -= 2 * Math.PI;
  while (dth <= -Math.PI) dth += 2 * Math.PI;
  const boog = `M ${cxF + sx * rBoog} ${cyF} A ${rBoog} ${rBoog} 0 0 ${dth > 0 ? 1 : 0} ${cxF + fx * rBoog} ${cyF + fy * rBoog}`;
  const thMid = th0 + dth / 2;

  const middelKort = MIDDEL.find((m) => m.v === middel)?.kort ?? "";
  const opbouwLabel = OPBOUW.find((o) => o.v === opbouw)?.label ?? "";

  return (
    <div className="vd-panel" data-afdrukhoogte="150">
      {amb ? amb.kop : (
      <div className="vd-head">
        <strong>Parametrisch beeld — nagel- en schroefverbinding</strong>
        <span className="vd-uc info">{n1 * n2}× {middelKort} {fmt(dv, 1)} × {fmt(lv)} · {opbouwLabel.toLowerCase()}</span>
      </div>
      )}

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          {soortKeuze}
          {amb ? amb.bediening : (<>
          <label>Opbouw
            <select value={opbouw} onChange={(e) => set("opbouw", parseInt(e.target.value))}>
              {OPBOUW.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Verbindingsmiddel
            <select value={middel} onChange={(e) => set("middel", parseInt(e.target.value))}>
              {MIDDEL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <JaNee label="Voorgeboord" waarde={voorboren} onChange={(v) => set("voorboren", v ? 1 : 0)} />

          <span className="vd-ctrl-h">Patroon</span>
          <label>In een rij n<sub>1</sub>
            <input type="number" step={1} min={1} value={n1} onChange={(e) => set("n_1", parseFloat(e.target.value))} />
          </label>
          <label>Aantal rijen n<sub>2</sub>
            <input type="number" step={1} min={1} value={n2} onChange={(e) => set("n_2", parseFloat(e.target.value))} />
          </label>
          <JaNee label="Rij verspringt 1d" waarde={versprongen} onChange={(v) => set("versprongen", v ? 1 : 0)} />
          <JaNee label="Eind belast" waarde={eindBelast} onChange={(v) => set("eind", v ? 1 : 0)} />
          <JaNee label="Rand belast" waarde={randBelast} onChange={(v) => set("rand", v ? 1 : 0)} />
          <span className="gd-note">Totaal {n1 * n2} stuks; indringdiepte t<sub>pen</sub> = {fmt(tpen)} mm.</span>
          </>)}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          {amb ? amb.tekening : (<>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede langs het verbindingsmiddel</div>
            <div className="vd-stage" style={{ width: W, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={SH} className="vd-svg">
                <Defs k="ns" />
                {lagen.map((l, i) => (
                  <rect key={i} x={laagX[i]} y={yTop} width={l.t * s} height={hEl}
                    fill={VULLING[l.soort].fill} stroke={VULLING[l.soort].stroke} strokeWidth={1.3} />
                ))}
                {/* doorsnede van hout: jaarringen als dunne lijnen */}
                {lagen.map((l, i) => l.soort === "hout" && (
                  <g key={`r${i}`} opacity={0.35}>
                    {[0.25, 0.5, 0.75].map((f) => (
                      <line key={f} x1={laagX[i] + 2} y1={yTop + hEl * f} x2={laagX[i] + l.t * s - 2} y2={yTop + hEl * f}
                        stroke="#8B6F47" strokeWidth={0.6} strokeDasharray="5 4" />
                    ))}
                  </g>
                ))}
                {/* verbindingsmiddel */}
                <rect x={x0} y={cy - schachtH / 2} width={Math.max(0, lv * s - punt)} height={schachtH} fill="#9ca3af" stroke="#374151" strokeWidth={0.8} />
                {lg > 0 && (
                  <g>
                    <rect x={draadX0} y={cy - kernH / 2} width={Math.max(0, lg * s - punt)} height={kernH} fill="#6b7280" />
                    {Array.from({ length: Math.max(0, draad) }, (_, k) => (
                      <line key={k} x1={draadX0 + k * draadStap} y1={cy - schachtH / 2 - 1} x2={draadX0 + k * draadStap + draadStap * 0.6} y2={cy + schachtH / 2 + 1}
                        stroke="#374151" strokeWidth={0.9} />
                    ))}
                  </g>
                )}
                <polygon points={`${xPunt - punt},${cy - schachtH / 2} ${xPunt},${cy} ${xPunt - punt},${cy + schachtH / 2}`} fill="#9ca3af" stroke="#374151" strokeWidth={0.8} />
                <rect x={x0 - 3} y={cy - kopH / 2} width={3} height={kopH} fill="#374151" />
                {/* maten: dikte per laag boven, lengte onder */}
                {lagen.map((l, i) => (
                  <HDim key={`m${i}`} k="ns" x0={laagX[i]} x1={laagX[i] + l.t * s} y={yTop - 16} ext={yTop - 3} />
                ))}
                <HDim k="ns" x0={x0} x1={xPunt} y={yBot + 22} ext={cy + schachtH / 2 + 3} />
                {/* dwarskracht: element 1 omhoog, element 2 omlaag */}
                <line x1={laagX[0] + (lagen[0].t * s) / 2} y1={yBot + 46} x2={laagX[0] + (lagen[0].t * s) / 2} y2={yBot + 8}
                  className="vd-load" strokeWidth={2.6} markerEnd={loadMark("ns")} />
                {Fax > 0 && (
                  <line x1={x0 - 4} y1={cy} x2={x0 - pijlAx} y2={cy} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("ns")} />
                )}
              </svg>

              {lagen.map((l, i) => l.naam ? (
                <Dim key={`d${i}`} ctx={ctx} name={l.naam} value={l.t} x={laagX[i] + (l.t * s) / 2} y={yTop - 16} step={l.soort === "staal" ? 1 : 2} label={l.label} dec={l.t % 1 ? 1 : 0} />
              ) : (
                <Ro key={`d${i}`} text={`${l.label}=${fmt(l.t)}`} x={laagX[i] + (l.t * s) / 2} y={yTop - 16} title="gelijk aan element 1" />
              ))}
              <Dim ctx={ctx} name="l_v" value={lv} x={(x0 + xPunt) / 2} y={yBot + 22} step={5} label="l" />
              <Dim ctx={ctx} name="d_v" value={dv} x={Math.min(W - 30, xPunt + 26)} y={cy - 12} step={0.1} label="d" dec={1} />
              <Ro text={`tpen=${fmt(tpen)}`} x={laagX[lagen.length - 1] + (lagen[lagen.length - 1].t * s) / 2} y={yBot - 18}
                title="lengte van de stift in het element aan de puntzijde" />
              <Ro text={`Fv=${fmt(Fv, 1)} kN`} x={laagX[0] + (lagen[0].t * s) / 2} y={yBot + 50} kleur="#dc2626" title="wijzig in het aanzicht hieronder" />
              <Force ctx={ctx} name="F_ax_Ed" value={Fax} x={x0 + 30} y={yTop - 42} unit="kN" label="Fax" step={0.5} dec={1} />
            </div>
          </div>

          <div className="vd-canvas">
            {/* Met h is het getekende element het element dat op splijten wordt getoetst
                (el_90); dat hoeft niet het element aan de puntzijde te zijn. */}
            <div className="vd-caption">{metH ? "Aanzicht van het element dat op splijten wordt getoetst" : "Aanzicht van het element aan de puntzijde"}</div>
            <div className="vd-stage" style={{ width: W, height: AH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={AH} className="vd-svg">
                <Defs k="np" />
                <path d={`M ${ax1} ${ay0} L ${ax0} ${ay0} L ${ax0} ${ay1} L ${ax1} ${ay1}`} fill="#F5E6C8" stroke="#8B6F47" strokeWidth={1.3} />
                {/* breuklijn: het element loopt rechts door */}
                <path d={`M ${ax1} ${ay0} L ${ax1} ${(ay0 + ay1) / 2 - 5} L ${ax1 - 5} ${(ay0 + ay1) / 2} L ${ax1 + 5} ${(ay0 + ay1) / 2 + 5} L ${ax1} ${(ay0 + ay1) / 2 + 10} L ${ax1} ${ay1}`}
                  fill="#F5E6C8" stroke="#8B6F47" strokeWidth={0.9} strokeDasharray="6 3" />
                {/* vezelrichting */}
                {[0.3, 0.7].map((f) => (
                  <line key={f} x1={ax0 + 4} y1={ay0 + (ay1 - ay0) * f} x2={ax1 - 12} y2={ay0 + (ay1 - ay0) * f}
                    stroke="#8B6F47" strokeWidth={0.5} strokeDasharray="14 6" opacity={0.35} />
                ))}
                {/* eind en rand; belast in rood */}
                <line x1={ax0} y1={ay0} x2={ax0} y2={ay1} stroke={eindBelast ? "#b91c1c" : "#8B6F47"} strokeWidth={eindBelast ? 3 : 1.4} />
                <line x1={ax0} y1={ay1} x2={ax1} y2={ay1} stroke={randBelast ? "#b91c1c" : "#8B6F47"} strokeWidth={randBelast ? 3 : 1.4} />
                {overkantBelast && <line x1={ax0} y1={ay0} x2={ax1} y2={ay0} stroke="#b91c1c" strokeWidth={3} />}
                {Array.from({ length: n1 }, (_, i) => Array.from({ length: n2 }, (_, j) => (
                  <g key={`${i}-${j}`}>
                    <circle cx={px(i)} cy={py(i, j)} r={rDot} fill="#e5e7eb" stroke="#374151" strokeWidth={1.1} />
                    <circle cx={px(i)} cy={py(i, j)} r={Math.max(0.8, rDot * 0.35)} fill="#374151" />
                  </g>
                )))}
                {/* maten onder en rechts */}
                <HDim k="np" x0={ax0} x1={px(0)} y={yA3} ext={ay1 + 3} />
                {n1 > 1 && <HDim k="np" x0={px(0)} x1={px(1)} y={yA1} ext={py(0, 0) + rDot + 2} />}
                <VDim k="np" y0={py(n1 - 1, 0)} y1={ay1} x={xA4} ext={px(n1 - 1) + rDot + 2} />
                {n2 > 1 && <VDim k="np" y0={py(n1 - 1, 1)} y1={py(n1 - 1, 0)} x={xA2} ext={px(n1 - 1) + rDot + 2} />}
                {/* inzet: richting van de kracht op de verbindingsmiddelen */}
                <line x1={cxF - fl * 1.1} y1={cyF} x2={cxF + fl * 1.1} y2={cyF} stroke="#8B6F47" strokeWidth={0.7} strokeDasharray="8 4" />
                <text x={cxF + fl * 1.1 + 4} y={cyF + 3} fill="#8B6F47" fontSize={10}>vezel</text>
                {alfa > 0.5 && <path d={boog} fill="none" stroke="#b91c1c" strokeWidth={0.9} strokeDasharray="3 2" />}
                <line x1={cxF} y1={cyF} x2={fxEnd} y2={fyEnd} className="vd-load" strokeWidth={2.8} markerEnd={loadMark("np")} />
                <circle cx={cxF} cy={cyF} r={2.6} fill="#b91c1c" />
                <text x={ax0 + 2} y={ay1 + 54} fill="#6b7280" fontSize={10}>
                  rood: {[eindBelast && "belast eind", randBelast && "belaste rand", overkantBelast && "belaste rand aan de overkant"].filter(Boolean).join(" en ") || "geen belast eind of rand"}
                </text>
              </svg>

              <Dim ctx={ctx} name="a_3" value={a3} x={(ax0 + px(0)) / 2} y={yA3} step={5} label="a3" />
              {n1 > 1 && <Dim ctx={ctx} name="a_1" value={a1} x={(px(0) + px(1)) / 2} y={yA1} step={5} label="a1" />}
              <Dim ctx={ctx} name="a_4" value={a4} x={xA4} y={(py(n1 - 1, 0) + ay1) / 2} step={5} label="a4" />
              {n2 > 1 && <Dim ctx={ctx} name="a_2" value={a2} x={xA2} y={(py(n1 - 1, 1) + py(n1 - 1, 0)) / 2} step={5} label="a2" />}
              <Force ctx={ctx} name="F_v_Ed" value={Fv} x={fxEnd + fx * 30} y={fyEnd + fy * 16 - 10} unit="kN" label="Fv" step={1} dec={1} />
              <Dim ctx={ctx} name="α" value={alfa} x={cxF + Math.cos(thMid) * (rBoog + 20) - (alfa > 0.5 ? 0 : sx * 20)} y={cyF + Math.sin(thMid) * (rBoog + 20) - 10 + (alfa > 0.5 ? 0 : -14)} step={15} label="α" />
            </div>
          </div>
          </>)}
        </div>
      </div>

      {amb ? amb.voet : (
      <div className="vd-foot">
        <span>
          {afdruk ? "" : "Klik op een blauwe maat of een rode kracht om die te wijzigen — stroomt direct terug in de rekensheet."}
          {!afdruk && <br />}
          De sterkte, de groep en de eisen aan de afstanden staan in het rekenblad.
        </span>
        <span className="vd-live">
          {opbouwLabel} · {middelKort} d = {fmt(dv, 1)} mm, l = {fmt(lv)} mm
          {middel === 4 ? `, kern ${fmt(d1, 1)} mm` : ""}{voorboren ? " · voorgeboord" : ""} ·
          {" "}{n2} × {n1} stuks · a1 = {fmt(a1)} · {n2 > 1 ? `a2 = ${fmt(a2)} · ` : ""}a3 = {fmt(a3)} · a4 = {fmt(a4)} ·{metH ? ` h = ${fmt(h90)} ·` : ""}
          {" "}α = {fmt(alfa)}° · F<sub>v,Ed</sub> = {fmt(Fv, 1)} kN{Fax > 0 ? ` · F_ax,Ed = ${fmt(Fax, 1)} kN` : ""}
        </span>
      </div>
      )}
    </div>
  );
}
