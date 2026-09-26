/**
 * Ligger — een rechte ligger met constante buigstijfheid EI, opgelost met de
 * verplaatsingsmethode.
 *
 * De ligger loopt van het meest linkse tot het meest rechtse punt van de
 * geometrie. Een punt is een steunpunt (verticaal vast), een inklemming
 * (verticaal vast en niet draaibaar), een scharnier (moment nul, de twee kanten
 * draaien los van elkaar) of een vrij punt, bijvoorbeeld het eind van een
 * overstek. Zo zijn een ligger op twee steunpunten, een doorgaande ligger op
 * drie of vier steunpunten, overstekken, een uitkraging, een eenzijdig of
 * tweezijdig ingeklemde ligger en een gerberligger allemaal dezelfde som.
 *
 * Elk stuk tussen twee opeenvolgende punten is een balkelement met de exacte
 * stijfheidsmatrix van een prismatische ligger. De lasten binnen een element
 * gaan er als arbeidsequivalente knooplasten in (de vormfuncties van Hermite
 * zijn voor een prismatische ligger exact). Na het oplossen volgen dwarskracht,
 * moment en doorbuiging in elk punt uit het evenwicht van het element vanaf
 * zijn linkereind en uit tweemaal integreren van de kromming. Er zit dus geen
 * discretisatiefout in: de uitkomsten zijn exact binnen de balktheorie
 * (buigvervorming, geen afschuifvervorming, kleine verplaatsingen).
 *
 * Eenheden: kale getallen in één samenhangend stelsel. Het rekenblad gebruikt
 * m, kN, kN/m, kNm en kNm²; de doorbuiging komt dan in m.
 *
 * Tekenafspraak: een last naar beneden is positief, de doorbuiging naar beneden
 * is positief, een moment met trek aan de onderzijde (veldmoment) is positief
 * en de dwarskracht is V = dM/dx (links van een veld dus positief onder een
 * neerwaartse last). Een oplegreactie omhoog is positief. Een puntmoment is
 * positief rechtsom; het moment in de ligger springt daar met +C.
 *
 * Geometrie: matrix met rijen [x, soort]:
 *   soort 0  vrij punt (eind van een overstek)
 *         1  steunpunt, scharnierend of rol
 *         2  inklemming
 *         3  scharnier in de ligger (gerberscharnier)
 *   een negatieve soort telt niet mee (ongebruikte rij). Rijen met dezelfde x
 *   worden samengevoegd, zodat een scharnier boven een steunpunt kan staan.
 *
 * Lasten: matrix met rijen [soort, a, b, q_a, q_b]:
 *   soort 0  geen last (ongebruikte rij)
 *         1  verdeelde last van a tot b, lineair van q_a in a naar q_b in b:
 *            gelijkmatig (q_a = q_b), trapezium of driehoek (een van beide 0)
 *         2  puntlast q_a in a
 *         3  puntmoment q_a in a, rechtsom positief
 *   b en q_b tellen alleen bij soort 1. Wat buiten de ligger valt, telt niet.
 *
 * Belastinggevallen en combinaties. Een factorvector f (één factor per
 * lastrij) en een deelnummer kiezen een deel van de lasten: zo is elk
 * belastinggeval een uitsnede van dezelfde lastmatrix, en liggen alle
 * uitkomsten op hetzelfde raster. De delen zijn de stukken tussen de
 * steunpunten en de scharnieren, van links af genummerd vanaf 1; een overstek
 * is een eigen deel. liggerOmhullende() stelt daarmee per punt de ongunstigste
 * combinatie samen: de permanente lasten met één factor (ongunstig of gunstig,
 * op het totaal van die lasten), elke veranderlijke last alleen op de delen
 * waar hij ongunstig werkt (schaakbordbelasting), met per punt de
 * ongunstigste keuze van de overheersende veranderlijke last.
 */

// ── Invoer ───────────────────────────────────────────────────────────────────

/** Soort van een punt van de ligger (tweede kolom van de geometrie). */
export const LIGGER_PUNT = { VRIJ: 0, STEUN: 1, KLEM: 2, SCHARNIER: 3 } as const;
/** Soort van een last (eerste kolom van de lastmatrix). */
export const LIGGER_LAST = { GEEN: 0, VERDEELD: 1, PUNT: 2, MOMENT: 3 } as const;

/** Uitkomst van liggerStatus(). */
export const LIGGER_STATUS = { BEWEEGLIJK: -1, ONGELDIG: 0, STABIEL: 1 } as const;

interface Knoop {
  x: number;
  steun: boolean;
  klem: boolean;
  scharnier: boolean;
}

interface Element {
  x0: number;
  x1: number;
  l: number;
  /** Vrijheidsgraden [w links, θ links, w rechts, θ rechts]. */
  dof: [number, number, number, number];
}

interface Model {
  status: number;
  knopen: Knoop[];
  elementen: Element[];
  nDof: number;
  /** Vrije vrijheidsgraden, in volgorde. */
  vrij: number[];
  /** Plaats van een vrijheidsgraad in `vrij`, of -1 als hij vastligt. */
  plek: Int32Array;
  /** Inverse van de gereduceerde stijfheidsmatrix. */
  Kinv: number[][];
  EI: number;
  xBegin: number;
  xEind: number;
  tol: number;
  /** Knoopnummers van de steunpunten (steun of inklemming), van links af. */
  steunen: number[];
  /** Delen voor de schaakbordbelasting: gesplitst op steunpunten en scharnieren. */
  delen: [number, number][];
  /** Velden: gesplitst op steunpunten; derde getal 1 als het een overstek is. */
  velden: [number, number, number][];
}

