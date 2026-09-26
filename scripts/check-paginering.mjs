/**
 * Controlescript voor het verdelen van een uitdraai over A4-vellen
 * (packages/desktop/src/components/calc/paginering.ts).
 *
 * Alleen het rekenwerk: `verdeelInPaginas` en `verdeelPerSectie` krijgen
 * blokken met een hoogte en geven vellen terug. Het meten zelf (`meetBlokken`)
 * leest de DOM en valt buiten dit script.
 *
 * Draaien:  node scripts/check-paginering.mjs
 */
import {
  MATEN,
  SPELING,
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

if (fouten > 0) {
  console.error(`\nPaginering: ${fouten} afwijking(en).`);
  process.exit(1);
}
console.log("\nPaginering: maten, afronding en verdeling per sectie kloppen.");
