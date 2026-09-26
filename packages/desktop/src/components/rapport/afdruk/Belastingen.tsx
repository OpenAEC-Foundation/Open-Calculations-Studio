import { Fragment, type ReactNode } from "react";
import type { Belastingklasse, Opbouw } from "../../../rapport/model";
import {
  categorie,
  dakQk,
  fmt,
  getal,
  klasse,
  PSI_WIND,
  sneeuwPlatDak,
  windLabel,
  windQp,
} from "../../../rapport/normwaarden";
import { gevelOpbouw, vlakOpbouw, vullingTekst } from "../../../rapport/opbouw";
import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Eenheid, Leeg, Rij, Tekst, Vlak } from "./raster";

/*
 * Hoofdstuk 5, Belastingen. Kolom 1 is kolom 2 van het vel (de inhoud springt
 * in); kolommen en lijnen volgen de referentie-PDF. Tekst in de tabellen
 * staat in de tabeltekstkleur, ingevulde waarden in de invoerkleur.
 */

/** Een berekend getal, of niets als er (nog) niets te berekenen valt. */
const getalTekst = (v: number, dec: number) => (Number.isFinite(v) ? fmt(v, dec) : "");

/** 5.1 Sneeuw op een plat dak, s = μ1·Ce·Ct·sk; de tekst eronder. */
export function Sneeuw({ w }: { w: RapportWeergave }) {
  const tekst = w.rapport.teksten.sneeuw ?? "";
  return (
    <>
      <Rij>
        <Cel k={1} o>plat dak</Cel>
        <Cel k={2} o>{fmt(sneeuwPlatDak(), 2)}</Cel>
        <Cel k={3} o><Eenheid e="kN/m2" /></Cel>
      </Rij>
      {tekst.trim() && (
        <>
          <Leeg />
          <Tekst tekst={tekst} invul={w.invul} />
        </>
      )}
    </>
  );
}

/**
 * 5.2 Windbelastingen. Links het gebied, de hoogte en q_p (dezelfde keten als
 * de gordingmodule); rechts per coëfficiënt P_rep = c · q_p en daaronder de
 * ψ-factoren voor wind. Zonder gebouwhoogte geen q_p en geen P_rep.
 */
export function Wind({ w }: { w: RapportWeergave }) {
  const { wind } = w.rapport.belastingen;
  const wg = klasse(w.gegevens.windgebied, 2);
  const tc = klasse(w.gegevens.terreincategorie, 2);
  const z = getal(wind.gebouwhoogte);
  const geldig = Number.isFinite(z) && z > 0;
  // z₀, z_min en v_b,0 hangen niet van de hoogte af; q_p wel.
  const u = windQp(wg, tc, geldig ? z : 0);
  const qp = geldig ? u.qp : NaN;

  const links: ReactNode[] = [
    <Cel k={1} n={2}>Windgebied &amp;</Cel>,
    <>
      <Cel k={1} n={2} o>Terreincategorie</Cel>
      <Cel k={3} n={2} o>{windLabel(wg, tc)}</Cel>
    </>,
    <>
      <Cel k={1} n={2} o>Gebouwhoogte</Cel>
      <Cel k={3} o>{wind.gebouwhoogte}</Cel>
      <Cel k={4} o><Eenheid e="m" /></Cel>
    </>,
    <>
      <Cel k={2} o>z<sub>0</sub></Cel>
      <Cel k={3} o>{fmt(u.z0, 3, true)}</Cel>
      <Cel k={4} o />
    </>,
    <>
      <Cel k={2} o>z<sub>min</sub></Cel>
      <Cel k={3} o>{fmt(u.zmin, 0)}</Cel>
      <Cel k={4} o />
    </>,
    <>
      <Cel k={2} o>c<sub>s</sub>*c<sub>d</sub></Cel>
      <Cel k={3} o>{wind.cscd}</Cel>
      <Cel k={4} o />
    </>,
    <>
      <Cel k={2} o>q<sub>p</sub></Cel>
      <Cel k={3} o>{getalTekst(qp, 2)}</Cel>
      <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
    </>,
    <>
      <Cel k={2} o>v<sub>b,0</sub></Cel>
      <Cel k={3} o>{fmt(u.vb0, 1)}</Cel>
    </>,
  ];

  const rechts: ReactNode[] = [];
  rechts[0] = (
    <>
      <Cel k={6} o klasse="rpa-vet">c</Cel>
      <Cel k={7} o klasse="rpa-vet">P<sub>rep</sub></Cel>
    </>
  );
  wind.coefficienten.forEach((c, i) => {
    rechts[1 + i] = (
      <>
        <Cel k={6} o>{c.c}</Cel>
        <Cel k={7} o>{getalTekst(getal(c.c) * qp, 2)}</Cel>
        <Cel k={8} o><Eenheid e="kN/m2" /></Cel>
        {c.omschrijving && <Cel k={9}>{c.omschrijving}</Cel>}
      </>
    );
  });
  // Eén lege regel tussen de coëfficiënten en de ψ-factoren.
  const psiVanaf = wind.coefficienten.length + 2;
  PSI_WIND.forEach((psi, i) => {
    rechts[psiVanaf + i] = (
      <>
        <Cel k={6} o>ψ<sub>{i}</sub></Cel>
        <Cel k={7} o>{fmt(psi, 1)}</Cel>
      </>
    );
  });

  const aantal = Math.max(links.length, rechts.length);
  return (
    <>
      {Array.from({ length: aantal }, (_, i) => (
        <Rij key={i} klasse="rpa-tt">
          {links[i]}
          {rechts[i]}
        </Rij>
      ))}
    </>
  );
}

