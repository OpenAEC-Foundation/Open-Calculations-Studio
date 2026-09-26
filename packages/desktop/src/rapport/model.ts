/**
 * Het constructierapport van een project: documentgegevens, teksten,
 * uitgangspunten en belastingen.
 *
 * Alleen gegevens en standaardwaarden: geen React en geen imports met waarden,
 * zodat scripts/check-rapport.mjs dit bestand rechtstreeks kan laden. Invoer
 * staat als tekst opgeslagen, net als de projectgegevens: wat de gebruiker
 * typte ("0,56") blijft staan, rekenen gebeurt pas bij het opmaken.
 */

export type Fase = "" | "SO" | "VO" | "DO" | "TO" | "UO";
export const FASEN: readonly Fase[] = ["SO", "VO", "DO", "TO", "UO"];

export type RevisieStatus = "concept" | "ter goedkeuring" | "definitief";
export const REVISIE_STATUSSEN: readonly RevisieStatus[] = ["concept", "ter goedkeuring", "definitief"];

export interface Revisie {
  code: string;
  /** dd-mm-jjjj */
  datum: string;
  omschrijving: string;
  status: RevisieStatus;
}

export interface Constructeur {
  /** Met titel, zoals hij op het voorblad staat: "Ing. A. de Vries". */
  naam: string;
  telefoon: string;
  email: string;
}

export interface Huisstijl {
  /** Hoofdstuktitels en de rapporttitel. */
  hoofdkleur: string;
  /** Paragraafkoppen, labels op het voorblad, ondertitel, kopregels van tabellen. */
  accentkleur: string;
  /** Tekst in tabellen. */
  tabeltekst: string;
  /** Ingevulde waarden in tabellen. */
  invoerkleur: string;
  /** CSS font-family. */
  lettertype: string;
}

export interface BureauProfiel {
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  telefoon: string;
  email: string;
  /** data-URL of "". */
  logo: string;
  /** data-URL of "": over de volle paginabreedte onderaan elke pagina. */
  voetafbeelding: string;
  huisstijl: Huisstijl;
  constructeurs: Constructeur[];
}

export const STANDAARD_HUISSTIJL: Huisstijl = {
  hoofdkleur: "#1f3a5f",
  accentkleur: "#2f7d6d",
  tabeltekst: "#1f2937",
  invoerkleur: "#1d4ed8",
  lettertype: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
};

export function leegBureau(): BureauProfiel {
  return {
    naam: "", adres: "", postcode: "", plaats: "", telefoon: "", email: "",
    logo: "", voetafbeelding: "",
    huisstijl: { ...STANDAARD_HUISSTIJL },
    constructeurs: [],
  };
}

/** 2.2 Rol binnen het project en bereik rapport. */
export interface Rol {
  rol: string;
  architect: string;
  datumOnderlegger: string;
}

export interface Brandeisen {
  /** Minuten, of "-" voor geen eis. */
  hoofddraagconstructie: string;
  brandscheiding: string;
  vluchtroute: string;
  /** Verwijzing naar de regelgeving, rechts van de tabel. */
  verwijzing: string;
}

export interface Materiaalregel { type: string; soort: string; opmerking: string; }
export interface Bevestigingsregel { type: string; kwaliteit: string; }
export interface Conserveringsregel { onderdeel: string; systeem: string; }
/** 4.8: één eis per kolom; leeg = geen eis in die kolom. */
export interface Vervormingsregel { onderdeel: string; ueind: string; ubij: string; uhor: string; }

export interface BestaandeSituatie {
  /** false = paragraaf 4.6 valt weg (nieuwbouw). */
  opnemen: boolean;
  bouwjaar: string;
  bron: string;
  /** "Ja" of "Nee". */
  berekeningBeschikbaar: string;
  materiaalgegevensBeschikbaar: string;
}

export interface Uitgangspunten {
  soortBouwwerk: string;
  brand: Brandeisen;
  materialen: Materiaalregel[];
  materialenNoot: string;
  bevestiging: Bevestigingsregel[];
  conservering: Conserveringsregel[];
  conserveringSlot: string;
  bestaand: BestaandeSituatie;
  vervormingen: Vervormingsregel[];
}

export interface Windcoefficient { omschrijving: string; c: string; }
export interface Wind {
  /** m */
  gebouwhoogte: string;
  cscd: string;
  coefficienten: Windcoefficient[];
}

