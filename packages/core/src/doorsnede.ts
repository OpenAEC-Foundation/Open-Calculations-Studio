/**
 * Doorsnede — grootheden van een samengestelde doorsnede uit rechthoeken,
 * cirkels en buizen en I- of H-profielen, elk met een eigen plaats en een
 * factor n = E_i/E_ref.
 *
 * Elk deel is dubbelsymmetrisch om zijn eigen hart; zijn eigen
 * deviatiemoment is daarom nul en I_yz van de doorsnede volgt uit de harten
 * alleen (Steiner). Een I-profiel telt met zijn vier afrondingen tussen lijf
 * en flens als exacte vlakken (een vierkant r × r min een kwart cirkel), net als
 * in de profieltabellen; zo komen A, I_y en I_z op de tabelwaarden uit.
 *
 * Rekenwijze: per richting is een deel een som van strookjes met een breedte
 * die van de plaats afhangt — een blok met een vaste breedte, of een schijf
 * met breedte f·2·√(R² − (s − c)²) (een cirkel, of met f = ½ en een beperkt
 * bereik de kwart cirkel van een afronding). Van zo'n strook zijn het
 * oppervlak, het eerste en het tweede moment over elk interval [a, b] in
 * gesloten vorm bekend. Het oppervlak, het zwaartepunt, de
 * traagheidsmomenten, het statisch moment van het deel boven een lijn en de
 * plastische neutrale lijn (het oppervlak eronder is de helft; bisectie op een
 * monotone functie) zijn daarmee exact, op de afronding van de drijvende komma
 * na.
 *
 * De factor n weegt elk deel: een ideële doorsnede in het referentiemateriaal
 * (A*, I* = Σ n·(I_eigen + A·a²)). n = −1 is een gat in een deel met n = 1; een
 * deel met n = 0 telt niet mee. Het plastisch weerstandsmoment is alleen
 * zinvol voor een homogene doorsnede (alle n = 1, eventueel met gaten); dat
 * bewaakt het rekenblad.
 *
 * Assen: y naar rechts, z omhoog; I_y = ∫z²·dA (buiging om de horizontale
 * as), I_z = ∫y²·dA, I_yz = ∫y·z·dA, alle drie om het zwaartepunt. Eenheden:
 * kale getallen in één stelsel (het rekenblad gebruikt mm).
 *
 * Invoer: matrix met per deel een rij [soort, p1, p2, p3, p4, p5, y, z, n, draai]:
 *   soort 0  geen deel (ongebruikte rij)
 *         1  rechthoek: p1 = b (breedte, in y), p2 = h (hoogte, in z)
 *         2  cirkel of buis: p1 = D, p2 = t (wanddikte; 0 of ≥ D/2 is massief)
 *         3  I- of H-profiel: p1 = h, p2 = b, p3 = t_w, p4 = t_f, p5 = r;
 *            draai 0 = staand (lijf evenwijdig aan z), 1 = liggend (lijf
 *            evenwijdig aan y)
 *   y, z   plaats van het hart van het deel
 *   n      factor E_i/E_ref (0 = telt niet mee, negatief = gat)
 * Een deel met een maat die niet positief is, telt niet mee.
 */

// ── Invoer ───────────────────────────────────────────────────────────────────

/** Soort van een deel (eerste kolom van de invoer). */
export const DOORSNEDE_DEEL = { GEEN: 0, RECHTHOEK: 1, CIRKEL: 2, PROFIEL: 3 } as const;

/** Strook met een vaste breedte w op [lo, hi]. */
interface Blok {
  soort: 'blok';
  lo: number;
  hi: number;
  w: number;
}

/** Strook met breedte f·2·√(R² − (s − c)²) op [lo, hi] (binnen [c − R, c + R]). */
interface Schijf {
  soort: 'schijf';
  c: number;
  R: number;
  lo: number;
  hi: number;
  f: number;
}

