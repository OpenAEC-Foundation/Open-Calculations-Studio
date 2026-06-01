/**
 * Spuwer (noodafvoer) — rechthoekige en ronde spuwer.
 *
 * Formules conform NEN-EN 1991-1-3 + NEN 6702 §7.3:
 *   (7.2)  Q_h   = A · i_r              regenwaterdebiet
 *   (7.4)  d_nd  = 0,7 · (Q_h/(b·n))^(2/3)   waterhoogte bij rechthoekige spuwer
 *   (7.7)  d_nd  = 0,29 · (Q_h/d)^(2/3)      idem bij ronde spuwer
 *   (7.8)  d_hw  = d_nd + h_nd                waterhoogte t.p.v. spuwer
 *   §7.3(3)  h_min = 30 mm + d_nd            minimale spuwerhoogte (verstoppingsmarge)
 *   UC     = h_min / h ≤ 1,0
 *
 * i_r uit Tabel NB.1 (NEN-EN 1991-1-3/NB), default = 0,00005 m³/(s·m²)
 * (overeenkomstig t = 50 jaar referentieperiode).
 */

import { useMemo } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";
import type { WizardDefinition, WizardProps } from "./types";
import "./SpuwerWizard.css";

import type { WizardInputSpec } from "./types";

const INPUTS: readonly WizardInputSpec[] = [
  { name: "A",   label: "Afvoergebied A",                 unit: "m²", default: 500,    step: 1 },
  { name: "n",   label: "Aantal spuwers n",               unit: "",   default: 3,      step: 1, min: 1 },
  { name: "b",   label: "Breedte enkele spuwer b",        unit: "mm", default: 500,    step: 10 },
  { name: "h",   label: "Hoogte enkele spuwer h",         unit: "mm", default: 80,     step: 5 },
  { name: "h_nd",label: "Bovenz. dakbedekking → ond.zijde spuwer h_nd", unit: "mm", default: 50, step: 5 },
  { name: "i_r", label: "Regenintensiteit i_r",           unit: "m³/(s·m²)", default: 0.00005, step: 0.000005, hint: "Tabel NB.1 NEN-EN 1991-1-3/NB" },
];

function K(expr: string): string {
  // KaTeX block-mode render naar string
  return katex.renderToString(expr, { throwOnError: false, displayMode: false });
}

function fmt(x: number, dp = 2): string {
  if (!Number.isFinite(x)) return "—";
  if (Math.abs(x) >= 100) return x.toFixed(0);
  if (Math.abs(x) >= 10) return x.toFixed(1);
  return x.toFixed(dp);
}

function NumberInput({
  name,
  label,
  unit,
  value,
  step,
  min,
  max,
  hint,
  onChange,
}: {
  name: string;
  label: string;
  unit?: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="spuwer-row" title={hint}>
      <label className="spuwer-row-label" htmlFor={`sp-${name}`}>{label}</label>
      <input
        id={`sp-${name}`}
        type="number"
        className="spuwer-row-input"
        value={value}
        step={step ?? 1}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        // Selecteer de hele waarde zodra het veld de focus krijgt — zo
        // kan de gebruiker direct een nieuwe waarde typen zonder eerst
        // de bestaande tekst te wissen. Werkt voor klik, tab en
        // programmatische focus().
        onFocus={(e) => e.currentTarget.select()}
        // Klik in een al-gefocussed number-input plaatst standaard de
        // caret op de positie van de klik. Forceer ook bij klik een
        // volledige select, zodat de UX consistent is.
        onClick={(e) => e.currentTarget.select()}
      />
      {unit && <span className="spuwer-row-unit">{unit}</span>}
    </div>
  );
}

/** Klik-handler-helper voor maatlijnen: focus + selecteer het bijbehorende
 * input-veld in de linkerkolom zodat de gebruiker meteen kan typen. */
function focusInput(name: string) {
  const el = document.getElementById(`sp-${name}`);
  if (el && el instanceof HTMLInputElement) {
    el.focus();
    el.select();
  }
}

