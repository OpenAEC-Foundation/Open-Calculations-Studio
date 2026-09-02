import { useDesigner, Dim, Ro, Defs, betonFill, HDim, VDim, fmt, clamp } from "./designerKit";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van de verankeringslengte (NEN-EN 1992-1-1 §8.4).
 *
 * De de referentie-uitwerking-module heeft geen tekening; in plaats daarvan toont dit paneel
 * twee dingen die het getal verklaren:
 *   • Boven — de staaf in het beton op ware verhouding: de dekking c, de
 *     staafdiameter en de lengte l_bd naast de ondergrens l_b,min. Bij een
 *     gebogen staaf wordt de haak meegetekend, want die stuurt α₁ en α₂.
 *   • Onder — l_bd per staafdiameter, het equivalent van het optionele
 *     "verankeringslengte per diameter"-lijstje in het referentieprogramma.
 *     De staaf die je gekozen hebt licht op; balken waar l_b,min maatgevend is
 *     krijgen een aparte kleur, zodat je meteen ziet waar de ondergrens bijt.
 *
 * Rekenregels identiek aan templates/verankeringslengte.ts, gecalibreerd op
 * document1B (C45/55 · B500B · Ø16 · c 30 · goed · recht → l_bd = 379 mm).
 */
const MARKER = "Verankeringslengte";

const BETON: { v: number; label: string }[] = [
  { v: 12, label: "C12/15" }, { v: 16, label: "C16/20" }, { v: 20, label: "C20/25" },
  { v: 25, label: "C25/30" }, { v: 30, label: "C30/37" }, { v: 35, label: "C35/45" },
  { v: 40, label: "C40/50" }, { v: 45, label: "C45/55" }, { v: 50, label: "C50/60" },
  { v: 55, label: "C55/67" }, { v: 60, label: "C60/75" },
];
const STAALSOORT = [{ v: 500, label: "B500A" }, { v: 501, label: "B500B" }, { v: 502, label: "B500C" }];
const DIAM = [6, 8, 10, 12, 16, 20, 25, 32, 40];
/** De zes diameters die het referentieprogramma in zijn per-diameter-lijst toont. */
const DIAM_GRAFIEK = [6, 8, 10, 12, 16, 20];

const DEFAULTS: Record<string, number> = {
  betonklasse: 45, betonstaal: 501, diameter: 16, c_dek: 30,
  aanhechting: 1, staaftype: 1, A_req: 0, A_prov: 0,
};

/** §8.4 — dezelfde volgorde als het rekenblad. */
function verankering(fck: number, ds: number, cd: number, goed: boolean, type: number, sig: number) {
  const fctm = fck <= 50 ? 0.3 * fck ** (2 / 3) : 2.12 * Math.log(1 + (fck + 8) / 10);
  const fctd = (0.7 * fctm) / 1.5;
  const eta1 = goed ? 1.0 : 0.7;
  const eta2 = ds <= 32 ? 1.0 : (132 - ds) / 100;
  const fbd = 2.25 * eta1 * eta2 * fctd;                       // (8.2)
  const lbrqd = (ds / 4) * (sig / fbd);                        // (8.3)
  // Tabel 8.2: α₁ = 0,7 alleen bij "anders dan recht" én c_d > 3Ø.
  const a1 = type !== 1 && cd > 3 * ds ? 0.7 : 1.0;
  // Wat de referentie-uitwerking doet: de staafvorm buiten beschouwing laten.
  const a1xc = cd > 3 * ds ? 0.7 : 1.0;
  const ruw = type === 1 ? 1 - (0.15 * (cd - ds)) / ds : 1 - (0.15 * (cd - 3 * ds)) / ds;
  const a2 = Math.min(Math.max(ruw, 0.7), 1.0);
  const a3 = 1.0, a4 = 1.0, a5 = 1.0;
  const lbmin = Math.max(0.3 * lbrqd, 10 * ds, 100);           // (8.6)
  const ber = a1 * a2 * a3 * a4 * a5 * lbrqd;
  const lbdXc = Math.max(a1xc * a2 * a3 * a4 * a5 * lbrqd, lbmin);
  return { fctm, fctd, eta1, eta2, fbd, lbrqd, a1, a1xc, a2, a3, a4, a5,
           lbmin, ber, lbd: Math.max(ber, lbmin), minMaatgevend: ber < lbmin,
           lbdXc, afwijkt: Math.abs(Math.max(ber, lbmin) - lbdXc) > 0.5 };
}