/** Een last na het toepassen van de factor en de uitsnede van een deel. */
interface Last {
  soort: number;
  a: number;
  b: number;
  qa: number;
  qb: number;
  /** Het deel van [a, b] dat meetelt (verdeelde last). */
  lo: number;
  hi: number;
}

/** Punt van een raster: x en de kant (-1 links, +1 rechts, 0 doorlopend). */
interface Punt {
  x: number;
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

// ── Model: knopen, elementen, stijfheid ──────────────────────────────────────

function bouwModel(geoIn: number[][], EI: number): Model {
  const leeg: Model = {
    status: LIGGER_STATUS.ONGELDIG, knopen: [], elementen: [], nDof: 0, vrij: [], plek: new Int32Array(0),
    Kinv: [], EI, xBegin: 0, xEind: 0, tol: 0, steunen: [], delen: [], velden: [],
  };
  const punten = geoIn
    .filter((r) => r.length >= 2 && Number.isFinite(r[0]) && Math.round(r[1]) >= 0 && Math.round(r[1]) <= 3)
    .map((r) => ({ x: r[0], s: Math.round(r[1]) }))
    .sort((p, q) => p.x - q.x);
  if (punten.length < 2) return leeg;
  const xBegin = punten[0].x;
  const xEind = punten[punten.length - 1].x;
  const L = xEind - xBegin;
  if (!(L > 0) || !(EI > 0) || !Number.isFinite(EI)) return { ...leeg, xBegin, xEind };
  const tol = 1e-9 * Math.max(1, Math.abs(xBegin), Math.abs(xEind));

  const knopen: Knoop[] = [];
  for (const p of punten) {
    let k = knopen[knopen.length - 1];
    if (!k || p.x - k.x > tol) {
      k = { x: p.x, steun: false, klem: false, scharnier: false };
      knopen.push(k);
    }
    if (p.s === 1 || p.s === 2) k.steun = true;
    if (p.s === 2) k.klem = true;
    if (p.s === 3) k.scharnier = true;
  }
  if (knopen.length < 2) return { ...leeg, xBegin, xEind };
  // Een scharnier aan een eind van de ligger scheidt niets.
  knopen[0].scharnier = false;
  knopen[knopen.length - 1].scharnier = false;

  // Vrijheidsgraden: per knoop een verplaatsing en een rotatie, bij een
  // scharnier een rotatie aan elke kant.
  let n = 0;
  const wDof: number[] = [];
  const tL: number[] = [];
  const tR: number[] = [];
  for (const k of knopen) {
    wDof.push(n++);
    const t = n++;
    tL.push(t);
    tR.push(k.scharnier ? n++ : t);
  }
  const vast = new Uint8Array(n);
  knopen.forEach((k, i) => {
    if (k.steun) vast[wDof[i]] = 1;
    if (k.klem) {
      vast[tL[i]] = 1;
      vast[tR[i]] = 1;
    }
  });

  const elementen: Element[] = [];
  for (let i = 0; i + 1 < knopen.length; i++) {
    const x0 = knopen[i].x;
    const x1 = knopen[i + 1].x;
    elementen.push({ x0, x1, l: x1 - x0, dof: [wDof[i], tR[i], wDof[i + 1], tL[i + 1]] });
  }

  const K: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const e of elementen) {
    const ke = elementStijfheid(EI, e.l);
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) K[e.dof[a]][e.dof[b]] += ke[a][b];
  }
  const vrij: number[] = [];
  const plek = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) if (!vast[i]) { plek[i] = vrij.length; vrij.push(i); }
  const Kr = vrij.map((i) => vrij.map((j) => K[i][j]));
  const Kinv = inverteer(Kr);

  const steunen = knopen.map((k, i) => (k.steun ? i : -1)).filter((i) => i >= 0);
  const delen: [number, number][] = [];
  const velden: [number, number, number][] = [];
  let begin = knopen[0].x;
  let veldBegin = 0;
  for (let i = 1; i < knopen.length; i++) {
    const k = knopen[i];
    const eind = i === knopen.length - 1;
    if (k.steun || k.scharnier || eind) {
      delen.push([begin, k.x]);
      begin = k.x;
    }
    if (k.steun || eind) {
      // Een overstek: een stuk dat aan één kant niet op een steunpunt eindigt.
      const overstek = !knopen[veldBegin].steun || !k.steun ? 1 : 0;
      velden.push([knopen[veldBegin].x, k.x, overstek]);
      veldBegin = i;
    }
  }

  return {
    status: Kinv ? LIGGER_STATUS.STABIEL : LIGGER_STATUS.BEWEEGLIJK,
    knopen, elementen, nDof: n, vrij, plek, Kinv: Kinv ?? [], EI, xBegin, xEind, tol, steunen, delen, velden,
  };
}

function elementStijfheid(EI: number, l: number): number[][] {
  const c = EI / (l * l * l);
  const l2 = l * l;
  return [
    [12 * c, 6 * l * c, -12 * c, 6 * l * c],
    [6 * l * c, 4 * l2 * c, -6 * l * c, 2 * l2 * c],
    [-12 * c, -6 * l * c, 12 * c, -6 * l * c],
    [6 * l * c, 2 * l2 * c, -6 * l * c, 4 * l2 * c],
  ];
}

/**
 * Inverse met Gauss-Jordan en rijpivotering; null als de matrix singulier is
 * (de ligger is dan beweeglijk). De drempel is relatief ten opzichte van de
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

/**
 * De lasten zoals ze meetellen: met de factor per rij, binnen de ligger en,
 * als er een deel is gekozen, alleen binnen dat deel.
 */
