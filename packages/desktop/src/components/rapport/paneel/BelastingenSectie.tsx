import type { Belastingklasse, Windcoefficient } from "../../../rapport/model";
import {
  CATEGORIEEN,
  DAK_QK_DIRECT,
  PSI_WIND,
  SNEEUW,
  categorie,
  dakQk,
  fmt,
  getal,
  klasse,
  sneeuwPlatDak,
  windLabel,
  windQp,
} from "../../../rapport/normwaarden";
import { useProjectStore } from "../../../store/projectStore";
import { getalTekst, verplaatst } from "./hulp";
import OpbouwEditor from "./OpbouwEditor";
import RijenTabel, { type Kolom } from "./RijenTabel";
import TekstVeld from "./TekstVeld";
import { Afgeleid, Kop, Sectie, Veld, useRapport } from "./velden";

const WIND_KOLOMMEN: Kolom<Windcoefficient>[] = [
  { sleutel: "omschrijving", kop: "Omschrijving", placeholder: "bijv. gevel, druk" },
  { sleutel: "c", kop: "c", breedte: "6em", getal: true },
];

/** Codes uit de projectgegevens → hoe de norm ze noemt. */
const GEBIED = { 1: "I", 2: "II", 3: "III" } as const;
const TERREIN = { 1: "0 (zee of kust)", 2: "II (onbebouwd)", 3: "III (bebouwd)" } as const;

const PSI = <>ψ<sub>0</sub> / ψ<sub>1</sub> / ψ<sub>2</sub></>;

/** "0,4 / 0,5 / 0,3" */
function psiTekst(psi: readonly number[]): string {
  return psi.map((p) => fmt(p, 1, true)).join(" / ");
}

const NIEUWE_KLASSE: Belastingklasse = {
  categorie: "A-vloer",
  lichteScheidingswanden: "",
  dakhelling: "",
  qlast: "",
};

/**
 * Sectie Belastingen (hoofdstuk 5): sneeuw, wind, regenwater, de
 * belastingklassen en de opbouwen van de blijvende belasting. Normwaarden
 * volgen uit de projectgegevens en worden hier alleen getoond.
 */
