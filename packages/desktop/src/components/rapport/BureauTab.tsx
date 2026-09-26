import { Fragment, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import {
  STANDAARD_HUISSTIJL,
  type BureauProfiel,
  type Constructeur,
  type Huisstijl,
} from "../../rapport/model";
import "../settings/SettingsDialog.css";

/**
 * De tab "Bureau" in de instellingen: het bureauprofiel dat op het voorblad en
 * in de voet van elk rapport komt (gegevens, logo, voetafbeelding, huisstijl en
 * de constructeurs waaruit het rapport de verantwoordelijke en de uitvoerende
 * kiest).
 *
 * Net als de andere tabs werkt deze tab op een concept uit SettingsDialog: pas
 * Opslaan zet het profiel in store/bureauProfiel.ts, Annuleren gooit het weg.
 * Elke wijziging gaat als bijwerkfunctie naar `onChange((p) => …)` in plaats
 * van als nieuw object. Het inlezen van een afbeelding is asynchroon; met een
 * bijwerkfunctie gaat wat de gebruiker intussen typt niet verloren.
 */

/**
 * Hooguit 500 kB per afbeelding. Het profiel staat als JSON in de instellingen
 * en gaat, eenmaal vastgelegd in een rapport, als kopie mee in het
 * projectbestand; grote foto's horen daar niet in.
 */
const MAX_AFBEELDING = 500 * 1024;

/** De vier kleuren van de huisstijl, in de volgorde van het formulier. */
const KLEUREN: readonly { veld: Exclude<keyof Huisstijl, "lettertype">; sleutel: string }[] = [
  { veld: "hoofdkleur", sleutel: "bureau.hoofdkleur" },
  { veld: "accentkleur", sleutel: "bureau.accentkleur" },
  { veld: "tabeltekst", sleutel: "bureau.tabeltekst" },
  { veld: "invoerkleur", sleutel: "bureau.invoerkleur" },
];

/** "#1F3A5F", "1f3a5f" of "#abc" → "#1f3a5f" / "#aabbcc"; al het andere → null. */
function hexKleur(s: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return `#${h.toLowerCase()}`;
}

/** Leest een bestand als data-URL (base64), zoals het in het profiel komt te staan. */
function leesAlsDataUrl(bestand: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lezer = new FileReader();
    lezer.onload = () => resolve(String(lezer.result));
    lezer.onerror = () => reject(lezer.error ?? new Error("lezen mislukt"));
    lezer.readAsDataURL(bestand);
  });
}