function effectieveLasten(model: Model, lastIn: number[][], f?: number[], deel = 0): Last[] {
  let lo = model.xBegin;
  let hi = model.xEind;
  if (deel >= 1) {
    const d = model.delen[Math.round(deel) - 1];
    if (!d) return [];
    [lo, hi] = d;
  }
  const eindDeel = hi >= model.xEind - model.tol;
  const uit: Last[] = [];
  lastIn.forEach((r, i) => {
    const soort = Math.round(r[0] ?? 0);
    const fac = f ? getal(f[i] ?? 0) : 1;
    if (fac === 0) return;
    if (soort === LIGGER_LAST.VERDEELD) {
      let a = getal(r[1]);
      let b = getal(r[2]);
      let qa = getal(r[3]) * fac;
      let qb = getal(r[4]) * fac;
      if (b < a) [a, b, qa, qb] = [b, a, qb, qa];
      if (!(b - a > model.tol) || (qa === 0 && qb === 0)) return;
      const l = Math.max(a, lo);
      const h = Math.min(b, hi);
      if (!(h - l > model.tol)) return;
      uit.push({ soort, a, b, qa, qb, lo: l, hi: h });
    } else if (soort === LIGGER_LAST.PUNT || soort === LIGGER_LAST.MOMENT) {
      const a = getal(r[1]);
      const q = getal(r[3]) * fac;
      if (q === 0) return;
      const binnen = a >= lo - model.tol && (a < hi - model.tol || (eindDeel && a <= hi + model.tol));
      if (!binnen) return;
      // Net buiten de ligger door afronding: op het eind leggen.
      const x = Math.min(Math.max(a, model.xBegin), model.xEind);
      uit.push({ soort, a: x, b: x, qa: q, qb: q, lo: x, hi: x });
    }
  });
  return uit;
}

/** Het element waartoe een punt op x behoort (x0 ≤ x < x1; het laatste neemt ook x1). */
function elementVan(model: Model, x: number, kant: number): number {
  const els = model.elementen;
  const t = model.tol;
  if (kant < 0) {
    for (let i = 0; i < els.length; i++) if (x > els[i].x0 + t && x <= els[i].x1 + t) return i;
    return 0;
  }
  for (let i = 0; i < els.length; i++) if (x >= els[i].x0 - t && x < els[i].x1 - t) return i;
  return els.length - 1;
}

/** Waarde van een verdeelde last in s. */
const qIn = (p: Last, s: number) => p.qa + ((p.qb - p.qa) * (s - p.a)) / (p.b - p.a);

const GAUSS = [
  [-Math.sqrt(3 / 5), 5 / 9],
  [0, 8 / 9],
  [Math.sqrt(3 / 5), 5 / 9],
];

/** Arbeidsequivalente knooplasten van één last op één element. */
function knooplasten(e: Element, p: Last, eigen: boolean): number[] {
  const f = [0, 0, 0, 0];
  const l = e.l;
  const N = (s: number) => {
    const k = (s - e.x0) / l;
    return [1 - 3 * k * k + 2 * k ** 3, l * (k - 2 * k * k + k ** 3), 3 * k * k - 2 * k ** 3, l * (-k * k + k ** 3)];
  };
  const dN = (s: number) => {
    const k = (s - e.x0) / l;
    return [(-6 * k + 6 * k * k) / l, 1 - 4 * k + 3 * k * k, (6 * k - 6 * k * k) / l, -2 * k + 3 * k * k];
  };
  if (p.soort === LIGGER_LAST.VERDEELD) {
    const s0 = Math.max(p.lo, e.x0);
    const s1 = Math.min(p.hi, e.x1);
    if (!(s1 > s0)) return f;
    const m = (s0 + s1) / 2;
    const h = (s1 - s0) / 2;
    for (const [t, w] of GAUSS) {
      const s = m + h * t;
      const q = qIn(p, s) * w * h;
      const n = N(s);
      for (let i = 0; i < 4; i++) f[i] += n[i] * q;
    }
  } else if (eigen && p.soort === LIGGER_LAST.PUNT) {
    const n = N(p.a);
    for (let i = 0; i < 4; i++) f[i] += n[i] * p.qa;
  } else if (eigen && p.soort === LIGGER_LAST.MOMENT) {
    const n = dN(p.a);
    for (let i = 0; i < 4; i++) f[i] += n[i] * p.qa;
  }
  return f;
}

const FAC = [1, 1, 2, 6, 24, 120];

/**
 * Integralen van de lasten binnen een element vanaf x0 tot x:
 *   I_n(x) = ∫ q(s)·(x − s)^n/n! ds, met de puntlasten als P·(x − a)^n/n!,
 *   J_n(x) = Σ C·(x − a)^n/n! voor de puntmomenten.
 * I_0 is de som van de lasten (dwarskracht), I_1 hun moment, I_2 en I_3 gaan
 * in de hoekverdraaiing en de doorbuiging. Een puntlast of puntmoment precies
 * op x telt alleen mee aan de rechterkant.
 */