export default function BelastingenSectie() {
  const b = useRapport().belastingen;
  const gegevens = useProjectStore((s) => s.gegevens);
  const werkBij = useProjectStore((s) => s.werkRapportBij);

  const wg = klasse(gegevens.windgebied, 2);
  const tc = klasse(gegevens.terreincategorie, 2);
  const h = getal(b.wind.gebouwhoogte);
  const hoogteBekend = Number.isFinite(h) && h > 0;
  // Zonder gebouwhoogte is er geen q_p, maar v_b,0, z_0 en z_min hangen
  // alleen van gebied en terrein af: die staan er dan al wel.
  const wind = windQp(wg, tc, hoogteBekend ? h : 0);
  const qp = hoogteBekend ? wind.qp : NaN;

  const wijzigKlassen = (fn: (lijst: Belastingklasse[]) => Belastingklasse[]) =>
    werkBij((r) => ({ ...r, belastingen: { ...r.belastingen, klassen: fn(r.belastingen.klassen) } }));

  return (
    <Sectie
      id="belastingen"
      titel="Belastingen"
      hoofdstuk="belastingen"
      intro="Grijze waarden volgen uit de projectgegevens en de norm. De opbouwen in 5.5 staan alleen in het rapport; ze werken (nog) niet door in de rekenbladen."
    >
      <div className="rapport-knoop">
        <Kop id="sneeuw" />
        <Afgeleid
          regels={[
            {
              label: "Plat dak",
              waarde: (
                <>
                  s = μ<sub>1</sub>·C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub> = {fmt(SNEEUW.mu1, 1)} ×{" "}
                  {fmt(SNEEUW.ce, 1)} × {fmt(SNEEUW.ct, 1)} × {fmt(SNEEUW.sk, 1)} ={" "}
                  {fmt(sneeuwPlatDak(), 2)} kN/m²
                </>
              ),
              bron: "NEN-EN 1991-1-3 (5.1)",
            },
          ]}
        />
        <TekstVeld id="sneeuw" hint="Tekst onder de sneeuwbelasting." />
      </div>

      <div className="rapport-knoop">
        <Kop id="wind" />
        <Afgeleid
          uitProjectgegevens
          regels={[
            {
              label: "Windgebied",
              waarde: <>{GEBIED[wg]} — v<sub>b,0</sub> = {fmt(wind.vb0, 1)} m/s</>,
              bron: "tabel NB.1",
            },
            { label: "Terreincategorie", waarde: TERREIN[tc], bron: "tabel NB.3–4.1" },
            { label: "Omschrijving in 5.2", waarde: windLabel(wg, tc) },
          ]}
        />
        <div className="rapport-rij">
          <Veld
            label="Gebouwhoogte"
            pad="belastingen.wind.gebouwhoogte"
            waarde={b.wind.gebouwhoogte}
            eenheid="m"
            placeholder="bijv. 9"
          />
          <Veld
            label={<>c<sub>s</sub>c<sub>d</sub></>}
            pad="belastingen.wind.cscd"
            waarde={b.wind.cscd}
            hint="1 bij gebouwen lager dan 15 m, zie 6.2(1)."
          />
        </div>
        <Afgeleid
          regels={[
            { label: <>z<sub>0</sub></>, waarde: `${fmt(wind.z0, 3, true)} m` },
            { label: <>z<sub>min</sub></>, waarde: `${fmt(wind.zmin, 0)} m` },
            {
              label: <>z<sub>e</sub></>,
              waarde: hoogteBekend ? `${fmt(wind.ze, 2, true)} m` : "—",
              bron: "gebouwhoogte, ten minste z_min",
            },
            {
              label: <>q<sub>p</sub>(z<sub>e</sub>)</>,
              waarde: hoogteBekend ? `${fmt(qp, 2)} kN/m²` : "— (vul de gebouwhoogte in)",
              bron: "(4.8)",
            },
            { label: PSI, waarde: psiTekst(PSI_WIND), bron: "tabel NB.2–A1.1" },
          ]}
        />
        <h6 className="rapport-subkop">Coëfficiënten</h6>
        <RijenTabel<Windcoefficient>
          pad="belastingen.wind.coefficienten"
          rijen={b.wind.coefficienten}
          kolommen={WIND_KOLOMMEN}
          nieuweRij={() => ({ omschrijving: "", c: "" })}
          toevoegen="Coëfficiënt toevoegen"
          extra={[
            {
              kop: <>P<sub>rep</sub> [kN/m²]</>,
              breedte: "8em",
              waarde: (rij) => getalTekst(getal(rij.c) * qp, 2),
            },
          ]}
        />
        <p className="rapport-hint">
          P<sub>rep</sub> = c · q<sub>p</sub>; zonder gebouwhoogte blijft de kolom leeg.
        </p>
      </div>

      <div className="rapport-knoop">
        <TekstVeld id="regenwater" kop={<Kop id="regenwater" />} />
      </div>

      <div className="rapport-knoop">
        <Kop id="veranderlijk" />
        {b.klassen.length === 0 && <p className="rapport-hint">Nog geen belastingklassen.</p>}
        {b.klassen.map((k, i) => (
          <KlasseKaart key={i} regel={k} index={i} aantal={b.klassen.length} wijzig={wijzigKlassen} />
        ))}
        <button
          type="button"
          className="rapport-knop"
          onClick={() => wijzigKlassen((l) => [...l, { ...NIEUWE_KLASSE }])}
        >
          + Belastingklasse toevoegen
        </button>
      </div>

      <div className="rapport-knoop">
        <Kop id="blijvend" />
        <OpbouwEditor groep="vloerenDaken" titel="Vloeren, daken" />
        <OpbouwEditor groep="wanden" titel="Wanden" />
      </div>
    </Sectie>
  );
}

/**
 * Eén belastingklasse uit 5.4. Bij een vloer telt de toeslag voor lichte
 * scheidingswanden op bij q_k; bij een dak hangt q_k af van de dakhelling.
 */
