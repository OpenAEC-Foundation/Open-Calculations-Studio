import { useEffect } from "react";
import { useDesigner, Dim, Force, Ro, Defs, loadMark, betonFill, HDim, VDim, fmt, clamp, JaNee, UitkomstKop } from "./designerKit";
import { useBladUitkomst, ucTekst } from "./bladResultaat";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een gewapende betonkolom.
 *
 * Links de doorsnede met de staven over de omtrek verdeeld — n_h per verticale
 * zijde en n_b per horizontale zijde, met de hoekstaven één keer geteld, zoals
 * je ze op een wapeningstekening zet; een ronde kolom heeft een eigen totaal
 * aantal staven. Rechts het aanzicht met de kolomlengte, de opleggingen en de
 * belastingen.
 *
 * De toetsing staat in het rekenblad (templates/betonkolom.ts): de kop toont de
 * maatgevende UC en het oordeel van het blad, de notities onder de invoer de
 * slankheid, het rekenmoment en het draagvermogen per as uit dezelfde
 * uitwerking. Het beeld rekent zelf alleen A_s en ρ uit, voor de tekening.
 *
 * Een blad van vóór de toetsing kende één moment per as, geen φ_ef en bij een
 * ronde kolom 2·n_b staven. Het beeld vult daar alleen aan wat de uitkomst niet
 * stil verandert (zie DEFAULTS en NIEUW hieronder). Een blad met boven en onder
 * maar zonder de keuze eindmomenten rekent met één moment per as, het grootste
 * van de twee; het beeld meldt dat (ouderOnder).
 */
const MARKER = "Betonkolom";

const BETON = [20, 25, 30, 35, 40, 45, 50];
const BETONLABEL: Record<number, string> = {
  20: "C20/25", 25: "C25/30", 30: "C30/37", 35: "C35/45", 40: "C40/50", 45: "C45/55", 50: "C50/60",
};
const STAALSOORT = [{ v: 1, label: "B500A" }, { v: 2, label: "B500B" }, { v: 3, label: "B500C" }];
const DIAM = [8, 10, 12, 16, 20, 25, 32, 40];

// Een vierkante kolom 350×350 in C30/37 met 8Ø20, 3,5 m hoog en geschoord, met
// een moment om beide assen. DEFAULTS en NIEUW samen zijn de standaardinvoer van
// scripts/check-betonkolom.mjs.
//
// DEFAULTS vult het beeld aan in elk blad van deze module, ook in een blad van
// vóór de toetsing. Daarom staat hier niets wat een bestaande invoer anders zou
// laten rekenen: de keuze voor twee eindmomenten, het tweede moment en φ_ef
// ontbreken, zodat zo'n blad na bijwerken met één moment per as (een constant
// moment, de veilige kant) rekent en zonder φ_ef afkeurt tot die is ingevuld
// (tenzij kruip er niet toe doet of 5.8.4(4) het toestaat).
const DEFAULTS: Record<string, number> = {
  vorm: 1, h_kol: 350, b_kol: 350, L_kol: 3500, insitu: 0,
  betonklasse: 30, betonstaal: 2, c_dek: 30,
  n_h: 3, n_b: 3, d_staaf: 20, d_beugel: 8, s_beugel: 250,
  L_cry: 3500, L_crz: 3500, geschoord_y: 1, geschoord_z: 1,
  N_Ed: 1200, M_yEd: 40, M_zEd: 10,
};
// Alleen voor een nieuw blad, dat nog geen enkele invoer heeft.
const NIEUW: Record<string, number> = {
  eindmomenten: 2, M_yEd_1: 20, M_zEd_1: 10, "φ_ef": 1.5, n_rond: 8,
};
// Een ouder rond blad tekende max(4; 2·n_b) staven, met n_b van 2 tot 8 en
// zonder invoer 4. Zo'n blad krijgt dat aantal als n_rond, niet het getal van
// een nieuw blad.
const nRondOud = (nb: string | undefined) => {
  const n = parseFloat(String(nb ?? "").replace(",", "."));
  return Math.max(4, 2 * clamp(Math.round(Number.isFinite(n) ? n : 4), 2, 8));
};

