/**
 * Raamwerk — een vlak raamwerk van rechte, prismatische staven, eerste orde
 * opgelost met de verplaatsingsmethode.
 *
 * Een knoop heeft drie vrijheidsgraden: u_x, u_y en een rotatie. Een staaf
 * verbindt twee knopen, met een buigstijfheid EI en een rekstijfheid EA; elk
 * staafeinde kan een scharnier zijn (het moment daar is nul, het staafeinde
 * draait los van de knoop). Een oplegging houdt u_x, u_y en de rotatie van een
 * knoop elk wel of niet vast: een vast scharnier, een rol of een inklemming.
 * Zo zijn een portaal met scharnierende of ingeklemde voeten, een spant met of
 * zonder trekband, een lessenaarspant en een vakwerkje allemaal dezelfde som.
 *
 * Elke staaf is één element met de exacte stijfheidsmatrix van een
 * prismatische staaf (rek en buiging). De lasten op een staaf gaan er als
 * arbeidsequivalente knooplasten in (lineaire vormfuncties voor de rek, die van
 * Hermite voor de buiging, beide exact voor een prismatische staaf). Na het
 * oplossen volgen N, V en M langs de staaf uit het evenwicht vanaf het
 * begin van de staaf en de verplaatsingen uit het integreren van de rek en de
 * kromming. Er zit dus geen discretisatiefout in: de uitkomsten zijn exact
 * binnen de staaftheorie (geen afschuifvervorming, kleine verplaatsingen).
 * De scharnieren zijn eigen vrijheidsgraden (de rotatie van het staafeinde);
 * een knoop waar alle staven scharnierend aansluiten en die niet is ingeklemd,
 * draait vrij en telt niet mee (een knoopmoment daar gaat verloren).
 *
 * Eenheden: kale getallen in één samenhangend stelsel; het rekenblad gebruikt
 * m, kN, kN/m, kNm, kNm² (EI) en kN (EA). De verplaatsingen komen dan in m.
 *
 * Assen en tekens:
 *   • x naar rechts, y omhoog (knopen, verplaatsingen u_x en u_y, reacties
 *     R_x en R_y); een reactie werkt op het raamwerk.
 *   • Een last naar beneden is positief (richting 2 en 3), net als in de
 *     ligger; een last in x naar rechts. Een moment (last, reactie, rotatie)
 *     is positief rechtsom.
 *   • Per staaf van knoop i naar knoop j: N is positief bij trek; M is
 *     positief bij trek aan de rechterkant van de staaf, gezien van i naar j;
 *     V = dM/ds, met s de afstand vanaf i. Nummer de staven met de klok mee
 *     rond het raamwerk (linkerkolom omhoog, de regel naar rechts, de
 *     rechterkolom omlaag), dan is de rechterkant de binnenkant: M positief bij
 *     trek aan de binnenzijde en een last loodrecht op de staaf (richting 4)
 *     positief als druk op de buitenkant.
 *   • w is de verplaatsing loodrecht op de staaf ten opzichte van de rechte
 *     lijn door de verplaatste staafeinden, positief naar de rechterkant: de
 *     doorbuiging van de staaf zelf.
 *
 * Invoer:
 *   knopen      rijen [x, y]; het knoopnummer is het rijnummer (vanaf 1).
 *   staven      rijen [i, j, EI, EA, scharnier_i, scharnier_j]; scharnier 1 is
 *               een momentvrij staafeinde. Een rij met knoop 0 telt niet mee
 *               (ongebruikte staaf); het staafnummer is het rijnummer.
 *   opleggingen rijen [knoop, x, y, rotatie]: 1 = vast, 0 = vrij. Een rij met
 *               knoop 0 telt niet mee.
 *   lasten      rijen [nr, soort, a, b, q_a, q_b, richting]:
 *     soort 0  geen last (ongebruikte rij)
 *           1  verdeelde last op staaf nr van a tot b (afstand vanaf knoop i,
 *              langs de staaf), lineair van q_a naar q_b
 *           2  puntlast q_a op staaf nr op afstand a
 *           3  knooplast q_a op knoop nr (a, b en q_b tellen niet)
 *     richting 1  in x, naar rechts positief, per m staaf
 *              2  verticaal, naar beneden positief, per m staaf (eigen gewicht)
 *              3  verticaal, naar beneden positief, per m horizontale
 *                 projectie (sneeuw); bij een puntlast of knooplast als 2
 *              4  loodrecht op de staaf, positief naar de rechterkant (wind)
 *              5  langs de staaf, positief van i naar j
 *              6  moment, rechtsom positief (puntlast of knooplast)
 *   Wat buiten de staaf valt, telt niet.
 *
 * Een factorvector f (één factor per lastrij) maakt van één lastmatrix elke
 * belastingcombinatie; alle uitkomsten van dezelfde knopen, staven,
 * opleggingen en lastmatrix liggen op hetzelfde raster, zodat ze punt voor
 * punt te combineren zijn (ligger_max en ligger_min werken er ook op).
 *
 * De kritieke belastingsfactor α_cr (raamwerkKnik) is die van de algemene
 * elastische instabiliteit bij de normaalkrachten uit de eersteordeberekening
 * van dezelfde combinatie: de kleinste α > 0 waarvoor K + α·K_G singulier
 * wordt, met K_G de geometrische stijfheidsmatrix. Daarvoor is elke staaf in
 * zes elementen verdeeld; het aantal negatieve spilelementen van een
 * LDLᵀ-ontbinding telt de kritieke factoren onder α (wet van Sylvester), en
 * een bisectie vindt de kleinste. Zonder drukkracht is er geen knik: dan
 * 10⁶.
 */

// ── Invoer ───────────────────────────────────────────────────────────────────

/** Soort van een lastrij (tweede kolom van de lastmatrix). */
export const RAAMWERK_LAST = { GEEN: 0, VERDEELD: 1, PUNT: 2, KNOOP: 3 } as const;
/** Richting van een last (zevende kolom van de lastmatrix). */
export const RAAMWERK_RICHTING = { X: 1, Y: 2, Y_PROJECTIE: 3, LOODRECHT: 4, AXIAAL: 5, MOMENT: 6 } as const;
/** Uitkomst van raamwerkStatus(). */
export const RAAMWERK_STATUS = { BEWEEGLIJK: -1, ONGELDIG: 0, STABIEL: 1 } as const;

