/**
 * Eenheidsweergave van inverse temperaturen. De rekenwaarde was goed, maar
 * de terugval naar de automatisch gekozen voorvoegsels kon 10 1/K tonen.
 *
 * Handberekening: α = 10⁻⁵ K⁻¹ en ΔT = 20 K geven rek
 * ε = α·ΔT = 2·10⁻⁴ (zonder eenheid). Hetzelfde geldt per graad Celsius
 * voor een temperatuurverschil van 20 °C.
 */
import { parse, evaluate } from "../packages/core/dist/index.js";

for (const eenheid of ["K", "degC"]) {
  const nodes = evaluate(parse(`alpha = 1e-5 / ${eenheid}\ndelta = 20 ${eenheid}\nrek = alpha * delta`));
  const alpha = nodes.find((n) => n.type === "assignment" && n.name === "alpha");
  const rek = nodes.find((n) => n.type === "assignment" && n.name === "rek");
  if (!alpha || !rek) throw new Error(`Berekening ontbreekt bij ${eenheid}`);
  const waarde = Number.parseFloat(alpha.result);
  const rekWaarde = Number.parseFloat(rek.result);
  if (Math.abs(waarde - 1e-5) > 1e-12 || alpha.unit !== `1 / ${eenheid}`) {
    throw new Error(`Onjuiste uitwerking voor 1/${eenheid}: ${alpha.result}`);
  }
  if (Math.abs(rekWaarde - 2e-4) > 1e-12 || rek.unit !== "") {
    throw new Error(`Onjuiste dimensieloze rek bij ${eenheid}: ${rek.result}`);
  }
}
console.log("Inverse temperatuureenheden en dimensieloze rek: akkoord.");
