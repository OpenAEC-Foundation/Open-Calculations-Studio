/**
 * De hoofdstukindeling van het constructierapport, op één plek vastgelegd.
 *
 * OPZET beschrijft alle onderdelen die een rapport kán hebben. bouwOpzet()
 * maakt daar de indeling van één rapport van: lege optionele onderdelen vallen
 * weg, de nummering loopt daarna door, en hoofdstuk Berekeningen krijgt per
 * rekenblad een paragraaf. Paneel, inhoudsopgave en afdruk lezen allemaal deze
 * uitkomst, zodat ze het nooit oneens zijn over wat "4.6" is.
 */
import type { Rapport } from "./model.ts";

export type Inhoud =
  | "tekst" | "rol"
  | "bouwwerk" | "brand" | "materialen" | "conservering" | "factoren" | "bestaand" | "vervormingen"
  | "sneeuw" | "wind" | "veranderlijk" | "blijvend"
  | "berekeningen";

export interface Knoop {
  /** Ook de sleutel in rapport.teksten als inhoud "tekst" is (of een tekst bij een tabel heeft). */
  id: string;
  titel: string;
  /** 1 hoofdstuk, 2 paragraaf (genummerd), 3 blok (vet, lijn eronder), 4 subblok (vet-cursief). */
  niveau: 1 | 2 | 3 | 4;
  inhoud?: Inhoud;
  /** Weglaten als er niets in staat. */
  optioneel?: boolean;
  /** Standaard: begint op een nieuwe pagina. */
  nieuwePagina?: boolean;
  /** Inspringen van de inhoud in kolommen (hoofdstuk 4 en 5 springen één kolom in). */
  inspringen?: 0 | 1;
  kinderen?: Knoop[];
}

/** Een tekstonderdeel: kop plus tekst uit rapport.teksten, optioneel. */
function tekst(id: string, titel: string, niveau: 3 | 4): Knoop {
  return { id, titel, niveau, inhoud: "tekst", optioneel: true };
}

export const OPZET: readonly Knoop[] = [
  { id: "inleiding", titel: "Inleiding", niveau: 1, inhoud: "tekst", nieuwePagina: true },
  {
    id: "projectgegevens", titel: "Projectgegevens", niveau: 1,
    kinderen: [
      { id: "projectomschrijving", titel: "Projectomschrijving", niveau: 2, inhoud: "tekst" },
      { id: "rol", titel: "Rol binnen het project en bereik rapport", niveau: 2, inhoud: "rol" },
    ],
  },
  {
    id: "constructie", titel: "Constructie", niveau: 1, nieuwePagina: true,
    kinderen: [
      {
        id: "toelichting", titel: "Toelichting constructie", niveau: 2,
        kinderen: [
          {
            id: "bestaand", titel: "Bestaande situatie", niveau: 3, optioneel: true,
            kinderen: [
              tekst("bestaand-verticaal", "Verticale belastingafdracht", 4),
              tekst("bestaand-stabiliteit", "Stabiliteit", 4),
              tekst("bestaand-fundatie", "Fundatie", 4),
              tekst("bestaand-beoordeling", "Beoordeling bestaande constructie", 4),
            ],
          },
          tekst("wijziging", "Wijziging", 3),
          tekst("belendingen", "Belendingen", 3),
        ],
      },
      {
        id: "uitvoering", titel: "Aandachtspunten bij uitvoering", niveau: 2, nieuwePagina: true,
        kinderen: [
          tekst("uitvoering-bestaand", "Bestaande situatie", 3),
          tekst("uitvoering-verbouw", "Verbouw, renovatie", 3),
          tekst("uitvoering-nieuwbouw", "Nieuwbouw", 3),
        ],
      },
    ],
  },
  {
    id: "uitgangspunten", titel: "Uitgangspunten", niveau: 1, nieuwePagina: true, inspringen: 1,
    kinderen: [
      { id: "bouwwerk", titel: "Constructieve uitgangspunten bouwwerk", niveau: 2, inhoud: "bouwwerk" },
      { id: "brand", titel: "Bouwconstructies bij brand", niveau: 2, inhoud: "brand" },
      { id: "materialen", titel: "Toegepaste materialen", niveau: 2, inhoud: "materialen" },
      { id: "conservering", titel: "Conservering staalconstructie", niveau: 2, inhoud: "conservering" },
      { id: "factoren", titel: "Belastingfactoren en belastingcombinaties", niveau: 2, inhoud: "factoren" },
      // Valt weg als uitgangspunten.bestaand.opnemen false is (nieuwbouw).
      { id: "bestaand-situatie", titel: "Bestaande situatie", niveau: 2, inhoud: "bestaand", optioneel: true },
      { id: "trillingen", titel: "Trillingen", niveau: 2, inhoud: "tekst" },
      // De tekst `vervormingen` is de inleidende zin boven de tabel.
      { id: "vervormingen", titel: "Vervormingen en horizontale verplaatsingen", niveau: 2, inhoud: "vervormingen" },
      { id: "montage", titel: "Montage en bouwfase", niveau: 2, inhoud: "tekst" },
      { id: "rekenprogrammatuur", titel: "Toegepaste rekenprogrammatuur", niveau: 2, inhoud: "tekst" },
      { id: "temperatuur", titel: "Temperatuursinvloeden", niveau: 2, inhoud: "tekst" },
      { id: "aardbeving", titel: "Aardbevingen", niveau: 2, inhoud: "tekst" },
    ],
  },
  {
    id: "belastingen", titel: "Belastingen", niveau: 1, nieuwePagina: true, inspringen: 1,
    kinderen: [
      // De tekst `sneeuw` staat onder de berekening van s.
      { id: "sneeuw", titel: "Sneeuwbelastingen(Q)", niveau: 2, inhoud: "sneeuw" },
      { id: "wind", titel: "Windbelastingen(Q)", niveau: 2, inhoud: "wind" },
      { id: "regenwater", titel: "Regenwateraccumulatie(Q)", niveau: 2, inhoud: "tekst" },
      { id: "veranderlijk", titel: "Overige veranderlijke belastingen(Q)", niveau: 2, inhoud: "veranderlijk" },
      // Valt weg zonder opbouwen.
      { id: "blijvend", titel: "Blijvende belastingen(G)", niveau: 2, inhoud: "blijvend", optioneel: true },
    ],
  },
  { id: "berekeningen", titel: "Berekeningen", niveau: 1, inhoud: "berekeningen", nieuwePagina: true },
];

