import { useDesigner, Dim, Force, Ro, Defs, loadMark, betonFill, HDim, VDim, fmt, clamp } from "./designerKit";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een gewapende betonkolom.
 *
 * Links de doorsnede met de staven over de omtrek verdeeld — n_h per verticale
 * zijde en n_b per horizontale zijde, met de hoekstaven één keer geteld, zoals
 * je ze op een wapeningstekening zet. Rechts het aanzicht met de kolomlengte,
 * de opleggingen en de belastingen.
 *
 * De slankheid λ = L₀/i wordt live meegerekend omdat die bepaalt of
 * tweede-orde-effecten straks meedoen; het is pure doorsnedegeometrie, geen
 * toetsing.
 *
 * Nog geen toetsing — zie templates/betonkolom.ts.
 */
const MARKER = "Betonkolom";

const BETON = [20, 25, 30, 35, 40, 45, 50];
const BETONLABEL: Record<number, string> = {
  20: "C20/25", 25: "C25/30", 30: "C30/37", 35: "C35/45", 40: "C40/50", 45: "C45/55", 50: "C50/60",
};
const STAALSOORT = [{ v: 1, label: "B500A" }, { v: 2, label: "B500B" }, { v: 3, label: "B500C" }];
const DIAM = [8, 10, 12, 16, 20, 25, 32, 40];

const DEFAULTS: Record<string, number> = {
  vorm: 1, h_kol: 350, b_kol: 350, L_kol: 3500, insitu: 0,
  betonklasse: 30, betonstaal: 2, c_dek: 30,
  n_h: 2, n_b: 4, d_staaf: 20, d_beugel: 8, s_beugel: 200,
  L_cry: 3500, L_crz: 3500, N_Ed: 0, M_yEd: 0, M_zEd: 0,
};