function KlasseKaart({ regel, index, aantal, wijzig }: {
  regel: Belastingklasse;
  index: number;
  aantal: number;
  wijzig: (fn: (lijst: Belastingklasse[]) => Belastingklasse[]) => void;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const pad = `belastingen.klassen.${index}`;
  const cat = categorie(regel.categorie);
  const ls = getal(regel.lichteScheidingswanden);
  const alfa = getal(regel.dakhelling);

  return (
    <div className="rapport-kaart">
      <div className="rapport-kaart-kop">
        <select
          value={regel.categorie}
          aria-label="Categorie"
          onChange={(e) => zet(`${pad}.categorie`, e.target.value)}
        >
          {!cat && <option value={regel.categorie}>{regel.categorie || "—"} (onbekend)</option>}
          <optgroup label="Vloeren">
            {CATEGORIEEN.filter((c) => c.soort === "vloer").map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Daken">
            {CATEGORIEEN.filter((c) => c.soort === "dak").map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
        </select>
        <button
          type="button"
          className="rapport-icoon"
          title="Omhoog"
          disabled={index === 0}
          onClick={() => wijzig((l) => verplaatst(l, index, -1))}
        >
          ↑
        </button>
        <button
          type="button"
          className="rapport-icoon"
          title="Omlaag"
          disabled={index === aantal - 1}
          onClick={() => wijzig((l) => verplaatst(l, index, 1))}
        >
          ↓
        </button>
        <button
          type="button"
          className="rapport-icoon"
          title="Belastingklasse verwijderen"
          onClick={() => wijzig((l) => l.filter((_, j) => j !== index))}
        >
          ✕
        </button>
      </div>

      {!cat && <p className="rapport-hint">Onbekende categorie: kies er een uit de lijst.</p>}

      {cat?.soort === "vloer" && (
        <>
          <Veld
            label="Lichte scheidingswanden (L.S.)"
            pad={`${pad}.lichteScheidingswanden`}
            waarde={regel.lichteScheidingswanden}
            eenheid="kN/m²"
            placeholder="leeg = geen"
            hint="0,5 / 0,8 / 1,2 kN/m² bij een wandgewicht tot 1,0 / 2,0 / 3,0 kN/m, zie 6.3.1.2(8)."
          />
          <Afgeleid
            regels={[
              { label: <>q<sub>k</sub></>, waarde: `${fmt(cat.qk, 2)} kN/m²`, bron: "tabel NB.1–6.2" },
              {
                label: <>q<sub>k</sub> + L.S.</>,
                waarde: `${fmt(cat.qk + (Number.isFinite(ls) ? ls : 0), 2)} kN/m²`,
              },
              { label: <>Q<sub>k</sub></>, waarde: `${fmt(cat.Qk, 1)} kN` },
              { label: PSI, waarde: psiTekst(cat.psi), bron: "tabel NB.2–A1.1" },
            ]}
          />
        </>
      )}

      {cat?.soort === "dak" && (
        <>
          <div className="rapport-rij">
            <Veld label="Dakhelling α" pad={`${pad}.dakhelling`} waarde={regel.dakhelling} eenheid="°" />
            <Veld label="q-last" pad={`${pad}.qlast`} waarde={regel.qlast} eenheid="kN/m¹" />
          </div>
          <Afgeleid
            regels={[
              {
                label: <>q<sub>k</sub> plat dak</>,
                waarde: `${fmt(cat.qk, 2)} kN/m²`,
                bron: "tabel NB.4–6.10",
              },
              {
                label: <>q<sub>k</sub> bij α</>,
                waarde: Number.isFinite(alfa) ? `${fmt(dakQk(alfa), 2)} kN/m²` : "— (vul de dakhelling in)",
              },
              {
                label: <>Q<sub>k</sub></>,
                waarde: `${fmt(cat.Qk, 1)} kN; direct onder het dakbeschot ${fmt(DAK_QK_DIRECT, 1)} kN`,
              },
              { label: PSI, waarde: psiTekst(cat.psi), bron: "tabel NB.2–A1.1" },
            ]}
          />
        </>
      )}
    </div>
  );
}
