import type { ReactNode } from "react";
import {
  belastingfactorTabel,
  beta,
  fmt,
  getal,
  inspectieniveau,
  klasse,
  levensduurklasse,
  normVoorBouwjaar,
  ontwerpSupervisie,
} from "../../../rapport/normwaarden";
import { kFiVoor } from "../../../store/projectGegevens";
import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Eenheid, Index, Leeg, Rij, Tekst } from "./raster";

/*
 * Hoofdstuk 4, Uitgangspunten.
 *
 * De inhoud springt één kolom in (het vlak `rpa-in` eromheen), dus kolom 1
 * hier is kolom 2 van het vel. Kolommen en lijnen volgen de referentie-PDF.
 * Wat de gebruiker zelf invult staat in de invoerkleur; wat uit een tabel of
 * formule volgt in zwart.
 */

/** Label over drie kolommen, de waarde in de vierde, een lijn onder beide; rechts eventueel de norm. */
function Veld({ label, waarde, norm, invoer }: {
  label: ReactNode; waarde: ReactNode; norm?: string; invoer?: boolean;
}) {
  return (
    <Rij>
      <Cel k={1} n={3} o>{label}</Cel>
      <Cel k={4} o klasse={invoer ? "rpa-invoer" : undefined}>{waarde}</Cel>
      {norm && <Cel k={8} n={2} klasse="rpa-norm">{norm}</Cel>}
    </Rij>
  );
}

/**
 * 4.1 Constructieve uitgangspunten bouwwerk. CC, RC en de ontwerplevensduur
 * komen uit de projectgegevens; β, K_FI, supervisie en inspectie volgen daaruit.
 */
export function Bouwwerk({ w }: { w: RapportWeergave }) {
  const cc = klasse(w.gegevens.CC, 2);
  const rc = klasse(w.gegevens.RC, 2);
  const jaren = getal(w.gegevens.DesignLife);
  const levensduur = Number.isFinite(jaren) ? jaren : 50;
  return (
    <>
      <Veld label="Soort bouwwerk" waarde={w.rapport.uitgangspunten.soortBouwwerk} invoer />
      <Veld label="Constructiegevolgklasse" waarde={`CC${cc}`} invoer />
      <Veld label="Betrouwbaarheidsklasse" waarde={`RC${rc}`} />
      <Veld label="Ontwerplevensduurklasse" waarde={String(levensduurklasse(levensduur))} />
      <Veld label="Ontwerplevensduur (t)" waarde={fmt(levensduur, 0)} norm="tabel NB.1–2.1" />
      <Veld label="β" waarde={fmt(beta(rc), 1)} norm="tabel B2" />
      <Veld label={<>K<sub>FI</sub></>} waarde={fmt(kFiVoor(cc), 2)} norm="tabel B3" />
      <Veld label="Ontwerp- en berekeningssupervisie" waarde={ontwerpSupervisie(rc)} norm="tabel B4" />
      <Veld label="Inspectie tijdens uitvoering" waarde={inspectieniveau(rc)} norm="tabel B5" />
    </>
  );
}

/** 4.2 Bouwconstructies bij brand: drie eisen in minuten; "-" is geen eis. De verwijzing rechts naast de eerste. */
export function Brand({ w }: { w: RapportWeergave }) {
  const b = w.rapport.uitgangspunten.brand;
  const eisen: [string, string][] = [
    ["Brandwerendheidseis hoofddraagconstructie", b.hoofddraagconstructie],
    ["Brandwerendheidseis brandscheiding", b.brandscheiding],
    ["Brandwerendheidseis vluchtroute", b.vluchtroute],
  ];
  return (
    <>
      {eisen.map(([label, waarde], i) => (
        <Rij key={label}>
          <Cel k={1} n={4} o>{label}</Cel>
          <Cel k={5} o>{waarde.trim() || "-"}</Cel>
          <Cel k={6} o><Eenheid e="min" /></Cel>
          {i === 0 && b.verwijzing.trim() && <Cel k={8} n={2} klasse="rpa-norm">{b.verwijzing}</Cel>}
        </Rij>
      ))}
    </>
  );
}

