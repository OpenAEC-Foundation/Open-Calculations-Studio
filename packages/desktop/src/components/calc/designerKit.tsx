import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";

/**
 * Gedeelde bouwstenen voor de parametrische beelden.
 *
 * De eerste designers (voetplaat, spuwer, …) dragen elk hun eigen kopie van
 * dezelfde store-koppeling, ResizeObserver en maat-chips. Voor de reeks nieuwe
 * modules staat dat hier één keer: een hook die de invoer aan de gedeelde
 * load-case-store hangt en het tekengebied opmeet, plus de chips en markers
 * waarmee elk beeld getekend wordt.
 *
 * Bewust géén rekenwerk hier — de nieuwe modules zijn voorlopig alleen visueel;
 * de toetsingen komen per module in het rekenblad.
 */

/** Alles wat een designer nodig heeft om invoer te lezen, te schrijven en te tekenen. */
export interface DesignerCtx {
  /** true zodra de actieve sheet bij deze module hoort. */
  actief: boolean;
  /** Huidige waarde van een invoerveld, met de DEFAULT als terugval. */
  d: (naam: string) => number;
  /** Schrijft een waarde terug naar de gedeelde store (en dus naar het blad). */
  set: (naam: string, waarde: number) => void;
  /** Afmetingen van het tekengebied, bijgehouden door een ResizeObserver. */
  box: { w: number; h: number };
  /** Aan het scrollende tekengebied hangen. */
  wrapRef: React.RefObject<HTMLDivElement | null>;
  /** Naam van het veld dat nu bewerkt wordt (of null). */
  editing: string | null;
  setEditing: (naam: string | null) => void;
}

/**
 * Koppelt een module aan het blad dat openstaat: seedt de defaults in dát
 * exemplaar en meet het tekengebied op.
 *
 * De waarden staan per exemplaar, dus seeden is simpel: vul aan wat ontbreekt.
 * In het oude model was er één platte waardenmap voor de hele app en moest een
 * module haar eigen velden forceren, anders erfde ze de waarde van een andere
 * module die toevallig dezelfde variabelenaam gebruikte. Dat kan nu niet meer.
 */
export function useDesigner(marker: string, defaults: Record<string, number>): DesignerCtx {
  // Welk blad getekend wordt: normaal het actieve, in de afdruk het blad dat de
  // context aanwijst. `alleenLezen` houdt daar het schrijven tegen.
  const exemplaar = useActiefExemplaar();
  const alleenLezen = useAlleenLezen();
  const activeId = alleenLezen ? "" : (exemplaar?.id ?? "");
  const zetWaarde = useProjectStore((s) => s.zetWaarde);
  const seedWaarden = useProjectStore((s) => s.seedWaarden);
  const [editing, setEditing] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 640, h: 520 });

  const actief = !!exemplaar?.source.includes(marker);

  useEffect(() => {
    if (!actief) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(defaults)) seed[k] = String(v);
    seedWaarden(activeId, seed);
    // defaults is een moduleconstante; bewust buiten de deps gehouden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actief, activeId, marker, seedWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: Math.max(220, r.width), h: Math.max(220, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [actief]);

  const vals = exemplaar?.waarden ?? {};
  const d = (naam: string): number => {
    const raw = vals[naam];
    const def = defaults[naam] ?? 0;
    if (raw === undefined || raw === "") return def;
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };
  const set = (naam: string, waarde: number) => zetWaarde(activeId, naam, String(waarde));

  return { actief, d, set, box, wrapRef, editing, setEditing };
}

/** Nederlandse notatie: 1234.5 → "1234,5". */
export const fmt = (v: number, dec = 0) =>
  (Number.isFinite(v) ? v : 0).toFixed(dec).replace(".", ",");

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Klikbare maat — blauw chipje dat bij klikken een invoerveld wordt en de
 * waarde terugschrijft naar de sheet.
 */