export default function BureauTab({
  profiel,
  onChange,
}: {
  profiel: BureauProfiel;
  onChange: Dispatch<SetStateAction<BureauProfiel>>;
}) {
  const { t } = useTranslation("settings");
  // De zojuist toegevoegde constructeursrij krijgt de focus (autoFocus werkt
  // alleen bij het mounten, dus bestaande rijen springen niet).
  const [nieuweRij, setNieuweRij] = useState<number | null>(null);
  // Buiten de desktop-app (Browser-paneel, headless Chrome) is er geen
  // instellingenbestand: het profiel leeft dan alleen in het geheugen.
  const inTauri = "__TAURI_INTERNALS__" in window;

  const patch = (deel: Partial<BureauProfiel>) => onChange((p) => ({ ...p, ...deel }));
  const zetHuisstijl = <K extends keyof Huisstijl>(veld: K, waarde: Huisstijl[K]) =>
    onChange((p) => ({ ...p, huisstijl: { ...p.huisstijl, [veld]: waarde } }));
  const zetConstructeur = (i: number, deel: Partial<Constructeur>) =>
    onChange((p) => ({
      ...p,
      constructeurs: p.constructeurs.map((c, j) => (j === i ? { ...c, ...deel } : c)),
    }));
  const voegConstructeurToe = () => {
    setNieuweRij(profiel.constructeurs.length);
    onChange((p) => ({ ...p, constructeurs: [...p.constructeurs, { naam: "", telefoon: "", email: "" }] }));
  };
  const verwijderConstructeur = (i: number) => {
    setNieuweRij(null);
    onChange((p) => ({ ...p, constructeurs: p.constructeurs.filter((_, j) => j !== i) }));
  };

  const h = profiel.huisstijl;

  return (
    <div className="bureau-tab">
      <p className="settings-description bureau-intro">{t("bureau.intro")}</p>
      {!inTauri && <p className="settings-description bureau-sessie">{t("bureau.alleenSessie")}</p>}

      <div className="settings-section">
        <h3>{t("bureau.gegevens")}</h3>
        <Tekstveld label={t("bureau.naam")} waarde={profiel.naam} onWaarde={(v) => patch({ naam: v })} />
        <p className="settings-description bureau-hint">{t("bureau.naamHint")}</p>
        <Tekstveld label={t("bureau.adres")} waarde={profiel.adres} onWaarde={(v) => patch({ adres: v })} />
        <div className="settings-row">
          <span className="settings-label">{t("bureau.postcodePlaats")}</span>
          <div className="bureau-duo">
            <input
              className="settings-input bureau-postcode"
              value={profiel.postcode}
              aria-label={t("bureau.postcode")}
              spellCheck={false}
              onChange={(e) => patch({ postcode: e.target.value })}
            />
            <input
              className="settings-input bureau-plaats"
              value={profiel.plaats}
              aria-label={t("bureau.plaats")}
              spellCheck={false}
              onChange={(e) => patch({ plaats: e.target.value })}
            />
          </div>
        </div>
        <Tekstveld label={t("bureau.telefoon")} type="tel" waarde={profiel.telefoon} onWaarde={(v) => patch({ telefoon: v })} />
        <Tekstveld label={t("bureau.email")} type="email" waarde={profiel.email} onWaarde={(v) => patch({ email: v })} />
      </div>

      <div className="settings-section">
        <h3>{t("bureau.afbeeldingen")}</h3>
        <AfbeeldingVeld
          label={t("bureau.logo")}
          hint={t("bureau.logoHint")}
          waarde={profiel.logo}
          onWaarde={(v) => patch({ logo: v })}
        />
        <AfbeeldingVeld
          label={t("bureau.voetafbeelding")}
          hint={t("bureau.voetHint")}
          waarde={profiel.voetafbeelding}
          breed
          onWaarde={(v) => patch({ voetafbeelding: v })}
        />
      </div>

      <div className="settings-section">
        <h3>{t("bureau.huisstijl")}</h3>
        {KLEUREN.map(({ veld, sleutel }) => (
          <KleurVeld key={veld} label={t(sleutel)} waarde={h[veld]} onWaarde={(k) => zetHuisstijl(veld, k)} />
        ))}
        <Tekstveld label={t("bureau.lettertype")} waarde={h.lettertype} onWaarde={(v) => zetHuisstijl("lettertype", v)} />
        <p className="settings-description bureau-hint">{t("bureau.lettertypeHint")}</p>
        {/* Proefregel met de kleuren en het lettertype zoals het rapport ze gebruikt. */}
        <div className="bureau-proef" style={{ fontFamily: h.lettertype || STANDAARD_HUISSTIJL.lettertype }}>
          <div className="bureau-proef-titel" style={{ color: h.hoofdkleur }}>{t("bureau.proefTitel")}</div>
          <div className="bureau-proef-paragraaf" style={{ color: h.accentkleur }}>{t("bureau.proefParagraaf")}</div>
          <div className="bureau-proef-rij">
            <b style={{ color: h.accentkleur }}>{t("bureau.proefLabel")}</b>
            <span style={{ color: h.tabeltekst }}>{t("bureau.proefTabel")}</span>
            <span style={{ color: h.invoerkleur }}>{t("bureau.proefInvoer")}</span>
          </div>
        </div>
        <div className="bureau-rechts">
          <button
            type="button"
            className="settings-btn settings-btn-secondary bureau-knop"
            onClick={() => onChange((p) => ({ ...p, huisstijl: { ...STANDAARD_HUISSTIJL } }))}
          >
            {t("bureau.standaardHuisstijl")}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>{t("bureau.constructeurs")}</h3>
        {profiel.constructeurs.length === 0 ? (
          <p className="settings-description bureau-leeg">{t("bureau.geenConstructeurs")}</p>
        ) : (
          <div className="bureau-constructeurs">
            <span className="bureau-kolomkop">{t("bureau.constructeurNaam")}</span>
            <span className="bureau-kolomkop">{t("bureau.telefoon")}</span>
            <span className="bureau-kolomkop">{t("bureau.email")}</span>
            <span />
            {profiel.constructeurs.map((c, i) => (
              <Fragment key={i}>
                <input
                  className="settings-input"
                  value={c.naam}
                  placeholder={t("bureau.naamVoorbeeld")}
                  aria-label={t("bureau.constructeurNaam")}
                  spellCheck={false}
                  autoFocus={i === nieuweRij}
                  onChange={(e) => zetConstructeur(i, { naam: e.target.value })}
                />
                <input
                  className="settings-input"
                  type="tel"
                  value={c.telefoon}
                  aria-label={t("bureau.telefoon")}
                  spellCheck={false}
                  onChange={(e) => zetConstructeur(i, { telefoon: e.target.value })}
                />
                <input
                  className="settings-input"
                  type="email"
                  value={c.email}
                  placeholder={t("bureau.emailVoorbeeld")}
                  aria-label={t("bureau.email")}
                  spellCheck={false}
                  onChange={(e) => zetConstructeur(i, { email: e.target.value })}
                />
                <button
                  type="button"
                  className="bureau-verwijder"
                  title={t("bureau.constructeurVerwijderen")}
                  aria-label={t("bureau.constructeurVerwijderen")}
                  onClick={() => verwijderConstructeur(i)}
                >
                  ×
                </button>
              </Fragment>
            ))}
          </div>
        )}
        <button type="button" className="settings-btn settings-btn-secondary bureau-knop" onClick={voegConstructeurToe}>
          {t("bureau.constructeurToevoegen")}
        </button>
      </div>
    </div>
  );
}

