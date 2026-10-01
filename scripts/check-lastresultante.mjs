/**
 * Onafhankelijke handcontrole voor de lastresultante. De factoren zijn
 * gebruikersinvoer; dit script toetst alleen evenwicht en tekenconventie.
 *
 * Set 1: referentielijn x=50 mm. Last 1 op -200 mm: G=20, Q=5 kN.
 * Last 2 op +300 mm: G=10, Q=0 kN. Dus ΣG=30, ΣQ=5 kN,
 * ΣM_G=20·(-250)+10·250=-2500 en ΣM_Q=5·(-250)=-1250 kNmm.
 * A: 1,2G+1,5Q geeft R=43,5 kN, M=-4875 kNmm en
 * x=50-4875/43,5=-62,06897 mm. B: G geeft x=-33,3333 mm.
 * Set 2: twee tegengestelde lasten van 10 kN op 0 en 100 mm
 * leveren R=0 maar M=-1000 kNmm: dan bestaat geen aangrijpingspunt.
 */
import { lastresultante } from "../packages/desktop/src/templates/lastresultante.ts";
import { reken, toets } from "./lib/refcheck.mjs";

const invoer = (v) => Object.fromEntries(Object.entries(v).map(([naam, waarde]) => [naam, String(waarde)]));
let fouten = 0;

const basis = {
  n_last: 2, a_lijn: 50,
  G_1: 20, Q_1: 5, a_1: -200,
  G_2: 10, Q_2: 0, a_2: 300,
  factor_GA: 1.2, factor_QA: 1.5,
  factor_GB: 1, factor_QB: 0,
};
fouten += toets("Twee lasten, twee combinaties", reken(lastresultante, invoer(basis)), {
  G_som: "30", Q_som: "5", M_G: "-2500", M_Q: "-1250",
  R_A: "43.5", M_A: "-4875", a_A: "-62.07",
  R_B: "30", M_B: "-2500", a_B: "-33.33",
});

const paar = reken(lastresultante, invoer({
  ...basis, a_lijn: 0, G_1: 10, Q_1: 0, a_1: 0,
  G_2: -10, a_2: 100,
  factor_GA: 1, factor_QA: 0,
  factor_GB: 0, factor_QB: 0,
}));
fouten += toets("Krachtenpaar zonder resultante", paar, {
  R_A: "0", M_A: "-1000", R_B: "0", M_B: "0",
});
if ("a_A" in paar.values || "a_B" in paar.values || !paar.text.includes("geen eenduidig aangrijpingspunt")) {
  console.error("FOUT: een nulresultante mag geen aangrijpingspunt opleveren.");
  fouten++;
}

// Met twaalf rijen aan en maar één belaste rij blijft de som exact gelijk.
const twaalf = reken(lastresultante, invoer({ ...basis, n_last: 12 }));
fouten += toets("Twaalf zichtbare lastposities", twaalf, {
  G_som: "30", Q_som: "5", R_A: "43.5", M_A: "-4875",
});
if (!twaalf.text.includes("blijvende last 12")) {
  console.error("FOUT: de twaalfde invoerrij wordt niet getoond.");
  fouten++;
}

// Elk keuzepunt moet precies zijn eigen laatste rij activeren. Alleen die rij
// draagt 7 kN op +40 mm, zodat R=7 kN en M=280 kNmm verwacht worden.
for (let aantal = 1; aantal <= 12; aantal++) {
  const laatste = reken(lastresultante, invoer({
    n_last: aantal, a_lijn: 0,
    [`G_${aantal}`]: 7, [`Q_${aantal}`]: 0, [`a_${aantal}`]: 40,
    factor_GA: 1, factor_QA: 0, factor_GB: 0, factor_QB: 0,
  }));
  const klopt = laatste.values.R_A === 7 && laatste.values.M_A === 280 && laatste.values.a_A === 40
    && laatste.text.includes(`blijvende last ${aantal}`)
    && !laatste.text.includes(`blijvende last ${aantal + 1}`);
  if (!klopt) {
    console.error(`FOUT: bij ${aantal} last(en) is de laatste rij of uitkomst onjuist.`);
    fouten++;
  }
}

console.log(fouten ? `\n${fouten} fout(en).` : "\nLastresultante: handcontroles geslaagd.");
process.exitCode = fouten ? 1 : 0;