function integralen(e: Element, lasten: Last[], eigenaar: number[], ei: number, x: number, kant: number, tol: number) {
  const I = [0, 0, 0, 0];
  const J = [0, 0, 0];
  for (let k = 0; k < lasten.length; k++) {
    const p = lasten[k];
    if (p.soort === LIGGER_LAST.VERDEELD) {
      const s0 = Math.max(p.lo, e.x0);
      const s1 = Math.min(p.hi, x);
      if (!(s1 > s0)) continue;
      const k1 = (p.qb - p.qa) / (p.b - p.a);
      const c0 = p.qa + k1 * (x - p.a);
      const u0 = x - s1;
      const u1 = x - s0;
      for (let n = 0; n <= 3; n++) {
        const a = (u1 ** (n + 1) - u0 ** (n + 1)) / FAC[n + 1];
        const b = ((n + 1) * (u1 ** (n + 2) - u0 ** (n + 2))) / FAC[n + 2];
        I[n] += c0 * a - k1 * b;
      }
    } else {
      if (eigenaar[k] !== ei) continue;
      const telt = p.a < x - tol || (Math.abs(p.a - x) <= tol && kant > 0);
      if (!telt) continue;
      const d = Math.max(0, x - p.a);
      if (p.soort === LIGGER_LAST.PUNT) {
        for (let n = 0; n <= 3; n++) I[n] += (p.qa * d ** n) / FAC[n];
      } else {
        for (let n = 0; n <= 2; n++) J[n] += (p.qa * d ** n) / FAC[n];
      }
    }
  }
  return { I, J };
}

// ── Oplossen ─────────────────────────────────────────────────────────────────

/** Een opgeloste belastingtoestand. */
interface Toestand {
  model: Model;
  lasten: Last[];
  /** Element dat een puntlast of puntmoment draagt (index per last). */
  eigenaar: number[];
  u: Float64Array;
  /** Krachten van de knopen op elk element: K_e·u_e − f_e. */
  eind: number[][];
}

function losOp(model: Model, lasten: Last[]): Toestand {
  const n = model.nDof;
  const F = new Float64Array(n);
  const eigenaar = lasten.map((p) => (p.soort === LIGGER_LAST.VERDEELD ? -1 : elementVan(model, p.a, 1)));
  const fe = model.elementen.map(() => [0, 0, 0, 0]);
  model.elementen.forEach((e, ei) => {
    lasten.forEach((p, k) => {
      if (p.soort !== LIGGER_LAST.VERDEELD && eigenaar[k] !== ei) return;
      if (p.soort === LIGGER_LAST.VERDEELD && (p.hi <= e.x0 || p.lo >= e.x1)) return;
      const f = knooplasten(e, p, true);
      for (let i = 0; i < 4; i++) fe[ei][i] += f[i];
    });
    for (let i = 0; i < 4; i++) F[e.dof[i]] += fe[ei][i];
  });
  const u = new Float64Array(n);
  const m = model.vrij.length;
  for (let a = 0; a < m; a++) {
    let s = 0;
    const r = model.Kinv[a];
    for (let b = 0; b < m; b++) s += r[b] * F[model.vrij[b]];
    u[model.vrij[a]] = s;
  }
  const eind = model.elementen.map((e, ei) => {
    const ke = elementStijfheid(model.EI, e.l);
    const ue = e.dof.map((d) => u[d]);
    return [0, 1, 2, 3].map((a) => ke[a][0] * ue[0] + ke[a][1] * ue[1] + ke[a][2] * ue[2] + ke[a][3] * ue[3] - fe[ei][a]);
  });
  return { model, lasten, eigenaar, u, eind };
}

/** Dwarskracht, moment, doorbuiging en hoekverdraaiing in x (kant -1 of +1 bij een sprong). */
function waarde(t: Toestand, x: number, kant: number) {
  const { model } = t;
  const ei = elementVan(model, x, kant);
  const e = model.elementen[ei];
  const p = t.eind[ei];
  const V0 = -p[0];
  const M0 = p[1];
  const w0 = t.u[e.dof[0]];
  const t0 = t.u[e.dof[1]];
  const d = x - e.x0;
  const { I, J } = integralen(e, t.lasten, t.eigenaar, ei, x, kant, model.tol);
  const EI = model.EI;
  const V = V0 - I[0];
  const M = M0 + V0 * d - I[1] + J[0];
  const theta = t0 - (M0 * d + (V0 * d * d) / 2 - I[2] + J[1]) / EI;
  const w = w0 + t0 * d - ((M0 * d * d) / 2 + (V0 * d ** 3) / 6 - I[3] + J[2]) / EI;
  return { V, M, w, theta };
}

/** Oplegreacties (omhoog positief) en het moment in de ligger ter plaatse van elk steunpunt. */
function reacties(t: Toestand): number[][] {
  const { model } = t;
  const R = new Float64Array(model.nDof);
  model.elementen.forEach((e, ei) => {
    for (let a = 0; a < 4; a++) R[e.dof[a]] += t.eind[ei][a];
  });
  const els = model.elementen;
  // De verplaatsing van knoop i: links in element i, of rechts in het laatste.
  const wDof = (i: number) => (i < els.length ? els[i].dof[0] : els[i - 1].dof[2]);
  return model.steunen.map((i) => {
    const k = model.knopen[i];
    const M = waarde(t, k.x, i === 0 ? 1 : -1).M;
    return [k.x, -R[wDof(i)], M];
  });
}

// ── Raster ──────────────────────────────────────────────────────────────────

/**
 * Het vaste rekenraster: de knopen, een gelijkmatige verdeling van elk element
 * (ten minste 8 stukken, samen ongeveer 120 over de hele ligger) en de begin-
 * en eindpunten van de lasten. Bij een steunpunt, puntlast of puntmoment
 * springt de dwarskracht of het moment; daar staat het punt twee keer, eerst
 * links en dan rechts.
 */
