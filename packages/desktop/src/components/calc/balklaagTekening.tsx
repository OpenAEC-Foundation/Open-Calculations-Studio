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

/**
 * Plattegrond van een sparing met raveelbalk: de muur waar de balken op
 * liggen, de doorgaande balken, de twee wisselbalken langs de sparing, de
 * onderbroken (staart)balken en de raveelbalk die ze opvangt.
 */
export function RaveelPlattegrond(props: {
  W: number; H: number; bSparing: number; lStaart: number; hoh: number; bBalk: number; profiel: string;
}) {
  const { W, H, bSparing, lStaart, hoh, bBalk, profiel } = props;
  const mL = 70, mR = 70, mT = 22, mB = 46;
  // Tekengebied: de sparing plus anderhalve balkafstand aan weerszijden, en in
  // de lengte de staart plus de sparing zelf (die tonen we even lang als de staart).
  const bTot = bSparing + 3 * hoh;
  const lTot = lStaart * 2;
  const s = Math.max(0.01, Math.min((W - mL - mR) / bTot, (H - mT - mB) / lTot));
  const bw = bTot * s, lh = lTot * s;
  const x0 = (W - bw) / 2, y0 = mT;
  const xm = x0 + bw / 2;
  const wl = xm - (bSparing * s) / 2, wr = xm + (bSparing * s) / 2;
  const yRav = y0 + lStaart * s;
  const yOnd = y0 + lh;
  const nStaart = Math.max(1, Math.floor(bSparing / hoh) - 1);
  const stapStaart = (wr - wl) / (nStaart + 1);
  const balkB = Math.max(3, bBalk * s);
  const houtVul = "#E3C08A", houtLijn = "#8B6F47";
  return (
    <g>
      {/* muur waarop de balken liggen, met arcering */}
      <rect x={x0 - 14} y={y0 - 9} width={bw + 28} height={9} fill="#e5e7eb" stroke="#374151" strokeWidth={1.2} />
      {Array.from({ length: Math.ceil((bw + 28) / 8) }, (_, i) => (
        <line key={i} x1={x0 - 14 + i * 8} y1={y0} x2={x0 - 6 + i * 8} y2={y0 - 9} stroke="#6b7280" strokeWidth={0.6} />
      ))}
      {/* sparing */}
      <rect x={wl} y={yRav} width={wr - wl} height={yOnd - yRav} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 3" />
      <line x1={wl} y1={yRav} x2={wr} y2={yOnd} stroke="#cbd5e1" strokeWidth={0.8} />
      <line x1={wr} y1={yRav} x2={wl} y2={yOnd} stroke="#cbd5e1" strokeWidth={0.8} />
      <Label x={xm} y={(yRav + yOnd) / 2 + 4} kleur="#64748b" vet={false}>sparing</Label>
      {/* doorgaande balken naast de wisselbalken */}
      {[wl - hoh * s, wr + hoh * s].map((x, i) => (
        <rect key={i} x={x - balkB / 2} y={y0} width={balkB} height={lh} fill={houtVul} stroke={houtLijn} strokeWidth={0.9} />
      ))}
      {/* staartbalken: van de muur tot op de raveelbalk */}
      {Array.from({ length: nStaart }, (_, i) => (
        <rect key={i} x={wl + (i + 1) * stapStaart - balkB / 2} y={y0} width={balkB} height={yRav - y0}
          fill={houtVul} stroke={houtLijn} strokeWidth={0.9} />
      ))}
      {/* wisselbalken: dubbel, dragen de raveelbalk */}
      {[wl, wr].map((x, i) => (
        <rect key={i} x={x - balkB} y={y0} width={2 * balkB} height={lh} fill="#D9A866" stroke={houtLijn} strokeWidth={1.1} />
      ))}
      {/* de raveelbalk: die wordt hier berekend */}
      <rect x={wl} y={yRav - Math.max(4, balkB / 2)} width={wr - wl} height={Math.max(8, balkB)}
        fill="#fca5a5" stroke="#b91c1c" strokeWidth={1.6} />
      {/* de staartbalken zetten hun oplegreactie af op de raveelbalk */}
      {Array.from({ length: nStaart }, (_, i) => {
        const x = wl + (i + 1) * stapStaart;
        return <polygon key={i} points={`${x},${yRav - 6} ${x - 3.5},${yRav - 13} ${x + 3.5},${yRav - 13}`} fill="#b91c1c" />;
      })}
      <Label x={xm} y={yRav - 16} kleur="#b91c1c">raveelbalk {profiel}</Label>
      <Label x={wl - balkB - 4} y={yOnd - 6} kleur={houtLijn} anker="end" vet={false}>wisselbalk</Label>
      <Label x={wr + balkB + 4} y={yOnd - 6} kleur={houtLijn} anker="start" vet={false}>wisselbalk</Label>
      <Label x={xm} y={y0 + (yRav - y0) / 2 + 4} kleur={houtLijn} vet={false}>staartbalken</Label>
    </g>
  );
}

/** Coördinaten die de designer nodig heeft om de maatchips bij de plattegrond te zetten. */
export function raveelMaten(W: number, H: number, bSparing: number, lStaart: number, hoh: number) {
  const mL = 70, mR = 70, mT = 22, mB = 46;
  const bTot = bSparing + 3 * hoh;
  const lTot = lStaart * 2;
  const s = Math.max(0.01, Math.min((W - mL - mR) / bTot, (H - mT - mB) / lTot));
  const bw = bTot * s;
  const x0 = (W - bw) / 2, y0 = mT;
  const xm = x0 + bw / 2;
  const wl = xm - (bSparing * s) / 2, wr = xm + (bSparing * s) / 2;
  const yRav = y0 + lStaart * s;
  const yOnd = y0 + lTot * s;
  return { x0, y0, xm, wl, wr, yRav, yOnd, s };
}