/** 5.4: één belastingklasse; `categorie` is een id uit CATEGORIEEN (normwaarden.ts). */
export interface Belastingklasse {
  categorie: string;
  /** kN/m², alleen bij vloeren; "" = geen. */
  lichteScheidingswanden: string;
  /** graden, alleen bij daken. */
  dakhelling: string;
  /** kN/m¹, alleen bij daken. */
  qlast: string;
}

/** Een laag in een vlakopbouw: p = d × ρ, of de ingevulde p als die er staat. */
export interface Laag { naam: string; d: string; rho: string; p: string; }
/** Een laag in een gevelopbouw: q = p × h × vulling. */
export interface Gevellaag { naam: string; p: string; h: string; vulling: string; }

export type Opbouw =
  | { soort: "vlak"; naam: string; lagen: Laag[] }
  | { soort: "gevel"; naam: string; lagen: Gevellaag[] };

export interface Belastingen {
  wind: Wind;
  klassen: Belastingklasse[];
  vloerenDaken: Opbouw[];
  wanden: Opbouw[];
}

export interface Rapport {
  titel: string;
  kenmerk: string;
  fase: Fase;
  normen: string;
  /** Adresregels onder de opdrachtgever, gescheiden door "\n". */
  opdrachtgeverAdres: string;
  verantwoordelijk: string;
  uitvoerend: string;
  revisies: Revisie[];
  /** Per tekst-id (zie opzet.ts) de tekst. */
  teksten: Record<string, string>;
  rol: Rol;
  uitgangspunten: Uitgangspunten;
  belastingen: Belastingen;
  /** Per exemplaar-id een eigen toelichting voor hoofdstuk Berekeningen. */
  toelichting: Record<string, string>;
  /** Per exemplaar-id: uitwerking in het hoofdstuk zelf in plaats van in bijlage A. */
  inHoofdstuk: Record<string, boolean>;
  /** Titels van eigen bijlagen (B, C, …); bijlage A is altijd de uitwerking. */
  bijlagen: string[];
  /** Per knoop-id uit opzet.ts: begint op een nieuwe pagina (overschrijft de standaard). */
  nieuwePagina: Record<string, boolean>;
  /** Vastgelegde kopie van het bureauprofiel. */
  bureau: BureauProfiel;
}

// ── Standaardwaarden ────────────────────────────────────────────────────────
// Elke aanroep bouwt verse objecten en lijsten: een rapport dat de store
// bijwerkt mag nooit een lijst delen met het volgende nieuwe rapport.

function standaardRol(): Rol {
  return { rol: "Hoofdconstructeur", architect: "n.v.t.", datumOnderlegger: "n.v.t." };
}

function standaardUitgangspunten(): Uitgangspunten {
  return {
    soortBouwwerk: "Woning",
    brand: { hoofddraagconstructie: "-", brandscheiding: "-", vluchtroute: "-", verwijzing: "" },
    materialen: [
      { type: "TPG Beton", soort: "C20/25", opmerking: "(voor milieuklassen zie berekening betononderdelen en tekening)" },
      { type: "Hout", soort: "C24", opmerking: "" },
      { type: "Plaatmateriaal", soort: "CE2+", opmerking: "" },
      { type: "Wapeningsstaal", soort: "B500", opmerking: "" },
      { type: "Staal", soort: "S235", opmerking: "JR" },
      { type: "Ondervoeging staal", soort: "K50", opmerking: "" },
    ],
    materialenNoot: "(tenzij anders aangegeven)",
    bevestiging: [
      { type: "Bouten", kwaliteit: "8.8" },
      { type: "Houtdraaibout", kwaliteit: "4.6" },
      { type: "Chemische Ankers", kwaliteit: "5.8" },
    ],
    conservering: [
      { onderdeel: "Buitenconstructies", systeem: "Duplex of thermisch verzinkt" },
      { onderdeel: "Constructies in spouw", systeem: "Thermisch verzinkt" },
      { onderdeel: "Staal binnen", systeem: "Verf systeem" },
    ],
    conserveringSlot: "Conservering wordt toegepast op nieuw te plaatsen constructieonderdelen.",
    bestaand: {
      opnemen: false, bouwjaar: "", bron: "",
      berekeningBeschikbaar: "Ja", materiaalgegevensBeschikbaar: "Ja",
    },
    // `_rep` blijft tekst: de afdruk zet het als subscript.
    vervormingen: [
      { onderdeel: "Verticale doorbuiging van daken", ueind: "0,004l_rep", ubij: "0,004l_rep", uhor: "" },
      { onderdeel: "Verticale doorbuiging van vloeren", ueind: "0,004l_rep", ubij: "0,003l_rep", uhor: "" },
      { onderdeel: "Vloer met steenachtige wanden", ueind: "", ubij: "0,002l_rep", uhor: "" },
      { onderdeel: "Horizontale verplaatsing bouwwerk", ueind: "", ubij: "", uhor: "H/300" },
      { onderdeel: "Horizontale verplaatsing afscheiding", ueind: "", ubij: "", uhor: "< 20 mm" },
    ],
  };
}