export default function BetonkolomDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // De uitkomst en de tussenwaarden van het blad zelf; vóór de vroege return,
  // zodat de volgorde van de hooks vast ligt.
  const uitkomst = useBladUitkomst();
  const exemplaar = useActiefExemplaar();
  const alleenLezen = useAlleenLezen();
  const seedWaarden = useProjectStore((s) => s.seedWaarden);
  const blad = alleenLezen ? undefined : exemplaar;
  const waarden = blad?.waarden;
  // Aanvullen naast DEFAULTS. `waarden` is de stand bij het tekenen, dus van
  // vóór de aanvulling door useDesigner: leeg betekent echt een nieuw blad.
  useEffect(() => {
    if (!ctx.actief || !blad || !waarden) return;
    if (Object.keys(waarden).length === 0) {
      seedWaarden(blad.id, Object.fromEntries(Object.entries(NIEUW).map(([k, v]) => [k, String(v)])));
    } else if (waarden.n_rond === undefined || waarden.n_rond === "") {
      seedWaarden(blad.id, { n_rond: String(nRondOud(waarden.n_b)) });
    }
    // Eén keer per blad; waarden bewust niet in de deps, anders telt de
    // aanvulling van useDesigner als "geen nieuw blad".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.actief, blad?.id, seedWaarden]);
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
  // Zelfde grenzen als het blad: 2 tot 10 staven per zijde, 3 tot 20 rond.
  const nH = clamp(Math.round(d("n_h")), 2, 10);     // staven per verticale zijde
  const nB = clamp(Math.round(d("n_b")), 2, 10);     // staven per horizontale zijde
  const nRond = clamp(Math.round(d("n_rond")), 3, 20);
  const dS = Math.max(6, d("d_staaf"));
  const dBg = Math.max(4, d("d_beugel")), sBg = Math.max(20, d("s_beugel"));
  const Lcry = Math.max(1, d("L_cry")), Lcrz = Math.max(1, d("L_crz"));
  const geschY = Math.round(d("geschoord_y")) === 1, geschZ = Math.round(d("geschoord_z")) === 1;
  const NEd = d("N_Ed"), phiEf = d("φ_ef");
  // Eén moment per as (aan beide einden gelijk) tenzij het blad twee eindmomenten
  // kiest; zonder keuze rekent het blad met de eerste optie, dus ook hier.
  const twee = Math.round(d("eindmomenten")) === 2;
  const MyEd = d("M_yEd"), MzEd = d("M_zEd");
  const MyEd1 = twee ? d("M_yEd_1") : MyEd, MzEd1 = twee ? d("M_zEd_1") : MzEd;
  // Met één moment per as telt een groter ondermoment dat het blad nog heeft
  // (uit een versie met boven en onder) aan beide einden; het blad meldt dat.
  const ouderOnder = !twee && (Math.abs(d("M_yEd_1")) > Math.abs(MyEd) || Math.abs(d("M_zEd_1")) > Math.abs(MzEd));
  // Een leeg of half ingetypt veld wordt 0, zodat het blad niet met NaN rekent.
  const zet = (naam: string, v: number) => set(naam, Number.isFinite(v) ? v : 0);
  // Naar twee eindmomenten: een onderste moment dat nog niet bestaat, begint gelijk
  // aan het bovenste, zodat de omschakeling zelf de uitkomst niet verandert. Terug
  // naar één moment: het onderste wordt het bovenste, zodat er geen verborgen
  // groter ondermoment blijft meetellen.
  const zetTwee = (aan: boolean) => {
    for (const [onder, boven] of [["M_yEd_1", MyEd], ["M_zEd_1", MzEd]] as const) {
      if (!aan || waarden?.[onder] === undefined || waarden[onder] === "") set(onder, boven);
    }
    set("eindmomenten", aan ? 2 : 1);
  };

  // Staafposities over de omtrek — hoekstaven één keer.
  const nTot = vorm === 2 ? nRond : 2 * nH + 2 * nB - 4;
  const As = (nTot * Math.PI * dS * dS) / 4;
  const Ac = vorm === 2 ? (Math.PI * h * h) / 4 : b * h;
  const rho = (As / Ac) * 100;

  // Uit de uitwerking; "—" zolang het blad het getal (nog) niet toont.
  const g = uitkomst?.getallen ?? {};
  const w = (naam: string, dec = 1) => (g[naam] === undefined ? "—" : fmt(g[naam], dec));
  // Een UC kan ∞ zijn: buiten het bereik van N_Ed is er geen momentcapaciteit.
  const wUc = (naam: string) => (g[naam] === undefined ? "—" : ucTekst(g[naam]));
  const tweedeOrde = (as: "y" | "z") =>
    g[`λ_${as}`] !== undefined && g[`λ_lim_${as}`] !== undefined && g[`λ_${as}`] > g[`λ_lim_${as}`];

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
  const ax = acx - offX;                            // x van de kolomas in het aanzicht

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — betonkolom" uitkomst={uitkomst} />

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
            <input type="number" step={25} value={h} onChange={(e) => zet("h_kol", parseFloat(e.target.value))} />
          </label>
          {vorm === 1 && (
            <label>Breedte b
              <input type="number" step={25} value={b} onChange={(e) => zet("b_kol", parseFloat(e.target.value))} />
            </label>
          )}
          <label>Kolomlengte L
            <input type="number" step={100} value={L} onChange={(e) => zet("L_kol", parseFloat(e.target.value))} />
          </label>
          <JaNee label="In-situ gestorte paal" waarde={insitu} onChange={(v) => set("insitu", v ? 1 : 0)} />
          {insitu && <span className="gd-note">Het blad rekent met een kleinere maat (§2.3.4.2(2)) en de paaleisen van de NB bij §9.8.5(3).</span>}

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
            <input type="number" step={5} value={c} onChange={(e) => zet("c_dek", parseFloat(e.target.value))} />
          </label>
          <label>Staafdiameter
            <select value={dS} onChange={(e) => set("d_staaf", parseFloat(e.target.value))}>
              {DIAM.map((x) => <option key={x} value={x}>Ø{x}</option>)}
            </select>
          </label>
          {vorm === 1 ? (
            <>
              <label title="Aantal staven langs de breedte, boven- en onderzijde, met de hoekstaven">Staven langs b
                <input type="number" step={1} min={2} max={10} value={nB} onChange={(e) => zet("n_b", parseFloat(e.target.value))} />
              </label>
              <label title="Aantal staven langs de hoogte, linker- en rechterzijde, met de hoekstaven">Staven langs h
                <input type="number" step={1} min={2} max={10} value={nH} onChange={(e) => zet("n_h", parseFloat(e.target.value))} />
              </label>
            </>
          ) : (
            <label title="Totaal aantal staven op de cirkel">Aantal staven
              <input type="number" step={1} min={3} max={20} value={nRond} onChange={(e) => zet("n_rond", parseFloat(e.target.value))} />
            </label>
          )}
          <label>Beugel
            <span style={{ display: "flex", gap: 4 }}>
              <select value={dBg} onChange={(e) => set("d_beugel", parseFloat(e.target.value))}>
                {[6, 8, 10, 12].map((x) => <option key={x} value={x}>Ø{x}</option>)}
              </select>
              <input type="number" step={25} min={20} value={sBg} style={{ width: 58 }}
                onChange={(e) => zet("s_beugel", parseFloat(e.target.value))} />
            </span>
          </label>
          <span className="gd-note">{nTot} staven Ø{fmt(dS)} → A<sub>s</sub> = {fmt(As)} mm² · ρ = {fmt(rho, 2)} %.</span>

          <span className="vd-ctrl-h">Knik (mm)</span>
          <label>l<sub>0,y</sub>
            <input type="number" step={100} value={Lcry} onChange={(e) => zet("L_cry", parseFloat(e.target.value))} />
          </label>
          <JaNee label="Geschoord om y" waarde={geschY} onChange={(v) => set("geschoord_y", v ? 1 : 0)} />
          <label>l<sub>0,z</sub>
            <input type="number" step={100} value={Lcrz} onChange={(e) => zet("L_crz", parseFloat(e.target.value))} />
          </label>
          <JaNee label="Geschoord om z" waarde={geschZ} onChange={(v) => set("geschoord_z", v ? 1 : 0)} />
          <span className="gd-note">
            λ<sub>y</sub> = {w("λ_y")} tegen λ<sub>lim,y</sub> = {w("λ_lim_y")}{tweedeOrde("y") ? " — tweede orde" : ""}
            <br />λ<sub>z</sub> = {w("λ_z")} tegen λ<sub>lim,z</sub> = {w("λ_lim_z")}{tweedeOrde("z") ? " — tweede orde" : ""}
          </span>

          <span className="vd-ctrl-h">Belastingen (eerste orde)</span>
          <label>N<sub>Ed</sub> (kN)
            <input type="number" step={50} value={NEd} onChange={(e) => zet("N_Ed", parseFloat(e.target.value))} />
          </label>
          <label title="Effectief kruipgetal (5.19): φ(∞,t0)·M0Eqp/M0Ed, met φ uit het blad Kruipfactor. 0 alleen onder 5.8.4(4); het blad toetst dat.">φ<sub>ef</sub>
            <input type="number" step={0.1} value={phiEf} onChange={(e) => zet("φ_ef", parseFloat(e.target.value))} />
          </label>
          {phiEf <= 0 && NEd > 0 && <span className="gd-note">Zonder φ<sub>ef</sub> keurt het blad af, tenzij kruip er niet toe doet of 5.8.4(4) het toestaat.</span>}
          <JaNee label="Boven en onder apart" waarde={twee} onChange={zetTwee} />
          {ouderOnder && (
            <span className="gd-note">
              Het blad heeft nog een groter ondermoment ({fmt(d("M_yEd_1"))}/{fmt(d("M_zEd_1"))} kNm) en rekent met het grootste
              moment aan beide einden. Met "Boven en onder apart" tellen beide eindmomenten.
            </span>
          )}
          <label title={twee ? "Eindmoment om de y-as aan de bovenzijde" : "Moment om de y-as, aan beide einden gelijk (constant over de kolom)"}>
            M<sub>y</sub>{twee ? " boven" : ""} (kNm)
            <input type="number" step={5} value={MyEd} onChange={(e) => zet("M_yEd", parseFloat(e.target.value))} />
          </label>
          {twee && (
            <label title="Eindmoment om de y-as aan de onderzijde; gelijk teken = enkele kromming">M<sub>y</sub> onder (kNm)
              <input type="number" step={5} value={MyEd1} onChange={(e) => zet("M_yEd_1", parseFloat(e.target.value))} />
            </label>
          )}
          <label title={twee ? "Eindmoment om de z-as aan de bovenzijde" : "Moment om de z-as, aan beide einden gelijk (constant over de kolom)"}>
            M<sub>z</sub>{twee ? " boven" : ""} (kNm)
            <input type="number" step={5} value={MzEd} onChange={(e) => zet("M_zEd", parseFloat(e.target.value))} />
          </label>
          {twee && (
            <label title="Eindmoment om de z-as aan de onderzijde; gelijk teken = enkele kromming">M<sub>z</sub> onder (kNm)
              <input type="number" step={5} value={MzEd1} onChange={(e) => zet("M_zEd_1", parseFloat(e.target.value))} />
            </label>
          )}
          <span className="gd-note">
            Om y: M<sub>Ed</sub> = {w("M_Ed_y")} kNm, M<sub>Rd</sub> = {w("M_Rd_y")} kNm, UC = {wUc("UC_y")}
            {/* Een ronde kolom heeft om elke as hetzelfde M_Rd; het blad toont het één keer. */}
            <br />Om z: M<sub>Ed</sub> = {w("M_Ed_z")} kNm, M<sub>Rd</sub> = {w(vorm === 2 ? "M_Rd_y" : "M_Rd_z")} kNm, UC = {wUc("UC_z")}
            {g["UC_N"] !== undefined && <><br />Normaalkracht alleen: UC<sub>N</sub> = {wUc("UC_N")}</>}
          </span>
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
                {/* assen: y horizontaal (buiging om y werkt over h), z verticaal */}
                <line x1={x0 - 10} y1={dcy} x2={x1 + 10} y2={dcy} stroke="#dc2626" strokeWidth={0.9} strokeDasharray="9 4 2 4" />
                <line x1={dcx} y1={y0 - 10} x2={dcx} y2={y1 + 10} stroke="#dc2626" strokeWidth={0.9} strokeDasharray="9 4 2 4" />
                <text x={x1 + 14} y={dcy + 4} fill="#dc2626" fontSize={11}>y</text>
                <text x={dcx + 4} y={y0 - 12} fill="#dc2626" fontSize={11}>z</text>
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
                <rect x={ax - kolPx / 2} y={yT} width={kolPx} height={L * sL}
                  fill={betonFill("ba")} stroke="#6b7280" strokeWidth={1.4} />
                {/* beugels als horizontale streepjes op de werkelijke afstand */}
                {Array.from({ length: Math.min(60, Math.floor(L / sBg)) }, (_, i) => {
                  const y = yT + (i + 0.5) * sBg * sL;
                  return y < yB ? <line key={i} x1={ax - kolPx / 2 + 3} y1={y} x2={ax + kolPx / 2 - 3} y2={y}
                    stroke="#1e3a8a" strokeWidth={0.9} /> : null;
                })}
                {/* langswapening */}
                {[-1, 1].map((z) => (
                  <line key={z} x1={ax + z * (kolPx / 2 - 5)} y1={yT + 4} x2={ax + z * (kolPx / 2 - 5)} y2={yB - 4}
                    stroke="#374151" strokeWidth={Math.max(1.4, rS)} />
                ))}
                {/* opleggingen */}
                <polygon points={`${ax},${yB} ${ax - 13},${yB + 17} ${ax + 13},${yB + 17}`}
                  fill="#dbe7f6" stroke="#1e40af" strokeWidth={1.5} />
                <line x1={ax - 22} y1={yB + 17} x2={ax + 22} y2={yB + 17} stroke="#1e40af" strokeWidth={2} />
                {/* normaalkracht */}
                <line x1={ax} y1={yT - 46} x2={ax} y2={yT - 4} className="vd-load" strokeWidth={3.2} markerEnd={loadMark("ba")} />
                {/* eindmomenten om de y-as, boven en onder */}
                {MyEd !== 0 && (
                  <path d={`M ${ax + 26} ${yT + 16} A 26 26 0 1 1 ${ax + 26} ${yT + 17}`}
                    fill="none" stroke="#dc2626" strokeWidth={2.2} markerEnd={loadMark("ba")} />
                )}
                {MyEd1 !== 0 && (
                  <path d={`M ${ax + 26} ${yB - 16} A 26 26 0 1 1 ${ax + 26} ${yB - 17}`}
                    fill="none" stroke="#dc2626" strokeWidth={2.2} markerEnd={loadMark("ba")} />
                )}
                <VDim k="ba" y0={yT} y1={yB} x={ax + kolPx / 2 + 40} ext={ax + kolPx / 2 + 6} />
              </svg>

              <Force ctx={ctx} name="N_Ed" value={NEd} x={ax + 34} y={yT - 56} unit="kN" label="N_Ed" step={50} />
              {MyEd !== 0 && <Force ctx={ctx} name="M_yEd" value={MyEd} x={ax + 66} y={yT + 8} unit="kNm" label="M_y" step={5} />}
              {MyEd1 !== 0 && <Force ctx={ctx} name={twee ? "M_yEd_1" : "M_yEd"} value={MyEd1} x={ax + 66} y={yB - 30} unit="kNm" label="M_y" step={5} />}
              <Dim ctx={ctx} name="L_kol" value={L} x={ax + kolPx / 2 + 40} y={(yT + yB) / 2} step={100} label="L" />
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
          l<sub>0,y</sub>/l<sub>0,z</sub> = {fmt(Lcry)}/{fmt(Lcrz)} mm{geschY && geschZ ? " geschoord" : !geschY && !geschZ ? " ongeschoord" : ""} ·
          N<sub>Ed</sub> = {fmt(NEd)} kN · M<sub>y</sub> = {twee ? `${fmt(MyEd)}/${fmt(MyEd1)}` : fmt(MyEd)} kNm ·
          M<sub>z</sub> = {twee ? `${fmt(MzEd)}/${fmt(MzEd1)}` : fmt(MzEd)} kNm{twee ? "" : " (constant)"} ·
          φ<sub>ef</sub> = {fmt(phiEf, 2)}{insitu ? " · in-situ paal" : ""}
        </span>
      </div>
    </div>
  );
}