type Strook = Blok | Schijf;

/** Eén deel: zijn stroken in beide richtingen, zijn hart, zijn omhullende en zijn factor. */
interface Deel {
  nr: number;
  soort: number;
  n: number;
  y: number;
  z: number;
  /** Stroken op hoogte z (breedte gemeten in y): voor A, S_y, I_y. */
  inZ: Strook[];
  /** Stroken op plaats y (hoogte gemeten in z): voor A, S_z, I_z. */
  inY: Strook[];
  ymin: number;
  ymax: number;
  zmin: number;
  zmax: number;
}

const getal = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Rijen van een matrix als getallen; een vector telt als één rij. */
function rijen(m: unknown): number[][] {
  if (!Array.isArray(m)) return [];
  if (m.length > 0 && !Array.isArray(m[0])) return [m.map(getal)];
  return (m as unknown[]).map((r) => (Array.isArray(r) ? r.map(getal) : [getal(r)]));
}

// ── Stroken ──────────────────────────────────────────────────────────────────

const blok = (lo: number, hi: number, w: number): Blok => ({ soort: 'blok', lo, hi, w });
const schijf = (c: number, R: number, lo: number, hi: number, f: number): Schijf => ({ soort: 'schijf', c, R, lo, hi, f });

/**
 * Stroken van een I-profiel in de richting van het lijf (s langs het lijf, c
 * het hart): twee flenzen b × t_f, het lijf t_w × (h − 2t_f) en vier
 * afrondingen. Een afronding onder een flens is een blok r × r min een kwart
 * cirkel met het middelpunt op r van de flens en van het lijf: breedte
 * r − √(r² − u²), u de afstand tot de lijn waar de boog op het lijf aansluit.
 */
function profielLangsLijf(c: number, h: number, b: number, tw: number, tf: number, r: number): Strook[] {
  const bo = c + h / 2 - tf;
  const on = c - h / 2 + tf;
  const uit: Strook[] = [
    blok(c - h / 2, on, b),
    blok(bo, c + h / 2, b),
    blok(on, bo, tw),
  ];
  if (r > 0) {
    // Twee afrondingen onder de bovenflens (links en rechts van het lijf) en
    // twee boven de onderflens.
    uit.push(blok(bo - r, bo, 2 * r), schijf(bo - r, r, bo - r, bo, -1));
    uit.push(blok(on, on + r, 2 * r), schijf(on + r, r, on, on + r, -1));
  }
  return uit;
}

/**
 * Stroken van een I-profiel dwars op het lijf (s dwars op het lijf, c het
 * hart): de flenzen als één strook van hoogte 2t_f over de breedte b, het lijf
 * h − 2t_f hoog over t_w, en aan elke kant van het lijf twee afrondingen:
 * hoogte r − √(r² − (r − v)²), v de afstand tot het lijf.
 */
function profielDwarsLijf(c: number, h: number, b: number, tw: number, tf: number, r: number): Strook[] {
  const uit: Strook[] = [
    blok(c - b / 2, c + b / 2, 2 * tf),
    blok(c - tw / 2, c + tw / 2, h - 2 * tf),
  ];
  if (r > 0) {
    const re = c + tw / 2;
    const li = c - tw / 2;
    uit.push(blok(re, re + r, 2 * r), schijf(re + r, r, re, re + r, -1));
    uit.push(blok(li - r, li, 2 * r), schijf(li - r, r, li - r, li, -1));
  }
  return uit;
}

