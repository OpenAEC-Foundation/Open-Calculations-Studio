import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { bouwOpzet, type Rapportknoop } from "../../../rapport/opzet";
import { PROJECT_ID, useProjectStore } from "../../../store/projectStore";
import { vindKnoop } from "./hulp";

/**
 * Bouwstenen van het rapportpaneel: velden die aan een pad in het rapport
 * hangen, afgeleide waarden, koppen uit de opzet en de omlijsting van een
 * sectie.
 *
 * Invoer gaat via `zetRapportVeld(pad, …)`. Het pad is ook de sleutel van de
 * geschiedenis: doortypen in één veld is één stap ongedaan maken, net als in
 * de projectgegevens. Toevoegen, verwijderen en verplaatsen gaan via
 * `werkRapportBij` en zijn elk een eigen stap.
 */

export interface Optie {
  waarde: string;
  label: string;
}

/** Het rapport van het open project. */
export function useRapport() {
  return useProjectStore((s) => s.rapport);
}

// ─── Nummering zoals in het rapport ────────────────────────────────────

/** Hoe de vaste opzet in dít rapport uitvalt. */
export interface OpzetStand {
  /** Het nummer zoals in het rapport ("4.6"); "" voor blokken en voor wat wegvalt. */
  nummer: (id: string) => string;
  /** true als de knoop niet in het rapport komt: leeg en optioneel, of uitgezet. */
  valtWeg: (id: string) => boolean;
  /** Paragraaf- en bijlagenummer van een rekenblad in hoofdstuk Berekeningen. */
  blad: (exemplaarId: string) => { nummer: string; bijlage: string } | undefined;
}

const GEEN_STAND: OpzetStand = {
  nummer: () => "",
  valtWeg: () => false,
  blad: () => undefined,
};

const OpzetContext = createContext<OpzetStand>(GEEN_STAND);

/** De stand van de opzet; zie OpzetBron. */
export function useOpzetStand(): OpzetStand {
  return useContext(OpzetContext);
}

/**
 * Rekent één keer per wijziging uit hoe de opzet in dit rapport uitvalt, en
 * geeft dat door aan alle koppen eronder.
 *
 * Het paneel toont altijd de hele opzet — ook een leeg optioneel blok moet je
 * kunnen invullen — maar de nummers volgen wat er werkelijk in het rapport
 * komt. Staat 4.6 Bestaande situatie uit, dan heet Trillingen hier 4.6, net
 * als op papier.
 */
export function OpzetBron({ children }: { children: ReactNode }) {
  const rapport = useRapport();
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const stand = useMemo<OpzetStand>(() => {
    const nummers = new Map<string, string>();
    const bladen = new Map<string, { nummer: string; bijlage: string }>();
    const loop = (lijst: Rapportknoop[]) => {
      for (const k of lijst) {
        nummers.set(k.id, k.nummer);
        if (k.blad) bladen.set(k.blad.id, { nummer: k.nummer, bijlage: k.blad.bijlage });
        loop(k.kinderen);
      }
    };
    loop(bouwOpzet(rapport, exemplaren.map((e) => ({ id: e.id, naam: e.naam }))));
    return {
      nummer: (id) => nummers.get(id) ?? "",
      valtWeg: (id) => !nummers.has(id),
      blad: (id) => bladen.get(id),
    };
  }, [rapport, exemplaren]);
  return <OpzetContext.Provider value={stand}>{children}</OpzetContext.Provider>;
}

// ─── Omlijsting en koppen ──────────────────────────────────────────────

/**
 * Eén sectie van het paneel. Met `hoofdstuk` is het een hoofdstuk van het
 * rapport: dan staat het nummer voor de titel en de keuze voor een nieuwe
 * pagina erachter.
 */
