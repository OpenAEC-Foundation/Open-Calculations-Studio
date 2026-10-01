import { useDesigner, Dim, Force, Ro, Defs, HDim, VDim, loadMark, fmt, clamp } from "./designerKit";
import { useAlleenLezen } from "../../store/actiefBlad";
import { VERBAND_PROFIELEN } from "./windverbandProfielen";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het rekenblad "Verticaal windverband".
 *
 * Twee aanzichten:
 *   • Het stabiliteitsvak — kolommen, regel en diagonalen, met de horizontale
 *     kracht, de verticale belasting op de kolommen en de maten b en h. In een
 *     X-kruis is de gedrukte diagonaal slap getekend.
 *   • De aansluiting van de diagonaal — het aangesloten been of de strip op de
 *     knoopplaat, met de boutgaten op eindafstand e₁, steek p₁ en randafstand
 *     e₂, of de twee flankelassen met keelhoogte a en lengte l_w.
 *
 * Het beeld rekent zelf niets; de krachten en alle toetsen staan in het
 * rekenblad.
 */
const MARKER = "Verticaal windverband";

const WERKING = [
  { v: 1, label: "X-kruis, alleen trek" },
  { v: 2, label: "Enkele diagonaal" },
];
const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const AANSLUITING = [
  { v: 0, label: "Gelast" },
  { v: 1, label: "Eén bout" },
  { v: 2, label: "Twee bouten" },
  { v: 3, label: "Drie bouten of meer" },
];
const GRENS = [{ v: 300, label: "h/300" }, { v: 150, label: "h/150" }, { v: 500, label: "h/500" }];

// Een L 60×60×6 S235 in een X-kruis van 6 × 5 m, aangesloten met twee bouten
// M16 in gaten van 18 mm. Dezelfde waarden als in scripts/check-windverband.mjs.
// De las (a_w, l_w) heeft bewust geen startwaarde: een blad dat op "gelast"
// wordt gezet, meldt de las als niet getoetst tot a en l_w zijn ingevuld.
const DEFAULTS: Record<string, number> = {
  verbandtype: 1, profile: 20, staalkwaliteit: 235, b_v: 6, h_v: 5, F_w_k: 40, V_Ed: 600, m_k: 4,
  aansluiting: 2, d_0: 18, p_1: 60, e_1: 40, e_2: 30, n_d: 1, grens_u: 300,
};