/** Een rij van de invoer als deel, of null als hij niet meetelt. */
function maakDeel(rij: number[], nr: number): Deel | null {
  const soort = Math.round(rij[0] ?? 0);
  const n = getal(rij[8]);
  const y = getal(rij[6]);
  const z = getal(rij[7]);
  const p = [1, 2, 3, 4, 5].map((k) => getal(rij[k]));
  if (n === 0) return null;
  if (soort === DOORSNEDE_DEEL.RECHTHOEK) {
    const [b, h] = p;
    if (!(b > 0) || !(h > 0)) return null;
    return {
      nr, soort, n, y, z,
      inZ: [blok(z - h / 2, z + h / 2, b)],
      inY: [blok(y - b / 2, y + b / 2, h)],
      ymin: y - b / 2, ymax: y + b / 2, zmin: z - h / 2, zmax: z + h / 2,
    };
  }
  if (soort === DOORSNEDE_DEEL.CIRKEL) {
    const D = p[0];
    const t = p[1];
    if (!(D > 0)) return null;
    const R = D / 2;
    const Ri = t > 0 && t < R ? R - t : 0;
    const strook = (c: number): Strook[] => {
      const s: Strook[] = [schijf(c, R, c - R, c + R, 1)];
      if (Ri > 0) s.push(schijf(c, Ri, c - Ri, c + Ri, -1));
      return s;
    };
    return {
      nr, soort, n, y, z, inZ: strook(z), inY: strook(y),
      ymin: y - R, ymax: y + R, zmin: z - R, zmax: z + R,
    };
  }
  if (soort === DOORSNEDE_DEEL.PROFIEL) {
    const [h, b, tw, tf] = p;
    const r = Math.max(p[4], 0);
    if (!(h > 0) || !(b > 0) || !(tw > 0) || !(tf > 0) || 2 * tf >= h || tw >= b) return null;
    // De afrondingen passen tussen lijf en flensrand en tussen de flenzen.
    const rr = Math.min(r, (b - tw) / 2, (h - 2 * tf) / 2);
    const liggend = getal(rij[9]) >= 0.5;
    if (!liggend) {
      return {
        nr, soort, n, y, z,
        inZ: profielLangsLijf(z, h, b, tw, tf, rr),
        inY: profielDwarsLijf(y, h, b, tw, tf, rr),
        ymin: y - b / 2, ymax: y + b / 2, zmin: z - h / 2, zmax: z + h / 2,
      };
    }
    return {
      nr, soort, n, y, z,
      inZ: profielDwarsLijf(z, h, b, tw, tf, rr),
      inY: profielLangsLijf(y, h, b, tw, tf, rr),
      ymin: y - h / 2, ymax: y + h / 2, zmin: z - b / 2, zmax: z + b / 2,
    };
  }
  return null;
}

/** Rij i (vanaf 1) aangevuld tot tien kolommen, met n = 1: het deel op zich. */
function losseRij(D: unknown, i: number): number[] | null {
  const rij = rijen(D)[Math.round(i) - 1];
  if (!rij) return null;
  const uit = Array.from({ length: 10 }, (_, k) => rij[k] ?? 0);
  uit[8] = 1;
  return uit;
}

function delenVan(D: unknown): Deel[] {
  const uit: Deel[] = [];
  rijen(D).forEach((rij, k) => {
    const d = maakDeel(rij, k + 1);
    if (d) uit.push(d);
  });
  return uit;
}

// ── Momenten van een strook ─────────────────────────────────────────────────

/**
 * [∫w, ∫s·w, ∫s²·w] van een strook over [a, b]. Een schijf met t = s − c:
 *   ∫2√(R² − t²)dt    = t√(R² − t²) + R²·asin(t/R)
 *   ∫2t√(R² − t²)dt   = −⅔(R² − t²)^{3/2}
 *   ∫2t²√(R² − t²)dt  = ¼t(2t² − R²)√(R² − t²) + ¼R⁴·asin(t/R)
 * en ∫s^k·w met s = t + c.
 */
