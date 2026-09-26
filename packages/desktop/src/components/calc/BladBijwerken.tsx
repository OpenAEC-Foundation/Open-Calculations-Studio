import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AstNode } from "@ifc-calc/core";
import Modal from "../Modal";
import { templates } from "../../templates";
import { useProjectStore, type Exemplaar } from "../../store/projectStore";
import { projectScope } from "../../store/projectGegevens";
import { useBladBijwerken } from "../../store/bladBijwerken";
import { leesBlad, rekenBladDoor, ucTekst } from "./bladResultaat";
import { heeftDesigner } from "./designerKeuze";
import {
  heeftEigenCode,
  huidigeModuletekst,
  invoervelden,
  isVerouderd,
  regelverschil,
  rekenversie,
  veldTekst,
  vergelijkInvoer,
  vergelijkUitkomst,
  verliestInvoer,
  type InvoerVergelijking,
  type Invoerveld,
  type UitkomstVergelijking,
} from "./bladVersie";
import "../settings/SettingsDialog.css";
import "../rapport/RapportPanel.css";
import "./BladVersie.css";

/**
 * Het scherm "Vergelijken en bijwerken".
 *
 * Rekent elk blad met zijn huidige invoer door met de oude en met de nieuwe
 * rekenversie, en zet de uitkomsten naast elkaar: maatgevende UC, oordeel, de
 * UC-waarden die veranderen en de invoervelden die vervallen of erbij komen.
 * Pas "Bijwerken" verandert het project, in één stap die ongedaan te maken is
 * (werkBladenBij in de projectstore).
 *
 * Eén blad (vanuit de melding boven het blad) staat meteen uitgeklapt; vanuit
 * de projectboom komen alle verouderde bladen in één tabel, elk met een
 * vinkje dat standaard aan staat. Een blad waarvan ingevulde invoer bij
 * bijwerken wegvalt, staat ook daar meteen uitgeklapt.
 *
 * Een blad met een eigen aanpassing van de rekentekst (heeftEigenCode) is
 * anders: bijwerken vervangt de hele tekst en vaagt die aanpassing weg. Zo'n
 * blad staat standaard uit, is gemarkeerd en staat uitgeklapt met een
 * waarschuwing. Bijwerken blijft mogelijk, als bewuste keuze.
 */

/** De vergelijking van één blad. */
interface Vergelijking {
  /** De bladtekst waarmee vergeleken is; bijwerken slaat een blad over dat intussen veranderde. */
  bron: string;
  /** De gebruiker paste de rekentekst zelf aan; bijwerken vaagt dat weg. */
  eigenCode: boolean;
  /** De rekenversie van de module waaruit het blad kwam, als het blad die kent. */
  bronVersie?: string;
  nieuweTekst: string;
  versieOud: string;
  versieNieuw: string;
  veldenOud: Invoerveld[];
  veldenNieuw: Invoerveld[];
  invoer: InvoerVergelijking;
  uitkomst: UitkomstVergelijking;
  regels: { weg: number; bij: number };
  /** De nieuwe tekst heeft een parametrisch beeld, dat standaardwaarden kan aanvullen. */
  metBeeld: boolean;
}

function leesVeilig(tekst: string): AstNode[] | null {
  try {
    return leesBlad(tekst);
  } catch {
    return null;
  }
}

function vergelijkBlad(ex: Exemplaar, nieuweTekst: string, scope: Record<string, unknown>): Vergelijking {
  const astOud = leesVeilig(ex.source);
  const astNieuw = leesVeilig(nieuweTekst);
  const veldenOud = astOud ? invoervelden(astOud) : [];
  const veldenNieuw = astNieuw ? invoervelden(astNieuw) : [];
  const invoer = vergelijkInvoer(ex.waarden, veldenOud, veldenNieuw);
  const oud = astOud ? rekenBladDoor(astOud, ex.waarden, scope, ex.naam) : null;
  const nieuw = astNieuw ? rekenBladDoor(astNieuw, invoer.waarden, scope, ex.naam) : null;
  return {
    bron: ex.source,
    eigenCode: heeftEigenCode(ex),
    bronVersie: ex.bronVersie,
    nieuweTekst,
    versieOud: rekenversie(ex.source),
    versieNieuw: rekenversie(nieuweTekst),
    veldenOud,
    veldenNieuw,
    invoer,
    uitkomst: vergelijkUitkomst(oud, nieuw),
    regels: regelverschil(ex.source, nieuweTekst),
    metBeeld: heeftDesigner(nieuweTekst),
  };
}

