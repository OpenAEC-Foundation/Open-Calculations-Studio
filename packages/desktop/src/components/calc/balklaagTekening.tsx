import type { ReactNode } from "react";

/**
 * Tekenbouwstenen voor het parametrische beeld van de balklaag.
 *
 * De krachtenlijnen volgen de gangbare conventie van een raamwerkprogramma:
 * een gevuld vlak tussen de as en de lijn, het moment aan de trekzijde (een
 * veldmoment dus onder de as), de dwarskracht met arcering en een plus- of
 * minteken per vak, en de waarden bij de uitersten en de steunpunten. Lasten
 * zijn rijen pijlen met een bovenlijn en een label in de tekening zelf.
 */

export const KLEUR_M = { lijn: "#dc2626", vlak: "rgba(239, 68, 68, 0.22)" };
export const KLEUR_V = { lijn: "#2563eb", vlak: "rgba(59, 130, 246, 0.20)" };
export const KLEUR_U = { lijn: "#2563eb", licht: "#93c5fd" };
const OPL = { vulling: "#fbbf24", lijn: "#92400e" };

/** Getal op z'n Nederlands: 6.28 → "6,28". */
export const nl = (v: number, dec = 2) => (Number.isFinite(v) ? v : 0).toFixed(dec).replace(".", ",");

/** Tekst met een witte rand, zodat hij leesbaar blijft boven lijnen en vlakken. */
export function Label(props: {
  x: number; y: number; kleur: string; children: ReactNode;
  anker?: "start" | "middle" | "end"; vet?: boolean; grootte?: number;
}) {
  const { x, y, kleur, children, anker = "middle", vet = true, grootte = 11 } = props;
  return (
    <text x={x} y={y} textAnchor={anker} fontSize={grootte} fontWeight={vet ? 700 : 400} fill={kleur}
      stroke="#ffffff" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke">
      {children}
    </text>
  );
}

/** Oplegging onder een balkas op (x, y): scharnier of rol, amberkleurig met grondarcering. */
export function Oplegging({ x, y, soort, g = 8 }: { x: number; y: number; soort: "scharnier" | "rol"; g?: number }) {
  const hT = soort === "rol" ? 1.5 * g : 1.9 * g;
  const yG = soort === "rol" ? y + hT + 2 * 3 + 1 : y + hT;
  return (
    <g>
      <polygon points={`${x},${y} ${x - g},${y + hT} ${x + g},${y + hT}`}
        fill={OPL.vulling} stroke={OPL.lijn} strokeWidth={1.3} strokeLinejoin="round" />
      {soort === "rol" && (
        <>
          <circle cx={x - g * 0.45} cy={y + hT + 3} r={2.8} fill={OPL.vulling} stroke={OPL.lijn} strokeWidth={1.1} />
          <circle cx={x + g * 0.45} cy={y + hT + 3} r={2.8} fill={OPL.vulling} stroke={OPL.lijn} strokeWidth={1.1} />
        </>
      )}
      <line x1={x - g - 4} y1={yG} x2={x + g + 4} y2={yG} stroke={OPL.lijn} strokeWidth={1.3} />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={x - g - 2 + i * ((2 * g + 4) / 4)} y1={yG} x2={x - g - 6 + i * ((2 * g + 4) / 4)} y2={yG + 5}
          stroke={OPL.lijn} strokeWidth={0.8} />
      ))}
    </g>
  );
}

/**
 * Gelijkmatig verdeelde last: een rij pijlen van `yTop` naar de bovenkant van
 * de balk (`yBalk`), verbonden door een bovenlijn, met het label erboven.
 */