/** Label links, breed tekstveld rechts; een klik op het label zet de cursor in het veld. */
function Tekstveld({
  label,
  waarde,
  onWaarde,
  type = "text",
}: {
  label: string;
  waarde: string;
  onWaarde: (waarde: string) => void;
  type?: "text" | "tel" | "email";
}) {
  return (
    <label className="settings-row">
      <span className="settings-label">{label}</span>
      <input
        className="settings-input bureau-invoer"
        type={type}
        value={waarde}
        spellCheck={false}
        onChange={(e) => onWaarde(e.target.value)}
      />
    </label>
  );
}

/**
 * Kleurkiezer plus hexcode. Wat er getypt wordt staat eerst alleen hier; pas
 * een volledige code gaat naar het profiel. Zo springt de kleurkiezer niet op
 * zwart halverwege het typen, en wordt "#abc" niet al "#aabbcc" terwijl je
 * "#abcdef" aan het typen bent.
 */
function KleurVeld({
  label,
  waarde,
  onWaarde,
}: {
  label: string;
  waarde: string;
  onWaarde: (kleur: string) => void;
}) {
  const [tekst, setTekst] = useState(waarde);
  useEffect(() => setTekst(waarde), [waarde]);

  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="bureau-kleur">
        <input
          type="color"
          value={hexKleur(waarde) ?? "#000000"}
          aria-label={label}
          onChange={(e) => onWaarde(e.target.value)}
        />
        <input
          className="settings-input bureau-hex"
          value={tekst}
          aria-label={label}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value;
            setTekst(v);
            // Zes cijfers: meteen overnemen. Drie cijfers pas bij het verlaten.
            if (/^#?[0-9a-f]{6}$/i.test(v.trim())) onWaarde(hexKleur(v) ?? waarde);
          }}
          onBlur={() => {
            const k = hexKleur(tekst);
            if (k) {
              onWaarde(k);
              setTekst(k);
            } else {
              // Geen geldige kleur: terug naar wat er in het profiel staat.
              setTekst(waarde);
            }
          }}
        />
      </div>
    </div>
  );
}

/**
 * Afbeelding als data-URL: voorbeeld, "Kiezen…" en "Verwijderen". De grootte
 * wordt gecontroleerd vóór het inlezen, zodat een te groot bestand niet eerst
 * helemaal in het geheugen komt.
 */
function AfbeeldingVeld({
  label,
  hint,
  waarde,
  breed = false,
  onWaarde,
}: {
  label: string;
  hint: string;
  waarde: string;
  /** Voetafbeelding: breed en laag, in de verhouding van de paginavoet. */
  breed?: boolean;
  onWaarde: (dataUrl: string) => void;
}) {
  const { t } = useTranslation("settings");
  const invoer = useRef<HTMLInputElement>(null);
  const [fout, setFout] = useState<string | null>(null);

  const lees = async (lijst: FileList | null) => {
    // Het bestand meteen pakken: de aanroeper leegt het invoerveld direct na
    // deze (synchrone) eerste stap, zodat hetzelfde bestand opnieuw kan.
    const bestand = lijst?.[0];
    if (!bestand) return;
    if (!bestand.type.startsWith("image/")) {
      setFout(t("bureau.geenBeeld", { naam: bestand.name }));
      return;
    }
    if (bestand.size > MAX_AFBEELDING) {
      setFout(t("bureau.teGroot", { naam: bestand.name, grootte: Math.ceil(bestand.size / 1024) }));
      return;
    }
    try {
      onWaarde(await leesAlsDataUrl(bestand));
      setFout(null);
    } catch {
      setFout(t("bureau.leesFout", { naam: bestand.name }));
    }
  };

  return (
    <div className="bureau-afbeelding">
      <span className="settings-label">{label}</span>
      <div className="bureau-afbeelding-rechts">
        <div className={`bureau-beeldvak${breed ? " bureau-beeldvak-breed" : ""}`}>
          {waarde ? (
            <img src={waarde} alt={label} />
          ) : (
            <span className="bureau-beeldvak-leeg">{t("bureau.geenAfbeelding")}</span>
          )}
        </div>
        <div className="bureau-knoppen">
          <button
            type="button"
            className="settings-btn settings-btn-secondary bureau-knop"
            onClick={() => invoer.current?.click()}
          >
            {t("bureau.kiezen")}
          </button>
          <button
            type="button"
            className="settings-btn settings-btn-secondary bureau-knop"
            disabled={!waarde}
            onClick={() => {
              onWaarde("");
              setFout(null);
            }}
          >
            {t("bureau.verwijderen")}
          </button>
        </div>
        {fout && (
          <p className="bureau-fout" role="alert">
            {fout}
          </p>
        )}
        <p className="settings-description">{hint}</p>
      </div>
      <input
        ref={invoer}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          void lees(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