export function Dim(props: {
  ctx: DesignerCtx; name: string; value: number; x: number; y: number;
  step?: number; label?: string; dec?: number; title?: string;
}) {
  const { ctx, name, value, x, y, step = 10, label, dec = 0, title } = props;
  const isEd = ctx.editing === name;
  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(",", "."));
    if (Number.isFinite(n)) ctx.set(name, n);
    ctx.setEditing(null);
  };
  return (
    <div className="vd-dim" style={{ left: x, top: y }}>
      {isEd ? (
        <input className="vd-dim-input" type="number" step={step} defaultValue={value} autoFocus
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
            if (e.key === "Escape") ctx.setEditing(null);
          }} />
      ) : (
        <button className="vd-dim-num" style={{ whiteSpace: "nowrap" }}
          title={title ?? `${label ?? name} — klik om te wijzigen`}
          onClick={() => ctx.setEditing(name)}>
          {label ? `${label}=` : ""}{fmt(value, dec)}
        </button>
      )}
    </div>
  );
}

/** Klikbare belasting — rood chipje met eenheid. */
export function Force(props: {
  ctx: DesignerCtx; name: string; value: number; x: number; y: number;
  unit: string; label: string; step?: number; dec?: number;
}) {
  const { ctx, name, value, x, y, unit, label, step = 10, dec = 0 } = props;
  const isEd = ctx.editing === name;
  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(",", "."));
    if (Number.isFinite(n)) ctx.set(name, n);
    ctx.setEditing(null);
  };
  return (
    <div className="vd-force" style={{ left: x, top: y }}>
      {isEd ? (
        <input className="vd-dim-input" type="number" step={step} defaultValue={value} autoFocus
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
            if (e.key === "Escape") ctx.setEditing(null);
          }} />
      ) : (
        <button className="vd-force-num" style={{ whiteSpace: "nowrap" }}
          title={`${name} — klik om te wijzigen`} onClick={() => ctx.setEditing(name)}>
          {label}={fmt(value, dec)}<small>{unit}</small>
        </button>
      )}
    </div>
  );
}

/** Afgeleide maat — grijs en niet klikbaar. */
export function Ro(props: { text: string; x: number; y: number; title?: string; kleur?: string }) {
  return (
    <div className="vd-dim-ro" style={{ left: props.x, top: props.y, color: props.kleur ?? "#6b7280" }}
      title={props.title}>{props.text}</div>
  );
}

/**
 * Maatstreepjes en belastingspunten. `k` maakt de id's uniek per canvas, zodat
 * meerdere aanzichten in één designer elkaars markers niet overschrijven.
 */
export function Defs({ k }: { k: string }) {
  return (
    <defs>
      <marker id={`dk${k}Dim`} markerWidth="10" markerHeight="12" refX="5" refY="6"
        orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M5 0.5 L5 11.5" className="vd-dimarrow" />
      </marker>
      <marker id={`dk${k}Load`} markerWidth="11" markerHeight="9" refX="9" refY="4.5"
        orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1 1 L9 4.5 L1 8 Z" className="vd-loadfill" />
      </marker>
      <linearGradient id={`dk${k}Beton`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e7e9ec" />
        <stop offset="100%" stopColor="#a9adb4" />
      </linearGradient>
      <linearGradient id={`dk${k}Staal`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dce8f8" />
        <stop offset="100%" stopColor="#b9cfec" />
      </linearGradient>
    </defs>
  );
}
/** id-helpers die bij `Defs` horen. */
export const dimMark = (k: string) => `url(#dk${k}Dim)`;
export const loadMark = (k: string) => `url(#dk${k}Load)`;
export const betonFill = (k: string) => `url(#dk${k}Beton)`;
export const staalFill = (k: string) => `url(#dk${k}Staal)`;

/** Horizontale maatlijn met streepjes aan beide zijden. */
export function HDim({ k, x0, x1, y, ext }: { k: string; x0: number; x1: number; y: number; ext?: number }) {
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} className="vd-dimmeasure"
        markerStart={dimMark(k)} markerEnd={dimMark(k)} />
      {ext !== undefined && (
        <>
          <line x1={x0} y1={y} x2={x0} y2={ext} className="vd-dimext" />
          <line x1={x1} y1={y} x2={x1} y2={ext} className="vd-dimext" />
        </>
      )}
    </g>
  );
}