function Drawing({ b, h, h_nd, d_nd }: { b: number; h: number; h_nd: number; d_nd: number; n: number }) {
  // ─── Schaling ─────────────────────────────────────────────────────────
  // Eén mm-schaal voor het zijaanzicht zodat h, h_nd en d_nd proportioneel
  // ten opzichte van elkaar getekend worden.
  const verticalMm = Math.max(h_nd + h + 60, 200);
  const sidePxHeight = 170;
  const mmToPx = sidePxHeight / verticalMm;
  const sPx = (mm: number) => mm * mmToPx;

  // ─── Zijaanzicht layout — correcte fysica ─────────────────────────────
  // ViewBox: 540 × 300. In SVG = kleinere Y → hoger in beeld.
  // De dakbedekking vormt de roof-surface. Daarboven komen:
  //   • opstaande wand met spuwer-uitsparing
  //   • waterlaag op de bedekking
  // Daaronder komt de zwarte dakconstructie (structural deck).
  const dakX0 = 50;
  const dakW = 220;
  const wallX = dakX0 + dakW;
  const wallW = 50;

  const dakBedTopY = 200;             // bovenkant dakbedekking (= roof surface)
  const dakBedDikte = 4;              // visuele dikte bedekking
  const dakBedBotY = dakBedTopY + dakBedDikte;
  const dakConstrDikte = 32;          // dikte dakconstructie (zwart)
  const dakConstrBotY = dakBedBotY + dakConstrDikte;

  // Spuwer-opening — onderkant zit h_nd BOVEN dakbedekking (kleinere Y)
  const ondSpuwerY = dakBedTopY - sPx(h_nd);
  const bovSpuwerY = ondSpuwerY - sPx(h);
  // Waterhoogte: d_nd boven onderzijde spuwer
  const waterY = ondSpuwerY - sPx(d_nd);
  // Bovenkant wand: iets boven spuwer-top (16 px marge in beeld)
  const wallTopY = bovSpuwerY - 16;
  // Onderkant wand: tot in de dakconstructie zodat hij continu lijkt
  const wallBotY = dakConstrBotY;

  // ─── Vooraanzicht layout ──────────────────────────────────────────────
  // Spuwer-opening vooraanzicht zit op DEZELFDE Y als de uitsparing in
  // het zijaanzicht. De buitenste rechthoek dekt de gehele opstand-strook.
  const frontX0 = 340;
  const frontW = 160;
  const frontY0 = wallTopY;
  const frontH = wallBotY - wallTopY;
  // Schaal b naar pixels binnen frontW (max ~130 px, min 40 px).
  const bMaxPx = frontW - 30;
  const bMinPx = 40;
  const bPx = Math.max(bMinPx, Math.min(bMaxPx, bMinPx + b / 12));
  const spuwerCx = frontX0 + frontW / 2;
  const spuwerY = bovSpuwerY;
  const spuwerH = sPx(h);

  return (
    <svg viewBox="0 0 540 300" className="spuwer-drawing">
      <defs>
        {/* Lichte grijswaarde voor dakplaat-zijaanzicht */}
        <linearGradient id="dakplaat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4d4d8"/>
          <stop offset="1" stopColor="#a1a1aa"/>
        </linearGradient>
        {/* Iets donkerder voor de opstaande wand (schaduw-effect) */}
        <linearGradient id="opstand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#71717a"/>
          <stop offset="1" stopColor="#52525b"/>
        </linearGradient>
        {/* Pijl-markers voor maatlijnen */}
        <marker id="dimA" markerWidth="7" markerHeight="7" refX="0" refY="3.5" orient="auto">
          <polygon points="0 3.5, 7 0, 7 7" fill="#374151"/>
        </marker>
        <marker id="dimB" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
          <polygon points="7 3.5, 0 0, 0 7" fill="#374151"/>
        </marker>
      </defs>

      {/* ════════════ ZIJAANZICHT ════════════ */}

      {/* 1. OPSTAANDE WAND — getekend in twee delen (boven en onder
       *    de spuwer-uitsparing). De wand staat OP de dakbedekking en
       *    loopt visueel door tot in de dakconstructie. */}
      {/* Boven-deel: van wallTopY tot bovSpuwerY */}
      <rect x={wallX} y={wallTopY} width={wallW} height={bovSpuwerY - wallTopY}
            fill="url(#opstand)" stroke="#27272a" strokeWidth="0.8"/>
      {/* Onder-deel: van ondSpuwerY tot dakBed-onderkant (op dakniveau) */}
      <rect x={wallX} y={ondSpuwerY} width={wallW} height={dakBedTopY - ondSpuwerY}
            fill="url(#opstand)" stroke="#27272a" strokeWidth="0.8"/>

      {/* "30 mm marge" — kleine label op de wand, boven de waterlijn */}
      <text x={wallX + 4} y={wallTopY + 12} fontSize="10" fill="#1f2937" fontWeight="600">30</text>

      {/* 2. WATER op het dak — vóór de dakbedekking getekend zodat het
       *    visueel boven de roof-surface ligt. Alleen links van de wand. */}
      {d_nd > 0.5 && (
        <>
          {/* Waterlaag — van waterY (top) tot dakBedTopY (bottom = roof surface) */}
          <rect x={dakX0} y={waterY} width={dakW} height={dakBedTopY - waterY}
                fill="rgba(186,230,253,0.45)" stroke="none"/>
          {/* Wateroppervlak — cyaan accent-lijn */}
          <line x1={dakX0} y1={waterY} x2={wallX} y2={waterY}
                stroke="#0ea5e9" strokeWidth="1.2"/>
          {/* Water dat door de spuwer-opening stroomt (tussen ondSpuwerY
           *    en waterY in de uitsparing, alleen als waterY < ondSpuwerY) */}
          {waterY < ondSpuwerY && (
            <rect x={wallX} y={waterY} width={wallW} height={ondSpuwerY - waterY}
                  fill="rgba(186,230,253,0.45)" stroke="none"/>
          )}
          {/* Labels d_nd en d_hw nabij de spuwer-uitsparing */}
          <text x={wallX - 58} y={waterY - 4} fontSize="10" fill="#0ea5e9" fontWeight="600">
            d_nd={fmt(d_nd, 0)}
          </text>
          <text x={wallX - 58} y={dakBedTopY - 4} fontSize="10" fill="#0ea5e9" fontWeight="600">
            d_hw={fmt(d_nd + h_nd, 0)}
          </text>
        </>
      )}

      {/* 3. DAKBEDEKKING — dunne grijze afdichtingslaag, ONDER het water,
       *    helemaal links uit dakX0 tot net na de wand. */}
      <rect x={dakX0} y={dakBedTopY} width={wallX + wallW - dakX0} height={dakBedDikte}
            fill="#d4d4d8" stroke="#27272a" strokeWidth="0.6"/>

      {/* 4. DAKCONSTRUCTIE — zwarte structurele draagvloer onder de
       *    bedekking (staalplaat / houten balklaag / beton). */}
      <rect x={dakX0} y={dakBedBotY} width={wallX + wallW - dakX0} height={dakConstrDikte}
            fill="#1f1f1f" stroke="#000" strokeWidth="0.8"/>

      {/* === Maatlijnen LINKS van opstand — klikbaar === */}
      {/* h (hoogte spuwer) */}
      <g className="spuwer-dim" onClick={() => focusInput("h")} role="button" tabIndex={0}>
        {/* Onzichtbare hit-area maakt het hele gebied klikbaar (de
         * line + text alleen is te smal om makkelijk aan te klikken). */}
        <rect x={dakX0 - 28} y={bovSpuwerY - 4} width={42} height={Math.max(16, ondSpuwerY - bovSpuwerY + 8)}
              fill="transparent" />
        <line x1={dakX0 + 6} y1={bovSpuwerY} x2={dakX0 + 6} y2={ondSpuwerY}
              stroke="#374151" strokeWidth="0.7" markerStart="url(#dimA)" markerEnd="url(#dimB)"/>
        <text x={dakX0 - 4} y={(bovSpuwerY + ondSpuwerY) / 2 + 4} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">
          h={fmt(h, 0)}
        </text>
        <title>Klik om h aan te passen</title>
      </g>

      {/* h_nd (van onderzijde spuwer tot dakbedekking — afstand omhoog) */}
      <g className="spuwer-dim" onClick={() => focusInput("h_nd")} role="button" tabIndex={0}>
        <rect x={dakX0 - 32} y={ondSpuwerY - 4} width={46} height={Math.max(16, dakBedTopY - ondSpuwerY + 8)}
              fill="transparent" />
        <line x1={dakX0 + 6} y1={ondSpuwerY} x2={dakX0 + 6} y2={dakBedTopY}
              stroke="#374151" strokeWidth="0.7" markerStart="url(#dimA)" markerEnd="url(#dimB)"/>
        <text x={dakX0 - 4} y={(ondSpuwerY + dakBedTopY) / 2 + 4} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">
          h_nd={fmt(h_nd, 0)}
        </text>
        <title>Klik om h_nd aan te passen</title>
      </g>

      {/* ════════════ VOORAANZICHT ════════════ */}

      {/* Maatlijn b — boven het vooraanzicht — klikbaar */}
      <g className="spuwer-dim" onClick={() => focusInput("b")} role="button" tabIndex={0}>
        <rect x={spuwerCx - bPx / 2 - 8} y={frontY0 - 28} width={bPx + 16} height={24}
              fill="transparent" />
        <line x1={spuwerCx - bPx / 2} y1={frontY0 - 10} x2={spuwerCx + bPx / 2} y2={frontY0 - 10}
              stroke="#374151" strokeWidth="0.7" markerStart="url(#dimA)" markerEnd="url(#dimB)"/>
        <line x1={spuwerCx - bPx / 2} y1={frontY0 - 6} x2={spuwerCx - bPx / 2} y2={frontY0 - 16}
              stroke="#374151" strokeWidth="0.5"/>
        <line x1={spuwerCx + bPx / 2} y1={frontY0 - 6} x2={spuwerCx + bPx / 2} y2={frontY0 - 16}
              stroke="#374151" strokeWidth="0.5"/>
        <text x={spuwerCx} y={frontY0 - 18} fontSize="10" fill="#1f2937" textAnchor="middle" fontWeight="600">
          b={fmt(b, 0)}
        </text>
        <title>Klik om b aan te passen</title>
      </g>

      {/* Vooraanzicht buitenste rechthoek (omtrek opstand-strook) */}
      <rect x={frontX0} y={frontY0} width={frontW} height={frontH}
            fill="#fff" stroke="#27272a" strokeWidth="0.8"/>

      {/* Spuweropening — gevuld donkere rechthoek met zwarte rand */}
      <rect x={spuwerCx - bPx / 2} y={spuwerY} width={bPx} height={spuwerH}
            fill="#fff" stroke="#1f2937" strokeWidth="1.4"/>
    </svg>
  );
}

