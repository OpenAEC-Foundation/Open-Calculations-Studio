import { liggerOplossing, liggerStatus } from "@ifc-calc/core";
import { useDesigner, Dim, Force, Ro, Defs, HDim, fmt, clamp, UitkomstKop } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het blad "Ligger van hout of staal"
 * (templates/ligger.ts): de ligger op schaal met de steunpunten, inklemmingen
 * en gerberscharnieren, de lasten per strook (permanent grijs, veranderlijk
 * oranje) en de momentenlijn onder alle lasten samen, karakteristiek.
 *
 * De momentenlijn komt uit dezelfde rekenkern als het blad (liggerOplossing).
 * Bij een constante buigstijfheid hangt het moment niet af van de grootte van
 * EI, dus het beeld rekent met EI = 1 en heeft de doorsnede niet nodig. De
 * combinaties en toetsen staan alleen in het blad; de kop toont de UC en het
 * oordeel van het blad zelf.
 */
const MARKER = "Ligger van hout of staal";

// Een houten vloerbalk op twee steunpunten: C24, 71 × 221, 4 m, vloer en
// gebruikslast in een woning.
const DEFAULTS: Record<string, number> = {
  materiaal: 1, houtklasse: 2, klimaat: 1, b: 71, h: 221, a_opl: 90,
  profiel: 24, staalsoort: 235,
  systeem: 2, L_1: 4, L_2: 4, L_3: 4, a_l: 0, a_r: 0, inklemming: 0,
  scharnieren: 0, x_h1: 0, x_h2: 0, kipsteun: 1, a_kip: 2, aangrijping: 1,
  eg: 1,
  soort_1: 1, vorm_1: 1, q_1: 0.9, q_1_e: 0.9, F_1: 0, a_1: 0, b_1: 4,
  soort_2: 2, vorm_2: 1, cat_2: 1, q_2: 1.05, q_2_e: 1.05, F_2: 0, a_2: 0, b_2: 4,
  soort_3: 0, soort_4: 0, soort_5: 0, soort_6: 0,
  toepassing: 2, uiterlijk: 1,
};

const SYSTEMEN = [
  { v: 2, label: "Twee steunpunten" },
  { v: 3, label: "Drie steunpunten" },
  { v: 4, label: "Vier steunpunten" },
  { v: 1, label: "Uitkraging" },
];
const INKLEMMING = [
  { v: 0, label: "Geen" }, { v: 1, label: "Links" }, { v: 2, label: "Rechts" }, { v: 3, label: "Beide einden" },
];
const LASTEN = [1, 2, 3, 4, 5, 6];
const PERM = "#475569";
const VAR = "#B45309";

interface Last {
  j: number;
  q: boolean;
  punt: boolean;
  a: number;
  b: number;
  qa: number;
  qb: number;
}