/**
 * Waar de tabel bevestigingsmiddelen begint: naast de derde materiaalregel,
 * zoals in de referentie. Hij heeft geen eigen kopregel.
 */
const BEVESTIGING_VANAF = 2;

/** 4.3 Toegepaste materialen, met rechts ernaast de bevestigingsmiddelen en onder de tabel de noot. */
export function Materialen({ w }: { w: RapportWeergave }) {
  const u = w.rapport.uitgangspunten;
  const aantal = Math.max(u.materialen.length, BEVESTIGING_VANAF + u.bevestiging.length);
  return (
    <>
      <Rij houd>
        <Cel k={1} n={2} b o l klasse="rpa-kop-donker">Materiaaltype</Cel>
        <Cel k={3} b o l r klasse="rpa-kop-donker rpa-midden">Soort</Cel>
      </Rij>
      {Array.from({ length: aantal }, (_, i) => {
        const m = u.materialen[i];
        const f = u.bevestiging[i - BEVESTIGING_VANAF];
        const eerste = i === BEVESTIGING_VANAF;
        return (
          <Rij key={i}>
            {m && (
              <>
                <Cel k={1} n={2} o l>{m.type}</Cel>
                <Cel k={3} o l r klasse="rpa-midden">{m.soort}</Cel>
                <Cel k={4} n={2}>{m.opmerking}</Cel>
              </>
            )}
            {f && (
              <>
                <Cel k={6} n={2} b={eerste} o l klasse="rpa-midden">{f.type}</Cel>
                <Cel k={8} b={eerste} o l r klasse="rpa-midden">{f.kwaliteit}</Cel>
              </>
            )}
          </Rij>
        );
      })}
      {u.materialenNoot.trim() && (
        <Rij>
          <Cel k={1} n={6}>{u.materialenNoot}</Cel>
        </Rij>
      )}
    </>
  );
}

/** 4.4 Conservering staalconstructie: onderdeel en systeem, en de slotzin met een lijn eronder. */
export function Conservering({ w }: { w: RapportWeergave }) {
  const u = w.rapport.uitgangspunten;
  return (
    <>
      {u.conservering.map((c, i) => (
        <Rij key={i}>
          <Cel k={1} n={2} o>{c.onderdeel}</Cel>
          <Cel k={3} n={3} o>{c.systeem}</Cel>
        </Rij>
      ))}
      {u.conserveringSlot.trim() && (
        <>
          <Leeg />
          <Rij>
            <Cel k={1} n={7} o>{u.conserveringSlot}</Cel>
          </Rij>
        </>
      )}
    </>
  );
}

/**
 * 4.5 Belastingfactoren en belastingcombinaties bij de gevolgklasse van het
 * project. Opeenvolgende regels "niet van toepassing" delen één vak, zonder
 * lijn ertussen, zoals in de referentie.
 */
