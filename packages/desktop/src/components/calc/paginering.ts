/**
 * Verdeelt een doorlopende uitdraai in losse A4-pagina's.
 *
 * De browser kan dit zelf bij het printen, maar laat op het scherm niet zien
 * wáár hij afbreekt. Voor een afdrukvoorbeeld is dat juist het punt: je wilt
 * vooraf weten of een tekening over de vouw valt. Daarom hier zelf meten en
 * verdelen, en de uitkomst als losse vellen tonen.
 *
 * Zuivere rekenmodule: `meetBlokken` leest de DOM, `verdeelInPaginas` doet er
 * verder niets mee dan rekenen. Zo is de verdeling los te toetsen.
 */

/** A4 staand, in millimeter. */
export const A4 = { breedte: 210, hoogte: 297 } as const;

/** Paginamarges, gelijk aan de `@page`-regel in PrintDocument.css. */
export const MARGE = { boven: 24, rechts: 16, onder: 20, links: 16 } as const;

/**
 * Veiligheidsstrook onderaan de bladspiegel, in millimeter.
 *
 * De hoogtes worden gemeten aan de doorlopende uitdraai; op een los vel vallen
 * samengeklapte marges net iets anders uit. Zonder speling liep daardoor af en
 * toe een vel een paar millimeter over, en wat eraf valt is weg zonder dat je
 * het ziet. Liever een pagina die een regel eerder afbreekt dan een regel die
 * verdwijnt. Vier millimeter op 253 kost anderhalve procent bladvulling.
 */
export const SPELING = 4;

/** De bladspiegel: wat er aan inhoud op één pagina past. */
export const INHOUD = {
  breedte: A4.breedte - MARGE.links - MARGE.rechts, // 178 mm
  hoogte: A4.hoogte - MARGE.boven - MARGE.onder, // 253 mm
  /** De hoogte waarop de verdeling rekent: bladspiegel minus de speling. */
  vulhoogte: A4.hoogte - MARGE.boven - MARGE.onder - SPELING, // 249 mm
} as const;

/** Marges en bladspiegel van één soort uitdraai, in millimeter. */
export interface Maten {
  marge: { boven: number; rechts: number; onder: number; links: number };
  inhoud: { breedte: number; hoogte: number; vulhoogte: number };
}

/**
 * Maten per soort uitdraai, gelijk aan de `@page`-regels.
 *
 * - `bladen`: losse rekenbladen en het projectoverzicht (PrintDocument.css).
 * - `rapport`: het constructierapport (RapportAfdruk.css, `@page rapport`),
 *   gemeten aan de referentie-PDF. De bladspiegel is precies 41 regels van
 *   6,6 mm. De verdeling rekent daarom met de volle hoogte: de speling van de
 *   bladen zou er elke pagina een regel af halen, en dan valt het rapport
 *   anders over de vellen dan de referentie. Het rapport staat op een vast
 *   raster zonder samenklappende marges, dus die speling is daar niet nodig.
 *   Rekenbladen in bijlage A houden hem wel (zie AfdrukVoorbeeld).
 */
export const MATEN = {
  bladen: { marge: MARGE, inhoud: INHOUD },
  rapport: {
    marge: { boven: 6.6, rechts: 9.9, onder: 19.8, links: 9.85 },
    inhoud: { breedte: 190.25, hoogte: 270.6, vulhoogte: 270.6 },
  },
} as const satisfies Record<string, Maten>;

export interface Blok {
  el: HTMLElement;
  /** Hoogte inclusief de ruimte tot het volgende blok, in px. */
  hoogte: number;
  /** Moet op een verse pagina beginnen (een nieuw rekenblad). */
  nieuwePagina: boolean;
  /** Een kop hoort niet los onderaan een pagina te blijven staan. */
  houdBijVolgende: boolean;
  /**
   * De klasse van de sectie waar dit blok uit komt (`print-voorblad` of
   * `print-blad`). De opmaakregels hangen aan die ouder; een losgeknipt blok op
   * een pagina zou hem kwijt zijn en zijn opmaak verliezen. De weergave zet hem
   * daarom terug op het omhulsel van de pagina.
   */
  sectie: string;
  /**
   * De wikkels waar dit blok uit is gehaald, van buiten naar binnen.
   *
   * Ook hier hangt opmaak aan: de kern schrijft zijn lettertype, kleur en
   * regelafstand op `.ifc-calc` en niet op de regels zelf. Wie de wikkel
   * weglaat krijgt op de pagina een ander lettertype dan op de afdruk — en dan
   * klopt het voorbeeld precies niet meer waar het om bedoeld was.
   */
  wikkels: string[];
}