export function Sectie({ id, titel, hoofdstuk, intro, children }: {
  /** Voor de sprongbalk bovenaan het paneel (data-sectie). */
  id: string;
  titel: string;
  /** Id van het hoofdstuk in de opzet. */
  hoofdstuk?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const stand = useOpzetStand();
  const nummer = hoofdstuk ? stand.nummer(hoofdstuk) : "";
  return (
    <section className="rapport-groep" data-sectie={id}>
      <div className="rapport-groep-kop">
        <h2>
          {nummer && <span className="rapport-nummer">{nummer}</span>}
          {titel}
        </h2>
        {hoofdstuk && <NieuwePagina id={hoofdstuk} />}
      </div>
      {intro && <p className="rapport-intro">{intro}</p>}
      {children}
    </section>
  );
}

const KOPTAGS = ["h3", "h4", "h5", "h6"] as const;

/**
 * De kop van een knoop uit de opzet, met het nummer dat hij in dit rapport
 * krijgt. Valt de knoop weg, dan staat dat erbij: zo zie je waarom de
 * nummering verderop verspringt.
 */
export function Kop({ id }: { id: string }) {
  const stand = useOpzetStand();
  const knoop = vindKnoop(id);
  const niveau = knoop?.niveau ?? 2;
  const Tag = KOPTAGS[niveau - 1];
  const nummer = stand.nummer(id);
  return (
    <div className={`rapport-kop-rij rapport-kop-${niveau}`}>
      <Tag className="rapport-kopregel">
        {nummer && <span className="rapport-nummer">{nummer}</span>}
        {knoop?.titel ?? id}
      </Tag>
      {stand.valtWeg(id) && (
        <span className="rapport-weg" title="Leeg of uitgezet: dit onderdeel komt niet in het rapport.">
          valt weg
        </span>
      )}
      {niveau <= 2 && <NieuwePagina id={id} />}
    </div>
  );
}

/**
 * Of een hoofdstuk of paragraaf op een nieuwe pagina begint. Zonder eigen
 * keuze geldt de standaard uit de opzet; een klik legt de keuze vast in dit
 * rapport.
 */
export function NieuwePagina({ id }: { id: string }) {
  const eigen = useProjectStore((s) => s.rapport.nieuwePagina[id]);
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const aan = eigen ?? vindKnoop(id)?.nieuwePagina ?? false;
  return (
    <label className="rapport-vink rapport-nieuwe-pagina">
      <input
        type="checkbox"
        checked={aan}
        onChange={(e) => zet(`nieuwePagina.${id}`, e.target.checked)}
      />
      begint op nieuwe pagina
    </label>
  );
}

// ─── Velden ────────────────────────────────────────────────────────────

/** Een tekstregel van het rapport, gebonden aan `pad`. */
export function Veld({ label, pad, waarde, hint, placeholder, lijst, eenheid }: {
  label: ReactNode;
  pad: string;
  waarde: string;
  hint?: ReactNode;
  placeholder?: string;
  /** Id van een <datalist> met suggesties; eigen tekst blijft mogelijk. */
  lijst?: string;
  eenheid?: string;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  return (
    <label className="rapport-veld">
      <span className="rapport-label">{label}</span>
      <span className="rapport-invoer">
        <input
          type="text"
          value={waarde}
          placeholder={placeholder}
          list={lijst}
          onChange={(e) => zet(pad, e.target.value)}
        />
        {eenheid && <span className="rapport-eenheid">{eenheid}</span>}
      </span>
      {hint && <span className="rapport-hint">{hint}</span>}
    </label>
  );
}

/**
 * Een keuzelijst van het rapport. Staat er een waarde die niet (meer) in de
 * lijst voorkomt — een constructeur die uit het bureau verdween — dan blijft
 * die zichtbaar, in plaats van stil op de eerste keuze te springen.
 */
export function Keuze({ label, pad, waarde, opties, hint }: {
  label: ReactNode;
  pad: string;
  waarde: string;
  opties: readonly Optie[];
  hint?: ReactNode;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const bekend = opties.some((o) => o.waarde === waarde);
  return (
    <label className="rapport-veld">
      <span className="rapport-label">{label}</span>
      <select value={waarde} onChange={(e) => zet(pad, e.target.value)}>
        {!bekend && <option value={waarde}>{waarde} (niet in de lijst)</option>}
        {opties.map((o) => (
          <option key={o.waarde} value={o.waarde}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="rapport-hint">{hint}</span>}
    </label>
  );
}

/** Een aan/uit-keuze van het rapport. */
export function Vink({ label, pad, aan, hint }: {
  label: ReactNode;
  pad: string;
  aan: boolean;
  hint?: ReactNode;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  return (
    <div className="rapport-veld">
      <label className="rapport-vink rapport-vink-sterk">
        <input type="checkbox" checked={aan} onChange={(e) => zet(pad, e.target.checked)} />
        {label}
      </label>
      {hint && <span className="rapport-hint">{hint}</span>}
    </div>
  );
}

/**
 * Zet een tekstvak op de hoogte van zijn inhoud. Eerst terug naar "auto",
 * anders kan het niet krimpen; dat maakt het paneel heel even korter en dan
 * springt de scrollpositie, dus die houden we vast. De 2 px zijn de randen
 * (box-sizing: border-box).
 */
function pasHoogteAan(el: HTMLTextAreaElement) {
  const paneel = el.closest(".rapport-panel");
  const scroll = paneel?.scrollTop ?? 0;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
  if (paneel) paneel.scrollTop = scroll;
}

/**
 * Een tekstvak dat meegroeit met zijn inhoud: een alinea van tien regels is
 * ook tien regels hoog, zodat je niet in een postzegel zit te scrollen.
 * Wordt het paneel smaller of breder, dan lopen de regels anders en past de
 * hoogte zich opnieuw aan.
 */
export function GroeiVeld({ waarde, onChange, placeholder, rijen = 2 }: {
  waarde: string;
  onChange: (waarde: string) => void;
  placeholder?: string;
  rijen?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (ref.current) pasHoogteAan(ref.current);
  }, [waarde]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Alleen op een andere breedte: de hoogte zetten we zelf, en daarop
    // reageren zou een lus geven.
    let breedte = el.clientWidth;
    const waarnemer = new ResizeObserver(() => {
      if (el.clientWidth === breedte) return;
      breedte = el.clientWidth;
      pasHoogteAan(el);
    });
    waarnemer.observe(el);
    return () => waarnemer.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      className="rapport-tekstvak"
      rows={rijen}
      value={waarde}
      placeholder={placeholder}
      spellCheck
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Een meegroeiend tekstvak gebonden aan `pad`. */
export function TekstVak({ pad, waarde, placeholder, rijen }: {
  pad: string;
  waarde: string;
  placeholder?: string;
  rijen?: number;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  return (
    <GroeiVeld waarde={waarde} onChange={(v) => zet(pad, v)} placeholder={placeholder} rijen={rijen} />
  );
}

// ─── Afgeleide waarden ─────────────────────────────────────────────────

export interface AfgeleideRegel {
  label: ReactNode;
  waarde: ReactNode;
  /** Normverwijzing of herkomst, klein en cursief erachter. */
  bron?: string;
}

/**
 * Waarden die volgen uit de projectgegevens of de norm: grijs en niet te
 * bewerken. Ze worden niet opgeslagen maar bij het opmaken opnieuw berekend,
 * zodat rapport en rekenbladen nooit uit de pas lopen.
 */
export function Afgeleid({ regels, uitProjectgegevens = false }: {
  regels: readonly AfgeleideRegel[];
  /** Toont een link naar de projectgegevens, waar deze waarden vandaan komen. */
  uitProjectgegevens?: boolean;
}) {
  return (
    <div className="rapport-afgeleid">
      <dl>
        {regels.map((r, i) => (
          <Fragment key={i}>
            <dt>{r.label}</dt>
            <dd>
              {r.waarde}
              {r.bron && <span className="rapport-bron">{r.bron}</span>}
            </dd>
          </Fragment>
        ))}
      </dl>
      {uitProjectgegevens && <NaarProjectgegevens />}
    </div>
  );
}

/** Springt naar het formulier Projectgegevens in de projectboom. */
export function NaarProjectgegevens() {
  const selecteer = useProjectStore((s) => s.selecteer);
  return (
    <button type="button" className="rapport-link" onClick={() => selecteer(PROJECT_ID)}>
      Wijzigen in Projectgegevens →
    </button>
  );
}