export default function BetonkolomDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const vorm = Math.round(d("vorm"));                // 1 = rechthoekig, 2 = rond
  const h = Math.max(100, d("h_kol"));
  const b = vorm === 2 ? h : Math.max(100, d("b_kol"));
  const L = Math.max(500, d("L_kol"));
  const insitu = Math.round(d("insitu")) === 1;
  const fck = Math.round(d("betonklasse"));
  const staal = Math.round(d("betonstaal"));
  const c = Math.max(10, d("c_dek"));
  const nH = clamp(Math.round(d("n_h")), 2, 8);      // staven per verticale zijde
  const nB = clamp(Math.round(d("n_b")), 2, 8);      // staven per horizontale zijde
  const dS = Math.max(6, d("d_staaf"));
  const dBg = Math.max(4, d("d_beugel")), sBg = Math.max(20, d("s_beugel"));
  const Lcry = Math.max(1, d("L_cry")), Lcrz = Math.max(1, d("L_crz"));
  const NEd = d("N_Ed"), MyEd = d("M_yEd"), MzEd = d("M_zEd");

  // Staafposities over de omtrek — hoekstaven één keer.
  const nTot = vorm === 2 ? Math.max(4, nB * 2) : 2 * nH + 2 * nB - 4;
  const As = (nTot * Math.PI * dS * dS) / 4;
  const Ac = vorm === 2 ? (Math.PI * h * h) / 4 : b * h;
  const rho = (As / Ac) * 100;
  // Slankheid — puur geometrisch.
  const iy = vorm === 2 ? h / 4 : h / Math.sqrt(12);
  const iz = vorm === 2 ? h / 4 : b / Math.sqrt(12);
  const lamY = Lcry / iy, lamZ = Lcrz / iz;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 16;
  const W = box.w, H = Math.max(280, box.h - capH);
  // In een smalle pane onder elkaar in plaats van naast elkaar.
  const gestapeld = W < 520;
  const DW = gestapeld ? W : Math.min(W * 0.52, W - 170);
  const AW = gestapeld ? W : W - DW - gap;
  const DH = gestapeld ? Math.max(150, (H - gap - capH) * 0.44) : H;
  const AH = gestapeld ? Math.max(180, (H - gap - capH) * 0.56) : H;
  const offX = gestapeld ? 0 : DW + gap;            // x-nulpunt van het tweede beeld

  // doorsnede
  const sD = clamp(Math.min((DW - 110) / b, (DH - 110) / h), 0.02, 1.6);
  const dcx = DW * 0.50, dcy = DH * 0.46;
  const x0 = dcx - (b * sD) / 2, x1 = dcx + (b * sD) / 2;
  const y0 = dcy - (h * sD) / 2, y1 = dcy + (h * sD) / 2;
  const bgPx = Math.max(1.6, dBg * sD);
  const rS = Math.max(2.4, (dS * sD) / 2);
  const inz = c * sD + bgPx + rS;                   // hart van de staaf vanaf de rand

  const staven: { x: number; y: number }[] = [];
  if (vorm === 2) {
    const R = (h * sD) / 2 - inz;
    for (let i = 0; i < nTot; i++) {
      const a = (2 * Math.PI * i) / nTot - Math.PI / 2;
      staven.push({ x: dcx + R * Math.cos(a), y: dcy + R * Math.sin(a) });
    }
  } else {
    const l = x0 + inz, r = x1 - inz, t = y0 + inz, bo = y1 - inz;
    for (let i = 0; i < nB; i++) {
      const x = nB === 1 ? (l + r) / 2 : l + ((r - l) * i) / (nB - 1);
      staven.push({ x, y: t }, { x, y: bo });
    }
    for (let i = 1; i < nH - 1; i++) {
      const y = t + ((bo - t) * i) / (nH - 1);
      staven.push({ x: l, y }, { x: r, y });
    }
  }

  // aanzicht
  const aMT = 62, aMB = 54;
  const sL = (AH - aMT - aMB) / L;
  const acx = offX + AW * 0.42;
  const kolPx = Math.max(8, b * sL * 2.6);
  const yT = aMT, yB = aMT + L * sL;

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — betonkolom</strong>
        <span className="vd-uc info">{nTot}Ø{fmt(dS)} · ρ = {fmt(rho, 2)} % · λ<sub>max</sub> = {fmt(Math.max(lamY, lamZ))}</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Geometrie (mm)</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Vorm
            <select style={{ width: "100%" }} value={vorm} onChange={(e) => set("vorm", parseInt(e.target.value))}>
              <option value={1}>Rechthoekige kolom</option>
              <option value={2}>Ronde kolom</option>
            </select>
          </label>
          <label>{vorm === 2 ? "Diameter" : "Hoogte h"}
            <input type="number" step={25} value={h} onChange={(e) => set("h_kol", parseFloat(e.target.value))} />
          </label>
          {vorm === 1 && (
            <label>Breedte b
              <input type="number" step={25} value={b} onChange={(e) => set("b_kol", parseFloat(e.target.value))} />
            </label>
          )}
          <label>Kolomlengte L
            <input type="number" step={100} value={L} onChange={(e) => set("L_kol", parseFloat(e.target.value))} />
          </label>
          <label className="gd-chk" title="Een in-situ gestorte funderingspaal kent afwijkende eisen aan dekking en minimumwapening">
            <input type="checkbox" checked={insitu} onChange={(e) => set("insitu", e.target.checked ? 1 : 0)} />
            in-situ gestorte funderingspaal
          </label>

          <span className="vd-ctrl-h">Beton en wapening</span>
          <label>Sterkteklasse
            <select value={fck} onChange={(e) => set("betonklasse", parseInt(e.target.value))}>
              {BETON.map((v) => <option key={v} value={v}>{BETONLABEL[v]}</option>)}
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
          <label>Staafdiameter
            <select value={dS} onChange={(e) => set("d_staaf", parseFloat(e.target.value))}>
              {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
            </select>
          </label>
          {vorm === 1 ? (
            <>
              <label title="Aantal staven langs de breedte, boven- en onderzijde">Staven langs b
                <input type="number" step={1} min={2} max={8} value={nB} onChange={(e) => set("n_b", parseFloat(e.target.value))} />
              </label>
              <label title="Aantal staven langs de hoogte, linker- en rechterzijde">Staven langs h
                <input type="number" step={1} min={2} max={8} value={nH} onChange={(e) => set("n_h", parseFloat(e.target.value))} />
              </label>
            </>
          ) : (
            <label>Aantal staven
              <input type="number" step={1} min={2} max={8} value={nB} onChange={(e) => set("n_b", parseFloat(e.target.value))} />
            </label>
          )}
          <label>Beugel
            <span style={{ display: "flex", gap: 4 }}>
              <select value={dBg} onChange={(e) => set("d_beugel", parseFloat(e.target.value))}>
                {[6, 8, 10, 12].map((x) => <option key={x} value={x}>Ø{x}</option>)}
              </select>
              <input type="number" step={25} min={20} value={sBg} style={{ width: 58 }}
                onChange={(e) => set("s_beugel", parseFloat(e.target.value))} />
            </span>
          </label>
          <span className="gd-note">{nTot} staven Ø{fmt(dS)} → A<sub>s</sub> = {fmt(As)} mm² · ρ = {fmt(rho, 2)} %.</span>

          <span className="vd-ctrl-h">Knik (mm)</span>
          <label>L<sub>0,y</sub>
            <input type="number" step={100} value={Lcry} onChange={(e) => set("L_cry", parseFloat(e.target.value))} />
          </label>
          <label>L<sub>0,z</sub>
            <input type="number" step={100} value={Lcrz} onChange={(e) => set("L_crz", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">λ<sub>y</sub> = {fmt(lamY)} · λ<sub>z</sub> = {fmt(lamZ)} —
            {Math.max(lamY, lamZ) > 75 ? " slank, tweede orde zal meedoen." : " gedrongen."}</span>

          <span className="vd-ctrl-h">Belastingen</span>
          <label>N<sub>Ed</sub> (kN)
            <input type="number" step={50} value={NEd} onChange={(e) => set("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>y,Ed</sub> (kNm)
            <input type="number" step={5} value={MyEd} onChange={(e) => set("M_yEd", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>z,Ed</sub> (kNm)
            <input type="number" step={5} value={MzEd} onChange={(e) => set("M_zEd", parseFloat(e.target.value))} />
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: gestapeld ? "column" : "row", alignItems: gestapeld ? "stretch" : "flex-start", gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: DW, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={DW} height={DH} className="vd-svg">
                <Defs k="bk" />
                {vorm === 2 ? (
                  <>
                    <circle cx={dcx} cy={dcy} r={(h * sD) / 2} fill={betonFill("bk")} stroke="#6b7280" strokeWidth={1.4} />
                    <circle cx={dcx} cy={dcy} r={(h * sD) / 2 - c * sD} fill="none" stroke="#1e3a8a" strokeWidth={bgPx} />
                  </>
                ) : (
                  <>
                    <rect x={x0} y={y0} width={b * sD} height={h * sD} fill={betonFill("bk")} stroke="#6b7280" strokeWidth={1.4} />
                    <rect x={x0 + c * sD} y={y0 + c * sD} width={b * sD - 2 * c * sD} height={h * sD - 2 * c * sD}
                      rx={Math.max(3, bgPx * 2)} ry={Math.max(3, bgPx * 2)} fill="none" stroke="#1e3a8a" strokeWidth={bgPx} />
                  </>
                )}
                {staven.map((st, i) => (
                  <circle key={i} cx={st.x} cy={st.y} r={rS} fill="#374151" stroke="#111827" strokeWidth={0.8} />
                ))}
                <HDim k="bk" x0={x0} x1={x1} y={y1 + 28} ext={y1 + 6} />
                <VDim k="bk" y0={y0} y1={y1} x={x0 - 30} ext={x0 - 6} />
                {/* assen */}
                <line x1={x0 - 10} y1={dcy} x2={x1 + 10} y2={dcy} stroke="#dc2626" strokeWidth={0.9} strokeDasharray="9 4 2 4" />
                <line x1={dcx} y1={y0 - 10} x2={dcx} y2={y1 + 10} stroke="#dc2626" strokeWidth={0.9} strokeDasharray="9 4 2 4" />
              </svg>

              <Dim ctx={ctx} name={vorm === 2 ? "h_kol" : "b_kol"} value={b} x={dcx} y={y1 + 28} step={25} label={vorm === 2 ? "Ø" : "b"} />
              <Dim ctx={ctx} name="h_kol" value={h} x={x0 - 30} y={dcy} step={25} label="h" />
              <Ro text={`${nTot}Ø${fmt(dS)}`} x={x1 + 46} y={y0 + 14} title={`A_s = ${fmt(As)} mm²`} />
              <Ro text={`Ø${fmt(dBg)}-${fmt(sBg)}`} x={x1 + 46} y={y0 + 32} kleur="#1e3a8a" title="beugels" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Aanzicht</div>
            <div className="vd-stage" style={{ width: AW, height: AH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={AW} height={AH} className="vd-svg">
                <Defs k="ba" />
                <rect x={acx - offX - kolPx / 2} y={yT} width={kolPx} height={L * sL}
                  fill={betonFill("ba")} stroke="#6b7280" strokeWidth={1.4} />
                {/* beugels als horizontale streepjes op de werkelijke afstand */}
                {Array.from({ length: Math.min(60, Math.floor(L / sBg)) }, (_, i) => {
                  const y = yT + (i + 0.5) * sBg * sL;
                  return y < yB ? <line key={i} x1={acx - offX - kolPx / 2 + 3} y1={y} x2={acx - offX + kolPx / 2 - 3} y2={y}
                    stroke="#1e3a8a" strokeWidth={0.9} /> : null;
                })}
                {/* langswapening */}
                {[-1, 1].map((z) => (
                  <line key={z} x1={acx - offX + z * (kolPx / 2 - 5)} y1={yT + 4} x2={acx - offX + z * (kolPx / 2 - 5)} y2={yB - 4}
                    stroke="#374151" strokeWidth={Math.max(1.4, rS)} />
                ))}
                {/* opleggingen */}
                <polygon points={`${acx - offX},${yB} ${acx - offX - 13},${yB + 17} ${acx - offX + 13},${yB + 17}`}
                  fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.5} />
                <line x1={acx - offX - 22} y1={yB + 17} x2={acx - offX + 22} y2={yB + 17} stroke="#1e40af" strokeWidth={2} />
                {/* normaalkracht */}
                <line x1={acx - offX} y1={yT - 46} x2={acx - offX} y2={yT - 4} className="vd-load" strokeWidth={3.2} markerEnd={loadMark("ba")} />
                {/* moment */}
                {MyEd !== 0 && (
                  <path d={`M ${acx - offX + 26} ${yT + 16} A 26 26 0 1 1 ${acx - offX + 26} ${yT + 17}`}
                    fill="none" stroke="#dc2626" strokeWidth={2.2} markerEnd={loadMark("ba")} />
                )}
                <VDim k="ba" y0={yT} y1={yB} x={acx - offX + kolPx / 2 + 40} ext={acx - offX + kolPx / 2 + 6} />
              </svg>

              <Force ctx={ctx} name="N_Ed" value={NEd} x={acx - offX + 34} y={yT - 56} unit="kN" label="N_Ed" step={50} />
              {MyEd !== 0 && <Force ctx={ctx} name="M_yEd" value={MyEd} x={acx - offX + 66} y={yT + 8} unit="kNm" label="M_y" step={5} />}
              <Dim ctx={ctx} name="L_kol" value={L} x={acx - offX + kolPx / 2 + 40} y={(yT + yB) / 2} step={100} label="L" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode belasting om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De hoekstaven worden één keer geteld; de beugels staan in het aanzicht op de werkelijke afstand.</span>
        <span className="vd-live">
          {BETONLABEL[fck]} · {STAALSOORT.find((o) => o.v === staal)?.label} ·
          {vorm === 2 ? ` Ø${fmt(h)}` : ` ${fmt(b)}×${fmt(h)}`} mm · L = {fmt(L)} mm · dekking {fmt(c)} mm ·
          {nTot}Ø{fmt(dS)} → A<sub>s</sub> = {fmt(As)} mm² ({fmt(rho, 2)} %) · Ø{fmt(dBg)}-{fmt(sBg)} ·
          λ<sub>y</sub>/λ<sub>z</sub> = {fmt(lamY)}/{fmt(lamZ)} · N<sub>Ed</sub> = {fmt(NEd)} kN ·
          M<sub>y</sub>/M<sub>z</sub> = {fmt(MyEd)}/{fmt(MzEd)} kNm{insitu ? " · in-situ paal" : ""}
        </span>
      </div>
    </div>
  );
}
