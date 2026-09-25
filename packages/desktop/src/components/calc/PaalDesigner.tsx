import { useRef, useState } from "react";
import { parseGef } from "@ifc-calc/core";
import { useDesigner, Dim, Force, Ro, fmt, clamp } from "./designerKit";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import { useProjectStore } from "../../store/projectStore";
import { koppejan, schachtGemiddelde, sonderingUitGef, type Sondering } from "./koppejan";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het rekenblad "Paaldraagvermogen — NEN 9997-1".
 *
 * Eén tekening met een gedeelde NAP-as: links de grondopbouw met de paal, de
 * lagen met negatieve kleef en de trajecten rond de paalpunt, rechts de
 * sonderingen. GEF-bestanden worden hier ingelezen; de methode van Koppejan
 * (koppejan.ts) leest er de gemiddelden over de trajecten I, II en III uit, en
 * die gaan met één knop het rekenblad in. Het rekenblad doet de rest.
 *
 * De sonderingen zelf staan als tekst in de invoer van het blad
 * (`sondering_1` … `sondering_6`), zodat ze met het project worden opgeslagen.
 *
 * Zonder GEF tekent het beeld rechts de gemiddelden die in het blad staan, als
 * getrapt profiel per sondering: III van 8·D_eq boven de punt naar de punt,
 * dan I omlaag tot 4·D_eq en II terug omhoog — de volgorde van Koppejan — en
 * de schachtwaarde q_cs als stippellijn over ΔL.
 */
const MARKER = "Paaldraagvermogen — NEN 9997-1 art. 7.6.2.3";
const MAX_S = 6;

const PAALTYPEN = [
  "Betonpaal, geprefabriceerd, geheid",
  "Betonpaal in de grond gevormd, mantelbuis teruggeheid",
  "Betonpaal in de grond gevormd, mantelbuis getrild",
  "Betonpaal in de grond gevormd, schroefpunt",
  "Avegaarpaal, geschroefd",
  "Boorpaal met steunvloeistof",
  "Stalen buispaal, gesloten punt, geheid",
  "Stalen profiel of open buis, geheid",
  "Stalen paal met schroefpunt, geschroefd",
  "Groutschil rond buis met schroefpunt",
  "Houten paal, constante doorsnede, geheid",
  "Houten paal, taps, geheid",
];
const VORMEN = [{ v: 1, label: "Rond" }, { v: 2, label: "Vierkant" }, { v: 3, label: "Rechthoekig" }];
const KLEUREN = ["#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed", "#0891b2"];

// Een prefab betonpaal 290 × 290 met de punt op NAP −15 m, twee sonderingen en
// negatieve kleef in klei, veen en klei. Dezelfde waarden als in scripts/check-paal.mjs.
const DEFAULTS: Record<string, number> = {
  paaltype: 1, vorm: 2, D: 400, a_p: 290, b_p: 290, s_p: 1, "β": 1, z_kop: -1, z_punt: -15, stijf: 0,
  n_s: 2,
  q_cI_1: 16, q_cII_1: 14, q_cIII_1: 12, q_cs_1: 10, "ΔL_1": 3,
  q_cI_2: 14, q_cII_2: 12, q_cIII_2: 11, q_cs_2: 9, "ΔL_2": 3,
  q_cI_3: 15, q_cII_3: 13, q_cIII_3: 11, q_cs_3: 9, "ΔL_3": 3,
  q_cI_4: 15, q_cII_4: 13, q_cIII_4: 11, q_cs_4: 9, "ΔL_4": 3,
  q_cI_5: 15, q_cII_5: 13, q_cIII_5: 11, q_cs_5: 9, "ΔL_5": 3,
  q_cI_6: 15, q_cII_6: 13, q_cIII_6: 11, q_cs_6: 9, "ΔL_6": 3,
  nk: 1, z_mv: -0.5, d_gw: 1, q_mv: 0, n_l: 3,
  d_1: 2, "γ_1": 17, "γ_sat_1": 17, "φ_1": 22.5,
  d_2: 3, "γ_2": 11, "γ_sat_2": 11, "φ_2": 15,
  d_3: 5, "γ_3": 17, "γ_sat_3": 17, "φ_3": 22.5,
  d_4: 1, "γ_4": 17, "γ_sat_4": 17, "φ_4": 22.5,
  d_5: 1, "γ_5": 17, "γ_sat_5": 17, "φ_5": 22.5,
  F_c_d: 450,
};