/** Hoeveel px één millimeter is in dit venster. Gemeten, niet aangenomen: de
 *  verhouding hangt van de schermschaal af en 96 dpi is maar een gok. */
export function pxPerMm(doc: Document = document): number {
  const proef = doc.createElement("div");
  proef.style.cssText = "position:absolute;visibility:hidden;height:100mm;width:0";
  doc.body.appendChild(proef);
  const px = proef.getBoundingClientRect().height / 100;
  proef.remove();
  return px || 96 / 25.4;
}

/** Elementen die geen inhoud zijn maar bediening, loopkop of voet. */
const OVERSLAAN = ["print-loopkop", "print-loopvoet", "rpa-voet"];

/**
 * Wikkels die alleen groeperen: `.ifc-calc` om de uitwerking van een blad en
 * `.rpa-vlak` om de regels van het rapport. Wat erin zit, wordt los verdeeld.
 */
const WIKKELS = ["ifc-calc", "rpa-vlak"];

/**
 * Haalt de wikkels weg en levert de regels die erin zitten.
 *
 * Recursief, want er zitten er meer in elkaar: de uitdraai zet een `.ifc-calc`
 * om de uitwerking heen en de kern levert er ook al een mee. Eén laag afpellen
 * houdt dus alleen de binnenste wikkel over — één blok van een halve meter
 * hoog, dat op de eerste de beste pagina blijft steken. In het rapport zit een
 * tabel in een paragraaf in een hoofdstuk; ook dat mag geen blok van een halve
 * pagina worden.
 */
function vlakUit(el: HTMLElement, wikkels: string[] = []): { el: HTMLElement; wikkels: string[] }[] {
  if (!WIKKELS.some((k) => el.classList.contains(k))) return [{ el, wikkels }];
  const dieper = [...wikkels, el.className];
  return (Array.from(el.children) as HTMLElement[]).flatMap((k) => vlakUit(k, dieper));
}

/**
 * Vlakt de uitdraai uit tot een rij blokken en meet ze.
 *
 * De uitdraai is genest: secties met daarin een kop, een beeld en een
 * `.ifc-calc` met alle regels. Voor het verdelen telt alleen de rij regels die
 * ontstaat als je die nesting opheft — anders is een heel rekenblad één
 * ondeelbaar blok en past er niets.
 */
export function meetBlokken(bron: HTMLElement): Blok[] {
  const rijen: { el: HTMLElement; nieuwePagina: boolean; sectie: string; wikkels: string[] }[] = [];

  // Het rapport staat in één wortel die de huisstijl draagt; de secties zijn
  // de kinderen daarvan. De bladen staan rechtstreeks in de bron.
  const secties = (Array.from(bron.children) as HTMLElement[]).flatMap((el) =>
    el.classList.contains("rpa-wortel") ? (Array.from(el.children) as HTMLElement[]) : [el],
  );

  for (const sectie of secties) {
    if (OVERSLAAN.some((k) => sectie.classList.contains(k))) continue;
    let eerste = true;
    for (const kind of Array.from(sectie.children) as HTMLElement[]) {
      for (const item of vlakUit(kind)) {
        rijen.push({ el: item.el, nieuwePagina: eerste, sectie: sectie.className, wikkels: item.wikkels });
        eerste = false;
      }
    }
  }

  // Meten via de afstand tot het vólgende blok in plaats van via de eigen
  // hoogte: zo tellen marges — en het inklappen daarvan — vanzelf mee.
  const bronOnder = bron.getBoundingClientRect().bottom;
  const toppen = rijen.map((r) => r.el.getBoundingClientRect().top);

  return rijen.map((r, i) => {
    const onder = i + 1 < toppen.length ? toppen[i + 1] : bronOnder;
    return {
      el: r.el,
      hoogte: Math.max(0, onder - toppen[i]),
      nieuwePagina: r.nieuwePagina,
      // Een kop, of een regel die zich zo gedraagt: de kopregel van een tabel
      // in het rapport is geen <h*>, maar hoort evenmin los onderaan een vel.
      houdBijVolgende: /^H[1-6]$/.test(r.el.tagName) || r.el.classList.contains("rpa-houd"),
      sectie: r.sectie,
      wikkels: r.wikkels,
    };
  });
}