export default function VerankeringslengteDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const fck = Math.round(d("betonklasse"));
  const staal = Math.round(d("betonstaal"));
  const ds = Math.round(d("diameter"));
  const cd = Math.max(5, d("c_dek"));
  const goed = Math.round(d("aanhechting")) === 1;
  const type = Math.round(d("staaftype"));
  const Areq = Math.max(0, d("A_req")), Aprov = Math.max(0, d("A_prov"));

  const fyd = 500 / 1.15;
  const sig = Areq > 0 && Aprov > 0 ? (fyd * Areq) / Aprov : fyd;
  const r = verankering(fck, ds, cd, goed, type, sig);
  const benut = Areq > 0 && Aprov > 0;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(260, box.h - 2 * capH - gap);
  const SH = Math.max(120, totH * 0.46), GH = totH - SH;

  // doorsnede: de staaf horizontaal in een betonstrook
  const mL = 60, mR = 54;
  const beeldMM = r.lbd * 1.22;                                 // wat lengte overhoud
  const s = clamp(Math.min((W - mL - mR) / beeldMM, (SH - 76) / (cd * 2 + ds * 5)), 0.004, 2.4);
  const x0 = mL;
  const cy = SH * 0.50;
  const dsPx = Math.max(3, ds * s), cPx = Math.max(4, cd * s);
  const betonH = Math.max(26, 2 * cPx + dsPx * 3);
  const xEind = x0 + r.lbd * s;
  const xMin = x0 + r.lbmin * s;
  const haak = type === 2 ? Math.max(10, 5 * dsPx) : 0;

  // grafiek: l_bd per diameter
  const perDiam = DIAM_GRAFIEK.map((dd) => ({ dd, ...verankering(fck, dd, cd, goed, type, sig) }));
  const gMax = Math.max(...perDiam.map((p) => p.lbd)) * 1.16;
  const gL = 52, gR = 14, gT = 14, gB = 30;
  const gw = Math.max(40, W - gL - gR), gh = Math.max(40, GH - gT - gB);
  const bw = gw / perDiam.length;

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — verankeringslengte</strong>
        <span className="vd-uc info">l<sub>bd</sub> = {fmt(r.lbd)} mm</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Materiaal</span>
          <label>Betonsterkteklasse
            <select value={fck} onChange={(e) => set("betonklasse", parseInt(e.target.value))}>
              {BETON.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Betonstaalsoort
            <select value={staal} onChange={(e) => set("betonstaal", parseInt(e.target.value))}>
              {STAALSOORT.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Diameter (mm)
            <select value={ds} onChange={(e) => set("diameter", parseInt(e.target.value))}>
              {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
            </select>
          </label>
          <label title="Tevens de maatgevende c_d uit figuur 8.3">Dekking c (mm)
            <input type="number" step={5} min={5} value={cd} onChange={(e) => set("c_dek", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Condities</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="Slechte aanhechting geldt o.a. bovenin een dikke doorsnede (η₁ = 0,7)">Aanhechtingsomstandigheden
            <select style={{ width: "100%" }} value={goed ? 1 : 2} onChange={(e) => set("aanhechting", parseInt(e.target.value))}>
              <option value={1}>Goed</option>
              <option value={2}>Slecht</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Staaftype
            <select style={{ width: "100%" }} value={type} onChange={(e) => set("staaftype", parseInt(e.target.value))}>
              <option value={1}>Recht</option>
              <option value={2}>Anders dan recht</option>
            </select>
          </label>

          <span className="vd-ctrl-h">Benutting</span>
          <label title="Beide op 0 laten betekent: rekenen met de volle f_yd">Benodigd A<sub>s</sub> (mm²)
            <input type="number" step={10} min={0} value={Areq} onChange={(e) => set("A_req", parseFloat(e.target.value))} />
          </label>
          <label>Aanwezig A<sub>s</sub> (mm²)
            <input type="number" step={10} min={0} value={Aprov} onChange={(e) => set("A_prov", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">σ<sub>sd</sub> = {fmt(sig)} N/mm²
            {benut ? ` (f_yd · ${fmt(Areq)}/${fmt(Aprov)})` : " (volle f_yd — oppervlakken staan op 0)"}</span>

          <span className="vd-ctrl-h">Tussenresultaten</span>
          <span className="gd-note">f<sub>ctm</sub> = {fmt(r.fctm, 2)} · f<sub>ctd</sub> = {fmt(r.fctd, 2)} ·
            η<sub>1</sub> = {fmt(r.eta1, 2)} · η<sub>2</sub> = {fmt(r.eta2, 2)} →
            f<sub>bd</sub> = {fmt(r.fbd, 2)} N/mm²</span>
          <span className="gd-note">l<sub>b,rqd</sub> = {fmt(r.lbrqd)} mm ·
            α<sub>1</sub>…α<sub>5</sub> = {fmt(r.a1, 2)} · {fmt(r.a2, 2)} · {fmt(r.a3, 2)} · {fmt(r.a4, 2)} · {fmt(r.a5, 2)}</span>
          <span className="gd-note" style={{ color: r.minMaatgevend ? "#b45309" : undefined }}>
            l<sub>b,min</sub> = {fmt(r.lbmin)} mm · berekend {fmt(r.ber)} mm →
            <b> l<sub>bd</sub> = {fmt(r.lbd)} mm</b>{r.minMaatgevend ? " (ondergrens maatgevend)" : ""}</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Staaf in het beton</div>
            <div className="vd-stage" style={{ width: W, height: SH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={SH} className="vd-svg">
                <Defs k="vk" />
                {/* betonstrook */}
                <rect x={x0 - 22} y={cy - betonH / 2} width={W - mR - x0 + 30} height={betonH}
                  fill={betonFill("vk")} stroke="#6b7280" strokeWidth={1.2} />
                {/* de staaf, met eventueel een haak aan het eind */}
                <line x1={x0 - 18} y1={cy} x2={xEind} y2={cy} stroke="#111827" strokeWidth={dsPx} strokeLinecap="butt" />
                {haak > 0 && (
                  <path d={`M ${xEind} ${cy} q ${haak * 0.55} 0 ${haak * 0.55} ${-haak * 0.55} l 0 ${-haak * 0.45}`}
                    fill="none" stroke="#111827" strokeWidth={dsPx} strokeLinecap="round" />
                )}
                {/* aanhechtpijltjes langs de staaf */}
                {Array.from({ length: 9 }, (_, i) => {
                  const xx = x0 + ((xEind - x0) * (i + 0.5)) / 9;
                  return (
                    <g key={i}>
                      <line x1={xx} y1={cy - dsPx / 2 - 3} x2={xx} y2={cy - dsPx / 2 - 10} stroke="#1d4ed8" strokeWidth={1.1} />
                      <line x1={xx} y1={cy + dsPx / 2 + 3} x2={xx} y2={cy + dsPx / 2 + 10} stroke="#1d4ed8" strokeWidth={1.1} />
                    </g>
                  );
                })}
                {/* dekking boven de staaf */}
                <VDim k="vk" y0={cy - betonH / 2} y1={cy - dsPx / 2} x={x0 + 26} />
                {/* l_bd en l_b,min */}
                <HDim k="vk" x0={x0} x1={xEind} y={cy + betonH / 2 + 26} ext={cy + betonH / 2 + 4} />
                <line x1={xMin} y1={cy + betonH / 2 + 4} x2={xMin} y2={cy + betonH / 2 + 44}
                  stroke={r.minMaatgevend ? "#b45309" : "#9ca3af"} strokeWidth={1.3} strokeDasharray="6 3" />
                <text x={xMin + 5} y={cy + betonH / 2 + 55} style={{ fontSize: 10, fill: r.minMaatgevend ? "#b45309" : "#9ca3af" }}>
                  l<tspan baselineShift="sub">b,min</tspan> = {fmt(r.lbmin)}
                </text>
                {/* trekkracht aan het vrije uiteinde */}
                <text x={x0 - 26} y={cy - dsPx / 2 - 16} textAnchor="start" style={{ fontSize: 11, fill: "#dc2626", fontWeight: 700 }}>
                  σ<tspan baselineShift="sub">sd</tspan> = {fmt(sig)}
                </text>
              </svg>

              <Dim ctx={ctx} name="c_dek" value={cd} x={x0 + 26} y={(cy - betonH / 2 + cy - dsPx / 2) / 2} step={5} label="c" />
              <Ro text={`lbd=${fmt(r.lbd)}`} x={(x0 + xEind) / 2} y={cy + betonH / 2 + 26}
                kleur="#1d4ed8" title="rekenwaarde van de verankeringslengte" />
              <Ro text={`Ø${ds}`} x={x0 - 4} y={cy + dsPx / 2 + 16} title="staafdiameter" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">l<sub>bd</sub> per staafdiameter</div>
            <div className="vd-stage" style={{ width: W, height: GH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={GH} className="vd-svg">
                <Defs k="vg" />
                <line x1={gL} y1={gT} x2={gL} y2={gT + gh} stroke="#6b7280" strokeWidth={1} />
                <line x1={gL} y1={gT + gh} x2={gL + gw} y2={gT + gh} stroke="#6b7280" strokeWidth={1} />
                {[0.25, 0.5, 0.75, 1].map((f) => (
                  <g key={f}>
                    <line x1={gL} y1={gT + gh - f * gh} x2={gL + gw} y2={gT + gh - f * gh} stroke="#e5e7eb" strokeWidth={1} />
                    <text x={gL - 6} y={gT + gh - f * gh + 3.5} textAnchor="end" style={{ fontSize: 9, fill: "#9ca3af" }}>
                      {fmt(gMax * f)}
                    </text>
                  </g>
                ))}
                {perDiam.map((p, i) => {
                  const hgt = (p.lbd / gMax) * gh;
                  const x = gL + i * bw + bw * 0.2, w = bw * 0.6;
                  const actief = p.dd === ds;
                  const kleur = p.minMaatgevend ? "#b45309" : "#1d4ed8";
                  return (
                    <g key={p.dd}>
                      <rect x={x} y={gT + gh - hgt} width={w} height={hgt} rx={2}
                        fill={kleur} opacity={actief ? 0.95 : 0.34} />
                      <text x={x + w / 2} y={gT + gh - hgt - 4} textAnchor="middle"
                        style={{ fontSize: 9.5, fontWeight: actief ? 700 : 400, fill: kleur }}>{fmt(p.lbd)}</text>
                      <text x={x + w / 2} y={gT + gh + 14} textAnchor="middle"
                        style={{ fontSize: 9.5, fontWeight: actief ? 700 : 400, fill: "#374151" }}>Ø{p.dd}</text>
                    </g>
                  );
                })}
                <text x={gL + gw} y={gT + 10} textAnchor="end" style={{ fontSize: 9.5, fill: "#b45309" }}>
                  oranje = l<tspan baselineShift="sub">b,min</tspan> maatgevend
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op de blauwe dekking om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De staaflengte staat op schaal; de stippellijn is de ondergrens l<sub>b,min</sub> uit (8.6).</span>
        <span className="vd-live">
          {BETON.find((o) => o.v === fck)?.label} · {STAALSOORT.find((o) => o.v === staal)?.label} · Ø{ds} ·
          c = {fmt(cd)} mm · {goed ? "goede" : "slechte"} aanhechting ·
          {type === 1 ? " rechte staaf" : " anders dan recht"} ·
          f<sub>bd</sub> = {fmt(r.fbd, 2)} N/mm² · σ<sub>sd</sub> = {fmt(sig)} N/mm² ·
          l<sub>b,rqd</sub> = {fmt(r.lbrqd)} · α<sub>2</sub> = {fmt(r.a2, 2)} · l<sub>b,min</sub> = {fmt(r.lbmin)} ·
          <b> l<sub>bd</sub> = {fmt(r.lbd)} mm</b>
        </span>
      </div>
    </div>
  );
}
