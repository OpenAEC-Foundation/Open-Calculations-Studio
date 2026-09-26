/**
 * Controlescript voor de afdrukstore: welke uitdraai er komt.
 *
 * Er zijn twee soorten afdruk: de losse rekenbladen ("bladen") en het
 * constructierapport ("rapport"). De soort reist mee met `afdrukken` en
 * `toonVoorbeeld`; weglaten betekent "laat staan wat er stond", net als bij de
 * selectie. Gaat dat mis, dan drukt "PDF blad" na een rapportafdruk opeens een
 * heel rapport af, of de knop in het voorbeeld iets anders dan er te zien is.
 *
 * printStore.ts importeert alleen zustand, dus Node laadt hem rechtstreeks.
 * De hook useAfdrukken zelf is hier niet te toetsen (React); die staat in de
 * handmatige controle van het plan.
 *
 * Draaien:  node scripts/check-afdrukstore.mjs
 */
import { usePrintStore } from "../packages/desktop/src/store/printStore.ts";

const BEGIN = { bezig: false, voorbeeld: false, selectie: null, soort: "bladen" };
let fouten = 0;

/** Vergelijkt de genoemde velden van de huidige stand met `verwacht`. */
function toets(naam, verwacht) {
  const s = usePrintStore.getState();
  const afwijkend = Object.entries(verwacht).filter(([k, v]) => JSON.stringify(s[k]) !== JSON.stringify(v));
  if (afwijkend.length === 0) {
    console.log(`  OK     ${naam}`);
    return;
  }
  fouten++;
  console.log(`  FOUT   ${naam}`);
  for (const [k, v] of afwijkend) {
    console.log(`         ${k}: ${JSON.stringify(s[k])}, verwacht ${JSON.stringify(v)}`);
  }
}

/** Elk geval begint vanaf een bekende stand; geeft de acties terug. */
function vanaf(stand = {}) {
  usePrintStore.setState({ ...BEGIN, ...stand });
  return usePrintStore.getState();
}

// Eerst de beginstand, vóór er iets is gezet.
toets("beginstand: bladen, geen afdruk, geen voorbeeld", BEGIN);

// ── afdrukken ────────────────────────────────────────────────────────────────
vanaf().afdrukken(null, "rapport");
toets('afdrukken(null, "rapport"): het hele rapport', { bezig: true, selectie: null, soort: "rapport" });

vanaf({ soort: "rapport" }).afdrukken(["ex-1"], "bladen");
toets('afdrukken([id], "bladen") na een rapport: één blad', { bezig: true, selectie: ["ex-1"], soort: "bladen" });

vanaf({ voorbeeld: true, soort: "rapport" }).afdrukken();
toets("afdrukken() laat soort en selectie staan (knop in het voorbeeld)", {
  bezig: true, voorbeeld: true, selectie: null, soort: "rapport",
});

vanaf({ selectie: ["ex-2"] }).afdrukken(["ex-3"]);
toets("afdrukken([id]) zonder soort laat de soort staan", { bezig: true, selectie: ["ex-3"], soort: "bladen" });

vanaf({ bezig: true, soort: "rapport" }).klaar();
toets("klaar() zet alleen bezig uit", { bezig: false, soort: "rapport" });

// ── voorbeeld ────────────────────────────────────────────────────────────────
vanaf().toonVoorbeeld(null, "rapport");
toets('toonVoorbeeld(null, "rapport"): het rapportvoorbeeld', {
  voorbeeld: true, bezig: false, selectie: null, soort: "rapport",
});

vanaf({ soort: "rapport" }).toonVoorbeeld(["ex-1"], "bladen");
toets('toonVoorbeeld([id], "bladen"): het voorbeeld van één blad', {
  voorbeeld: true, selectie: ["ex-1"], soort: "bladen",
});

vanaf({ soort: "rapport" }).toonVoorbeeld();
toets("toonVoorbeeld() laat soort en selectie staan", { voorbeeld: true, selectie: null, soort: "rapport" });

vanaf({ voorbeeld: true, soort: "rapport" }).sluitVoorbeeld();
toets("sluitVoorbeeld() laat de soort staan", { voorbeeld: false, soort: "rapport" });

vanaf({ soort: "rapport" }).kiesSelectie(["ex-4"]);
toets("kiesSelectie() raakt de soort niet", { selectie: ["ex-4"], soort: "rapport" });

console.log(
  fouten
    ? `\nAfdrukstore: ${fouten} fout(en).`
    : "\nAfdrukstore: soort en selectie reizen mee zoals bedoeld.",
);
process.exit(fouten ? 1 : 0);
