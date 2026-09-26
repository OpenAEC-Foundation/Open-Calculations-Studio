import { useDesigner, Dim, Force, Ro, Defs, loadMark, Bout, Las, fmt, clamp, UitkomstKop, JaNee } from "./designerKit";
import { useBladUitkomst, ucTekst } from "./bladResultaat";
import { useAlleenLezen } from "../../store/actiefBlad";
import { hoekstaal, hoekstaalOpties } from "./profielen";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een schoorverbinding: een hoekstaal onder een hoek op
 * een schetsplaat, met de bouten in één rij langs de schoor-as.
 *
 * De werklijn van de schoor gaat door de linkeronderhoek van de schetsplaat,
 * het werkpunt; de plaat is langs de onder- en de zijrand gelast. Het hoekstaal
 * begint op l₀ van het werkpunt, bout 1 zit op e₁ van het eind van het
 * hoekstaal, de volgende op de steek p₁. Het aangesloten been ligt met de
 * vrije rand op e₂ van de boutlijn; aan de andere kant staat het uitstaande
 * been (donkerder). De stippellijnen vanaf de buitenste bout geven de
 * spreiding onder 30° waarmee het blad de schetsplaat op trek toetst.
 *
 * Het beeld rekent zelf niets: de uitkomst en de UC per toets komen uit het
 * doorgerekende blad (templates/schoorverbinding.ts).
 */
const MARKER = "Schoorverbinding";

const HOEKPROFIELEN = hoekstaalOpties();
const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];
const KWAL = [{ v: 46, label: "4.6" }, { v: 56, label: "5.6" }, { v: 88, label: "8.8" }, { v: 109, label: "10.9" }];
const MAAT = [12, 16, 20, 24];
const GAT: Record<number, number> = { 12: 13, 16: 18, 20: 22, 24: 26 };

// Een L 50×50×5 S235 met twee bouten M16 – 8.8, alleen trek. Dezelfde waarden
// als het voorbeeld in scripts/check-schoor.mjs.
const DEFAULTS: Record<string, number> = {
  hoekprofiel: 3, uitvoering: 1, staalsoort: 235, boutkwaliteit: 88, boutmaat: 16,
  krachtsoort: 1, stuikgrens: 1,
  n_bouten: 2, t_schets: 8, hoek: 35, e_1: 25, p_1: 55, e_2: 25, l_0: 50,
  b_schets: 170, h_schets: 120, a_las: 5, F_Ed: 40,
};

/** De UC's per toets zoals het blad ze noemt, in de volgorde van het blad. */
const TOETSEN: { naam: string; label: string }[] = [
  { naam: "UC_t", label: "trek" },
  { naam: "UC_bs", label: "blokschuif been" },
  { naam: "UC_b", label: "bouten" },
  { naam: "UC_p", label: "plaat" },
  { naam: "UC_bs_p", label: "blokschuif plaat" },
  { naam: "UC_c", label: "knik plaat" },
  { naam: "UC_w", label: "las" },
  { naam: "UC_v_p", label: "schuif plaat" },
];