function momenten(st: Strook, a: number, b: number): [number, number, number] {
  if (st.soort === 'blok') {
    const lo = Math.max(a, st.lo);
    const hi = Math.min(b, st.hi);
    if (!(hi > lo)) return [0, 0, 0];
    return [st.w * (hi - lo), (st.w * (hi * hi - lo * lo)) / 2, (st.w * (hi ** 3 - lo ** 3)) / 3];
  }
  const { c, R, f } = st;
  const lo = Math.max(a, st.lo, c - R);
  const hi = Math.min(b, st.hi, c + R);
  if (!(hi > lo)) return [0, 0, 0];
  const F = (s: number): [number, number, number] => {
    const t = Math.min(Math.max(s - c, -R), R);
    const w = Math.sqrt(Math.max(R * R - t * t, 0));
    const as = Math.asin(Math.min(Math.max(t / R, -1), 1));
    const F0 = t * w + R * R * as;
    const F1 = (-2 / 3) * w ** 3;
    const F2 = 0.25 * t * (2 * t * t - R * R) * w + 0.25 * R ** 4 * as;
    return [F0, F1 + c * F0, F2 + 2 * c * F1 + c * c * F0];
  };
  const [p0, p1, p2] = F(hi);
  const [q0, q1, q2] = F(lo);
  return [f * (p0 - q0), f * (p1 - q1), f * (p2 - q2)];
}

/**
 * Breedte van een strook op de lijn s, aan de kant van p: 0 als p buiten het
 * bereik ligt, anders de breedte in s zelf (binnen het bereik geklemd). Met p
 * net onder of boven s is dat de limiet van die kant; de breedte van een
 * schijf wordt in s uitgerekend en niet in p, want bij de rand van een boog
 * (de aansluiting van een afronding) loopt √(R² − t²) steil en zou een kleine
 * verschuiving al zichtbaar schelen.
 */
function breedte(st: Strook, p: number, s: number = p): number {
  if (!(p > st.lo && p < st.hi)) return 0;
  if (st.soort === 'blok') return st.w;
  const t = Math.min(Math.max(s, st.lo), st.hi) - st.c;
  return st.f * 2 * Math.sqrt(Math.max(st.R * st.R - t * t, 0));
}

/** Som van de momenten van alle delen in één richting over [a, b], met n gewogen. */
function som(delen: Deel[], richting: 'z' | 'y', a: number, b: number, gewogen = true): [number, number, number] {
  const m: [number, number, number] = [0, 0, 0];
  for (const d of delen) {
    const f = gewogen ? d.n : 1;
    for (const st of richting === 'z' ? d.inZ : d.inY) {
      const [m0, m1, m2] = momenten(st, a, b);
      m[0] += f * m0;
      m[1] += f * m1;
      m[2] += f * m2;
    }
  }
  return m;
}

// ── Grootheden ───────────────────────────────────────────────────────────────

interface Totaal {
  A: number;
  yc: number;
  zc: number;
  Iy: number;
  Iz: number;
  Iyz: number;
  ymin: number;
  ymax: number;
  zmin: number;
  zmax: number;
}

function totaal(delen: Deel[]): Totaal | null {
  if (!delen.length) return null;
  const [A, Sz, Iz0] = som(delen, 'z', -Infinity, Infinity);
  const [, Sy, Iy0] = som(delen, 'y', -Infinity, Infinity);
  if (!(Math.abs(A) > 0)) return null;
  const zc = Sz / A;
  const yc = Sy / A;
  let Pyz = 0;
  for (const d of delen) {
    const [Ai] = som([d], 'z', -Infinity, Infinity, false);
    Pyz += d.n * Ai * d.y * d.z;
  }
  // Omhullende: alleen de delen met materiaal (n > 0), niet de gaten.
  const vol = delen.filter((d) => d.n > 0);
  const bron = vol.length ? vol : delen;
  return {
    A, yc, zc,
    Iy: Iz0 - A * zc * zc,
    Iz: Iy0 - A * yc * yc,
    Iyz: Pyz - A * yc * zc,
    ymin: Math.min(...bron.map((d) => d.ymin)),
    ymax: Math.max(...bron.map((d) => d.ymax)),
    zmin: Math.min(...bron.map((d) => d.zmin)),
    zmax: Math.max(...bron.map((d) => d.zmax)),
  };
}