/** α_cr als er geen knik is (geen drukkracht, of pas boven deze factor). */
export const RAAMWERK_GEEN_KNIK = 1e6;

interface Knoop {
  x: number;
  y: number;
}

interface Staaf {
  /** Staafnummer: het rijnummer in de invoer (vanaf 1). */
  nr: number;
  i: number;
  j: number;
  EI: number;
  EA: number;
  L: number;
  /** cos en sin van de staafrichting i → j. */
  c: number;
  s: number;
  /** Globale vrijheidsgraden [u_x i, u_y i, θ i, u_x j, u_y j, θ j]; θ is die van het staafeinde. */
  dof: number[];
}

interface Oplegging {
  knoop: number;
  vx: boolean;
  vy: boolean;
  vr: boolean;
}

interface Model {
  status: number;
  knopen: Knoop[];
  staven: Staaf[];
  /** Staafnummer → index in `staven`, of -1. */
  perNr: Map<number, number>;
  opleggingen: Oplegging[];
  nDof: number;
  vast: Uint8Array;
  vrij: number[];
  K: number[][];
  Kinv: number[][];
  tol: number;
  Ltot: number;
}

/** Een last na het toepassen van de factor, in de assen van de staaf. */
interface Last {
  /** Index in model.staven, of -1 voor een knooplast. */
  staaf: number;
  knoop: number;
  soort: number;
  /** Verdeeld: q(t) = qa + (qb − qa)·(t − a)/(b − a), meetellend van lo tot hi. */
  a: number;
  b: number;
  qa: number;
  qb: number;
  lo: number;
  hi: number;
  /** Eenheidsvector van de last in de staafassen (x' langs de staaf, y' links ervan). */
  ex: number;
  ey: number;
  /** Knooplast in globale assen; moment linksom (intern). */
  fx: number;
  fy: number;
  m: number;
}

/** Punt van het raster: staaf (index), afstand s en de kant bij een sprong. */
interface Punt {
  staaf: number;
  s: number;
  kant: number;
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

// ── Model ────────────────────────────────────────────────────────────────────

function leegModel(status: number): Model {
  return {
    status, knopen: [], staven: [], perNr: new Map(), opleggingen: [], nDof: 0, vast: new Uint8Array(0),
    vrij: [], K: [], Kinv: [], tol: 1e-9, Ltot: 0,
  };
}

function bouwModel(knIn: number[][], stIn: number[][], opIn: number[][]): Model {
  const knopen: Knoop[] = knIn.filter((r) => r.length >= 2).map((r) => ({ x: r[0], y: r[1] }));
  if (knopen.length < 2) return leegModel(RAAMWERK_STATUS.ONGELDIG);
  let bereik = 1;
  for (const k of knopen) bereik = Math.max(bereik, Math.abs(k.x), Math.abs(k.y));
  const tol = 1e-9 * bereik;
  const nKn = knopen.length;

  const staven: Staaf[] = [];
  const perNr = new Map<number, number>();
  let n = 3 * nKn;
  for (let r = 0; r < stIn.length; r++) {
    const rij = stIn[r];
    const i = Math.round(rij[0] ?? 0);
    const j = Math.round(rij[1] ?? 0);
    if (i <= 0 || j <= 0) continue;
    if (i > nKn || j > nKn || i === j) return leegModel(RAAMWERK_STATUS.ONGELDIG);
    const EI = getal(rij[2]);
    const EA = getal(rij[3]);
    if (!(EI > 0) || !(EA > 0)) return leegModel(RAAMWERK_STATUS.ONGELDIG);
    const A = knopen[i - 1];
    const B = knopen[j - 1];
    const L = Math.hypot(B.x - A.x, B.y - A.y);
    if (!(L > tol)) return leegModel(RAAMWERK_STATUS.ONGELDIG);
    const hi = getal(rij[4]) >= 0.5;
    const hj = getal(rij[5]) >= 0.5;
    const ti = hi ? n++ : 3 * (i - 1) + 2;
    const tj = hj ? n++ : 3 * (j - 1) + 2;
    perNr.set(r + 1, staven.length);
    staven.push({
      nr: r + 1, i: i - 1, j: j - 1, EI, EA, L, c: (B.x - A.x) / L, s: (B.y - A.y) / L,
      dof: [3 * (i - 1), 3 * (i - 1) + 1, ti, 3 * (j - 1), 3 * (j - 1) + 1, tj],
    });
  }
  if (!staven.length) return leegModel(RAAMWERK_STATUS.ONGELDIG);

  const opleggingen: Oplegging[] = [];
  const vast = new Uint8Array(n);
  for (const rij of opIn) {
    const k = Math.round(rij[0] ?? 0);
    if (k <= 0) continue;
    if (k > nKn) return leegModel(RAAMWERK_STATUS.ONGELDIG);
    const o = { knoop: k - 1, vx: getal(rij[1]) >= 0.5, vy: getal(rij[2]) >= 0.5, vr: getal(rij[3]) >= 0.5 };
    opleggingen.push(o);
    if (o.vx) vast[3 * o.knoop] = 1;
    if (o.vy) vast[3 * o.knoop + 1] = 1;
    if (o.vr) vast[3 * o.knoop + 2] = 1;
  }

  const K: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const st of staven) {
    const ke = globaleStijfheid(st);
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) K[st.dof[a]][st.dof[b]] += ke[a][b];
  }
  // Een vrijheidsgraad zonder stijfheid (een knoop zonder staven, of een
  // rotatie waar alle staven scharnierend aansluiten) ligt vast op nul.
  for (let d = 0; d < n; d++) if (!vast[d] && K[d][d] === 0) vast[d] = 1;

  const vrij: number[] = [];
  for (let d = 0; d < n; d++) if (!vast[d]) vrij.push(d);
  const Kinv = inverteer(vrij.map((a) => vrij.map((b) => K[a][b])));
  const Ltot = staven.reduce((t, st) => t + st.L, 0);
  return {
    status: Kinv ? RAAMWERK_STATUS.STABIEL : RAAMWERK_STATUS.BEWEEGLIJK,
    knopen, staven, perNr, opleggingen, nDof: n, vast, vrij, K, Kinv: Kinv ?? [], tol, Ltot,
  };
}

