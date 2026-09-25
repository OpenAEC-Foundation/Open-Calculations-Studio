import { useDesigner, Dim, Force, Ro, Defs, HDim, VDim, loadMark, IProfiel, fmt, clamp, JaNee } from "./designerKit";
import { useAlleenLezen } from "../../store/actiefBlad";
import { GEVEL_PROFIELEN } from "./gevelkolomProfielen";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het rekenblad "Stalen gevelkolom".
 *
 * Drie aanzichten:
 *   • Aanzicht van de kolom — scharnierend aan beide einden, met de gevel, de
 *     regels op de buitenflens, de wind en de drukkracht.
 *   • Plattegrond van de gebouwhoek — de zones A, B en C langs de gevel bij
 *     wind evenwijdig aan de gevel (figuur 7.5 van NEN-EN 1991-1-4), met de
 *     plaats van de kolom en zijn belastingbreedte.
 *   • Horizontale doorsnede — het profiel op schaal, met de regel en de gevel
 *     aan de buitenkant.
 *
 * Het beeld rekent alleen de zone uit, een zuiver meetkundige zaak; q_p, de
 * drukcoëfficiënten en alle toetsen staan in het rekenblad.
 */
const MARKER = "Stalen gevelkolom";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const WINDBRON = [
  { v: 1, label: "Projectgegevens" },
  { v: 2, label: "q_p zelf" },
  { v: 3, label: "Netto wind zelf" },
];
const GRENS = [{ v: 300, label: "L/300" }, { v: 250, label: "L/250" }, { v: 200, label: "L/200" }];

// Een IPE 300 S235 van 6 m in een gevel van 7 m hoog, 5 m hart-op-hart, met
// twee regels die aan een windverband vastzitten. Dezelfde waarden als in
// scripts/check-gevelkolom.mjs.
const DEFAULTS: Record<string, number> = {
  profile: 11, staalkwaliteit: 235, L: 6, b_belast: 5, n_r: 2, regelsteun: 1,
  windbron: 1, z_wind: 7, d_geb: 20, a_hoek: 10, q_wind_hand: 0.8, w_d_hand: 0.9, w_z_hand: 0.7,
  N_Ed: 30, VerplGrens: 300,
};

type Zone = "A" | "B" | "C";
const ZONE_VUL: Record<Zone, string> = { A: "#fecaca", B: "#fde68a", C: "#bbf7d0" };
const ZONE_LIJN: Record<Zone, string> = { A: "#b91c1c", B: "#b45309", C: "#047857" };

const REEKSEN = ["IPE", "HEA", "HEB"];