function standaardBelastingen(): Belastingen {
  return {
    wind: {
      gebouwhoogte: "",
      cscd: "1",
      coefficienten: [
        { omschrijving: "", c: "0,04" },
        { omschrijving: "", c: "0,40" },
        { omschrijving: "", c: "0,80" },
        { omschrijving: "", c: "1,10" },
      ],
    },
    klassen: [
      { categorie: "A-vloer", lichteScheidingswanden: "0,80", dakhelling: "", qlast: "" },
      { categorie: "H-dak", lichteScheidingswanden: "", dakhelling: "0", qlast: "2,0" },
    ],
    vloerenDaken: [],
    wanden: [],
  };
}

/** Een nieuw rapport. `vandaag` in dd-mm-jjjj; `teksten` komen uit de standaardteksten. */
export function standaardRapport(vandaag: string, teksten: Record<string, string>): Rapport {
  return {
    titel: "Constructieadvies & berekeningen",
    kenmerk: "",
    fase: "",
    normen: "NEN-EN 1990 t/m 1997",
    opdrachtgeverAdres: "",
    verantwoordelijk: "",
    uitvoerend: "",
    revisies: [{ code: "A", datum: vandaag, omschrijving: "Eerste uitgave", status: "concept" }],
    teksten: { ...teksten },
    rol: standaardRol(),
    uitgangspunten: standaardUitgangspunten(),
    belastingen: standaardBelastingen(),
    toelichting: {},
    inHoofdstuk: {},
    bijlagen: [],
    nieuwePagina: {},
    bureau: leegBureau(),
  };
}

// ── Normaliseren ────────────────────────────────────────────────────────────
// Een rapport komt uit een projectbestand of uit de opslag, en dus mogelijk
// van een oudere of nieuwere versie, of met de hand bewerkt. Alles wordt per
// veld gecontroleerd: wat ontbreekt of een verkeerd type heeft wordt de
// standaard, onbekende velden vallen weg, en lijsten houden alleen de
// elementen die een object zijn. Een lege tekst ("") is wél geldig: die heeft
// de gebruiker zelf leeggemaakt.

type Los = Record<string, unknown>;

/** Een gewoon object (geen lijst, geen null), anders undefined. */
function object(x: unknown): Los | undefined {
  return x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Los) : undefined;
}

function tekst(x: unknown, standaard: string): string {
  return typeof x === "string" ? x : standaard;
}

/**
 * Een lijst uit het bestand. Geen lijst → de standaard; wel een lijst → alleen
 * de elementen die een object zijn, elk genormaliseerd. `normaliseer` mag een
 * element afwijzen met null (bijvoorbeeld een opbouw van een onbekende soort).
 */
function lijst<T>(x: unknown, standaard: T[], normaliseer: (o: Los) => T | null): T[] {
  if (!Array.isArray(x)) return standaard;
  const uit: T[] = [];
  for (const el of x) {
    const o = object(el);
    if (!o) continue;
    const n = normaliseer(o);
    if (n !== null) uit.push(n);
  }
  return uit;
}

/** Tekstwaarden per sleutel, over `basis` heen; andere typen vallen weg. */
function tekstRecord(x: unknown, basis: Record<string, string> = {}): Record<string, string> {
  const uit: Record<string, string> = { ...basis };
  const o = object(x);
  if (o) for (const [k, v] of Object.entries(o)) if (typeof v === "string") uit[k] = v;
  return uit;
}