function Spuwer({ values, setValue }: WizardProps) {
  const v = useMemo(() => {
    const get = (k: string) => values[k] ?? INPUTS.find((x) => x.name === k)?.default ?? 0;
    return {
      A: get("A"), n: Math.max(1, Math.round(get("n"))),
      b: get("b"), h: get("h"), h_nd: get("h_nd"), i_r: get("i_r"),
    };
  }, [values]);

  // ── Berekening ──────────────────────────────────────────────────────────
  const Q_h = v.A * v.i_r;                                  // m³/s
  const b_tot = v.b * v.n;                                   // mm — som breedte
  const d_nd = 700 * Math.pow(Q_h / (v.b * v.n / 1000), 2 / 3); // mm (formule 7.4)
  //  Q_h is m³/s, b·n is mm → omzetten naar m via /1000. Result in m → ·1000 = mm
  //  0,7 · (Q/B)^(2/3) waar Q in m³/s en B in m → resultaat in m. Hier ·1000 = mm.
  const d_hw = d_nd + v.h_nd;                                // mm (formule 7.8)
  const h_min = 30 + d_nd;                                   // mm (§7.3(3): 30 mm marge)
  const uc = v.h > 0 ? h_min / v.h : Infinity;

  // Diameter ronde spuwer voor gelijke d_nd (formule 7.7 omgekeerd):
  // d_nd_round = 0.29 · (Q_h / d_round)^(2/3)
  // Geef d_round bij dezelfde Q_h per spuwer en gelijke d_nd:
  //   d_nd = 0.29 · (Q/d)^(2/3)  ⇒  d = Q · (0.29/d_nd)^(3/2)
  const Q_per_spuwer = Q_h / v.n;                            // m³/s
  const d_round_correct = Q_per_spuwer * Math.pow(0.29 / (d_nd / 1000), 1.5) * 1000; // mm

  return (
    <div className="spuwer-grid">
      {/* ── Linker kolom: inputs ─────────────────────────────────────── */}
      <aside className="spuwer-inputs">
        <header className="spuwer-title">Spuwer</header>
        <input className="spuwer-name" defaultValue="Spuwer" readOnly />
        {INPUTS.map((spec) => (
          <NumberInput
            key={spec.name}
            name={spec.name}
            label={spec.label}
            unit={spec.unit}
            value={values[spec.name] ?? spec.default}
            step={spec.step}
            min={spec.min}
            max={spec.max}
            hint={spec.hint}
            onChange={(val) => setValue(spec.name, val)}
          />
        ))}
      </aside>

      {/* ── Midden: parametrische tekening ───────────────────────────── */}
      <main className="spuwer-canvas">
        <Drawing b={v.b} h={v.h} h_nd={v.h_nd} d_nd={d_nd} n={v.n} />
      </main>

      {/* ── Rechter kolom: berekeningsresultaten ─────────────────────── */}
      <aside className="spuwer-results">
        <header className="spuwer-results-title">Berekeningsresultaten</header>

        <h4>Invoer</h4>
        <dl className="spuwer-table">
          <dt>Oppervlakte afvoergebied</dt><dd dangerouslySetInnerHTML={{ __html: K(`A = ${fmt(v.A)}\\;\\mathrm{m}^2`) }}/>
          <dt>Aantal spuwers</dt><dd dangerouslySetInnerHTML={{ __html: K(`n = ${v.n}`) }}/>
          <dt>Breedte enkele spuwer</dt><dd dangerouslySetInnerHTML={{ __html: K(`b = ${fmt(v.b, 0)}\\;\\mathrm{mm}`) }}/>
          <dt>Hoogte enkele spuwer</dt><dd dangerouslySetInnerHTML={{ __html: K(`h = ${fmt(v.h, 0)}\\;\\mathrm{mm}`) }}/>
          <dt>Som breedte spuwers</dt><dd dangerouslySetInnerHTML={{ __html: K(`b_{tot} = ${fmt(b_tot, 0)}\\;\\mathrm{mm}`) }}/>
          <dt>Bovenz. dak → ond.spuwer</dt><dd dangerouslySetInnerHTML={{ __html: K(`h_{nd} = ${fmt(v.h_nd, 0)}\\;\\mathrm{mm}`) }}/>
          <dt>Referentieperiode</dt><dd>t = 50 jaar</dd>
          <dt>Regenintensiteit</dt><dd className="spuwer-cell-note">
            <span dangerouslySetInnerHTML={{ __html: K(`i_r = ${v.i_r}\\;\\mathrm{m}^3/(s\\cdot \\mathrm{m}^2)`) }}/>
            <small>(Tabel NB.1)</small>
          </dd>
        </dl>

        <h4>Berekening noodafvoercapaciteit rechthoekige spuwer</h4>
        <dl className="spuwer-table">
          <dt>Regenwaterdebiet</dt>
          <dd dangerouslySetInnerHTML={{ __html: K(`Q_h = A\\cdot i_r = ${fmt(v.A)} \\cdot ${v.i_r} = ${fmt(Q_h, 4)}\\;\\mathrm{m}^3/s`) }}/>
          <dt className="spuwer-cell-note"><small>(7.2)</small></dt><dd/>

          <dt>Waterhoogte boven ond.zijde noodafvoer</dt>
          <dd>
            <span dangerouslySetInnerHTML={{ __html: K(`d_{nd} = 0{,}7\\,\\left(\\dfrac{Q_h}{b\\cdot n}\\right)^{2/3}`) }}/>
            <span dangerouslySetInnerHTML={{ __html: K(`= 0{,}7\\,\\left(\\dfrac{${fmt(Q_h, 4)}}{${(v.b * v.n / 1000).toFixed(3)}}\\right)^{2/3} \\cdot 10^3 = ${fmt(d_nd, 0)}\\;\\mathrm{mm}`) }}/>
          </dd>
          <dt className="spuwer-cell-note"><small>(7.4)</small></dt><dd/>

          <dt>Waterhoogte t.p.v. spuwer</dt>
          <dd dangerouslySetInnerHTML={{ __html: K(`d_{hw} = d_{nd} + h_{nd} = ${fmt(d_nd, 0)} + ${fmt(v.h_nd, 0)} = ${fmt(d_hw, 0)}\\;\\mathrm{mm}`) }}/>
          <dt className="spuwer-cell-note"><small>(7.8)</small></dt><dd/>

          <dt>Regenwaterbelasting t.p.v. spuwer</dt>
          <dd dangerouslySetInnerHTML={{ __html: K(`q = ${fmt(d_hw * 9.81 / 1000, 2)}\\;\\mathrm{kN/m}^2`) }}/>
        </dl>

        <p className="spuwer-note">
          Conform paragraaf 7.3(3) is er 30 mm extra hoogte in de spuwer nodig
          ter voorkoming van een verstopping.
        </p>

        <dl className="spuwer-table">
          <dt/><dd dangerouslySetInnerHTML={{ __html: K(`30 + d_{nd} = 30 + ${fmt(d_nd, 0)} = ${fmt(30 + d_nd, 0)}\\;\\mathrm{mm}`) }}/>
          <dt>Minimale spuwerhoogte</dt>
          <dd dangerouslySetInnerHTML={{ __html: K(`h_{min} = 30 + d_{nd} = ${fmt(h_min, 0)}\\;\\mathrm{mm}`) }}/>
          <dt/><dd dangerouslySetInnerHTML={{ __html: K(`\\text{u.c.} = \\dfrac{h_{min}}{h} = \\dfrac{${fmt(h_min, 0)}}{${fmt(v.h, 0)}} = ${fmt(uc, 2)}`) }}/>
        </dl>

        <p className={`spuwer-verdict ${uc <= 1 ? "ok" : "fail"}`}>
          Spuwer {uc <= 1 ? "voldoet" : "voldoet NIET"} (UC = {fmt(uc, 2)})
        </p>

        <h4>Berekening diameter ronde spuwer bij gelijke d_nd</h4>
        <dl className="spuwer-table">
          <dt>Ronde spuwer (per stuk)</dt>
          <dd dangerouslySetInnerHTML={{ __html: K(`d_{nd} = 0{,}29\\,\\left(\\dfrac{Q_h/n}{d}\\right)^{2/3}`) }}/>
          <dt className="spuwer-cell-note"><small>(7.7)</small></dt><dd/>

          <dt>Minimale benodigde diameter</dt>
          <dd dangerouslySetInnerHTML={{ __html: K(`d_{min} = \\dfrac{Q_h/n}{(d_{nd}/0{,}29)^{1{,}5}}\\cdot 10^3 \\approx ${fmt(Math.abs(d_round_correct), 0)}\\;\\mathrm{mm}`) }}/>
        </dl>
      </aside>
    </div>
  );
}

export const spuwerWizard: WizardDefinition = {
  id: "spuwer",
  label: "Spuwer (noodafvoer)",
  description: "NEN-EN 1991-1-3 / NEN 6702 §7.3 — rechthoekige + ronde spuwer",
  icon: "💧",
  inputs: [...INPUTS],
  Component: Spuwer,
};
