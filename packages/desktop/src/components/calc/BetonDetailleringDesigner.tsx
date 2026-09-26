import type { ReactElement } from "react";
import { useDesigner, Dim, Ro, Defs, betonFill, HDim, VDim, fmt, clamp, UitkomstKop } from "./designerKit";
import type { DesignerCtx } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het blad Beton detaillering (templates/betonDetaillering.ts).
 *
 * Eén beeld per onderwerp, op ware verhouding:
 *   • Betondekking — een hoek van de doorsnede met de beugel op de ingevulde
 *     dekking en de hoofdstaaf (of bundel) in de beugelhoek. Gestippeld de
 *     vereiste dekking uit het blad: groen als de ingevulde dekking die haalt,
 *     rood als niet.
 *   • Wapeningstabellen — een strook van 1 m met de getoetste staven en de
 *     grootste h.o.h., of een balkdoorsnede met de staven in één laag en de
 *     vrije ruimte tussen de staven.
 *   • Wandwapening — een horizontale doorsnede over 1 m wand met beide netten,
 *     de laag die buiten ligt en de dwarsverbindingen als die nodig zijn.
 *
 * De toetsing staat in het blad; het beeld leest de vereiste dekking, de
 * gekozen wapening en het oordeel daaruit en rekent zelf alleen de plaats van
 * de staven uit.
 */
const MARKER = "Beton detaillering";

const DEFAULTS: Record<string, number> = {
  onderwerp: 1, d_g: 16,
  milieuklasse: 4, aantasting: 0, betonklasse: 5, luchtbel: 0, grensklasse: 99, plaatvorm: 0, kwaliteit: 0,
  ds_hfd: 16, ds_bgl: 8, n_bundel: 1, oppervlak: 1, uitvoering: 1, red_dev: 0, ondergrond: 1, c_dek: 30,
  toepassing: 1, h_el: 200, rol: 1, zone: 1, richting: 1, b_el: 300, A_nodig: 500, ds_kz: 0, s_kz: 150, n_kz: 0,
  l_w: 3, netten: 2, dragend: 1, bekist: 0, ds_v: 10, s_v: 200, ds_h: 8, s_h: 250, buitenlaag: 1,
  ds_dw: 8, s_dw: 150, zone_dw: 1, n_dw: 4,
};

const ONDERWERP = [
  { v: 1, label: "Betondekking (§4.4.1)" },
  { v: 2, label: "Wapeningstabellen" },
  { v: 3, label: "Wandwapening (§9.6)" },
];
const MILIEU = ["X0", "XC1", "XC2", "XC3", "XC4", "XD1", "XD2", "XD3", "XS1", "XS2", "XS3"];
const KLASSE = ["C12/15", "C16/20", "C20/25", "C25/30", "C30/37", "C35/45", "C40/50", "C45/55",
  "C50/60", "C55/67", "C60/75", "C70/85", "C80/95", "C90/105"];
const ONDERGROND = [{ v: 1, label: "Bekisting" }, { v: 2, label: "Voorbereide ondergrond" }, { v: 3, label: "Tegen de grond" }];
const TOEPASSING = [{ v: 1, label: "Vloer of plaat (per m)" }, { v: 2, label: "Wand (per m)" }, { v: 3, label: "Balk (n staven)" }];
const DIAM = [6, 8, 10, 12, 16, 20, 25, 32, 40];
const STAAL = "#374151";
const BEUGEL = "#1e3a8a";
const GOED = "#15803d";
const FOUT = "#b91c1c";

/** Kleur van een eis: groen als de aanwezige maat hem haalt. */
const eisKleur = (aanwezig: number, eis: number) => (aanwezig + 0.01 >= eis ? GOED : FOUT);