/** Windpijl in het blauw van de windbelasting, met een eigen punt. */
function WindPijl({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  return (
    <g>
      <line x1={x0} y1={y} x2={x1 - 8} y2={y} stroke="#2563eb" strokeWidth={1.6} />
      <polygon points={`${x1},${y} ${x1 - 9},${y - 4} ${x1 - 9},${y + 4}`} fill="#2563eb" />
    </g>
  );
}

export default function GevelkolomDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // In de afdruk valt er niets te klikken; dan ook geen aanwijzing daarvoor.
  const afdruk = useAlleenLezen();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const profId = Math.round(d("profile"));
  const p = GEVEL_PROFIELEN[profId] ?? GEVEL_PROFIELEN[11];
  const fy = Math.round(d("staalkwaliteit"));
  const L = Math.max(0.5, d("L"));
  const bBel = Math.max(0.1, d("b_belast"));
  const nr = clamp(Math.round(d("n_r")), 0, 20);
  const steun = Math.round(d("regelsteun")) === 1;
  // Zelfde voorwaarde als k_st in het blad: zonder regels ook geen steun.
  const kst = steun && nr >= 1;
  const bron = clamp(Math.round(d("windbron")), 1, 3);
  const hGeb = Math.max(0.5, d("z_wind"));
  const dGeb = Math.max(0.5, d("d_geb"));
  const aHoek = Math.max(0, d("a_hoek"));
  const N = d("N_Ed");
  const grens = Math.round(d("VerplGrens"));
  const Lst = L / (nr + 1);

  // Zone bij wind evenwijdig aan de gevel (figuur 7.5): de rand van het belaste
  // vlak die het dichtst bij de hoek ligt, tegen e/5 en e.
  const e = Math.min(dGeb, 2 * hGeb);
  const xr = Math.max(aHoek - bBel / 2, 0);
  const zone: Zone = xr < e / 5 ? "A" : xr < e ? "B" : "C";

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 16;
  const W = box.w, H = Math.max(330, box.h - capH);
  // In een smalle pane onder elkaar in plaats van naast elkaar.
  const gestapeld = W < 560;
  const AW = gestapeld ? W : clamp(W * 0.36, 200, 320);
  const RW = gestapeld ? W : W - AW - gap;
  const AH = gestapeld ? clamp(H * 0.6, 280, 440) : H;
  const rechtsH = gestapeld ? clamp(H * 0.75, 320, 460) : H;
  const PH = Math.max(180, (rechtsH - capH - gap) * 0.6);
  const DH = Math.max(120, rechtsH - capH - gap - PH);

  // aanzicht van de kolom
  const mT = 62, mB = 30;
  const sL = (AH - mT - mB) / L;                           // px per m
  const yTop = mT, yBot = mT + L * sL;
  const cx = AW * 0.5;
  const kw = clamp((p.h / 1000) * sL, 8, 26);              // getekende profielhoogte
  const xo = cx - kw / 2, xi = cx + kw / 2;                 // buiten- en binnenflens
  const xg = xo - 14;                                       // gevelbekleding
  const regelY = Array.from({ length: nr }, (_, i) => yTop + (i + 1) * Lst * sL);
  const windX0 = Math.max(10, xg - 62);

  // plattegrond van de gebouwhoek
  const pL = 40, pR = 26;
  const yF = PH - 46;                                       // lijn van de gevel
  const lZicht = Math.max(e * 1.2, aHoek + bBel * 0.75 + 1, 4);
  const sP = Math.max(0.5, Math.min((RW - pL - pR) / lZicht, (yF - 30) / Math.min(dGeb, lZicht * 0.55)));
  const xC = pL;                                            // de hoek
  const xE = xC + lZicht * sP;                              // rechts afgebroken
  const dZicht = Math.min(dGeb, (yF - 24) / sP);
  const yAchter = yF - dZicht * sP;
  const afgebroken = dGeb > dZicht + 1e-6;
  const px = (x: number) => xC + x * sP;
  const zoneGrenzen: { z: Zone; x0: number; x1: number }[] = [
    { z: "A" as Zone, x0: 0, x1: Math.min(e / 5, lZicht) },
    { z: "B" as Zone, x0: Math.min(e / 5, lZicht), x1: Math.min(e, lZicht) },
    { z: "C" as Zone, x0: Math.min(e, lZicht), x1: lZicht },
  ].filter((g) => g.x1 - g.x0 > 1e-6);
  const kolomX = px(Math.min(aHoek, lZicht));
  const band0 = px(Math.max(0, aHoek - bBel / 2)), band1 = px(Math.min(lZicht, aHoek + bBel / 2));

  // horizontale doorsnede: buitenkant onder
  const sD = clamp(Math.min((DH - 56) / p.h, (RW * 0.34) / p.b), 0.05, 1.2);
  const dcx = RW * 0.42, dcy = (DH - 20) / 2;
  const yBuitenflens = dcy + (p.h * sD) / 2;
  const regelB = Math.max(18, p.b * sD * 0.45);

  const reeksen = REEKSEN.map((r) => ({
    reeks: r,
    opties: Object.entries(GEVEL_PROFIELEN)
      .filter(([, pr]) => pr.naam.startsWith(r))
      .map(([id, pr]) => ({ v: Number(id), label: pr.naam })),
  }));

  const windLabel = bron === 3 ? "netto wind zelf ingevuld" : `zone ${zone}`;

  return (
    <div className="vd-panel" data-afdrukhoogte="150">
      <div className="vd-head">
        <strong>Parametrisch beeld — stalen gevelkolom</strong>
        <span className="vd-uc info">{p.naam} · S{fy} · {windLabel}</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Profiel</span>
          <label>Staalprofiel
            <select value={profId} onChange={(e) => set("profile", parseInt(e.target.value))}>
              {reeksen.map((g) => (
                <optgroup key={g.reeks} label={g.reeks}>
                  {g.opties.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalkwaliteit", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>

          <span className="vd-ctrl-h">Gevelregels</span>
          <label>Aantal regels
            <input type="number" step={1} min={0} value={nr} onChange={(e) => set("n_r", parseFloat(e.target.value))} />
          </label>
          <JaNee label="Gekoppeld aan windverband" waarde={steun} onChange={(v) => set("regelsteun", v ? 1 : 0)} />
          <span className="gd-note">
            {kst
              ? <>De regels steunen de buitenflens: knik om z over L<sub>st</sub> = {fmt(Lst, 2)} m, kip per veld, en torsieknik om de as van de regels.</>
              : <>Geen steun van de regels: knik om z en kip over de hele lengte.</>}
          </span>

          <span className="vd-ctrl-h">Wind</span>
          <label>Bron
            <select value={bron} onChange={(e) => set("windbron", parseInt(e.target.value))}>
              {WINDBRON.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          {bron === 2 && (
            <label>q<sub>p</sub> (kN/m²)
              <input type="number" step={0.05} value={d("q_wind_hand")} onChange={(e) => set("q_wind_hand", parseFloat(e.target.value))} />
            </label>
          )}
          {bron === 3 && (
            <>
              <label>Netto druk (kN/m²)
                <input type="number" step={0.05} value={d("w_d_hand")} onChange={(e) => set("w_d_hand", parseFloat(e.target.value))} />
              </label>
              <label>Netto zuiging (kN/m²)
                <input type="number" step={0.05} value={d("w_z_hand")} onChange={(e) => set("w_z_hand", parseFloat(e.target.value))} />
              </label>
            </>
          )}
          {bron !== 3 && (
            <span className="gd-note">e = {fmt(e, 1)} m · rand van het belaste vlak op {fmt(xr, 2)} m van de hoek → zone {zone}.</span>
          )}

          <span className="vd-ctrl-h">Doorbuiging</span>
          <label>Grens
            <select value={grens} onChange={(e) => set("VerplGrens", parseInt(e.target.value))}>
              {GRENS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, flexDirection: gestapeld ? "column" : "row", alignItems: gestapeld ? "stretch" : "flex-start", justifyContent: "safe center", gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Aanzicht van de kolom</div>
            <div className="vd-stage" style={{ width: AW, height: AH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={AW} height={AH} className="vd-svg">
                <Defs k="ga" />
                {/* wind op de gevel */}
                {Array.from({ length: 9 }, (_, i) => {
                  const y = yTop + ((yBot - yTop) * (i + 0.5)) / 9;
                  return <WindPijl key={i} x0={windX0} x1={xg - 4} y={y} />;
                })}
                <text x={windX0} y={yTop - 8} fill="#2563eb" fontSize={11} fontWeight={700}>wind</text>
                {/* gevelbekleding en de kolom: twee flenzen */}
                <line x1={xg} y1={yTop - 8} x2={xg} y2={yBot + 8} stroke="#94a3b8" strokeWidth={2.6} />
                <rect x={xo} y={yTop} width={kw} height={yBot - yTop} fill="#e2e8f0" />
                <line x1={xo} y1={yTop} x2={xo} y2={yBot} stroke="#334155" strokeWidth={2.2} />
                <line x1={xi} y1={yTop} x2={xi} y2={yBot} stroke="#334155" strokeWidth={2.2} />
                {/* regels tussen gevel en buitenflens */}
                {regelY.map((y, i) => (
                  <rect key={i} x={xg + 1} y={y - 4} width={xo - xg - 1} height={8}
                    fill={kst ? "#fbbf24" : "#e5e7eb"} stroke={kst ? "#92400e" : "#6b7280"} strokeWidth={1}
                    strokeDasharray={kst ? undefined : "2 2"} />
                ))}
                {/* scharnieren */}
                <polygon points={`${cx},${yBot} ${cx - 9},${yBot + 15} ${cx + 9},${yBot + 15}`} fill="#fbbf24" stroke="#92400e" strokeWidth={1.2} />
                <line x1={cx - 13} y1={yBot + 15} x2={cx + 13} y2={yBot + 15} stroke="#92400e" strokeWidth={1.2} />
                <polygon points={`${cx},${yTop} ${cx - 9},${yTop - 15} ${cx + 9},${yTop - 15}`} fill="#fbbf24" stroke="#92400e" strokeWidth={1.2} />
                {/* normaalkracht */}
                <line x1={cx} y1={yTop - 58} x2={cx} y2={yTop - 20} className="vd-load" strokeWidth={3} markerEnd={loadMark("ga")} />
                {/* lengte */}
                <VDim k="ga" y0={yTop} y1={yBot} x={AW - 30} ext={xi + 4} />
              </svg>

              <Force ctx={ctx} name="N_Ed" value={N} x={cx + 42} y={yTop - 48} unit="kN" label="N" step={10} />
              <Dim ctx={ctx} name="L" value={L} x={AW - 30} y={(yTop + yBot) / 2} step={0.25} label="L" dec={L % 1 ? 2 : 0} />
              {nr >= 1 && (
                <Ro text={`Lst=${fmt(Lst, 2)}`} x={Math.min(xi + 40, AW - 60)} y={yTop + (Lst * sL) / 2 - 9}
                  kleur={kst ? "#92400e" : "#6b7280"} title="afstand tussen de regels" />
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap }}>
            <div className="vd-canvas">
              <div className="vd-caption">Plattegrond — windzones</div>
              <div className="vd-stage" style={{ width: RW, height: PH, background: "transparent", border: "none", borderRadius: 0, opacity: bron === 3 ? 0.45 : 1 }}>
                <svg width={RW} height={PH} className="vd-svg">
                  <Defs k="gp" />
                  {/* het gebouw, rechts en achter afgebroken */}
                  <rect x={xC} y={yAchter} width={xE - xC} height={yF - yAchter} fill="#f1f5f9" />
                  <line x1={xC} y1={yF} x2={xE} y2={yF} stroke="#334155" strokeWidth={2.6} />
                  <line x1={xC} y1={yF} x2={xC} y2={yAchter} stroke="#334155" strokeWidth={2.6} />
                  <path d={`M ${xE} ${yF} L ${xE} ${(yF + yAchter) / 2 + 6} L ${xE - 5} ${(yF + yAchter) / 2} L ${xE + 5} ${(yF + yAchter) / 2 - 4} L ${xE} ${(yF + yAchter) / 2 - 10} L ${xE} ${yAchter}`}
                    fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 3" />
                  {afgebroken
                    ? <path d={`M ${xC} ${yAchter} L ${(xC + xE) / 2 - 8} ${yAchter} L ${(xC + xE) / 2} ${yAchter - 5} L ${(xC + xE) / 2 + 4} ${yAchter + 5} L ${(xC + xE) / 2 + 12} ${yAchter} L ${xE} ${yAchter}`}
                        fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 3" />
                    : <line x1={xC} y1={yAchter} x2={xE} y2={yAchter} stroke="#334155" strokeWidth={1.4} />}
                  {/* zones langs de gevel */}
                  {zoneGrenzen.map((g) => (
                    <g key={g.z}>
                      <rect x={px(g.x0)} y={yF + 3} width={(g.x1 - g.x0) * sP} height={13} fill={ZONE_VUL[g.z]} stroke={ZONE_LIJN[g.z]} strokeWidth={g.z === zone ? 1.6 : 0.6} />
                      {(g.x1 - g.x0) * sP > 14 && (
                        <text x={px((g.x0 + g.x1) / 2)} y={yF + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill={ZONE_LIJN[g.z]}>{g.z}</text>
                      )}
                    </g>
                  ))}
                  {e / 5 < lZicht && <text x={px(e / 5)} y={yF + 30} textAnchor="middle" fontSize={10} fill="#6b7280">e/5</text>}
                  {e < lZicht && <text x={px(e)} y={yF + 30} textAnchor="middle" fontSize={10} fill="#6b7280">e = {fmt(e, 1)}</text>}
                  {/* wind langs de gevel, vanaf de hoek */}
                  <WindPijl x0={Math.max(4, xC - 34)} x1={xC + 26} y={yF + 38} />
                  <text x={xC + 32} y={yF + 42} fontSize={10} fill="#2563eb">wind</text>
                  {/* belast vlak van de kolom en de kolom zelf */}
                  <rect x={band0} y={yF - 9} width={Math.max(1, band1 - band0)} height={8} fill="rgba(37,99,235,0.16)" stroke="#2563eb" strokeWidth={0.9} />
                  <IProfiel cx={kolomX} cy={yF - 16} h={p.h} b={p.b} tw={p.tw} tf={p.tf} s={clamp(14 / p.h, 0.02, 0.2)} vulling="#cbd5e1" lijn="#334155" />
                  <HDim k="gp" x0={xC} x1={kolomX} y={yF - 46} ext={yF - 24} />
                  <VDim k="gp" y0={yAchter} y1={yF} x={xC - 18} ext={xC - 4} />
                </svg>

                <Dim ctx={ctx} name="a_hoek" value={aHoek} x={(xC + kolomX) / 2} y={yF - 46} step={0.5} label="a" dec={aHoek % 1 ? 2 : 0} />
                <Dim ctx={ctx} name="b_belast" value={bBel} x={kolomX} y={yF - 62} step={0.25} label="b" dec={bBel % 1 ? 2 : 0} title="belastingbreedte: hart-op-hartafstand van de kolommen" />
                <Dim ctx={ctx} name="d_geb" value={dGeb} x={xC - 18} y={(yF + yAchter) / 2} step={1} label="d" dec={dGeb % 1 ? 1 : 0} title="diepte van het gebouw, loodrecht op deze gevel" />
                <Dim ctx={ctx} name="z_wind" value={hGeb} x={RW - 44} y={Math.max(12, yAchter + 14)} step={0.5} label="h" dec={hGeb % 1 ? 1 : 0} title="hoogte van het gebouw: referentiehoogte z_e" />
              </div>
            </div>

            <div className="vd-canvas">
              <div className="vd-caption">Doorsnede — {p.naam}</div>
              <div className="vd-stage" style={{ width: RW, height: DH, background: "transparent", border: "none", borderRadius: 0 }}>
                <svg width={RW} height={DH} className="vd-svg">
                  <IProfiel cx={dcx} cy={dcy} h={p.h} b={p.b} tw={p.tw} tf={p.tf} s={sD} />
                  {/* regel op de buitenflens en de gevel daarbuiten */}
                  <rect x={dcx - regelB / 2} y={yBuitenflens} width={regelB} height={10}
                    fill={kst ? "#fbbf24" : "#e5e7eb"} stroke={kst ? "#92400e" : "#6b7280"} strokeWidth={1} strokeDasharray={kst ? undefined : "2 2"} />
                  <line x1={dcx - Math.max(60, p.b * sD)} y1={yBuitenflens + 12} x2={dcx + Math.max(60, p.b * sD)} y2={yBuitenflens + 12} stroke="#94a3b8" strokeWidth={2.6} />
                  <text x={dcx + Math.max(60, p.b * sD) + 6} y={yBuitenflens + 16} fontSize={10} fill="#64748b">buiten</text>
                  <text x={dcx + Math.max(60, p.b * sD) + 6} y={dcy - (p.h * sD) / 2 + 4} fontSize={10} fill="#64748b">binnen</text>
                </svg>
                <Ro text={`h=${fmt(p.h)}`} x={dcx - (p.b * sD) / 2 - 34} y={dcy - 9} title="profielhoogte (mm)" />
                <Ro text={`b=${fmt(p.b)}`} x={dcx} y={dcy - (p.h * sD) / 2 - 20} title="flensbreedte (mm)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>
          {afdruk ? "" : "Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet."}
          {!afdruk && <br />}
          De wind, de doorsnede, knik, kip en de doorbuiging staan in het rekenblad.
        </span>
        <span className="vd-live">
          {p.naam} S{fy} · L = {fmt(L, 2)} m · b = {fmt(bBel, 2)} m · {nr} {nr === 1 ? "regel" : "regels"}
          {nr >= 1 ? (kst ? " die de buitenflens steunen" : " zonder steun") : ""} ·
          {" "}N<sub>Ed</sub> = {fmt(N)} kN · {bron === 3 ? "netto wind zelf ingevuld" : `gebouw h = ${fmt(hGeb, 1)} m, d = ${fmt(dGeb, 1)} m, zone ${zone}`} · L/{grens}
        </span>
      </div>
    </div>
  );
}
