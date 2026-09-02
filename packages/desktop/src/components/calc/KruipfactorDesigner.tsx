import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Parametrisch beeld van de kruipcoëfficiënt (NEN-EN 1992-1-1 bijlage B).
 *
 * De de referentie-uitwerking-module heeft geen tekening — alleen invoer en één uitkomst. In
 * plaats van een doorsnede toont dit paneel waar dat getal vandaan komt:
 *   • links het invoerscherm, één op één met de referentie-uitwerking;
 *   • rechtsboven de opbouw φ₀ = φ_RH · β(f_cm) · β(t₀) als staafjes, zodat je
 *     ziet welke factor de kruip stuurt;
 *   • rechtsonder het verloop φ(t;t₀) op een logaritmische tijdas, met φ₀ als
 *     asymptoot en een klikbare marker op het gekozen t.
 *
 * De rekenregels zijn dezelfde als in templates/kruipfactor.ts, gecalibreerd op
 * de de referentie-uitwerking-referentie C45/55 · N · RH 50 % · t₀ 28 d · h₀ 300 mm. Het
 * gerapporteerde getal is φ(t;t₀) bij t = 100000 dagen — 1,614 → 1,61 — en niet
 * φ₀ = 1,617, dat op 1,62 zou uitkomen.
 */
const MARKER = "Kruipfactor";

const BETON: { v: number; label: string }[] = [
  { v: 12, label: "C12/15" }, { v: 16, label: "C16/20" }, { v: 20, label: "C20/25" },
  { v: 25, label: "C25/30" }, { v: 30, label: "C30/37" }, { v: 35, label: "C35/45" },
  { v: 40, label: "C40/50" }, { v: 45, label: "C45/55" }, { v: 50, label: "C50/60" },
  { v: 55, label: "C55/67" }, { v: 60, label: "C60/75" }, { v: 70, label: "C70/85" },
  { v: 80, label: "C80/95" }, { v: 90, label: "C90/105" },
];
/** Cementklasse → exponent α uit (B.9). */
const CEMENT: { v: number; label: string; alpha: number }[] = [
  { v: 1, label: "S — langzaam (32,5 N)", alpha: -1 },
  { v: 2, label: "N — normaal (32,5 R; 42,5 N)", alpha: 0 },
  { v: 3, label: "R — snel (42,5 R; 52,5 N/R)", alpha: 1 },
];

/** Eén bron van waarheid voor de invoer — voedt de controls én de gedeelde store. */
// Defaults spiegelen de de referentie-uitwerking-referentie, zodat elk getoond getal tegen een
// referentieblad te leggen is (φ = 1,614 → geprint als 1,61).
const DEFAULTS: Record<string, number> = {
  betonkwaliteit: 45,   // C45/55
  cementklasse: 2,      // N
  RH: 50,               // %
  t_0: 28,              // dagen
  h_0: 300,             // mm
  t: 100000,            // dagen — de aanname van het referentieblad voor t = ∞
};

const T_MAX = 100000;   // dagen — rechterrand van de tijdas, ≈ 274 jaar
// Tijdstippen met een label op de logaritmische as.
const TICKS: { d: number; label: string }[] = [
  { d: 1, label: "1 d" }, { d: 7, label: "1 wk" }, { d: 28, label: "28 d" },
  { d: 90, label: "3 mnd" }, { d: 365, label: "1 jr" }, { d: 1825, label: "5 jr" },
  { d: 3650, label: "10 jr" }, { d: 18250, label: "50 jr" }, { d: 36500, label: "100 jr" },
  { d: 100000, label: "∞" },
];

