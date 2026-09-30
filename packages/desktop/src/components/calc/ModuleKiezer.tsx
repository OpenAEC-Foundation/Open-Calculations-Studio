import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../Modal";
import {
  moduleCatalogus,
  bibliotheek,
  PUBLICATIE_UITLEG,
  type TreeNode,
} from "./projectTree";
import { templates } from "../../templates";
import { useModuleKiezer } from "../../store/moduleKiezer";
import ModuleAfbeelding from "./ModuleAfbeelding";
import "../settings/SettingsDialog.css";
import "./ProjectBrowser.css";
import "./ModuleKiezer.css";

/**
 * Het scherm "Module toevoegen", geopend vanuit het lint.
 *
 * Twee tabbladen: de rekenmodules per materiaal, met hun status, en de
 * bibliotheek met naslagbladen (normuitwerkingen, boeken, voorbeelden). Een
 * klik kiest, een dubbelklik of Toevoegen zet het blad in het project; het
 * scherm sluit dan en de projectlijst vraagt meteen om een naam.
 */

type Item = Extract<TreeNode, { kind: "item" }>;
interface Groep {
  id: string;
  label: string;
  items: Item[];
  subgroepen: Groep[];
  bronUrl?: string;
}

/** Een categorie uit de catalogus als groep: eigen items plus subcategorieën. */
function naarGroep(node: TreeNode): Groep | null {
  if (node.kind === "item") return null;
  const items = node.children.filter((c): c is Item => c.kind === "item");
  const subgroepen = node.children.map(naarGroep).filter((g): g is Groep => g !== null);
  return { id: node.id, label: node.label, items, subgroepen, bronUrl: node.kind === "category" ? node.bronUrl : undefined };
}

/** Zoek ook op de groepsnaam, zodat bijvoorbeeld "staal" alle staalmodules toont. */
function filter(groep: Groep, zoek: string): Groep | null {
  if (!zoek || groep.label.toLowerCase().includes(zoek)) return groep;
  const items = groep.items.filter((i) => i.label.toLowerCase().includes(zoek));
  const subgroepen = groep.subgroepen.map((g) => filter(g, zoek)).filter((g): g is Groep => g !== null);
  return items.length || subgroepen.length ? { ...groep, items, subgroepen } : null;
}

const aantal = (g: Groep): number => g.items.length + g.subgroepen.reduce((s, sg) => s + aantal(sg), 0);

async function openNormBron(url: string) {
  if ("__TAURI_INTERNALS__" in window) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const TABS = [
  { id: "modules", label: "Modules", bron: moduleCatalogus },
  { id: "bibliotheek", label: "Bibliotheek", bron: bibliotheek },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Tegel({ item, gekozen, onKies, onVoegToe }: {
  item: Item;
  gekozen: boolean;
  onKies: () => void;
  onVoegToe: () => void;
}) {
  // De teksten van de modulestatus staan in de vertalingen (bladVersie.status
  // en .statusUitleg), dezelfde als in de kop van een geopend blad.
  const { t } = useTranslation();
  const beschikbaar = !!item.templateId && !!templates[item.templateId];
  const status = item.status;
  const uitleg = !beschikbaar
    ? `${item.label} — nog niet beschikbaar`
    : status
      ? `${item.label}\n${t(`bladVersie.statusUitleg.${status}`)}\n${item.gepubliceerd ? PUBLICATIE_UITLEG.gepubliceerd : PUBLICATIE_UITLEG.onuitgegeven}`
      : item.label;
  return (
    <button
      type="button"
      className={`mk-tegel${gekozen ? " gekozen" : ""}${beschikbaar ? "" : " uit"}`}
      disabled={!beschikbaar}
      aria-pressed={gekozen}
      onClick={onKies}
      onDoubleClick={onVoegToe}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onVoegToe();
        }
      }}
      title={uitleg}
    >
      {status && item.templateId && <ModuleAfbeelding templateId={item.templateId} />}
      <span className="mk-kop">
        {status && (
          <span className={`tree-item-icon tree-status-${status}`}>{status === "concept" ? "○" : "●"}</span>
        )}
        <span className="mk-naam">{item.label}</span>
      </span>
      {(status || item.gepubliceerd) && (
        <span className="mk-onder">
          {status && <span className="mk-status">{t(`bladVersie.status.${status}`)}</span>}
          {item.gepubliceerd && <span className="tree-vlag">gepubliceerd</span>}
        </span>
      )}
    </button>
  );
}

