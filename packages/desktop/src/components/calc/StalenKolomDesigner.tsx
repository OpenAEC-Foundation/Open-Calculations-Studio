import { useDesigner, Dim, Force, Ro, Defs, loadMark, IProfiel, VDim, fmt, clamp } from "./designerKit";
import { profiel, profielOpties } from "./profielen";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een stalen kolom op druk en buiging.
 *
 * Links het knikschema — de kolom over de volledige lengte L, met de
 * opleggingen die bij de gekozen knikvorm horen, de normaalkracht bovenaan, de
 * eindmomenten M_yA en M_yB en de verdeelde belasting q_z. Naast de kolom staan
 * de drie kniklengtes als aparte maatlijnen, zodat meteen zichtbaar is welke
 * lengte afwijkt van L (bijvoorbeeld door een tussensteun).
 *
 * Rechts de doorsnede op schaal, met de sterke en de zwakke as aangegeven.
 *
 * Nog geen toetsing — zie templates/stalenKolom.ts.
 */
const MARKER = "Stalen kolom";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];

const DEFAULTS: Record<string, number> = {
  profiel: 5, staalsoort: 235, knikvorm: 1,
  L_kolom: 3200, L_cry: 3200, L_crz: 3200, L_cr: 3200,
  N_Ed: 10, M_yA: 0, M_yB: 0, q_z: 0, z_aangrijp: 0,
};