export default function SchoorDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  // In de afdruk valt er niets te klikken; dan ook geen aanwijzing daarvoor.
  const afdruk = useAlleenLezen();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const profId = Math.round(d("hoekprofiel"));
  const prof = hoekstaal(profId);
  const uitv = Math.round(d("uitvoering")) === 2 ? 2 : 1;
  const fy = Math.round(d("staalsoort"));
  const kwal = Math.round(d("boutkwaliteit"));
  const M = Math.round(d("boutmaat"));
  const druk = Math.round(d("krachtsoort")) === 2;
  const stuikgrens = Math.round(d("stuikgrens")) === 1;
  const n = Math.max(1, Math.round(d("n_bouten")));
  const tS = Math.max(1, d("t_schets"));
  const hoek = clamp(d("hoek"), 5, 85);
  // De tekening klemt de maten op iets tekenbaars; invoervelden en maatchips tonen de waarden uit het blad.
  const e1 = Math.max(1, d("e_1")), p1 = Math.max(1, d("p_1"));
  const e2 = clamp(d("e_2"), 1, prof.h - 1);
  const l0 = Math.max(0, d("l_0"));
  const bS = Math.max(20, d("b_schets")), hS = Math.max(20, d("h_schets"));
  const aLas = Math.max(1, d("a_las"));
  const F = d("F_Ed");
  const d0 = GAT[M] ?? M + 2;

  // ── geometrie in mm, y omhoog, oorsprong in het werkpunt ─────────────────
  const rad = (hoek * Math.PI) / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  /** Punt op afstand `l` langs de schoor-as en `o` er loodrecht op (positief naar linksboven). */
  const P = (l: number, o = 0): [number, number] => [l * c - o * s, l * s + o * c];
  const s1 = l0 + e1;                       // bout 1, bij het eind van het hoekstaal
  const sn = s1 + (n - 1) * p1;             // buitenste bout, bij de rand van de plaat
  const sUit = Math.min(bS / c, hS / s);    // waar de as de plaat verlaat
  const profL = Math.max(sn, sUit) + 70;    // het hoekstaal loopt door voorbij de plaat
  const oToe = -e2, oHiel = prof.h - e2;    // vrije rand van het been en de hiel
  const bw = 2 * (n - 1) * p1 * Math.tan(Math.PI / 6);

  // Steekt het eind van het hoekstaal voorbij een gelaste rand? Dan past het niet.
  // Dezelfde grens als het blad: de vrije rand van het been boven de onderrand, de hiel rechts van de zijrand.
  const l0min = Math.max(e2 / Math.tan(rad), (prof.h - e2) * Math.tan(rad));
  const botst = l0 + 0.001 < l0min;
  const buiten = sn >= sUit;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24;
  const W = box.w, H = Math.max(240, box.h - capH);
  const [xe, ye] = P(profL);
  const oMaat = oToe - 16;                  // maatlijn langs de as, onder de vrije rand
  // Bij het werkpunt zakt die maatlijn onder de onderrand; daar moet ruimte voor zijn.
  const yLaag = Math.min(0, P(l0 / 2, oMaat)[1], P(l0 + e1 / 2, oMaat)[1]);
  const xMax = Math.max(bS, xe + 60), yMax = Math.max(hS, ye + 40);
  const sc = clamp(Math.min((W - 110) / xMax, (H - 80) / (yMax - yLaag)), 0.05, 3);
  // Het werkpunt links; de tekening verticaal in het midden, met onderaan ruimte voor de maat b.
  const ox = 70;
  const oy = Math.min((H + (yMax + yLaag) * sc) / 2, H - 36, H - 16 + yLaag * sc);
  const px = ([x, y]: [number, number]): [number, number] => [ox + x * sc, oy - y * sc];
  const as = (l: number, o = 0) => px(P(l, o));
  const pts = (lijst: [number, number][]) => lijst.map((p) => px(p)).map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  const [gx0, gy0] = px([0, 0]);
  const [gx1, gy1] = px([bS, hS]);
  const bouten = Array.from({ length: n }, (_, i) => as(s1 + i * p1));
  const boutR = Math.max(3.5, (d0 * sc) / 2);
  const punt = as(profL);
  const pijl = 54;

  // Maatchips langs de as: een chip die een eerdere raakt, schuift loodrecht op de as naar buiten.
  const bMaat: [number, number] = [(gx0 + gx1) / 2, gy0 + 22];
  const hMaat: [number, number] = [gx0 - 22, (gy0 + gy1) / 2];
  const hoekMaat: [number, number] = [gx0 + 58, gy0 - 20];
  const bezet: [number, number][] = [bMaat, hMaat, hoekMaat];
  const plaats = (l: number, o: number): [number, number] => {
    let p = as(l, o);
    for (let k = 1; k <= 6 && bezet.some(([x, y]) => Math.abs(x - p[0]) < 46 && Math.abs(y - p[1]) < 23); k++) {
      p = as(l, o - (k * 24) / sc);
    }
    p = [clamp(p[0], 24, W - 24), clamp(p[1], 12, H - 12)];
    bezet.push(p);
    return p;
  };
  const chipE1 = plaats(l0 + e1 / 2, oMaat);
  const chipP1 = n > 1 ? plaats(s1 + p1 / 2, oMaat) : null;
  const chipL0 = l0 > 0 ? plaats(l0 / 2, oMaat) : null;
  const chipE2 = plaats(sn + 30, oToe / 2);

  // ── uitkomst uit het blad ─────────────────────────────────────────────────
  const g = uitkomst?.getallen ?? {};
  const ucs = TOETSEN.filter((t) => g[t.naam] !== undefined && (t.naam !== "UC_c" || druk));

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — schoorverbinding" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Schoor</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Hoekprofiel
            <select style={{ width: "100%" }} value={profId} onChange={(e) => set("hoekprofiel", parseInt(e.target.value))}>
              {HOEKPROFIELEN.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Uitvoering
            <select style={{ width: "100%" }} value={uitv} onChange={(e) => set("uitvoering", parseInt(e.target.value))}>
              <option value={1}>enkel hoekstaal</option>
              <option value={2}>dubbel hoekstaal (rug aan rug)</option>
            </select>
          </label>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label title="Hoek van de schoor met de horizontaal">Hoek (°)
            <input type="number" step={5} min={5} max={85} value={d("hoek")} onChange={(e) => set("hoek", parseFloat(e.target.value))} />
          </label>
          <label title="Afstand van het werkpunt tot het eind van het hoekstaal, langs de as">l<sub>0</sub> (mm)
            <input type="number" step={5} min={0} value={d("l_0")} onChange={(e) => set("l_0", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Bouten</span>
          <label>Kwaliteit
            <select value={kwal} onChange={(e) => set("boutkwaliteit", parseInt(e.target.value))}>
              {KWAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label>Boutmaat
            <select value={M} onChange={(e) => set("boutmaat", parseInt(e.target.value))}>
              {MAAT.map((m) => <option key={m} value={m}>M{m}</option>)}
            </select>
          </label>
          <label>Aantal bouten
            <input type="number" step={1} min={1} max={6} value={n} onChange={(e) => set("n_bouten", parseFloat(e.target.value))} />
          </label>
          <label title="Eindafstand van bout 1 tot het eind van het hoekstaal">e<sub>1</sub> (mm)
            <input type="number" step={5} value={d("e_1")} onChange={(e) => set("e_1", parseFloat(e.target.value))} />
          </label>
          <label>Steek p<sub>1</sub> (mm)
            <input type="number" step={5} value={d("p_1")} onChange={(e) => set("p_1", parseFloat(e.target.value))} />
          </label>
          <label title="Van het hart van de gaten tot de vrije rand van het aangesloten been">e<sub>2</sub> (mm)
            <input type="number" step={1} value={d("e_2")} onChange={(e) => set("e_2", parseFloat(e.target.value))} />
          </label>
          {uitv === 1 && n > 1 && (
            <JaNee label={<>Stuik begrenzen, §3.6.1(10)</>} waarde={stuikgrens}
              onChange={(v) => set("stuikgrens", v ? 1 : 0)} />
          )}

          <span className="vd-ctrl-h">Schetsplaat</span>
          <label>Dikte (mm)
            <input type="number" step={1} min={1} value={d("t_schets")} onChange={(e) => set("t_schets", parseFloat(e.target.value))} />
          </label>
          <label>Breedte (mm)
            <input type="number" step={10} value={d("b_schets")} onChange={(e) => set("b_schets", parseFloat(e.target.value))} />
          </label>
          <label>Hoogte (mm)
            <input type="number" step={10} value={d("h_schets")} onChange={(e) => set("h_schets", parseFloat(e.target.value))} />
          </label>
          <label>Keeldikte las a (mm)
            <input type="number" step={1} min={1} value={d("a_las")} onChange={(e) => set("a_las", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Belasting</span>
          <label>F<sub>Ed</sub> (kN)
            <input type="number" step={10} value={F} onChange={(e) => set("F_Ed", parseFloat(e.target.value))} />
          </label>
          <JaNee label="Ook druk (omkerende wind)" waarde={druk} onChange={(v) => set("krachtsoort", v ? 2 : 1)} />
          <span className="gd-note">Gat d<sub>0</sub> = {fmt(d0)} mm · bout 1 op {fmt(s1)} mm van het werkpunt ·
            {uitv === 2 ? " dubbel, twee afschuifvlakken" : " enkelzijdig aangesloten (excentriciteit)"}</span>
          {botst && (
            <span className="gd-note" style={{ color: "#b91c1c" }}>Het eind van het hoekstaal steekt voorbij een gelaste rand: l<sub>0</sub> ≥ {fmt(l0min)} mm nodig.</span>
          )}
          {buiten && (
            <span className="gd-note" style={{ color: "#b91c1c" }}>De buitenste bout valt buiten de schetsplaat: vergroot de plaat of verklein l<sub>0</sub>, e<sub>1</sub> of p<sub>1</sub>.</span>
          )}
          {ucs.length > 0 && (
            <span className="gd-note">UC per toets: {ucs.map((t) => `${t.label} ${ucTekst(g[t.naam])}`).join(" · ")}</span>
          )}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Aanzicht op de schetsplaat</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                <Defs k="sc" />
                {/* gelaste randen: de aansluitende ligger en kolom, gearceerd */}
                <line x1={gx0} y1={gy0 + 3} x2={gx1 + 12} y2={gy0 + 3} stroke="#64748b" strokeWidth={5} opacity={0.35} />
                <line x1={gx0 - 3} y1={gy0} x2={gx0 - 3} y2={gy1 - 12} stroke="#64748b" strokeWidth={5} opacity={0.35} />
                {/* schetsplaat */}
                <rect x={gx0} y={gy1} width={gx1 - gx0} height={gy0 - gy1} fill="#f3f4f6" stroke="#1e40af" strokeWidth={1.5} />
                {/* spreiding onder 30° vanaf de buitenste bout, tot bout 1 */}
                {n > 1 && (
                  <polyline points={pts([P(s1, bw / 2), P(sn), P(s1, -bw / 2)])}
                    fill="none" stroke="#7c3aed" strokeWidth={1} strokeDasharray="4 3" />
                )}
                {/* hoekstaal: het aangesloten been, vanaf l₀ */}
                <polygon points={pts([P(l0, oToe), P(profL, oToe), P(profL, oHiel), P(l0, oHiel)])}
                  fill="#dbe7f6" fillOpacity={0.75} stroke="#1e40af" strokeWidth={1.5} />
                {/* het uitstaande been bij de hiel, iets donkerder */}
                <polygon points={pts([P(l0, oHiel - Math.max(prof.t, 3)), P(profL, oHiel - Math.max(prof.t, 3)), P(profL, oHiel), P(l0, oHiel)])}
                  fill="#bfd3ee" stroke="#1e40af" strokeWidth={1} />
                {/* hartlijn van de schoor, door het werkpunt */}
                <line x1={gx0} y1={gy0} x2={punt[0]} y2={punt[1]} stroke="#dc2626" strokeWidth={1} strokeDasharray="9 4 2 4" />
                {/* hoekmarkering met de horizontaal */}
                <path d={`M ${gx0 + 46} ${gy0} A 46 46 0 0 0 ${gx0 + 46 * c} ${gy0 - 46 * s}`} fill="none" stroke="#374151" strokeWidth={1} />
                {/* bouten */}
                {bouten.map((p, i) => <Bout key={i} cx={p[0]} cy={p[1]} r={boutR} />)}
                {/* lassen langs de twee gelaste randen */}
                <Las x={gx0 + 10} y={gy1 + 14} a={Math.max(4, aLas * sc * 1.6)} />
                <Las x={gx1 - 18} y={gy0 - 4} a={Math.max(4, aLas * sc * 1.6)} />
                {/* schoorkracht */}
                <line x1={punt[0]} y1={punt[1]} x2={punt[0] + pijl * c} y2={punt[1] - pijl * s}
                  className="vd-load" strokeWidth={3} markerEnd={loadMark("sc")} />
                {/* maatlijnen langs de as: l₀, e₁, p₁ */}
                {l0 > 0 && <line x1={as(0, oMaat)[0]} y1={as(0, oMaat)[1]} x2={as(l0, oMaat)[0]} y2={as(l0, oMaat)[1]} className="vd-dimmeasure" />}
                <line x1={as(l0, oMaat)[0]} y1={as(l0, oMaat)[1]} x2={as(s1, oMaat)[0]} y2={as(s1, oMaat)[1]} className="vd-dimmeasure" />
                {n > 1 && <line x1={as(s1, oMaat)[0]} y1={as(s1, oMaat)[1]} x2={as(s1 + p1, oMaat)[0]} y2={as(s1 + p1, oMaat)[1]} className="vd-dimmeasure" />}
                {/* e₂: van de boutlijn tot de vrije rand van het been, voorbij de buitenste bout */}
                <line x1={as(sn + 18, 0)[0]} y1={as(sn + 18, 0)[1]} x2={as(sn + 18, oToe)[0]} y2={as(sn + 18, oToe)[1]} className="vd-dimmeasure" />
                {/* plaatmaten */}
                <line x1={gx0} y1={gy0 + 22} x2={gx1} y2={gy0 + 22} className="vd-dimmeasure" />
                <line x1={gx0 - 22} y1={gy0} x2={gx0 - 22} y2={gy1} className="vd-dimmeasure" />
              </svg>

              {chipL0 && <Dim ctx={ctx} name="l_0" value={d("l_0")} x={chipL0[0]} y={chipL0[1]} step={5} label="l0" />}
              <Dim ctx={ctx} name="e_1" value={d("e_1")} x={chipE1[0]} y={chipE1[1]} step={5} label="e1" />
              {chipP1 && <Dim ctx={ctx} name="p_1" value={d("p_1")} x={chipP1[0]} y={chipP1[1]} step={5} label="p1" />}
              <Dim ctx={ctx} name="e_2" value={d("e_2")} x={chipE2[0]} y={chipE2[1]} step={1} label="e2" />
              <Dim ctx={ctx} name="b_schets" value={d("b_schets")} x={bMaat[0]} y={bMaat[1]} step={10} />
              <Dim ctx={ctx} name="h_schets" value={d("h_schets")} x={hMaat[0]} y={hMaat[1]} step={10} />
              <Dim ctx={ctx} name="hoek" value={d("hoek")} x={hoekMaat[0]} y={hoekMaat[1]} step={5} label="°" />
              <Force ctx={ctx} name="F_Ed" value={F} x={punt[0] + pijl * c + 30} y={punt[1] - pijl * s - 14} unit="kN" label="F_Ed" />
              <Ro text={`a=${fmt(aLas)}`} x={gx0 + 30} y={gy1 + 8} title="keeldikte van de las" />
              {n > 1 && <Ro text={`30°`} x={as(sn - 12, bw / 4 + 6)[0]} y={as(sn - 12, bw / 4 + 6)[1]} title="spreiding over de boutrij" kleur="#7c3aed" />}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>
          {afdruk ? "" : "Klik op een blauwe maat of de rode kracht om die te wijzigen — stroomt direct terug in de rekensheet."}
          {!afdruk && <br />}
          Werklijn door de hoek van de schetsplaat; de plaat is langs de onder- en de zijrand gelast.
        </span>
        <span className="vd-live">
          {prof.naam} {uitv === 2 ? "(dubbel)" : "(enkel)"} S{fy} · {n}× M{M}–{KWAL.find((k) => k.v === kwal)?.label} ·
          l<sub>0</sub>/e<sub>1</sub>/p<sub>1</sub>/e<sub>2</sub> = {fmt(d("l_0"))}/{fmt(d("e_1"))}/{fmt(d("p_1"))}/{fmt(d("e_2"))} ·
          schetsplaat {fmt(bS)}×{fmt(hS)}×{fmt(tS)} mm · a = {fmt(aLas)} mm · hoek {fmt(hoek)}° · F<sub>Ed</sub> = {fmt(F)} kN{druk ? ", trek en druk" : ""}
        </span>
      </div>
    </div>
  );
}
