import type { ReactNode } from "react";
import { useDesigner, Dim, Force, Ro, Defs, HDim, VDim, loadMark, fmt, clamp, UitkomstKop } from "./designerKit";
import { useBladUitkomst } from "./bladResultaat";
import "./VoetplaatDesigner.css";

/**
 * Parametrisch beeld bij het blad Houten kap (templates/houtenKap.ts).
 *
 * Per systeem een doorsnede van de kap op schaal:
 *   • sporen op muurplaat en nokgording, met of zonder knieschot: beide
 *     dakvlakken, de doorgerekende spoor links, het vaste scharnier op de
 *     muurplaat en bovenin de horizontale of schuine rol;
 *   • het A-spant met de trekband of hanenbalk, scharnier in de nok, vast
 *     scharnier links en een horizontale rol rechts;
 *   • de spoor van een lessenaardak tussen de lage en de hoge muurplaat;
 *   • de hoekkeper in het grondvlak met de aansluitende sporen, en in aanzicht
 *     met de driehoekig verlopende last.
 * De lasten staan als pijlen: verticaal (eigen gewicht en sneeuw), loodrecht op
 * het loefvlak (wind) en de puntlast. De labels in de doorsnede (lasten, hoek,
 * knieschot, hanenbalk) kiezen elk uit een paar plaatsen de plaats die binnen
 * de tekening blijft en geen ander label bedekt (plaatsLabels).
 *
 * Het beeld rekent de toetsing niet na: de kop toont de maatgevende UC en het
 * oordeel van het blad, de voetregel de afzonderlijke toetsen uit dezelfde
 * uitwerking.
 */
const MARKER = "Houten kap";

const DEFAULTS: Record<string, number> = {
  systeem: 1, rol: 1, puntlast: 1, sterkteklasse: 2, klimaatklasse: 1, ligging: 1, wmax_eis: 1,
  α_dak: 40, l_h: 4, a_hoh: 0.6, l_ks: 2, z_hb: 0,
  b_sp: 71, h_sp: 196, a_opl: 70, a_nok: 70, t_keep: 25, l_st: 0.3, l_so: 0,
  g_opb: 0.6, F_G: 0.5, F_Q: 2, x_F: 1.5, h_geb: 9, b_geb: 12,
};

const SYSTEMEN = [
  { v: 1, label: "Sporen op muurplaat en nokgording" },
  { v: 2, label: "Sporen met een knieschot" },
  { v: 3, label: "A-spant met trekband of hanenbalk" },
  { v: 4, label: "Sporen van een lessenaardak" },
  { v: 5, label: "Hoekkeper (schild- of piramidedak)" },
];
const STERKTE = ["C18", "C24", "C30", "GL24h", "GL28h"];

const HOUT = "#E3C08A";
const HOUTRAND = "#8B6F47";
const WIND = "#2563eb";
const SNEEUW = "#64748b";

/** Eén unity check uit het blad, gekleurd naar de uitkomst. */
function UcChip({ naam, uc }: { naam: string; uc: number | undefined }) {
  if (uc === undefined || !Number.isFinite(uc)) return <span className="vd-uc-nvt">{naam} —</span>;
  const staat = uc > 1 ? "bad" : uc > 0.9 ? "warn" : "ok";
  return <span className={`vd-uc-chip ${staat}`}>{naam} {fmt(uc, 2)}</span>;
}

type P = { x: number; y: number };

