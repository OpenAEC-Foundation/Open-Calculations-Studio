/**
 * Controlescript voor het verdelen van een uitdraai over A4-vellen
 * (packages/desktop/src/components/calc/paginering.ts).
 *
 * Alleen het rekenwerk: `verdeelInPaginas` en `verdeelPerSectie` krijgen
 * blokken met een hoogte en geven vellen terug. Het meten zelf (`meetBlokken`)
 * leest de DOM en valt buiten dit script; welk blok als kop telt
 * (`houdtBijVolgende`) wel, met nagebootste elementen.
 *
 * Draaien:  node scripts/check-paginering.mjs
 */
import {
  MATEN,
  SPELING,
  houdtBijVolgende,
  verdeelInPaginas,
  verdeelPerSectie,
} from "../packages/desktop/src/components/calc/paginering.ts";

let fouten = 0;
function toets(naam, ok, detail = "") {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam}${ok || !detail ? "" : `   (kreeg ${detail})`}`);
}

const blok = (hoogte, sectie = "rpa-sectie", nieuwePagina = false, houdBijVolgende = false) =>
  ({ el: null, hoogte, nieuwePagina, houdBijVolgende, sectie, wikkels: [] });
/** "2+1": twee blokken op het eerste vel, één op het tweede. */
const vorm = (paginas) => paginas.map((p) => p.length).join("+");

// Maten: de bladen zoals ze waren, het rapport zoals gemeten aan de referentie.
const { bladen, rapport } = MATEN;
toets("bladen: bladspiegel 178 × 253 mm", bladen.inhoud.breedte === 178 && bladen.inhoud.hoogte === 253);
toets("bladen: rekenhoogte = bladspiegel min de speling", bladen.inhoud.vulhoogte === bladen.inhoud.hoogte - SPELING);
toets("rapport: breedte = A4 min de zijmarges",
  Math.abs(rapport.inhoud.breedte - (210 - rapport.marge.links - rapport.marge.rechts)) < 1e-9);
toets("rapport: hoogte = A4 min boven- en ondermarge",
  Math.abs(rapport.inhoud.hoogte - (297 - rapport.marge.boven - rapport.marge.onder)) < 1e-9);
toets("rapport: precies 41 regels van 6,6 mm, zonder speling",
  Math.abs(rapport.inhoud.hoogte - 41 * 6.6) < 1e-9 && rapport.inhoud.vulhoogte === rapport.inhoud.hoogte);

// Afronding: gemeten hoogtes tellen een fractie van een pixel te veel op.
const px = 3.7795; // px per mm bij 96 dpi
const regel = 6.6 * px;
const vol = Array.from({ length: 41 }, (_, i) => blok(regel + (i === 0 ? 0.4 : 0), "rpa-sectie", i === 0));
const eenVel = vorm(verdeelInPaginas(vol, rapport.inhoud.vulhoogte * px));
toets("41 regels met 0,4 px afronding passen op één vel", eenVel === "41", eenVel);
const tweeVel = vorm(verdeelInPaginas([...vol, blok(regel)], rapport.inhoud.vulhoogte * px));
toets("de 42e regel gaat naar het volgende vel", tweeVel === "41+1", tweeVel);

// Per sectie een eigen bladhoogte.
const gemengd = [
  blok(40, "rpa-sectie", true), blok(40), blok(40),
  blok(30, "print-blad", true), blok(30, "print-blad"),
];
const perSectie = vorm(verdeelPerSectie(gemengd, (s) => (s === "print-blad" ? 50 : 100)));
toets("rapportsectie op 100 px, rekenblad op 50 px", perSectie === "2+1+1+1", perSectie);

// Een kop onderaan een sectie blijft in die sectie: de volgende begint op een eigen vel.
const kopAchteraan = [blok(50, "rpa-sectie", true), blok(40, "rpa-sectie", false, true), blok(50, "rpa-sectie", true)];
const kopVorm = vorm(verdeelPerSectie(kopAchteraan, () => 100));
toets("een kop schuift niet door naar de volgende sectie", kopVorm === "2+1", kopVorm);

// Binnen een sectie schuift een kop die onderaan achterblijft wél door.
const kopBinnen = [blok(60, "rpa-sectie", true), blok(30, "rpa-sectie", false, true), blok(50)];
const binnenVorm = vorm(verdeelPerSectie(kopBinnen, () => 100));
toets("binnen een sectie gaat een kop mee naar het volgende vel", binnenVorm === "1+2", binnenVorm);

// Een kop houdt minstens het eerste blok eronder bij zich, ook als het
// volgende vel al vol zou zijn: achteraf doorschuiven lukte dan niet meer.
const volgendVol = [blok(60, "rpa-sectie", true), blok(30, "rpa-sectie", false, true), blok(70), blok(30)];
const volVorm = vorm(verdeelPerSectie(volgendVol, () => 100));
toets("een kop begint een nieuw vel als hij met zijn vervolg niet meer past", volVorm === "1+2+1", volVorm);
toets("  en geen vel wordt daardoor voller dan de bladspiegel",
  verdeelPerSectie(volgendVol, () => 100).every((p) => p.reduce((s, b) => s + b.hoogte, 0) <= 100), volVorm);

// Past de kop met zijn vervolg wel, dan blijft alles staan waar het stond.
const pastNog = vorm(verdeelPerSectie([blok(40, "rpa-sectie", true), blok(20, "rpa-sectie", false, true), blok(40)], () => 100));
toets("een kop met een vervolg dat nog past blijft op het vel", pastNog === "3", pastNog);

// Koppen onder elkaar (hoofdstuk, paragraaf) gaan samen met het eerste blok inhoud.
const koppen = [blok(50, "rpa-sectie", true), blok(20, "rpa-sectie", false, true), blok(20, "rpa-sectie", false, true), blok(40)];
const koppenVorm = vorm(verdeelPerSectie(koppen, () => 100));
toets("twee koppen onder elkaar gaan samen met hun inhoud naar het volgende vel", koppenVorm === "1+3", koppenVorm);

// Een blok zonder hoogte (naast het vorige, of leeg) telt niet als vervolg.
const leegErna = [blok(50, "rpa-sectie", true), blok(20, "rpa-sectie", false, true), blok(0), blok(40)];
const leegVorm = vorm(verdeelPerSectie(leegErna, () => 100));
toets("een blok zonder hoogte na de kop telt niet als vervolg", leegVorm === "1+3", leegVorm);

// Is het vervolg hoger dan een heel vel, dan helpt doorschuiven niet.
const teHoog = vorm(verdeelPerSectie([blok(50, "rpa-sectie", true), blok(20, "rpa-sectie", false, true), blok(120)], () => 100));
toets("een kop met een vervolg hoger dan een vel blijft staan", teHoog === "2+1", teHoog);

// Welke blokken als kop tellen.
const el = (tagName, ...klassen) => ({ tagName, classList: { contains: (k) => klassen.includes(k) } });
toets("h1 tot en met h6 zijn koppen", ["H1", "H2", "H3", "H4", "H5", "H6"].every((t) => houdtBijVolgende(el(t))));
toets("het kopblok van een rekenblad is een kop", houdtBijVolgende(el("HEADER", "print-blad-kop")));
toets("de sectiekop op het voorblad en de kopregel van een rapporttabel zijn koppen",
  houdtBijVolgende(el("P", "print-sectiekop")) && houdtBijVolgende(el("DIV", "rpa-rij", "rpa-houd")));
toets("gewone regels zijn geen kop",
  !houdtBijVolgende(el("P", "calc-text")) && !houdtBijVolgende(el("DIV", "calc-line")) && !houdtBijVolgende(el("H7")));

if (fouten > 0) {
  console.error(`\nPaginering: ${fouten} afwijking(en).`);
  process.exit(1);
}
console.log("\nPaginering: maten, afronding en verdeling per sectie kloppen.");