/** Inhoudssoorten met een tekst in rapport.teksten naast hun tabel. */
const MET_TEKST: readonly Inhoud[] = ["rol", "vervormingen", "sneeuw"];

/** Heeft deze knoop een tekst in rapport.teksten (onder zijn eigen id)? */
export function heeftTekst(k: Knoop): boolean {
  return k.inhoud === "tekst" || (k.inhoud !== undefined && MET_TEKST.includes(k.inhoud));
}

/** Alle tekst-ids in de volgorde van het rapport — de sleutels van rapport.teksten. */
export const TEKST_IDS: readonly string[] = (() => {
  const ids: string[] = [];
  const loop = (knopen: readonly Knoop[]) => {
    for (const k of knopen) {
      if (heeftTekst(k)) ids.push(k.id);
      if (k.kinderen) loop(k.kinderen);
    }
  };
  loop(OPZET);
  return ids;
})();

/** Een knoop zoals hij in dit rapport voorkomt: met nummer, en zonder wat wegvalt. */
export interface Rapportknoop extends Knoop {
  nummer: string;
  nieuwePagina: boolean;
  kinderen: Rapportknoop[];
  blad?: { id: string; naam: string; bijlage: string };
}

export interface Blad { id: string; naam: string }

/**
 * Staat er niets in? Een tekstknoop is leeg als zijn getrimde tekst leeg is; een
 * knoop zonder eigen inhoud als al zijn kinderen leeg zijn. 4.6 en 5.5 hebben
 * een eigen regel; de overige tabellen zijn nooit leeg.
 */
function isLeeg(k: Knoop, r: Rapport): boolean {
  switch (k.inhoud) {
    case "tekst":
      return (r.teksten[k.id] ?? "").trim() === "";
    case "bestaand":
      return !r.uitgangspunten.bestaand.opnemen;
    case "blijvend":
      return r.belastingen.vloerenDaken.length === 0 && r.belastingen.wanden.length === 0;
    case undefined:
      return (k.kinderen ?? []).every((c) => isLeeg(c, r));
    default:
      return false;
  }
}