/**
 * Eén belastingklasse van 5.4: vloer of dak, met rechts de ψ-factoren. Boven
 * de eerste klasse staat de normverwijzing, in de lege regel onder de kop.
 */
function KlasseRijen({ bk, eerste }: { bk: Belastingklasse; eerste: boolean }) {
  const cat = categorie(bk.categorie);
  const rijen: ReactNode[] = [
    <>
      <Cel k={1} n={2} o>Belastingklasse</Cel>
      <Cel k={3} n={3} o klasse="rpa-invoer">{cat?.label ?? bk.categorie}</Cel>
    </>,
  ];
  if (!cat || cat.soort === "vloer") {
    rijen.push(
      <>
        <Cel k={1} n={2} o>Algemeen q<sub>k</sub></Cel>
        <Cel k={3} o klasse="rpa-invoer">{cat ? fmt(cat.qk, 2) : ""}</Cel>
        <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
      </>,
    );
    if (bk.lichteScheidingswanden.trim()) {
      const ls = getal(bk.lichteScheidingswanden);
      rijen.push(
        <>
          <Cel k={1} n={2} o>L.S.</Cel>
          <Cel k={3} o klasse="rpa-invoer">{bk.lichteScheidingswanden}</Cel>
          <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
        </>,
        <>
          <Cel k={1} n={2} o>Algemeen q<sub>k</sub>+L.S.</Cel>
          <Cel k={3} o>{cat ? getalTekst(cat.qk + ls, 2) : ""}</Cel>
          <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
        </>,
      );
    }
    rijen.push(
      <>
        <Cel k={1} n={2} o>Algemeen Q<sub>k</sub></Cel>
        <Cel k={3} o klasse="rpa-invoer">{cat ? fmt(cat.Qk, 2) : ""}</Cel>
        <Cel k={4} o><Eenheid e="kN" /></Cel>
      </>,
    );
  } else {
    const alfa = getal(bk.dakhelling);
    rijen.push(
      <>
        <Cel k={1} n={2} o>Dak plat q<sub>k</sub></Cel>
        <Cel k={3} o klasse="rpa-invoer">{fmt(cat.qk, 1)}</Cel>
        <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
      </>,
      <>
        <Cel k={1} n={2} o>Dak plat Q<sub>k</sub></Cel>
        <Cel k={3} o klasse="rpa-invoer">{fmt(cat.Qk, 1)}</Cel>
        <Cel k={4} o><Eenheid e="kN" /></Cel>
      </>,
      <>
        <Cel k={1} n={2} o>Dak schuin</Cel>
        <Cel k={3} o>{Number.isFinite(alfa) ? fmt(dakQk(alfa), 1) : ""}</Cel>
        <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
      </>,
      <>
        <Cel k={1} n={2} o>Dak q-last</Cel>
        <Cel k={3} o>{bk.qlast}</Cel>
        <Cel k={4} o><Eenheid e="kN/m1" /></Cel>
      </>,
      <>
        <Cel k={1} n={2} o>α</Cel>
        <Cel k={3} o klasse="rpa-invoer">{bk.dakhelling}</Cel>
        <Cel k={4} o>°</Cel>
      </>,
    );
  }
  return (
    <>
      {!eerste && <Leeg />}
      {rijen.map((inhoud, i) => (
        <Rij key={i} klasse={i === 0 && eerste ? "rpa-tt rpa-draagt" : "rpa-tt"}>
          {inhoud}
          {cat && i < 3 && (
            <>
              <Cel k={8} o>ψ<sub>{i}</sub></Cel>
              <Cel k={9} o>{fmt(cat.psi[i], 1)}</Cel>
            </>
          )}
          {i === 0 && eerste && <span className="rpa-boven rpa-norm">6.3.1.2 NEN-EN 1991-1-1</span>}
        </Rij>
      ))}
    </>
  );
}

/** 5.4 Overige veranderlijke belastingen: de belastingklassen onder elkaar, met een lege regel ertussen. */
export function Veranderlijk({ w }: { w: RapportWeergave }) {
  return (
    <>
      {w.rapport.belastingen.klassen.map((bk, i) => (
        <KlasseRijen key={i} bk={bk} eerste={i === 0} />
      ))}
    </>
  );
}