const uc = (w: number | null) => (w === null ? "—" : ucTekst(w));

/** "oud → nieuw", met de nieuwe waarde nadrukkelijk als hij verschilt. */
function Overgang({ oud, nieuw, veranderd }: { oud: ReactNode; nieuw: ReactNode; veranderd: boolean }) {
  return (
    <span className={`bv-overgang${veranderd ? " veranderd" : ""}`}>
      <span className="bv-oud">{oud}</span>
      <span className="bv-pijl">→</span>
      <span className="bv-nieuw">{nieuw}</span>
    </span>
  );
}

function Oordeel({ voldoet }: { voldoet: boolean | null }) {
  const { t } = useTranslation();
  if (voldoet === null) return <span className="bv-geen">—</span>;
  return (
    <span className={`rapport-oordeel ${voldoet ? "goed" : "fout"}`}>
      {voldoet ? t("bladVersie.voldoet") : t("bladVersie.voldoetNiet")}
    </span>
  );
}

/** UC-waarden en invoervelden die veranderen, onder de rij van het blad. */
function Details({ v }: { v: Vergelijking }) {
  const { t } = useTranslation();
  const { ucVariabelen } = v.uitkomst;
  const { vervallen, nieuw } = v.invoer;
  const leegNieuw = nieuw.some((n) => n.waarde === undefined);
  return (
    <div className="bv-details">
      {v.eigenCode && (
        <p className="rapport-melding-blok bv-eigen-waarschuwing">
          {t("bladVersie.eigenWaarschuwing", { bron: v.bronVersie })}
        </p>
      )}
      <section>
        <h4>{t("bladVersie.ucKop")}</h4>
        {ucVariabelen.length === 0 ? (
          <p className="rapport-hint">{t("bladVersie.ucGelijk")}</p>
        ) : (
          <table className="bv-lijst">
            <tbody>
              {ucVariabelen.map((u) => (
                <tr key={u.naam}>
                  <td><code>{u.naam}</code></td>
                  <td className="bv-getal">
                    <Overgang oud={uc(u.oud)} nieuw={uc(u.nieuw)} veranderd />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section>
        <h4>{t("bladVersie.veldenKop")}</h4>
        {vervallen.length === 0 && nieuw.length === 0 ? (
          <p className="rapport-hint">{t("bladVersie.veldenGelijk")}</p>
        ) : (
          <table className="bv-lijst">
            <tbody>
              {vervallen.map(({ veld, waarde }) => (
                <tr key={`weg-${veld.naam}`}>
                  <td><code>{veld.naam}</code></td>
                  <td><span className="bv-label weg">{t("bladVersie.vervalt")}</span></td>
                  <td className="bv-waarde">{veldTekst(veld, waarde ?? veld.beginwaarde)}</td>
                </tr>
              ))}
              {nieuw.map(({ veld, waarde }) => (
                <tr key={`bij-${veld.naam}`}>
                  <td><code>{veld.naam}</code></td>
                  <td><span className="bv-label bij">{t("bladVersie.nieuwVeld")}</span></td>
                  <td className="bv-waarde">
                    {waarde === undefined
                      ? t("bladVersie.beginwaarde", { waarde: veldTekst(veld, veld.beginwaarde) })
                      : t("bladVersie.alIngevuld", { waarde: veldTekst(veld, waarde) })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {leegNieuw && v.metBeeld && <p className="rapport-hint">{t("bladVersie.beeldVult")}</p>}
      </section>
      <p className="rapport-hint bv-regels">
        {t("bladVersie.regels", {
          weg: t("bladVersie.regelsWeg", { count: v.regels.weg }),
          bij: t("bladVersie.regelsBij", { count: v.regels.bij }),
        })}
      </p>
    </div>
  );
}

function Scherm({ ids, onSluit }: { ids: string[]; onSluit: () => void }) {
  const { t } = useTranslation();
  const werkBladenBij = useProjectStore((s) => s.werkBladenBij);
  // Wat er bij het openen verouderd was. Het scherm is modaal, dus het project
  // verandert intussen niet onder de handen van de gebruiker; bijwerken
  // controleert het toch nog per blad.
  const [bladen] = useState(() => {
    const s = useProjectStore.getState();
    return ids
      .map((id) => s.exemplaren.find((e) => e.id === id))
      .filter((ex): ex is Exemplaar => !!ex && isVerouderd(ex, templates));
  });
  const [scope] = useState(() => projectScope(useProjectStore.getState().gegevens));
  const [uitkomsten, setUitkomsten] = useState<Record<string, Vergelijking>>({});
  // Een eigen aanpassing gaat bij bijwerken verloren: in de tabel van alle
  // bladen staat zo'n blad standaard uit en meteen uitgeklapt, met de
  // waarschuwing in beeld. Het scherm van één blad heeft geen vinkje: daar is
  // het openen zelf de keuze, en staat de waarschuwing boven de knop.
  const enkel = ids.length === 1;
  const eigen = bladen.filter((b) => heeftEigenCode(b)).map((b) => b.id);
  const [gevinkt, setGevinkt] = useState(
    () => new Set(bladen.map((b) => b.id).filter((id) => enkel || !eigen.includes(id))),
  );
  const [open, setOpen] = useState(() => new Set(enkel ? bladen.map((b) => b.id) : eigen));

  // Een balklaag doorrekenen kost een paar honderd milliseconden. Eén blad
  // per tik, zodat het scherm meteen verschijnt en de rijen één voor één
  // vollopen.
  useEffect(() => {
    let i = 0;
    let timer = 0;
    const volgende = () => {
      const ex = bladen[i++];
      if (!ex) return;
      const nieuw = huidigeModuletekst(ex, templates);
      if (nieuw !== null) {
        const v = vergelijkBlad(ex, nieuw, scope);
        setUitkomsten((u) => ({ ...u, [ex.id]: v }));
        // Invoer die bij bijwerken wegvalt, mag niet achter "Details" blijven
        // staan: zo'n rij klapt vanzelf open.
        if (verliestInvoer(v.invoer)) setOpen((o) => new Set(o).add(ex.id));
      }
      timer = window.setTimeout(volgende, 0);
    };
    timer = window.setTimeout(volgende, 30);
    return () => clearTimeout(timer);
  }, [bladen, scope]);

  const klaar = bladen.every((b) => uitkomsten[b.id]);
  const teDoen = bladen.filter((b) => gevinkt.has(b.id) && uitkomsten[b.id]);

  const bijwerken = () => {
    const nu = useProjectStore.getState().exemplaren;
    const wijzigingen = [];
    for (const b of teDoen) {
      const v = uitkomsten[b.id];
      const ex = nu.find((e) => e.id === b.id);
      if (!ex || ex.source !== v.bron) continue;
      // De invoer van nu, niet die van het openen: een beeld kan intussen
      // standaardwaarden hebben aangevuld.
      const { waarden } = vergelijkInvoer(ex.waarden, v.veldenOud, v.veldenNieuw);
      wijzigingen.push({ id: ex.id, source: v.nieuweTekst, waarden });
    }
    if (wijzigingen.length > 0) werkBladenBij(wijzigingen);
    onSluit();
  };

  const wissel = (set: Set<string>, id: string) => {
    const nieuw = new Set(set);
    if (nieuw.has(id)) nieuw.delete(id);
    else nieuw.add(id);
    return nieuw;
  };

  const footer = (
    <>
      <button className="settings-btn settings-btn-secondary" onClick={onSluit}>
        {t("cancel")}
      </button>
      <button
        className="settings-btn settings-btn-primary"
        disabled={!klaar || teDoen.length === 0}
        onClick={bijwerken}
      >
        {enkel ? t("bladVersie.bijwerken") : t("bladVersie.bijwerkenAantal", { count: teDoen.length })}
      </button>
    </>
  );

  const kolommen = enkel ? 5 : 6;
  const titel = enkel && bladen[0] ? t("bladVersie.titelEen", { naam: bladen[0].naam }) : t("bladVersie.titelAlle");

  return (
    <Modal
      open
      onClose={onSluit}
      title={titel}
      width={Math.min(enkel ? 720 : 880, window.innerWidth - 32)}
      className="blad-bijwerken"
      footer={footer}
    >
      <div className="settings-content bv-inhoud">
        {bladen.length === 0 ? (
          <p className="rapport-hint">{t("bladVersie.geenVerouderd")}</p>
        ) : (
          <>
            <p className="bv-intro">
              {enkel ? t("bladVersie.introEen") : t("bladVersie.introAlle")}
              {!enkel && eigen.length > 0 && ` ${t("bladVersie.eigenUit")}`}
            </p>
            <table className="bv-tabel">
              <thead>
                <tr>
                  {!enkel && <th className="bv-vink" />}
                  <th>{t("bladVersie.kolomBlad")}</th>
                  <th>{t("bladVersie.kolomVersie")}</th>
                  <th className="bv-getal">{t("bladVersie.kolomUc")}</th>
                  <th>{t("bladVersie.kolomOordeel")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bladen.map((ex) => {
                  const v = uitkomsten[ex.id];
                  const u = v?.uitkomst;
                  const isOpen = open.has(ex.id);
                  return (
                    <Fragment key={ex.id}>
                      <tr className={`bv-rij${isOpen ? " open" : ""}`}>
                        {!enkel && (
                          <td className="bv-vink">
                            <input
                              type="checkbox"
                              checked={gevinkt.has(ex.id)}
                              onChange={() => setGevinkt((g) => wissel(g, ex.id))}
                              aria-label={ex.naam}
                            />
                          </td>
                        )}
                        <td className="bv-naam">
                          {ex.naam}
                          {eigen.includes(ex.id) && (
                            <span className="bv-label eigen" title={t("bladVersie.eigenUitleg", { bron: ex.bronVersie })}>
                              {t("bladVersie.eigenAanpassing")}
                            </span>
                          )}
                        </td>
                        <td className="bv-versie">
                          <Overgang
                            oud={<code>{rekenversie(ex.source)}</code>}
                            nieuw={<code>{v?.versieNieuw ?? "…"}</code>}
                            veranderd={false}
                          />
                        </td>
                        <td className="bv-getal">
                          {!u ? (
                            <span className="bv-geen">{t("bladVersie.bezig")}</span>
                          ) : (
                            <Overgang
                              oud={u.oudMislukt ? t("bladVersie.mislukt") : uc(u.ucOud)}
                              nieuw={u.nieuwMislukt ? t("bladVersie.mislukt") : uc(u.ucNieuw)}
                              veranderd={u.ucVeranderd}
                            />
                          )}
                        </td>
                        <td>
                          {u && (
                            <Overgang
                              oud={<Oordeel voldoet={u.oordeelOud} />}
                              nieuw={<Oordeel voldoet={u.oordeelNieuw} />}
                              veranderd={u.oordeelVeranderd}
                            />
                          )}
                        </td>
                        <td className="bv-knopcel">
                          {!enkel && v && (
                            <button
                              type="button"
                              className="rapport-knop bv-uitklap"
                              aria-expanded={isOpen}
                              onClick={() => setOpen((o) => wissel(o, ex.id))}
                            >
                              {isOpen ? "▾" : "▸"} {t("bladVersie.details")}
                            </button>
                          )}
                        </td>
                      </tr>
                      {v && isOpen && (
                        <tr className="bv-detailrij">
                          <td colSpan={kolommen}>
                            <Details v={v} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <p className="rapport-melding-blok rustig bv-letop">{t("bladVersie.letOp")}</p>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Staat in App naast "Module toevoegen"; open zolang de store bladen aanwijst. */
export default function BladBijwerken() {
  const ids = useBladBijwerken((s) => s.ids);
  const sluiten = useBladBijwerken((s) => s.sluiten);
  // Een eigen component per keer openen: vinkjes en uitkomsten beginnen leeg.
  return ids ? <Scherm key={ids.join(",")} ids={ids} onSluit={sluiten} /> : null;
}
