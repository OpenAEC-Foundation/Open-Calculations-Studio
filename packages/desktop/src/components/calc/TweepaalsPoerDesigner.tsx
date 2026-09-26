import { useDesigner, Dim, Force, Ro, Defs, loadMark, betonFill, HDim, VDim, fmt, clamp, UitkomstKop } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een tweepaals poer.
 *
 * Twee aanzichten met één gedeelde horizontale schaal:
 *   • Plattegrond — de poer met de kolom in het midden en de twee palen
 *     gestippeld eronder.
 *   • Doorsnede — de poer met de trekband onderin (opgebogen boven de palen),
 *     de beugels, de kolomlast erop en de twee paalreacties eronder. De twee
 *     drukdiagonalen van het staafwerk lopen van de kolomknoop naar de palen.
 *
 * De toetsing staat in het blad (templates/tweepaalsPoer.ts). Het beeld rekent
 * die niet na: de kop toont de maatgevende UC en het oordeel van het blad, de
 * voetregel de UC per toets, en de diagonalen, de trekband en de ombuiging
 * worden getekend met de getallen van het blad (x_k, z, θ, r_b, l_v,nodig).
 * Alleen zolang het blad die niet geeft, tekent het beeld met een eigen
 * benadering.
 */
const MARKER = "Tweepaals poer";

const BETON = [20, 25, 30, 35, 40, 45];
const BETONLABEL: Record<number, string> = {
  20: "C20/25", 25: "C25/30", 30: "C30/37", 35: "C35/45", 40: "C40/50", 45: "C45/55",
};
const STAALSOORT = [{ v: 1, label: "B500A" }, { v: 2, label: "B500B" }, { v: 3, label: "B500C" }];
const DIAM = [12, 16, 20, 25, 32, 40];

const DEFAULTS: Record<string, number> = {
  kolomvorm: 1, paalvorm: 1, d_kolom: 500, b_kolom: 500, b_paal: 450, l_paal: 450,
  b_poer: 600, h_poer: 1250, l_hoh: 1600, oversteek: 400, e_paal: 100,
  betonklasse: 35, betonstaal: 2, betonoppervlak: 1, c_dek: 55,
  n_langs: 6, d_langs: 32, n_sneden: 4, d_beugel: 12, s_beugel: 75,
  F_Ed: 3600, M_Ed: 0, F_fr: 2500, R_cd: 2400,
};

/** Eén unity check uit het blad, gekleurd naar de uitkomst. */
function UcChip({ naam, uc }: { naam: string; uc: number | undefined }) {
  if (uc === undefined || !Number.isFinite(uc)) return <span className="vd-uc-nvt">{naam} —</span>;
  const staat = uc > 1 ? "bad" : uc > 0.9 ? "warn" : "ok";
  return <span className={`vd-uc-chip ${staat}`}>{naam} {fmt(uc, 2)}</span>;
}