function raster(model: Model, lastIn: number[][]): Punt[] {
  const t = model.tol;
  const L = model.xEind - model.xBegin;
  const xs: number[] = [];
  const sprong: number[] = [];
  for (const e of model.elementen) {
    const n = Math.max(8, Math.ceil((120 * e.l) / L));
    for (let i = 0; i <= n; i++) xs.push(e.x0 + (e.l * i) / n);
  }
  model.knopen.forEach((k) => {
    if (k.steun) sprong.push(k.x);
  });
  for (const p of effectieveLasten(model, lastIn)) {
    if (p.soort === LIGGER_LAST.VERDEELD) xs.push(p.lo, p.hi);
    else sprong.push(p.a);
  }
  xs.push(...sprong);
  xs.sort((a, b) => a - b);
  const uniek: number[] = [];
  for (const x of xs) {
    if (x < model.xBegin - t || x > model.xEind + t) continue;
    if (uniek.length && x - uniek[uniek.length - 1] <= t) continue;
    uniek.push(x);
  }
  const punten: Punt[] = [];
  for (const x of uniek) {
    const begin = Math.abs(x - model.xBegin) <= t;
    const eind = Math.abs(x - model.xEind) <= t;
    if (begin) punten.push({ x, kant: 1 });
    else if (eind) punten.push({ x, kant: -1 });
    else if (sprong.some((s) => Math.abs(s - x) <= t)) punten.push({ x, kant: -1 }, { x, kant: 1 });
    else punten.push({ x, kant: 0 });
  }
  return punten;
}

/** Nulpunten van dwarskracht en hoekverdraaiing tussen de rasterpunten: de toppen van M en w. */
function toppen(t: Toestand, punten: Punt[]): Punt[] {
  const extra: Punt[] = [];
  const vw = punten.map((p) => waarde(t, p.x, p.kant));
  for (let i = 0; i + 1 < punten.length; i++) {
    const a = punten[i];
    const b = punten[i + 1];
    if (!(b.x - a.x > t.model.tol)) continue;
    for (const g of ['V', 'theta'] as const) {
      const fa = vw[i][g];
      const fb = vw[i + 1][g];
      if (!(fa * fb < 0)) continue;
      let lo = a.x;
      let hi = b.x;
      let flo = fa;
      for (let k = 0; k < 80 && hi - lo > t.model.tol; k++) {
        const m = (lo + hi) / 2;
        const fm = waarde(t, m, 0)[g];
        if (fm * flo <= 0) hi = m;
        else { lo = m; flo = fm; }
      }
      extra.push({ x: (lo + hi) / 2, kant: 0 });
    }
  }
  if (!extra.length) return punten;
  return [...punten, ...extra].sort((p, q) => p.x - q.x || p.kant - q.kant);
}

// ── Cache ───────────────────────────────────────────────────────────────────

interface Voorraad {
  model: Model;
  punten: Punt[];
  /** Per lastrij en per deel: V, M, w in de rasterpunten en de reacties. */
  eenheid: Map<string, { V: Float64Array; M: Float64Array; w: Float64Array; R: number[][] }>;
}

const CACHE = new Map<string, Voorraad>();
const CACHE_MAX = 24;

function voorraad(geo: number[][], last: number[][], EI: number): Voorraad {
  const sleutel = JSON.stringify([geo, last, EI]);
  const oud = CACHE.get(sleutel);
  if (oud) {
    CACHE.delete(sleutel);
    CACHE.set(sleutel, oud);
    return oud;
  }
  const model = bouwModel(geo, EI);
  const punten = model.status === LIGGER_STATUS.STABIEL ? raster(model, last) : [];
  const v: Voorraad = { model, punten, eenheid: new Map() };
  CACHE.set(sleutel, v);
  while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value as string);
  return v;
}

/** Eén lastrij op één deel (0 = de hele ligger), met factor 1, op het vaste raster. */
function eenheidsgeval(v: Voorraad, last: number[][], j: number, deel: number) {
  const sleutel = `${j}/${deel}`;
  let r = v.eenheid.get(sleutel);
  if (!r) {
    const f = last.map((_, i) => (i === j ? 1 : 0));
    const t = losOp(v.model, effectieveLasten(v.model, last, f, deel));
    const n = v.punten.length;
    const V = new Float64Array(n);
    const M = new Float64Array(n);
    const w = new Float64Array(n);
    v.punten.forEach((p, i) => {
      const z = waarde(t, p.x, p.kant);
      V[i] = z.V;
      M[i] = z.M;
      w[i] = z.w;
    });
    r = { V, M, w, R: reacties(t) };
    v.eenheid.set(sleutel, r);
  }
  return r;
}

// ── Publieke functies ────────────────────────────────────────────────────────

/**
 * Afrondingsruis weg: per kolom (behalve x) wordt een waarde kleiner dan
 * 1e-11 maal de grootste waarde in die kolom nul. Zo staat er bij een
 * scharnierende oplegging M = 0 en niet −1,8e−15.
 */
function schoon(m: number[][]): number[][] {
  if (!m.length) return m;
  for (let k = 1; k < m[0].length; k++) {
    let max = 0;
    for (const r of m) max = Math.max(max, Math.abs(r[k]));
    const drempel = 1e-11 * max;
    for (const r of m) if (Math.abs(r[k]) < drempel) r[k] = 0;
  }
  return m;
}

/**
 * 1 als de ligger stabiel is, -1 als hij beweeglijk is (te weinig steunpunten
 * of een scharnier te veel), 0 als de geometrie ongeldig is (minder dan twee
 * punten, lengte nul) of EI niet positief.
 */