export default function LiggerDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;
  const num = (e: { target: { value: string } }) => parseFloat(e.target.value.replace(",", "."));

  // ── geometrie, zoals het blad hem opbouwt ─────────────────────────────────
  const systeem = clamp(Math.round(d("systeem")), 1, 4);
  const pos = (naam: string) => Math.max(0, d(naam));
  const L = [pos("L_1"), systeem >= 3 ? pos("L_2") : 0, systeem === 4 ? pos("L_3") : 0];
  const al = systeem >= 2 ? pos("a_l") : 0;
  const ar = systeem >= 2 ? pos("a_r") : 0;
  const klem = systeem >= 2 ? Math.round(d("inklemming")) : 0;
  const klemL = klem === 1 || klem === 3;
  const klemR = klem === 2 || klem === 3;
  const steunen: { x: number; klem: boolean }[] = [];
  if (systeem === 1) {
    steunen.push({ x: 0, klem: true });
  } else {
    let x = al;
    for (let i = 0; i < systeem; i++) {
      const eerste = i === 0, laatste = i === systeem - 1;
      steunen.push({ x, klem: (eerste && klemL) || (laatste && klemR) });
      if (i < systeem - 1) x += L[i];
    }
  }
  const xEind = systeem === 1 ? L[0] : steunen[steunen.length - 1].x + ar;
  const nScharnier = clamp(Math.round(d("scharnieren")), 0, 2);
  const scharnieren = [d("x_h1"), d("x_h2")].slice(0, nScharnier).filter((x) => x > 0 && x < xEind);

  // ── lasten ────────────────────────────────────────────────────────────────
  const lasten: Last[] = [];
  for (const j of LASTEN) {
    const soort = Math.round(d(`soort_${j}`));
    if (soort < 1) continue;
    const vorm = clamp(Math.round(d(`vorm_${j}`)), 1, 4);
    const punt = vorm === 4;
    const a = vorm === 1 ? 0 : d(`a_${j}`);
    const b = vorm === 1 ? xEind : punt ? a : d(`b_${j}`);
    const qa = punt ? d(`F_${j}`) : d(`q_${j}`);
    const qb = punt ? 0 : vorm === 3 ? d(`q_${j}_e`) : qa;
    lasten.push({ j, q: soort === 2, punt, a, b, qa, qb });
  }

  // ── momentenlijn: karakteristiek, alle lasten samen, EI = 1 ──────────────
  const geo = [[0, 0], ...steunen.map((s) => [s.x, s.klem ? 2 : 1]), [xEind, 0], ...scharnieren.map((x) => [x, 3])];
  const lastMatrix = lasten.map((l) => [l.punt ? 2 : 1, l.a, l.b, l.qa, l.qb]);
  const status = xEind > 0 ? liggerStatus(geo, 1) : 0;
  const lijn = status === 1 && lastMatrix.length ? liggerOplossing(geo, lastMatrix, 1) : [];
  const Mmax = Math.max(0, ...lijn.map((r) => r[2]));
  const Mmin = Math.min(0, ...lijn.map((r) => r[2]));

  // ── layout ────────────────────────────────────────────────────────────────
  const W = box.w;
  const mL = clamp(W * 0.07, 34, 60), mR = clamp(W * 0.07, 34, 60);
  const sx = (W - mL - mR) / Math.max(0.001, xEind);
  const X = (x: number) => mL + clamp(x, 0, xEind) * sx;
  const band = 20;
  const yLig = 30 + band * Math.max(1, lasten.length);
  const yMaat = yLig + 44;
  const mHoog = clamp(box.h - yMaat - 120, 80, 200);
  const mS = mHoog / Math.max(1e-9, Mmax - Mmin);
  const yM = yMaat + 50 + -Mmin * mS;
  const H = yM + Mmax * mS + 40;
  const velden = [0, ...steunen.map((s) => s.x), xEind].filter((x, i, r) => i === 0 || x - r[i - 1] > 1e-9);
  const maatNaam = (x0: number, x1: number): string | null => {
    // Welk invoerveld hoort bij de maat van x0 tot x1: een overstek of een veld.
    if (systeem === 1) return "L_1";
    if (x1 <= al + 1e-9) return "a_l";
    if (x0 >= steunen[steunen.length - 1].x - 1e-9) return "a_r";
    const i = steunen.findIndex((s) => Math.abs(s.x - x0) < 1e-9);
    return i >= 0 && i < 3 ? `L_${i + 1}` : null;
  };
  const punten = lijn.map((r) => `${X(r[0]).toFixed(1)},${(yM + r[2] * mS).toFixed(1)}`).join(" ");

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — ligger" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Ligger</span>
          <label>Materiaal
            <select value={Math.round(d("materiaal"))} onChange={(e) => set("materiaal", parseInt(e.target.value))}>
              <option value={1}>Hout</option>
              <option value={2}>Staal</option>
            </select>
          </label>
          <label>Systeem
            <select value={systeem} onChange={(e) => set("systeem", parseInt(e.target.value))}>
              {SYSTEMEN.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          {systeem >= 2 && (
            <label>Inklemming
              <select value={klem} onChange={(e) => set("inklemming", parseInt(e.target.value))}>
                {INKLEMMING.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </label>
          )}
          <label>Gerberscharnieren
            <select value={nScharnier} onChange={(e) => set("scharnieren", parseInt(e.target.value))}>
              <option value={0}>Geen</option>
              <option value={1}>Eén</option>
              <option value={2}>Twee</option>
            </select>
          </label>
          {nScharnier >= 1 && (
            <label>Scharnier 1, x (m)
              <input type="number" step={0.1} value={d("x_h1")} onChange={(e) => set("x_h1", num(e))} />
            </label>
          )}
          {nScharnier >= 2 && (
            <label>Scharnier 2, x (m)
              <input type="number" step={0.1} value={d("x_h2")} onChange={(e) => set("x_h2", num(e))} />
            </label>
          )}
          <span className="gd-note">De lasten, de doorsnede en de toetsen staan in het rekenblad; posities vanaf het linkereind.</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Aanzicht met de karakteristieke lasten en de momentenlijn (G + Q, alle lasten)</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                <Defs k="lg" />
                {/* lasten, elk een eigen strook boven de ligger */}
                {lasten.map((l, i) => {
                  const kleur = l.q ? VAR : PERM;
                  const yb = 24 + band * (i + 1);
                  if (l.punt) {
                    return (
                      <g key={l.j}>
                        <line x1={X(l.a)} y1={yb - 14} x2={X(l.a)} y2={yLig - 9} stroke={kleur} strokeWidth={1.8} />
                        <polygon points={`${X(l.a)},${yLig - 3} ${X(l.a) - 5},${yLig - 12} ${X(l.a) + 5},${yLig - 12}`} fill={kleur} />
                      </g>
                    );
                  }
                  const qm = Math.max(1e-9, Math.abs(l.qa), Math.abs(l.qb));
                  const h0 = (13 * l.qa) / qm, h1 = (13 * l.qb) / qm;
                  return (
                    <polygon key={l.j} points={`${X(l.a)},${yb} ${X(l.a)},${yb - h0} ${X(l.b)},${yb - h1} ${X(l.b)},${yb}`}
                      fill={kleur} fillOpacity={0.22} stroke={kleur} strokeWidth={1.1} />
                  );
                })}
                {/* de ligger */}
                <rect x={X(0)} y={yLig - 4} width={X(xEind) - X(0)} height={8} fill="#d1d5db" stroke="#374151" strokeWidth={1.2} />
                {steunen.map((s, i) => s.klem ? (
                  <rect key={i} x={X(s.x) - 5} y={yLig - 18} width={10} height={36} fill="#9ca3af" stroke="#374151" strokeWidth={1} />
                ) : (
                  <polygon key={i} points={`${X(s.x)},${yLig + 4} ${X(s.x) - 9},${yLig + 20} ${X(s.x) + 9},${yLig + 20}`}
                    fill="#fbbf24" stroke="#92400e" strokeWidth={1.2} />
                ))}
                {scharnieren.map((x, i) => (
                  <circle key={i} cx={X(x)} cy={yLig} r={5} fill="#ffffff" stroke="#374151" strokeWidth={1.6} />
                ))}
                {/* maatlijn per veld en overstek */}
                {velden.slice(1).map((x1, i) => (
                  <HDim key={i} k="lg" x0={X(velden[i])} x1={X(x1)} y={yMaat} ext={yLig + 22} />
                ))}
                {/* momentenlijn aan de trekzijde */}
                {lijn.length > 0 && (
                  <>
                    <polygon points={`${X(0)},${yM} ${punten} ${X(xEind)},${yM}`} fill="rgba(239,68,68,0.18)" stroke="#dc2626" strokeWidth={1.8} strokeLinejoin="round" />
                    <line x1={X(0) - 8} y1={yM} x2={X(xEind) + 8} y2={yM} stroke="#374151" strokeWidth={1} />
                  </>
                )}
              </svg>

              {lasten.map((l, i) => (
                <Force key={l.j} ctx={ctx} name={l.punt ? `F_${l.j}` : `q_${l.j}`} value={l.qa}
                  x={Math.min(W - 110, Math.max(4, X(l.punt ? l.a : (l.a + l.b) / 2) + 8))} y={24 + band * (i + 1) - 12}
                  unit={l.punt ? "kN" : "kN/m"} label={`${l.q ? "Q" : "G"}${l.j}`} step={0.1} dec={2} />
              ))}
              {velden.slice(1).map((x1, i) => {
                const naam = maatNaam(velden[i], x1);
                const midden = (X(velden[i]) + X(x1)) / 2;
                return naam ? (
                  <Dim key={i} ctx={ctx} name={naam} value={d(naam)} x={midden} y={yMaat} step={0.1} dec={2}
                    label={naam === "a_l" || naam === "a_r" ? "a" : `L${naam.slice(2)}`} />
                ) : (
                  <Ro key={i} text={`${fmt(x1 - velden[i], 2)} m`} x={midden} y={yMaat} />
                );
              })}
              {lijn.length > 0 && Mmax > 1e-6 && (
                <Ro text={`${fmt(Mmax, 2)} kNm`} x={X(lijn.find((r) => r[2] === Mmax)?.[0] ?? 0)} y={yM + Mmax * mS + 8} kleur="#dc2626" />
              )}
              {lijn.length > 0 && Mmin < -1e-6 && (
                <Ro text={`${fmt(Mmin, 2)} kNm`} x={X(lijn.find((r) => r[2] === Mmin)?.[0] ?? 0)} y={yM + Mmin * mS - 22} kleur="#dc2626" />
              )}
              {status === -1 && <Ro text="beweeglijk: te weinig steunpunten of een scharnier te veel" x={W / 2} y={yM} kleur="#b91c1c" />}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of een last om die te wijzigen — stroomt direct terug in het rekenblad.
          <br />De combinaties, de omhullende en de toetsen staan in het rekenblad.</span>
        <span className="vd-live">
          {SYSTEMEN.find((o) => o.v === systeem)?.label ?? ""} · lengte {fmt(xEind, 2)} m · {lasten.length} {lasten.length === 1 ? "last" : "lasten"}
          {scharnieren.length ? ` · ${scharnieren.length} scharnier${scharnieren.length > 1 ? "en" : ""}` : ""}
        </span>
      </div>
    </div>
  );
}