/** Stijfheidsmatrix in de staafassen: [u_i, v_i, θ_i, u_j, v_j, θ_j], v loodrecht, naar links. */
function lokaleStijfheid(EI: number, EA: number, l: number): number[][] {
  const a = EA / l;
  const b = (12 * EI) / (l * l * l);
  const c = (6 * EI) / (l * l);
  const d = (4 * EI) / l;
  const e = (2 * EI) / l;
  return [
    [a, 0, 0, -a, 0, 0],
    [0, b, c, 0, -b, c],
    [0, c, d, 0, -c, e],
    [-a, 0, 0, a, 0, 0],
    [0, -b, -c, 0, b, -c],
    [0, c, e, 0, -c, d],
  ];
}

/** T·u_globaal = u_lokaal, per knoop het blok [[c, s, 0], [−s, c, 0], [0, 0, 1]]. */
function naarLokaal(c: number, s: number, u: number[]): number[] {
  return [c * u[0] + s * u[1], -s * u[0] + c * u[1], u[2], c * u[3] + s * u[4], -s * u[3] + c * u[4], u[5]];
}

function naarGlobaal(c: number, s: number, f: number[]): number[] {
  return [c * f[0] - s * f[1], s * f[0] + c * f[1], f[2], c * f[3] - s * f[4], s * f[3] + c * f[4], f[5]];
}

/** Tᵀ·k·T voor een 6×6-matrix in de staafassen. */
function transformeer(k: number[][], c: number, s: number): number[][] {
  const T = [
    [c, s, 0, 0, 0, 0],
    [-s, c, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, c, s, 0],
    [0, 0, 0, -s, c, 0],
    [0, 0, 0, 0, 0, 1],
  ];
  const kT = k.map((r) => [0, 1, 2, 3, 4, 5].map((b) => r.reduce((t, v, m) => t + v * T[m][b], 0)));
  return [0, 1, 2, 3, 4, 5].map((a) => [0, 1, 2, 3, 4, 5].map((b) => T.reduce((t, r, m) => t + r[a] * kT[m][b], 0)));
}

function globaleStijfheid(st: Staaf): number[][] {
  return transformeer(lokaleStijfheid(st.EI, st.EA, st.L), st.c, st.s);
}

/**
 * Inverse met Gauss-Jordan en rijpivotering; null als de matrix singulier is
 * (het raamwerk is dan beweeglijk). De drempel is relatief ten opzichte van de
 * grootste diagonaalterm.
 */
function inverteer(A: number[][]): number[][] | null {
  const n = A.length;
  if (n === 0) return [];
  const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  let schaal = 0;
  for (let i = 0; i < n; i++) schaal = Math.max(schaal, Math.abs(A[i][i]));
  const drempel = 1e-11 * (schaal || 1);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (Math.abs(M[p][k]) < drempel) return null;
    [M[k], M[p]] = [M[p], M[k]];
    const pk = M[k][k];
    for (let j = 0; j < 2 * n; j++) M[k][j] /= pk;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = M[i][k];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[i][j] -= f * M[k][j];
    }
  }
  return M.map((r) => r.slice(n));
}

// ── Lasten ──────────────────────────────────────────────────────────────────

/** Eenheidsvector van een last in de staafassen (x' langs de staaf, y' links). */
function lastRichting(st: Staaf, richting: number, puntlast: boolean): [number, number] | null {
  const { c, s } = st;
  switch (richting) {
    case RAAMWERK_RICHTING.X: return [c, -s];
    case RAAMWERK_RICHTING.Y: return [-s, -c];
    case RAAMWERK_RICHTING.Y_PROJECTIE: return puntlast ? [-s, -c] : [-s * Math.abs(c), -c * Math.abs(c)];
    case RAAMWERK_RICHTING.LOODRECHT: return [0, -1];
    case RAAMWERK_RICHTING.AXIAAL: return [1, 0];
    default: return null;
  }
}

/** De lasten zoals ze meetellen, met de factor per rij (standaard 1). */
function effectieveLasten(model: Model, lastIn: number[][], f?: number[]): Last[] {
  const uit: Last[] = [];
  const t = model.tol;
  lastIn.forEach((r, k) => {
    const soort = Math.round(r[1] ?? 0);
    const fac = f ? getal(f[k] ?? 0) : 1;
    if (fac === 0 || soort === RAAMWERK_LAST.GEEN) return;
    const nr = Math.round(r[0] ?? 0);
    const richting = Math.round(r[6] ?? 0);
    const leeg = { staaf: -1, knoop: -1, soort, a: 0, b: 0, qa: 0, qb: 0, lo: 0, hi: 0, ex: 0, ey: 0, fx: 0, fy: 0, m: 0 };
    if (soort === RAAMWERK_LAST.KNOOP) {
      if (nr < 1 || nr > model.knopen.length) return;
      const q = getal(r[4]) * fac;
      if (q === 0) return;
      const l = { ...leeg, knoop: nr - 1 };
      if (richting === RAAMWERK_RICHTING.X) l.fx = q;
      else if (richting === RAAMWERK_RICHTING.Y || richting === RAAMWERK_RICHTING.Y_PROJECTIE) l.fy = -q;
      else if (richting === RAAMWERK_RICHTING.MOMENT) l.m = -q;
      else return;
      uit.push(l);
      return;
    }
    const si = model.perNr.get(nr);
    if (si === undefined) return;
    const st = model.staven[si];
    if (soort === RAAMWERK_LAST.VERDEELD) {
      let a = getal(r[2]);
      let b = getal(r[3]);
      let qa = getal(r[4]) * fac;
      let qb = getal(r[5]) * fac;
      if (b < a) [a, b, qa, qb] = [b, a, qb, qa];
      if (!(b - a > t) || (qa === 0 && qb === 0)) return;
      const lo = Math.max(a, 0);
      const hi = Math.min(b, st.L);
      if (!(hi - lo > t)) return;
      const e = lastRichting(st, richting, false);
      if (!e) return;
      uit.push({ ...leeg, staaf: si, a, b, qa, qb, lo, hi, ex: e[0], ey: e[1] });
    } else if (soort === RAAMWERK_LAST.PUNT) {
      const a = getal(r[2]);
      const q = getal(r[4]) * fac;
      if (q === 0 || a < -t || a > st.L + t) return;
      const x = Math.min(Math.max(a, 0), st.L);
      if (richting === RAAMWERK_RICHTING.MOMENT) {
        uit.push({ ...leeg, staaf: si, a: x, b: x, qa: q, qb: q, lo: x, hi: x, m: -q });
        return;
      }
      const e = lastRichting(st, richting, true);
      if (!e) return;
      uit.push({ ...leeg, staaf: si, a: x, b: x, qa: q, qb: q, lo: x, hi: x, ex: e[0], ey: e[1] });
    }
  });
  return uit;
}