/** Ja/nee-waarden per sleutel; andere typen vallen weg. */
function waarheidRecord(x: unknown): Record<string, boolean> {
  const uit: Record<string, boolean> = {};
  const o = object(x);
  if (o) for (const [k, v] of Object.entries(o)) if (typeof v === "boolean") uit[k] = v;
  return uit;
}

function normaliseerOpbouw(o: Los): Opbouw | null {
  const naam = tekst(o.naam, "");
  if (o.soort === "vlak") {
    return {
      soort: "vlak", naam,
      lagen: lijst(o.lagen, [], (l): Laag => ({
        naam: tekst(l.naam, ""), d: tekst(l.d, ""), rho: tekst(l.rho, ""), p: tekst(l.p, ""),
      })),
    };
  }
  if (o.soort === "gevel") {
    return {
      soort: "gevel", naam,
      lagen: lijst(o.lagen, [], (l): Gevellaag => ({
        naam: tekst(l.naam, ""), p: tekst(l.p, ""), h: tekst(l.h, ""), vulling: tekst(l.vulling, ""),
      })),
    };
  }
  return null;
}

/**
 * Een bureauprofiel uit een bestand of de instellingen. Huisstijlvelden die
 * leeg zijn krijgen de standaard: een lege kleur of een leeg lettertype is
 * nooit bedoeld en zou de afdruk kleurloos maken.
 */
export function normaliseerBureau(x: unknown): BureauProfiel {
  const s = leegBureau();
  const o = object(x);
  if (!o) return s;
  const h = object(o.huisstijl) ?? {};
  const stijl = (v: unknown, standaard: string) => tekst(v, standaard) || standaard;
  return {
    naam: tekst(o.naam, ""),
    adres: tekst(o.adres, ""),
    postcode: tekst(o.postcode, ""),
    plaats: tekst(o.plaats, ""),
    telefoon: tekst(o.telefoon, ""),
    email: tekst(o.email, ""),
    logo: tekst(o.logo, ""),
    voetafbeelding: tekst(o.voetafbeelding, ""),
    huisstijl: {
      hoofdkleur: stijl(h.hoofdkleur, s.huisstijl.hoofdkleur),
      accentkleur: stijl(h.accentkleur, s.huisstijl.accentkleur),
      tabeltekst: stijl(h.tabeltekst, s.huisstijl.tabeltekst),
      invoerkleur: stijl(h.invoerkleur, s.huisstijl.invoerkleur),
      lettertype: stijl(h.lettertype, s.huisstijl.lettertype),
    },
    constructeurs: lijst(o.constructeurs, [], (c): Constructeur => ({
      naam: tekst(c.naam, ""), telefoon: tekst(c.telefoon, ""), email: tekst(c.email, ""),
    })),
  };
}

/**
 * Een rapport uit een bestand of de opslag, aangevuld met standaardwaarden. Onbekende
 * velden vallen weg; verkeerde typen worden standaard. Geneste objecten en lijsten
 * worden per veld gecontroleerd.
 */