export default function WindverbandDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // In de afdruk valt er niets te klikken; dan ook geen aanwijzing daarvoor.
  const afdruk = useAlleenLezen();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const werking = Math.round(d("verbandtype")) === 2 ? 2 : 1;
  const profId = Math.round(d("profile"));
  const p = VERBAND_PROFIELEN[profId] ?? VERBAND_PROFIELEN[20];
  const hoek = p.soort === 2;
  const fy = Math.round(d("staalkwaliteit"));
  const bv = Math.max(0.5, d("b_v")), hv = Math.max(0.5, d("h_v"));
  const Fw = d("F_w_k"), V = d("V_Ed");
  const mk = clamp(Math.round(d("m_k")), 1, 50);
  const aans = clamp(Math.round(d("aansluiting")), 0, 3);
  // De tekening klemt de maten op iets tekenbaars; de maatchips tonen de waarden uit het blad.
  const d0Blad = d("d_0"), p1Blad = d("p_1"), e2Blad = d("e_2");
  const d0 = Math.max(1, d0Blad), p1 = Math.max(d0, p1Blad), e2 = Math.max(d0 / 2, e2Blad);
  const nd = clamp(Math.round(d("n_d")), 1, 6);
  const e1 = d("e_1"), aw = d("a_w"), lw = d("l_w");
  const grens = Math.round(d("grens_u"));
  const Ld = Math.hypot(bv, hv);
  const alfa = (Math.atan2(hv, bv) * 180) / Math.PI;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 16;
  const W = box.w, H = Math.max(300, box.h - capH);
  const gestapeld = W < 560;
  const BW = gestapeld ? W : Math.max(240, W * 0.48);
  const DW = gestapeld ? W : W - BW - gap;
  const BH = gestapeld ? clamp(H * 0.62, 260, 420) : H;
  const DH = gestapeld ? clamp(H * 0.45, 200, 320) : Math.min(H, 320);

  // het vak
  const mL = 86, mR = 52, mT = 70, mB = 58;
  const sB = Math.min((BW - mL - mR) / bv, (BH - mT - mB) / hv);
  const x0 = mL + Math.max(0, (BW - mL - mR - bv * sB) / 2), x1 = x0 + bv * sB;
  const y0 = mT, y1 = mT + hv * sB;

  // de aansluiting: been of strip van boven gezien, met de knoopplaat links
  const nb = aans === 0 ? 0 : aans === 3 ? 3 : aans;
  // Niet ingevulde maten (0) tekenen op een gangbare maat; de maatchip toont de waarde uit het blad.
  const e1T = e1 > 0 ? e1 : 2 * d0;
  const lwT = lw > 0 ? lw : 1.2 * p.b;
  // de overlap met de knoopplaat: bij bouten e₁ + steken + e₁, bij een las de laslengte plus een rand
  const overlap = aans === 0 ? lwT + 10 : 2 * e1T + (nb > 1 ? (nb - 1) * p1 : 0);
  const lang = overlap + 0.8 * p.b;
  const sD = clamp(Math.min((DW - 110) / lang, (DH - 110) / p.b), 0.2, 4);
  const lx0 = 30, lx1 = lx0 + lang * sD;
  const ly0 = (DH - p.b * sD) / 2 + 6, ly1 = ly0 + p.b * sD;  // ly0: hiel (hoek) of rand; ly1: vrije rand
  const plaatX1 = lx0 + overlap * sD;  // eind van de knoopplaat
  const lasX1 = lx0 + lwT * sD;        // eind van de flankelassen
  const gatX = (i: number) => lx0 + (e1T + i * p1) * sD;
  // Een strip met één gat: dat gat zit in het midden en e₂ doet in het blad niet mee.
  const e2Telt = hoek || nd > 1;
  // Staan de maatchips van e₁ en p₁ te dicht op elkaar, dan zakt e₁ een regel.
  const yE1 = nb > 1 && ((e1T + p1) / 2) * sD < 48 ? ly1 + 52 : ly1 + 30;
  // strip: gaten gelijk over de breedte met e₂ aan beide randen; hoek: één rij op e₂ van de vrije rand
  const gatY = (j: number) =>
    hoek ? ly1 - e2 * sD
    : nd === 1 ? (ly0 + ly1) / 2
    : ly1 - e2 * sD - (j * (p.b - 2 * e2) * sD) / (nd - 1);
  const rGat = Math.max(2.2, (d0 / 2) * sD);
  const rijen = hoek ? 1 : nd;
  // De kracht loopt door het zwaartepunt: bij een hoekprofiel op e van de hiel,
  // dus naast de boutlijn. Dat verschil is de excentriciteit van §3.10.3.
  const yZw = hoek ? ly0 + p.e * sD : (ly0 + ly1) / 2;

  const profielen = [
    { kop: "Strippen", opties: Object.entries(VERBAND_PROFIELEN).filter(([, v]) => v.soort === 1) },
    { kop: "Hoekprofielen", opties: Object.entries(VERBAND_PROFIELEN).filter(([, v]) => v.soort === 2) },
  ];

  return (
    <div className="vd-panel" data-afdrukhoogte="110">
      <div className="vd-head">
        <strong>Parametrisch beeld — verticaal windverband</strong>
        <span className="vd-uc info">{p.naam} · S{fy} · {werking === 1 ? "X-kruis, trek" : "enkele diagonaal"}</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Diagonaal</span>
          <label>Werking
            <select value={werking} onChange={(e) => set("verbandtype", parseInt(e.target.value))}>
              {WERKING.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Profiel
            <select value={profId} onChange={(e) => set("profile", parseInt(e.target.value))}>
              {profielen.map((g) => (
                <optgroup key={g.kop} label={g.kop}>
                  {g.opties.map(([id, v]) => <option key={id} value={id}>{v.naam}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalkwaliteit", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          {werking === 2 && !hoek && (
            <span className="gd-note" style={{ color: "#b91c1c" }}>Een strip kan de druk bij omkerende wind niet opnemen.</span>
          )}

          <span className="vd-ctrl-h">Aansluiting</span>
          <label>Uitvoering
            <select value={aans} onChange={(e) => set("aansluiting", parseInt(e.target.value))}>
              {AANSLUITING.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          {aans >= 1 && !hoek && (
            <label>Gaten naast elkaar
              <input type="number" step={1} min={1} value={nd} onChange={(e) => set("n_d", parseFloat(e.target.value))} />
            </label>
          )}

          <span className="vd-ctrl-h">Stabiliteit</span>
          <label>Kolommen m
            <input type="number" step={1} min={1} value={mk} onChange={(e) => set("m_k", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">V<sub>Ed</sub> is de verticale rekenbelasting op de kolommen die dit verband stabiliseert; de scheefstand volgt uit 5.3.2.</span>

          <span className="vd-ctrl-h">Verplaatsing</span>
          <label>Grens
            <select value={grens} onChange={(e) => set("grens_u", parseInt(e.target.value))}>
              {GRENS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: gestapeld ? "column" : "row", alignItems: gestapeld ? "stretch" : "flex-start", justifyContent: "safe center", gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Stabiliteitsvak</div>
            <div className="vd-stage" style={{ width: BW, height: BH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={BW} height={BH} className="vd-svg">
                <Defs k="wv" />
                {/* diagonalen: bij wind van links is de stijgende diagonaal getrokken */}
                {werking === 1 && (
                  <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#94a3b8" strokeWidth={1.4} strokeDasharray="6 4" />
                )}
                <line x1={x0} y1={y1} x2={x1} y2={y0} stroke="#047857" strokeWidth={3.4} />
                {/* kolommen en regel */}
                <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="#334155" strokeWidth={4} />
                <line x1={x1} y1={y0} x2={x1} y2={y1} stroke="#334155" strokeWidth={4} />
                <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="#334155" strokeWidth={3} />
                {/* scharnieren */}
                {[x0, x1].map((x) => (
                  <polygon key={x} points={`${x},${y1} ${x - 10},${y1 + 16} ${x + 10},${y1 + 16}`} fill="#fbbf24" stroke="#92400e" strokeWidth={1.2} />
                ))}
                <line x1={x0 - 18} y1={y1 + 16} x2={x1 + 18} y2={y1 + 16} stroke="#92400e" strokeWidth={1.2} />
                {/* belastingen */}
                <line x1={x0 - 70} y1={y0} x2={x0 - 6} y2={y0} className="vd-load" strokeWidth={3} markerEnd={loadMark("wv")} />
                {[x0, x1].map((x) => (
                  <line key={`v${x}`} x1={x} y1={y0 - 44} x2={x} y2={y0 - 6} className="vd-load" strokeWidth={2.2} markerEnd={loadMark("wv")} />
                ))}
                {/* labels op de diagonalen */}
                <text x={(x0 + x1) / 2 - 10} y={(y0 + y1) / 2 - 8} textAnchor="end" fontSize={11} fontWeight={700} fill="#047857"
                  style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>{werking === 1 ? "trek" : "trek of druk"}</text>
                {werking === 1 && (
                  <text x={(x0 + x1) / 2 + 14} y={(y0 + y1) / 2 + 22} fontSize={11} fontStyle="italic" fill="#64748b"
                    style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>slap</text>
                )}
                <text x={x0 + 30} y={y1 - 10} fontSize={11} fill="#047857">α = {fmt(alfa, 1)}°</text>
                {/* maten */}
                <HDim k="wv" x0={x0} x1={x1} y={y1 + 36} ext={y1 + 20} />
                <VDim k="wv" y0={y0} y1={y1} x={x1 + 30} ext={x1 + 6} />
              </svg>

              <Force ctx={ctx} name="F_w_k" value={Fw} x={x0 - 42} y={y0 - 22} unit="kN" label="Fw,k" step={5} />
              <Force ctx={ctx} name="V_Ed" value={V} x={(x0 + x1) / 2} y={y0 - 34} unit="kN" label="VEd" step={50} />
              <Dim ctx={ctx} name="b_v" value={bv} x={(x0 + x1) / 2} y={y1 + 36} step={0.5} label="b" dec={bv % 1 ? 2 : 0} />
              <Dim ctx={ctx} name="h_v" value={hv} x={x1 + 30} y={(y0 + y1) / 2} step={0.5} label="h" dec={hv % 1 ? 2 : 0} />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Aansluiting — {aans === 0 ? "gelast" : `${nb === 3 ? "drie of meer" : nb === 1 ? "één" : "twee"} ${nb === 1 ? "bout" : "bouten"}`}</div>
            <div className="vd-stage" style={{ width: DW, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={DW} height={DH} className="vd-svg">
                <Defs k="wa" />
                {/* knoopplaat */}
                <rect x={lx0 - 24} y={ly0 - 22} width={plaatX1 - lx0 + 24} height={ly1 - ly0 + 44} fill="#e2e8f0" stroke="#64748b" strokeWidth={1} />
                <text x={lx0 - 20} y={ly0 - 28} fontSize={10} fill="#64748b">knoopplaat</text>
                {/* been of strip */}
                <rect x={lx0} y={ly0} width={lx1 - lx0} height={ly1 - ly0} fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.3} />
                {hoek && <line x1={lx0} y1={ly0} x2={lx1} y2={ly0} stroke="#1e40af" strokeWidth={4} />}
                {hoek && <text x={lx1 - 4} y={ly0 - 6} textAnchor="end" fontSize={10} fill="#1e40af">hiel</text>}
                <path d={`M ${lx1} ${ly0} L ${lx1 - 6} ${(ly0 + ly1) / 2 - 4} L ${lx1 + 6} ${(ly0 + ly1) / 2 + 4} L ${lx1} ${ly1}`} fill="none" stroke="#1e40af" strokeWidth={0.9} strokeDasharray="4 3" />
                {/* boutgaten of las */}
                {aans === 0 ? (
                  <g>
                    <line x1={lx0} y1={ly0 - 3} x2={lasX1} y2={ly0 - 3} stroke="#d97706" strokeWidth={3} strokeLinecap="round" />
                    <line x1={lx0} y1={ly1 + 3} x2={lasX1} y2={ly1 + 3} stroke="#d97706" strokeWidth={3} strokeLinecap="round" />
                  </g>
                ) : (
                  Array.from({ length: nb }, (_, i) => Array.from({ length: rijen }, (_, j) => (
                    <g key={`${i}-${j}`}>
                      <circle cx={gatX(i)} cy={gatY(j)} r={rGat} fill="#fff" stroke="#1e40af" strokeWidth={1.3} />
                      <line x1={gatX(i) - rGat * 1.6} y1={gatY(j)} x2={gatX(i) + rGat * 1.6} y2={gatY(j)} stroke="#1e40af" strokeWidth={0.6} />
                      <line x1={gatX(i)} y1={gatY(j) - rGat * 1.6} x2={gatX(i)} y2={gatY(j) + rGat * 1.6} stroke="#1e40af" strokeWidth={0.6} />
                    </g>
                  )))
                )}
                {/* kracht in de diagonaal, op de zwaartelijn */}
                <line x1={lx0} y1={yZw} x2={lx1} y2={yZw} stroke="#b91c1c" strokeWidth={0.8} strokeDasharray="8 3 2 3" />
                <line x1={lx1 - 40} y1={yZw} x2={lx1 + 26} y2={yZw} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("wa")} />
                {/* maten */}
                {aans === 0 && <HDim k="wa" x0={lx0} x1={lasX1} y={ly1 + 34} ext={ly1 + 6} />}
                {nb >= 1 && <HDim k="wa" x0={lx0} x1={gatX(0)} y={yE1} ext={gatY(0) + rGat + 2} />}
                {nb > 1 && <HDim k="wa" x0={gatX(0)} x1={gatX(1)} y={ly1 + 30} ext={gatY(0) + rGat + 2} />}
                {nb >= 1 && <VDim k="wa" y0={gatY(0)} y1={ly1} x={gatX(0) - rGat - 24} ext={gatX(0) - rGat - 2} />}
                <VDim k="wa" y0={ly0} y1={ly1} x={lx1 + 52} ext={lx1 + 4} />
              </svg>

              {aans === 0 && <Dim ctx={ctx} name="l_w" value={lw} x={(lx0 + lasX1) / 2} y={ly1 + 34} step={10} label="lw" />}
              {aans === 0 && <Dim ctx={ctx} name="a_w" value={aw} x={(lx0 + lasX1) / 2} y={ly0 - 14} step={1} label="a" dec={aw % 1 ? 1 : 0} />}
              {nb >= 1 && <Dim ctx={ctx} name="e_1" value={e1} x={(lx0 + gatX(0)) / 2} y={yE1} step={5} label="e1" />}
              {nb > 1 && <Dim ctx={ctx} name="p_1" value={p1Blad} x={(gatX(0) + gatX(1)) / 2} y={ly1 + 30} step={5} label="p1" />}
              {nb >= 1 && (e2Telt
                ? <Dim ctx={ctx} name="e_2" value={e2Blad} x={gatX(0) - rGat - 24} y={(gatY(0) + ly1) / 2} step={5} label="e2" />
                : <Ro text={`b/2=${fmt(p.b / 2)}`} x={gatX(0) - rGat - 24} y={(gatY(0) + ly1) / 2} title="één gat in het midden van de strip; e₂ telt in het blad niet mee" />)}
              {nb >= 1 && <Dim ctx={ctx} name="d_0" value={d0Blad} x={gatX(Math.max(0, nb - 1)) + rGat + 26} y={gatY(0)} step={1} label="d0" />}
              <div className="vd-dim-ro" style={{ left: lx1 + 52, top: ly1 - 12, color: "#6b7280" }} title="breedte van het been of de strip (mm)">b={fmt(p.b)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>
          {afdruk ? "" : "Klik op een blauwe maat of een rode kracht om die te wijzigen — stroomt direct terug in de rekensheet."}
          {!afdruk && <br />}
          De krachten en alle toetsen staan in het rekenblad.
        </span>
        <span className="vd-live">
          {p.naam} S{fy} · vak {fmt(bv, 2)} × {fmt(hv, 2)} m, L<sub>d</sub> = {fmt(Ld, 2)} m, α = {fmt(alfa, 1)}° ·
          {" "}F<sub>w,k</sub> = {fmt(Fw)} kN · V<sub>Ed</sub> = {fmt(V)} kN, m = {mk} ·
          {" "}{aans === 0 ? `gelast, a = ${fmt(aw, aw % 1 ? 1 : 0)} mm, l_w = ${fmt(lw)} mm` : `${AANSLUITING[aans].label.toLowerCase()}, d₀ = ${fmt(d0Blad)} mm`} · h/{grens}
        </span>
      </div>
    </div>
  );
}
