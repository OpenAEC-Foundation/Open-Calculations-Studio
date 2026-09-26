import { useTranslation } from "react-i18next";
import type { Exemplaar } from "../../store/projectStore";
import { useBladBijwerken } from "../../store/bladBijwerken";
import { templates } from "../../templates";
import { modulesPerTemplate } from "./projectTree";
import { heeftEigenCode, huidigeModuletekst, isVerouderd, rekenversie } from "./bladVersie";
import "./ProjectBrowser.css";
import "../rapport/RapportPanel.css";
import "./BladVersie.css";

/*
 * Rekenversie en modulestatus in de kop van een geopend blad, en de melding
 * als de module intussen een nieuwere rekenversie heeft. Bijwerken gebeurt
 * nooit vanzelf: de melding opent het vergelijkingsscherm (BladBijwerken.tsx).
 * Een blad met een eigen aanpassing van de rekentekst zegt dat erbij: in de
 * kop, en in de melding omdat bijwerken die aanpassing wegvaagt.
 */

/** Status en rekenversie, rechts in de tabbalk boven het blad. */
export function BladVersieKop({ ex }: { ex: Exemplaar }) {
  const { t } = useTranslation();
  const status = modulesPerTemplate[ex.templateId]?.status;
  const versie = rekenversie(ex.source);
  const eigen = heeftEigenCode(ex);
  return (
    <span className="bv-kop">
      {status && (
        <span className="bv-status" title={t(`bladVersie.statusUitleg.${status}`)}>
          <span className={`tree-item-icon tree-status-${status}`}>{status === "concept" ? "○" : "●"}</span>
          <span className="bv-status-tekst">{t(`bladVersie.status.${status}`)}</span>
        </span>
      )}
      {eigen && (
        <span className="bv-eigen" title={t("bladVersie.eigenUitleg", { bron: ex.bronVersie })}>
          {t("bladVersie.eigenAanpassing")}
        </span>
      )}
      <span className="bv-versie" title={t("bladVersie.rekenversieUitleg", { versie })}>
        {t("bladVersie.rekenversie")} <code>{versie}</code>
      </span>
    </span>
  );
}

/** De melding onder de tabbalk bij een blad met een nieuwere rekenversie; anders niets. */
export function BladVersieMelding({ ex }: { ex: Exemplaar }) {
  const { t } = useTranslation();
  const openen = useBladBijwerken((s) => s.openen);
  if (!isVerouderd(ex, templates)) return null;
  const versies = {
    oud: rekenversie(ex.source),
    nieuw: rekenversie(huidigeModuletekst(ex, templates) ?? ""),
    bron: ex.bronVersie,
  };
  return (
    <div className="bv-melding rapport-melding-blok" role="status">
      <span className="bv-melding-tekst">
        <b>{t("bladVersie.melding")}</b>
        {" — "}
        {heeftEigenCode(ex) ? t("bladVersie.meldingEigen", versies) : t("bladVersie.meldingUitleg", versies)}
      </span>
      <button type="button" className="rapport-knop" onClick={() => openen([ex.id])}>
        {t("bladVersie.vergelijken")}
      </button>
    </div>
  );
}
