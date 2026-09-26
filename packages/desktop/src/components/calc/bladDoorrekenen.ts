import { parse, evaluate, render, defaultStyles } from "@ifc-calc/core";
import type { Exemplaar } from "../../store/projectStore";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import { leesResultaat, type Resultaat } from "./bladResultaat";

/*
 * Een rekenblad doorrekenen voor op papier.
 *
 * Staat los van PrintDocument omdat twee uitdraaien het nodig hebben: de losse
 * bladen (PrintDocument) en het constructierapport (components/rapport/afdruk).
 * Eén plek, zodat een blad in het rapport precies zo uitrekent als op zijn
 * eigen afdruk.
 */

let stijlenGeplaatst = false;

/** De opmaak van de rekenbladen staat in de core; die moet ook bij het printen mee. */
export function zorgVoorKernstijlen() {
  if (stijlenGeplaatst || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = defaultStyles;
  el.dataset.ifcCalc = "core-styles";
  document.head.appendChild(el);
  stijlenGeplaatst = true;
}

/** Een doorgerekend blad: de uitwerking als HTML en de uitkomst voor kop en samenvatting. */
export interface DoorgerekendBlad {
  html: string;
  resultaat: Resultaat;
}

/**
 * Rekent één blad door met de projectgegevens als scope.
 *
 * Een blad dat niet doorrekent houdt de rest van de uitdraai niet tegen: het
 * krijgt een rode regel met de fout, en de andere bladen komen gewoon op papier.
 */
export function rekenBladDoor(ex: Exemplaar, scope: Record<string, unknown>): DoorgerekendBlad {
  let html: string;
  let resultaat: Resultaat = { titel: ex.naam, norm: "", uc: null, voldoet: null };
  try {
    const opties = { includes: calcpadIncludes, imageUrls: calcpadImageUrls };
    const nodes = evaluate(parse(ex.source, opties), ex.waarden, scope);
    html = render(nodes);
    resultaat = leesResultaat(nodes, ex.naam);
  } catch (err) {
    html = `<p class="calc-text" style="color:#b91c1c">Dit blad kon niet worden doorgerekend: ${
      (err as Error).message
    }</p>`;
  }
  return { html, resultaat };
}