/** Waarde van een verdeelde last in t. */
const qIn = (p: Last, t: number) => p.qa + ((p.qb - p.qa) * (t - p.a)) / (p.b - p.a);

const GAUSS = [
  [-Math.sqrt(3 / 5), 5 / 9],
  [0, 8 / 9],
  [Math.sqrt(3 / 5), 5 / 9],
];

/** Arbeidsequivalente knooplasten van één last op zijn staaf, in de staafassen. */
function knooplasten(st: Staaf, p: Last): number[] {
  const f = [0, 0, 0, 0, 0, 0];
  const l = st.L;
  const vorm = (t: number) => {
    const k = t / l;
    return {
      Na: [1 - k, k],
      H: [1 - 3 * k * k + 2 * k ** 3, l * (k - 2 * k * k + k ** 3), 3 * k * k - 2 * k ** 3, l * (-k * k + k ** 3)],
      dH: [(-6 * k + 6 * k * k) / l, 1 - 4 * k + 3 * k * k, (6 * k - 6 * k * k) / l, -2 * k + 3 * k * k],
    };
  };
  const tel = (t: number, px: number, py: number) => {
    const v = vorm(t);
    f[0] += v.Na[0] * px;
    f[3] += v.Na[1] * px;
    f[1] += v.H[0] * py;
    f[2] += v.H[1] * py;
    f[4] += v.H[2] * py;
    f[5] += v.H[3] * py;
  };
  if (p.soort === RAAMWERK_LAST.VERDEELD) {
    const m = (p.lo + p.hi) / 2;
    const h = (p.hi - p.lo) / 2;
    for (const [g, w] of GAUSS) {
      const t = m + h * g;
      const q = qIn(p, t) * w * h;
      tel(t, p.ex * q, p.ey * q);
    }
  } else if (p.m !== 0) {
    const v = vorm(p.a);
    f[1] += v.dH[0] * p.m;
    f[2] += v.dH[1] * p.m;
    f[4] += v.dH[2] * p.m;
    f[5] += v.dH[3] * p.m;
  } else {
    tel(p.a, p.ex * p.qa, p.ey * p.qa);
  }
  return f;
}

const FAC = [1, 1, 2, 6, 24, 120];

/**
 * Integralen van de lasten op één staaf vanaf het begin tot s:
 *   Iy_n(s) = Σ ∫ p_y'(t)·(s − t)^n/n! dt (en de puntlasten P_y'·(s − a)^n/n!),
 *   Ix_n(s) idem langs de staaf, J_n(s) = Σ C·(s − a)^n/n! voor de momenten.
 * Een puntlast of moment precies op s telt alleen aan de rechterkant mee.
 */
function integralen(lasten: Last[], si: number, s: number, kant: number, tol: number) {
  const Iy = [0, 0, 0, 0];
  const Ix = [0, 0];
  const J = [0, 0, 0];
  for (const p of lasten) {
    if (p.staaf !== si) continue;
    if (p.soort === RAAMWERK_LAST.VERDEELD) {
      const s0 = p.lo;
      const s1 = Math.min(p.hi, s);
      if (!(s1 > s0)) continue;
      const k1 = (p.qb - p.qa) / (p.b - p.a);
      const c0 = p.qa + k1 * (s - p.a);
      const u0 = s - s1;
      const u1 = s - s0;
      for (let n = 0; n <= 3; n++) {
        const a = (u1 ** (n + 1) - u0 ** (n + 1)) / FAC[n + 1];
        const b = ((n + 1) * (u1 ** (n + 2) - u0 ** (n + 2))) / FAC[n + 2];
        const w = c0 * a - k1 * b;
        Iy[n] += p.ey * w;
        if (n <= 1) Ix[n] += p.ex * w;
      }
    } else {
      const telt = p.a < s - tol || (Math.abs(p.a - s) <= tol && kant > 0);
      if (!telt) continue;
      const d = Math.max(0, s - p.a);
      if (p.m !== 0) {
        for (let n = 0; n <= 2; n++) J[n] += (p.m * d ** n) / FAC[n];
      } else {
        for (let n = 0; n <= 3; n++) Iy[n] += (p.ey * p.qa * d ** n) / FAC[n];
        for (let n = 0; n <= 1; n++) Ix[n] += (p.ex * p.qa * d ** n) / FAC[n];
      }
    }
  }
  return { Iy, Ix, J };
}

// ── Oplossen ─────────────────────────────────────────────────────────────────

/** Een opgeloste belastingtoestand. */
interface Toestand {
  model: Model;
  lasten: Last[];
  /** Globale verplaatsingen (rotaties linksom). */
  u: Float64Array;
  /** Belastingvector (arbeidsequivalent), globaal. */
  F: Float64Array;
  /** Per staaf: de krachten van de knopen op de staaf, in de staafassen: k·u − f. */
  eind: number[][];
  /** Per staaf: de verplaatsingen van de staafeinden in de staafassen. */
  ul: number[][];
}