/** Rekengang van bijlage B — identiek aan templates/kruipfactor.ts. */
function kruip(fck: number, alpha: number, RH: number, t0: number, h0: number) {
  const fcm = fck + 8;
  const a1 = (35 / fcm) ** 0.7, a2 = (35 / fcm) ** 0.2, a3 = (35 / fcm) ** 0.5;
  const droog = (1 - RH / 100) / (0.1 * h0 ** (1 / 3));
  const phiRH = fcm <= 35 ? 1 + droog : (1 + droog * a1) * a2;      // (B.3a/b)
  const bfcm = 16.8 / Math.sqrt(fcm);                               // (B.4)
  const t0cor = Math.max(0.5, t0 * (9 / (2 + t0 ** 1.2) + 1) ** alpha);  // (B.9)
  const bt0 = 1 / (0.1 + t0cor ** 0.2);                             // (B.5)
  const phi0 = phiRH * bfcm * bt0;                                  // (B.2)
  // (B.8a) zonder α_3 bij f_cm ≤ 35, (B.8b) mét α_3 daarboven.
  const aH = fcm <= 35 ? 1 : a3;
  const bH = Math.min(1.5 * (1 + (0.012 * RH) ** 18) * h0 + 250 * aH, 1500 * aH);
  const Ecm = 22000 * (fcm / 10) ** 0.3;                            // (3.14)
  return { fcm, a1, a2, a3, phiRH, bfcm, t0cor, bt0, phi0, bH, Ecm };
}
/** β_c(t;t₀) — (B.7). Gebruikt de wérkelijke ouderdom, niet de (B.9)-correctie. */
const betaC = (t: number, t0: number, bH: number) =>
  t <= t0 ? 0 : ((t - t0) / (bH + t - t0)) ** 0.3;