/** Posities van de staven in een bundel, in staafdiameters vanaf de hoek van de bundel. */
function bundel(n: number): { x: number; y: number }[] {
  if (n <= 1) return [{ x: 0.5, y: 0.5 }];
  if (n === 2) return [{ x: 0.5, y: 0.5 }, { x: 1.5, y: 0.5 }];
  if (n === 3) return [{ x: 0.5, y: 0.5 }, { x: 1.5, y: 0.5 }, { x: 1, y: 0.5 + Math.sqrt(3) / 2 }];
  return [{ x: 0.5, y: 0.5 }, { x: 1.5, y: 0.5 }, { x: 0.5, y: 1.5 }, { x: 1.5, y: 1.5 }];
}

/** Keuzelijst met getallen als waarde. */
function Keuze(props: { label: string; naam: string; waarde: number; opties: { v: number; label: string }[]; set: DesignerCtx["set"] }) {
  const { label, naam, waarde, opties, set } = props;
  return (
    <label>{label}
      <select value={waarde} onChange={(e) => set(naam, parseFloat(e.target.value))}>
        {opties.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Getal-invoer. */
function Getal(props: { label: string; naam: string; waarde: number; stap: number; set: DesignerCtx["set"]; title?: string }) {
  const { label, naam, waarde, stap, set, title } = props;
  return (
    <label title={title}>{label}
      <input type="number" step={stap} value={waarde} onChange={(e) => set(naam, parseFloat(e.target.value))} />
    </label>
  );
}

const diamOpties = (metNul: boolean) =>
  [...(metNul ? [{ v: 0, label: "geen" }] : []), ...DIAM.map((x) => ({ v: x, label: `Ø${x}` }))];

// ── 1. Betondekking: een hoek van de doorsnede ──────────────────────────────

function Hoek({ ctx, g, W, H }: { ctx: DesignerCtx; g: Record<string, number>; W: number; H: number }) {
  const { d } = ctx;
  const c = Math.max(0, d("c_dek"));
  const tb = Math.max(0, d("ds_bgl"));
  const fi = Math.max(4, d("ds_hfd"));
  const nb = clamp(Math.round(d("n_bundel")), 1, 4);
  const staven = bundel(nb);
  const bundelB = nb === 1 ? fi : 2 * fi;
  const L = Math.max(c + tb + bundelB + 70, 120);
  const mL = 70, mR = 150, mT = 40, mB = 30;
  const s = clamp(Math.min((W - mL - mR) / L, (H - mT - mB) / L), 0.3, 12);
  const x0 = mL, y0 = mT, X = (mm: number) => x0 + mm * s, Y = (mm: number) => y0 + mm * s;

  // Vereiste dekking uit het blad: op de beugel en op de hoofdstaaf.
  const eisBgl = tb > 0 ? g.c_eis_bgl : undefined;
  const eisHfd = tb > 0 ? g.c_nom_hfd : g.c_eis_hfd;
  const opHfd = c + tb;
  const R = tb > 0 ? 2.5 * tb : 0;                     // hartlijnstraal bij een doorn van 4Ø
  const o = c + tb / 2;
  // De hoekstaaf ligt in de buiging van de beugel: tegen de binnenkant van de
  // bocht (straal 2Ø_beugel rond het middelpunt op c + 3Ø_beugel), of tegen de
  // rechte benen als de staaf daarvoor te dik is.
  const tegenBenen = c + tb + fi / 2;
  const inBocht = tb > 0 ? c + 3 * tb - (2 * tb - fi / 2) / Math.SQRT2 : tegenBenen;
  const schuif = Math.max(0, inBocht - tegenBenen);

  return (
    <>
      <svg width={W} height={H} className="vd-svg">
        <Defs k="bh" />
        <rect x={x0} y={y0} width={L * s} height={L * s} fill={betonFill("bh")} stroke="none" />
        <line x1={x0} y1={y0} x2={X(L)} y2={y0} stroke="#374151" strokeWidth={1.6} />
        <line x1={x0} y1={y0} x2={x0} y2={Y(L)} stroke="#374151" strokeWidth={1.6} />
        <line x1={X(L)} y1={y0} x2={X(L)} y2={Y(L)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 4" />
        <line x1={x0} y1={Y(L)} x2={X(L)} y2={Y(L)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 4" />
        {tb > 0 && (
          <path d={`M ${X(o)} ${Y(L)} L ${X(o)} ${Y(o + R)} A ${R * s} ${R * s} 0 0 1 ${X(o + R)} ${Y(o)} L ${X(L)} ${Y(o)}`}
            fill="none" stroke={BEUGEL} strokeWidth={Math.max(1.5, tb * s)} />
        )}
        {staven.map((p, i) => (
          <circle key={i} cx={X(c + tb + schuif + p.x * fi)} cy={Y(c + tb + schuif + p.y * fi)} r={Math.max(2, (fi / 2) * s)}
            fill={STAAL} stroke="#111827" strokeWidth={0.8} />
        ))}
        {eisBgl !== undefined && (
          <g stroke={eisKleur(c, eisBgl)} strokeWidth={1.3} strokeDasharray="7 4">
            <line x1={x0} y1={Y(eisBgl)} x2={X(L)} y2={Y(eisBgl)} />
            <line x1={X(eisBgl)} y1={y0} x2={X(eisBgl)} y2={Y(L)} />
          </g>
        )}
        {eisHfd !== undefined && (eisBgl === undefined || Math.abs(eisHfd - eisBgl) > 0.5) && (
          <g stroke={eisKleur(opHfd, eisHfd)} strokeWidth={1} strokeDasharray="2 3">
            <line x1={x0} y1={Y(eisHfd)} x2={X(L)} y2={Y(eisHfd)} />
            <line x1={X(eisHfd)} y1={y0} x2={X(eisHfd)} y2={Y(L)} />
          </g>
        )}
        {c > 0 && <VDim k="bh" y0={y0} y1={Y(c)} x={X(L * 0.72)} />}
        <text x={X(L) + 8} y={y0 + 4} style={{ fontSize: 10.5, fill: "#6b7280" }}>betonoppervlak</text>
      </svg>
      <Dim ctx={ctx} name="c_dek" value={d("c_dek")} x={X(L * 0.72) + 22} y={(y0 + Y(c)) / 2} step={5} label="c" />
      {eisBgl !== undefined && (
        <Ro text={`beugel ≥ ${fmt(eisBgl, 1)}`} x={X(L) + 52} y={Y(eisBgl)} kleur={eisKleur(c, eisBgl)}
          title="vereiste dekking op de beugel, uit het blad" />
      )}
      {eisHfd !== undefined && (
        <Ro text={`hoofdstaaf ≥ ${fmt(eisHfd, 1)}`} x={X(L) + 60} y={Y(eisHfd) + 14} kleur={eisKleur(opHfd, eisHfd)}
          title={`vereiste dekking op de hoofdstaaf, uit het blad; aanwezig ${fmt(opHfd, 1)} mm`} />
      )}
      <Ro text={`${nb > 1 ? `${nb}×` : ""}Ø${fmt(fi)}`} x={X(c + tb + schuif + bundelB) + 26} y={Y(c + tb + schuif + bundelB) + 10} title="hoofdstaaf of bundel" />
      {tb > 0 && <Ro text={`beugel Ø${fmt(tb)}`} x={X(o) + 30} y={Y(L) - 12} kleur={BEUGEL} />}
    </>
  );
}

// ── 2. Wapeningstabellen: een strook van 1 m of een balkdoorsnede ───────────

function Strook({ ctx, g, W, H }: { ctx: DesignerCtx; g: Record<string, number>; W: number; H: number }) {
  const { d } = ctx;
  const h = Math.max(20, d("h_el"));
  const eigen = d("ds_kz") > 0;
  const ds = g.ds_g ?? (eigen ? d("ds_kz") : 0);
  const sp = g.s_g ?? (eigen ? d("s_kz") : 0);
  const smax = g.s_max;
  const Lm = 1000;
  const mL = 40, mR = 40, mT = 64, mB = 60;
  const s = clamp(Math.min((W - mL - mR) / Lm, (H - mT - mB) / h), 0.05, 4);
  const x0 = mL + (W - mL - mR - Lm * s) / 2, y0 = mT;
  const X = (mm: number) => x0 + mm * s, Y = (mm: number) => y0 + mm * s;
  const yb = h > 2 * (30 + ds) ? h - 30 - ds / 2 : h / 2;           // schematisch: bij de onderrand
  const posities: number[] = [];
  if (ds > 0 && sp > 0) for (let x = sp / 2; x <= Lm && posities.length < 200; x += sp) posities.push(x);
  const eerste = posities[0] ?? 0;
  return (
    <>
      <svg width={W} height={H} className="vd-svg">
        <Defs k="bs" />
        <rect x={x0} y={y0} width={Lm * s} height={h * s} fill={betonFill("bs")} stroke="#6b7280" strokeWidth={1.2} />
        {posities.map((x, i) => (
          <circle key={i} cx={X(x)} cy={Y(yb)} r={Math.max(1.8, (ds / 2) * s)} fill={STAAL} stroke="#111827" strokeWidth={0.6} />
        ))}
        {posities.length > 1 && <HDim k="bs" x0={X(eerste)} x1={X(eerste + sp)} y={y0 - 16} ext={Y(yb) - 4} />}
        {smax !== undefined && posities.length > 0 && (
          <g stroke="#b45309" strokeWidth={1.2} strokeDasharray="6 3">
            <line x1={X(eerste)} y1={y0 - 38} x2={X(Math.min(eerste + smax, Lm))} y2={y0 - 38} />
            <line x1={X(Math.min(eerste + smax, Lm))} y1={y0 - 44} x2={X(Math.min(eerste + smax, Lm))} y2={y0 - 32} />
          </g>
        )}
        <HDim k="bs" x0={x0} x1={X(Lm)} y={Y(h) + 26} ext={Y(h) + 4} />
      </svg>
      {posities.length > 1 && <Ro text={`s=${fmt(sp)}`} x={X(eerste + sp / 2)} y={y0 - 16} kleur="#1d4ed8" title="h.o.h. van de getoetste staven" />}
      {smax !== undefined && posities.length > 0 && (
        <Ro text={`smax=${fmt(smax)}`} x={X(Math.min(eerste + smax, Lm)) + 34} y={y0 - 38} kleur="#b45309" title="grootste h.o.h. uit het blad" />
      )}
      <Ro text="1000 mm" x={X(Lm / 2)} y={Y(h) + 26} />
      <Dim ctx={ctx} name="h_el" value={d("h_el")} x={x0 - 22} y={Y(h / 2)} step={10} label="h" />
      {ds > 0 && <Ro text={`Ø${fmt(ds)}`} x={X(eerste) + 4} y={Y(yb) + 18} title="getoetste staaf" />}
    </>
  );
}

function Balk({ ctx, g, W, H }: { ctx: DesignerCtx; g: Record<string, number>; W: number; H: number }) {
  const { d } = ctx;
  const b = Math.max(60, d("b_el")), h = Math.max(60, d("h_el"));
  const c = Math.max(0, d("c_dek")), tb = Math.max(0, d("ds_bgl"));
  const eigen = d("ds_kz") > 0;
  const ds = g.ds_g ?? (eigen ? d("ds_kz") : 0);
  const n = Math.round(g.n_g ?? (eigen ? d("n_kz") : 0));
  const mL = 70, mR = 120, mT = 30, mB = 60;
  const s = clamp(Math.min((W - mL - mR) / b, (H - mT - mB) / h), 0.05, 4);
  const x0 = mL + (W - mL - mR - b * s) / 2, y0 = mT;
  const X = (mm: number) => x0 + mm * s, Y = (mm: number) => y0 + mm * s;
  // Hart van een hoekstaaf vanaf de rand: in de buiging van de beugel (zie Hoek).
  const hoek = Math.max(c + tb + ds / 2, tb > 0 ? c + 3 * tb - (2 * tb - ds / 2) / Math.SQRT2 : 0);
  const yb = h - hoek;
  const xs = n <= 0 || ds <= 0 ? [] : n === 1 ? [b / 2]
    : Array.from({ length: n }, (_, i) => hoek + ((b - 2 * hoek) * i) / (n - 1));
  const vrij = n > 1 ? (b - 2 * hoek) / (n - 1) - ds : undefined;
  const amin = Math.max(ds, d("d_g") + 5, 20);
  const rr = Math.max(2, 2.5 * tb * s);
  return (
    <>
      <svg width={W} height={H} className="vd-svg">
        <Defs k="bb" />
        <rect x={x0} y={y0} width={b * s} height={h * s} fill={betonFill("bb")} stroke="#6b7280" strokeWidth={1.4} />
        {tb > 0 && (
          <rect x={X(c + tb / 2)} y={Y(c + tb / 2)} width={(b - 2 * c - tb) * s} height={(h - 2 * c - tb) * s}
            rx={rr} ry={rr} fill="none" stroke={BEUGEL} strokeWidth={Math.max(1.4, tb * s)} />
        )}
        {xs.map((x, i) => (
          <circle key={i} cx={X(x)} cy={Y(yb)} r={Math.max(2, (ds / 2) * s)} fill={STAAL} stroke="#111827" strokeWidth={0.8} />
        ))}
        <HDim k="bb" x0={x0} x1={X(b)} y={Y(h) + 28} ext={Y(h) + 6} />
        <VDim k="bb" y0={y0} y1={Y(h)} x={x0 - 30} ext={x0 - 6} />
        {xs.length > 1 && vrij !== undefined && (
          <line x1={X(xs[0] + ds / 2)} y1={Y(yb) - 16} x2={X(xs[1] - ds / 2)} y2={Y(yb) - 16}
            stroke={eisKleur(vrij, amin)} strokeWidth={1.4} />
        )}
      </svg>
      <Dim ctx={ctx} name="b_el" value={d("b_el")} x={X(b / 2)} y={Y(h) + 28} step={10} label="b" />
      <Dim ctx={ctx} name="h_el" value={d("h_el")} x={x0 - 30} y={Y(h / 2)} step={10} label="h" />
      {n > 0 && ds > 0 && <Ro text={`${n}Ø${fmt(ds)}`} x={X(b) + 50} y={Y(yb)} title="getoetste staven" />}
      {xs.length > 1 && vrij !== undefined && (
        <Ro text={`a=${fmt(vrij)} ≥ ${fmt(amin)}`} x={X((xs[0] + xs[1]) / 2)} y={Y(yb) - 30} kleur={eisKleur(vrij, amin)}
          title="vrije ruimte tussen de staven tegen a_min (8.2(2))" />
      )}
    </>
  );
}

// ── 3. Wandwapening: horizontale doorsnede over 1 m ─────────────────────────

function Wand({ ctx, g, W, H }: { ctx: DesignerCtx; g: Record<string, number>; W: number; H: number }) {
  const { d } = ctx;
  const h = Math.max(40, d("h_el"));
  const c = Math.max(0, d("c_dek"));
  const dv = Math.max(4, d("ds_v")), sv = Math.max(20, d("s_v"));
  const dh = Math.max(4, d("ds_h"));
  const twee = Math.round(d("netten")) === 2;
  const vertBuiten = Math.round(d("buitenlaag")) === 2;
  const Lm = 1000;
  const mL = 60, mR = 90, mT = 50, mB = 56;
  const s = clamp(Math.min((W - mL - mR) / Lm, (H - mT - mB) / h), 0.05, 4);
  const x0 = mL, y0 = mT + Math.max(0, (H - mT - mB - h * s) / 2);
  const X = (mm: number) => x0 + mm * s, Y = (mm: number) => y0 + mm * s;
  // Diepte van de hartlijnen vanaf het oppervlak.
  const dV = vertBuiten ? c + dv / 2 : c + dh + dv / 2;
  const dH = vertBuiten ? c + dv + dh / 2 : c + dh / 2;
  const netten = twee ? [{ v: dV, h: dH }, { v: h - dV, h: h - dH }] : [{ v: h / 2, h: h / 2 + (vertBuiten ? -1 : 1) * (dv + dh) / 2 }];
  const posities: number[] = [];
  for (let x = sv / 2; x <= Lm && posities.length < 200; x += sv) posities.push(x);
  const nDw = Math.max(0, d("n_dw"));
  const haken = twee && vertBuiten && g.UC_n !== undefined && nDw > 0;
  const stapHaak = haken ? Math.max(sv, Math.round(1000 / Math.sqrt(nDw) / sv) * sv) : 0;
  return (
    <>
      <svg width={W} height={H} className="vd-svg">
        <Defs k="bw" />
        <rect x={x0} y={y0} width={Lm * s} height={h * s} fill={betonFill("bw")} stroke="#6b7280" strokeWidth={1.4} />
        {netten.map((n, k) => (
          <g key={k}>
            <line x1={x0 + 3} y1={Y(n.h)} x2={X(Lm) - 3} y2={Y(n.h)} stroke={BEUGEL} strokeWidth={Math.max(1.3, dh * s)} />
            {posities.map((x, i) => (
              <circle key={i} cx={X(x)} cy={Y(n.v)} r={Math.max(1.8, (dv / 2) * s)} fill={STAAL} stroke="#111827" strokeWidth={0.6} />
            ))}
          </g>
        ))}
        {haken && posities.filter((x) => Math.abs(((x - posities[0]) / stapHaak) - Math.round((x - posities[0]) / stapHaak)) < 1e-6).map((x, i) => (
          <line key={i} x1={X(x)} y1={Y(netten[0].v)} x2={X(x)} y2={Y(netten[1].v)} stroke="#b45309" strokeWidth={1.2} strokeDasharray="3 2" />
        ))}
        {posities.length > 1 && <HDim k="bw" x0={X(posities[0])} x1={X(posities[1])} y={y0 - 16} ext={Y(netten[0].v) - 3} />}
        <VDim k="bw" y0={y0} y1={Y(h)} x={x0 - 26} ext={x0 - 4} />
        {c > 0 && <VDim k="bw" y0={y0} y1={Y(c)} x={X(Lm) - 60} />}
        <HDim k="bw" x0={x0} x1={X(Lm)} y={Y(h) + 26} ext={Y(h) + 4} />
      </svg>
      <Dim ctx={ctx} name="h_el" value={d("h_el")} x={x0 - 26} y={Y(h / 2)} step={10} label="h" />
      {posities.length > 1 && <Dim ctx={ctx} name="s_v" value={d("s_v")} x={X(posities[0] + sv / 2)} y={y0 - 16} step={25} label="s" />}
      {c > 0 && <Dim ctx={ctx} name="c_dek" value={d("c_dek")} x={X(Lm) - 36} y={(y0 + Y(c)) / 2} step={5} label="c" />}
      <Ro text="1000 mm" x={X(Lm / 2)} y={Y(h) + 26} />
      <Ro text={`vert. Ø${fmt(dv)}`} x={X(Lm) + 40} y={Y(netten[0].v) + (twee ? -10 : 12)} title="verticale staven" />
      <Ro text={`hor. Ø${fmt(dh)}`} x={X(Lm) + 40} y={Y(netten[0].h) + (twee ? 12 : -12)} kleur={BEUGEL} title="horizontale staven" />
    </>
  );
}

export default function BetonDetailleringDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;
  const g = uitkomst?.getallen ?? {};
  const onderwerp = clamp(Math.round(d("onderwerp")), 1, 3);
  const toepassing = clamp(Math.round(d("toepassing")), 1, 3);
  const W = box.w, H = Math.max(260, box.h - 24);

  let beeld: ReactElement;
  let titel: string;
  let voet: string;
  if (onderwerp === 1) {
    beeld = <Hoek ctx={ctx} g={g} W={W} H={H} />;
    titel = "Hoek van de doorsnede";
    const mk = MILIEU[clamp(Math.round(d("milieuklasse")), 1, 11) - 1];
    voet = `${mk} · ${KLASSE[clamp(Math.round(d("betonklasse")), 1, 14) - 1]}` +
      (g.S_kl !== undefined ? ` · S${fmt(g.S_kl)}` : "") +
      (g.c_min_dur !== undefined ? ` · c_min,dur = ${fmt(g.c_min_dur)} mm` : "") +
      ` · dekking ${fmt(d("c_dek"))} mm`;
  } else if (onderwerp === 2) {
    beeld = toepassing === 3 ? <Balk ctx={ctx} g={g} W={W} H={H} /> : <Strook ctx={ctx} g={g} W={W} H={H} />;
    titel = toepassing === 3 ? "Balkdoorsnede, één laag" : "Strook van 1 m";
    voet = g.ds_g !== undefined
      ? (toepassing === 3 ? `${fmt(g.n_g ?? 0)}Ø${fmt(g.ds_g)}` : `Ø${fmt(g.ds_g)}–${fmt(g.s_g ?? 0)}`) +
        (d("ds_kz") > 0 ? " (eigen keuze)" : " (lichtste passende keuze)")
      : "geen wapening getoetst";
  } else {
    beeld = <Wand ctx={ctx} g={g} W={W} H={H} />;
    titel = "Horizontale doorsnede, 1 m wand";
    voet = `h = ${fmt(d("h_el"))} mm · vert. Ø${fmt(d("ds_v"))}–${fmt(d("s_v"))} · hor. Ø${fmt(d("ds_h"))}–${fmt(d("s_h"))}` +
      (g.ρ_v !== undefined ? ` · ρ_v = ${fmt(g.ρ_v, 2)} %` : "");
  }

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — beton detaillering" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Onderwerp</span>
          <Keuze label="Onderwerp" naam="onderwerp" waarde={onderwerp} opties={ONDERWERP} set={set} />
          <Getal label="Korrel d_g (mm)" naam="d_g" waarde={d("d_g")} stap={2} set={set} />

          {onderwerp === 1 && (
            <>
              <span className="vd-ctrl-h">Milieu en beton</span>
              <Keuze label="Milieuklasse" naam="milieuklasse" waarde={Math.round(d("milieuklasse"))}
                opties={MILIEU.map((m, i) => ({ v: i + 1, label: m }))} set={set} />
              <Keuze label="Sterkteklasse" naam="betonklasse" waarde={Math.round(d("betonklasse"))}
                opties={KLASSE.map((k, i) => ({ v: i + 1, label: k }))} set={set} />
              <Keuze label="Gestort tegen" naam="ondergrond" waarde={Math.round(d("ondergrond"))} opties={ONDERGROND} set={set} />
              <span className="vd-ctrl-h">Staven</span>
              <Keuze label="Hoofdstaaf" naam="ds_hfd" waarde={d("ds_hfd")} opties={diamOpties(false)} set={set} />
              <Keuze label="Bundel" naam="n_bundel" waarde={Math.round(d("n_bundel"))}
                opties={[1, 2, 3, 4].map((n) => ({ v: n, label: n === 1 ? "afzonderlijk" : `${n} staven` }))} set={set} />
              <Keuze label="Beugel" naam="ds_bgl" waarde={d("ds_bgl")} opties={diamOpties(true)} set={set} />
              <Getal label="Dekking c (mm)" naam="c_dek" waarde={d("c_dek")} stap={5} set={set}
                title="dekking op de buitenste staaf, zoals op de tekening" />
              {g.c_nom_hfd !== undefined && (
                <span className="gd-note">c<sub>nom</sub>: hoofdstaaf {fmt(g.c_nom_hfd, 1)} mm
                  {g.c_nom_bgl !== undefined && <>, beugel {fmt(g.c_nom_bgl, 1)} mm</>}
                  {g.c_ond !== undefined && <>; tegen de ondergrond ten minste {fmt(g.c_ond)} mm</>}.</span>
              )}
            </>
          )}

          {onderwerp === 2 && (
            <>
              <span className="vd-ctrl-h">Element</span>
              <Keuze label="Toepassing" naam="toepassing" waarde={toepassing} opties={TOEPASSING} set={set} />
              <Getal label={toepassing === 3 ? "Hoogte h (mm)" : "Dikte h (mm)"} naam="h_el" waarde={d("h_el")} stap={10} set={set} />
              {toepassing === 3 && (
                <>
                  <Getal label="Breedte b (mm)" naam="b_el" waarde={d("b_el")} stap={10} set={set} />
                  <Getal label="Dekking op beugel (mm)" naam="c_dek" waarde={d("c_dek")} stap={5} set={set} />
                  <Keuze label="Beugel" naam="ds_bgl" waarde={d("ds_bgl")} opties={diamOpties(true)} set={set} />
                </>
              )}
              <span className="vd-ctrl-h">Wapening</span>
              <Getal label={toepassing === 3 ? "Nodig A_s (mm²)" : "Nodig A_s (mm²/m)"} naam="A_nodig" waarde={d("A_nodig")} stap={50} set={set}
                title="0 = alleen de tabel" />
              <Keuze label="Gekozen Ø" naam="ds_kz" waarde={d("ds_kz")}
                opties={[{ v: 0, label: "lichtste" }, ...DIAM.map((x) => ({ v: x, label: `Ø${x}` }))]} set={set} />
              {d("ds_kz") > 0 && (toepassing === 3
                ? <Getal label="Aantal staven" naam="n_kz" waarde={d("n_kz")} stap={1} set={set} />
                : <Getal label="h.o.h. (mm)" naam="s_kz" waarde={d("s_kz")} stap={25} set={set} />)}
              {g.A_s_max !== undefined && g.A_s_max < 1e8 && (
                <span className="gd-note">A<sub>s,max</sub> = {fmt(g.A_s_max)} mm²{toepassing === 3 ? "" : "/m"}
                  {g.s_max !== undefined && <>; s<sub>max</sub> = {fmt(g.s_max)} mm</>}.</span>
              )}
            </>
          )}

          {onderwerp === 3 && (
            <>
              <span className="vd-ctrl-h">Wand</span>
              <Getal label="Dikte h (mm)" naam="h_el" waarde={d("h_el")} stap={10} set={set} />
              <Getal label="Lengte l (m)" naam="l_w" waarde={d("l_w")} stap={0.5} set={set} />
              <Getal label="Dekking c (mm)" naam="c_dek" waarde={d("c_dek")} stap={5} set={set} />
              <Keuze label="Netten" naam="netten" waarde={Math.round(d("netten"))}
                opties={[{ v: 2, label: "twee" }, { v: 1, label: "één" }]} set={set} />
              <span className="vd-ctrl-h">Wapening per net</span>
              <Keuze label="Verticaal Ø" naam="ds_v" waarde={d("ds_v")} opties={diamOpties(false)} set={set} />
              <Getal label="Verticaal h.o.h." naam="s_v" waarde={d("s_v")} stap={25} set={set} />
              <Keuze label="Horizontaal Ø" naam="ds_h" waarde={d("ds_h")} opties={diamOpties(false)} set={set} />
              <Getal label="Horizontaal h.o.h." naam="s_h" waarde={d("s_h")} stap={25} set={set} />
              <Keuze label="Buitenste laag" naam="buitenlaag" waarde={Math.round(d("buitenlaag"))}
                opties={[{ v: 1, label: "horizontaal" }, { v: 2, label: "verticaal" }]} set={set} />
              {g.a_s_v !== undefined && (
                <span className="gd-note">A<sub>s,v</sub> = {fmt(g.a_s_v)} mm²/m
                  {g.A_s_vmax !== undefined && <> ≤ {fmt(g.A_s_vmax)}</>}
                  {g.a_s_h !== undefined && <>; A<sub>s,h</sub> = {fmt(g.a_s_h)} mm²/m</>}.</span>
              )}
            </>
          )}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">{titel}</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              {beeld}
            </div>
          </div>
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.
          <br />Op schaal; {onderwerp === 1 ? "gestippeld de vereiste dekking uit het blad, groen als de ingevulde dekking die haalt."
            : onderwerp === 2 ? "de staven van de getoetste keuze, oranje de grootste h.o.h."
            : "oranje gestippeld de dwarsverbindingen als 9.6.4(2) die vraagt."}</span>
        <span className="vd-live">{voet}</span>
      </div>
    </div>
  );
}