function losOp(model: Model, lasten: Last[]): Toestand {
  const n = model.nDof;
  const F = new Float64Array(n);
  const fe = model.staven.map(() => [0, 0, 0, 0, 0, 0]);
  for (const p of lasten) {
    if (p.staaf >= 0) {
      const f = knooplasten(model.staven[p.staaf], p);
      for (let a = 0; a < 6; a++) fe[p.staaf][a] += f[a];
    } else {
      F[3 * p.knoop] += p.fx;
      F[3 * p.knoop + 1] += p.fy;
      F[3 * p.knoop + 2] += p.m;
    }
  }
  model.staven.forEach((st, k) => {
    const g = naarGlobaal(st.c, st.s, fe[k]);
    for (let a = 0; a < 6; a++) F[st.dof[a]] += g[a];
  });
  const u = new Float64Array(n);
  const m = model.vrij.length;
  for (let a = 0; a < m; a++) {
    let s = 0;
    const r = model.Kinv[a];
    for (let b = 0; b < m; b++) s += r[b] * F[model.vrij[b]];
    u[model.vrij[a]] = s;
  }
  const ul: number[][] = [];
  const eind = model.staven.map((st, k) => {
    const ug = st.dof.map((d) => u[d]);
    const loc = naarLokaal(st.c, st.s, ug);
    ul.push(loc);
    const ke = lokaleStijfheid(st.EI, st.EA, st.L);
    return [0, 1, 2, 3, 4, 5].map((a) => ke[a].reduce((t, v, b) => t + v * loc[b], 0) - fe[k][a]);
  });
  return { model, lasten, u, F, eind, ul };
}

/** N, V, M, de verplaatsingen en w in punt s van staaf si (kant −1 of +1 bij een sprong). */
function waarde(t: Toestand, si: number, s: number, kant: number) {
  const st = t.model.staven[si];
  const P = t.eind[si];
  const [ui, vi, ti, , vj] = t.ul[si];
  const { Iy, Ix, J } = integralen(t.lasten, si, s, kant, t.model.tol);
  const N = -P[0] - Ix[0];
  const V = P[1] + Iy[0];
  const M = -P[2] + s * P[1] + Iy[1] - J[0];
  const v = vi + ti * s + ((-P[2] * s * s) / 2 + (P[1] * s ** 3) / 6 + Iy[3] - J[2]) / st.EI;
  const ua = ui + (-P[0] * s - Ix[1]) / st.EA;
  const ux = st.c * ua - st.s * v;
  const uy = st.s * ua + st.c * v;
  const w = -(v - (vi + ((vj - vi) * s) / st.L));
  return { N, V, M, ux, uy, w };
}

/** Oplegreacties [knoop, R_x, R_y, M] (M rechtsom) per oplegging. */
function reacties(t: Toestand): number[][] {
  const { model } = t;
  const R = new Float64Array(model.nDof);
  for (let a = 0; a < model.nDof; a++) {
    if (!model.vast[a]) continue;
    let s = -t.F[a];
    const r = model.K[a];
    for (let b = 0; b < model.nDof; b++) s += r[b] * t.u[b];
    R[a] = s;
  }
  return model.opleggingen.map((o) => [
    o.knoop + 1,
    o.vx ? R[3 * o.knoop] : 0,
    o.vy ? R[3 * o.knoop + 1] : 0,
    o.vr ? -R[3 * o.knoop + 2] : 0,
  ]);
}

// ── Raster ──────────────────────────────────────────────────────────────────

/**
 * Het vaste rekenraster: per staaf een gelijkmatige verdeling (ten minste 10
 * stukken, samen ongeveer 160 over het hele raamwerk), de begin- en eindpunten
 * van de verdeelde lasten en de plaats van elke puntlast. Bij een puntlast of
 * een moment springen V of M; daar staat het punt twee keer, eerst links en dan
 * rechts. Het begin van een staaf telt als rechterkant, het eind als linkerkant.
 */
function raster(model: Model, lastIn: number[][]): Punt[] {
  const t = model.tol;
  const lasten = effectieveLasten(model, lastIn);
  const punten: Punt[] = [];
  model.staven.forEach((st, si) => {
    const n = Math.max(10, Math.ceil((160 * st.L) / model.Ltot));
    const xs: number[] = [];
    for (let k = 0; k <= n; k++) xs.push((st.L * k) / n);
    const sprong: number[] = [];
    for (const p of lasten) {
      if (p.staaf !== si) continue;
      if (p.soort === RAAMWERK_LAST.VERDEELD) xs.push(p.lo, p.hi);
      else sprong.push(p.a);
    }
    xs.push(...sprong);
    xs.sort((a, b) => a - b);
    const uniek: number[] = [];
    for (const x of xs) {
      if (x < -t || x > st.L + t) continue;
      if (uniek.length && x - uniek[uniek.length - 1] <= t) continue;
      uniek.push(x);
    }
    for (const x of uniek) {
      if (Math.abs(x) <= t) punten.push({ staaf: si, s: 0, kant: 1 });
      else if (Math.abs(x - st.L) <= t) punten.push({ staaf: si, s: st.L, kant: -1 });
      else if (sprong.some((a) => Math.abs(a - x) <= t)) punten.push({ staaf: si, s: x, kant: -1 }, { staaf: si, s: x, kant: 1 });
      else punten.push({ staaf: si, s: x, kant: 0 });
    }
  });
  return punten;
}

/** De nulpunten van V tussen de rasterpunten van een staaf: de toppen van M. */
function toppen(t: Toestand, punten: Punt[]): Punt[] {
  const extra: Punt[] = [];
  const V = punten.map((p) => waarde(t, p.staaf, p.s, p.kant).V);
  for (let k = 0; k + 1 < punten.length; k++) {
    const a = punten[k];
    const b = punten[k + 1];
    if (a.staaf !== b.staaf || !(b.s - a.s > t.model.tol)) continue;
    if (!(V[k] * V[k + 1] < 0)) continue;
    let lo = a.s;
    let hi = b.s;
    let flo = V[k];
    for (let n = 0; n < 80 && hi - lo > t.model.tol; n++) {
      const m = (lo + hi) / 2;
      const fm = waarde(t, a.staaf, m, 0).V;
      if (fm * flo <= 0) hi = m;
      else { lo = m; flo = fm; }
    }
    extra.push({ staaf: a.staaf, s: (lo + hi) / 2, kant: 0 });
  }
  if (!extra.length) return punten;
  return [...punten, ...extra].sort((p, q) => p.staaf - q.staaf || p.s - q.s || p.kant - q.kant);
}

// ── Cache ───────────────────────────────────────────────────────────────────

interface Voorraad {
  model: Model;
  punten: Punt[];
}

const CACHE = new Map<string, Voorraad>();
const CACHE_MAX = 24;

