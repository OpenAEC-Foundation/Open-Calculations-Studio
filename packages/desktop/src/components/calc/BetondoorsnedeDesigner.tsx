import { useDesigner, Dim, Ro, Defs, betonFill, HDim, VDim, fmt, clamp, UitkomstKop } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import { useActiefExemplaar } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een gewapende rechthoekige betondoorsnede.
 *
 * De doorsnede wordt op ware verhouding getekend: beugel op de dekking, drie
 * wapeningslagen (onder, midden, boven) met de staven gelijkmatig over de
 * beugelbreedte verdeeld, en de staafdiameters op schaal. Rechts staan de
 * lagen benoemd zoals op een wapeningstekening.
 *
 * De toetsing staat in het rekenblad (templates/betondoorsnede.ts): de kop
 * toont de maatgevende UC en het oordeel van het blad, de voetregel de UC per
 * toets, en de tekening de drukzone uit dezelfde uitwerking. Het beeld rekent
 * zelf alleen de oppervlakken en het wapeningspercentage uit, voor de tekening.
 */
const MARKER = "Betondoorsnede";

const BETON = [20, 25, 30, 35, 40, 45, 50];
const BETONLABEL: Record<number, string> = {
  20: "C20/25", 25: "C25/30", 30: "C30/37", 35: "C35/45", 40: "C40/50", 45: "C45/55", 50: "C50/60",
};
const STAALSOORT = [{ v: 1, label: "B500A" }, { v: 2, label: "B500B" }, { v: 3, label: "B500C" }];
const MILIEU = [{ v: 1, label: "X0 of XC1 (0,4 mm)" }, { v: 2, label: "XC2–XC4 (0,3 mm)" }, { v: 3, label: "XD of XS (0,2 mm)" }];
const DUUR = [{ v: 1, label: "Langdurend (k_t = 0,4)" }, { v: 2, label: "Kortdurend (k_t = 0,6)" }];
const DIAM = [6, 8, 10, 12, 16, 20, 25, 32];

// Een balk 200×300 in C30/37 met 2Ø16 onder, 2Ø8 in de tussenlaag, 2Ø12 boven
// en beugels Ø8-150, op buiging en dwarskracht. Dezelfde waarden als de
// standaardinvoer van scripts/check-betondoorsnede.mjs.
//
// M_Ed_max begint op 0 (= de doorsnede met het grootste moment, geen toeslag
// uit de verschuivingsregel): de seed vult ook bestaande bladen aan zodra het
// beeld opent, en een andere startwaarde zou hun uitkomst stil veranderen.
const DEFAULTS: Record<string, number> = {
  b_dsn: 200, h_dsn: 300, betonklasse: 30, betonstaal: 2, c_dek: 25,
  n_onder: 2, d_onder: 16, n_midden: 2, d_midden: 8, n_boven: 2, d_boven: 12,
  d_beugel: 8, s_beugel: 150, n_sneden: 2,
  N_Ed: 0, M_Ed: 35, V_Ed: 50, T_Ed: 0, M_Ed_max: 0,
  N_fr: 0, M_fr: 20, "φ_kr": 2, milieuklasse: 2, belastingduur: 1,
};

// Een bestaand blad zonder M_fr is van vóór de frequente combinatie: het heeft
// nog N_qp en M_qp, of het is bijgewerkt terwijl het beeld dicht was en die
// zijn al vervallen. Dat krijgt geen voorbeeldwaarde voor M_fr: het blad meldt
// dan dat de scheurwijdte niet getoetst is, in plaats van stil te rekenen met
// een moment dat de gebruiker nooit heeft ingevuld. Een nieuw blad heeft nog
// geen waarden en krijgt de gewone beginwaarden.
const DEFAULTS_OUD_BLAD: Record<string, number> = { ...DEFAULTS, M_fr: 0 };

/** Eén unity check uit het blad, gekleurd naar de uitkomst; ∞ bij weerstand nul. */
function UcChip({ naam, uc }: { naam: string; uc: number | undefined }) {
  if (uc === undefined || Number.isNaN(uc)) return null;
  const staat = uc > 1 ? "bad" : uc > 0.9 ? "warn" : "ok";
  return <span className={`vd-uc-chip ${staat}`}>{naam} {Number.isFinite(uc) ? fmt(uc, 2) : "∞"}</span>;
}