export function normaliseerRapport(x: unknown, vandaag: string, teksten: Record<string, string>): Rapport {
  const s = standaardRapport(vandaag, teksten);
  const o = object(x);
  if (!o) return s;

  const rol = object(o.rol) ?? {};
  const u = object(o.uitgangspunten) ?? {};
  const su = s.uitgangspunten;
  const brand = object(u.brand) ?? {};
  const bestaand = object(u.bestaand) ?? {};
  const b = object(o.belastingen) ?? {};
  const sb = s.belastingen;
  const wind = object(b.wind) ?? {};

  return {
    titel: tekst(o.titel, s.titel),
    kenmerk: tekst(o.kenmerk, s.kenmerk),
    fase: FASEN.includes(o.fase as Fase) ? (o.fase as Fase) : "",
    normen: tekst(o.normen, s.normen),
    opdrachtgeverAdres: tekst(o.opdrachtgeverAdres, s.opdrachtgeverAdres),
    verantwoordelijk: tekst(o.verantwoordelijk, s.verantwoordelijk),
    uitvoerend: tekst(o.uitvoerend, s.uitvoerend),
    revisies: lijst(o.revisies, s.revisies, (r): Revisie => ({
      code: tekst(r.code, ""),
      datum: tekst(r.datum, ""),
      omschrijving: tekst(r.omschrijving, ""),
      status: REVISIE_STATUSSEN.includes(r.status as RevisieStatus) ? (r.status as RevisieStatus) : "concept",
    })),
    // Over de standaardteksten heen: een tekst-id die in het bestand ontbreekt
    // (ouder bestand, of een onderdeel dat later is bijgekomen) krijgt zo zijn
    // standaardtekst, terwijl een bewust leeggemaakte tekst ("") leeg blijft.
    teksten: tekstRecord(o.teksten, s.teksten),
    rol: {
      rol: tekst(rol.rol, s.rol.rol),
      architect: tekst(rol.architect, s.rol.architect),
      datumOnderlegger: tekst(rol.datumOnderlegger, s.rol.datumOnderlegger),
    },
    uitgangspunten: {
      soortBouwwerk: tekst(u.soortBouwwerk, su.soortBouwwerk),
      brand: {
        hoofddraagconstructie: tekst(brand.hoofddraagconstructie, su.brand.hoofddraagconstructie),
        brandscheiding: tekst(brand.brandscheiding, su.brand.brandscheiding),
        vluchtroute: tekst(brand.vluchtroute, su.brand.vluchtroute),
        verwijzing: tekst(brand.verwijzing, su.brand.verwijzing),
      },
      materialen: lijst(u.materialen, su.materialen, (m): Materiaalregel => ({
        type: tekst(m.type, ""), soort: tekst(m.soort, ""), opmerking: tekst(m.opmerking, ""),
      })),
      materialenNoot: tekst(u.materialenNoot, su.materialenNoot),
      bevestiging: lijst(u.bevestiging, su.bevestiging, (m): Bevestigingsregel => ({
        type: tekst(m.type, ""), kwaliteit: tekst(m.kwaliteit, ""),
      })),
      conservering: lijst(u.conservering, su.conservering, (m): Conserveringsregel => ({
        onderdeel: tekst(m.onderdeel, ""), systeem: tekst(m.systeem, ""),
      })),
      conserveringSlot: tekst(u.conserveringSlot, su.conserveringSlot),
      bestaand: {
        opnemen: typeof bestaand.opnemen === "boolean" ? bestaand.opnemen : su.bestaand.opnemen,
        bouwjaar: tekst(bestaand.bouwjaar, su.bestaand.bouwjaar),
        bron: tekst(bestaand.bron, su.bestaand.bron),
        berekeningBeschikbaar: tekst(bestaand.berekeningBeschikbaar, su.bestaand.berekeningBeschikbaar),
        materiaalgegevensBeschikbaar: tekst(bestaand.materiaalgegevensBeschikbaar, su.bestaand.materiaalgegevensBeschikbaar),
      },
      vervormingen: lijst(u.vervormingen, su.vervormingen, (v): Vervormingsregel => ({
        onderdeel: tekst(v.onderdeel, ""), ueind: tekst(v.ueind, ""), ubij: tekst(v.ubij, ""), uhor: tekst(v.uhor, ""),
      })),
    },
    belastingen: {
      wind: {
        gebouwhoogte: tekst(wind.gebouwhoogte, sb.wind.gebouwhoogte),
        cscd: tekst(wind.cscd, sb.wind.cscd),
        coefficienten: lijst(wind.coefficienten, sb.wind.coefficienten, (c): Windcoefficient => ({
          omschrijving: tekst(c.omschrijving, ""), c: tekst(c.c, ""),
        })),
      },
      klassen: lijst(b.klassen, sb.klassen, (k): Belastingklasse => ({
        categorie: tekst(k.categorie, ""),
        lichteScheidingswanden: tekst(k.lichteScheidingswanden, ""),
        dakhelling: tekst(k.dakhelling, ""),
        qlast: tekst(k.qlast, ""),
      })),
      vloerenDaken: lijst(b.vloerenDaken, sb.vloerenDaken, normaliseerOpbouw),
      wanden: lijst(b.wanden, sb.wanden, normaliseerOpbouw),
    },
    toelichting: tekstRecord(o.toelichting),
    inHoofdstuk: waarheidRecord(o.inHoofdstuk),
    bijlagen: Array.isArray(o.bijlagen) ? o.bijlagen.filter((t): t is string => typeof t === "string") : s.bijlagen,
    nieuwePagina: waarheidRecord(o.nieuwePagina),
    bureau: normaliseerBureau(o.bureau),
  };
}