export function liggerStatus(geo: unknown, EI = 1): number {
  return bouwModel(rijen(geo), EI).status;
}

/**
 * Eén belastingtoestand: matrix met rijen [x, V, M, w] langs de ligger. Het
 * raster is het vaste raster van deze geometrie en lastmatrix, aangevuld met
 * de punten waar V of de hoekverdraaiing nul is, zodat de uitersten van M en w
 * exact in de uitkomst staan. Bij een sprong staat x twee keer (links, rechts).
 * `f` is de factor per lastrij (standaard 1), `deel` beperkt de lasten tot één
 * deel (0 = de hele ligger). `extra` voegt punten toe waar de waarden exact
 * nodig zijn (tussen de rasterpunten is interpoleren een benadering). Een
 * beweeglijke of ongeldige ligger geeft een lege uitkomst (één rij nullen).
 */
export function liggerOplossing(
  geo: unknown, last: unknown, EI: number, f?: number[], deel = 0, extra: number[] = [],
): number[][] {
  const G = rijen(geo);
  const P = rijen(last);
  const v = voorraad(G, P, EI);
  if (v.model.status !== LIGGER_STATUS.STABIEL) return [[v.model.xBegin, 0, 0, 0]];
  const t = losOp(v.model, effectieveLasten(v.model, P, f, deel));
  let punten = toppen(t, v.punten);
  const tol = v.model.tol;
  const erbij = extra
    .filter((x) => Number.isFinite(x) && x >= v.model.xBegin - tol && x <= v.model.xEind + tol)
    .filter((x) => !punten.some((p) => Math.abs(p.x - x) <= tol))
    .map((x) => ({ x, kant: 0 }));
  if (erbij.length) punten = [...punten, ...erbij].sort((p, q) => p.x - q.x || p.kant - q.kant);
  return schoon(punten.map((p) => {
    const z = waarde(t, p.x, p.kant);
    return [p.x, z.V, z.M, z.w];
  }));
}

/**
 * Oplegreacties van één belastingtoestand: per steunpunt (van links af) een rij
 * [x, R, M] met R omhoog positief en M het moment in de ligger ter plaatse (bij
 * een inklemming het inklemmingsmoment, bij een tussensteunpunt het
 * steunmoment).
 */
export function liggerReacties(geo: unknown, last: unknown, EI: number, f?: number[], deel = 0): number[][] {
  const G = rijen(geo);
  const P = rijen(last);
  const v = voorraad(G, P, EI);
  if (v.model.status !== LIGGER_STATUS.STABIEL) return [[v.model.xBegin, 0, 0]];
  return schoon(reacties(losOp(v.model, effectieveLasten(v.model, P, f, deel))));
}

/**
 * Omhullende van de combinaties op het vaste raster, per grootheid apart.
 *
 *   groep  per lastrij: 0 = permanent (alle permanente lasten samen één
 *          bron), -1 = permanent per deel (evenwicht, EQU), g ≥ 1 =
 *          veranderlijke last g; rijen met dezelfde g zijn één last.
 *   f1     per lastrij: permanent de factor als het totaal ongunstig werkt,
 *          veranderlijk de factor als overheersende last.
 *   f2     per lastrij: permanent de factor als het totaal gunstig werkt,
 *          veranderlijk de factor als gelijktijdige last (γ·ψ_0).
 *   teken  +1 voor de grootste waarde, -1 voor de kleinste.
 *   lead   0: per punt de ongunstigste keuze van de overheersende last;
 *          g: last g overheersend.
 *
 * Een veranderlijke last telt per deel alleen waar hij ongunstig werkt. Geeft
 * een matrix [x, V, M, w] op het vaste raster.
 */
export function liggerOmhullende(
  geo: unknown, last: unknown, EI: number, groep: number[], f1: number[], f2: number[], teken = 1, lead = 0,
): number[][] {
  const r = omhul(geo, last, EI, groep, f1, f2, teken, lead, false);
  return r;
}

/** Als liggerOmhullende(), voor de oplegreacties: rijen [x, R, M] per steunpunt. */
export function liggerOmhullendeReacties(
  geo: unknown, last: unknown, EI: number, groep: number[], f1: number[], f2: number[], teken = 1, lead = 0,
): number[][] {
  return omhul(geo, last, EI, groep, f1, f2, teken, lead, true);
}

/**
 * Een blad vraagt dezelfde omhullende vaak meer dan eens op (in de tabel, in
 * een toets, in een tekening); de uitkomst staat daarom even bewaard, als kopie.
 */
const OMHUL = new Map<string, number[][]>();
const OMHUL_MAX = 96;

function omhul(
  geo: unknown, last: unknown, EI: number, groepIn: number[], f1In: number[], f2In: number[],
  teken: number, lead: number, alsReactie: boolean,
): number[][] {
  const sleutel = JSON.stringify([rijen(geo), rijen(last), EI, groepIn, f1In, f2In, teken, lead, alsReactie]);
  const bewaard = OMHUL.get(sleutel);
  if (bewaard) return bewaard.map((r) => [...r]);
  const uit = omhulReken(geo, last, EI, groepIn, f1In, f2In, teken, lead, alsReactie);
  OMHUL.set(sleutel, uit.map((r) => [...r]));
  while (OMHUL.size > OMHUL_MAX) OMHUL.delete(OMHUL.keys().next().value as string);
  return uit;
}

