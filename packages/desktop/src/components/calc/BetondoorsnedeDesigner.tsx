import { useDesigner, Dim, Ro, Defs, betonFill, HDim, VDim, fmt, clamp } from "./designerKit";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een gewapende rechthoekige betondoorsnede.
 *
 * De doorsnede wordt op ware verhouding getekend: beugel op de dekking, drie
 * wapeningslagen (onder, midden, boven) met de staven gelijkmatig over de
 * beugelbreedte verdeeld, en de staafdiameters op schaal. Rechts staan de
 * lagen benoemd zoals op een wapeningstekening.
 *
 * De getoonde kengetallen zijn pure geometrie — oppervlak per laag en het
 * wapeningspercentage. De toetsing zelf zit hier bewust nog niet in.
 *
 * Nog geen toetsing — zie templates/betondoorsnede.ts.
 */
const MARKER = "Betondoorsnede";

const BETON = [20, 25, 30, 35, 40, 45, 50];
const STAALSOORT = [{ v: 1, label: "B500A" }, { v: 2, label: "B500B" }, { v: 3, label: "B500C" }];
const DIAM = [6, 8, 10, 12, 16, 20, 25, 32];

const DEFAULTS: Record<string, number> = {
  b_dsn: 200, h_dsn: 300, betonklasse: 30, betonstaal: 2, c_dek: 25,
  n_onder: 2, d_onder: 16, n_midden: 2, d_midden: 8, n_boven: 2, d_boven: 12,
  d_beugel: 8, s_beugel: 250, n_sneden: 2,
  N_Ed: 0, M_Ed: 0, V_Ed: 0, T_Ed: 0, N_k: 0, M_k: 0,
};

