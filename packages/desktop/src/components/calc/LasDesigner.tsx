import type { ReactNode } from "react";
import { useDesigner, Force, Dim, Ro, Defs, loadMark, fmt, clamp, UitkomstKop } from "./designerKit";
import { useBladUitkomst, ucTekst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld van een lasverbinding onder zes belastingcomponenten.
 *
 * Drie lasfiguren, gelijk aan het blad (templates/lasberekening.ts): een
 * dubbele hoeklas langs een plaat, een volledig doorgelaste stompe las en een
 * rondgaande hoeklas om een rechthoek L × b. Het aangesloten deel staat op het
 * aansluitvlak. De assen liggen in het zwaartepunt van de lasfiguur en vormen
 * een rechtsdraaiend stelsel: x loodrecht op het aansluitvlak (omhoog), y dwars
 * op de las (naar de kijker toe) en z langs de las (naar rechts). Een
 * belastingcomponent verschijnt alleen als hij ongelijk aan nul is, in de
 * richting van zijn teken; een moment als boog volgens de rechterhandregel.
 *
 * Schuine projectie: z naar rechts, x omhoog, y schuin naar linksonder. Het
 * keeldetail toont de doorsnede dwars op de las, met het keelvlak gestippeld.
 *
 * Het beeld rekent niet zelf: de UC's en het oordeel komen uit het blad.
 */
const MARKER = "Lasberekening";

const STAAL = [{ v: 235, label: "S235" }, { v: 275, label: "S275" }, { v: 355, label: "S355" }];

const DEFAULTS: Record<string, number> = {
  staalsoort: 235, dikte: 40, typelas: 1, methode: 1, langeverb: 0,
  L_las: 200, b_las: 120, t_plaat: 10, a_las: 6,
  F_xEd: 20, F_yEd: 0, F_zEd: 100, M_xEd: 0, M_yEd: 10, M_zEd: 0,
};

/** De invoer van de zes componenten, met de richting in woorden. */
const COMPONENTEN = [
  { naam: "F_xEd", sym: "F", as: "x", eh: "kN", uitleg: "loodrecht op het aansluitvlak" },
  { naam: "F_yEd", sym: "F", as: "y", eh: "kN", uitleg: "dwars op de las" },
  { naam: "F_zEd", sym: "F", as: "z", eh: "kN", uitleg: "langs de las" },
  { naam: "M_xEd", sym: "M", as: "x", eh: "kNm", uitleg: "wringing in het aansluitvlak" },
  { naam: "M_yEd", sym: "M", as: "y", eh: "kNm", uitleg: "buiging in het vlak van de plaat" },
  { naam: "M_zEd", sym: "M", as: "z", eh: "kNm", uitleg: "buiging om de lasas" },
] as const;

const ROOD = "#dc2626", PAARS = "#7c3aed", BLAUW = "#1e40af";

/** Een keuzelijst onder zijn label, over de volle breedte van de kolom. */
const LANG = { width: "100%", flex: "0 0 auto", marginLeft: 0 } as const;

export default function LasDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;

  const fy = Math.round(d("staalsoort"));
  const dikte = Math.round(d("dikte"));
  const type = Math.round(d("typelas"));        // 1 dubbele hoeklas, 2 stompe las, 3 rondgaand
  const methode = Math.round(d("methode"));     // 1 richtingsmethode, 2 vereenvoudigd
  const lang = Math.round(d("langeverb"));
  const hoeklas = type !== 2;
  const L = Math.max(1, d("L_las"));
  const t = Math.max(1, d("t_plaat"));
  const b = Math.max(1, d("b_las"));
  const a = Math.max(0.5, d("a_las"));
  const breed = type === 3 ? b : t;             // maat dwars op de las
  const Fx = d("F_xEd"), Fy = d("F_yEd"), Fz = d("F_zEd");
  const Mx = d("M_xEd"), My = d("M_yEd"), Mz = d("M_zEd");
  const belast = Fx || Fy || Fz || Mx || My || Mz;

  // ── uitkomsten: uit het doorgerekende blad ──────────────────────────────────
  const g = uitkomst?.getallen ?? {};
  const toetsen: { label: ReactNode; naam: string }[] = type === 2
    ? [{ label: <>plaat, (6.1)</>, naam: "UC_s" }]
    : methode === 1
      ? [
          { label: type === 3 ? <>(4.1), lassen over L</> : <>(4.1)</>, naam: "UC_41" },
          ...(type === 3 ? [{ label: <>(4.1), lassen over b</>, naam: "UC_41_b" }] : []),
          { label: <>σ<sub>⊥</sub> ≤ 0,9·f<sub>u</sub>/γ<sub>M2</sub></>, naam: "UC_σ" },
        ]
      : [{ label: <>F<sub>w,Ed</sub>/F<sub>w,Rd</sub> (4.2)</>, naam: "UC_w" }];
  const ucKleur = (u: number) => (u > 1 ? "#b91c1c" : u > 0.9 ? "#b45309" : "#047857");

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(220, box.h - 2 * capH - gap);
  const IH = totH * 0.64, KH = totH - IH;       // schuin aanzicht / keeldetail

  // Schuine projectie in mm: z naar rechts, x omhoog, y naar de kijker (linksonder).
  const dep = 0.5, ang = -0.55;
  const cy = dep * Math.cos(ang), sy = -dep * Math.sin(ang);   // beide > 0
  const Hv = 0.42 * L;                          // zichtbare hoogte van het aangesloten deel
  const m = 0.12 * L;                           // aansluitvlak voorbij de las, langs z
  const Dv = Math.max(breed / 2 + 0.15 * L, 0.25 * L);
  // Ruimte voor de pijlen en chipjes buiten het deel: links en rechts ~55 px, boven en onder ~45 px.
  const s = clamp(Math.min((W - 110) / (L + 2 * m + 2 * Dv * cy), (IH - 90) / (Hv + 2 * Dv * sy)), 0.05, 3);
  const tv = Math.max(breed, 3 / s);            // minstens 3 px dik
  const gl = Math.max(a * Math.SQRT2, 3 / s);   // beenlengte van de hoeklas, minstens 3 px
  const ox = W / 2 + 10;
  const oy = IH / 2 + ((Hv - Dv * sy) * s) / 2 + 12;
  const P = (x: number, y: number, z: number): [number, number] => [
    ox + z * s - y * cy * s,
    oy - x * s + y * sy * s,
  ];
  const pts = (...ps: [number, number, number][]) =>
    ps.map((p) => P(...p).map((v) => v.toFixed(1)).join(",")).join(" ");

  const zL = -L / 2, zR = L / 2, yF = tv / 2, yA = -tv / 2;   // voor- en achterkant
  const O = P(0, 0, 0);

  // Pijlen vanuit het zwaartepunt, tot net buiten het deel en het aansluitvlak.
  const RICHTING: Record<string, [number, number]> = { x: [0, -1], y: [-cy / dep, sy / dep], z: [1, 0] };
  const LENGTE: Record<string, number> = {
    x: Hv * s + 30,
    y: Dv * dep * s + 18,
    z: (L / 2 + m) * s + 16,
  };
  const langs = (as: string, f: number): [number, number] => {
    const [ux, uy] = RICHTING[as];
    return [O[0] + ux * f, O[1] + uy * f];
  };
  /**
   * Een moment als boog van 290° rond zijn as, vlak voor de punt, volgens de
   * rechterhandregel: gezien vanaf de punt van de as draait een positief moment
   * linksom. Op het scherm (y naar beneden) is linksom sweep-flag 0.
   */
  const boog = (as: string, v: number) => {
    const c = langs(as, LENGTE[as] - 16);
    const [rx, ry] = as === "x" ? [15, 6] : as === "z" ? [6, 14] : [11, 11];
    const a0 = (-60 * Math.PI) / 180, a1 = a0 + ((v >= 0 ? -1 : 1) * 290 * Math.PI) / 180;
    const p0 = [c[0] + rx * Math.cos(a0), c[1] + ry * Math.sin(a0)];
    const p1 = [c[0] + rx * Math.cos(a1), c[1] + ry * Math.sin(a1)];
    return `M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${rx} ${ry} 0 1 ${v >= 0 ? 0 : 1} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
  };
  /** Chipjes per as naast de punt: de kracht bovenaan, het moment eronder. */
  const CHIP: Record<string, [number, number]> = { x: [44, 0], y: [-42, 10], z: [-8, -16] };
  const chip = (as: string, sym: "F" | "M", v: number): [number, number] => {
    const [px, py] = sym === "F" ? langs(as, (Math.sign(v) || 1) * LENGTE[as]) : langs(as, LENGTE[as]);
    // Een negatieve dwarskracht wijst van de kijker af, over het deel: chipje aan de andere kant.
    const [dx, dy] = sym === "F" && v < 0 && as === "y" ? [46, -20] : CHIP[as];
    const onder = sym === "M" ? (as === "z" ? 36 : 19) : 0;
    return [clamp(px + dx, 40, W - 40), py + dy + onder];
  };

  /** Per component: de pijl of boog en de plek van het chipje. */
  const komp = COMPONENTEN.map((k) => {
    const v = d(k.naam);
    const [lx, ly] = chip(k.as, k.sym, v);
    if (k.sym === "F") {
      const e = langs(k.as, (Math.sign(v) || 1) * LENGTE[k.as]);
      return { ...k, v, lx, ly,
        el: <line x1={O[0]} y1={O[1]} x2={e[0]} y2={e[1]} stroke={ROOD} strokeWidth={2.6} markerEnd={loadMark("li")} /> };
    }
    return { ...k, v, lx, ly,
      el: <path d={boog(k.as, v)} fill="none" stroke={PAARS} strokeWidth={2.1} markerEnd="url(#lasMom)" /> };
  });

  // Het aangesloten deel: voorvlak, bovenvlak en rechterzijvlak.
  const voor = pts([0, yF, zL], [0, yF, zR], [Hv, yF, zR], [Hv, yF, zL]);
  const boven = pts([Hv, yF, zL], [Hv, yF, zR], [Hv, yA, zR], [Hv, yA, zL]);
  const zij = pts([0, yF, zR], [0, yA, zR], [Hv, yA, zR], [Hv, yF, zR]);
  const wand = clamp(0.07 * Math.min(L, b), 3 / s, 0.3 * Math.min(L, b));   // alleen voor het beeld
  const binnen = pts([Hv, yF - wand, zL + wand], [Hv, yF - wand, zR - wand], [Hv, yA + wand, zR - wand], [Hv, yA + wand, zL + wand]);
  const vlak = pts([0, Dv, -L / 2 - m], [0, Dv, L / 2 + m], [0, -Dv, L / 2 + m], [0, -Dv, -L / 2 - m]);

  // Hoeklassen: het schuine lasvlak langs de voet, en de eindjes die zichtbaar zijn.
  const lasVoor = pts([0, yF + gl, zL], [0, yF + gl, zR], [gl, yF, zR], [gl, yF, zL]);
  const lasAchter = pts([0, yA - gl, zL], [0, yA - gl, zR], [gl, yA, zR], [gl, yA, zL]);
  const eindVoor = pts([0, yF, zR], [0, yF + gl, zR], [gl, yF, zR]);
  const eindAchter = pts([0, yA, zR], [0, yA - gl, zR], [gl, yA, zR]);
  const lasRechts = pts([0, yF, zR + gl], [0, yA, zR + gl], [gl, yA, zR], [gl, yF, zR]);
  const lasLinks = pts([0, yF, zL - gl], [0, yA, zL - gl], [gl, yA, zL], [gl, yF, zL]);
  const hStomp = Math.min(0.14 * Hv, Math.max(tv * 1.2, 6 / s));
  const stompVoor = pts([0, yF, zL], [0, yF, zR], [hStomp, yF, zR], [hStomp, yF, zL]);
  const stompZij = pts([0, yF, zR], [0, yA, zR], [hStomp, yA, zR], [hStomp, yF, zR]);

  // Assen, gestippeld vanuit het zwaartepunt tot net voorbij de pijlpunten.
  const assen = (["x", "y", "z"] as const).map((as) => ({ as, eind: langs(as, LENGTE[as] + 10) }));

  // ── keeldetail: doorsnede dwars op de las ──────────────────────────────────
  const glMm = a * Math.SQRT2;                  // beenlengte van de hoeklas
  const detMm = type === 3 ? b + 4 * glMm + 20 : breed + 6 * glMm + 20;
  const kS = clamp(Math.min((W * 0.6) / detMm, (KH - 60) / (3 * glMm)), 0.3, 12);
  const kx = W / 2, ky = KH - 34;
  const tvK = Math.max(breed * kS, 4);
  const wandK = type === 3 ? Math.max(4, Math.min(12, 0.06 * b * kS)) : tvK;   // wanddikte in beeld
  const glK = Math.max(glMm * kS, 6);
  const basisK = clamp(glK * 0.9, 6, 10);                                  // dikte van het deel eronder
  const hK = Math.max(20, Math.min(KH - 58, Math.max(glK * 3.2, 40)));
  const halfK = type === 3 ? (b * kS) / 2 : tvK / 2;                          // tot de buitenkant

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — lasberekening" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Las</span>
          <label style={{ flexDirection: "column", alignItems: "stretch" }}>Lasfiguur
            <select style={LANG} value={type} onChange={(e) => set("typelas", parseInt(e.target.value))}>
              <option value={1}>Dubbele hoeklas langs een plaat</option>
              <option value={2}>Stompe las, volledig doorgelast</option>
              <option value={3}>Rondgaande hoeklas om L × b</option>
            </select>
          </label>
          <label>Staalsoort
            <select value={fy} onChange={(e) => set("staalsoort", parseInt(e.target.value))}>
              {STAAL.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label title="f_u (hoeklas) en f_y (stompe las) volgens tabel 3.1 van EN 1993-1-1 hangen af van de dikte van het dikste verbonden deel">Dikste deel
            <select value={dikte} onChange={(e) => set("dikte", parseInt(e.target.value))}>
              <option value={40}>t ≤ 40 mm</option>
              <option value={80}>40–80 mm</option>
            </select>
          </label>
          {hoeklas && (
            <>
              <label style={{ flexDirection: "column", alignItems: "stretch" }}>Toets
                <select style={LANG} value={methode} onChange={(e) => set("methode", parseInt(e.target.value))}>
                  <option value={1}>Richtingsmethode §4.5.3.2</option>
                  <option value={2}>Vereenvoudigde methode §4.5.3.3</option>
                </select>
              </label>
              <label style={{ flexDirection: "column", alignItems: "stretch" }}
                title="Bij lange lassen wordt de weerstand gereduceerd met β_Lw (EN 1993-1-8 §4.11)">Lange verbinding
                <select style={LANG} value={lang} onChange={(e) => set("langeverb", parseInt(e.target.value))}>
                  <option value={0}>niet van toepassing</option>
                  <option value={1}>overlapverbinding β_Lw,1</option>
                  <option value={2}>dwarsverstijving plaatligger β_Lw,2</option>
                </select>
              </label>
            </>
          )}
          <label>Lengte L (mm)
            <input type="number" step={10} value={L} onChange={(e) => set("L_las", parseFloat(e.target.value))} />
          </label>
          {type === 3 ? (
            <label>Breedte b (mm)
              <input type="number" step={10} value={b} onChange={(e) => set("b_las", parseFloat(e.target.value))} />
            </label>
          ) : (
            <label>Plaatdikte t<sub>p</sub> (mm)
              <input type="number" step={1} value={t} onChange={(e) => set("t_plaat", parseFloat(e.target.value))} />
            </label>
          )}
          {hoeklas && (
            <label>Keeldikte a (mm)
              <input type="number" step={1} min={1} value={a} onChange={(e) => set("a_las", parseFloat(e.target.value))} />
            </label>
          )}
          {hoeklas && g.A_w !== undefined && (
            <span className="gd-note">
              {type === 1 && <>l<sub>eff</sub> = {fmt(g.l_eff ?? 0)} mm per las · </>}
              A<sub>w</sub> = {fmt(g.A_w)} mm²
              {g.β_Lw !== undefined && <> · β<sub>Lw</sub> = {fmt(g.β_Lw, 3)}</>}
            </span>
          )}

          <span className="vd-ctrl-h">Belasting in het zwaartepunt</span>
          {COMPONENTEN.map((k) => (
            <label key={k.naam} title={k.uitleg}>{k.sym}<sub>{k.as},Ed</sub> ({k.eh})
              <input type="number" step={k.sym === "F" ? 10 : 1} value={d(k.naam)} onChange={(e) => set(k.naam, parseFloat(e.target.value))} />
            </label>
          ))}
          <span className="gd-note">x loodrecht op het aansluitvlak, y dwars op en z langs de las. Het teken maakt voor de toets niet uit.</span>

          {belast !== 0 && (
            <>
              <span className="vd-ctrl-h">Toetsen (uit het blad)</span>
              {toetsen.map((k) => (
                <span key={k.naam} className="gd-note" style={{ color: g[k.naam] === undefined ? undefined : ucKleur(g[k.naam]) }}>
                  {k.label}: {g[k.naam] === undefined ? "—" : `UC ${ucTekst(g[k.naam])}`}
                </span>
              ))}
            </>
          )}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Lasfiguur en belasting</div>
            <div className="vd-stage" style={{ width: W, height: IH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={IH} className="vd-svg">
                <Defs k="li" />
                <defs>
                  <marker id="lasMom" markerWidth="10" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M1 1 L8 4.5 L1 8 Z" fill={PAARS} />
                  </marker>
                </defs>
                {/* het aansluitvlak */}
                <polygon points={vlak} fill="#eef2f7" stroke="#94a3b8" strokeWidth={1.1} />
                {/* lassen aan de achterkant: grotendeels achter het deel */}
                {hoeklas && <polygon points={lasAchter} fill={BLAUW} fillOpacity={0.35} stroke={BLAUW} strokeWidth={0.8} />}
                {type === 3 && <polygon points={lasLinks} fill={BLAUW} fillOpacity={0.4} stroke={BLAUW} strokeWidth={0.8} />}
                {/* het aangesloten deel */}
                <polygon points={voor} fill="#dbe7f6" fillOpacity={0.8} stroke={BLAUW} strokeWidth={1.4} />
                <polygon points={zij} fill="#c7d8ef" fillOpacity={0.85} stroke={BLAUW} strokeWidth={1.2} />
                <polygon points={boven} fill="#e8eff9" stroke={BLAUW} strokeWidth={1.2} />
                {type === 3 && <polygon points={binnen} fill="#f8fafc" stroke={BLAUW} strokeWidth={1} />}
                {/* de lassen */}
                {hoeklas && (
                  <>
                    <polygon points={lasVoor} fill={BLAUW} fillOpacity={0.55} stroke={BLAUW} strokeWidth={1} />
                    {type === 1 && <polygon points={eindAchter} fill={BLAUW} fillOpacity={0.55} stroke={BLAUW} strokeWidth={0.8} />}
                    {type === 1 && <polygon points={eindVoor} fill={BLAUW} fillOpacity={0.7} stroke={BLAUW} strokeWidth={0.8} />}
                    {type === 3 && <polygon points={lasRechts} fill={BLAUW} fillOpacity={0.45} stroke={BLAUW} strokeWidth={1} />}
                  </>
                )}
                {type === 2 && (
                  <>
                    <polygon points={stompVoor} fill="#f59e0b" fillOpacity={0.55} stroke="#b45309" strokeWidth={1} />
                    <polygon points={stompZij} fill="#f59e0b" fillOpacity={0.45} stroke="#b45309" strokeWidth={1} />
                  </>
                )}
                {/* assen */}
                {assen.map(({ as, eind }) => (
                  <g key={as}>
                    <line x1={O[0]} y1={O[1]} x2={eind[0]} y2={eind[1]} stroke="#475569" strokeWidth={0.9} strokeDasharray="6 3" />
                    <text x={eind[0] + (as === "y" ? -12 : 5)} y={eind[1] + (as === "x" ? -4 : as === "y" ? 12 : 4)}
                      style={{ fontSize: 12, fill: "#334155", fontWeight: 700, fontStyle: "italic" }}>{as}</text>
                  </g>
                ))}
                <circle cx={O[0]} cy={O[1]} r={2.8} fill="#334155" />
                {/* alleen de componenten die belasten */}
                {komp.map((k) => k.v !== 0 && <g key={k.naam}>{k.el}</g>)}
              </svg>

              {komp.map((k) => k.v !== 0 && (
                <Force key={k.naam} ctx={ctx} name={k.naam} value={k.v} x={k.lx} y={k.ly}
                  unit={k.eh} label={`${k.sym}${k.as}`} step={k.sym === "F" ? 10 : 1} />
              ))}
              <Dim ctx={ctx} name="L_las" value={L} label="L" x={P(0, Dv, L / 4)[0]} y={P(0, Dv, L / 4)[1] + 11} />
              {type === 3
                ? <Dim ctx={ctx} name="b_las" value={b} label="b" x={P(Hv, 0, zL)[0] - 26} y={P(Hv, 0, zL)[1] - 2} />
                : <Dim ctx={ctx} name="t_plaat" value={t} label="tp" x={P(Hv, 0, zL)[0] - 28} y={P(Hv, 0, zL)[1] - 2} />}
              {hoeklas && <Ro text={`a = ${fmt(a)}`} x={P(0, yF + gl, zL)[0] - 24} y={P(0, yF + gl, zL)[1] + 2} title="keeldikte" />}
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Keeldetail dwars op de las</div>
            <div className="vd-stage" style={{ width: W, height: KH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={KH} className="vd-svg">
                {/* het deel met het aansluitvlak */}
                <rect x={kx - halfK - glK * 2.4} y={ky} width={2 * halfK + glK * 4.8} height={basisK}
                  fill="#eef2f7" stroke="#374151" strokeWidth={1.2} />
                {/* het aangesloten deel: plaat of twee kokerwanden */}
                {type === 3 ? (
                  [-1, 1].map((zijde) => (
                    <rect key={zijde} x={zijde < 0 ? kx - halfK : kx + halfK - wandK} y={ky - hK} width={wandK} height={hK}
                      fill="#dbe7f6" stroke="#374151" strokeWidth={1.2} />
                  ))
                ) : (
                  <rect x={kx - halfK} y={ky - hK} width={2 * halfK} height={hK} fill="#dbe7f6" stroke="#374151" strokeWidth={1.2} />
                )}
                {hoeklas ? (
                  [-1, 1].map((zijde) => {
                    const xw = kx + zijde * halfK;                // laswortel
                    return (
                      <g key={zijde}>
                        <path d={`M ${xw} ${ky} L ${xw} ${ky - glK} L ${xw + zijde * glK} ${ky} Z`}
                          fill={BLAUW} fillOpacity={0.45} stroke={BLAUW} strokeWidth={1.2} />
                        {/* keelvlak: van de wortel loodrecht op het lasoppervlak */}
                        <line x1={xw} y1={ky} x2={xw + (zijde * glK) / 2} y2={ky - glK / 2}
                          stroke={ROOD} strokeWidth={1.3} strokeDasharray="4 2" />
                      </g>
                    );
                  })
                ) : (
                  <path d={`M ${kx - halfK} ${ky} L ${kx - halfK} ${ky - Math.min(hK * 0.3, 18)} L ${kx} ${ky - 3} L ${kx + halfK} ${ky - Math.min(hK * 0.3, 18)} L ${kx + halfK} ${ky} Z`}
                    fill="#f59e0b" fillOpacity={0.5} stroke="#b45309" strokeWidth={1.1} />
                )}
                <text x={kx} y={ky + basisK + 15} textAnchor="middle" style={{ fontSize: 11, fill: hoeklas ? BLAUW : "#b45309" }}>
                  {hoeklas
                    ? <><tspan style={{ fill: ROOD, fontWeight: 700 }}>keelvlak a = {fmt(a)}</tspan> · wortels op {type === 3 ? `b = ${fmt(b)}` : `tp = ${fmt(t)}`} mm</>
                    : <>volledig doorgelast: toets van de plaat, tp = {fmt(t)} mm</>}
                </text>
                {/* assen in de doorsnede: y naar rechts (naar de kijker in het schuine aanzicht), x omhoog */}
                <line x1={kx} y1={ky} x2={kx} y2={ky - hK - 8} stroke="#475569" strokeWidth={0.8} strokeDasharray="6 3" />
                <text x={kx + 4} y={ky - hK - 10} style={{ fontSize: 11, fill: "#334155", fontStyle: "italic", fontWeight: 700 }}>x</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een belasting of een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />Assen in het zwaartepunt van de lasfiguur (rechtsdraaiend): x loodrecht op het aansluitvlak, y dwars op de las, z langs de las.
          Alleen componenten ongelijk aan nul worden getekend.</span>
        <span className="vd-live">
          S{fy} · {type === 1 ? "dubbele hoeklas" : type === 2 ? "stompe las" : "rondgaande hoeklas"} · L = {fmt(L)} mm ·
          {type === 3 ? ` b = ${fmt(b)} mm` : ` tp = ${fmt(t)} mm`}{hoeklas && ` · a = ${fmt(a)} mm`}
          {hoeklas && (lang === 0 ? " · geen β_Lw" : lang === 1 ? " · β_Lw,1" : " · β_Lw,2")} ·
          F = ({fmt(Fx)}; {fmt(Fy)}; {fmt(Fz)}) kN · M = ({fmt(Mx)}; {fmt(My)}; {fmt(Mz)}) kNm
        </span>
      </div>
    </div>
  );
}