function voorraad(kn: number[][], st: number[][], op: number[][], last: number[][]): Voorraad {
  const sleutel = JSON.stringify([kn, st, op, last]);
  const oud = CACHE.get(sleutel);
  if (oud) {
    CACHE.delete(sleutel);
    CACHE.set(sleutel, oud);
    return oud;
  }
  const model = modelVan(kn, st, op);
  const punten = model.status === RAAMWERK_STATUS.STABIEL ? raster(model, last) : [];
  const v: Voorraad = { model, punten };
  CACHE.set(sleutel, v);
  while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value as string);
  return v;
}

const MODELLEN = new Map<string, Model>();

function modelVan(kn: number[][], st: number[][], op: number[][]): Model {
  const sleutel = JSON.stringify([kn, st, op]);
  let m = MODELLEN.get(sleutel);
  if (!m) {
    m = bouwModel(kn, st, op);
    MODELLEN.set(sleutel, m);
    while (MODELLEN.size > CACHE_MAX) MODELLEN.delete(MODELLEN.keys().next().value as string);
  }
  return m;
}

/**
 * Een blad vraagt dezelfde oplossing vaak meer dan eens op (in een tabel, in
 * een toets, in een tekening); de uitkomst staat daarom even bewaard, als kopie.
 */
const UITKOMST = new Map<string, number[][]>();
const UITKOMST_MAX = 160;

function bewaard(sleutel: string, reken: () => number[][]): number[][] {
  const oud = UITKOMST.get(sleutel);
  if (oud) return oud.map((r) => [...r]);
  const uit = reken();
  UITKOMST.set(sleutel, uit.map((r) => [...r]));
  while (UITKOMST.size > UITKOMST_MAX) UITKOMST.delete(UITKOMST.keys().next().value as string);
  return uit;
}

/**
 * Afrondingsruis weg: per kolom (vanaf de derde) wordt een waarde kleiner dan
 * 1e-11 maal de grootste waarde in die kolom nul. Zo staat er bij een scharnier
 * M = 0 en niet −1,8e−15.
 */
function schoon(m: number[][], vanaf: number): number[][] {
  if (!m.length) return m;
  for (let k = vanaf; k < m[0].length; k++) {
    let max = 0;
    for (const r of m) max = Math.max(max, Math.abs(r[k]));
    const drempel = 1e-11 * max;
    for (const r of m) if (Math.abs(r[k]) < drempel) r[k] = 0;
  }
  return m;
}

// ── Publieke functies ────────────────────────────────────────────────────────

/**
 * 1 als het raamwerk stabiel is, -1 als het beweeglijk is (te weinig
 * opleggingen of een scharnier te veel), 0 als de invoer ongeldig is (minder
 * dan twee knopen, geen staven, een staaf van lengte nul, EI of EA niet
 * positief, een knoopnummer dat niet bestaat).
 */
export function raamwerkStatus(kn: unknown, st: unknown, op: unknown): number {
  return modelVan(rijen(kn), rijen(st), rijen(op)).status;
}

/**
 * Eén belastingtoestand: matrix met rijen [staaf, s, x, y, N, V, M, u_x, u_y, w]
 * langs elke staaf, op het vaste raster van deze invoer. `f` is de factor per
 * lastrij (standaard 1). Met `toppen` = 1 komen de punten waar V nul is erbij,
 * zodat de uitersten van M exact in de uitkomst staan; het raster is dan niet
 * meer voor elke f hetzelfde. Een beweeglijk of ongeldig raamwerk geeft één
 * rij nullen.
 */