export default function KruipfactorDesigner() {
  // Invoer hoort bij het exemplaar dat openstaat: twee bladen van dezelfde
  // module delen niets, ook al gebruiken ze dezelfde variabelenamen.
  // Welk blad getekend wordt: normaal het actieve, in de afdruk het blad dat de
  // context aanwijst. `alleenLezen` houdt daar het schrijven tegen.
  const exemplaar = useActiefExemplaar();
  const alleenLezen = useAlleenLezen();
  const activeId = alleenLezen ? "" : (exemplaar?.id ?? "");
  const zetWaarde = useProjectStore((s) => s.zetWaarde);
  const seedWaarden = useProjectStore((s) => s.seedWaarden);
  const source = exemplaar?.source ?? "";
  const zetBladWaarde = useCallback(
    (naam: string, waarde: string) => zetWaarde(activeId, naam, waarde),
    [activeId, zetWaarde],
  );
  const seedBladWaarden = useCallback(
    (defaults: Record<string, string>) => seedWaarden(activeId, defaults),
    [activeId, seedWaarden],
  );
  const [editing, setEditing] = useState<string | null>(null);

  // Meet het beschikbare tekengebied zodat het beeld meegroeit met het paneel.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 620, h: 520 });

  const isKruip = source.includes(MARKER);
  useEffect(() => {
    if (!isKruip) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isKruip, activeId, seedBladWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(220, r.width), h: Math.max(240, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isKruip]);

  if (!isKruip) return null;

  const vals = exemplaar?.waarden ?? {};
  const num = (name: string, def: number): number => {
    const raw = vals[name];
    if (raw === undefined || raw === "") return def;
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };
  const setVal = (name: string, value: number) => zetBladWaarde(name, String(value));
  const d = (name: string) => num(name, DEFAULTS[name]);

  // ── invoer ────────────────────────────────────────────────────────────────
  const fck = Math.round(d("betonkwaliteit"));
  const cem = Math.round(d("cementklasse"));
  const alpha = (CEMENT.find((o) => o.v === cem) ?? CEMENT[1]).alpha;
  // Bijlage B geldt voor 40 % ≤ RH ≤ 100 %, maar buiten dat bereik rekenen de
  // formules gewoon door — en het referentieprogramma laat het toe. Niet
  // stilzwijgend bijknippen dus; alleen waarschuwen.
  const RH = Math.min(100, Math.max(1, d("RH")));
  const rhBuitenBereik = RH < 40;
  const t0 = Math.max(0.5, d("t_0"));
  const h0 = Math.max(1, d("h_0"));
  const t = Math.min(T_MAX, Math.max(t0, d("t")));

  // ── rekenen ───────────────────────────────────────────────────────────────
  const r = kruip(fck, alpha, RH, t0, h0);
  const bc = betaC(t, t0, r.bH);
  const phiT = r.phi0 * bc;
  const EcEff = r.Ecm / (1 + phiT);
  const fmt = (v: number, dec = 2) => v.toFixed(dec).replace(".", ",");

  // ── klikbare chip ─────────────────────────────────────────────────────────
  function Dim(props: { name: string; value: number; x: number; y: number; step?: number; label?: string }) {
    const { name, value, x, y, step = 10, label } = props;
    const isEd = editing === name;
    return (
      <div className="vd-dim" style={{ left: x, top: y }}>
        {isEd ? (
          <input className="vd-dim-input" type="number" step={step} defaultValue={value} autoFocus
            onBlur={(e) => { setVal(name, parseFloat(e.target.value)); setEditing(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setVal(name, parseFloat((e.target as HTMLInputElement).value)); setEditing(null); }
              if (e.key === "Escape") setEditing(null);
            }} />
        ) : (
          <button className="vd-dim-num" style={{ whiteSpace: "nowrap" }} title={`${label ?? name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {label ? `${label}=` : ""}{Number.isInteger(value) ? value : value.toFixed(0)}
          </button>
        )}
      </div>
    );
  }

  // ── layout: opbouw boven, tijdverloop onder ───────────────────────────────
  const capH = 24, gap = 14;
  const W = box.w;
  const totH = Math.max(220, box.h - 2 * capH - gap);
  const BH = Math.max(96, Math.min(150, totH * 0.34));   // hoogte staafjesbeeld
  const CH = totH - BH;                                   // hoogte tijdgrafiek

  // opbouw φ₀ — drie factoren naast elkaar, hoogte naar rato van de waarde
  const bars = [
    { k: "φ_RH", v: r.phiRH, kleur: "#2563eb", uitleg: "vochtigheid + dikte" },
    { k: "β(f_cm)", v: r.bfcm, kleur: "#0d9488", uitleg: "betonsterkte" },
    { k: "β(t₀)", v: r.bt0, kleur: "#b45309", uitleg: "ouderdom bij belasten" },
  ];
  const bMax = Math.max(...bars.map((b) => b.v), 1) * 1.15;
  const bL = 12, bR = 12, bT = 16, bB = 26;
  const bW = (W - bL - bR) / bars.length;

  // tijdgrafiek — logaritmische x-as van t₀ tot 100 jaar
  const cL = 44, cR = 16, cT = 18, cB = 30;
  const cw = Math.max(40, W - cL - cR), ch = Math.max(40, CH - cT - cB);
  const lo = Math.log10(Math.max(0.5, t0)), hi = Math.log10(T_MAX);
  const gx = (dd: number) => cL + ((Math.log10(Math.max(dd, 10 ** lo)) - lo) / (hi - lo)) * cw;
  const yMax = Math.max(r.phi0, 0.1) * 1.12;
  const gy = (v: number) => cT + ch - (v / yMax) * ch;
  const pad = Array.from({ length: 121 }, (_, i) => {
    const dd = 10 ** (lo + ((hi - lo) * i) / 120);
    return `${i === 0 ? "M" : "L"} ${gx(dd).toFixed(1)} ${gy(r.phi0 * betaC(dd, t0, r.bH)).toFixed(1)}`;
  }).join(" ");
  const ticks = TICKS.filter((k) => k.d >= t0 && k.d <= T_MAX);

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — kruipfactor</strong>
        <span className="vd-uc info">φ(t;t<sub>0</sub>) = {fmt(phiT)}</span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "flex-start" }}>
          <span className="vd-ctrl-h">Beton</span>
          <label>Betonkwaliteit
            <select value={fck} onChange={(e) => setVal("betonkwaliteit", parseInt(e.target.value))}>
              {BETON.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label title="Bepaalt de exponent α in (B.9): S = −1, N = 0, R = +1">Cementklasse
            <select value={cem} onChange={(e) => setVal("cementklasse", parseInt(e.target.value))}>
              {CEMENT.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <span className="gd-note">f<sub>cm</sub> = f<sub>ck</sub> + 8 = {fmt(r.fcm, 0)} N/mm² →
            {r.fcm <= 35 ? " (B.3a), geen α-demping" : ` (B.3b) met α₁ = ${fmt(r.a1)} · α₂ = ${fmt(r.a2)}`}</span>

          <span className="vd-ctrl-h">Omgeving en belasten</span>
          <label title="Bijlage B is opgesteld voor 40 % ≤ RH ≤ 100 %; daarbuiten rekenen de formules door">Rel. vochtigheid RH (%)
            <input type="number" step={5} min={1} max={100} value={RH} onChange={(e) => setVal("RH", parseFloat(e.target.value))} />
          </label>
          {rhBuitenBereik && (
            <span className="gd-note" style={{ color: "#b45309" }}>
              RH = {fmt(RH, 0)} % ligt onder de 40 % waarvoor bijlage B is opgesteld. De formules
              rekenen door en het referentieprogramma staat het toe, maar de uitkomst valt buiten
              het geldigheidsgebied.
            </span>
          )}
          <label title="Ouderdom van het beton op het moment dat de blijvende belasting wordt aangebracht">Ouderdom t<sub>0</sub> (dagen)
            <input type="number" step={1} min={1} value={t0} onChange={(e) => setVal("t_0", parseFloat(e.target.value))} />
          </label>
          <label title="Theoretische dikte h₀ = 2·A_c/u, met u de aan uitdroging blootgestelde omtrek">Theor. dikte h<sub>0</sub> (mm)
            <input type="number" step={25} min={1} value={h0} onChange={(e) => setVal("h_0", parseFloat(e.target.value))} />
          </label>
          {alpha !== 0 && (
            <span className="gd-note" style={{ color: "#1d4ed8" }}>
              Cementcorrectie (B.9): t<sub>0</sub> = {fmt(t0, 0)} → {fmt(r.t0cor, 1)} dagen.
              Dit blad past die toe zoals de norm voorschrijft. De referentie-uitwerking rekent hem wél
              uit maar gebruikt hem niet in β(t<sub>0</sub>) en wijkt hier dus af.
            </span>
          )}

          <span className="vd-ctrl-h">Tijdstip</span>
          <label title="Het referentieblad rekent met 100000 dagen (≈ 274 jaar) als eindstadium">Tijdstip t (dagen)
            <input type="number" step={365} min={1} value={t} onChange={(e) => setVal("t", parseFloat(e.target.value))} />
          </label>
          <span className="gd-note">β<sub>H</sub> = {fmt(r.bH, 0)} · β<sub>c</sub> = {fmt(bc, 3)} →
            φ(t;t<sub>0</sub>) = φ<sub>0</sub>·β<sub>c</sub> = {fmt(phiT)}</span>
          <span className="gd-note">E<sub>cm</sub> = {fmt(r.Ecm, 0)} N/mm² · E<sub>c,eff</sub> = E<sub>cm</sub>/(1+φ) = {fmt(EcEff, 0)} N/mm²</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Opbouw — φ = φ<sub>RH</sub> · β(f<sub>cm</sub>) · β(t<sub>0</sub>)</div>
            <div className="vd-stage" style={{ width: W, height: BH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={BH} className="vd-svg">
                {/* referentielijn op 1,0 — factoren erboven vergroten de kruip */}
                <line x1={bL} y1={bT + (BH - bT - bB) * (1 - 1 / bMax)} x2={W - bR} y2={bT + (BH - bT - bB) * (1 - 1 / bMax)}
                  stroke="#9ca3af" strokeWidth={1} strokeDasharray="5 3" />
                {bars.map((b, i) => {
                  const hgt = (b.v / bMax) * (BH - bT - bB);
                  const x = bL + i * bW + bW * 0.22, w = bW * 0.56;
                  return (
                    <g key={b.k}>
                      <rect x={x} y={bT + (BH - bT - bB) - hgt} width={w} height={hgt} fill={b.kleur} opacity={0.82} rx={2} />
                      <text x={x + w / 2} y={bT + (BH - bT - bB) - hgt - 5} textAnchor="middle"
                        style={{ fontSize: 12, fontWeight: 700, fill: b.kleur }}>{fmt(b.v)}</text>
                      <text x={x + w / 2} y={BH - bB + 13} textAnchor="middle" style={{ fontSize: 11, fill: "#374151" }}>{b.k}</text>
                      <text x={x + w / 2} y={BH - bB + 24} textAnchor="middle" style={{ fontSize: 9.5, fill: "#6b7280" }}>{b.uitleg}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="vd-canvas">
            <div className="vd-caption">Verloop φ(t;t<sub>0</sub>) — logaritmische tijdas</div>
            <div className="vd-stage" style={{ width: W, height: CH, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={CH} className="vd-svg">
                {/* assen */}
                <line x1={cL} y1={cT} x2={cL} y2={cT + ch} stroke="#6b7280" strokeWidth={1} />
                <line x1={cL} y1={cT + ch} x2={cL + cw} y2={cT + ch} stroke="#6b7280" strokeWidth={1} />
                {/* eindwaarde φ₀ als asymptoot */}
                <line x1={cL} y1={gy(r.phi0)} x2={cL + cw} y2={gy(r.phi0)} stroke="#dc2626" strokeWidth={1.2} strokeDasharray="6 4" />
                <text x={cL + 6} y={gy(r.phi0) - 5} style={{ fontSize: 11, fontWeight: 700, fill: "#dc2626" }}>φ = {fmt(r.phi0)}</text>
                {/* y-ticks */}
                {[0.25, 0.5, 0.75].map((f) => (
                  <g key={f}>
                    <line x1={cL - 4} y1={gy(r.phi0 * f)} x2={cL + cw} y2={gy(r.phi0 * f)} stroke="#e5e7eb" strokeWidth={1} />
                    <text x={cL - 7} y={gy(r.phi0 * f) + 3.5} textAnchor="end" style={{ fontSize: 9.5, fill: "#9ca3af" }}>{fmt(r.phi0 * f)}</text>
                  </g>
                ))}
                {/* x-ticks */}
                {ticks.map((k) => (
                  <g key={k.d}>
                    <line x1={gx(k.d)} y1={cT + ch} x2={gx(k.d)} y2={cT + ch + 4} stroke="#9ca3af" strokeWidth={1} />
                    <text x={gx(k.d)} y={cT + ch + 15} textAnchor="middle" style={{ fontSize: 9.5, fill: "#6b7280" }}>{k.label}</text>
                  </g>
                ))}
                {/* de kruipkromme */}
                <path d={pad} fill="none" stroke="#2563eb" strokeWidth={2.2} />
                {/* marker op het gekozen tijdstip */}
                <line x1={gx(t)} y1={gy(phiT)} x2={gx(t)} y2={cT + ch} stroke="#2563eb" strokeWidth={1} strokeDasharray="4 3" />
                <circle cx={gx(t)} cy={gy(phiT)} r={4.5} fill="#fff" stroke="#2563eb" strokeWidth={2} />
                <text x={gx(t) - 8} y={gy(phiT) - 8} textAnchor="end" style={{ fontSize: 11, fontWeight: 700, fill: "#2563eb" }}>{fmt(phiT)}</text>
              </svg>

              <Dim name="t" value={t} x={gx(t)} y={cT + ch + 26} step={365} label="t" />
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op het blauwe tijdstip om het te wijzigen — stroomt direct terug in de rekensheet.
          <br />De rode stippellijn is φ<sub>0</sub>; het gerapporteerde getal is de blauwe kromme op tijdstip t.</span>
        <span className="vd-live">
          C{fck} · cement {(CEMENT.find((o) => o.v === cem) ?? CEMENT[1]).label.charAt(0)} · RH = {fmt(RH, 0)} % ·
          t<sub>0</sub> = {fmt(t0, 0)} d · h<sub>0</sub> = {fmt(h0, 0)} mm ·
          φ<sub>RH</sub> = {fmt(r.phiRH)} · β(f<sub>cm</sub>) = {fmt(r.bfcm)} · β(t<sub>0</sub>) = {fmt(r.bt0)} ·
          φ<sub>0</sub> = {fmt(r.phi0)} · β<sub>H</sub> = {fmt(r.bH, 0)} · β<sub>c</sub> = {fmt(bc, 3)} ·
          <b> φ(t;t<sub>0</sub>) = {fmt(phiT)}</b> · E<sub>c,eff</sub> = {fmt(EcEff, 0)} N/mm²
        </span>
      </div>
    </div>
  );
}