export default function BetondoorsnedeDesigner() {
  const waarden = useActiefExemplaar()?.waarden;
  const oudBlad = !!waarden && !("M_fr" in waarden) && Object.keys(waarden).some((k) => k in DEFAULTS);
  const ctx = useDesigner(MARKER, oudBlad ? DEFAULTS_OUD_BLAD : DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;
  const g = uitkomst?.getallen ?? {};

  const b = Math.max(50, d("b_dsn")), h = Math.max(50, d("h_dsn"));
  const fck = Math.round(d("betonklasse"));
  const staal = Math.round(d("betonstaal"));
  const c = Math.max(10, d("c_dek"));
  const nO = clamp(Math.round(d("n_onder")), 0, 12), dO = Math.max(4, d("d_onder"));
  const nM = clamp(Math.round(d("n_midden")), 0, 12), dM = Math.max(4, d("d_midden"));
  const nB = clamp(Math.round(d("n_boven")), 0, 12), dB = Math.max(4, d("d_boven"));
  const dBg = Math.max(4, d("d_beugel")), sBg = Math.max(20, d("s_beugel"));
  const nSn = clamp(Math.round(d("n_sneden")), 2, 6);
  const NEd = d("N_Ed"), MEd = d("M_Ed"), VEd = d("V_Ed"), TEd = d("T_Ed"), MEdMax = d("M_Ed_max");
  const Nfr = d("N_fr"), Mfr = d("M_fr"), phi = d("φ_kr");
  const milieu = Math.round(d("milieuklasse")), duur = Math.round(d("belastingduur"));

  // Geometrie van de wapening — alleen oppervlakken, voor de tekening en de notitie.
  const A = (n: number, dia: number) => (n * Math.PI * dia * dia) / 4;
  const AsO = A(nO, dO), AsM = A(nM, dM), AsB = A(nB, dB);
  const Astot = AsO + AsM + AsB;
  const rho = (Astot / (b * h)) * 100;

  // Gedrukte rand bij de UGT, zoals het blad hem kiest: tegenover de trekzijde
  // van M_Ed, bij M_Ed = 0 die van M_Ed,max en anders die van M_fr.
  const bovenGedrukt = MEd !== 0 ? MEd > 0 : MEdMax !== 0 ? MEdMax > 0 : !(Mfr < 0);
  const xu = g.x_u, yc = g.y_c;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24;
  const W = box.w, H = Math.max(260, box.h - capH);
  const mL = 78, mR = 130, mT = 44, mB = 52;
  const s = clamp(Math.min((W - mL - mR) / b, (H - mT - mB) / h), 0.02, 3);
  const cx = mL + (W - mL - mR) / 2, cy = mT + (H - mT - mB) / 2;
  const x0 = cx - (b * s) / 2, x1 = cx + (b * s) / 2;
  const y0 = cy - (h * s) / 2, y1 = cy + (h * s) / 2;

  // beugel: de buitenkant op de dekking, dus de hartlijn (waarop de lijn
  // getekend wordt) een halve beugeldikte naar binnen
  const bgPx = Math.max(1.6, dBg * s);
  const bx0 = x0 + c * s + bgPx / 2, bx1 = x1 - c * s - bgPx / 2;
  const by0 = y0 + c * s + bgPx / 2, by1 = y1 - c * s - bgPx / 2;
  const rr = Math.max(3, dBg * s * 2);

  /** Staven van één laag, gelijkmatig tegen de binnenkant van de beugel. */
  const laag = (n: number, dia: number, y: number) => {
    if (n <= 0) return [];
    const r = Math.max(2.2, (dia * s) / 2);
    const l = bx0 + bgPx / 2 + r, rgt = bx1 - bgPx / 2 - r;
    return Array.from({ length: n }, (_, i) => ({
      x: n === 1 ? (l + rgt) / 2 : l + ((rgt - l) * i) / (n - 1), y, r,
    }));
  };
  const yO = by1 - bgPx / 2 - (dO * s) / 2;
  const yB = by0 + bgPx / 2 + (dB * s) / 2;
  const yM = (yO + yB) / 2;
  const staven = [...laag(nB, dB, yB), ...laag(nM, dM, yM), ...laag(nO, dO, yO)];

  // Drukzone uit het blad: het spanningsblok λ·x_u en de neutrale lijn op x_u.
  const blokH = yc !== undefined ? clamp(yc, 0, h) * s : 0;
  const blokY = bovenGedrukt ? y0 : y1 - blokH;
  const naY = xu !== undefined && xu < h ? (bovenGedrukt ? y0 + xu * s : y1 - xu * s) : null;

  const UC = (naam: string) => g[naam];
  const regels = Math.max(UC("UC_As_min") ?? 0, UC("UC_As_max") ?? 0, UC("UC_ρw") ?? 0, UC("UC_sl") ?? 0, UC("UC_st") ?? 0, UC("UC_sl_T") ?? 0);

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — betondoorsnede" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Doorsnede (mm)</span>
          <label>Breedte b
            <input type="number" step={10} value={d("b_dsn")} onChange={(e) => set("b_dsn", parseFloat(e.target.value))} />
          </label>
          <label>Hoogte h
            <input type="number" step={10} value={d("h_dsn")} onChange={(e) => set("h_dsn", parseFloat(e.target.value))} />
          </label>
          <label>Betonsterkteklasse
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
            <input type="number" step={5} value={d("c_dek")} onChange={(e) => set("c_dek", parseFloat(e.target.value))} />
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
              <input type="number" step={25} min={20} value={d("s_beugel")} style={{ width: 58 }}
                onChange={(e) => set("s_beugel", parseFloat(e.target.value))} />
            </span>
          </label>
          <label>Beugelsneden
            <input type="number" step={1} min={2} max={6} value={nSn} onChange={(e) => set("n_sneden", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">A<sub>s,onder</sub> = {fmt(AsO)} · A<sub>s,midden</sub> = {fmt(AsM)} ·
            A<sub>s,boven</sub> = {fmt(AsB)} mm²{g.M_Rd !== undefined && <> · M<sub>Rd</sub> = {fmt(g.M_Rd, 1)} kNm</>}
            {g.V_Rd_c !== undefined && <> · V<sub>Rd,c</sub> = {fmt(g.V_Rd_c, 1)} kN</>}.</span>

          <span className="vd-ctrl-h">Belastingen (UGT)</span>
          <label title="Druk positief">N<sub>Ed</sub> (kN)
            <input type="number" step={10} value={NEd} onChange={(e) => set("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Positief bij trek onderin">M<sub>Ed</sub> (kNm)
            <input type="number" step={5} value={MEd} onChange={(e) => set("M_Ed", parseFloat(e.target.value))} />
          </label>
          <label>V<sub>Ed</sub> (kN)
            <input type="number" step={10} value={VEd} onChange={(e) => set("V_Ed", parseFloat(e.target.value))} />
          </label>
          <label>T<sub>Ed</sub> (kNm)
            <input type="number" step={1} value={TEd} onChange={(e) => set("T_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Het grootste moment in de ligger, zelfde teken als M_Ed. Begrenst de toeslag uit de verschuivingsregel (ΔF_td); 0 = dit is de doorsnede met het grootste moment">M<sub>Ed,max</sub> (kNm)
            <input type="number" step={5} value={MEdMax} onChange={(e) => set("M_Ed_max", parseFloat(e.target.value))} />
          </label>
          <span className="vd-ctrl-h">Belastingen (BGT, frequent)</span>
          <label title="Druk positief; frequente combinatie volgens de NB bij 7.3.1(5)">N<sub>fr</sub> (kN)
            <input type="number" step={10} value={Nfr} onChange={(e) => set("N_fr", parseFloat(e.target.value))} />
          </label>
          <label title="N_fr = M_fr = 0: de scheurwijdte wordt niet getoetst">M<sub>fr</sub> (kNm)
            <input type="number" step={5} value={Mfr} onChange={(e) => set("M_fr", parseFloat(e.target.value))} />
          </label>
          <label title="Kruipcoëfficiënt φ(∞,t₀); telt alleen bij een langdurende belasting">φ(∞,t<sub>0</sub>)
            <input type="number" step={0.1} min={0} value={phi} onChange={(e) => set("φ_kr", parseFloat(e.target.value))} />
          </label>
          <label>Milieuklasse
            <select value={milieu} onChange={(e) => set("milieuklasse", parseInt(e.target.value))}>
              {MILIEU.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Belastingduur
            <select value={duur} onChange={(e) => set("belastingduur", parseInt(e.target.value))}>
              {DUUR.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          {g.w_k !== undefined && <span className="gd-note">w<sub>k</sub> = {fmt(g.w_k, 3)} mm
            {g.σ_s !== undefined && <> bij σ<sub>s</sub> = {fmt(g.σ_s)} N/mm²</>}.</span>}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                <Defs k="bt" />
                {/* beton */}
                <rect x={x0} y={y0} width={b * s} height={h * s} fill={betonFill("bt")} stroke="#6b7280" strokeWidth={1.4} />
                {/* drukzone uit het blad: spanningsblok en neutrale lijn */}
                {blokH > 0 && <rect x={x0} y={blokY} width={b * s} height={blokH} fill="rgba(220,38,38,0.16)" stroke="none" />}
                {naY !== null && <line x1={x0 - 6} y1={naY} x2={x1 + 6} y2={naY} stroke="#b91c1c" strokeWidth={1} strokeDasharray="7 4" />}
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

              <Dim ctx={ctx} name="b_dsn" value={d("b_dsn")} x={cx} y={y1 + 28} step={10} label="b" />
              <Dim ctx={ctx} name="h_dsn" value={d("h_dsn")} x={x0 - 32} y={cy} step={10} label="h" />
              <Ro text={`c=${fmt(c)}`} x={x0 + c * s + 22} y={y0 + (c * s) / 2} title="dekking op de beugel" />
              {nB > 0 && <Ro text={`${nB}Ø${fmt(dB)}`} x={x1 + 62} y={yB} title={`${fmt(AsB)} mm²`} />}
              {nM > 0 && <Ro text={`${nM}Ø${fmt(dM)}`} x={x1 + 62} y={yM} title={`${fmt(AsM)} mm²`} />}
              {nO > 0 && <Ro text={`${nO}Ø${fmt(dO)}`} x={x1 + 62} y={yO} title={`${fmt(AsO)} mm²`} />}
              <Ro text={`Ø${fmt(dBg)}-${fmt(sBg)} (${nSn}sn.)`} x={x1 + 74} y={(yB + yM) / 2} kleur="#1e3a8a" title="beugels" />
              {naY !== null && xu !== undefined &&
                <Ro text={`x=${fmt(xu)}`} x={x0 - 64} y={naY} kleur="#b91c1c" title="drukzonehoogte x_u uit het blad (UGT)" />}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />De staven staan op schaal; rood is de drukzone van de UGT uit het blad.</span>
        <span className="vd-live">
          <UcChip naam="N" uc={UC("UC_N") || undefined} />
          <UcChip naam="M" uc={UC("UC_M")} />
          <UcChip naam="V" uc={UC("UC_V")} />
          <UcChip naam={TEd !== 0 ? "diagonalen (6.29)" : "diagonalen (6.9)"} uc={UC("UC_Vmax")} />
          <UcChip naam="wringing, langs" uc={UC("UC_Tl") || undefined} />
          <UcChip naam="§9.2" uc={uitkomst && UC("UC_st") !== undefined ? regels : undefined} />
          <UcChip naam="w_k" uc={UC("UC_w")} />
          <span>
            {BETONLABEL[fck] ?? `C${fck}`} · {STAALSOORT.find((o) => o.v === staal)?.label} · {fmt(b)}×{fmt(h)} mm · A<sub>s</sub> = {fmt(Astot)} mm² ({fmt(rho, 2)} %)
          </span>
        </span>
      </div>
    </div>
  );
}