export function raamwerkOplossing(kn: unknown, st: unknown, op: unknown, last: unknown, f?: number[], metToppen = 0): number[][] {
  const K = rijen(kn), S = rijen(st), O = rijen(op), P = rijen(last);
  return bewaard(JSON.stringify(['opl', K, S, O, P, f ?? null, metToppen ? 1 : 0]), () => {
    const v = voorraad(K, S, O, P);
    if (v.model.status !== RAAMWERK_STATUS.STABIEL) return [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
    const t = losOp(v.model, effectieveLasten(v.model, P, f));
    const punten = metToppen ? toppen(t, v.punten) : v.punten;
    return schoon(punten.map((p) => {
      const stf = v.model.staven[p.staaf];
      const A = v.model.knopen[stf.i];
      const z = waarde(t, p.staaf, p.s, p.kant);
      return [stf.nr, p.s, A.x + stf.c * p.s, A.y + stf.s * p.s, z.N, z.V, z.M, z.ux, z.uy, z.w];
    }), 4);
  });
}

/** Oplegreacties: per oplegging een rij [knoop, R_x, R_y, M], M rechtsom. */
export function raamwerkReacties(kn: unknown, st: unknown, op: unknown, last: unknown, f?: number[]): number[][] {
  const K = rijen(kn), S = rijen(st), O = rijen(op), P = rijen(last);
  return bewaard(JSON.stringify(['R', K, S, O, P, f ?? null]), () => {
    const v = voorraad(K, S, O, P);
    if (v.model.status !== RAAMWERK_STATUS.STABIEL) return [[0, 0, 0, 0]];
    return schoon(reacties(losOp(v.model, effectieveLasten(v.model, P, f))), 1);
  });
}

/** Knoopverplaatsingen: per knoop een rij [knoop, u_x, u_y, φ], φ rechtsom. */
export function raamwerkVerplaatsingen(kn: unknown, st: unknown, op: unknown, last: unknown, f?: number[]): number[][] {
  const K = rijen(kn), S = rijen(st), O = rijen(op), P = rijen(last);
  return bewaard(JSON.stringify(['u', K, S, O, P, f ?? null]), () => {
    const v = voorraad(K, S, O, P);
    if (v.model.status !== RAAMWERK_STATUS.STABIEL) return [[0, 0, 0, 0]];
    const t = losOp(v.model, effectieveLasten(v.model, P, f));
    return schoon(v.model.knopen.map((_, k) => [k + 1, t.u[3 * k], t.u[3 * k + 1], -t.u[3 * k + 2]]), 1);
  });
}

/**
 * Uitersten van kolom k (5 = N, 6 = V, 7 = M, 8 = u_x, 9 = u_y, 10 = w) van
 * een uitkomstmatrix, voor staaf nr (0 = alle staven): [max, s bij max, min,
 * s bij min].
 */
export function raamwerkExtremen(R: unknown, nr: number, k: number): number[] {
  const kol = Math.max(1, Math.round(k)) - 1;
  const staaf = Math.round(nr);
  let max = -Infinity, sMax = 0, min = Infinity, sMin = 0;
  for (const r of rijen(R)) {
    if (staaf > 0 && Math.round(r[0]) !== staaf) continue;
    const w = r[kol] ?? 0;
    if (w > max) { max = w; sMax = r[1] ?? 0; }
    if (w < min) { min = w; sMin = r[1] ?? 0; }
  }
  if (max === -Infinity) return [0, 0, 0, 0];
  return [max, sMax, min, sMin];
}

/**
 * Samenvatting van staaf nr uit een uitkomstmatrix, in één keer: [N_min,
 * N_max, V_min, V_max, M_min, M_max, M(0), M(L/4), M(L/2), M(3L/4), M(L), L,
 * w_min, w_max]. N_min is de grootste drukkracht (negatief), M op de vijf
 * punten lineair tussen de rasterpunten (op een sprong rechts ervan). Een staaf
 * die niet in de uitkomst staat, geeft nullen.
 */
export function raamwerkSamenvatting(R: unknown, nr: number): number[] {
  const rs = rijen(R).filter((r) => Math.round(r[0]) === Math.round(nr));
  if (!rs.length) return new Array<number>(14).fill(0);
  let nMin = Infinity, nMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  let mMin = Infinity, mMax = -Infinity, wMin = Infinity, wMax = -Infinity;
  for (const r of rs) {
    nMin = Math.min(nMin, r[4]); nMax = Math.max(nMax, r[4]);
    vMin = Math.min(vMin, r[5]); vMax = Math.max(vMax, r[5]);
    mMin = Math.min(mMin, r[6]); mMax = Math.max(mMax, r[6]);
    wMin = Math.min(wMin, r[9]); wMax = Math.max(wMax, r[9]);
  }
  const L = rs[rs.length - 1][1];
  const M = (x: number) => raamwerkInterpoleer(rs, nr, 7, x);
  return [nMin, nMax, vMin, vMax, mMin, mMax, M(0), M(L / 4), M(L / 2), M((3 * L) / 4), M(L), L, wMin, wMax];
}

/**
 * De grootste verticale verplaatsing van staaf nr ten opzichte van de lijn door
 * twee punten (x_a, u_a) en (x_b, u_b), met u de verticale verplaatsing: bij een
 * portaal de doorbuiging van de regel ten opzichte van de knieën. Absoluut, op
 * de rasterpunten.
 */
export function raamwerkZakking(R: unknown, nr: number, xa: number, ua: number, xb: number, ub: number): number {
  const dx = xb - xa;
  let max = 0;
  for (const r of rijen(R)) {
    if (Math.round(r[0]) !== Math.round(nr)) continue;
    const lijn = Math.abs(dx) > 1e-12 ? ua + ((ub - ua) * (r[2] - xa)) / dx : ua;
    max = Math.max(max, Math.abs(r[8] - lijn));
  }
  return max;
}

/**
 * Kolom k van staaf nr in s, lineair tussen de rasterpunten. Op een sprong de
 * waarde rechts ervan; buiten de staaf de waarde op het dichtstbijzijnde eind.
 */
export function raamwerkInterpoleer(R: unknown, nr: number, k: number, s: number): number {
  const kol = Math.max(1, Math.round(k)) - 1;
  const rs = rijen(R).filter((r) => Math.round(r[0]) === Math.round(nr));
  if (!rs.length) return 0;
  const t = 1e-9 * Math.max(1, Math.abs(s));
  if (s <= rs[0][1] + t) {
    let i = 0;
    while (i + 1 < rs.length && Math.abs(rs[i + 1][1] - rs[0][1]) <= t) i++;
    return rs[i][kol] ?? 0;
  }
  for (let i = 0; i + 1 < rs.length; i++) {
    const a = rs[i];
    const b = rs[i + 1];
    if (Math.abs(b[1] - s) <= t) {
      let j = i + 1;
      while (j + 1 < rs.length && Math.abs(rs[j + 1][1] - s) <= t) j++;
      return rs[j][kol] ?? 0;
    }
    if (s > a[1] && s < b[1]) {
      const r = (s - a[1]) / (b[1] - a[1]);
      return (a[kol] ?? 0) + r * ((b[kol] ?? 0) - (a[kol] ?? 0));
    }
  }
  return rs[rs.length - 1][kol] ?? 0;
}

/**
 * Punten voor een SVG-polygoon met het verloop van kolom k langs staaf nr:
 * van het begin van de staaf, langs de lijn op afstand waarde·sk loodrecht op
 * de staaf (positief naar de rechterkant, de trekzijde van M), naar het eind.
 * Een punt (x, y) van het raamwerk komt op X = x0 + schaal·x, Y = y0 − schaal·y.
 */
export function raamwerkSvgPunten(R: unknown, nr: number, k: number, x0: number, y0: number, schaal: number, sk: number): string {
  const kol = Math.max(1, Math.round(k)) - 1;
  const rs = rijen(R).filter((r) => Math.round(r[0]) === Math.round(nr));
  if (rs.length < 2) return '';
  const r2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
  const a = rs[0];
  const b = rs[rs.length - 1];
  const L = Math.hypot(b[2] - a[2], b[3] - a[3]) || 1;
  // Rechterkant van de richting (c, s) in assen met y omhoog: (s, −c).
  const nx = (b[3] - a[3]) / L;
  const ny = -(b[2] - a[2]) / L;
  const X = (x: number) => r2(x0 + schaal * x);
  const Y = (y: number) => r2(y0 - schaal * y);
  const lijn = rs.map((r) => {
    const d = (r[kol] ?? 0) * sk;
    return `${X(r[2] + nx * d)},${Y(r[3] + ny * d)}`;
  });
  return [`${X(a[2])},${Y(a[3])}`, ...lijn, `${X(b[2])},${Y(b[3])}`].join(' ');
}

/**
 * Punten voor een SVG-lijn met de verplaatste vorm van staaf nr: elk punt
 * (x + su·u_x, y + su·u_y), met X = x0 + schaal·x en Y = y0 − schaal·y.
 */
export function raamwerkVormPunten(R: unknown, nr: number, x0: number, y0: number, schaal: number, su: number): string {
  const r2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
  return rijen(R)
    .filter((r) => Math.round(r[0]) === Math.round(nr))
    .map((r) => `${r2(x0 + schaal * (r[2] + su * r[7]))},${r2(y0 - schaal * (r[3] + su * r[8]))}`)
    .join(' ');
}

// ── Knik: de kritieke belastingsfactor ──────────────────────────────────────

/** Aantal elementen per staaf in de knikberekening. */
const KNIK_DELEN = 6;

interface KnikModel {
  n: number;
  /** Per staaf de zes elementen: begin- en eindafstand en de vrijheidsgraden in de staafassen-volgorde. */
  elementen: { staaf: number; s0: number; s1: number; dof: number[] }[];
  vrij: number[];
  KE: number[][];
}

const KNIK = new Map<string, KnikModel>();

function knikModel(model: Model, sleutel: string): KnikModel {
  const oud = KNIK.get(sleutel);
  if (oud) return oud;
  let n = model.nDof;
  const elementen: KnikModel['elementen'] = [];
  model.staven.forEach((st, si) => {
    let vorige = [st.dof[0], st.dof[1], st.dof[2]];
    for (let e = 0; e < KNIK_DELEN; e++) {
      const laatste = e === KNIK_DELEN - 1;
      const volgende = laatste ? [st.dof[3], st.dof[4], st.dof[5]] : [n++, n++, n++];
      elementen.push({ staaf: si, s0: (st.L * e) / KNIK_DELEN, s1: (st.L * (e + 1)) / KNIK_DELEN, dof: [...vorige, ...volgende] });
      vorige = volgende;
    }
  });
  const KE: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const el of elementen) {
    const st = model.staven[el.staaf];
    const ke = transformeer(lokaleStijfheid(st.EI, st.EA, el.s1 - el.s0), st.c, st.s);
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) KE[el.dof[a]][el.dof[b]] += ke[a][b];
  }
  const vrij: number[] = [];
  for (let d = 0; d < n; d++) if (d >= model.nDof || !model.vast[d]) vrij.push(d);
  const km = { n, elementen, vrij, KE };
  KNIK.set(sleutel, km);
  while (KNIK.size > CACHE_MAX) KNIK.delete(KNIK.keys().next().value as string);
  return km;
}