/** Laagkleur naar de hoek van inwendige wrijving: veen donker, klei middel, zand licht. */
const laagKleur = (phi: number) => (phi < 17.5 ? "#a8876a" : phi < 27.5 ? "#c9b58f" : "#e8d7a6");

function leesSondering(raw: string | undefined): Sondering | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Sondering;
    return Array.isArray(s.z) && Array.isArray(s.qc) && s.z.length > 1 ? s : null;
  } catch {
    return null;
  }
}

export default function PaalDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  const exemplaar = useActiefExemplaar();
  const afdruk = useAlleenLezen();
  const zetWaarde = useProjectStore((s) => s.zetWaarde);
  const bestandRef = useRef<HTMLInputElement>(null);
  const [melding, setMelding] = useState<string | null>(null);
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;
  const bladId = afdruk ? "" : exemplaar?.id ?? "";
  const waarden = exemplaar?.waarden ?? {};

  const paaltype = clamp(Math.round(d("paaltype")), 1, 12);
  const vorm = clamp(Math.round(d("vorm")), 1, 3);
  const D = Math.max(50, d("D")), a = Math.max(50, d("a_p")), b = Math.max(a, d("b_p"));
  const Ab = vorm === 1 ? (Math.PI * (D / 1000) ** 2) / 4 : vorm === 2 ? (a / 1000) ** 2 : (a / 1000) * (b / 1000);
  const Deq = vorm === 1 ? D / 1000 : vorm === 3 && b > 1.5 * a ? a / 1000 : Math.sqrt((4 * Ab) / Math.PI);
  const zKop = d("z_kop"), zPunt = Math.min(d("z_punt"), zKop - 0.5);
  const nS = clamp(Math.round(d("n_s")), 1, MAX_S);
  const nk = Math.round(d("nk")) === 1;
  const zMv = nk ? d("z_mv") : zKop;
  const dGw = d("d_gw");
  const nL = nk ? clamp(Math.round(d("n_l")), 1, 5) : 0;
  const lagen = Array.from({ length: nL }, (_, i) => ({ j: i + 1, d: Math.max(0.1, d(`d_${i + 1}`)), phi: d(`φ_${i + 1}`) }));
  const zDraag = zMv - lagen.reduce((s, l) => s + l.d, 0);
  const Fcd = d("F_c_d");

  const sonderingen = Array.from({ length: MAX_S }, (_, i) => leesSondering(waarden[`sondering_${i + 1}`]));
  const geladen = sonderingen.filter((s): s is Sondering => s !== null);
  const avegaar = paaltype === 5;
  // Zonder GEF: de gemiddelden die in het blad zijn ingevuld, per sondering.
  const handmatig = geladen.length === 0;
  const gemiddelden = Array.from({ length: nS }, (_, i) => {
    const j = i + 1;
    return {
      qcI: Math.max(0, d(`q_cI_${j}`)), qcII: Math.max(0, d(`q_cII_${j}`)), qcIII: Math.max(0, d(`q_cIII_${j}`)),
      qcs: Math.max(0, d(`q_cs_${j}`)), dl: Math.max(0, d(`ΔL_${j}`)),
    };
  });
  const uitkomsten = sonderingen.map((s, i) => {
    if (!s) return null;
    const kop = koppejan(s, zPunt, Deq, avegaar);
    const dl = d(`ΔL_${i + 1}`);
    const qcs = schachtGemiddelde(s, zPunt, dl);
    return kop ? { ...kop, qcs } : null;
  });

  // ── GEF inlezen: de sondering als tekst in de invoer van het blad ─────────
  const leesBestanden = async (lijst: FileList | null) => {
    if (!lijst || lijst.length === 0 || !bladId) return;
    const bestanden = Array.from(lijst).slice(0, MAX_S);
    let nr = 0;
    const fouten: string[] = [];
    for (const bestand of bestanden) {
      try {
        const gef = parseGef(await bestand.text());
        if (gef.depths.length < 2) throw new Error("geen meetpunten");
        const s = sonderingUitGef(bestand.name.replace(/\.gef$/i, ""), gef);
        nr += 1;
        zetWaarde(bladId, `sondering_${nr}`, JSON.stringify(s));
      } catch (err) {
        fouten.push(`${bestand.name}: ${(err as Error).message}`);
      }
    }
    for (let j = nr + 1; j <= MAX_S; j++) zetWaarde(bladId, `sondering_${j}`, "");
    if (nr > 0) set("n_s", nr);
    setMelding(fouten.length ? `Niet ingelezen — ${fouten.join("; ")}` : `${nr} sondering${nr === 1 ? "" : "en"} ingelezen.`);
  };

  /** De gemiddelden van Koppejan en de schacht in het rekenblad zetten. */
  const neemOver = () => {
    let n = 0;
    uitkomsten.forEach((u, i) => {
      if (!u) return;
      const j = i + 1;
      set(`q_cI_${j}`, Math.round(u.qcI * 100) / 100);
      set(`q_cII_${j}`, Math.round(u.qcII * 100) / 100);
      set(`q_cIII_${j}`, Math.round(u.qcIII * 100) / 100);
      if (u.qcs !== null) set(`q_cs_${j}`, Math.round(u.qcs * 100) / 100);
      n += 1;
    });
    setMelding(n ? `Koppejan overgenomen voor ${n} sondering${n === 1 ? "" : "en"}.` : "Geen sondering reikt ver genoeg rond de paalpunt.");
  };
  const wisSonderingen = () => {
    for (let j = 1; j <= MAX_S; j++) zetWaarde(bladId, `sondering_${j}`, "");
    setMelding(null);
  };

  // ── layout: één tekening met een gedeelde NAP-as ──────────────────────────
  const W = box.w;
  const H = Math.max(360, box.h - 30);
  const zTop = Math.max(zKop, zMv, ...geladen.map((s) => Math.min(s.maaiveld, zKop + 2))) + 0.6;
  const zBot = Math.min(zPunt - Math.max(4 * Deq, 1.2) - 0.6, ...geladen.map((s) => Math.max(s.z[s.z.length - 1], zPunt - 4)));
  const mT = 26, mB = 26;
  const sch = (H - mT - mB) / Math.max(zTop - zBot, 1);
  const Y = (z: number) => mT + (zTop - z) * sch;
  // links de grond en de paal, rechts de sonderingen of hun ingevulde gemiddelden
  const splits = Math.round(W * 0.46);
  const gx0 = 48, gx1 = splits - 18;
  const px = (gx0 + gx1) / 2 + 10;
  const pw = clamp(Deq * sch * 1.4, 8, 36);
  const qx0 = splits + 30, qx1 = W - 14;
  const qMax = handmatig
    ? Math.max(20, ...gemiddelden.flatMap((g) => [g.qcI, g.qcII, g.qcIII, g.qcs])) * 1.05
    : Math.max(20, ...geladen.flatMap((s) => s.qc.filter((_, i) => s.z[i] <= zTop && s.z[i] >= zBot))) * 1.05;
  const QX = (q: number) => qx0 + ((qx1 - qx0) * Math.min(q, qMax)) / qMax;

  const lagenZ = lagen.reduce<{ j: number; top: number; bot: number; phi: number }[]>((acc, l) => {
    const top = acc.length ? acc[acc.length - 1].bot : zMv;
    acc.push({ j: l.j, top, bot: top - l.d, phi: l.phi });
    return acc;
  }, []);

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — paaldraagvermogen</strong>
        <span className="vd-uc info">
          {PAALTYPEN[paaltype - 1].toLowerCase()} · D<sub>eq</sub> = {fmt(Deq * 1000)} mm · {nS} sondering{nS === 1 ? "" : "en"}
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Paal</span>
          <label>Paaltype (tabel 7.c)
            <select value={paaltype} onChange={(e) => set("paaltype", parseInt(e.target.value))}>
              {PAALTYPEN.map((t, i) => <option key={t} value={i + 1}>{t}</option>)}
            </select>
          </label>
          <label>Doorsnede
            <select value={vorm} onChange={(e) => set("vorm", parseInt(e.target.value))}>
              {VORMEN.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          {vorm === 1 ? (
            <label>Middellijn D (mm)
              <input type="number" step={10} value={D} onChange={(e) => set("D", parseFloat(e.target.value))} />
            </label>
          ) : (
            <label>{vorm === 2 ? "Zijde a (mm)" : "Kleinste zijde a (mm)"}
              <input type="number" step={10} value={a} onChange={(e) => set("a_p", parseFloat(e.target.value))} />
            </label>
          )}
          {vorm === 3 && (
            <label>Grootste zijde b (mm)
              <input type="number" step={10} value={b} onChange={(e) => set("b_p", parseFloat(e.target.value))} />
            </label>
          )}

          <span className="vd-ctrl-h">Sonderingen</span>
          <input ref={bestandRef} type="file" accept=".gef,.GEF" multiple style={{ display: "none" }}
            onChange={(e) => { void leesBestanden(e.target.files); e.currentTarget.value = ""; }} />
          <div className="vd-ontwerp">
            <button type="button" disabled={afdruk} onClick={() => bestandRef.current?.click()}>GEF inlezen…</button>
            <span>tot {MAX_S} sonderingen</span>
          </div>
          {geladen.length > 0 && (
            <>
              <div className="vd-ontwerp">
                <button type="button" disabled={afdruk} onClick={neemOver}>Koppejan overnemen</button>
                <button type="button" disabled={afdruk} onClick={wisSonderingen}>Wissen</button>
              </div>
              <span className="gd-note">
                {sonderingen.map((s, i) => s && (
                  <span key={i} style={{ display: "block", color: KLEUREN[i] }}>
                    {i + 1}. {s.naam} (maaiveld NAP {fmt(s.maaiveld, 2)})
                    {uitkomsten[i]
                      ? ` — I ${fmt(uitkomsten[i]!.qcI, 1)} · II ${fmt(uitkomsten[i]!.qcII, 1)} · III ${fmt(uitkomsten[i]!.qcIII, 1)} MPa`
                      : " — reikt niet ver genoeg"}
                  </span>
                ))}
              </span>
            </>
          )}
          {melding && <p className="vd-ontwerp-melding">{melding}</p>}
          {handmatig && (
            <>
              <span className="gd-note">Zonder GEF-bestand vul je de gemiddelde conusweerstanden per sondering zelf in het rekenblad in. De tekening toont die gemiddelden.</span>
              <span className="gd-note">
                {gemiddelden.map((g, i) => (
                  <span key={i} style={{ display: "block", color: KLEUREN[i] }}>
                    {i + 1}. I {fmt(g.qcI, 1)} · II {fmt(g.qcII, 1)} · III {fmt(g.qcIII, 1)} · schacht {fmt(g.qcs, 1)} MPa over {fmt(g.dl, 1)} m
                  </span>
                ))}
              </span>
            </>
          )}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Grondopbouw, paal en sonderingen</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                {/* draagkrachtige laag en de lagen met negatieve kleef */}
                <rect x={gx0} y={Y(zDraag)} width={gx1 - gx0} height={Math.max(0, Y(zBot) - Y(zDraag))} fill="#fde68a" opacity={0.6} />
                {lagenZ.map((l) => (
                  <g key={l.j}>
                    <rect x={gx0} y={Y(l.top)} width={gx1 - gx0} height={Y(l.bot) - Y(l.top)} fill={laagKleur(l.phi)} opacity={0.7} />
                    <line x1={gx0} y1={Y(l.bot)} x2={gx1} y2={Y(l.bot)} stroke="#6b4f1d" strokeWidth={0.7} />
                  </g>
                ))}
                {nk && (
                  <>
                    <line x1={gx0 - 6} y1={Y(zMv)} x2={gx1} y2={Y(zMv)} stroke="#374151" strokeWidth={1.6} />
                    <line x1={gx0} y1={Y(zMv - dGw)} x2={gx0 + 60} y2={Y(zMv - dGw)} stroke="#2563eb" strokeWidth={1.2} strokeDasharray="5 3" />
                    <polygon points={`${gx0 + 30},${Y(zMv - dGw) - 1} ${gx0 + 25},${Y(zMv - dGw) - 8} ${gx0 + 35},${Y(zMv - dGw) - 8}`} fill="#2563eb" />
                  </>
                )}
                {/* trajecten rond de paalpunt: I en II onder, III erboven */}
                <rect x={px - pw / 2 - 16} y={Y(zPunt)} width={pw + 32} height={Y(zPunt - 4 * Deq) - Y(zPunt)}
                  fill="#fca5a5" opacity={0.45} stroke="#b91c1c" strokeWidth={0.7} strokeDasharray="3 2" />
                <rect x={px - pw / 2 - 16} y={Y(zPunt + 8 * Deq)} width={pw + 32} height={Y(zPunt) - Y(zPunt + 8 * Deq)}
                  fill="#93c5fd" opacity={0.4} stroke="#2563eb" strokeWidth={0.7} strokeDasharray="3 2" />
                {/* de paal */}
                <rect x={px - pw / 2} y={Y(zKop)} width={pw} height={Y(zPunt) - Y(zKop)} fill="#cbd5e1" stroke="#334155" strokeWidth={1.4} />
                <line x1={px} y1={Y(zKop) - 30} x2={px} y2={Y(zKop) - 8} stroke="#b91c1c" strokeWidth={2.6} />
                <polygon points={`${px},${Y(zKop) - 1} ${px - 5},${Y(zKop) - 11} ${px + 5},${Y(zKop) - 11}`} fill="#b91c1c" />
                {/* NAP-schaal links */}
                {Array.from({ length: Math.floor(zTop) - Math.ceil(zBot) + 1 }, (_, i) => Math.ceil(zBot) + i)
                  .filter((z) => z % 2 === 0)
                  .map((z) => (
                    <g key={z}>
                      <line x1={gx0 - 6} y1={Y(z)} x2={gx0} y2={Y(z)} stroke="#6b7280" strokeWidth={0.8} />
                      <text x={gx0 - 8} y={Y(z) + 3} textAnchor="end" fontSize={9} fill="#6b7280">{z}</text>
                    </g>
                  ))}
                <text x={gx0 - 8} y={mT - 10} textAnchor="end" fontSize={9} fill="#6b7280">NAP</text>

                {/* de sonderingen */}
                {geladen.length > 0 && (
                  <g>
                    {[0, 5, 10, 15, 20, 25, 30].filter((q) => q <= qMax).map((q) => (
                      <g key={q}>
                        <line x1={QX(q)} y1={mT} x2={QX(q)} y2={H - mB} stroke="#e5e7eb" strokeWidth={0.8} />
                        <text x={QX(q)} y={mT - 6} textAnchor="middle" fontSize={9} fill="#6b7280">{q}</text>
                      </g>
                    ))}
                    <text x={qx1} y={H - 8} textAnchor="end" fontSize={9} fill="#6b7280">q<tspan baselineShift="sub" fontSize={7}>c</tspan> (MPa)</text>
                    <line x1={qx0} y1={Y(zPunt)} x2={qx1} y2={Y(zPunt)} stroke="#334155" strokeWidth={1} strokeDasharray="6 3" />
                    <rect x={qx0} y={Y(zPunt)} width={qx1 - qx0} height={Y(zPunt - 4 * Deq) - Y(zPunt)} fill="#fca5a5" opacity={0.18} />
                    <rect x={qx0} y={Y(zPunt + 8 * Deq)} width={qx1 - qx0} height={Y(zPunt) - Y(zPunt + 8 * Deq)} fill="#93c5fd" opacity={0.18} />
                    {sonderingen.map((s, i) => s && (
                      <polyline key={i} fill="none" stroke={KLEUREN[i]} strokeWidth={1.2}
                        points={s.z.map((z, k) => (z <= zTop && z >= zBot ? `${QX(s.qc[k])},${Y(z)}` : null)).filter(Boolean).join(" ")} />
                    ))}
                    <line x1={qx0} y1={mT} x2={qx0} y2={H - mB} stroke="#374151" strokeWidth={1} />
                  </g>
                )}

                {/* zonder GEF: de ingevulde gemiddelden als getrapt profiel */}
                {handmatig && (
                  <g>
                    {[0, 5, 10, 15, 20, 25, 30].filter((q) => q <= qMax).map((q) => (
                      <g key={q}>
                        <line x1={QX(q)} y1={mT} x2={QX(q)} y2={H - mB} stroke="#e5e7eb" strokeWidth={0.8} />
                        <text x={QX(q)} y={mT - 6} textAnchor="middle" fontSize={9} fill="#6b7280">{q}</text>
                      </g>
                    ))}
                    <text x={qx1} y={H - 8} textAnchor="end" fontSize={9} fill="#6b7280">q<tspan baselineShift="sub" fontSize={7}>c</tspan> (MPa), ingevulde gemiddelden</text>
                    <rect x={qx0} y={Y(zPunt)} width={qx1 - qx0} height={Y(zPunt - 4 * Deq) - Y(zPunt)} fill="#fca5a5" opacity={0.18} />
                    <rect x={qx0} y={Y(zPunt + 8 * Deq)} width={qx1 - qx0} height={Y(zPunt) - Y(zPunt + 8 * Deq)} fill="#93c5fd" opacity={0.18} />
                    <line x1={qx0} y1={Y(zPunt)} x2={qx1} y2={Y(zPunt)} stroke="#334155" strokeWidth={1} strokeDasharray="6 3" />
                    {gemiddelden.map((g, i) => {
                      const kleur = KLEUREN[i];
                      // Een kleine verschuiving per sondering houdt gelijke waarden uit elkaar.
                      const dx = (i - (nS - 1) / 2) * 2;
                      const x = (q: number) => QX(q) + dx;
                      const yIII = Y(zPunt + 8 * Deq), yP = Y(zPunt), yI = Y(zPunt - 4 * Deq);
                      return (
                        <g key={i}>
                          <polyline fill="none" stroke={kleur} strokeWidth={1.6}
                            points={`${x(g.qcIII)},${yIII} ${x(g.qcIII)},${yP} ${x(g.qcI)},${yP} ${x(g.qcI)},${yI} ${x(g.qcII)},${yI} ${x(g.qcII)},${yP}`} />
                          {g.dl > 0 && (
                            <line x1={x(g.qcs)} y1={yP} x2={x(g.qcs)} y2={Y(zPunt + g.dl)} stroke={kleur} strokeWidth={1.4} strokeDasharray="2 3" />
                          )}
                        </g>
                      );
                    })}
                    <text x={qx0 + 4} y={(Y(zPunt) + Y(zPunt - 4 * Deq)) / 2 + 3} fontSize={9} fill="#b91c1c">I, II</text>
                    <text x={qx0 + 4} y={(Y(zPunt) + Y(zPunt + 8 * Deq)) / 2 + 3} fontSize={9} fill="#2563eb">III</text>
                    <text x={qx0 + 4} y={Y(zPunt + Math.max(...gemiddelden.map((g) => g.dl), 8 * Deq)) - 4} fontSize={9} fill="#6b7280">q<tspan baselineShift="sub" fontSize={7}>cs</tspan> over ΔL (stippel)</text>
                    <line x1={qx0} y1={mT} x2={qx0} y2={H - mB} stroke="#374151" strokeWidth={1} />
                  </g>
                )}
              </svg>

              <Dim ctx={ctx} name="z_kop" value={zKop} x={px + pw / 2 + 34} y={Y(zKop)} step={0.1} label="kop" dec={2} />
              <Dim ctx={ctx} name="z_punt" value={zPunt} x={px + pw / 2 + 36} y={Y(zPunt)} step={0.1} label="punt" dec={2} />
              <Force ctx={ctx} name="F_c_d" value={Fcd} x={px + 30} y={Y(zKop) - 30} unit="kN" label="Fcd" step={10} />
              {lagenZ.map((l) => (
                <Dim key={l.j} ctx={ctx} name={`d_${l.j}`} value={l.top - l.bot} x={gx0 + 22} y={(Y(l.top) + Y(l.bot)) / 2} step={0.1} label={`d${l.j}`} dec={1} />
              ))}
              {nk && <Ro text={`maaiveld ${fmt(zMv, 2)}`} x={gx0 + 34} y={Y(zMv) - 11} />}
              <Ro text="I, II" x={px - pw / 2 - 30} y={(Y(zPunt) + Y(zPunt - 4 * Deq)) / 2} kleur="#b91c1c" />
              <Ro text="III" x={px - pw / 2 - 28} y={(Y(zPunt) + Y(zPunt + 8 * Deq)) / 2} kleur="#2563eb" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>
          {afdruk ? "" : "Klik op een blauwe maat of de rode kracht om die te wijzigen; GEF-bestanden lees je links in."}
          {!afdruk && <br />}
          De draagkracht, de negatieve kleef en de toets staan in het rekenblad.
        </span>
        <span className="vd-live">
          paalpunt NAP {fmt(zPunt, 2)} · kop NAP {fmt(zKop, 2)} · D<sub>eq</sub> {fmt(Deq * 1000)} mm ·
          {nk ? ` negatieve kleef over ${fmt(zMv - zDraag, 1)} m ·` : " geen negatieve kleef ·"} F<sub>c;d</sub> = {fmt(Fcd)} kN
        </span>
      </div>
    </div>
  );
}