/**
 * Afrondingsruimte in px.
 *
 * Hoogtes zijn afstanden tussen gemeten blokken, en de browser rekent in
 * 1/64 px. 41 regels van 6,6 mm tellen daardoor soms een fractie boven de
 * bladspiegel op, terwijl ze er precies in passen; zonder deze ruimte ging de
 * laatste regel van een vol vel steeds naar het volgende.
 */
const AFRONDING = 1;

/**
 * Verdeelt per sectie, elk met een eigen bladhoogte.
 *
 * Een sectie begint toch al op een vers vel, dus apart verdelen verandert
 * niets aan de vellen zelf — maar zo kan een rekenblad met speling rekenen en
 * het rapport ernaast met de volle hoogte, en schuift een kop onderaan een
 * sectie niet door naar het eerste vel van de volgende.
 */
export function verdeelPerSectie(blokken: Blok[], hoogteVoor: (sectie: string) => number): Blok[][] {
  const paginas: Blok[][] = [];
  let groep: Blok[] = [];
  const sluit = () => {
    if (groep.length > 0) paginas.push(...verdeelInPaginas(groep, hoogteVoor(groep[0].sectie)));
    groep = [];
  };
  for (const blok of blokken) {
    if (blok.nieuwePagina) sluit();
    groep.push(blok);
  }
  sluit();
  return paginas;
}

/**
 * Verdeelt de blokken over pagina's van `paginaHoogte` px.
 *
 * Een blok dat op zichzelf hoger is dan een pagina krijgt een eigen pagina en
 * loopt daar over; splitsen kan niet zonder de inhoud te beschadigen (een
 * tekening doormidden knippen helpt niemand). De weergave kapt het af, precies
 * zoals een printer dat doet — dan zíé je tenminste dat het niet past.
 */
export function verdeelInPaginas(blokken: Blok[], paginaHoogte: number): Blok[][] {
  const paginas: Blok[][] = [];
  let huidig: Blok[] = [];
  let gebruikt = 0;

  const sluit = () => {
    if (huidig.length > 0) paginas.push(huidig);
    huidig = [];
    gebruikt = 0;
  };

  for (const blok of blokken) {
    if (blok.nieuwePagina) sluit();
    else if (gebruikt > 0 && gebruikt + blok.hoogte > paginaHoogte + AFRONDING) sluit();
    huidig.push(blok);
    gebruikt += blok.hoogte;
  }
  sluit();

  return trekKoppenDoor(paginas, paginaHoogte);
}

/**
 * Haalt koppen weg die alleen onderaan een pagina zouden achterblijven.
 *
 * Een paragraafkop los onder aan een vel, met de tekst op het volgende, leest
 * als een fout in het rapport. Verplaatsen mag alleen als de kop op de
 * volgende pagina ook echt past — anders schuift het probleem alleen op.
 */
function trekKoppenDoor(paginas: Blok[][], paginaHoogte: number): Blok[][] {
  for (let i = 0; i < paginas.length - 1; i++) {
    const pagina = paginas[i];
    const volgende = paginas[i + 1];
    const verplaats: Blok[] = [];
    while (pagina.length > 1 && pagina[pagina.length - 1].houdBijVolgende) {
      verplaats.unshift(pagina.pop() as Blok);
    }
    if (verplaats.length === 0) continue;
    const erbij = verplaats.reduce((som, b) => som + b.hoogte, 0);
    const bezet = volgende.reduce((som, b) => som + b.hoogte, 0);
    if (bezet + erbij <= paginaHoogte + AFRONDING) volgende.unshift(...verplaats);
    else pagina.push(...verplaats); // past niet; laat hem dan maar staan
  }
  return paginas;
}