export default function TweepaalsPoerDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const kolVorm = Math.round(d("kolomvorm"));        // 1 rond, 2 rechthoekig
  const paalVorm = Math.round(d("paalvorm"));        // 1 rechthoekig, 2 rond
  const dKol = Math.max(100, d("d_kolom"));
  const bKol = Math.max(100, d("b_kolom"));
  const bPaal = Math.max(100, d("b_paal")), lPaal = Math.max(100, d("l_paal"));
  const bPoer = Math.max(200, d("b_poer")), hPoer = Math.max(200, d("h_poer"));
  const lHoh = Math.max(2 * bPaal, d("l_hoh"));
  const over = Math.max(50, d("oversteek"));
  const ePaal = Math.max(0, d("e_paal"));
  const fck = Math.round(d("betonklasse"));
  const staal = Math.round(d("betonstaal"));
  const opp = Math.round(d("betonoppervlak"));
  const cDek = Math.max(20, d("c_dek"));
  const nL = clamp(Math.round(d("n_langs")), 1, 16), dL = Math.max(10, d("d_langs"));
  const nSn = clamp(Math.round(d("n_sneden")), 2, 6);
  const dBg = Math.max(6, d("d_beugel")), sBg = Math.max(50, d("s_beugel"));
  const FEd = d("F_Ed"), MEd = d("M_Ed"), Ffr = d("F_fr"), Rcd = d("R_cd");

  const lPoer = lHoh + 2 * over;                     // totale poerlengte
  const As = (nL * Math.PI * dL * dL) / 4;
  const yS = cDek + dBg + dL / 2;                    // hart trekband boven de onderkant

  // Getallen van het blad; de eigen benadering alleen als terugval.
  const g = uitkomst?.getallen ?? {};
  const uit = (naam: string, terug: number) => (Number.isFinite(g[naam]) ? g[naam] : terug);
  const dEff = hPoer - yS;
  const aK = kolVorm === 1 ? (dKol * Math.sqrt(Math.PI)) / 2 : dKol;
  const xK = uit("x_k", kolVorm === 1 ? (2 * dKol) / (3 * Math.PI) : dKol / 4);
  const aArm = uit("a", lHoh / 2 - xK);
  const zArm = uit("z", (dEff + Math.sqrt(Math.max(dEff * dEff - aK * aArm, 0))) / 2);
  const theta = uit("θ", (Math.atan2(zArm, aArm) * 180) / Math.PI);
  const R = uit("R_Ed", FEd / 2), Rmin = uit("R_Ed_min", FEd / 2);
  const Ftrek = uit("F_td", (R * aArm) / Math.max(zArm, 1));
  const rB = Math.max(dL, uit("r_b", 3 * dL));
  const lvNodig = uit("l_v_nodig", 0);

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(300, box.h - 2 * capH - gap);
  const PH = Math.max(90, totH * 0.30), DH = totH - PH;

  const s = clamp(Math.min((W - 130) / lPoer, (PH - 46) / bPoer, (DH - 130) / (hPoer * 1.9)), 0.005, 1.2);
  const cx = W * 0.47;
  const x0 = cx - (lPoer * s) / 2, x1 = cx + (lPoer * s) / 2;
  const px = (mm: number) => cx + mm * s;            // mm t.o.v. het poerhart

  // plattegrond
  const pcy = PH / 2;
  const pby0 = pcy - (bPoer * s) / 2, pby1 = pcy + (bPoer * s) / 2;
  const kolB = kolVorm === 1 ? dKol : bKol;           // kolommaat dwars op de paalrij
  const paalL = paalVorm === 1 ? lPaal : bPaal;

  // doorsnede
  const yTop = 62, yBot = yTop + hPoer * s;
  const yKolTop = yTop - 44;
  const yStaaf = yBot - yS * s;
  const yKnoop = yStaaf - zArm * s;                  // kolomknoop, z boven de trekband
  const rL = Math.max(2, (dL * s) / 2);
  // Trekband: het opgebogen been ligt op de dekking van de kop; de ombuiging
  // met straal r_b van het blad en het been zo lang als nodig (ten minste 5φ),
  // maar niet hoger dan de poer toelaat. Past de ombuiging niet (UC van het
  // blad boven 1), dan tekent het beeld haar afgekapt en rood.
  const xEind = Math.max(lHoh / 2, lPoer / 2 - cDek - dL / 2);
  const rT = Math.max(dL / 2, Math.min(rB, xEind, hPoer - cDek - yS));
  const lvMax = Math.max(0, hPoer - cDek - yS - rT);
  const bandKleur = (g.UC_rol ?? 0) > 1 || (g.UC_ank ?? 0) > 1 ? "#b91c1c" : "#111827";
  const lv = Math.min(Math.max(lvNodig, 5 * dL), lvMax);
  const trekband = [-1, 1].map((z) => {
    const xe = px(z * xEind), xb = px(z * (xEind - rT));
    return `M ${xe} ${yStaaf - (rT + lv) * s} L ${xe} ${yStaaf - rT * s} Q ${xe} ${yStaaf} ${xb} ${yStaaf}`;
  });

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — tweepaals poer" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Geometrie (mm)</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Kolomvorm
            <select style={{ width: "100%" }} value={kolVorm} onChange={(e) => set("kolomvorm", parseInt(e.target.value))}>
              <option value={1}>Ronde kolom</option>
              <option value={2}>Rechthoekige kolom</option>
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Paalvorm
            <select style={{ width: "100%" }} value={paalVorm} onChange={(e) => set("paalvorm", parseInt(e.target.value))}>
              <option value={1}>Rechthoekige paal</option>
              <option value={2}>Ronde paal</option>
            </select>
          </label>
          <label>{kolVorm === 1 ? "Kolomdiameter" : "Kolom langs de rij"}
            <input type="number" step={50} value={dKol} onChange={(e) => set("d_kolom", parseFloat(e.target.value))} />
          </label>
          {kolVorm === 2 && (
            <label>Kolom dwars
              <input type="number" step={50} value={bKol} onChange={(e) => set("b_kolom", parseFloat(e.target.value))} />
            </label>
          )}
          <label>{paalVorm === 2 ? "Paaldiameter" : "Paal langs de rij"}
            <input type="number" step={50} value={bPaal} onChange={(e) => set("b_paal", parseFloat(e.target.value))} />
          </label>
          {paalVorm === 1 && (
            <label>Paal dwars
              <input type="number" step={50} value={lPaal} onChange={(e) => set("l_paal", parseFloat(e.target.value))} />
            </label>
          )}
          <label>Poerbreedte b
            <input type="number" step={50} value={bPoer} onChange={(e) => set("b_poer", parseFloat(e.target.value))} />
          </label>
          <label>Poerhoogte h
            <input type="number" step={50} value={hPoer} onChange={(e) => set("h_poer", parseFloat(e.target.value))} />
          </label>
          <label>Hart-op-hart palen l
            <input type="number" step={100} value={lHoh} onChange={(e) => set("l_hoh", parseFloat(e.target.value))} />
          </label>
          <label>Oversteek
            <input type="number" step={50} value={over} onChange={(e) => set("oversteek", parseFloat(e.target.value))} />
          </label>
          <label title="Afwijking van de paalpositie in het werk (9.8.1(1))">Paalafwijking e
            <input type="number" step={25} min={0} value={ePaal} onChange={(e) => set("e_paal", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Poer wordt {fmt(lPoer)} × {fmt(bPoer)} × {fmt(hPoer)} mm.</span>

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
          <label style={{ flexDirection: "column", alignItems: "stretch" }} title="Niet controleerbaar: w_max = 0,2 mm in plaats van 0,3 mm">Betonoppervlak
            <select style={{ width: "100%" }} value={opp} onChange={(e) => set("betonoppervlak", parseInt(e.target.value))}>
              <option value={1}>Controleerbaar</option>
              <option value={2}>Niet controleerbaar</option>
            </select>
          </label>
          <label>Dekking c
            <input type="number" step={5} value={cDek} onChange={(e) => set("c_dek", parseFloat(e.target.value))} />
          </label>
          <label>Trekband
            <span style={{ display: "flex", gap: 4 }}>
              <input type="number" step={1} min={1} max={16} value={nL} style={{ width: 46 }}
                onChange={(e) => set("n_langs", parseFloat(e.target.value))} />
              <select value={dL} onChange={(e) => set("d_langs", parseFloat(e.target.value))}>
                {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
              </select>
            </span>
          </label>
          <label>Beugels
            <span style={{ display: "flex", gap: 4 }}>
              <select value={dBg} onChange={(e) => set("d_beugel", parseFloat(e.target.value))}>
                {[8, 10, 12, 16].map((x) => <option key={x} value={x}>Ø{x}</option>)}
              </select>
              <input type="number" step={25} min={50} value={sBg} style={{ width: 58 }}
                onChange={(e) => set("s_beugel", parseFloat(e.target.value))} />
            </span>
          </label>
          <label>Beugelsneden
            <input type="number" step={1} min={2} max={6} value={nSn} onChange={(e) => set("n_sneden", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">{nL}Ø{fmt(dL)} → A<sub>s</sub> = {fmt(As)} mm² · hefboomsarm z = {fmt(zArm)} mm.</span>

          <span className="vd-ctrl-h">Belasting</span>
          <label>F<sub>Ed</sub> (kN)
            <input type="number" step={100} value={FEd} onChange={(e) => set("F_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Kolommoment in de richting van de paalrij">M<sub>Ed</sub> (kNm)
            <input type="number" step={25} value={MEd} onChange={(e) => set("M_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Kolomlast in de frequente combinatie, voor de scheurwijdte (NB bij 7.3.1(5))">F<sub>fr</sub> (kN)
            <input type="number" step={100} value={Ffr} onChange={(e) => set("F_fr", parseFloat(e.target.value))} />
          </label>
          <label title="Rekenwaarde van het draagvermogen per paal; 0 = niet toetsen">R<sub>cd</sub> (kN)
            <input type="number" step={100} min={0} value={Rcd} onChange={(e) => set("R_cd", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">Zwaarste paal {fmt(R)} kN · diagonaal onder {fmt(theta)}° ·
            trekband F<sub>td</sub> = {fmt(Ftrek)} kN.</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Plattegrond</div>
            <div className="vd-stage" style={{ width: W, height: PH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={PH} className="vd-svg">
                <Defs k="tp" />
                <rect x={x0} y={pby0} width={lPoer * s} height={bPoer * s} fill="#f3f4f6" stroke="#6b7280" strokeWidth={1.4} />
                {/* palen gestippeld */}
                {[-1, 1].map((z) => (
                  paalVorm === 1
                    ? <rect key={z} x={px((z * lHoh) / 2) - (bPaal * s) / 2} y={pcy - (paalL * s) / 2}
                        width={bPaal * s} height={paalL * s} fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="8 5" />
                    : <circle key={z} cx={px((z * lHoh) / 2)} cy={pcy} r={(bPaal * s) / 2}
                        fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="8 5" />
                ))}
                {/* kolom */}
                {kolVorm === 1
                  ? <circle cx={cx} cy={pcy} r={(dKol * s) / 2} fill={betonFill("tp")} stroke="#1e40af" strokeWidth={1.5} />
                  : <rect x={cx - (dKol * s) / 2} y={pcy - (kolB * s) / 2} width={dKol * s} height={kolB * s}
                      fill={betonFill("tp")} stroke="#1e40af" strokeWidth={1.5} />}
                <HDim k="tp" x0={px(-lHoh / 2)} x1={px(lHoh / 2)} y={pby1 + 22} ext={pby1 + 4} />
                <VDim k="tp" y0={pby0} y1={pby1} x={x1 + 24} ext={x1 + 4} />
              </svg>

              <Dim ctx={ctx} name="l_hoh" value={lHoh} x={cx} y={pby1 + 22} step={100} label="l" />
              <Dim ctx={ctx} name="b_poer" value={bPoer} x={x1 + 24} y={pcy} step={50} label="b" />
              <Ro text={kolVorm === 1 ? `Ø${fmt(dKol)}` : `${fmt(dKol)}×${fmt(kolB)}`} x={cx} y={pby0 - 14} title="kolom" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede — staafwerk</div>
            <div className="vd-stage" style={{ width: W, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={DH} className="vd-svg">
                <Defs k="td" />
                {/* kolom boven de poer */}
                <rect x={cx - (dKol * s) / 2} y={yKolTop} width={dKol * s} height={yTop - yKolTop}
                  fill="#eaf1fb" stroke="#1e40af" strokeWidth={1.3} />
                {/* poer */}
                <rect x={x0} y={yTop} width={lPoer * s} height={hPoer * s} fill={betonFill("td")} stroke="#6b7280" strokeWidth={1.4} />
                {/* beugels op de werkelijke afstand */}
                {Array.from({ length: Math.min(80, Math.floor(lPoer / sBg)) }, (_, i) => {
                  const x = x0 + (i + 0.5) * sBg * s;
                  return x < x1 ? <line key={i} x1={x} y1={yTop + cDek * s} x2={x} y2={yBot - cDek * s}
                    stroke="#1e3a8a" strokeWidth={0.8} opacity={0.75} /> : null;
                })}
                {/* drukdiagonalen: van de kolomknoop naar het paalhart op de trekband */}
                {[-1, 1].map((z) => (
                  <g key={z}>
                    <line x1={px(z * xK)} y1={yKnoop} x2={px((z * lHoh) / 2)} y2={yStaaf}
                      stroke="#6b7280" strokeWidth={2} strokeDasharray="9 5" />
                    <circle cx={px(z * xK)} cy={yKnoop} r={3} fill="#6b7280" />
                  </g>
                ))}
                {/* trekband met opgebogen einden */}
                {trekband.map((dPad, i) => (
                  <path key={i} d={dPad} fill="none" stroke={bandKleur} strokeWidth={Math.max(2, rL * 2)} strokeLinecap="round" />
                ))}
                <line x1={px(-(xEind - rT))} y1={yStaaf} x2={px(xEind - rT)} y2={yStaaf}
                  stroke={bandKleur} strokeWidth={Math.max(2, rL * 2)} strokeLinecap="round" />
                {/* palen onder de poer */}
                {[-1, 1].map((z) => (
                  <g key={z}>
                    <rect x={px((z * lHoh) / 2) - (bPaal * s) / 2} y={yBot} width={bPaal * s} height={Math.min(46, DH - yBot - 34)}
                      fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="8 5" />
                    <line x1={px((z * lHoh) / 2)} y1={yBot + 46} x2={px((z * lHoh) / 2)} y2={yBot + 6}
                      className="vd-load" strokeWidth={2.8} markerEnd={loadMark("td")} />
                  </g>
                ))}
                {/* kolomlast */}
                <line x1={cx} y1={yKolTop - 40} x2={cx} y2={yKolTop - 4} className="vd-load" strokeWidth={3.4} markerEnd={loadMark("td")} />
                {/* maten */}
                <VDim k="td" y0={yTop} y1={yBot} x={x1 + 26} ext={x1 + 4} />
                <HDim k="td" x0={x0} x1={px(-lHoh / 2)} y={yBot + 66} ext={yBot + 50} />
                <HDim k="td" x0={px(-lHoh / 2)} x1={px(lHoh / 2)} y={yBot + 66} ext={yBot + 50} />
                <HDim k="td" x0={px(lHoh / 2)} x1={x1} y={yBot + 66} ext={yBot + 50} />
              </svg>

              <Force ctx={ctx} name="F_Ed" value={FEd} x={cx + 46} y={yKolTop - 48} unit="kN" label="F_Ed" step={100} />
              <Dim ctx={ctx} name="h_poer" value={hPoer} x={x1 + 26} y={(yTop + yBot) / 2} step={50} label="h" />
              <Dim ctx={ctx} name="oversteek" value={over} x={(x0 + px(-lHoh / 2)) / 2} y={yBot + 66} step={50} />
              <Ro text={fmt(lHoh)} x={cx} y={yBot + 66} title="hart-op-hart afstand van de palen" />
              <Ro text={fmt(over)} x={(px(lHoh / 2) + x1) / 2} y={yBot + 66} title="oversteek aan de andere zijde" />
              <Ro text={`${fmt(Rmin)} kN`} x={px(-lHoh / 2)} y={yBot + 52} kleur="#dc2626" title="minst belaste paal (blad)" />
              <Ro text={`${fmt(R)} kN`} x={px(lHoh / 2)} y={yBot + 52} kleur="#dc2626" title="zwaarst belaste paal (blad)" />
              <Ro text={`${nL}Ø${fmt(dL)}`} x={cx} y={yStaaf - 20} title={`trekband, A_s = ${fmt(As)} mm², F_td = ${fmt(Ftrek)} kN`} />
              <Ro text={`θ=${fmt(theta)}°`} x={px(-lHoh / 4) - 10} y={(yKnoop + yStaaf) / 2}
                title="hoek van de drukdiagonaal (blad)" />
              <Ro text={`z=${fmt(zArm)}`} x={px(xK) + 34} y={(yKnoop + yStaaf) / 2} title="hefboomsarm van het staafwerk (blad)" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />{BETONLABEL[fck]} · {STAALSOORT.find((o) => o.v === staal)?.label} · {kolVorm === 1 ? `ronde kolom Ø${fmt(dKol)}` : `kolom ${fmt(dKol)}×${fmt(kolB)}`} ·
          palen {paalVorm === 1 ? `${fmt(bPaal)}×${fmt(lPaal)}` : `Ø${fmt(bPaal)}`} h.o.h. {fmt(lHoh)} · e = {fmt(ePaal)} ·
          {nL}Ø{fmt(dL)} · Ø{fmt(dBg)}-{fmt(sBg)} ({nSn}sn.) · F<sub>Ed</sub> = {fmt(FEd)} kN · M<sub>Ed</sub> = {fmt(MEd)} kNm ·
          F<sub>fr</sub> = {fmt(Ffr)} kN · {opp === 1 ? "controleerbaar" : "niet controleerbaar"}</span>
        <span className="vd-live">
          {Rcd > 0 ? <UcChip naam="paal" uc={g.UC_paal} /> : <span className="vd-uc-nvt">paal n.v.t.</span>}
          <UcChip naam="trekband" uc={g.UC_trek} />
          <UcChip naam="knoop kolom" uc={g.UC_kn_1} />
          <UcChip naam="knoop paal" uc={g.UC_kn_2} />
          <UcChip naam="verankering" uc={g.UC_ank} />
          <UcChip naam="ombuiging" uc={g.UC_rol} />
          <UcChip naam="dwarskracht" uc={g.UC_V === undefined ? undefined : Math.max(g.UC_V, g.UC_Vmax ?? 0)} />
          <UcChip naam="scheurwijdte" uc={g.UC_w} />
        </span>
      </div>
    </div>
  );
}