/** Geometrische stijfheid in de staafassen voor normaalkracht N (trek positief). */
function geometrischeStijfheid(N: number, l: number): number[][] {
  const g = N / (30 * l);
  return [
    [0, 0, 0, 0, 0, 0],
    [0, 36 * g, 3 * l * g, 0, -36 * g, 3 * l * g],
    [0, 3 * l * g, 4 * l * l * g, 0, -3 * l * g, -l * l * g],
    [0, 0, 0, 0, 0, 0],
    [0, -36 * g, -3 * l * g, 0, 36 * g, -3 * l * g],
    [0, 3 * l * g, -l * l * g, 0, -3 * l * g, 4 * l * l * g],
  ];
}

/** Aantal negatieve spilelementen van de symmetrische matrix A (LDLᵀ zonder pivotering). */
function negatief(A: number[][]): number {
  const n = A.length;
  const M = A.map((r) => [...r]);
  let schaal = 0;
  for (let i = 0; i < n; i++) schaal = Math.max(schaal, Math.abs(M[i][i]));
  const klein = 1e-14 * (schaal || 1);
  let tel = 0;
  for (let k = 0; k < n; k++) {
    let d = M[k][k];
    if (Math.abs(d) < klein) d = d < 0 ? -klein : klein;
    if (d < 0) tel++;
    const rk = M[k];
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / d;
      if (f === 0) continue;
      const ri = M[i];
      for (let j = k + 1; j < n; j++) ri[j] -= f * rk[j];
    }
  }
  return tel;
}

/**
 * De kritieke belastingsfactor α_cr van de combinatie f: de kleinste α > 0
 * waarvoor het raamwerk met α maal de normaalkrachten uit de
 * eersteordeberekening elastisch instabiel wordt. Zonder drukkracht, of als
 * α_cr boven 10⁶ ligt: 10⁶. Een beweeglijk of ongeldig raamwerk geeft 0.
 */
export function raamwerkKnik(kn: unknown, st: unknown, op: unknown, last: unknown, f?: number[]): number {
  const K = rijen(kn), S = rijen(st), O = rijen(op), P = rijen(last);
  const sleutel = JSON.stringify(['acr', K, S, O, P, f ?? null]);
  const oud = UITKOMST.get(sleutel);
  if (oud) return oud[0][0];
  const v = voorraad(K, S, O, P);
  let uit = 0;
  if (v.model.status === RAAMWERK_STATUS.STABIEL) {
    const t = losOp(v.model, effectieveLasten(v.model, P, f));
    const km = knikModel(v.model, JSON.stringify([K, S, O]));
    const KG: number[][] = Array.from({ length: km.n }, () => new Array<number>(km.n).fill(0));
    let druk = false;
    for (const el of km.elementen) {
      const stf = v.model.staven[el.staaf];
      const N = waarde(t, el.staaf, (el.s0 + el.s1) / 2, 0).N;
      if (N < 0) druk = true;
      const kg = transformeer(geometrischeStijfheid(N, el.s1 - el.s0), stf.c, stf.s);
      for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) KG[el.dof[a]][el.dof[b]] += kg[a][b];
    }
    uit = RAAMWERK_GEEN_KNIK;
    if (druk) {
      const tel = (alfa: number) => negatief(km.vrij.map((a) => km.vrij.map((b) => km.KE[a][b] + alfa * KG[a][b])));
      let lo = 0;
      let hi = 1;
      while (hi < RAAMWERK_GEEN_KNIK && tel(hi) === 0) { lo = hi; hi *= 4; }
      if (hi < RAAMWERK_GEEN_KNIK || tel(RAAMWERK_GEEN_KNIK) > 0) {
        hi = Math.min(hi, RAAMWERK_GEEN_KNIK);
        for (let k = 0; k < 200 && hi - lo > 1e-9 * hi; k++) {
          const m = (lo + hi) / 2;
          if (tel(m) > 0) hi = m;
          else lo = m;
        }
        uit = (lo + hi) / 2;
      }
    }
  }
  UITKOMST.set(sleutel, [[uit]]);
  while (UITKOMST.size > UITKOMST_MAX) UITKOMST.delete(UITKOMST.keys().next().value as string);
  return uit;
}
