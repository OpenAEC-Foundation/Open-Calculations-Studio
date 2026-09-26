import type { Knoop } from "../../../rapport/opzet";
import { vindKnoop } from "./hulp";
import TekstVeld, { Invulvelden } from "./TekstVeld";
import { Kop, Sectie, Veld, useRapport } from "./velden";

/**
 * De hoofdstukken die alleen uit tekst bestaan (plus de rol in 2.2). Voor
 * Uitgangspunten, Belastingen en Berekeningen heeft het paneel een eigen
 * sectie.
 */
const HOOFDSTUKKEN = ["inleiding", "projectgegevens", "constructie"];

/** Suggesties voor de rol in 2.2; eigen tekst kan altijd. */
const ROLLEN = ["Hoofdconstructeur", "Constructeur", "Constructief adviseur", "Controlerend constructeur"];

/**
 * Sectie Hoofdstukken 1 t/m 3: per tekstonderdeel uit de opzet een tekstvak
 * met standaardteksten, in de volgorde en met de koppen van het rapport.
 */
export default function HoofdstukTeksten() {
  return (
    <Sectie
      id="teksten"
      titel="Hoofdstukken 1 t/m 3"
      intro="Per onderdeel een tekst. Standaardtekst ▾ kiest een meegeleverde of eigen variant. Een optioneel blok dat leeg blijft, valt weg uit het rapport."
    >
      {HOOFDSTUKKEN.map((id) => {
        const knoop = vindKnoop(id);
        return knoop ? <KnoopInvoer key={id} knoop={knoop} /> : null;
      })}
      <Invulvelden />
    </Sectie>
  );
}

/** Eén knoop uit de opzet met zijn invoer; zonder eigen inhoud de kop met de kinderen eronder. */
function KnoopInvoer({ knoop }: { knoop: Knoop }) {
  const klasse = `rapport-knoop rapport-niveau-${knoop.niveau}`;
  if (knoop.inhoud === "tekst") {
    return (
      <div className={klasse}>
        <TekstVeld
          id={knoop.id}
          kop={<Kop id={knoop.id} />}
          placeholder={knoop.optioneel ? "Leeg laten: dan valt dit onderdeel weg." : undefined}
        />
      </div>
    );
  }
  if (knoop.inhoud === "rol") {
    return (
      <div className={klasse}>
        <TekstVeld
          id={knoop.id}
          kop={<Kop id={knoop.id} />}
          hint="De openingszin van de paragraaf; de drie gegevens hieronder staan er als tabel onder."
        />
        <RolVelden />
      </div>
    );
  }
  return (
    <div className={klasse}>
      <Kop id={knoop.id} />
      {knoop.kinderen?.map((k) => <KnoopInvoer key={k.id} knoop={k} />)}
    </div>
  );
}

/** 2.2: rol, bouwkundig adviseur of architect, datum van de bouwkundige onderlegger. */
function RolVelden() {
  const rol = useRapport().rol;
  return (
    <div className="rapport-rij">
      <Veld label="Rol" pad="rol.rol" waarde={rol.rol} lijst="rapport-rollen" />
      <Veld label="Bouwkundig adviseur / architect" pad="rol.architect" waarde={rol.architect} />
      <Veld
        label="Datum bouwkundige onderlegger"
        pad="rol.datumOnderlegger"
        waarde={rol.datumOnderlegger}
        placeholder="dd-mm-jjjj"
      />
      <datalist id="rapport-rollen">
        {ROLLEN.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}