/** Balk als vlak tussen twee punten, met een hoogte naar de binnenkant van het dak. */
function balk(a: P, b: P, dikte: number, kleur = HOUT, rand = HOUTRAND, opacity = 1): ReactNode {
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
  // normaal naar beneden (schermcoördinaten: y omlaag)
  const nx = -dy / l, ny = dx / l;
  const t = ny < 0 ? -1 : 1;
  const ox = nx * t * dikte, oy = ny * t * dikte;
  return (
    <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${b.x + ox},${b.y + oy} ${a.x + ox},${a.y + oy}`}
      fill={kleur} stroke={rand} strokeWidth={1} opacity={opacity} />
  );
}

/** Vast scharnier onder een punt. */
function scharnier(p: P, s = 9): ReactNode {
  return (
    <g>
      <path d={`M ${p.x} ${p.y} l ${-s} ${s * 1.5} h ${2 * s} Z`} fill="#fbbf24" stroke="#92400e" strokeWidth={1.2} />
      <line x1={p.x - s * 1.4} y1={p.y + s * 1.5} x2={p.x + s * 1.4} y2={p.y + s * 1.5} stroke="#92400e" strokeWidth={1.2} />
    </g>
  );
}

/** Rol: de reactie staat onder hoek `hoek` (graden, 0 = verticaal omhoog). */
function rol(p: P, hoek = 0, s = 8): ReactNode {
  return (
    <g transform={`rotate(${hoek} ${p.x} ${p.y})`}>
      <path d={`M ${p.x} ${p.y} l ${-s} ${s * 1.3} h ${2 * s} Z`} fill="#fbbf24" stroke="#92400e" strokeWidth={1.2} />
      <circle cx={p.x - s * 0.5} cy={p.y + s * 1.3 + 2.6} r={2.4} fill="#fbbf24" stroke="#92400e" strokeWidth={1} />
      <circle cx={p.x + s * 0.5} cy={p.y + s * 1.3 + 2.6} r={2.4} fill="#fbbf24" stroke="#92400e" strokeWidth={1} />
      <line x1={p.x - s * 1.4} y1={p.y + s * 1.3 + 5.4} x2={p.x + s * 1.4} y2={p.y + s * 1.3 + 5.4} stroke="#92400e" strokeWidth={1.2} />
    </g>
  );
}

/** Pijl als lijnstuk van staart naar punt. */
type Pijl = { i: number; van: P; naar: P };

/** Verticale pijlen boven een staaf van a naar b; `lengte(t)` geeft de pijllengte op fractie t. */
function verticalePijlen(a: P, b: P, n: number, lengte: (t: number) => number): Pijl[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - 6;
    return { i, van: { x, y: y - lengte(t) }, naar: { x, y } };
  }).filter((p) => p.naar.y - p.van.y >= 3);
}

function verticaleLast(k: string, a: P, b: P, n: number, lengte: (t: number) => number, kleur: string): ReactNode {
  return (
    <g>
      {verticalePijlen(a, b, n, lengte).map((p) => (
        <line key={`${k}${p.i}`} x1={p.van.x} y1={p.van.y} x2={p.naar.x} y2={p.naar.y} stroke={kleur} strokeWidth={1.4} markerEnd={loadMark(k)} opacity={0.8} />
      ))}
    </g>
  );
}

/** Eenheidsnormaal op de staaf van a naar b, naar buiten (omhoog op het scherm). */
function normaalBuiten(a: P, b: P): P {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  return ny > 0 ? { x: -nx, y: -ny } : { x: nx, y: ny };
}

/** Pijlen loodrecht op een staaf, naar het dak toe (druk). */
function windPijlen(a: P, b: P, n: number, l: number): Pijl[] {
  const dx = b.x - a.x, dy = b.y - a.y;
  const nb = normaalBuiten(a, b);
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const x = a.x + dx * t + nb.x * 8, y = a.y + dy * t + nb.y * 8;
    return { i, van: { x: x + nb.x * l, y: y + nb.y * l }, naar: { x, y } };
  });
}

function windLast(k: string, a: P, b: P, n: number, l: number): ReactNode {
  return (
    <g>
      {windPijlen(a, b, n, l).map((p) => (
        <line key={`w${p.i}`} x1={p.van.x} y1={p.van.y} x2={p.naar.x} y2={p.naar.y} stroke={WIND} strokeWidth={1.6} markerEnd={loadMark(k)} />
      ))}
    </g>
  );
}

// ── labels zonder overlap ───────────────────────────────────────────────────
/** Rechthoek op het scherm. */
type Vak = { x0: number; y0: number; x1: number; y1: number };
/** Een label staat met zijn midden op (x, y): de chips in designerKit schuiven -50%/-50%. */
const vakRond = (c: P, w: number, h: number): Vak => ({ x0: c.x - w / 2, y0: c.y - h / 2, x1: c.x + w / 2, y1: c.y + h / 2 });
const vakLijn = (a: P, b: P, m: number): Vak => ({
  x0: Math.min(a.x, b.x) - m, y0: Math.min(a.y, b.y) - m, x1: Math.max(a.x, b.x) + m, y1: Math.max(a.y, b.y) + m,
});
const overlap = (a: Vak, b: Vak) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** Breedte van een chip (Dim of Ro, 11 px vet) en van een krachtlabel (Force, 12 px met een kleine eenheid); gemeten in de app. */
const breedteChip = (tekst: string) => 8 + 6.6 * tekst.length;
const breedteKracht = (tekst: string, eenheid: string) => 8 + 7.4 * tekst.length + 5.4 * eenheid.length;
const HOOGTE_CHIP = 21;   // Dim en Force: een knop
const HOOGTE_RO = 17;

type Kandidaat = P & { kost: number };
type Label = { w: number; h: number; kandidaten: Kandidaat[] };
type Hindernis = { vak: Vak; gewicht: number };

/**
 * Zet elk label, in volgorde, op de kandidaat met de laagste kosten: buiten de
 * tekening vallen weegt het zwaarst, dan een eerder geplaatst label, dan de
 * tekening zelf (staven, pijlen), en tot slot de voorkeur van de kandidaat.
 */
function plaatsLabels(W: number, H: number, vast: Vak[], hindernissen: Hindernis[], labels: Label[]): P[] {
  const geplaatst = [...vast];
  return labels.map((l) => {
    let beste: P = l.kandidaten[0];
    let laagst = Infinity;
    for (const c of l.kandidaten) {
      const v = vakRond(c, l.w, l.h);
      const buiten = Math.max(0, 2 - v.x0) + Math.max(0, v.x1 - (W - 2)) + Math.max(0, 2 - v.y0) + Math.max(0, v.y1 - (H - 2));
      let kost = c.kost + buiten * 10000;
      // Met wat lucht: twee labels die elkaar net raken, lezen als één.
      const ruim = { x0: v.x0 - 3, y0: v.y0 - 2, x1: v.x1 + 3, y1: v.y1 + 2 };
      for (const g of geplaatst) kost += overlap(ruim, g) * 100;
      for (const o of hindernissen) kost += overlap(v, o.vak) * o.gewicht;
      if (kost < laagst) { laagst = kost; beste = c; }
    }
    geplaatst.push(vakRond(beste, l.w, l.h));
    return beste;
  });
}

export default function HoutenKapDesigner() {
  const ctx = useDesigner(MARKER, DEFAULTS);
  // Vóór de vroege return: de volgorde van de hooks moet vast liggen.
  const uitkomst = useBladUitkomst();
  if (!ctx.actief) return null;
  const { d, set, box, wrapRef } = ctx;
  const g = uitkomst?.getallen ?? {};
  const num = (e: { target: { value: string } }) => parseFloat(e.target.value.replace(",", "."));

  const sys = clamp(Math.round(d("systeem")), 1, 5);
  const rolType = Math.round(d("rol"));
  const punt = Math.round(d("puntlast"));
  const alpha = clamp(d("α_dak"), 1, 75);
  const ar = (alpha * Math.PI) / 180;
  const lh = Math.max(0.5, d("l_h"));
  const hNok = lh * Math.tan(ar);
  const lks = clamp(d("l_ks"), 0.1 * lh, 0.9 * lh);
  const zhb = clamp(d("z_hb"), 0, 0.8 * hNok);
  const hSp = Math.max(20, d("h_sp")) / 1000;

  // ── layout ────────────────────────────────────────────────────────────────
  const capH = 24;
  const W = box.w;
  const H = clamp(box.h - capH - 20, 240, 520);

  const veld = (naam: string, label: ReactNode, step: number, title?: string) => (
    <label key={naam} title={title}>{label}
      <input type="number" step={step} value={d(naam)} onChange={(e) => set(naam, num(e))} />
    </label>
  );
  const keuze = (naam: string, label: string, opties: { v: number; label: string }[]) => (
    <label style={{ flexDirection: "column", alignItems: "stretch" }}>{label}
      <select style={{ width: "100%", flex: "0 0 auto" }} value={Math.round(d(naam))} onChange={(e) => set(naam, parseInt(e.target.value))}>
        {opties.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  );

  // ── tekening: zadeldak, A-spant en lessenaardak ──────────────────────────
  function tekenDoorsnede() {
    const breed = sys === 4 ? lh : 2 * lh;
    const marge = 0.18 * breed + 0.4;
    // Verticaal in pixels: boven de top ruimte voor de lastpijlen en hun labels,
    // onder de voet voor de maatlijnen (bij het knieschot twee rijen). In meters
    // gerekend werd die ruimte bij een flauw dak te krap.
    const KOP = 80;
    const RIJ_KS = 20;
    const RIJ_L = sys === 2 ? 46 : 26;
    const s = Math.min((W - 90) / (breed + 2 * marge), (H - KOP - RIJ_L - 16) / Math.max(hNok, 0.3));
    const x0 = (W - breed * s) / 2;
    const X = (x: number) => x0 + x * s;
    const Z = (z: number) => KOP + (hNok - z) * s;
    const dik = Math.max(5, hSp * s);
    const dikV = dik / Math.cos(ar);   // dikte van de spoor, verticaal gemeten
    const voetL: P = { x: X(0), y: Z(0) };
    const top: P = { x: X(lh), y: Z(hNok) };
    const voetR: P = { x: X(2 * lh), y: Z(0) };
    const xRechts = X(sys === 4 ? lh : 2 * lh);
    const lastL = (t: number) => clamp(14 + 18 * (sys === 5 ? t : 1), 0, 40);
    const wand = (x: number) => (
      <rect x={X(x) - 7} y={Z(0) + 2} width={14} height={RIJ_L - 4} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
    );
    // Puntlast, horizontaal vanaf de voet. Q_k bij een knieschot of hanenbalk
    // op de plaats waar het blad mee rekent (x_Q: gezocht, maatgevend voor N+M);
    // bij één veld, of een blad zonder x_Q, midden in het (langste) veld.
    const xQblad = g.x_Q;
    const xQ = punt === 1 && (sys === 2 || (sys === 3 && zhb > 0)) && xQblad !== undefined && Number.isFinite(xQblad)
      ? clamp(xQblad, 0, lh) : undefined;
    const xP = punt === 2 ? clamp(d("x_F"), 0, lh) : xQ !== undefined ? xQ : sys === 2 ? (lks >= lh - lks ? lks / 2 : (lks + lh) / 2)
      : sys === 3 && zhb > 0 ? ((zhb / Math.tan(ar)) >= lh - zhb / Math.tan(ar) ? zhb / Math.tan(ar) / 2 : (zhb / Math.tan(ar) + lh) / 2) : lh / 2;
    const pP: P = { x: X(xP), y: Z(xP * Math.tan(ar)) };
    // Pijl van de puntlast: 70 px, korter als de last zo hoog op de spoor staat dat hij boven het beeld uit zou steken.
    const lP = clamp(pP.y - 6, 30, 70);
    const xHb = zhb / Math.tan(ar);

    // ── labels: elk op een plaats waar het geen ander label en zo min mogelijk tekening bedekt
    const grijs = [...verticalePijlen(voetL, top, 8, lastL), ...(sys === 3 ? verticalePijlen(top, voetR, 8, lastL) : [])];
    const wind = windPijlen(voetL, top, 5, 22);
    const nb = normaalBuiten(voetL, top);
    const hind: Hindernis[] = [];
    const staaf = (a: P, b: P) => {
      for (let k = 0; k <= 24; k++) {
        const x = a.x + ((b.x - a.x) * k) / 24, y = a.y + ((b.y - a.y) * k) / 24;
        hind.push({ vak: { x0: x - 3, y0: y - 1, x1: x + 3, y1: y + dikV + 1 }, gewicht: 6 });
      }
    };
    staaf(voetL, top);
    if (sys !== 4) staaf(top, voetR);
    for (const p of grijs) hind.push({ vak: vakLijn(p.van, p.naar, 4), gewicht: 1.5 });
    for (const p of wind) hind.push({ vak: vakLijn(p.van, p.naar, 3), gewicht: 1.5 });
    if (punt > 0) hind.push({ vak: vakLijn({ x: pP.x, y: pP.y - lP }, { x: pP.x, y: pP.y - 8 }, 4), gewicht: 8 });
    if (sys === 2) hind.push({ vak: { x0: X(lks) - 6, y0: Z(lks * Math.tan(ar)) + dikV, x1: X(lks) + 6, y1: Z(0) }, gewicht: 4 });
    if (sys === 3) {
      hind.push({ vak: { x0: X(xHb), y0: Z(zhb) + dik * 0.6, x1: X(2 * lh - xHb), y1: Z(zhb) + dik * 0.6 + Math.max(4, dik * 0.6) }, gewicht: 4 });
      if (zhb > 0) hind.push({ vak: vakLijn({ x: X(lh), y: Z(zhb) }, { x: X(lh), y: Z(0) }, 2), gewicht: 1 });
    }
    if (sys === 1 || sys === 2) hind.push({ vak: { x0: top.x - 12, y0: top.y + dik, x1: top.x + 12, y1: top.y + dik + 34 }, gewicht: 4 });
    hind.push({ vak: { x0: X(0) - 14, y0: Z(0) + 2, x1: X(0) + 14, y1: Z(0) + dikV + 16 }, gewicht: 4 });
    for (let k = 0; k <= 6; k++) {
      const h = (ar * k) / 6;
      hind.push({ vak: vakRond({ x: X(0) + 34 * Math.cos(h), y: Z(0) - 34 * Math.sin(h) }, 4, 4), gewicht: 2 });
    }
    // Vast: de maten onder de voet en de hoogte rechts.
    const hTekst = `h=${fmt(hNok, 2)}`;
    const vast: Vak[] = [
      vakRond({ x: (X(0) + X(lh)) / 2, y: Z(0) + RIJ_L }, breedteChip(`l=${fmt(lh, 2)}`), HOOGTE_CHIP),
      vakRond({ x: xRechts + 34, y: (Z(hNok) + Z(0)) / 2 }, breedteChip(hTekst), HOOGTE_RO),
    ];
    // Bovenkant van de grijze pijlen op scherm-x; een label erboven komt vrij van de pijlen.
    const bandY = (x: number) => {
      const u = clamp((x - X(0)) / s, 0, sys === 3 ? 2 * lh : lh);
      return Z((u <= lh ? u : 2 * lh - u) * Math.tan(ar)) - 6 - lastL(0);
    };
    const boven = (cx: number, w: number, h: number) =>
      Math.min(bandY(cx - w / 2), bandY(cx + w / 2), cx - w / 2 < top.x && top.x < cx + w / 2 ? bandY(top.x) : Infinity) - h / 2 - 3;
    const labels: { naam: string; label: Label }[] = [];
    if (sys === 2) {
      // Op de maatlijn van het knieschot, zo nodig naar rechts, vrij van de oplegging aan de voet.
      const w = breedteChip(`lks=${fmt(lks, 2)}`), h = HOOGTE_CHIP, y = Z(0) + RIJ_KS;
      labels.push({ naam: "lks", label: { w, h, kandidaten: [
        { x: (X(0) + X(lks)) / 2, y, kost: 0 },
        { x: Math.max((X(0) + X(lks)) / 2, X(0) + 16 + w / 2), y, kost: 1 },
        { x: X(lks) + 4 + w / 2, y, kost: 3 },
      ] } });
    }
    if (punt > 0) {
      const w = punt === 2 ? breedteKracht(`F_Q=${fmt(d("F_Q"), 1)}`, "kN") : breedteChip("Q_k = 2 kN");
      const h = punt === 2 ? HOOGTE_CHIP : HOOGTE_RO;
      const ay = pP.y - lP;
      labels.push({ naam: "q", label: { w, h, kandidaten: [
        { x: pP.x + 6 + w / 2, y: ay + h / 2, kost: 0 },
        { x: pP.x - 6 - w / 2, y: ay + h / 2, kost: 5 },
        { x: pP.x, y: ay - h / 2 - 2, kost: 10 },
        { x: pP.x + 6 + w / 2, y: ay + 1.5 * h + 4, kost: 15 },
        { x: pP.x - 6 - w / 2, y: ay + 1.5 * h + 4, kost: 20 },
      ] } });
    }
    {
      const w = breedteChip("wind"), h = HOOGTE_RO;
      const uit = (w / 2) * Math.abs(nb.x) + (h / 2) * Math.abs(nb.y) + 3;
      labels.push({ naam: "wind", label: { w, h, kandidaten: [2, 1, 3, 0, 4].flatMap((i, j) => [0, 12, 24].map((extra) => ({
        x: wind[i].van.x + nb.x * (uit + extra), y: wind[i].van.y + nb.y * (uit + extra), kost: 2 * j + extra / 2,
      }))) } });
    }
    {
      const w = breedteKracht(`g=${fmt(d("g_opb"), 2)}`, "kN/m²"), h = HOOGTE_CHIP;
      const kandidaten: Kandidaat[] = [];
      // Boven de belaste spoor; lukt dat niet, links van de voet of boven de andere spoor.
      for (const t of [0.3, 0.2, 0.4, 0.1, 0.5, 0.6, 0, 0.7, 0.8, 0.9, -0.15, ...(sys === 4 ? [] : [1.1, 1.3, 1.5, 1.7, 1.9])]) {
        for (const r of [0, 1, 2]) {
          const x = X(t * lh);
          kandidaten.push({ x, y: boven(x, w, h) - r * (h + 4), kost: Math.abs(t - 0.3) * 20 + r * 6 });
        }
      }
      labels.push({ naam: "g", label: { w, h, kandidaten } });
    }
    {
      const w = breedteChip(`α=${fmt(alpha, 0)}`), h = HOOGTE_CHIP;
      const bis = ar / 2;
      const he = (w / 2) * Math.cos(bis) + (h / 2) * Math.sin(bis) + 2;
      const kandidaten: Kandidaat[] = [{ x: X(0) + 58, y: Z(0) - 14, kost: 0 }];
      for (const r of [0, 12, 24]) kandidaten.push({ x: X(0) + Math.cos(bis) * (34 + he + r), y: Z(0) - Math.sin(bis) * (34 + he + r), kost: 1 + r / 6 });
      for (const dx of [0, 14, 28, 42]) kandidaten.push({ x: X(0) + 36 + w / 2 + dx, y: Z(0) - h / 2 - 1, kost: 4 + dx / 7 });
      kandidaten.push({ x: X(0) - 16 - w / 2, y: Z(0) - h / 2 - 1, kost: 14 });   // buiten de hoek, links van de voet
      labels.push({ naam: "alpha", label: { w, h, kandidaten } });
    }
    if (sys === 3) {
      const w = breedteChip(`z=${fmt(zhb, 2)}`), h = HOOGTE_CHIP;
      const zm = zhb > 0 ? (Z(zhb) + Z(0)) / 2 : Z(0) - 12;
      const laag = Z(0) - h / 2 - 3;
      labels.push({ naam: "z", label: { w, h, kandidaten: [
        { x: X(lh) + 34, y: zm, kost: 0 },
        { x: X(lh) + 6 + w / 2, y: zm, kost: 1 },
        { x: X(lh) - 6 - w / 2, y: zm, kost: 2 },
        { x: X(lh) + 6 + w / 2, y: laag, kost: 3 },
        { x: X(lh) - 6 - w / 2, y: laag, kost: 4 },
        { x: X(lh), y: laag, kost: zhb > 0 ? 6 : 0.5 },
        { x: X(lh) + 6 + w / 2, y: Z(0) + dik * 1.2 + h / 2 + 3, kost: zhb > 0 ? 7 : 1 },
        { x: X(1.5 * lh), y: Z(0) + dik * 1.2 + h / 2 + 3, kost: zhb > 0 ? 8 : 2 },
      ] } });
    }
    const plekken = plaatsLabels(W, H, vast, hind, labels.map((l) => l.label));
    const plek = (naam: string): P => plekken[labels.findIndex((l) => l.naam === naam)] ?? { x: -999, y: -999 };

    return (
      <div className="vd-canvas">
        <div className="vd-caption">Doorsnede — {SYSTEMEN.find((o) => o.v === sys)?.label.toLowerCase()}</div>
        <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
          <svg width={W} height={H} className="vd-svg">
            <Defs k="kp" />
            {/* peil van de voet */}
            <line x1={X(-marge)} y1={Z(0)} x2={X(breed + marge)} y2={Z(0)} stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="6 4" />
            {/* wanden onder de muurplaten; bij het lessenaardak een hoge wand */}
            {wand(0)}
            {sys === 4 ? <rect x={X(lh) - 7} y={Z(hNok) + 2} width={14} height={hNok * s + RIJ_L - 4} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} /> : wand(2 * lh)}
            {/* de andere spoor (lichter), behalve bij het lessenaardak */}
            {sys !== 4 && balk(top, voetR, dik, HOUT, HOUTRAND, sys === 3 ? 1 : 0.35)}
            {/* de doorgerekende spoor */}
            {balk(voetL, top, dik)}
            {/* knieschot */}
            {sys === 2 && (
              <rect x={X(lks) - 5} y={Z(lks * Math.tan(ar)) + dikV} width={10}
                height={Math.max(4, Z(0) - Z(lks * Math.tan(ar)) - dikV)} fill={HOUT} stroke={HOUTRAND} strokeWidth={1} />
            )}
            {/* trekband of hanenbalk */}
            {sys === 3 && (
              <rect x={X(xHb)} y={Z(zhb) + dik * 0.6} width={(2 * lh - 2 * xHb) * s} height={Math.max(4, dik * 0.6)}
                fill={HOUT} stroke={HOUTRAND} strokeWidth={1} strokeDasharray={zhb > 0 ? undefined : "4 2"} />
            )}
            {/* nokgording of scharnier in de nok */}
            {(sys === 1 || sys === 2) && <rect x={top.x - 8} y={top.y + dik} width={16} height={16} fill={HOUT} stroke={HOUTRAND} strokeWidth={1} />}
            {sys === 3 && <circle cx={top.x} cy={top.y + dik / 2} r={4} fill="#fff" stroke="#374151" strokeWidth={1.4} />}
            {/* opleggingen */}
            {scharnier({ x: voetL.x, y: voetL.y + dikV })}
            {sys === 3 && rol({ x: voetR.x, y: voetR.y + dikV })}
            {(sys === 1 || sys === 2) && rol({ x: top.x, y: top.y + dik + 16 }, rolType === 2 ? -alpha : 0, 6)}
            {sys === 4 && rol({ x: top.x, y: top.y + dikV }, rolType === 2 ? -alpha : 0)}
            {/* lasten: verticaal (eigen gewicht, sneeuw) en wind op het loefvlak */}
            {verticaleLast("kp", voetL, top, 8, lastL, SNEEUW)}
            {sys === 3 && verticaleLast("kp", top, voetR, 8, lastL, SNEEUW)}
            {windLast("kpw", voetL, top, 5, 22)}
            {punt > 0 && <line x1={pP.x} y1={pP.y - lP} x2={pP.x} y2={pP.y - 8} className="vd-load" strokeWidth={2.6} markerEnd={loadMark("kp")} />}
            {/* maten */}
            <HDim k="kp" x0={X(0)} x1={X(lh)} y={Z(0) + RIJ_L} ext={Z(0) + 4} />
            <VDim k="kp" y0={Z(hNok)} y1={Z(0)} x={xRechts + 34} ext={xRechts + 10} />
            {sys === 2 && <HDim k="kp" x0={X(0)} x1={X(lks)} y={Z(0) + RIJ_KS} ext={Z(0) + 6} />}
            {sys === 3 && zhb > 0 && <VDim k="kp" y0={Z(zhb)} y1={Z(0)} x={X(lh)} ext={X(lh)} />}
            {/* hoek bij de voet */}
            <path d={`M ${X(0) + 34} ${Z(0)} A 34 34 0 0 0 ${X(0) + 34 * Math.cos(ar)} ${Z(0) - 34 * Math.sin(ar)}`} fill="none" stroke="#6b7280" strokeWidth={1} />
          </svg>
          <Dim ctx={ctx} name="l_h" value={lh} x={(X(0) + X(lh)) / 2} y={Z(0) + RIJ_L} step={0.1} label="l" dec={2} />
          <Dim ctx={ctx} name="α_dak" value={alpha} x={plek("alpha").x} y={plek("alpha").y} step={1} label="α" dec={0} title="dakhelling in graden — klik om te wijzigen" />
          <Ro text={hTekst} x={xRechts + 34} y={(Z(hNok) + Z(0)) / 2} title="hoogte van de top boven de voet" />
          {sys === 2 && <Dim ctx={ctx} name="l_ks" value={lks} x={plek("lks").x} y={plek("lks").y} step={0.1} label="lks" dec={2} />}
          {sys === 3 && <Dim ctx={ctx} name="z_hb" value={zhb} x={plek("z").x} y={plek("z").y} step={0.1} label="z" dec={2}
            title="hoogte van de trekband of hanenbalk boven de voet — klik om te wijzigen" />}
          <Force ctx={ctx} name="g_opb" value={d("g_opb")} x={plek("g").x} y={plek("g").y} unit="kN/m²" label="g" step={0.05} dec={2} />
          {punt === 2 && <Force ctx={ctx} name="F_Q" value={d("F_Q")} x={plek("q").x} y={plek("q").y} unit="kN" label="F_Q" step={0.5} dec={1} />}
          {punt === 1 && <Ro text="Q_k = 2 kN" x={plek("q").x} y={plek("q").y} kleur="#dc2626"
            title={xQ !== undefined
              ? `onderhoudslast op de ongunstigste plaats uit het blad: ${fmt(xQ, 2)} m horizontaal vanaf de voet (maatgevend voor N+M)`
              : "onderhoudslast, midden in het veld"} />}
          <Ro text="wind" x={plek("wind").x} y={plek("wind").y} kleur={WIND} />
        </div>
      </div>
    );
  }

  // ── tekening: hoekkeper ───────────────────────────────────────────────────
  function tekenHoekkeper() {
    const T = Math.SQRT2 * lh;
    const beta = Math.atan(Math.tan(ar) / Math.SQRT2);
    const Lm = T / Math.cos(beta);
    const HG = Math.min(H * 0.55, 300);
    const s1 = Math.min((W / 2 - 50) / (lh * 1.3), (HG - 40) / (lh * 1.3));
    const px = (x: number) => 30 + x * s1, py = (y: number) => HG - 20 - y * s1;
    const hoh = Math.max(0.3, lh / 6);
    const sporen = Array.from({ length: Math.floor(lh / hoh) }, (_, i) => (i + 1) * hoh).filter((u) => u < lh);
    // aanzicht: de hoekkeper op schaal met de driehoekige last
    const HA = H - HG;
    const s2 = Math.min((W - 80) / T, (HA - 50) / Math.max(0.5, lh * Math.tan(ar)));
    const ax = (x: number) => 40 + x * s2, ay = (z: number) => HA - 20 - z * s2;
    const a: P = { x: ax(0), y: ay(0) }, b: P = { x: ax(T), y: ay(T * Math.tan(beta)) };
    return (
      <>
        <div className="vd-canvas">
          <div className="vd-caption">Grondvlak — hoek van het schilddak, hoekkeper onder 45°</div>
          <div className="vd-stage" style={{ width: W, height: HG, background: "transparent", border: "none", borderRadius: 0 }}>
            <svg width={W} height={HG} className="vd-svg">
              <Defs k="kh" />
              {/* gevels */}
              <line x1={px(0)} y1={py(0)} x2={px(lh * 1.25)} y2={py(0)} stroke="#374151" strokeWidth={2.2} />
              <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(lh * 1.25)} stroke="#374151" strokeWidth={2.2} />
              {/* nok evenwijdig aan de lange gevel */}
              <line x1={px(lh)} y1={py(lh)} x2={px(lh * 1.25)} y2={py(lh)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 4" />
              <line x1={px(lh)} y1={py(lh)} x2={px(lh)} y2={py(lh * 1.25)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 4" />
              {/* aansluitende sporen van beide dakvlakken */}
              {sporen.map((u) => (
                <g key={u}>
                  <line x1={px(u)} y1={py(0)} x2={px(u)} y2={py(u)} stroke={HOUTRAND} strokeWidth={1.2} />
                  <line x1={px(0)} y1={py(u)} x2={px(u)} y2={py(u)} stroke={HOUTRAND} strokeWidth={1.2} />
                </g>
              ))}
              {/* belaste strook van de hoekkeper: tot halverwege de sporen */}
              <polygon points={`${px(0)},${py(0)} ${px(lh)},${py(lh / 2)} ${px(lh)},${py(lh)} ${px(lh / 2)},${py(lh)}`} fill="#fde68a" opacity={0.45} />
              <line x1={px(0)} y1={py(0)} x2={px(lh)} y2={py(lh)} stroke="#B45309" strokeWidth={4} />
              <HDim k="kh" x0={px(0)} x1={px(lh)} y={py(0) + 14} ext={py(0) + 2} />
            </svg>
            <Dim ctx={ctx} name="l_h" value={lh} x={(px(0) + px(lh)) / 2} y={py(0) + 14} step={0.1} label="l" dec={2} />
            <Ro text="hoekkeper" x={px(lh * 0.55) + 44} y={py(lh * 0.55) + 6} kleur="#B45309" />
          </div>
        </div>
        <div className="vd-canvas">
          <div className="vd-caption">Aanzicht van de hoekkeper — last nul bij de hoek, het grootst bij de nok</div>
          <div className="vd-stage" style={{ width: W, height: HA, background: "transparent", border: "none", borderRadius: 0 }}>
            <svg width={W} height={HA} className="vd-svg">
              <Defs k="kv" />
              {verticaleLast("kv", a, b, 10, (t) => 4 + 34 * t, SNEEUW)}
              {balk(a, b, Math.max(5, hSp * s2), HOUT)}
              {scharnier({ x: a.x, y: a.y + Math.max(5, hSp * s2) })}
              {rol({ x: b.x, y: b.y + Math.max(5, hSp * s2) }, rolType === 2 ? -(beta * 180) / Math.PI : 0)}
              <HDim k="kv" x0={a.x} x1={ax(T)} y={HA - 6} ext={a.y + 4} />
            </svg>
            <Ro text={`L=${fmt(Lm, 2)} m, β=${fmt((beta * 180) / Math.PI, 1)}°`} x={(a.x + b.x) / 2 + 40} y={(a.y + b.y) / 2 + 18} />
            <Ro text={`${fmt(T, 2)} m`} x={(a.x + ax(T)) / 2} y={HA - 6} />
            <Dim ctx={ctx} name="α_dak" value={alpha} x={a.x + 70} y={a.y - 18} step={1} label="α" dec={0} title="helling van de dakvlakken in graden — klik om te wijzigen" />
          </div>
        </div>
      </>
    );
  }

  // ── voetregel ─────────────────────────────────────────────────────────────
  const reactie = sys === 3
    ? <>T<sub>d</sub> = {g.T_d !== undefined ? fmt(g.T_d, 2) : "—"} kN</>
    : <>H<sub>voet,d</sub> = {g.H_voet_d !== undefined ? fmt(g.H_voet_d, 2) : "—"} kN</>;

  return (
    <div className="vd-panel">
      <UitkomstKop titel="Parametrisch beeld — houten kap" uitkomst={uitkomst} />

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        {/* Een lange invoerkolom scrolt zelf, anders loopt ze onder de voetregel door. */}
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Systeem</span>
          {keuze("systeem", "Systeem", SYSTEMEN)}
          {sys !== 3 && keuze("rol", "Oplegging bovenin", [{ v: 1, label: "Horizontale rol" }, { v: 2, label: "Schuine rol" }])}
          <span className="vd-ctrl-h">Geometrie</span>
          {veld("α_dak", <>Helling α (°)</>, 1)}
          {veld("l_h", sys === 5 ? "Gevel tot nok, horizontaal (m)" : "Voet tot top, horizontaal (m)", 0.1)}
          {sys !== 5 && veld("a_hoh", "h.o.h. (m)", 0.05)}
          {sys === 2 && veld("l_ks", "Knieschot vanaf de voet (m)", 0.1)}
          {sys === 3 && veld("z_hb", "Trekband of hanenbalk, hoogte (m)", 0.1, "0 = trekband op voethoogte")}
          <span className="vd-ctrl-h">Doorsnede</span>
          {veld("b_sp", "Breedte b (mm)", 1)}
          {veld("h_sp", "Hoogte h (mm)", 1)}
          {keuze("sterkteklasse", "Sterkteklasse", STERKTE.map((l, i) => ({ v: i + 1, label: l })))}
          {keuze("klimaatklasse", "Klimaatklasse", [1, 2, 3].map((v) => ({ v, label: String(v) })))}
          <span className="vd-ctrl-h">Belastingen</span>
          {veld("g_opb", <>Dakopbouw (kN/m²)</>, 0.05)}
          {keuze("puntlast", "Puntlast", [{ v: 1, label: "Q_k op de ongunstigste plaats" }, { v: 2, label: "Op een vaste plaats" }, { v: 0, label: "Geen puntlast" }])}
          {punt === 2 && veld("F_G", <>F<sub>G</sub> (kN)</>, 0.1)}
          {punt === 2 && veld("F_Q", <>F<sub>Q</sub> (kN)</>, 0.5)}
          {punt === 2 && veld("x_F", "Plaats, horizontaal (m)", 0.1)}
          {veld("h_geb", "Nokhoogte boven maaiveld (m)", 0.5)}
          {sys !== 5 && veld("b_geb", "Lengte van het gebouw (m)", 0.5)}
          {sys !== 5 && keuze("ligging", "Ligging (wind)", [{ v: 1, label: "Middengebied" }, { v: 2, label: "Randgebied bij de kopgevel" }])}
          <span className="gd-note">Opleggingen, keep, steunafstanden en de doorbuigingseis staan in het rekenblad.</span>
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, gap: 14, borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          {sys === 5 ? tekenHoekkeper() : tekenDoorsnede()}
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat of een rode kracht om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">
          {reactie} ·{" "}
          <UcChip naam="N+M" uc={g.UC_NM} /> <UcChip naam="kip" uc={g.UC_kip} /> <UcChip naam="V" uc={g.UC_V} />{" "}
          <UcChip naam="opleg" uc={g.UC_opl} /> <UcChip naam="w_bij" uc={g.UC_wbij} />
          {Math.round(d("wmax_eis")) === 1 && <> <UcChip naam="w_max" uc={g.UC_wmax} /></>}
        </span>
      </div>
    </div>
  );
}