function omhulReken(
  geo: unknown, last: unknown, EI: number, groepIn: number[], f1In: number[], f2In: number[],
  teken: number, lead: number, alsReactie: boolean,
): number[][] {
  const G = rijen(geo);
  const P = rijen(last);
  const v = voorraad(G, P, EI);
  if (v.model.status !== LIGGER_STATUS.STABIEL) return alsReactie ? [[v.model.xBegin, 0, 0]] : [[v.model.xBegin, 0, 0, 0]];
  const s = teken < 0 ? -1 : 1;
  const nDelen = v.model.delen.length;
  const nPunt = alsReactie ? v.model.steunen.length : v.punten.length;
  const nGr = alsReactie ? 2 : 3;
  const groep = P.map((_, j) => Math.round(getal(groepIn[j] ?? 0)));
  const f1 = P.map((_, j) => getal(f1In[j] ?? 0));
  const f2 = P.map((_, j) => getal(f2In[j] ?? 0));
  const actief = P.map((r) => Math.round(r[0] ?? 0) !== LIGGER_LAST.GEEN);

  /** Uitkomst van rij j op deel d (0 = heel), grootheid k, punt i. */
  const E = (j: number, d: number) => {
    const u = eenheidsgeval(v, P, j, d);
    return alsReactie
      ? [Float64Array.from(u.R.map((r) => r[1])), Float64Array.from(u.R.map((r) => r[2]))]
      : [u.V, u.M, u.w];
  };

  // Permanent, één bron: ongunstig of gunstig op het totaal.
  const gSup = Array.from({ length: nGr }, () => new Float64Array(nPunt));
  const gInf = Array.from({ length: nGr }, () => new Float64Array(nPunt));
  const gEqu = Array.from({ length: nGr }, () => new Float64Array(nPunt));
  let heeftG = false;
  // Veranderlijk: per groep de som van de ongunstige delen, als overheersend (1) en gelijktijdig (2).
  const groepen = [...new Set(groep.filter((g, j) => g >= 1 && actief[j]))].sort((a, b) => a - b);
  const q1 = new Map<number, Float64Array[]>();
  const q2 = new Map<number, Float64Array[]>();
  for (const g of groepen) {
    q1.set(g, Array.from({ length: nGr }, () => new Float64Array(nPunt)));
    q2.set(g, Array.from({ length: nGr }, () => new Float64Array(nPunt)));
  }

  P.forEach((_, j) => {
    if (!actief[j]) return;
    if (groep[j] === 0) {
      if (f1[j] === 0 && f2[j] === 0) return;
      heeftG = true;
      const e = E(j, 0);
      for (let k = 0; k < nGr; k++) for (let i = 0; i < nPunt; i++) {
        gSup[k][i] += f1[j] * e[k][i];
        gInf[k][i] += f2[j] * e[k][i];
      }
    } else if (groep[j] < 0) {
      if (f1[j] === 0 && f2[j] === 0) return;
      for (let d = 1; d <= nDelen; d++) {
        const e = E(j, d);
        for (let k = 0; k < nGr; k++) for (let i = 0; i < nPunt; i++) {
          gEqu[k][i] += Math.max(s * f1[j] * e[k][i], s * f2[j] * e[k][i]);
        }
      }
    }
  });

  // Veranderlijke lasten per groep en per deel: eerst de rijen van de groep
  // per deel optellen, dan alleen het ongunstige deel meetellen.
  for (const g of groepen) {
    const leden = P.map((_, j) => j).filter((j) => groep[j] === g && actief[j]);
    const a1 = q1.get(g)!;
    const a2 = q2.get(g)!;
    for (let d = 1; d <= nDelen; d++) {
      const som1 = Array.from({ length: nGr }, () => new Float64Array(nPunt));
      const som2 = Array.from({ length: nGr }, () => new Float64Array(nPunt));
      for (const j of leden) {
        if (f1[j] === 0 && f2[j] === 0) continue;
        const e = E(j, d);
        for (let k = 0; k < nGr; k++) for (let i = 0; i < nPunt; i++) {
          som1[k][i] += f1[j] * e[k][i];
          som2[k][i] += f2[j] * e[k][i];
        }
      }
      for (let k = 0; k < nGr; k++) for (let i = 0; i < nPunt; i++) {
        a1[k][i] += Math.max(0, s * som1[k][i]);
        a2[k][i] += Math.max(0, s * som2[k][i]);
      }
    }
  }

  const uit: number[][] = [];
  for (let i = 0; i < nPunt; i++) {
    const rij: number[] = alsReactie ? [v.model.knopen[v.model.steunen[i]].x] : [v.punten[i].x];
    for (let k = 0; k < nGr; k++) {
      let T = gEqu[k][i];
      if (heeftG) T += Math.max(s * gSup[k][i], s * gInf[k][i]);
      let somGelijk = 0;
      for (const g of groepen) somGelijk += q2.get(g)![k][i];
      if (groepen.length) {
        if (lead >= 1) {
          if (q1.has(lead)) T += somGelijk - q2.get(lead)![k][i] + q1.get(lead)![k][i];
          else T += somGelijk;
        } else {
          let beste = -Infinity;
          for (const g of groepen) beste = Math.max(beste, q1.get(g)![k][i] - q2.get(g)![k][i]);
          T += somGelijk + beste;
        }
      }
      rij.push(s * T);
    }
    uit.push(rij);
  }
  return schoon(uit);
}

/**
 * Uitersten van kolom k (2 = V, 3 = M, 4 = w; bij reacties 2 = R, 3 = M) van
 * een uitkomstmatrix, eventueel alleen voor x van x1 tot en met x2: [max,
 * x bij max, min, x bij min].
 */