export default function BetondoorsnedeDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const b = Math.max(50, d("b_dsn")), h = Math.max(50, d("h_dsn"));
  const fck = Math.round(d("betonklasse"));
  const staal = Math.round(d("betonstaal"));
  const c = Math.max(10, d("c_dek"));
  const nO = clamp(Math.round(d("n_onder")), 0, 12), dO = Math.max(4, d("d_onder"));
  const nM = clamp(Math.round(d("n_midden")), 0, 12), dM = Math.max(4, d("d_midden"));
  const nB = clamp(Math.round(d("n_boven")), 0, 12), dB = Math.max(4, d("d_boven"));
  const dBg = Math.max(4, d("d_beugel")), sBg = Math.max(20, d("s_beugel"));
  const nSn = clamp(Math.round(d("n_sneden")), 2, 6);
  const NEd = d("N_Ed"), MEd = d("M_Ed"), VEd = d("V_Ed"), TEd = d("T_Ed");
  const Nk = d("N_k"), Mk = d("M_k");

  // Geometrie van de wapening — geen toetsing, alleen oppervlakken.
  const A = (n: number, dia: number) => (n * Math.PI * dia * dia) / 4;
  const AsO = A(nO, dO), AsM = A(nM, dM), AsB = A(nB, dB);
  const Astot = AsO + AsM + AsB;
  const rho = (Astot / (b * h)) * 100;
  const dEff = h - c - dBg - dO / 2;                   // nuttige hoogte, onderste laag

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24;
  const W = box.w, H = Math.max(260, box.h - capH);
  const mL = 78, mR = 130, mT = 44, mB = 52;
  const s = clamp(Math.min((W - mL - mR) / b, (H - mT - mB) / h), 0.02, 3);
  const cx = mL + (W - mL - mR) / 2, cy = mT + (H - mT - mB) / 2;
  const x0 = cx - (b * s) / 2, x1 = cx + (b * s) / 2;
  const y0 = cy - (h * s) / 2, y1 = cy + (h * s) / 2;

  // beugel op de dekking
  const bx0 = x0 + c * s, bx1 = x1 - c * s, by0 = y0 + c * s, by1 = y1 - c * s;
  const bgPx = Math.max(1.6, dBg * s);
  const rr = Math.max(3, dBg * s * 2);

  /** Staven van één laag, gelijkmatig over de binnenzijde van de beugel. */
  const laag = (n: number, dia: number, y: number) => {
    if (n <= 0) return [];
    const r = Math.max(2.2, (dia * s) / 2);
    const l = bx0 + bgPx + r, rgt = bx1 - bgPx - r;
    return Array.from({ length: n }, (_, i) => ({
      x: n === 1 ? (l + rgt) / 2 : l + ((rgt - l) * i) / (n - 1), y, r,
    }));
  };
  const yO = by1 - bgPx - (dO * s) / 2;
  const yB = by0 + bgPx + (dB * s) / 2;
  const yM = (yO + yB) / 2;
  const staven = [...laag(nB, dB, yB), ...laag(nM, dM, yM), ...laag(nO, dO, yO)];

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — betondoorsnede</strong>
        <span className="vd-uc info">
          {fmt(b)}×{fmt(h)} · A<sub>s</sub> = {fmt(Astot)} mm² ({fmt(rho, 2)} %)
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Doorsnede (mm)</span>
          <label>Breedte b
            <input type="number" step={10} value={b} onChange={(e) => set("b_dsn", parseFloat(e.target.value))} />
          </label>
          <label>Hoogte h
            <input type="number" step={10} value={h} onChange={(e) => set("h_dsn", parseFloat(e.target.value))} />
          </label>
          <label>Betonsterkteklasse
            <select value={fck} onChange={(e) => set("betonklasse", parseInt(e.target.value))}>
              {BETON.map((v) => <option key={v} value={v}>C{v}/{v === 20 ? 25 : v === 25 ? 30 : v === 30 ? 37 : v === 35 ? 45 : v === 40 ? 50 : v === 45 ? 55 : 60}</option>)}
            </select>
          </label>
          <label>Betonstaalsoort
            <select value={staal} onChange={(e) => set("betonstaal", parseInt(e.target.value))}>
              {STAALSOORT.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Dekking c
            <input type="number" step={5} value={c} onChange={(e) => set("c_dek", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Wapening</span>
          {([["onder", "n_onder", "d_onder", nO, dO], ["midden", "n_midden", "d_midden", nM, dM],
             ["boven", "n_boven", "d_boven", nB, dB]] as const).map(([lbl, nk, dk, nv, dv]) => (
            <label key={lbl} title={`${nv}Ø${dv} = ${fmt(A(nv, dv))} mm²`}>{lbl}
              <span style={{ display: "flex", gap: 4 }}>
                <input type="number" step={1} min={0} max={12} value={nv} style={{ width: 46 }}
                  onChange={(e) => set(nk, parseFloat(e.target.value))} />
                <select value={dv} onChange={(e) => set(dk, parseFloat(e.target.value))}>
                  {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
                </select>
              </span>
            </label>
          ))}
          <label>Beugel
            <span style={{ display: "flex", gap: 4 }}>
              <select value={dBg} onChange={(e) => set("d_beugel", parseFloat(e.target.value))}>
                {DIAM.slice(0, 5).map((x) => <option key={x} value={x}>Ø{x}</option>)}
              </select>
              <input type="number" step={25} min={20} value={sBg} style={{ width: 58 }}
                onChange={(e) => set("s_beugel", parseFloat(e.target.value))} />
            </span>
          </label>
          <label>Beugelsneden
            <input type="number" step={1} min={2} max={6} value={nSn} onChange={(e) => set("n_sneden", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">A<sub>s,onder</sub> = {fmt(AsO)} · A<sub>s,midden</sub> = {fmt(AsM)} ·
            A<sub>s,boven</sub> = {fmt(AsB)} mm² · nuttige hoogte d ≈ {fmt(dEff)} mm.</span>

          <span className="vd-ctrl-h">Belastingen (UGT)</span>
          <label>N<sub>Ed</sub> (kN)
            <input type="number" step={10} value={NEd} onChange={(e) => set("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>Ed</sub> (kNm)
            <input type="number" step={5} value={MEd} onChange={(e) => set("M_Ed", parseFloat(e.target.value))} />
          </label>
          <label>V<sub>Ed</sub> (kN)
            <input type="number" step={10} value={VEd} onChange={(e) => set("V_Ed", parseFloat(e.target.value))} />
          </label>
          <label>T<sub>Ed</sub> (kNm)
            <input type="number" step={1} value={TEd} onChange={(e) => set("T_Ed", parseFloat(e.target.value))} />
          </label>
          <span className="vd-ctrl-h">Belastingen (BGT)</span>
          <label>N<sub>k</sub> (kN)
            <input type="number" step={10} value={Nk} onChange={(e) => set("N_k", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>k</sub> (kNm)
            <input type="number" step={5} value={Mk} onChange={(e) => set("M_k", parseFloat(e.target.value))} />
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                <Defs k="bt" />
                {/* beton */}
                <rect x={x0} y={y0} width={b * s} height={h * s} fill={betonFill("bt")} stroke="#6b7280" strokeWidth={1.4} />
                {/* beugel */}
                <rect x={bx0} y={by0} width={bx1 - bx0} height={by1 - by0} rx={rr} ry={rr}
                  fill="none" stroke="#1e3a8a" strokeWidth={bgPx} />
                {/* extra beugelsneden als verticale takken */}
                {nSn > 2 && Array.from({ length: nSn - 2 }, (_, i) => {
                  const xx = bx0 + ((bx1 - bx0) * (i + 1)) / (nSn - 1);
                  return <line key={i} x1={xx} y1={by0} x2={xx} y2={by1} stroke="#1e3a8a" strokeWidth={bgPx * 0.8} strokeDasharray="6 4" />;
                })}
                {/* staven */}
                {staven.map((st, i) => (
                  <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#374151" stroke="#111827" strokeWidth={0.8} />
                ))}
                {/* maatlijnen */}
                <HDim k="bt" x0={x0} x1={x1} y={y1 + 28} ext={y1 + 6} />
                <VDim k="bt" y0={y0} y1={y1} x={x0 - 32} ext={x0 - 6} />
                {/* laagbenoemingen rechts */}
                {nB > 0 && <line x1={x1 + 4} y1={yB} x2={x1 + 30} y2={yB} stroke="#6b7280" strokeWidth={0.9} />}
                {nM > 0 && <line x1={x1 + 4} y1={yM} x2={x1 + 30} y2={yM} stroke="#6b7280" strokeWidth={0.9} />}
                {nO > 0 && <line x1={x1 + 4} y1={yO} x2={x1 + 30} y2={yO} stroke="#6b7280" strokeWidth={0.9} />}
                <line x1={x1 + 4} y1={(yB + yM) / 2} x2={x1 + 30} y2={(yB + yM) / 2} stroke="#1e3a8a" strokeWidth={0.9} />
              </svg>

              <Dim ctx={ctx} name="b_dsn" value={b} x={cx} y={y1 + 28} step={10} label="b" />
              <Dim ctx={ctx} name="h_dsn" value={h} x={x0 - 32} y={cy} step={10} label="h" />
              <Ro text={`c=${fmt(c)}`} x={x0 + c * s + 22} y={y0 + (c * s) / 2} title="dekking op de beugel" />
              {nB > 0 && <Ro text={`${nB}Ø${fmt(dB)}`} x={x1 + 62} y={yB} title={`${fmt(AsB)} mm²`} />}
              {nM > 0 && <Ro text={`${nM}Ø${fmt(dM)}`} x={x1 + 62} y={yM} title={`${fmt(AsM)} mm²`} />}
              {nO > 0 && <Ro text={`${nO}Ø${fmt(dO)}`} x={x1 + 62} y={yO} title={`${fmt(AsO)} mm²`} />}
              <Ro text={`Ø${fmt(dBg)}-${fmt(sBg)} (${nSn}sn.)`} x={x1 + 74} y={(yB + yM) / 2} kleur="#1e3a8a" title="beugels" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De staven staan op schaal en verdelen zich automatisch over de binnenzijde van de beugel.</span>
        <span className="vd-live">
          C{fck} · {STAALSOORT.find((o) => o.v === staal)?.label} · {fmt(b)}×{fmt(h)} mm · dekking {fmt(c)} mm ·
          {nO}Ø{fmt(dO)} onder · {nM}Ø{fmt(dM)} midden · {nB}Ø{fmt(dB)} boven · Ø{fmt(dBg)}-{fmt(sBg)} ({nSn}sn.) ·
          A<sub>s</sub> = {fmt(Astot)} mm² ({fmt(rho, 2)} %) · d ≈ {fmt(dEff)} mm ·
          N/M/V/T = {fmt(NEd)} kN / {fmt(MEd)} kNm / {fmt(VEd)} kN / {fmt(TEd)} kNm
        </span>
      </div>
    </div>
  );
}