export function LijnLast(props: {
  x1: number; x2: number; yTop: number; yBalk: number; kleur: string; label?: ReactNode; labelX?: number;
}) {
  const { x1, x2, yTop, yBalk, kleur, label, labelX } = props;
  const n = Math.max(6, Math.round((x2 - x1) / 38));
  const stap = (x2 - x1) / n;
  const kop = 7;
  return (
    <g>
      <line x1={x1} y1={yTop} x2={x2} y2={yTop} stroke={kleur} strokeWidth={2} strokeLinecap="round" />
      {Array.from({ length: n + 1 }, (_, i) => {
        const px = x1 + i * stap;
        return (
          <g key={i}>
            <line x1={px} y1={yTop} x2={px} y2={yBalk - kop} stroke={kleur} strokeWidth={1.8} />
            <polygon points={`${px},${yBalk} ${px - 3.6},${yBalk - kop - 1} ${px + 3.6},${yBalk - kop - 1}`} fill={kleur} />
          </g>
        );
      })}
      {label && <Label x={labelX ?? (x1 + x2) / 2} y={yTop - 6} kleur={kleur}>{label}</Label>}
    </g>
  );
}

/** Geconcentreerde last van boven op de balk. */
export function PuntLast(props: { x: number; yTop: number; yBalk: number; kleur: string; label: ReactNode }) {
  const { x, yTop, yBalk, kleur, label } = props;
  return (
    <g>
      <line x1={x} y1={yTop} x2={x} y2={yBalk - 9} stroke="#ffffff" strokeWidth={6} />
      <line x1={x} y1={yTop} x2={x} y2={yBalk - 9} stroke={kleur} strokeWidth={2.6} />
      <polygon points={`${x},${yBalk} ${x - 5.5},${yBalk - 11} ${x + 5.5},${yBalk - 11}`} fill={kleur} />
      <Label x={x} y={yTop - 5} kleur={kleur}>{label}</Label>
    </g>
  );
}

export interface LijnLabel {
  /** Plaats langs de balk in mm vanaf het begin. */
  x: number;
  /** Waarde op die plaats, in de eenheid van de lijn. */
  v: number;
  tekst: string;
  /** Uitlijning en verschuiving, voor twee waarden op dezelfde plaats (een sprong). */
  anker?: "start" | "middle" | "end";
  dx?: number;
}

/**
 * Een krachtenlijn als gevuld vlak.
 *
 * `f` geeft de waarde op afstand x (mm) vanaf het begin. `omlaag` tekent een
 * positieve waarde onder de as: zo hangt een veldmoment aan de trekzijde. De
 * sprongen in een dwarskrachtenlijn komen mee via `breekpunten`: daar wordt
 * vlak links en vlak rechts van het punt bemonsterd.
 */
