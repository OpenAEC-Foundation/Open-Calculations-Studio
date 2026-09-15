/**
 * Wizard sheets — grafische rekensheets met een drie-kolomslayout:
 *   • Links: parametrische inputs (label + value + unit)
 *   • Midden: live-bijgewerkte SVG-tekening
 *   • Rechts: berekening + formules (KaTeX) + unity check
 *
 * Elke wizard staat in `wizards/<id>/<Id>Wizard.tsx` en exporteert een
 * `WizardDefinition` die centraal geregistreerd wordt in
 * `wizards/index.tsx`. Inputs worden gepersisteerd in loadCaseStore onder
 * key `wizard.<wizardId>.<inputName>` zodat ze net als CalcPAD-prompts
 * meeschakelen met load-cases.
 */

import type { ComponentType } from "react";

export interface WizardInputSpec {
  /** Variable name (a-zA-Z0-9_) — used als sleutel voor persistentie. */
  name: string;
  /** Label dat aan de gebruiker getoond wordt (NL). */
  label: string;
  /** Eenheid label (`m2`, `mm`, …). Alleen visueel, geen unit-omrekening. */
  unit?: string;
  /** Default-waarde bij eerste laden. */
  default: number;
  /** Optionele step voor de input (default 1). */
  step?: number;
  /** Min/max voor validatie. */
  min?: number;
  max?: number;
  /** Korte hint, getoond als tooltip. */
  hint?: string;
}

export interface WizardProps {
  /** Huidige inputwaarden (genormaliseerd op naam). */
  values: Record<string, number>;
  /** Update one input value. */
  setValue: (name: string, value: number) => void;
}

export interface WizardDefinition {
  /** Stabiele ID — gebruikt in projectStore.wizardId en localStorage. */
  id: string;
  /** Tekst voor sheet-label + library. */
  label: string;
  /** Korte beschrijving voor tooltips. */
  description: string;
  /** Pictogram voor in de sheet-row en het menu. */
  icon: string;
  /** Input-specs voor de defaults + reset. */
  inputs: WizardInputSpec[];
  /** De React-component die de wizard-UI render. */
  Component: ComponentType<WizardProps>;
}