/** Afrondingsruis weg: |v| < 1e-12·schaal wordt nul. */
const schoon = (v: number, schaal: number) => (Math.abs(v) < 1e-12 * Math.max(schaal, 1e-300) ? 0 : v);

/**
 * De ideële doorsnede: [A, y_c, z_c, I_y, I_z, I_yz, y_min, y_max, z_min,
 * z_max], met n gewogen, I om het zwaartepunt. Zonder deel met materiaal
 * alles nul.
 */
export function doorsnedeGrootheden(D: unknown): number[] {
  const t = totaal(delenVan(D));
  if (!t) return new Array<number>(10).fill(0);
  const schaalI = Math.max(Math.abs(t.Iy), Math.abs(t.Iz));
  return [t.A, t.yc, t.zc, t.Iy, t.Iz, schoon(t.Iyz, schaalI), t.ymin, t.ymax, t.zmin, t.zmax];
}

/**
 * Deel i (rijnummer vanaf 1) op zich, zonder n: [A, I_y, I_z om het eigen
 * hart, y_min, y_max, z_min, z_max]. Een deel dat niet meetelt geeft nullen.
 */
export function doorsnedeDeel(D: unknown, i: number): number[] {
  // Het deel op zich: met n = 1, ook als het een gat is of niet meetelt.
  const rij = losseRij(D, i);
  const d = rij ? maakDeel(rij, Math.round(i)) : null;
  if (!d) return new Array<number>(7).fill(0);
  const [A, , Iz0] = som([d], 'z', -Infinity, Infinity, false);
  const [, , Iy0] = som([d], 'y', -Infinity, Infinity, false);
  return [A, Iz0 - A * d.z * d.z, Iy0 - A * d.y * d.y, d.ymin, d.ymax, d.zmin, d.zmax];
}

/**
 * Plastisch weerstandsmoment om as 1 (de y-as: de plastische neutrale lijn is
 * horizontaal, op hoogte z_pl) of as 2 (de z-as: een verticale lijn op y_pl):
 * [W_pl, plaats van de plastische neutrale lijn]. Met n gewogen; bedoeld voor
 * een homogene doorsnede (n = 1, gaten n = −1). De lijn deelt het oppervlak
 * in twee gelijke helften; W_pl = ∫|s − s_pl|·dA.
 */
export function doorsnedePlastisch(D: unknown, as: number): number[] {
  const delen = delenVan(D);
  const t = totaal(delen);
  if (!t || !(t.A > 0)) return [0, 0];
  const r: 'z' | 'y' = Math.round(as) === 2 ? 'y' : 'z';
  let lo = r === 'z' ? t.zmin : t.ymin;
  let hi = r === 'z' ? t.zmax : t.ymax;
  const half = t.A / 2;
  for (let k = 0; k < 200 && hi - lo > 1e-13 * Math.max(Math.abs(hi), Math.abs(lo), 1); k++) {
    const m = (lo + hi) / 2;
    if (som(delen, r, -Infinity, m)[0] < half) lo = m;
    else hi = m;
  }
  const s = (lo + hi) / 2;
  const [A0, S0] = som(delen, r, -Infinity, s);
  const [A1, S1] = som(delen, r, s, Infinity);
  return [(S1 - s * A1) + (s * A0 - S0), s];
}

/**
 * Statisch moment om de zwaartelijn van het deel van de doorsnede voorbij de
 * lijn s — boven z = s bij as 1 (buiging om de y-as), rechts van y = s bij as
 * 2 — met n gewogen, en de breedte van de doorsnede op die lijn: [S, b]. Op de
 * zwaartelijn is S het grootst. De breedte telt een gat negatief en neemt op
 * een sprong (de aansluiting van lijf en flens) de kleinste van beide kanten.
 */
