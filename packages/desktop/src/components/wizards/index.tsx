/**
 * Wizard registry — koppelt wizardId aan WizardDefinition.
 *
 * Toevoegen van een wizard: maak `<Naam>Wizard.tsx`, exporteer
 * `WizardDefinition`, importeer hier en zet in `wizards`-record.
 */

import { useCallback } from "react";
import { useLoadCaseStore } from "../../store/loadCaseStore";
import type { WizardDefinition } from "./types";
import { spuwerWizard } from "./SpuwerWizard";

export const wizards: Record<string, WizardDefinition> = {
  [spuwerWizard.id]: spuwerWizard,
};

/**
 * Bridge tussen loadCaseStore (CalcPAD-prompt-storage) en wizard-inputs.
 * Wizard-keys worden geprefixt met `wzd.<wizardId>.` zodat ze niet botsen
 * met CalcPAD prompt-variable-namen.
 */
export function useWizardValues(wizardId: string, defaults: Record<string, number>) {
  const activeId = useLoadCaseStore((s) => s.activeId);
  const valuesByCase = useLoadCaseStore((s) => s.valuesByCase);
  const setActiveValue = useLoadCaseStore((s) => s.setActiveValue);
  const raw = valuesByCase[activeId] ?? {};

  const prefix = `wzd.${wizardId}.`;

  // Strip prefix + parse to numbers
  const values: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith(prefix)) {
      const num = parseFloat(String(v));
      if (Number.isFinite(num)) values[k.slice(prefix.length)] = num;
    }
  }
  // Fill defaults
  for (const [k, dv] of Object.entries(defaults)) {
    if (values[k] === undefined) values[k] = dv;
  }

  const setValue = useCallback(
    (name: string, value: number) => {
      setActiveValue(prefix + name, String(value));
    },
    [setActiveValue, prefix],
  );

  return { values, setValue };
}

export function WizardHost({ wizardId }: { wizardId: string }) {
  const def = wizards[wizardId];
  if (!def) {
    return (
      <div style={{ padding: 20, color: "#dc2626" }}>
        Onbekende wizard: <code>{wizardId}</code>
      </div>
    );
  }
  const defaults = Object.fromEntries(def.inputs.map((i) => [i.name, i.default]));
  return <WizardWithValues definition={def} defaults={defaults} />;
}

function WizardWithValues({
  definition,
  defaults,
}: {
  definition: WizardDefinition;
  defaults: Record<string, number>;
}) {
  const { values, setValue } = useWizardValues(definition.id, defaults);
  const Component = definition.Component;
  return <Component values={values} setValue={setValue} />;
}
