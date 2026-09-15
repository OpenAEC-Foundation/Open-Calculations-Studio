import type { ReactElement } from "react";

import BalklaagDesigner from "./BalklaagDesigner";
import BetondoorsnedeDesigner from "./BetondoorsnedeDesigner";
import BetonkolomDesigner from "./BetonkolomDesigner";
import BoutDesigner from "./BoutDesigner";
import BrandwerendheidDesigner from "./BrandwerendheidDesigner";
import DwarskrachtDesigner from "./DwarskrachtDesigner";
import GordingDesigner from "./GordingDesigner";
import KolomDesigner from "./KolomDesigner";
import KruipfactorDesigner from "./KruipfactorDesigner";
import LasDesigner from "./LasDesigner";
import MetselwerkwandDesigner from "./MetselwerkwandDesigner";
import MomentverbindingDesigner from "./MomentverbindingDesigner";
import OplegMetselwerkDesigner from "./OplegMetselwerkDesigner";
import PenDesigner from "./PenDesigner";
import PonsDesigner from "./PonsDesigner";
import SchijfwerkingDesigner from "./SchijfwerkingDesigner";
import SchoorDesigner from "./SchoorDesigner";
import SpuwerDesigner from "./SpuwerDesigner";
import StalenKolomDesigner from "./StalenKolomDesigner";
import TweepaalsPoerDesigner from "./TweepaalsPoerDesigner";
import VerankeringslengteDesigner from "./VerankeringslengteDesigner";
import VoetplaatDesigner from "./VoetplaatDesigner";

/**
 * Welk parametrisch beeld hoort bij een rekenblad.
 *
 * De koppeling loopt via een herkenningspunt in de tekst van het blad, niet via
 * het sjabloon-id: pas je de tekst van een exemplaar aan, dan blijft het beeld
 * meegaan zolang de kop erin staat.
 *
 * Stond eerder als keten in App.tsx. Nu op één plek, omdat de afdrukweergave
 * dezelfde keuze moet maken — voor elk blad in het project, niet alleen voor
 * het blad dat openstaat.
 */
const DESIGNERS: { marker: string; beeld: () => ReactElement }[] = [
  { marker: "Voetplaatverbinding", beeld: () => <VoetplaatDesigner /> },
  { marker: "Balklaag", beeld: () => <BalklaagDesigner /> },
  { marker: "Spuwer", beeld: () => <SpuwerDesigner /> },
  { marker: "Kruipfactor", beeld: () => <KruipfactorDesigner /> },
  { marker: "Dragende metselwerkwand", beeld: () => <MetselwerkwandDesigner /> },
  { marker: "Oplegging op metselwerk", beeld: () => <OplegMetselwerkDesigner /> },
  { marker: "Schijfwerking", beeld: () => <SchijfwerkingDesigner /> },
  { marker: "Gording", beeld: () => <GordingDesigner /> },
  { marker: "Houten kolom", beeld: () => <KolomDesigner /> },
  { marker: "Boutberekening", beeld: () => <BoutDesigner /> },
  { marker: "Lasberekening", beeld: () => <LasDesigner /> },
  { marker: "Schoorverbinding", beeld: () => <SchoorDesigner /> },
  { marker: "Penverbinding", beeld: () => <PenDesigner /> },
  { marker: "Stalen kolom", beeld: () => <StalenKolomDesigner /> },
  { marker: "Brandwerendheid", beeld: () => <BrandwerendheidDesigner /> },
  { marker: "Momentverbinding", beeld: () => <MomentverbindingDesigner /> },
  { marker: "Dwarskrachtverbinding", beeld: () => <DwarskrachtDesigner /> },
  { marker: "Betondoorsnede", beeld: () => <BetondoorsnedeDesigner /> },
  { marker: "Betonkolom", beeld: () => <BetonkolomDesigner /> },
  { marker: "Ponsberekening", beeld: () => <PonsDesigner /> },
  { marker: "Tweepaals poer", beeld: () => <TweepaalsPoerDesigner /> },
  { marker: "Verankeringslengte", beeld: () => <VerankeringslengteDesigner /> },
];

/** Het beeld dat bij deze bladtekst hoort, of null als er geen is. */
export function designerVoor(source: string): ReactElement | null {
  const treffer = DESIGNERS.find((d) => source.includes(d.marker));
  return treffer ? treffer.beeld() : null;
}

/** Heeft dit blad een parametrisch beeld? */
export function heeftDesigner(source: string): boolean {
  return DESIGNERS.some((d) => source.includes(d.marker));
}