/** Verticale maatlijn met streepjes aan beide zijden. */
export function VDim({ k, y0, y1, x, ext }: { k: string; y0: number; y1: number; x: number; ext?: number }) {
  return (
    <g>
      <line x1={x} y1={y0} x2={x} y2={y1} className="vd-dimmeasure"
        markerStart={dimMark(k)} markerEnd={dimMark(k)} />
      {ext !== undefined && (
        <>
          <line x1={x} y1={y0} x2={ext} y2={y0} className="vd-dimext" />
          <line x1={x} y1={y1} x2={ext} y2={y1} className="vd-dimext" />
        </>
      )}
    </g>
  );
}

/**
 * Doorsnede van een I-profiel, getekend vanuit het hart. `rechtop` zet het
 * profiel met het lijf verticaal (normale doorsnede), anders liggend.
 */
export function IProfiel(props: {
  cx: number; cy: number; h: number; b: number; tw: number; tf: number; s: number;
  rechtop?: boolean; vulling?: string; lijn?: string;
}) {
  const { cx, cy, h, b, tw, tf, s, rechtop = true, vulling = "#cfe0f5", lijn = "#1e40af" } = props;
  const H = (rechtop ? h : b) * s, B = (rechtop ? b : h) * s;
  const TF = Math.max(1.4, tf * s), TW = Math.max(1.4, tw * s);
  const x0 = cx - B / 2, y0 = cy - H / 2;
  return (
    <g>
      {rechtop ? (
        <>
          <rect x={x0} y={y0} width={B} height={TF} fill={vulling} stroke={lijn} strokeWidth={1.2} />
          <rect x={x0} y={y0 + H - TF} width={B} height={TF} fill={vulling} stroke={lijn} strokeWidth={1.2} />
          <rect x={cx - TW / 2} y={y0 + TF} width={TW} height={H - 2 * TF} fill={vulling} stroke={lijn} strokeWidth={1.2} />
        </>
      ) : (
        <>
          <rect x={x0} y={y0} width={TF} height={H} fill={vulling} stroke={lijn} strokeWidth={1.2} />
          <rect x={x0 + B - TF} y={y0} width={TF} height={H} fill={vulling} stroke={lijn} strokeWidth={1.2} />
          <rect x={x0 + TF} y={cy - TW / 2} width={B - 2 * TF} height={TW} fill={vulling} stroke={lijn} strokeWidth={1.2} />
        </>
      )}
    </g>
  );
}

/** Bout in bovenaanzicht: cirkel met hartkruis. */
export function Bout({ cx, cy, r, kleur = "#1e40af" }: { cx: number; cy: number; r: number; kleur?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#e8eefb" stroke={kleur} strokeWidth={1.2} />
      <line x1={cx - r * 1.7} y1={cy} x2={cx + r * 1.7} y2={cy} stroke={kleur} strokeWidth={0.7} />
      <line x1={cx} y1={cy - r * 1.7} x2={cx} y2={cy + r * 1.7} stroke={kleur} strokeWidth={0.7} />
    </g>
  );
}

/** Lasdriehoekje met keeldikte-aanduiding, zoals op een werktekening. */
export function Las(props: { x: number; y: number; a: number; hoek?: number; kleur?: string }) {
  const { x, y, a, hoek = 0, kleur = "#1e40af" } = props;
  const g = Math.max(3, a);
  return (
    <g transform={`rotate(${hoek} ${x} ${y})`}>
      <path d={`M ${x} ${y} L ${x} ${y - g} L ${x + g} ${y} Z`} fill={kleur} opacity={0.55} />
    </g>
  );
}

/** Standaard paneelkop met een neutraal (of goed/fout) badge rechts. */
export function Kop({ titel, badge, staat }: { titel: string; badge: ReactNode; staat?: "ok" | "bad" | "info" }) {
  return (
    <div className="vd-head">
      <strong>{titel}</strong>
      <span className={`vd-uc ${staat ?? "info"}`}>{badge}</span>
    </div>
  );
}