export function Factoren({ w }: { w: RapportWeergave }) {
  const rijen = belastingfactorTabel(klasse(w.gegevens.CC, 2));
  return (
    <>
      <Rij houd>
        <Cel k={1} b o l klasse="rpa-kop-donker">Groep</Cel>
        <Cel k={2} n={2} b o klasse="rpa-kop-donker">Naam</Cel>
        <Cel k={4} b o klasse="rpa-kop-donker rpa-midden">γ<sub>Gkj;inf</sub></Cel>
        <Cel k={5} b o klasse="rpa-kop-donker rpa-midden">γ<sub>Gkj;sup</sub></Cel>
        <Cel k={6} b o klasse="rpa-kop-donker rpa-midden">γ<sub>Q;1</sub></Cel>
        <Cel k={7} b o r klasse="rpa-kop-donker rpa-midden">γ<sub>Q;2</sub></Cel>
      </Rij>
      <Rij klasse="rpa-cursief" houd>
        <Cel k={1} n={3} o />
        <Cel k={4} o klasse="rpa-midden">gunstig</Cel>
        <Cel k={5} o klasse="rpa-midden">ongunstig</Cel>
        <Cel k={6} o klasse="rpa-midden">overheers.</Cel>
        <Cel k={7} o klasse="rpa-midden">overige</Cel>
      </Rij>
      {rijen.map((r, i) => {
        const volgendeNvt = rijen[i + 1]?.cellen === null;
        return (
          <Rij key={i}>
            <Cel k={1} o l>{r.groep}</Cel>
            <Cel k={2} n={2} o l klasse="rpa-tt">{r.naam}</Cel>
            {r.cellen ? (
              r.cellen.map((c, j) => (
                <Cel key={j} k={4 + j} o l r={j === 3} klasse="rpa-midden"><Index t={c} /></Cel>
              ))
            ) : (
              <Cel k={4} n={4} o={!volgendeNvt} l r>niet van toepassing</Cel>
            )}
            {r.opmerking && <Cel k={8} n={2}>{r.opmerking}</Cel>}
          </Rij>
        );
      })}
    </>
  );
}

/** 4.6 Bestaande situatie: bouwjaar en bron, de norm die bij dat bouwjaar hoort, en wat er beschikbaar is. */
export function Bestaand({ w }: { w: RapportWeergave }) {
  const b = w.rapport.uitgangspunten.bestaand;
  const jaar = getal(b.bouwjaar);
  const norm = Number.isFinite(jaar) ? normVoorBouwjaar(jaar) : "";
  return (
    <>
      <Rij>
        <Cel k={1} n={3} o>Bouwjaar bouwwerk</Cel>
        <Cel k={4} o klasse="rpa-invoer">{b.bouwjaar}</Cel>
        <Cel k={6} o>Bron</Cel>
        <Cel k={7} n={2} o klasse="rpa-invoer">{b.bron}</Cel>
      </Rij>
      <Rij>
        <Cel k={1} n={3} o>Norm</Cel>
        <Cel k={4} o>{norm}</Cel>
        <Cel k={7} n={2} o>afgeleid uit bouwjaar</Cel>
      </Rij>
      <Rij>
        <Cel k={1} n={3} o>Bestaande berekening beschikbaar</Cel>
        <Cel k={4} o klasse="rpa-invoer">{b.berekeningBeschikbaar}</Cel>
      </Rij>
      <Rij>
        <Cel k={1} n={3} o>Materiaalgegevens beschikbaar</Cel>
        <Cel k={4} o klasse="rpa-invoer">{b.materiaalgegevensBeschikbaar}</Cel>
      </Rij>
    </>
  );
}

/** 4.8 Vervormingen en horizontale verplaatsingen: de inleidende zin, dan de eisen per onderdeel. */
export function Vervormingen({ w }: { w: RapportWeergave }) {
  const inleiding = w.rapport.teksten.vervormingen ?? "";
  return (
    <>
      {inleiding.trim() && (
        <>
          <Tekst tekst={inleiding} invul={w.invul} />
          <Leeg />
        </>
      )}
      <Rij houd>
        <Cel k={1} n={3} b o l klasse="rpa-kop-licht">Onderdeel</Cel>
        {/* Leeg, zoals in de referentie. */}
        <Cel k={4} b o klasse="rpa-kop-licht" />
        <Cel k={5} b o klasse="rpa-kop-licht"><Index t="u_bij" /></Cel>
        <Cel k={6} b o r klasse="rpa-kop-licht"><Index t="u_hor" /></Cel>
      </Rij>
      {w.rapport.uitgangspunten.vervormingen.map((r, i) => (
        <Rij key={i}>
          <Cel k={1} n={3} o>{r.onderdeel}</Cel>
          <Cel k={4} o><Index t={r.ueind} /></Cel>
          <Cel k={5} o><Index t={r.ubij} /></Cel>
          <Cel k={6} o><Index t={r.uhor} /></Cel>
        </Rij>
      ))}
    </>
  );
}
