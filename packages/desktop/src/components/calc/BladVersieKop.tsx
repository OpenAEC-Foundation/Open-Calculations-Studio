import { useTranslation } from "react-i18next";
import type { Exemplaar } from "../../store/projectStore";
import { useBladBijwerken } from "../../store/bladBijwerken";
import { templates } from "../../templates";
import { modulesPerTemplate } from "./projectTree";
import { huidigeModuletekst, isVerouderd, rekenversie } from "./bladVersie";
import "./ProjectBrowser.css";
import "../rapport/RapportPanel.css";
import "./BladVersie.css";

/*
 * Rekenversie en modulestatus in de kop van een geopend blad, en de melding
 * als de module intussen een nieuwere rekenversie heeft. Bijwerken gebeurt
 * nooit vanzelf: de melding opent het vergelijkingsscherm (BladBijwerken.tsx).
 */

/** Status en rekenversie, rechts in de tabbalk boven het blad. */
export function BladVersieKop({ ex }: { ex: Exemplaar }) {
  const { t } = useTranslation();
  const status = modulesPerTemplate[ex.templateId]?.status;
  const versie = rekenversie(ex.source);
  return (
    <span className="bv-kop">
      {status && (
        <span className="bv-status" title={t(`bladVersie.statusUitleg.${status}`)}>
          <span className={`tree-item-icon tree-status-${status}`}>{status === "concept" ? "○" : "●"}</span>
          <span className="bv-status-tekst">{t(`bladVersie.status.${status}`)}</span>
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
  const nieuw = huidigeModuletekst(ex, templates) ?? "";
  return (
    <div className="bv-melding rapport-melding-blok" role="status">
      <span className="bv-melding-tekst">
        <b>{t("bladVersie.melding")}</b>
        {" — "}
        {t("bladVersie.meldingUitleg", { oud: rekenversie(ex.source), nieuw: rekenversie(nieuw) })}
      </span>
      <button type="button" className="rapport-knop" onClick={() => openen([ex.id])}>
        {t("bladVersie.vergelijken")}
      </button>
    </div>
  );
}