/**
 * Een vlakopbouw: per laag d × ρ, of de ingevulde p; de som in kN/m². d, ρ en
 * een ingevulde p staan er zoals ze zijn ingevuld, een berekende p met twee
 * decimalen. Op de onderste laag het plusteken en de optellijn.
 */
function VlakTabel({ opbouw }: { opbouw: Extract<Opbouw, { soort: "vlak" }> }) {
  const { regels, som } = vlakOpbouw(opbouw.lagen);
  const laatste = opbouw.lagen.length - 1;
  return (
    <>
      <Rij klasse="rpa-vet" houd>
        <Cel k={1} n={2} b o l klasse="rpa-kop-licht">{opbouw.naam}</Cel>
        <Cel k={3} b o klasse="rpa-kop-licht">d<Eenheid e="m" /></Cel>
        <Cel k={4} b o klasse="rpa-kop-licht">ρ<Eenheid e="kN/m3" /></Cel>
        <Cel k={5} n={2} b o r klasse="rpa-kop-licht">p<sub>rep</sub></Cel>
      </Rij>
      {opbouw.lagen.map((laag, i) => {
        const onderste = i === laatste;
        const p = laag.p.trim() ? laag.p : fmt(regels[i]?.p ?? 0, 2);
        return (
          <Rij key={i}>
            <Cel k={1} n={2}>{laag.naam}</Cel>
            <Cel k={3}>{laag.d}</Cel>
            <Cel k={4}>{laag.rho}</Cel>
            <Cel k={5} o={onderste}>{p}</Cel>
            <Cel k={6} o={onderste}><Eenheid e="kN/m2" /></Cel>
            {onderste && <Cel k={7} o>+</Cel>}
          </Rij>
        );
      })}
      <Rij>
        <Cel k={5}>{fmt(som, 2)}</Cel>
        <Cel k={6}><Eenheid e="kN/m2" /></Cel>
      </Rij>
    </>
  );
}

/**
 * Een gevelopbouw: per laag q = p × h × vulling, de som in kN/m¹. p en h zoals
 * ingevuld, de vulling als percentage, q en de som met twee decimalen.
 */
function GevelTabel({ opbouw }: { opbouw: Extract<Opbouw, { soort: "gevel" }> }) {
  const { regels, som } = gevelOpbouw(opbouw.lagen);
  const laatste = opbouw.lagen.length - 1;
  return (
    <>
      <Rij klasse="rpa-vet" houd>
        <Cel k={1} b o l klasse="rpa-kop-licht">{opbouw.naam}</Cel>
        <Cel k={2} b o klasse="rpa-kop-licht">p<sub>rep</sub></Cel>
        <Cel k={3} b o klasse="rpa-kop-licht">h<Eenheid e="m" /></Cel>
        <Cel k={4} b o klasse="rpa-kop-licht">vulling</Cel>
        <Cel k={5} n={2} b o r klasse="rpa-kop-licht">q<sub>rep</sub></Cel>
      </Rij>
      {opbouw.lagen.map((laag, i) => {
        const onderste = i === laatste;
        const regel = regels[i];
        return (
          <Rij key={i}>
            <Cel k={1}>{laag.naam}</Cel>
            <Cel k={2} klasse="rpa-midden">{laag.p}</Cel>
            <Cel k={3}>{laag.h}</Cel>
            <Cel k={4}>{regel ? vullingTekst(regel.vulling) : laag.vulling}</Cel>
            <Cel k={5} o={onderste}>{regel ? fmt(regel.q, 2) : ""}</Cel>
            <Cel k={6} o={onderste}><Eenheid e="kN/m1" /></Cel>
            {onderste && <Cel k={7} o>+</Cel>}
          </Rij>
        );
      })}
      <Rij>
        <Cel k={5}>{fmt(som, 2)}</Cel>
        <Cel k={6}><Eenheid e="kN/m1" /></Cel>
      </Rij>
    </>
  );
}

/**
 * Een groep van 5.5 (VLOER, DAKEN of WANDEN): een donkere kop met een lijn
 * over de volle breedte erboven, dan de opbouwen met telkens een lege regel
 * ertussen. `direct`: de kop staat direct onder de paragraafkop en krijgt dan
 * geen extra lege regel boven zich.
 */
export function Groep({ titel, opbouwen, direct, inspringen }: {
  titel: string; opbouwen: Opbouw[]; direct: boolean; inspringen: 0 | 1;
}) {
  const tabellen = opbouwen.map((o, i) => (
    <Fragment key={i}>
      {i > 0 && <Leeg />}
      {o.soort === "vlak" ? <VlakTabel opbouw={o} /> : <GevelTabel opbouw={o} />}
    </Fragment>
  ));
  return (
    <>
      <Rij klasse={direct ? "rpa-groep rpa-direct" : "rpa-groep"} houd>
        <Cel k={1 + inspringen} n={2} klasse="rpa-kop-donker">{titel}</Cel>
      </Rij>
      {inspringen ? <Vlak klasse="rpa-in">{tabellen}</Vlak> : tabellen}
    </>
  );
}