export default function StalenKolomDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const profId = Math.round(d("profiel"));
  const p = profiel(profId, 5);
  const fy = Math.round(d("staalsoort"));
  const knik = Math.round(d("knikvorm"));
  const L = Math.max(100, d("L_kolom"));
  const Lcry = Math.max(1, d("L_cry")), Lcrz = Math.max(1, d("L_crz")), Lcr = Math.max(1, d("L_cr"));
  const N = d("N_Ed"), MA = d("M_yA"), MB = d("M_yB"), qz = d("q_z");
  const zA = clamp(d("z_aangrijp"), 0, L);

  // Slankheid is puur geometrisch — geen toetsing, wel meteen informatief.
  const Iy = (p.b * p.h ** 3 - (p.b - p.tw) * (p.h - 2 * p.tf) ** 3) / 12;
  const Iz = (2 * p.tf * p.b ** 3 + (p.h - 2 * p.tf) * p.tw ** 3) / 12;
  const iy = Math.sqrt(Iy / p.A), iz = Math.sqrt(Iz / p.A);
  const lam1 = 93.9 * Math.sqrt(235 / fy);
  const lamY = Lcry / iy / lam1, lamZ = Lcrz / iz / lam1;
  const maatgevend = lamZ >= lamY ? "z" : "y";

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 16;
  const W = box.w, H = Math.max(260, box.h - capH);
  // In een smalle pane onder elkaar in plaats van naast elkaar.
  const gestapeld = W < 520;
  const KW = gestapeld ? W : Math.min(W * 0.62, W - 150);   // breedte knikschema
  const DW = gestapeld ? W : W - KW - gap;                  // breedte doorsnede
  const KH = gestapeld ? Math.max(190, (H - gap - capH) * 0.70) : H;
  const DH = gestapeld ? Math.max(120, (H - gap - capH) * 0.30) : H;
  const offX = gestapeld ? 0 : KW + gap;            // x-nulpunt van het tweede beeld

  const mT = 58, mB = 46;
  const sL = (KH - mT - mB) / L;                    // verticale schaal [px/mm]
  const cx = KW * 0.42;
  const yTop = mT, yBot = mT + L * sL;
  const kolPx = Math.max(6, p.b * sL * 3);          // getekende kolombreedte

  // dwarsdoorsnede
  const sD = clamp(Math.min((DW - 40) / p.b, (DH - 90) / p.h), 0.02, 2.2);
  const dcx = offX + DW / 2, dcy = DH * 0.46;

  /** Oplegtekens: scharnier onder, en boven een rol (verplaatsbaar) of geleider. */
  const Steun = ({ y, onder }: { y: number; onder: boolean }) => (
    <g>
      <polygon points={`${cx},${y} ${cx - 13},${y + (onder ? 17 : -17)} ${cx + 13},${y + (onder ? 17 : -17)}`}
        fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.5} />
      {onder
        ? <line x1={cx - 20} y1={y + 17} x2={cx + 20} y2={y + 17} stroke="#1e40af" strokeWidth={2} />
        : knik === 2
          ? [-7, 7].map((o) => <circle key={o} cx={cx + o} cy={y - 21} r={4} fill="#fff" stroke="#1e40af" strokeWidth={1.4} />)
          : <line x1={cx - 20} y1={y - 17} x2={cx + 20} y2={y - 17} stroke="#1e40af" strokeWidth={2} />}
    </g>
  );

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — stalen kolom</strong>
        <span className="vd-uc info">
          {p.naam} · λ̄<sub>{maatgevend}</sub> = {fmt(Math.max(lamY, lamZ), 2)}
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Profiel</span>
          <label>Staalprofiel
            <select value={profId} onChange={(e) => set("profiel", parseInt(e.target.value))}>
              {profielOpties().map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <span className="gd-note">i<sub>y</sub> = {fmt(iy, 1)} mm · i<sub>z</sub> = {fmt(iz, 1)} mm · A = {fmt(p.A)} mm²</span>

          <span className="vd-ctrl-h">Geometrie (mm)</span>
          <label>Kolomlengte L
            <input type="number" step={100} value={L} onChange={(e) => set("L_kolom", parseFloat(e.target.value))} />
          </label>
          <label title="Kniklengte voor buigknik om de sterke as">Kniklengte L<sub>cr,y</sub>
            <input type="number" step={100} value={Lcry} onChange={(e) => set("L_cry", parseFloat(e.target.value))} />
          </label>
          <label title="Kniklengte voor buigknik om de zwakke as">Kniklengte L<sub>cr,z</sub>
            <input type="number" step={100} value={Lcrz} onChange={(e) => set("L_crz", parseFloat(e.target.value))} />
          </label>
          <label title="Ongesteunde lengte voor kip">Ongesteunde lengte L<sub>cr</sub>
            <input type="number" step={100} value={Lcr} onChange={(e) => set("L_cr", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Knikvorm
            <select style={{ width: "100%" }} value={knik} onChange={(e) => set("knikvorm", parseInt(e.target.value))}>
              <option value={1}>Niet verplaatsbare knopen</option>
              <option value={2}>Verplaatsbare knopen</option>
            </select>
          </label>
          <span className="gd-note">Relatieve slankheid λ̄<sub>y</sub> = {fmt(lamY, 2)} · λ̄<sub>z</sub> = {fmt(lamZ, 2)} —
            de {maatgevend === "z" ? "zwakke" : "sterke"} as is maatgevend.</span>

          <span className="vd-ctrl-h">Belastingen</span>
          <label>N<sub>Ed</sub> (kN)
            <input type="number" step={10} value={N} onChange={(e) => set("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>yA,Ed</sub> (kNm)
            <input type="number" step={5} value={MA} onChange={(e) => set("M_yA", parseFloat(e.target.value))} />
          </label>
          <label>M<sub>yB,Ed</sub> (kNm)
            <input type="number" step={5} value={MB} onChange={(e) => set("M_yB", parseFloat(e.target.value))} />
          </label>
          <label>q<sub>z,Ed</sub> (kN/m)
            <input type="number" step={1} value={qz} onChange={(e) => set("q_z", parseFloat(e.target.value))} />
          </label>
          <label title="Aangrijpingspunt van de dwarsbelasting, gemeten vanaf de bovenkant">z t.o.v. bovenkant (mm)
            <input type="number" step={100} min={0} value={zA} onChange={(e) => set("z_aangrijp", parseFloat(e.target.value))} />
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: gestapeld ? "column" : "row", alignItems: gestapeld ? "stretch" : "flex-start", gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Knikschema</div>
            <div className="vd-stage" style={{ width: KW, height: KH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={KW} height={KH} className="vd-svg">
                <Defs k="sk" />
                {/* de kolom */}
                <rect x={cx - kolPx / 2} y={yTop} width={kolPx} height={L * sL} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.5} />
                <line x1={cx} y1={yTop} x2={cx} y2={yBot} stroke="#1e40af" strokeWidth={0.9} strokeDasharray="10 4 2 4" />
                <Steun y={yBot} onder />
                <Steun y={yTop} onder={false} />

                {/* normaalkracht bovenaan */}
                <line x1={cx} y1={yTop - 46} x2={cx} y2={yTop - 4} className="vd-load" strokeWidth={3.2} markerEnd={loadMark("sk")} />

                {/* eindmomenten */}
                {MA !== 0 && (
                  <path d={`M ${cx + 26} ${yTop + 14} A 26 26 0 1 1 ${cx + 26} ${yTop + 15}`}
                    fill="none" stroke="#dc2626" strokeWidth={2.2} markerEnd={loadMark("sk")} />
                )}
                {MB !== 0 && (
                  <path d={`M ${cx + 26} ${yBot - 15} A 26 26 0 1 1 ${cx + 26} ${yBot - 14}`}
                    fill="none" stroke="#dc2626" strokeWidth={2.2} markerEnd={loadMark("sk")} />
                )}

                {/* verdeelde belasting loodrecht op de kolom */}
                {qz !== 0 && Array.from({ length: 7 }, (_, i) => {
                  const y = yTop + ((L * sL) / 6) * i;
                  return <line key={i} x1={cx - kolPx / 2 - 34} y1={y} x2={cx - kolPx / 2 - 4} y2={y}
                    className="vd-load" strokeWidth={2} markerEnd={loadMark("sk")} />;
                })}
                {qz !== 0 && <line x1={cx - kolPx / 2 - 34} y1={yTop} x2={cx - kolPx / 2 - 34} y2={yBot} stroke="#dc2626" strokeWidth={1.4} />}

                {/* aangrijpingspunt van de dwarsbelasting */}
                {zA > 0 && (
                  <line x1={cx - kolPx / 2 - 8} y1={yTop + zA * sL} x2={cx + kolPx / 2 + 8} y2={yTop + zA * sL}
                    stroke="#b45309" strokeWidth={1.4} strokeDasharray="6 3" />
                )}

                {/* kniklengtes als aparte maatkolommen */}
                <VDim k="sk" y0={yTop} y1={yBot} x={cx + kolPx / 2 + 40} ext={cx + kolPx / 2 + 6} />
                <VDim k="sk" y0={yTop} y1={yTop + Math.min(Lcry, L) * sL} x={cx + kolPx / 2 + 96} />
                <VDim k="sk" y0={yTop} y1={yTop + Math.min(Lcrz, L) * sL} x={cx + kolPx / 2 + 148} />
              </svg>

              <Force ctx={ctx} name="N_Ed" value={N} x={cx + 34} y={yTop - 56} unit="kN" label="N_Ed" />
              {MA !== 0 && <Force ctx={ctx} name="M_yA" value={MA} x={cx + 66} y={yTop + 6} unit="kNm" label="M_yA" step={5} />}
              {MB !== 0 && <Force ctx={ctx} name="M_yB" value={MB} x={cx + 66} y={yBot - 26} unit="kNm" label="M_yB" step={5} />}
              {qz !== 0 && <Force ctx={ctx} name="q_z" value={qz} x={cx - kolPx / 2 - 84} y={(yTop + yBot) / 2} unit="kN/m" label="q_z" step={1} />}
              <Dim ctx={ctx} name="L_kolom" value={L} x={cx + kolPx / 2 + 40} y={(yTop + yBot) / 2} step={100} label="L" />
              <Dim ctx={ctx} name="L_cry" value={Lcry} x={cx + kolPx / 2 + 96} y={yTop + (Math.min(Lcry, L) * sL) / 2} step={100} label="Lcr,y" />
              <Dim ctx={ctx} name="L_crz" value={Lcrz} x={cx + kolPx / 2 + 148} y={yTop + (Math.min(Lcrz, L) * sL) / 2} step={100} label="Lcr,z" />
              {zA > 0 && <Ro text={`z=${fmt(zA)}`} x={cx - kolPx / 2 - 30} y={yTop + zA * sL - 14} kleur="#b45309" title="aangrijpingspunt van q_z" />}
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: DW, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={DW} height={DH} className="vd-svg">
                <Defs k="sd" />
                <IProfiel cx={dcx - offX} cy={dcy} h={p.h} b={p.b} tw={p.tw} tf={p.tf} s={sD} />
                {/* assen */}
                <line x1={dcx - offX - (p.b * sD) / 2 - 16} y1={dcy} x2={dcx - offX + (p.b * sD) / 2 + 16} y2={dcy}
                  stroke="#dc2626" strokeWidth={1} strokeDasharray="9 4 2 4" />
                <line x1={dcx - offX} y1={dcy - (p.h * sD) / 2 - 16} x2={dcx - offX} y2={dcy + (p.h * sD) / 2 + 16}
                  stroke="#dc2626" strokeWidth={1} strokeDasharray="9 4 2 4" />
                <text x={dcx - offX + (p.b * sD) / 2 + 20} y={dcy + 4} style={{ fontSize: 11, fill: "#dc2626", fontWeight: 700 }}>y</text>
                <text x={dcx - offX - 4} y={dcy - (p.h * sD) / 2 - 22} textAnchor="middle" style={{ fontSize: 11, fill: "#dc2626", fontWeight: 700 }}>z</text>
                <text x={dcx - offX} y={dcy + (p.h * sD) / 2 + 32} textAnchor="middle" style={{ fontSize: 11, fill: "#1e40af", fontWeight: 700 }}>
                  {p.naam}
                </text>
                <text x={dcx - offX} y={dcy + (p.h * sD) / 2 + 46} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>
                  {fmt(p.h)} × {fmt(p.b)} · t{"ₑ"}={fmt(p.tf, 1)} · t{"ᵥ"}={fmt(p.tw, 1)}
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of rode belasting om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De drie kniklengtes staan als aparte maatkolommen naast de kolom, zodat een afwijkende lengte meteen opvalt.</span>
        <span className="vd-live">
          {p.naam} S{fy} · L = {fmt(L)} mm · L<sub>cr,y</sub>/L<sub>cr,z</sub>/L<sub>cr</sub> = {fmt(Lcry)}/{fmt(Lcrz)}/{fmt(Lcr)} mm ·
          {knik === 1 ? " niet verplaatsbaar" : " verplaatsbaar"} · i<sub>y</sub>/i<sub>z</sub> = {fmt(iy, 1)}/{fmt(iz, 1)} mm ·
          λ̄<sub>y</sub>/λ̄<sub>z</sub> = {fmt(lamY, 2)}/{fmt(lamZ, 2)} · N<sub>Ed</sub> = {fmt(N)} kN ·
          M<sub>yA</sub>/M<sub>yB</sub> = {fmt(MA)}/{fmt(MB)} kNm · q<sub>z</sub> = {fmt(qz)} kN/m
        </span>
      </div>
    </div>
  );
}
