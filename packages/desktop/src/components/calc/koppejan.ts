/**
 * De methode van Koppejan uit NEN 9997-1 art. 7.6.2.3(e) op een sondering.
 *
 * Zuivere rekenmodule, los van React: de sondering gaat erin als niveaus
 * (t.o.v. NAP) met conusweerstanden, de gemiddelden over de trajecten I, II en
 * III komen eruit. Het rekenblad doet de rest; hier alleen wat er uit een
 * sondering moet worden afgelezen.
 *
 * - Traject I loopt van de paalpunt naar beneden, over 0,7 tot 4 × D_eq; het
 *   eindpunt wordt zo gekozen dat q_b;max minimaal is.
 * - Traject II loopt van dat eindpunt terug naar de paalpunt; de waarde telt
 *   nooit hoger dan de waarde eronder (een lopend minimum naar boven).
 * - Traject III loopt van de paalpunt 8 × D_eq omhoog en begint bij de laagste
 *   waarde van traject II; ook hier nooit hoger dan de waarde eronder. Bij een
 *   avegaarpaal begint het met ten hoogste 2 MPa.
 */

export interface Sondering {
  naam: string;
  /** Maaiveld van de sondering t.o.v. NAP, in m. */
  maaiveld: number;
  /** Niveaus t.o.v. NAP, in m, van boven naar beneden. */
  z: number[];
  /** Conusweerstand in MPa, bij dezelfde niveaus. */
  qc: number[];
}

export interface KoppejanUitkomst {
  qcI: number;
  qcII: number;
  qcIII: number;
  /** Lengte van traject I als veelvoud van D_eq. */
  factorI: number;
  /** (q_c;I + q_c;II)/2 + q_c;III, de term tussen haakjes in 7.6.2.3(e). */
  som: number;
}

/** Stap waarop de sondering wordt bemonsterd, in m. */
const DZ = 0.01;

/** q_c op niveau z door lineaire interpolatie; buiten het bereik NaN. */
export function qcOp(s: Sondering, z: number): number {
  const { z: zs, qc } = s;
  if (zs.length === 0 || z > zs[0] || z < zs[zs.length - 1]) return NaN;
  // De niveaus lopen af; zoek het eerste punt op of onder z.
  let lo = 0, hi = zs.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (zs[m] >= z) lo = m; else hi = m;
  }
  const z1 = zs[lo], z2 = zs[hi];
  if (z1 === z2) return qc[lo];
  const t = (z1 - z) / (z1 - z2);
  return qc[lo] + t * (qc[hi] - qc[lo]);
}

const gemiddelde = (w: number[]) => w.reduce((a, b) => a + b, 0) / Math.max(w.length, 1);

/**
 * De gemiddelden over de trajecten I, II en III bij paalpunt zPunt (NAP) en
 * equivalente middellijn Deq (m). `null` als de sondering niet diep genoeg
 * reikt voor traject I of niet hoog genoeg voor traject III.
 */
export function koppejan(s: Sondering, zPunt: number, Deq: number, avegaar = false): KoppejanUitkomst | null {
  const onderste = s.z[s.z.length - 1], bovenste = s.z[0];
  if (zPunt + 8 * Deq > bovenste + 1e-9) return null;
  const maxDiep = Math.min(4, (zPunt - onderste) / Deq);
  if (maxDiep < 0.7 - 1e-9) return null;

  // Traject III hangt alleen af van zijn beginwaarde; die volgt uit traject II.
  const nIII = Math.max(1, Math.round((8 * Deq) / DZ));
  const trajectIII = (start: number) => {
    let env = avegaar ? Math.min(start, 2) : start;
    const w: number[] = [];
    for (let k = 0; k <= nIII; k++) {
      env = Math.min(env, qcOp(s, zPunt + (8 * Deq * k) / nIII));
      w.push(env);
    }
    return gemiddelde(w);
  };

  let beste: KoppejanUitkomst | null = null;
  // Het eindpunt van traject I in stappen van 0,05·D_eq tussen 0,7 en 4.
  for (let f = 0.7; f <= maxDiep + 1e-9; f += 0.05) {
    const lengte = f * Deq;
    const n = Math.max(1, Math.round(lengte / DZ));
    const I: number[] = [];
    for (let k = 0; k <= n; k++) I.push(qcOp(s, zPunt - (lengte * k) / n));
    // Traject II: van onder naar boven, nooit hoger dan de waarde eronder.
    const II: number[] = [];
    let env = Infinity;
    for (let k = n; k >= 0; k--) {
      env = Math.min(env, I[k]);
      II.push(env);
    }
    const qcI = gemiddelde(I), qcII = gemiddelde(II);
    const qcIII = trajectIII(env);
    const som = (qcI + qcII) / 2 + qcIII;
    if (!beste || som < beste.som) beste = { qcI, qcII, qcIII, factorI: f, som };
  }
  return beste;
}

/**
 * Gemiddelde conusweerstand over het deel van de schacht met positieve
 * schachtwrijving, van de paalpunt tot ΔL erboven. Pieken boven 12 MPa worden
 * afgesnoten (7.6.2.3(i)); de ruimere grens van 15 MPa voor lagen dikker dan
 * 1 m blijft hier buiten beschouwing, dat ligt aan de veilige kant.
 */
export function schachtGemiddelde(s: Sondering, zPunt: number, deltaL: number): number | null {
  if (deltaL <= 0) return 0;
  if (zPunt + deltaL > s.z[0] + 1e-9 || zPunt < s.z[s.z.length - 1] - 1e-9) return null;
  const n = Math.max(1, Math.round(deltaL / DZ));
  const w: number[] = [];
  for (let k = 0; k <= n; k++) w.push(Math.min(12, qcOp(s, zPunt + (deltaL * k) / n)));
  return gemiddelde(w);
}

/**
 * Een GEF-sondering omzetten naar niveaus t.o.v. NAP. De diepte in het
 * bestand is gemeten vanaf het maaiveld; het maaiveldniveau staat in de kop.
 */
export function sonderingUitGef(naam: string, gef: { depths: number[]; qc: number[]; nafLevel: number }): Sondering {
  const punten = gef.depths
    .map((d, i) => ({ z: gef.nafLevel - d, qc: gef.qc[i] }))
    .filter((p) => Number.isFinite(p.z) && Number.isFinite(p.qc) && p.qc >= 0)
    .sort((a, b) => b.z - a.z);
  return {
    naam,
    maaiveld: gef.nafLevel,
    // Afronden houdt het projectbestand klein; centimeters en kPa volstaan.
    z: punten.map((p) => Math.round(p.z * 100) / 100),
    qc: punten.map((p) => Math.round(p.qc * 1000) / 1000),
  };
}