/** Niet-optionele knopen blijven altijd staan, ook als ze leeg zijn. */
function valtWeg(k: Knoop, r: Rapport): boolean {
  return k.optioneel === true && isLeeg(k, r);
}

function nieuwePaginaVoor(id: string, standaard: boolean | undefined, r: Rapport): boolean {
  return r.nieuwePagina[id] ?? standaard ?? false;
}

/**
 * Per rekenblad een paragraaf in Berekeningen. Bladen waarvan de uitwerking in
 * bijlage A staat krijgen daar een volgnummer (A.1, A.2, …); een blad met de
 * uitwerking in het hoofdstuk zelf krijgt bijlage "".
 */
function bladKnopen(nummer: string, r: Rapport, bladen: Blad[]): Rapportknoop[] {
  let inBijlage = 0;
  return bladen.map((b, i): Rapportknoop => ({
    id: b.id,
    titel: b.naam,
    niveau: 2,
    nummer: `${nummer}.${i + 1}`,
    nieuwePagina: nieuwePaginaVoor(b.id, false, r),
    kinderen: [],
    blad: { id: b.id, naam: b.naam, bijlage: r.inHoofdstuk[b.id] ? "" : `A.${++inBijlage}` },
  }));
}

function bouwKnoop(k: Knoop, nummer: string, r: Rapport, bladen: Blad[]): Rapportknoop {
  const kinderen = k.inhoud === "berekeningen"
    ? bladKnopen(nummer, r, bladen)
    : (k.kinderen ?? [])
        .filter((c) => !valtWeg(c, r))
        .map((c, j) => bouwKnoop(c, c.niveau === 2 ? `${nummer}.${j + 1}` : "", r, bladen));
  return { ...k, nummer, nieuwePagina: nieuwePaginaVoor(k.id, k.nieuwePagina, r), kinderen };
}

/** Nummert, laat lege optionele knopen weg, voegt per blad een paragraaf toe aan "berekeningen" (bijlage "A.1", "A.2", …). */
export function bouwOpzet(r: Rapport, bladen: Blad[]): Rapportknoop[] {
  return OPZET
    .filter((k) => !valtWeg(k, r))
    .map((k, i) => bouwKnoop(k, String(i + 1), r, bladen));
}

export interface Inhoudsregel { nummer: string; titel: string; niveau: 1 | 2; }

/** Hoofdstukken en paragrafen, behalve de paragrafen van "berekeningen" (die staan in de inhoudsopgave van dat hoofdstuk). */
export function inhoudsopgave(knopen: Rapportknoop[]): Inhoudsregel[] {
  const regels: Inhoudsregel[] = [];
  for (const h of knopen) {
    regels.push({ nummer: h.nummer, titel: h.titel, niveau: 1 });
    if (h.inhoud === "berekeningen") continue;
    for (const p of h.kinderen) {
      if (p.niveau === 2) regels.push({ nummer: p.nummer, titel: p.titel, niveau: 2 });
    }
  }
  return regels;
}

export interface Bijlage { letter: string; titel: string }

/** Titel van bijlage A. */
export const BIJLAGE_A = "Uitgebreide uitwerking berekeningen";

/** 0 → A, 1 → B, … 25 → Z, 26 → AA. */
function bijlageLetter(index: number): string {
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/**
 * A = "Uitgebreide uitwerking berekeningen" (alleen als er een blad in de bijlage staat),
 * daarna rapport.bijlagen als B, C, …
 *
 * De letters van de eigen bijlagen liggen vast (B is altijd de eerste eigen
 * bijlage), ook als A wegvalt: tekeningen en andere stukken verwijzen ernaar.
 * Een eigen bijlage zonder titel telt niet mee.
 */
export function bijlagen(r: Rapport, bladen: Blad[]): Bijlage[] {
  const uit: Bijlage[] = [];
  if (bladen.some((b) => !r.inHoofdstuk[b.id])) uit.push({ letter: "A", titel: BIJLAGE_A });
  r.bijlagen
    .map((t) => t.trim())
    .filter((t) => t !== "")
    .forEach((titel, i) => uit.push({ letter: bijlageLetter(i + 1), titel }));
  return uit;
}