export function KrachtenLijn(props: {
  x1: number; x2: number; tot: number; asY: number; schaal: number;
  f: (x: number) => number; omlaag: boolean; kleur: { lijn: string; vlak: string };
  breekpunten?: number[]; arcering?: boolean; tekens?: boolean; labels?: LijnLabel[];
  stippel?: (x: number) => number;
}) {
  const { x1, x2, tot, asY, schaal, f, omlaag, kleur, breekpunten = [], arcering, tekens, labels = [], stippel } = props;
  const X = (x: number) => x1 + ((x2 - x1) * x) / Math.max(tot, 1e-9);
  const richting = omlaag ? 1 : -1;
  const Y = (v: number) => asY + richting * v * schaal;
  const eps = tot * 1e-6;
  const xs = new Set<number>();
  const N = 160;
  for (let i = 0; i <= N; i++) xs.add((tot * i) / N);
  for (const b of breekpunten) {
    if (b > eps) xs.add(b - eps);
    if (b < tot - eps) xs.add(b + eps);
  }
  const rij = [...xs].sort((a, b) => a - b);
  const punten = rij.map((x) => `${X(x)},${Y(f(x))}`);
  const vlak = `${X(0)},${asY} ${punten.join(" ")} ${X(tot)},${asY}`;

  // arcering loodrecht op de as, om de 10 px
  const arceerLijnen: ReactNode[] = [];
  if (arcering) {
    const n = Math.floor((x2 - x1) / 10);
    for (let i = 1; i < n; i++) {
      const x = (tot * i) / n;
      const y = Y(f(x));
      if (Math.abs(y - asY) > 2) {
        arceerLijnen.push(<line key={i} x1={X(x)} y1={asY} x2={X(x)} y2={y} stroke={kleur.lijn} strokeWidth={0.6} opacity={0.7} />);
      }
    }
  }

  // plus- en mintekens halverwege elk vak tussen de breekpunten
  const tekenLabels: ReactNode[] = [];
  if (tekens) {
    const grenzen = [0, ...breekpunten.filter((b) => b > eps && b < tot - eps), tot].sort((a, b) => a - b);
    const piek = Math.max(...rij.map((x) => Math.abs(f(x))), 1e-9);
    for (let i = 0; i < grenzen.length - 1; i++) {
      const a = grenzen[i], b = grenzen[i + 1];
      for (const t of [0.22, 0.78]) {
        const x = a + (b - a) * t;
        const v = f(x);
        if (Math.abs(v) > 0.18 * piek && Math.abs(v * schaal) > 12) {
          tekenLabels.push(
            <text key={`${i}-${t}`} x={X(x)} y={(asY + Y(v)) / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={700}
              fill={kleur.lijn}>{v > 0 ? "+" : "−"}</text>,
          );
          break;
        }
      }
    }
  }

  const stippelPunten = stippel ? rij.map((x) => `${X(x)},${Y(stippel(x))}`).join(" ") : null;

  return (
    <g>
      <polygon points={vlak} fill={kleur.vlak} stroke="none" />
      {arceerLijnen}
      <polyline points={punten.join(" ")} fill="none" stroke={kleur.lijn} strokeWidth={2} strokeLinejoin="round" />
      {stippelPunten && (
        <polyline points={stippelPunten} fill="none" stroke={kleur.lijn} strokeWidth={1.3} strokeDasharray="5 3" opacity={0.85} />
      )}
      <line x1={x1 - 8} y1={asY} x2={x2 + 8} y2={asY} stroke="#374151" strokeWidth={1.4} />
      {tekenLabels}
      {labels.map((l, i) => {
        const y = Y(l.v);
        const boven = richting * l.v < 0; // lijn ligt boven de as: label erboven
        return (
          <g key={i}>
            <circle cx={X(l.x)} cy={y} r={2.4} fill={kleur.lijn} />
            <Label x={X(l.x) + (l.dx ?? 0)} y={boven ? y - 7 : y + 14} kleur={kleur.lijn} anker={l.anker}>{l.tekst}</Label>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Per vak tussen twee grenzen het grootste positieve en het kleinste negatieve
 * punt van een lijn. Een waarde op een grens die twee vakken delen (een
 * steunmoment) komt maar één keer terug.
 */
export function extremen(f: (x: number) => number, grenzen: number[], n = 240): { x: number; v: number }[] {
  const uit: { x: number; v: number }[] = [];
  let piek = 0;
  for (let i = 0; i < grenzen.length - 1; i++) {
    const a = grenzen[i], b = grenzen[i + 1];
    for (let k = 0; k <= n; k++) piek = Math.max(piek, Math.abs(f(a + ((b - a) * k) / n)));
  }
  const tot = grenzen[grenzen.length - 1] - grenzen[0];
  const dubbel = (p: { x: number; v: number }) =>
    uit.some((q) => Math.abs(q.x - p.x) < 0.01 * tot && Math.abs(q.v - p.v) < 0.01 * piek);
  for (let i = 0; i < grenzen.length - 1; i++) {
    const a = grenzen[i], b = grenzen[i + 1];
    let max = { x: a, v: 0 }, min = { x: a, v: 0 };
    for (let k = 0; k <= n; k++) {
      const x = a + ((b - a) * k) / n;
      const v = f(x);
      if (v > max.v) max = { x, v };
      if (v < min.v) min = { x, v };
    }
    for (const p of [max, min]) {
      if (Math.abs(p.v) > 0.03 * piek && !dubbel(p)) uit.push(p);
    }
  }
  return uit;
}

/** Waarden net binnen de randen van elk vak: de sprongen van een dwarskrachtenlijn. */
export function randwaarden(f: (x: number) => number, grenzen: number[]): { x: number; v: number; kant: number }[] {
  const tot = grenzen[grenzen.length - 1] - grenzen[0];
  const eps = tot * 1e-6;
  const alle: { x: number; v: number; kant: number }[] = [];
  for (let i = 0; i < grenzen.length - 1; i++) {
    alle.push({ x: grenzen[i], v: f(grenzen[i] + eps), kant: 1 });
    alle.push({ x: grenzen[i + 1], v: f(grenzen[i + 1] - eps), kant: -1 });
  }
  const piek = Math.max(...alle.map((p) => Math.abs(p.v)), 1e-9);
  return alle.filter((p) => Math.abs(p.v) > 0.03 * piek);
}

/** Maten van de plattegrond in mm; het profiel alleen voor het label. */
export interface RaveelInvoer {
  bSparing: number; lStaart: number; hoh: number; bBalk: number; profiel?: string;
}

/*
 * Vaste zones rond de plattegrond (px): een zijmarge, links twee maatketens,
 * rechts de labelkolom, boven de muur en onder de maatlijn van b_sparing.
 */
const ZONE = { zij: 12, links: 80, rechts: 135, boven: 12, onder: 26 };
/** In een smal paneel: een verklaring van vijf regels onder de tekening, in plaats van de labelkolom. */
const LEGENDA = 5 * 14 + 8;
const MAAT_KLEUR = "#2563eb", MAAT_TEKST = "#1d4ed8";

const raveelLabel = (profiel?: string) => `raveelbalk ${profiel ?? ""}`.trim();

/** Getekende lengte van de sparing: een stomp van een kwart staart, 300 tot 600 mm. */
const stomp = (lStaart: number) => Math.min(600, Math.max(300, 0.25 * lStaart));

/**
 * Indeling in de breedte. De labelkolom groeit mee met het raveelbalklabel
 * (het profiel); laat hij de tekening te smal, dan vervalt hij en komt er een
 * verklaring onder de tekening.
 */
function indeling(W: number, p: RaveelInvoer) {
  const kolom = Math.max(ZONE.rechts, 18 + raveelLabel(p.profiel).length * 11 * 0.62 + 6);
  const smal = W - 2 * ZONE.zij - ZONE.links - kolom < 150;
  const rechts = smal ? 0 : kolom;
  return {
    smal, rechts,
    bBeschikbaar: Math.max(40, W - 2 * ZONE.zij - ZONE.links - rechts),
    onder: ZONE.onder + (smal ? LEGENDA : 0),
  };
}

/**
 * Alle coördinaten van de plattegrond, voor de tekening en voor de maatchips
 * die de designer erbovenop zet.
 *
 * De schaal volgt uit de sparing met één doorgaande balk per kant; is de
 * hoogte de beperking, dan vullen tot drie doorgaande balken per kant de
 * breedte op, zonder dat de schaal verandert.
 */
export function raveelMaten(W: number, H: number, p: RaveelInvoer) {
  const { bSparing, lStaart, hoh, bBalk } = p;
  const { smal, rechts, bBeschikbaar, onder } = indeling(W, p);
  const lTot = lStaart + stomp(lStaart);
  const s = Math.max(0.005, Math.min(bBeschikbaar / (bSparing + 2.6 * hoh), (H - ZONE.boven - onder) / lTot));
  const nDoor = Math.min(3, Math.max(1, Math.floor((bBeschikbaar / s - bSparing - 0.6 * hoh) / (2 * hoh) + 1e-9)));
  const bw = (bSparing + (2 * nDoor + 0.6) * hoh) * s;
  const x0 = Math.max(ZONE.zij, (W - ZONE.links - bw - rechts) / 2) + ZONE.links;
  const x1 = x0 + bw, xm = x0 + bw / 2;
  const wl = xm - (bSparing * s) / 2, wr = xm + (bSparing * s) / 2;
  // Is de breedte de beperking (een korte staart), dan verticaal gecentreerd.
  const y0 = ZONE.boven + Math.max(0, (H - ZONE.boven - onder - lTot * s) / 2);
  const yRav = y0 + lStaart * s;
  const yOnd = y0 + lTot * s;
  const nStaart = Math.max(1, Math.floor(bSparing / hoh) - 1);
  return {
    s, smal, nDoor, nStaart, x0, x1, xm, wl, wr, y0, yRav, yOnd,
    /** Rand van de strook die de raveelbalk draagt: l_staart/2 vóór zijn as. */
    yStrook: yRav - (lStaart / 2) * s,
    stap: (wr - wl) / (nStaart + 1),
    balkB: Math.max(3, bBalk * s),
    /** Maatlijn van b_sparing, en de twee ketens links: l_staart en l_staart/2. */
    yMaat: yOnd + 20, xStaart: x0 - 44, xStrook: x0 - 12,
    /** De labels: rechts in een kolom, of in een smal paneel de verklaring eronder. */
    xLabel: smal ? x0 - 72 : x1 + 18,
    yLegenda: yOnd + 20 + 24,
  };
}

/** Hoogte waarbij de plattegrond de breedte vult, begrensd op 440 px. */
export function raveelHoogte(W: number, p: RaveelInvoer) {
  const { bBeschikbaar, onder } = indeling(W, p);
  const h = ZONE.boven + onder + (p.lStaart + stomp(p.lStaart)) * (bBeschikbaar / (p.bSparing + 2.6 * p.hoh));
  return Math.min(440, Math.max(120, h));
}

/**
 * Labels in een kolom: gesorteerd, minstens `af` px uit elkaar en binnen
 * [boven, onder]. Eerst omlaag schuiven, dan wat onderuit steekt terug omhoog.
 */
function spreid(ys: number[], af: number, boven: number, onder: number) {
  const volg = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
  const y = volg.map((i) => ys[i]);
  for (let k = 0; k < y.length; k++) y[k] = Math.max(y[k], k > 0 ? y[k - 1] + af : boven);
  for (let k = y.length - 1; k >= 0; k--) y[k] = Math.min(y[k], k < y.length - 1 ? y[k + 1] - af : onder);
  const uit = [...ys];
  volg.forEach((i, k) => { uit[i] = y[k]; });
  return uit;
}

/** Maatlijn met stippen op de einden. */
function MaatLijn({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={MAAT_KLEUR} strokeWidth={1} />
      <circle cx={x1} cy={y1} r={2.4} fill={MAAT_KLEUR} />
      <circle cx={x2} cy={y2} r={2.4} fill={MAAT_KLEUR} />
    </g>
  );
}

/**
 * Plattegrond van een sparing met raveelbalk: de muur waar de balken op
 * liggen, de doorgaande balken, de dubbele wisselbalken langs de sparing, de
 * staartbalken met de strook die de raveelbalk draagt, en de raveelbalk zelf.
 * De sparing is een stomp die in een breeklijn eindigt.
 *
 * Labels staan in een kolom rechts, met een verwijslijn (in een smal paneel
 * als verklaring onder de tekening); maten links en onder, elk op een eigen
 * lijn. De getallen van b_sparing en l_staart tekent de plattegrond alleen met
 * `getallen`: op het scherm zet de designer er klikbare maten neer.
 */
export function RaveelPlattegrond(props: RaveelInvoer & { W: number; H: number; getallen?: boolean }) {
  const { W, H, bSparing, lStaart, hoh, profiel, getallen } = props;
  const m = raveelMaten(W, H, props);
  const { s, x0, x1, xm, wl, wr, y0, yRav, yOnd, yStrook, balkB, stap, nStaart, nDoor } = m;
  const houtVul = "#E3C08A", houtLijn = "#8B6F47", rood = "#b91c1c";
  const hRav = Math.max(8, balkB);
  const staarten = Array.from({ length: nStaart }, (_, i) => wl + (i + 1) * stap);
  const door = Array.from({ length: nDoor }, (_, i) => [wl - (i + 1) * hoh * s, wr + (i + 1) * hoh * s]).flat();
  // Breeklijn over de volle breedte, met een knik in de balkzone aan elke kant.
  const knik = (x: number) => `${x - 4},${yOnd} ${x - 1.5},${yOnd - 5} ${x + 1.5},${yOnd + 5} ${x + 4},${yOnd}`;
  const breeklijn = `${x0 - 4},${yOnd} ${knik((x0 + wl - balkB) / 2)} ${knik((wr + balkB + x1) / 2)} ${x1 + 4},${yOnd}`;
  const stompH = yOnd - yRav;
  // Van boven naar beneden, elk met het vlakje dat het in de verklaring krijgt.
  // De wisselbalk loopt over de volle lengte en wijst daarom boven de strook
  // aan, waar de kolom nog ruimte heeft.
  const labels: {
    doel: [number, number]; kleur: string; vet?: boolean; tekst: ReactNode;
    vlak: { vul: string; lijn: string; streep?: string };
  }[] = [
    {
      doel: [staarten[staarten.length - 1], y0 + 0.3 * (yStrook - y0)], kleur: houtLijn,
      tekst: `staartbalken (${nStaart}×)`, vlak: { vul: houtVul, lijn: houtLijn },
    },
    {
      doel: [wr + balkB, y0 + 0.75 * (yStrook - y0)], kleur: houtLijn,
      tekst: "wisselbalk (dubbel)", vlak: { vul: "#D9A866", lijn: houtLijn },
    },
    {
      doel: [wr - stap / 2, (yStrook + yRav) / 2], kleur: "#dc2626",
      tekst: <>belaste strook l<tspan baselineShift="sub" fontSize={8}>staart</tspan>/2</>,
      vlak: { vul: "rgba(239, 68, 68, 0.13)", lijn: "#ef4444", streep: "3 2" },
    },
    {
      doel: [wr - stap / 2, yRav], kleur: rood, vet: true,
      tekst: raveelLabel(profiel), vlak: { vul: "#fca5a5", lijn: rood },
    },
    {
      doel: [wr - 0.2 * (wr - wl), yRav + 0.5 * stompH], kleur: "#64748b",
      tekst: "sparing", vlak: { vul: "#f8fafc", lijn: "#94a3b8", streep: "3 2" },
    },
  ];
  const labelY = m.smal
    ? labels.map((_, i) => m.yLegenda + i * 14)
    : spreid(labels.map((l) => l.doel[1] + 4), 14, 10, H - 4);
  const xL = m.xLabel;
  return (
    <g>
      {/* muur waarop de balken liggen, met arcering */}
      <rect x={x0} y={y0 - 9} width={x1 - x0} height={9} fill="#e5e7eb" stroke="#374151" strokeWidth={1.2} />
      {Array.from({ length: Math.floor((x1 - x0 - 2) / 8) }, (_, i) => (
        <line key={i} x1={x0 + 1 + i * 8} y1={y0} x2={x0 + 9 + i * 8} y2={y0 - 9} stroke="#6b7280" strokeWidth={0.6} />
      ))}
      {/* sparing: een stomp met kruis */}
      <rect x={wl} y={yRav} width={wr - wl} height={stompH} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 3" />
      <line x1={wl} y1={yRav} x2={wr} y2={yOnd} stroke="#cbd5e1" strokeWidth={0.8} />
      <line x1={wr} y1={yRav} x2={wl} y2={yOnd} stroke="#cbd5e1" strokeWidth={0.8} />
      {/* de strook die via de staartbalken op de raveelbalk komt */}
      <rect x={wl} y={yStrook} width={wr - wl} height={yRav - yStrook} fill="rgba(239, 68, 68, 0.13)" stroke="none" />
      <line x1={wl} y1={yStrook} x2={wr} y2={yStrook} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="3 2" />
      {/* doorgaande balken, tot de breeklijn */}
      {door.map((x, i) => (
        <rect key={i} x={x - balkB / 2} y={y0} width={balkB} height={yOnd - y0} fill={houtVul} stroke={houtLijn} strokeWidth={0.9} />
      ))}
      {/* staartbalken: van de muur tot op de raveelbalk */}
      {staarten.map((x, i) => (
        <rect key={i} x={x - balkB / 2} y={y0} width={balkB} height={yRav - y0} fill={houtVul} stroke={houtLijn} strokeWidth={0.9} />
      ))}
      {/* wisselbalken: dubbel, dragen de raveelbalk */}
      {[wl, wr].map((x, i) => (
        <rect key={i} x={x - balkB} y={y0} width={2 * balkB} height={yOnd - y0} fill="#D9A866" stroke={houtLijn} strokeWidth={1.1} />
      ))}
      {/* de raveelbalk: die wordt hier berekend */}
      <rect x={wl} y={yRav - hRav / 2} width={wr - wl} height={hRav} fill="#fca5a5" stroke={rood} strokeWidth={1.6} />
      {/* de staartbalken zetten hun oplegreactie af op de raveelbalk */}
      {staarten.map((x, i) => {
        const y = yRav - hRav / 2 - 1;
        return <polygon key={i} points={`${x},${y} ${x - 3.5},${y - 7} ${x + 3.5},${y - 7}`} fill={rood} />;
      })}
      <polyline points={breeklijn} fill="none" stroke="#374151" strokeWidth={1.1} strokeLinejoin="round" />

      {/* labelkolom rechts, met verwijslijnen; in een smal paneel een verklaring eronder */}
      {labels.map((l, i) => (
        <g key={i}>
          {m.smal ? (
            <rect x={xL} y={labelY[i] - 9} width={14} height={9} fill={l.vlak.vul} stroke={l.vlak.lijn}
              strokeWidth={1} strokeDasharray={l.vlak.streep} />
          ) : (
            <>
              <line x1={l.doel[0]} y1={l.doel[1]} x2={xL - 4} y2={labelY[i] - 4} stroke="#9ca3af" strokeWidth={0.8} />
              <circle cx={l.doel[0]} cy={l.doel[1]} r={1.6} fill="#6b7280" />
            </>
          )}
          <Label x={m.smal ? xL + 20 : xL} y={labelY[i]} kleur={l.kleur} anker="start" vet={l.vet ?? false}>{l.tekst}</Label>
        </g>
      ))}

      {/* b_sparing: tussen de assen van de wisselbalken */}
      <line x1={wl} y1={yOnd + 3} x2={wl} y2={m.yMaat + 4} stroke={MAAT_KLEUR} strokeWidth={1} />
      <line x1={wr} y1={yOnd + 3} x2={wr} y2={m.yMaat + 4} stroke={MAAT_KLEUR} strokeWidth={1} />
      <MaatLijn x1={wl} y1={m.yMaat} x2={wr} y2={m.yMaat} />
      {/* links twee ketens: l_staart vanaf de muur, l_staart/2 vanaf de strookrand, beide tot de as van de raveelbalk */}
      {[y0, yRav].map((y, i) => (
        <line key={i} x1={m.xStaart - 4} y1={y} x2={x0 - 3} y2={y} stroke={MAAT_KLEUR} strokeWidth={1} />
      ))}
      <line x1={m.xStrook - 4} y1={yStrook} x2={x0 - 3} y2={yStrook} stroke={MAAT_KLEUR} strokeWidth={1} />
      <MaatLijn x1={m.xStaart} y1={y0} x2={m.xStaart} y2={yRav} />
      <MaatLijn x1={m.xStrook} y1={yStrook} x2={m.xStrook} y2={yRav} />
      <Label x={m.xStrook - 4} y={(yStrook + yRav) / 2 + 4} kleur={MAAT_TEKST} anker="end">{nl(lStaart / 2, 0)}</Label>
      {getallen && (
        <>
          <Label x={xm} y={m.yMaat - 5} kleur={MAAT_TEKST}>{nl(bSparing, 0)}</Label>
          <Label x={m.xStaart - 4} y={(y0 + yRav) / 2 + 4} kleur={MAAT_TEKST} anker="end">{nl(lStaart, 0)}</Label>
        </>
      )}
    </g>
  );
}