export function doorsnedeStatisch(D: unknown, as: number, s: number): number[] {
  const delen = delenVan(D);
  const t = totaal(delen);
  if (!t) return [0, 0];
  const r: 'z' | 'y' = Math.round(as) === 2 ? 'y' : 'z';
  const c = r === 'z' ? t.zc : t.yc;
  const [A1, S1] = som(delen, r, s, Infinity);
  const schaal = Math.max(t.zmax - t.zmin, t.ymax - t.ymin, 1e-300);
  const δ = 1e-9 * schaal;
  const b = (p: number) => {
    let w = 0;
    for (const d of delen) for (const st of r === 'z' ? d.inZ : d.inY) w += Math.sign(d.n) * breedte(st, p, s);
    return w;
  };
  const S = S1 - c * A1;
  return [schoon(S, Math.abs(t.A) * schaal), Math.max(Math.min(b(s - δ), b(s + δ)), 0)];
}

/**
 * Punten voor een SVG-polygoon met de omtrek van deel i: X = x0 + schaal·y,
 * Y = y0 − schaal·z. Een I-profiel met zijn afrondingen (bogen in zes
 * stukjes), een rechthoek met vier hoeken, een cirkel als 48-hoek (bij een
 * buis de buitenomtrek). Een deel dat niet meetelt geeft een lege tekst.
 */
export function doorsnedeSvgPunten(D: unknown, i: number, x0: number, y0: number, schaal: number): string {
  const rij = losseRij(D, i);
  const d = rij ? maakDeel(rij, Math.round(i)) : null;
  if (!rij || !d) return '';
  const p = [1, 2, 3, 4, 5].map((k) => getal(rij[k]));
  let pt: [number, number][] = [];
  if (d.soort === DOORSNEDE_DEEL.RECHTHOEK) {
    const [b, h] = p;
    pt = [[-b / 2, -h / 2], [b / 2, -h / 2], [b / 2, h / 2], [-b / 2, h / 2]];
  } else if (d.soort === DOORSNEDE_DEEL.CIRKEL) {
    const R = p[0] / 2;
    for (let k = 0; k < 48; k++) pt.push([R * Math.cos((k * Math.PI) / 24), R * Math.sin((k * Math.PI) / 24)]);
  } else {
    const [h, b, tw, tf] = p;
    const r = Math.min(Math.max(p[4], 0), (b - tw) / 2, (h - 2 * tf) / 2);
    /** Boog om (cx, cz) van hoek a0 naar a1, zonder beginpunt. */
    const boog = (cx: number, cz: number, a0: number, a1: number) => {
      for (let k = 1; k <= 6; k++) {
        const a = a0 + ((a1 - a0) * k) / 6;
        pt.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
      }
    };
    const H = h / 2;
    const B = b / 2;
    const T = tw / 2;
    const π = Math.PI;
    pt.push([-B, -H], [B, -H], [B, -H + tf], [T + r, -H + tf]);
    boog(T + r, -H + tf + r, -π / 2, -π);
    pt.push([T, H - tf - r]);
    boog(T + r, H - tf - r, π, π / 2);
    pt.push([B, H - tf], [B, H], [-B, H], [-B, H - tf], [-T - r, H - tf]);
    boog(-T - r, H - tf - r, π / 2, 0);
    pt.push([-T, -H + tf + r]);
    boog(-T - r, -H + tf + r, 0, -π / 2);
    pt.push([-B, -H + tf]);
    // Liggend: het lijf evenwijdig aan y (gespiegeld om de diagonaal).
    if (getal(rij[9]) >= 0.5) pt = pt.map(([a, c]) => [c, a]);
  }
  const f = (v: number) => (Number.isFinite(v) ? Number(v.toFixed(2)) : 0);
  return pt.map(([a, c]) => `${f(x0 + schaal * (d.y + a))},${f(y0 - schaal * (d.z + c))}`).join(' ');
}