export function liggerExtremen(R: unknown, k: number, x1 = -Infinity, x2 = Infinity): number[] {
  const rs = rijen(R);
  const kol = Math.max(1, Math.round(k)) - 1;
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  const t = 1e-9 * Math.max(1, Math.abs(Number.isFinite(lo) ? lo : 0), Math.abs(Number.isFinite(hi) ? hi : 0));
  let max = -Infinity, xMax = 0, min = Infinity, xMin = 0;
  for (const r of rs) {
    if (r[0] < lo - t || r[0] > hi + t) continue;
    const w = r[kol] ?? 0;
    if (w > max) { max = w; xMax = r[0]; }
    if (w < min) { min = w; xMin = r[0]; }
  }
  if (max === -Infinity) return [0, 0, 0, 0];
  return [max, xMax, min, xMin];
}

/**
 * Kolom k in x, lineair tussen de rasterpunten. Op een sprong de waarde rechts
 * ervan; buiten de ligger de waarde op het dichtstbijzijnde eind.
 */
export function liggerInterpoleer(R: unknown, k: number, x: number): number {
  const rs = rijen(R);
  if (!rs.length) return 0;
  const kol = Math.max(1, Math.round(k)) - 1;
  const t = 1e-9 * Math.max(1, Math.abs(x));
  if (x <= rs[0][0] + t) {
    let i = 0;
    while (i + 1 < rs.length && Math.abs(rs[i + 1][0] - rs[0][0]) <= t) i++;
    return rs[i][kol] ?? 0;
  }
  for (let i = 0; i + 1 < rs.length; i++) {
    const a = rs[i];
    const b = rs[i + 1];
    if (Math.abs(b[0] - x) <= t) {
      let j = i + 1;
      while (j + 1 < rs.length && Math.abs(rs[j + 1][0] - x) <= t) j++;
      return rs[j][kol] ?? 0;
    }
    if (x > a[0] && x < b[0]) {
      const r = (x - a[0]) / (b[0] - a[0]);
      return (a[kol] ?? 0) + r * ((b[kol] ?? 0) - (a[kol] ?? 0));
    }
  }
  return rs[rs.length - 1][kol] ?? 0;
}

/**
 * Het eerste punt vanaf xVan in de richting van xTot waar kolom k niet meer
 * negatief is (lineair tussen de rasterpunten). Is de waarde in xVan al niet
 * negatief, dan xVan zelf; blijft hij negatief tot xTot, dan xTot. Zo volgt de
 * lengte van een zone met een negatief moment naast een steunpunt.
 */
export function liggerNulpunt(R: unknown, k: number, xVan: number, xTot: number): number {
  const stappen = 400;
  const f = (x: number) => liggerInterpoleer(R, k, x);
  if (f(xVan) >= 0) return xVan;
  let vorige = xVan;
  for (let i = 1; i <= stappen; i++) {
    const x = xVan + ((xTot - xVan) * i) / stappen;
    if (f(x) >= 0) {
      let lo = vorige, hi = x;
      for (let n = 0; n < 60; n++) {
        const m = (lo + hi) / 2;
        if (f(m) >= 0) hi = m; else lo = m;
      }
      return (lo + hi) / 2;
    }
    vorige = x;
  }
  return xTot;
}

/**
 * Per punt de grootste (teken +1) of kleinste (teken -1) waarde over een reeks
 * uitkomstmatrices met hetzelfde raster, kolom voor kolom; de eerste kolom (x)
 * komt uit de eerste matrix. Zo worden bijvoorbeeld de omhullenden van 6.10a
 * en 6.10b samengevoegd.
 */
export function liggerSamen(teken: number, ...ms: unknown[]): number[][] {
  const lijst = ms.map(rijen).filter((m) => m.length);
  if (!lijst.length) return [[0, 0, 0, 0]];
  const n = Math.min(...lijst.map((m) => m.length));
  const kies = teken < 0 ? Math.min : Math.max;
  const uit: number[][] = [];
  for (let i = 0; i < n; i++) {
    const rij = [...lijst[0][i]];
    for (let k = 1; k < rij.length; k++) rij[k] = kies(...lijst.map((m) => m[i][k] ?? 0));
    uit.push(rij);
  }
  return uit;
}

/** De delen voor de schaakbordbelasting: rijen [x_begin, x_eind]. */
export function liggerDelen(geo: unknown): number[][] {
  const m = bouwModel(rijen(geo), 1);
  return m.delen.length ? m.delen.map((d) => [...d]) : [[m.xBegin, m.xEind]];
}

/**
 * De velden: de stukken tussen de steunpunten, rijen [x_begin, x_eind,
 * overstek]. Overstek is 1 voor een stuk dat aan één kant vrij eindigt (de
 * representatieve lengte is dan tweemaal de lengte).
 */
export function liggerVelden(geo: unknown): number[][] {
  const m = bouwModel(rijen(geo), 1);
  return m.velden.length ? m.velden.map((d) => [...d]) : [[m.xBegin, m.xEind, 0]];
}

/**
 * Punten voor een SVG-lijn: elk punt [x, waarde] van kolom k als "X,Y" met
 * X = x0 + sx·x en Y = y0 + sy·waarde, gescheiden door spaties.
 */
export function liggerSvgPunten(R: unknown, k: number, x0: number, sx: number, y0: number, sy: number): string {
  const kol = Math.max(1, Math.round(k)) - 1;
  const r2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
  return rijen(R).map((r) => `${r2(x0 + sx * r[0])},${r2(y0 + sy * (r[kol] ?? 0))}`).join(' ');
}