function GroepBlok({ groep, niveau, gekozen, onKies, onVoegToe }: {
  groep: Groep;
  niveau: number;
  gekozen: string | null;
  onKies: (item: Item) => void;
  onVoegToe: (item: Item) => void;
}) {
  const Kop = niveau === 0 ? "h3" : "h4";
  return (
    <section className={`mk-groep mk-niveau-${Math.min(niveau, 2)}`}>
      <Kop>
        {groep.label} <span className="mk-aantal">{aantal(groep)}</span>
        {groep.bronUrl && (
          <button type="button" className="mk-bron" onClick={() => void openNormBron(groep.bronUrl!)}>
            NEN-overzicht ↗
          </button>
        )}
      </Kop>
      {groep.id === "standards" && (
        <p className="mk-norm-uitleg">Rekenuitwerkingen en bronverwijzingen; controleer de geldende editie en nationale bijlage.</p>
      )}
      {groep.items.length > 0 && (
        <div className="mk-tegels">
          {groep.items.map((item) => (
            <Tegel
              key={item.id}
              item={item}
              gekozen={gekozen === item.id}
              onKies={() => onKies(item)}
              onVoegToe={() => onVoegToe(item)}
            />
          ))}
        </div>
      )}
      {groep.subgroepen.map((sg) => (
        <GroepBlok key={sg.id} groep={sg} niveau={niveau + 1} gekozen={gekozen} onKies={onKies} onVoegToe={onVoegToe} />
      ))}
    </section>
  );
}

/** De betekenis van de statusbolletjes en van "gepubliceerd", onder in het scherm. */
function Legenda() {
  const { t } = useTranslation();
  return (
    <span className="mk-legenda">
      {(["gereed", "controleren", "raming", "concept"] as const).map((status) => (
        <span key={status} title={t(`bladVersie.statusUitleg.${status}`)}>
          <span className={`tree-item-icon tree-status-${status}`}>{status === "concept" ? "○" : "●"}</span>{" "}
          {t(`bladVersie.status.${status}`)}
        </span>
      ))}
      <span title={PUBLICATIE_UITLEG.gepubliceerd}>
        <span className="tree-vlag">gepubliceerd</span> nagekeken en vrijgegeven
      </span>
    </span>
  );
}

export default function ModuleKiezer() {
  const open = useModuleKiezer((s) => s.open);
  const sluiten = useModuleKiezer((s) => s.sluiten);
  const voegToe = useModuleKiezer((s) => s.voegToe);
  const [tab, setTab] = useState<TabId>("modules");
  const [zoek, setZoek] = useState("");
  const [gekozen, setGekozen] = useState<Item | null>(null);

  const bron = TABS.find((t) => t.id === tab)!.bron;
  const groepen = useMemo(() => {
    const z = zoek.trim().toLowerCase();
    return bron
      .map(naarGroep)
      .filter((g): g is Groep => g !== null)
      .map((g) => filter(g, z))
      .filter((g): g is Groep => g !== null);
  }, [bron, zoek]);

  const toevoegen = (item: Item | null) => {
    if (!item?.templateId || !templates[item.templateId]) return;
    voegToe(item.templateId, item.label);
    setGekozen(null);
    setZoek("");
  };
  const afbreken = () => {
    setGekozen(null);
    setZoek("");
    sluiten();
  };

  const footer = (
    <>
      <Legenda />
      <button className="settings-btn settings-btn-secondary" onClick={afbreken}>Annuleren</button>
      <button
        className="settings-btn settings-btn-primary"
        disabled={!gekozen}
        onClick={() => toevoegen(gekozen)}
      >
        Toevoegen
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={afbreken}
      title="Module toevoegen"
      width={Math.min(960, window.innerWidth - 32)}
      height={Math.min(720, window.innerHeight - 64)}
      className="module-kiezer"
      footer={footer}
    >
      <div className="settings-body">
        <div className="settings-sidebar">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`settings-tab${tab === t.id ? " active" : ""}`}
              onClick={() => { setTab(t.id); setGekozen(null); setZoek(""); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="settings-content mk-inhoud">
          <input
            className="mk-zoek"
            type="search"
            aria-label={tab === "modules" ? "Zoek een module" : "Zoek in de bibliotheek"}
            placeholder={tab === "modules" ? "Zoek een module…" : "Zoek in de bibliotheek…"}
            value={zoek}
            autoFocus
            onChange={(e) => { setZoek(e.target.value); setGekozen(null); }}
          />
          <div className="mk-lijst">
            {groepen.length === 0 && <p className="mk-leeg">Niets gevonden voor "{zoek}".</p>}
            {groepen.map((g) => (
              <GroepBlok
                key={g.id}
                groep={g}
                niveau={0}
                gekozen={gekozen?.id ?? null}
                onKies={setGekozen}
                onVoegToe={toevoegen}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
