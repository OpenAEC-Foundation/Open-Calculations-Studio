import { useDesigner, Dim, Force, Ro, Defs, loadMark, betonFill, HDim, VDim, fmt, clamp, UitkomstKop } from "./designerKit";
import type { DesignerCtx } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import type { BladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een poer: op twee, drie of vier palen, of op staal.
 * De keuze `poertype` van het blad bepaalt welk beeld er staat.
 *
 * Tweepaals poer — twee aanzichten met één gedeelde horizontale schaal:
 *   • Plattegrond — de poer met de kolom in het midden en de twee palen
 *     gestippeld eronder.
 *   • Doorsnede — de poer met de trekband onderin (opgebogen boven de palen),
 *     de beugels, de kolomlast erop en de twee paalreacties eronder. De twee
 *     drukdiagonalen van het staafwerk lopen van de kolomknoop naar de palen.
 *
 * Drie- en vierpaals poer — de plattegrond met de palen, de trekbanden (langs
 * de randen, over de diagonalen of langs de zijden) en de drukdiagonalen van
 * de kolomknopen naar de palen; daaronder een aanzicht met het staafwerk
 * geprojecteerd op het vlak door de voorste palen.
 *
 * Poer op staal — de plattegrond met het effectieve funderingsoppervlak A′ van
 * het blad, en een doorsnede met maaiveld, grondwater, de kolomlast en de
 * grondspanning onder de poer (lineair, met de kier bij e > B/6).
 *
 * De toetsing staat in het blad (templates/tweepaalsPoer.ts). Het beeld rekent
 * die niet na: de kop toont de maatgevende UC en het oordeel van het blad, de
 * voetregel de UC per toets, en het staafwerk, de grondspanning en het
 * effectieve oppervlak worden getekend met de getallen van het blad. Alleen
 * zolang het blad die niet geeft, tekent het beeld met een eigen benadering.
 */
const MARKER = "Tweepaals poer";

const BETON = [20, 25, 30, 35, 40, 45];
const BETONLABEL: Record<number, string> = {
  20: "C20/25", 25: "C25/30", 30: "C30/37", 35: "C35/45", 40: "C40/50", 45: "C45/55",
};
const STAALSOORT = [{ v: 1, label: "B500A" }, { v: 2, label: "B500B" }, { v: 3, label: "B500C" }];
const DIAM = [12, 16, 20, 25, 32, 40];
/** Keuzes van `betonoppervlak` in het blad; w_max 0,3 / 0,2 / 0,2 mm. */
const OPPERVLAK = [
  { v: 1, label: "X0–XC4, te inspecteren", kort: "X0–XC4" },
  { v: 2, label: "X0–XC4, niet te inspecteren", kort: "niet te inspecteren" },
  { v: 3, label: "XD of XS", kort: "XD/XS" },
];
/** Keuzes van `poertype` in het blad; de eerste (2) is de oorspronkelijke tweepaals poer. */
const SOORTEN = [
  { v: 2, label: "Tweepaals poer" },
  { v: 3, label: "Driepaals poer (driehoek)" },
  { v: 4, label: "Vierpaals poer (rechthoek)" },
  { v: 1, label: "Poer op staal" },
];
/** Keuzes van `grondwater` in het blad. */
const GRONDWATER = [
  { v: 1, label: "Dieper dan de invloedsdiepte" },
  { v: 2, label: "Op de funderingszool" },
  { v: 3, label: "Op maaiveld" },
];

const DEFAULTS: Record<string, number> = {
  poertype: 2, kolomvorm: 1, paalvorm: 1, d_kolom: 500, b_kolom: 500, b_paal: 450, l_paal: 450,
  b_poer: 600, h_poer: 1250, l_hoh: 1600, oversteek: 400, e_paal: 100,
  betonklasse: 35, betonstaal: 2, betonoppervlak: 1, c_dek: 55,
  n_langs: 6, d_langs: 32, n_sneden: 4, d_beugel: 12, s_beugel: 75,
  F_Ed: 3600, M_Ed: 0, F_fr: 2500, R_cd: 2400,
  l_hoh_y: 1600, M_Ed_y: 0, trekbanden: 1,
  B_x: 2400, B_y: 2400, D_aanleg: 1500, belasting_staal: 1, afwijking: 1,
  phi_k: 30, c_eff_k: 0, gamma_k: 18, gamma_sat: 20, grondwater: 1,
  s_langs: 150, d_boven: 16, s_boven: 150, H_Ed: 0, phi_cv_k: 30, factoren: 1,
};

/** Eén unity check uit het blad, gekleurd naar de uitkomst. */
function UcChip({ naam, uc }: { naam: string; uc: number | undefined }) {
  if (uc === undefined || !Number.isFinite(uc)) return <span className="vd-uc-nvt">{naam} —</span>;
  const staat = uc > 1 ? "bad" : uc > 0.9 ? "warn" : "ok";
  return <span className={`vd-uc-chip ${staat}`}>{naam} {fmt(uc, 2)}</span>;
}

/** De keuze van het soort poer, bovenaan de invoerkolom van elk beeld. */
function SoortKeuze({ ctx }: { ctx: DesignerCtx }) {
  return (
    <label style={{ flexDirection: "column", alignItems: "stretch" }}>Soort poer
      <select style={{ width: "100%" }} value={Math.round(ctx.d("poertype"))}
        onChange={(e) => ctx.set("poertype", parseInt(e.target.value))}>
        {SOORTEN.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Betonklasse en staalsoort, in elk beeld gelijk. */
function BetonKeuze({ ctx }: { ctx: DesignerCtx }) {
  return (
    <>
      <label>Sterkteklasse
        <select value={Math.round(ctx.d("betonklasse"))} onChange={(e) => ctx.set("betonklasse", parseInt(e.target.value))}>
          {BETON.map((v) => <option key={v} value={v}>{BETONLABEL[v]}</option>)}
        </select>
      </label>
      <label>Betonstaalsoort
        <select value={Math.round(ctx.d("betonstaal"))} onChange={(e) => ctx.set("betonstaal", parseInt(e.target.value))}>
          {STAALSOORT.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      </label>
    </>
  );
}

export default function TweepaalsPoerDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const soort = Math.round(ctx.d("poertype"));
  if (soort === 3 || soort === 4) return <MeerpaalsBeeld ctx={ctx} uitkomst={uitkomst} drie={soort === 3} />;
  if (soort === 1) return <StaalBeeld ctx={ctx} uitkomst={uitkomst} />;
  return <TweepaalsBeeld ctx={ctx} uitkomst={uitkomst} />;
}

// ── Tweepaals poer ──────────────────────────────────────────────────────────

function TweepaalsBeeld({ ctx, uitkomst }: { ctx: DesignerCtx; uitkomst: BladUitkomst | null }) {
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
          <SoortKeuze ctx={ctx} />
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
          <BetonKeuze ctx={ctx} />
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="w_max volgens tabel 7.1N (NB): 0,3 mm bij X0 tot en met XC4, 0,2 mm bij XD en XS; niet te inspecteren: 0,2 mm">Milieuklasse, oppervlak
            <select style={{ width: "100%" }} value={opp} onChange={(e) => set("betonoppervlak", parseInt(e.target.value))}>
              {OPPERVLAK.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
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
          F<sub>fr</sub> = {fmt(Ffr)} kN · {OPPERVLAK.find((o) => o.v === opp)?.kort}</span>
        <span className="vd-live">
          {Rcd > 0 ? <UcChip naam="paal" uc={g.UC_paal} /> : <span className="vd-uc-nvt">paal n.v.t.</span>}
          <UcChip naam="trekband" uc={g.UC_trek} />
          <UcChip naam="knoop kolom" uc={g.UC_kn_1} />
          <UcChip naam="knoop paal" uc={g.UC_kn_2} />
          {g.T_Rd_dw === 0 && (g.T_dw ?? 0) > 0
            ? <span className="vd-uc-chip bad">dwarstrek: geen beugels</span>
            : <UcChip naam="dwarstrek" uc={g.UC_dw} />}
          <UcChip naam="verankering" uc={g.UC_ank} />
          <UcChip naam="ombuiging" uc={g.UC_rol} />
          <UcChip naam="dwarskracht" uc={g.UC_V === undefined ? undefined : Math.max(g.UC_V, g.UC_Vmax ?? 0)} />
          <UcChip naam="scheurwijdte" uc={g.UC_w} />
        </span>
      </div>
    </div>
  );
}

// ── Drie- en vierpaals poer ─────────────────────────────────────────────────

function MeerpaalsBeeld({ ctx, uitkomst, drie }: { ctx: DesignerCtx; uitkomst: BladUitkomst | null; drie: boolean }) {
  const { d, set, box, wrapRef } = ctx;

  const kolVorm = Math.round(d("kolomvorm"));        // 1 rond, 2 rechthoekig
  const paalVorm = Math.round(d("paalvorm"));        // 1 rechthoekig, 2 rond
  const dKol = Math.max(100, d("d_kolom")), bKol = Math.max(100, d("b_kolom"));
  const bPaal = Math.max(100, d("b_paal")), lPaal = Math.max(100, d("l_paal"));
  const hPoer = Math.max(200, d("h_poer"));
  const lx = Math.max(2 * bPaal, d("l_hoh")), ly = Math.max(2 * bPaal, d("l_hoh_y"));
  const over = Math.max(50, d("oversteek"));
  const ePaal = Math.max(0, d("e_paal"));
  const fck = Math.round(d("betonklasse"));
  const opp = Math.round(d("betonoppervlak"));
  const cDek = Math.max(20, d("c_dek"));
  const nL = clamp(Math.round(d("n_langs")), 1, 16), dL = Math.max(10, d("d_langs"));
  const diagonaal = !drie && Math.round(d("trekbanden")) === 2;
  const FEd = d("F_Ed"), MEd = d("M_Ed"), MEdy = d("M_Ed_y"), Ffr = d("F_fr"), Rcd = d("R_cd");
  const kolB = kolVorm === 1 ? dKol : bKol;
  const paalL = paalVorm === 1 ? lPaal : bPaal;
  const As = (nL * Math.PI * dL * dL) / 4;

  const g = uitkomst?.getallen ?? {};
  const uit = (naam: string, terug: number) => (Number.isFinite(g[naam]) ? g[naam] : terug);

  // Paalharten t.o.v. het hart van de kolom, y omhoog. Bij drie palen de zijde
  // met twee palen onder en de derde paal boven.
  const rP = lx / Math.sqrt(3);
  const palen: [number, number][] = drie
    ? [[-lx / 2, -rP / 2], [lx / 2, -rP / 2], [0, rP]]
    : [[-lx / 2, -ly / 2], [lx / 2, -ly / 2], [lx / 2, ly / 2], [-lx / 2, ly / 2]];
  // Omtrek: een rechthoek, of een driehoek met afgeschuinde hoeken met elke rand
  // op de oversteek van de paalharten (zoals in het blad).
  const omtrek: [number, number][] = [];
  if (drie) {
    for (const [px0, py0] of palen) {
      const n = Math.hypot(px0, py0), rx = px0 / n, ry = py0 / n, tx = -ry, ty = rx, k = over / Math.sqrt(3);
      omtrek.push([px0 + over * rx - k * tx, py0 + over * ry - k * ty], [px0 + over * rx + k * tx, py0 + over * ry + k * ty]);
    }
    omtrek.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
  } else {
    const Lx = lx + 2 * over, Ly = ly + 2 * over;
    omtrek.push([-Lx / 2, -Ly / 2], [Lx / 2, -Ly / 2], [Lx / 2, Ly / 2], [-Lx / 2, Ly / 2]);
  }
  const xs = omtrek.map((p) => p[0]), ys = omtrek.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);

  // Staafwerk met de getallen van het blad.
  const yS = uit("y_s", cDek + dL);
  const dEff = hPoer - yS;
  const xK = uit("x_k", drie ? (Math.sqrt(3) * Math.min(dKol, kolB)) / (2 * Math.PI) : kolVorm === 1 ? (2 * dKol) / (3 * Math.PI) : dKol / 4);
  const yK = drie ? xK : uit("y_k", kolVorm === 1 ? xK : kolB / 4);
  const zArm = uit("z", 0.85 * dEff);
  const theta = uit("θ", 45);
  const R = uit("R_Ed", FEd / palen.length), Rmin = uit("R_Ed_min", FEd / palen.length);
  const Ftrek = uit("F_td", 0);
  const knoop = (px0: number, py0: number): [number, number] => {
    if (drie) { const n = Math.hypot(px0, py0); return [(px0 / n) * xK, (py0 / n) * xK]; }
    return [Math.sign(px0) * xK, Math.sign(py0) * yK];
  };

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(320, box.h - 2 * capH - gap);
  const PH = Math.max(150, totH * 0.55), DH = totH - PH;
  const sP = clamp(Math.min((W - 130) / (maxX - minX), (PH - 60) / (maxY - minY)), 0.005, 1.2);
  const cx = W * 0.47;
  const cyP = PH / 2 + ((maxY + minY) / 2) * sP;
  const P = (x: number, y: number) => ({ x: cx + x * sP, y: cyP - y * sP });
  const bandKleur = (g.UC_rol ?? 0) > 1 || (g.UC_ank ?? 0) > 1 || (g.UC_trek ?? 0) > 1 ? "#b91c1c" : "#111827";
  const banden: [number, number][] = drie ? [[0, 1], [1, 2], [2, 0]] : diagonaal ? [[0, 2], [1, 3]] : [[0, 1], [1, 2], [2, 3], [3, 0]];

  // aanzicht: de voorste palen op ±l/2 in x
  const breedte = maxX - minX;
  const sD = clamp(Math.min((W - 130) / breedte, (DH - 120) / (hPoer * 1.6)), 0.005, 1.2);
  const dx = (mm: number) => cx + mm * sD;
  const yTop = 56, yBot = yTop + hPoer * sD;
  const yStaaf = yBot - yS * sD, yKnoop = yStaaf - zArm * sD;
  const rL = Math.max(2, (dL * sD) / 2);
  const xEind = lx / 2 + over - cDek - dL / 2;
  const rT = Math.max(dL / 2, Math.min(uit("r_b", 3 * dL), hPoer - cDek - yS));
  const lv = Math.min(Math.max(uit("l_v_nodig", 5 * dL), 5 * dL), Math.max(0, hPoer - cDek - yS - rT));
  const bandPad = [-1, 1].map((z) => {
    const xe = dx(z * xEind), xb = dx(z * (xEind - rT));
    return `M ${xe} ${yStaaf - (rT + lv) * sD} L ${xe} ${yStaaf - rT * sD} Q ${xe} ${yStaaf} ${xb} ${yStaaf}`;
  });

  return (
    <div className="vd-panel">
      <UitkomstKop titel={`Parametrisch beeld — ${drie ? "driepaals" : "vierpaals"} poer`} uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <SoortKeuze ctx={ctx} />
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
          <label>{kolVorm === 1 ? "Kolomdiameter" : "Kolom in x"}
            <input type="number" step={50} value={dKol} onChange={(e) => set("d_kolom", parseFloat(e.target.value))} />
          </label>
          {kolVorm === 2 && (
            <label>Kolom in y
              <input type="number" step={50} value={bKol} onChange={(e) => set("b_kolom", parseFloat(e.target.value))} />
            </label>
          )}
          <label>{paalVorm === 2 ? "Paaldiameter" : "Paal in x"}
            <input type="number" step={50} value={bPaal} onChange={(e) => set("b_paal", parseFloat(e.target.value))} />
          </label>
          {paalVorm === 1 && (
            <label>Paal in y
              <input type="number" step={50} value={lPaal} onChange={(e) => set("l_paal", parseFloat(e.target.value))} />
            </label>
          )}
          <label>Poerhoogte h
            <input type="number" step={50} value={hPoer} onChange={(e) => set("h_poer", parseFloat(e.target.value))} />
          </label>
          <label>{drie ? "Hart-op-hart palen" : "Hart-op-hart in x"}
            <input type="number" step={100} value={lx} onChange={(e) => set("l_hoh", parseFloat(e.target.value))} />
          </label>
          {!drie && (
            <label>Hart-op-hart in y
              <input type="number" step={100} value={ly} onChange={(e) => set("l_hoh_y", parseFloat(e.target.value))} />
            </label>
          )}
          <label>Oversteek
            <input type="number" step={50} value={over} onChange={(e) => set("oversteek", parseFloat(e.target.value))} />
          </label>
          <label title="Afwijking van de paalpositie in het werk (9.8.1(1))">Paalafwijking e
            <input type="number" step={25} min={0} value={ePaal} onChange={(e) => set("e_paal", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Beton en wapening</span>
          <BetonKeuze ctx={ctx} />
          <label style={{ flexDirection: "column", alignItems: "stretch" }}
            title="w_max volgens tabel 7.1N (NB): 0,3 mm bij X0 tot en met XC4, 0,2 mm bij XD en XS; niet te inspecteren: 0,2 mm">Milieuklasse, oppervlak
            <select style={{ width: "100%" }} value={opp} onChange={(e) => set("betonoppervlak", parseInt(e.target.value))}>
              {OPPERVLAK.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Dekking c
            <input type="number" step={5} value={cDek} onChange={(e) => set("c_dek", parseFloat(e.target.value))} />
          </label>
          <label>Per trekband
            <span style={{ display: "flex", gap: 4 }}>
              <input type="number" step={1} min={1} max={16} value={nL} style={{ width: 46 }}
                onChange={(e) => set("n_langs", parseFloat(e.target.value))} />
              <select value={dL} onChange={(e) => set("d_langs", parseFloat(e.target.value))}>
                {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
              </select>
            </span>
          </label>
          {!drie && (
            <label style={{ flexDirection: "column", alignItems: "stretch" }}>Trekbanden
              <select style={{ width: "100%" }} value={diagonaal ? 2 : 1} onChange={(e) => set("trekbanden", parseInt(e.target.value))}>
                <option value={1}>Langs de randen</option>
                <option value={2}>Over de diagonalen</option>
              </select>
            </label>
          )}
          <span className="gd-note">{nL}Ø{fmt(dL)} → A<sub>s</sub> = {fmt(As)} mm² per band · z = {fmt(zArm)} mm.</span>

          <span className="vd-ctrl-h">Belasting</span>
          <label>F<sub>Ed</sub> (kN)
            <input type="number" step={100} value={FEd} onChange={(e) => set("F_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Kolommoment in x-richting">M<sub>Ed</sub> (kNm)
            <input type="number" step={25} value={MEd} onChange={(e) => set("M_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Kolommoment in y-richting">M<sub>Ed,y</sub> (kNm)
            <input type="number" step={25} value={MEdy} onChange={(e) => set("M_Ed_y", parseFloat(e.target.value))} />
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
            <div className="vd-caption">Plattegrond — trekbanden en drukdiagonalen</div>
            <div className="vd-stage" style={{ width: W, height: PH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={PH} className="vd-svg">
                <Defs k="mp" />
                <polygon points={omtrek.map(([x, y]) => `${P(x, y).x},${P(x, y).y}`).join(" ")}
                  fill="#f3f4f6" stroke="#6b7280" strokeWidth={1.4} />
                {/* trekbanden */}
                {banden.map(([i, j]) => (
                  <line key={`${i}-${j}`} x1={P(...palen[i]).x} y1={P(...palen[i]).y} x2={P(...palen[j]).x} y2={P(...palen[j]).y}
                    stroke={bandKleur} strokeWidth={Math.max(2.5, dL * sP * 1.2)} strokeLinecap="round" opacity={0.8} />
                ))}
                {/* palen gestippeld */}
                {palen.map(([x, y], i) => (
                  paalVorm === 1
                    ? <rect key={i} x={P(x, y).x - (bPaal * sP) / 2} y={P(x, y).y - (paalL * sP) / 2} width={bPaal * sP} height={paalL * sP}
                        fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="8 5" />
                    : <circle key={i} cx={P(x, y).x} cy={P(x, y).y} r={(bPaal * sP) / 2}
                        fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="8 5" />
                ))}
                {/* kolom */}
                {kolVorm === 1
                  ? <circle cx={cx} cy={cyP} r={(dKol * sP) / 2} fill={betonFill("mp")} stroke="#1e40af" strokeWidth={1.5} />
                  : <rect x={cx - (dKol * sP) / 2} y={cyP - (kolB * sP) / 2} width={dKol * sP} height={kolB * sP}
                      fill={betonFill("mp")} stroke="#1e40af" strokeWidth={1.5} />}
                {/* drukdiagonalen in plattegrond */}
                {palen.map(([x, y], i) => {
                  const [kx, ky] = knoop(x, y);
                  return (
                    <g key={i}>
                      <line x1={P(kx, ky).x} y1={P(kx, ky).y} x2={P(x, y).x} y2={P(x, y).y} stroke="#6b7280" strokeWidth={1.6} strokeDasharray="7 4" />
                      <circle cx={P(kx, ky).x} cy={P(kx, ky).y} r={2.6} fill="#6b7280" />
                    </g>
                  );
                })}
                <HDim k="mp" x0={P(palen[0][0], 0).x} x1={P(palen[1][0], 0).x} y={P(0, minY).y + 22} ext={P(0, minY).y + 4} />
                {!drie && <VDim k="mp" y0={P(0, palen[2][1]).y} y1={P(0, palen[1][1]).y} x={P(maxX, 0).x + 24} ext={P(maxX, 0).x + 4} />}
              </svg>
              <Dim ctx={ctx} name="l_hoh" value={lx} x={cx} y={P(0, minY).y + 22} step={100} label="l" />
              {!drie && <Dim ctx={ctx} name="l_hoh_y" value={ly} x={P(maxX, 0).x + 24} y={cyP} step={100} label="l_y" />}
              <Ro text={kolVorm === 1 ? `Ø${fmt(dKol)}` : `${fmt(dKol)}×${fmt(kolB)}`} x={cx + (dKol * sP) / 2 + 26} y={cyP - 10} title="kolom" />
              <Ro text={`${fmt(R)} kN`} x={P(...palen[1]).x} y={P(...palen[1]).y + (paalL * sP) / 2 + 12} kleur="#dc2626" title="zwaarst belaste paal (blad)" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Aanzicht — staafwerk, geprojecteerd op de voorste palen</div>
            <div className="vd-stage" style={{ width: W, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={DH} className="vd-svg">
                <Defs k="ma" />
                <rect x={cx - (dKol * sD) / 2} y={yTop - 40} width={dKol * sD} height={40} fill="#eaf1fb" stroke="#1e40af" strokeWidth={1.3} />
                <rect x={dx(minX)} y={yTop} width={breedte * sD} height={hPoer * sD} fill={betonFill("ma")} stroke="#6b7280" strokeWidth={1.4} />
                {[-1, 1].map((z) => (
                  <g key={z}>
                    <line x1={dx(z * xK)} y1={yKnoop} x2={dx((z * lx) / 2)} y2={yStaaf} stroke="#6b7280" strokeWidth={2} strokeDasharray="9 5" />
                    <circle cx={dx(z * xK)} cy={yKnoop} r={3} fill="#6b7280" />
                  </g>
                ))}
                {drie && <line x1={cx} y1={yKnoop} x2={cx} y2={yStaaf} stroke="#9ca3af" strokeWidth={1.4} strokeDasharray="4 4" />}
                {bandPad.map((pad, i) => (
                  <path key={i} d={pad} fill="none" stroke={bandKleur} strokeWidth={Math.max(2, rL * 2)} strokeLinecap="round" />
                ))}
                <line x1={dx(-(xEind - rT))} y1={yStaaf} x2={dx(xEind - rT)} y2={yStaaf} stroke={bandKleur} strokeWidth={Math.max(2, rL * 2)} strokeLinecap="round" />
                {[-1, 1].map((z) => (
                  <g key={z}>
                    <rect x={dx((z * lx) / 2) - (bPaal * sD) / 2} y={yBot} width={bPaal * sD} height={Math.min(40, DH - yBot - 30)}
                      fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="8 5" />
                    <line x1={dx((z * lx) / 2)} y1={yBot + 42} x2={dx((z * lx) / 2)} y2={yBot + 6} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("ma")} />
                  </g>
                ))}
                <line x1={cx} y1={yTop - 78} x2={cx} y2={yTop - 44} className="vd-load" strokeWidth={3.4} markerEnd={loadMark("ma")} />
                <VDim k="ma" y0={yTop} y1={yBot} x={dx(maxX) + 26} ext={dx(maxX) + 4} />
              </svg>
              <Force ctx={ctx} name="F_Ed" value={FEd} x={cx + 46} y={yTop - 84} unit="kN" label="F_Ed" step={100} />
              <Dim ctx={ctx} name="h_poer" value={hPoer} x={dx(maxX) + 26} y={(yTop + yBot) / 2} step={50} label="h" />
              <Ro text={`${fmt(Rmin)} kN`} x={dx(-lx / 2)} y={yBot + 50} kleur="#dc2626" title="minst belaste paal (blad, ondergrens)" />
              <Ro text={`${fmt(R)} kN`} x={dx(lx / 2)} y={yBot + 50} kleur="#dc2626" title="zwaarst belaste paal (blad)" />
              <Ro text={`${nL}Ø${fmt(dL)}`} x={cx} y={yStaaf - 18} title={`trekband, A_s = ${fmt(As)} mm², F_td = ${fmt(Ftrek)} kN`} />
              <Ro text={`z=${fmt(zArm)}`} x={dx(xK) + 34} y={(yKnoop + yStaaf) / 2} title="hefboomsarm van het staafwerk (blad)" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />{BETONLABEL[fck]} · {kolVorm === 1 ? `ronde kolom Ø${fmt(dKol)}` : `kolom ${fmt(dKol)}×${fmt(kolB)}`} ·
          {drie ? ` drie palen, zijde ${fmt(lx)}` : ` vier palen ${fmt(lx)} × ${fmt(ly)}`} · oversteek {fmt(over)} · e = {fmt(ePaal)} ·
          {nL}Ø{fmt(dL)} {drie ? "langs de zijden" : diagonaal ? "over de diagonalen" : "langs de randen"} ·
          F<sub>Ed</sub> = {fmt(FEd)} kN · M<sub>Ed</sub> = {fmt(MEd)}/{fmt(MEdy)} kNm · {OPPERVLAK.find((o) => o.v === opp)?.kort}</span>
        <span className="vd-live">
          {Rcd > 0 ? <UcChip naam="paal" uc={g.UC_paal} /> : <span className="vd-uc-nvt">paal n.v.t.</span>}
          <UcChip naam="trekband" uc={g.UC_trek} />
          <UcChip naam="knoop kolom" uc={g.UC_kn_1} />
          <UcChip naam="knoop paal" uc={g.UC_kn_2} />
          <UcChip naam="verankering" uc={g.UC_ank === undefined ? undefined : Math.max(g.UC_ank, g.UC_rol ?? 0)} />
          <UcChip naam="dwarskracht" uc={g.UC_V === undefined ? undefined : Math.max(g.UC_V, g.UC_Vmax ?? 0)} />
          <UcChip naam="pons kolom" uc={g.UC_pons_k === undefined ? undefined : Math.max(g.UC_pons_k, g.UC_pons_0 ?? 0)} />
          <UcChip naam="pons paal" uc={g.UC_pons_p} />
          <UcChip naam="scheurwijdte" uc={g.UC_w} />
        </span>
      </div>
    </div>
  );
}

// ── Poer op staal ───────────────────────────────────────────────────────────

function StaalBeeld({ ctx, uitkomst }: { ctx: DesignerCtx; uitkomst: BladUitkomst | null }) {
  const { d, set, box, wrapRef } = ctx;

  const kolVorm = Math.round(d("kolomvorm"));
  const trek = Math.round(d("belasting_staal")) === 2;
  const dKol = Math.max(100, d("d_kolom")), bKol = Math.max(100, d("b_kolom"));
  const kolB = kolVorm === 1 ? dKol : bKol;
  const Bx = Math.max(dKol + 100, d("B_x")), By = Math.max(kolB + 100, d("B_y"));
  const hPoer = Math.max(200, d("h_poer"));
  const Dal = Math.max(hPoer, d("D_aanleg"));
  const gw = Math.round(d("grondwater"));
  const fck = Math.round(d("betonklasse"));
  const cDek = Math.max(20, d("c_dek"));
  const phiK = d("phi_k"), cK = d("c_eff_k"), gK = d("gamma_k"), gSat = d("gamma_sat"), phiCv = d("phi_cv_k");
  const dL = Math.max(8, trek ? d("d_boven") : d("d_langs"));
  const sL = Math.max(50, trek ? d("s_boven") : d("s_langs"));
  const FEd = d("F_Ed"), MEd = d("M_Ed"), MEdy = d("M_Ed_y"), HEd = d("H_Ed");
  const fac = Math.round(d("factoren"));

  const g = uitkomst?.getallen ?? {};
  const uit = (naam: string, terug: number) => (Number.isFinite(g[naam]) ? g[naam] : terug);
  const ex = uit("e_x_d", 0), ey = uit("e_y_d", 0);
  const Bxe = uit("B_x_eff", Bx - 2 * ex), Bye = uit("B_y_eff", By - 2 * ey);
  const sMax = uit("σ_x_max", 0), sMin = uit("σ_x_min", sMax);
  const Lc = uit("L_c_x", Bx);

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(320, box.h - 2 * capH - gap);
  const PH = Math.max(120, totH * 0.40), DH = totH - PH;
  const s = clamp(Math.min((W - 140) / Bx, (PH - 50) / By, (DH - 150) / (Dal + 600)), 0.005, 1.2);
  const cx = W * 0.47;
  const x0 = cx - (Bx * s) / 2, x1 = cx + (Bx * s) / 2;
  const px = (mm: number) => cx + mm * s;

  // plattegrond
  const pcy = PH / 2;
  const py = (mm: number) => pcy - mm * s;
  // Het effectieve oppervlak A′ ligt tegen de zwaarst belaste rand (6.5.2.2(b)).
  const effX0 = Bx / 2 - Bxe;

  // doorsnede
  const yMv = 64;                                   // maaiveld
  const yOk = yMv + Dal * s, yBk = yOk - hPoer * s; // onder- en bovenkant poer
  const yGw = gw === 3 ? yMv : gw === 2 ? yOk : null;
  // Grondspanning van het blad: lineair van σ_min tot σ_max, of bij een kier
  // een driehoek over de contactlengte L_c tegen de zwaarst belaste rand.
  const drukSchaal = sMax > 0 ? clamp(DH - yOk - 34, 10, 60) / sMax : 0;
  const xa = Math.max(-Bx / 2, Bx / 2 - Lc);
  const pa = Lc < Bx - 1 ? 0 : sMin;
  const drukPunten = trek || sMax <= 0 ? "" : [
    [px(xa), yOk], [px(xa), yOk + pa * drukSchaal], [px(Bx / 2), yOk + sMax * drukSchaal], [px(Bx / 2), yOk],
  ].map(([x, y]) => `${x},${y}`).join(" ");
  const yWap = trek ? yBk + (cDek + dL / 2) * s : yOk - (cDek + dL / 2) * s;

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — poer op staal" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <SoortKeuze ctx={ctx} />
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Belasting
            <select style={{ width: "100%" }} value={trek ? 2 : 1} onChange={(e) => set("belasting_staal", parseInt(e.target.value))}>
              <option value={1}>Druk, centrisch of excentrisch</option>
              <option value={2}>Trek</option>
            </select>
          </label>
          <span className="vd-ctrl-h">Geometrie (mm)</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Kolomvorm
            <select style={{ width: "100%" }} value={kolVorm} onChange={(e) => set("kolomvorm", parseInt(e.target.value))}>
              <option value={1}>Ronde kolom</option>
              <option value={2}>Rechthoekige kolom</option>
            </select>
          </label>
          <label>{kolVorm === 1 ? "Kolomdiameter" : "Kolom in x"}
            <input type="number" step={50} value={dKol} onChange={(e) => set("d_kolom", parseFloat(e.target.value))} />
          </label>
          {kolVorm === 2 && (
            <label>Kolom in y
              <input type="number" step={50} value={bKol} onChange={(e) => set("b_kolom", parseFloat(e.target.value))} />
            </label>
          )}
          <label>Poer in x
            <input type="number" step={100} value={Bx} onChange={(e) => set("B_x", parseFloat(e.target.value))} />
          </label>
          <label>Poer in y
            <input type="number" step={100} value={By} onChange={(e) => set("B_y", parseFloat(e.target.value))} />
          </label>
          <label>Poerhoogte h
            <input type="number" step={50} value={hPoer} onChange={(e) => set("h_poer", parseFloat(e.target.value))} />
          </label>
          <label title="Van het maaiveld tot de onderkant van de poer">Aanlegdiepte
            <input type="number" step={100} value={Dal} onChange={(e) => set("D_aanleg", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Grond</span>
          {!trek && (
            <>
              <label title="Effectieve hoek van inwendige wrijving, karakteristiek">φ′<sub>k</sub> (°)
                <input type="number" step={1} value={phiK} onChange={(e) => set("phi_k", parseFloat(e.target.value))} />
              </label>
              <label title="Effectieve cohesie, karakteristiek">c′<sub>k</sub> (kPa)
                <input type="number" step={1} min={0} value={cK} onChange={(e) => set("c_eff_k", parseFloat(e.target.value))} />
              </label>
            </>
          )}
          <label>γ (kN/m³)
            <input type="number" step={1} value={gK} onChange={(e) => set("gamma_k", parseFloat(e.target.value))} />
          </label>
          <label>γ<sub>sat</sub> (kN/m³)
            <input type="number" step={1} value={gSat} onChange={(e) => set("gamma_sat", parseFloat(e.target.value))} />
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }} title="Hoogste grondwaterstand (6.5.2.2(c))">Grondwater
            <select style={{ width: "100%" }} value={gw} onChange={(e) => set("grondwater", parseInt(e.target.value))}>
              {GRONDWATER.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>

          <span className="vd-ctrl-h">Beton en wapening</span>
          <BetonKeuze ctx={ctx} />
          <label>Dekking c
            <input type="number" step={5} value={cDek} onChange={(e) => set("c_dek", parseFloat(e.target.value))} />
          </label>
          {trek ? (
            <label>Net bovenin
              <span style={{ display: "flex", gap: 4 }}>
                <select value={dL} onChange={(e) => set("d_boven", parseFloat(e.target.value))}>
                  {[10, ...DIAM].map((x) => <option key={x} value={x}>Ø{x}</option>)}
                </select>
                <input type="number" step={25} min={50} value={sL} style={{ width: 58 }}
                  onChange={(e) => set("s_boven", parseFloat(e.target.value))} />
              </span>
            </label>
          ) : (
            <label>Net onderin
              <span style={{ display: "flex", gap: 4 }}>
                <select value={dL} onChange={(e) => set("d_langs", parseFloat(e.target.value))}>
                  {[10, ...DIAM].map((x) => <option key={x} value={x}>Ø{x}</option>)}
                </select>
                <input type="number" step={25} min={50} value={sL} style={{ width: 58 }}
                  onChange={(e) => set("s_langs", parseFloat(e.target.value))} />
              </span>
            </label>
          )}

          <span className="vd-ctrl-h">Belasting</span>
          <label>{trek ? "Trek F" : "F"}<sub>Ed</sub> (kN)
            <input type="number" step={100} value={FEd} onChange={(e) => set("F_Ed", parseFloat(e.target.value))} />
          </label>
          {trek ? (
            <label style={{ flexDirection: "column", alignItems: "stretch" }}>Partiële factoren
              <select style={{ width: "100%" }} value={fac} onChange={(e) => set("factoren", parseInt(e.target.value))}>
                <option value={1}>UPL, tabel A.15</option>
                <option value={2}>EQU, tabel NB.3 – A1.2(A)</option>
              </select>
            </label>
          ) : (
            <>
              <label title="Kolommoment in x-richting">M<sub>Ed</sub> (kNm)
                <input type="number" step={25} value={MEd} onChange={(e) => set("M_Ed", parseFloat(e.target.value))} />
              </label>
              <label title="Kolommoment in y-richting">M<sub>Ed,y</sub> (kNm)
                <input type="number" step={25} value={MEdy} onChange={(e) => set("M_Ed_y", parseFloat(e.target.value))} />
              </label>
              <label title="Horizontale kracht op de kolomvoet in x-richting; 0 = geen">H<sub>Ed</sub> (kN)
                <input type="number" step={10} value={HEd} onChange={(e) => set("H_Ed", parseFloat(e.target.value))} />
              </label>
              {HEd !== 0 && (
                <label title="Kritieke-toestandshoek, voor het glijden (6.5.3(10))">φ′<sub>cv;k</sub> (°)
                  <input type="number" step={1} value={phiCv} onChange={(e) => set("phi_cv_k", parseFloat(e.target.value))} />
                </label>
              )}
            </>
          )}
          {!trek && <span className="gd-note">e = {fmt(ex)} / {fmt(ey)} mm · A′ = {fmt(Bxe)} × {fmt(Bye)} mm.</span>}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">{trek ? "Plattegrond" : "Plattegrond — effectief oppervlak A′"}</div>
            <div className="vd-stage" style={{ width: W, height: PH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={PH} className="vd-svg">
                <Defs k="sp" />
                <rect x={x0} y={py(By / 2)} width={Bx * s} height={By * s} fill="#f3f4f6" stroke="#6b7280" strokeWidth={1.4} />
                {!trek && Bxe > 0 && Bye > 0 && (
                  <rect x={px(effX0)} y={py(By / 2)} width={Bxe * s} height={Bye * s}
                    fill="#dbeafe" fillOpacity={0.6} stroke="#2563eb" strokeWidth={1} strokeDasharray="6 4" />
                )}
                {kolVorm === 1
                  ? <circle cx={cx} cy={pcy} r={(dKol * s) / 2} fill={betonFill("sp")} stroke="#1e40af" strokeWidth={1.5} />
                  : <rect x={cx - (dKol * s) / 2} y={pcy - (kolB * s) / 2} width={dKol * s} height={kolB * s}
                      fill={betonFill("sp")} stroke="#1e40af" strokeWidth={1.5} />}
                {!trek && (ex > 0 || ey > 0) && <circle cx={px(ex)} cy={py(ey)} r={3.5} fill="#dc2626" />}
                <HDim k="sp" x0={x0} x1={x1} y={py(-By / 2) + 20} ext={py(-By / 2) + 4} />
                <VDim k="sp" y0={py(By / 2)} y1={py(-By / 2)} x={x1 + 24} ext={x1 + 4} />
              </svg>
              <Dim ctx={ctx} name="B_x" value={Bx} x={cx} y={py(-By / 2) + 20} step={100} label="B_x" />
              <Dim ctx={ctx} name="B_y" value={By} x={x1 + 24} y={pcy} step={100} label="B_y" />
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">{trek ? "Doorsnede — trek" : "Doorsnede — grondspanning in x"}</div>
            <div className="vd-stage" style={{ width: W, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={DH} className="vd-svg">
                <Defs k="sd" />
                <rect x={x0 - 60} y={yMv} width={Bx * s + 120} height={yOk - yMv + 20} fill="#d4b896" fillOpacity={0.35} />
                <line x1={x0 - 60} y1={yMv} x2={x1 + 60} y2={yMv} stroke="#6b7280" strokeWidth={2} />
                {yGw !== null && <line x1={x0 - 60} y1={yGw} x2={x1 + 60} y2={yGw} stroke="#3b82f6" strokeWidth={1} strokeDasharray="6 4" />}
                <rect x={cx - (dKol * s) / 2} y={yMv - 34} width={dKol * s} height={yBk - yMv + 34} fill="#eaf1fb" stroke="#1e40af" strokeWidth={1.3} />
                <rect x={x0} y={yBk} width={Bx * s} height={hPoer * s} fill={betonFill("sd")} stroke="#6b7280" strokeWidth={1.4} />
                <line x1={x0 + cDek * s} y1={yWap} x2={x1 - cDek * s} y2={yWap} stroke="#111827" strokeWidth={Math.max(1.5, dL * s)} strokeLinecap="round" />
                {drukPunten && <polygon points={drukPunten} fill="#fecaca" fillOpacity={0.7} stroke="#dc2626" strokeWidth={1.2} />}
                {trek
                  ? <line x1={cx} y1={yMv - 36} x2={cx} y2={yMv - 76} className="vd-load" strokeWidth={3.4} markerEnd={loadMark("sd")} />
                  : <line x1={cx} y1={yMv - 76} x2={cx} y2={yMv - 38} className="vd-load" strokeWidth={3.4} markerEnd={loadMark("sd")} />}
                <VDim k="sd" y0={yBk} y1={yOk} x={x1 + 26} ext={x1 + 4} />
                <VDim k="sd" y0={yMv} y1={yOk} x={x0 - 30} ext={x0 - 4} />
              </svg>
              <Force ctx={ctx} name="F_Ed" value={FEd} x={cx + 46} y={yMv - 84} unit="kN" label={trek ? "F_t" : "F_Ed"} step={100} />
              <Dim ctx={ctx} name="h_poer" value={hPoer} x={x1 + 26} y={(yBk + yOk) / 2} step={50} label="h" />
              <Dim ctx={ctx} name="D_aanleg" value={Dal} x={x0 - 30} y={(yMv + yOk) / 2} step={100} label="D" />
              {!trek && sMax > 0 && (
                <>
                  <Ro text={`${fmt(sMax)} kPa`} x={px(Bx / 2) - 10} y={yOk + sMax * drukSchaal + 12} kleur="#dc2626" title="grondspanning aan de zwaarst belaste rand (blad)" />
                  {Lc < Bx - 1 && <Ro text={`kier, contact ${fmt(Lc)}`} x={px(-Bx / 2) + 50} y={yOk + 14} title="contactlengte 3·(B/2 − e) (blad)" />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />{BETONLABEL[fck]} · {kolVorm === 1 ? `ronde kolom Ø${fmt(dKol)}` : `kolom ${fmt(dKol)}×${fmt(kolB)}`} ·
          poer {fmt(Bx)} × {fmt(By)} × {fmt(hPoer)} op {fmt(Dal)} · Ø{fmt(dL)}-{fmt(sL)} {trek ? "bovenin" : "onderin"} ·
          {trek ? ` trek ${fmt(FEd)} kN` : ` F_Ed = ${fmt(FEd)} kN · M = ${fmt(MEd)}/${fmt(MEdy)} kNm${HEd ? ` · H = ${fmt(HEd)} kN` : ""}`}</span>
        <span className="vd-live">
          {trek
            ? <UcChip naam="evenwicht" uc={g.UC_upl} />
            : <UcChip naam="draagvermogen" uc={g.UC_draag} />}
          {!trek && HEd !== 0 && <UcChip naam="glijden" uc={g.UC_glij} />}
          <UcChip naam="buiging" uc={g.UC_M} />
          {!trek && <UcChip naam="verankering" uc={g.UC_ank} />}
          <UcChip naam="dwarskracht" uc={g.UC_V} />
          <UcChip naam="pons" uc={g.UC_pons === undefined ? undefined : Math.max(g.UC_pons, g.UC_pons_0 ?? 0)} />
        </span>
      </div>
    </div>
  );
}
