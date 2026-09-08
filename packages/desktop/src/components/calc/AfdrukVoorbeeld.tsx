import { useCallback, useEffect, useRef, useState } from "react";
import { usePrintStore } from "../../store/printStore";
import { useUitdraai, PrintVoorblad, PrintBlad } from "./PrintDocument";
import { meetBlokken, verdeelInPaginas, pxPerMm, INHOUD } from "./paginering";
import "./PrintDocument.css";
import "./AfdrukVoorbeeld.css";

const ZOOMSTANDEN = [0.5, 0.75, 1, 1.25, 1.5];

/**
 * Afdrukvoorbeeld als paneel in de applicatie.
 *
 * De uitdraai wordt eerst op ware bladbreedte opgebouwd in een meetopstelling
 * buiten beeld. Daarna wordt hij opgemeten en in vellen verdeeld, en komen er
 * kopieën van de regels op losse A4-pagina's te staan. Kopieën, geen
 * verplaatsingen: de meetopstelling blijft van React, en die zou omvallen als
 * er nodes onder vandaan worden gehaald.
 *
 * Waarom niet gewoon de doorlopende uitdraai tonen: dan zie je niet waar het
 * papier ophoudt, en dat is juist wat je vooraf wilt weten.
 */
export default function AfdrukVoorbeeld() {
  const uitdraai = useUitdraai();
  const { bladen, projectNaam, projectNummer, onderdeel, datum } = uitdraai;
  const sluitVoorbeeld = usePrintStore((s) => s.sluitVoorbeeld);
  const afdrukken = usePrintStore((s) => s.afdrukken);

  const meetRef = useRef<HTMLDivElement>(null);
  const vellenRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.75);
  const [aantal, setAantal] = useState(0);
  const [bezig, setBezig] = useState(true);

  // Kopregels per vel: dezelfde als de loopkop van de echte afdruk.
  const linksBoven = (projectNummer ? `${projectNummer} · ` : "") + projectNaam;

  const bouwPaginas = useCallback(() => {
    const bron = meetRef.current;
    const host = vellenRef.current;
    if (!bron || !host) return;
    // Tijdens het printen verdwijnt de hoofdweergave, en daarmee dit paneel.
    // Meten levert dan overal nul op en de hele uitdraai zou op één pagina
    // belanden. Niets doen is beter: zodra het paneel terug is meet de
    // ResizeObserver opnieuw.
    if (bron.offsetHeight === 0) return;

    const mm = pxPerMm();
    const paginas = verdeelInPaginas(meetBlokken(bron), INHOUD.vulhoogte * mm);

    host.replaceChildren();
    paginas.forEach((pagina, i) => {
      const vel = document.createElement("div");
      vel.className = "av-pagina print-opmaak";

      const kop = document.createElement("div");
      kop.className = "av-loopkop";
      kop.innerHTML = "<span></span><span></span>";
      (kop.firstChild as HTMLElement).textContent = linksBoven;
      (kop.lastChild as HTMLElement).textContent = onderdeel ?? "";

      const voet = document.createElement("div");
      voet.className = "av-loopvoet";
      voet.innerHTML = "<span></span><span></span>";
      (voet.firstChild as HTMLElement).textContent = "Open Calculations Studio";
      (voet.lastChild as HTMLElement).textContent = datum;

      // De sectieklasse mee: de opmaakregels hangen eraan, en zonder die ouder
      // valt een losgeknipte regel terug op de schermopmaak.
      const inhoud = document.createElement("div");
      inhoud.className = `av-pagina-inhoud ${pagina[0]?.sectie ?? ""}`.trim();
      // Idem voor de wikkels waar de regels uit komen: de kern schrijft zijn
      // lettertype en regelafstand op `.ifc-calc`. Regels met dezelfde wikkels
      // gaan samen in één opgebouwde keten, zodat het er niet alleen goed
      // uitziet maar ook precies zo hoog blijft als bij het meten.
      let doel = inhoud;
      let vorigeWikkels = "";
      let eersteVanDezePagina = true;
      for (const blok of pagina) {
        const sleutel = blok.wikkels.join(" > ");
        if (sleutel !== vorigeWikkels) {
          doel = inhoud;
          for (const klasse of blok.wikkels) {
            const wikkel = document.createElement("div");
            wikkel.className = klasse;
            doel.appendChild(wikkel);
            doel = wikkel;
          }
          vorigeWikkels = sleutel;
        }
        const kloon = blok.el.cloneNode(true) as HTMLElement;
        // De bovenmarge van het eerste blok vervalt op een pagina-overgang. In
        // de doorlopende meting klapt die marge samen met die van het blok
        // erboven; bovenaan een vers vel is er niets om mee samen te klappen en
        // komt hij er als extra ruimte bij — genoeg om de onderste regel van
        // het vel af te duwen.
        if (eersteVanDezePagina) {
          kloon.style.marginTop = "0";
          eersteVanDezePagina = false;
        }
        doel.appendChild(kloon);
      }

      vel.append(kop, inhoud, voet);

      // Het nummer buiten het vel: het papier klemt af wat er niet op past, en
      // een bijschrift binnen die rand zou daar in meegaan.
      const nummer = document.createElement("div");
      nummer.className = "av-nummer";
      nummer.textContent = `Pagina ${i + 1} van ${paginas.length}`;

      const omhulsel = document.createElement("div");
      omhulsel.className = "av-vel";
      omhulsel.append(vel, nummer);
      host.appendChild(omhulsel);
    });

    setAantal(paginas.length);
    setBezig(false);
  }, [linksBoven, onderdeel, datum]);

  /*
   * Opnieuw verdelen zodra de opmaak verandert.
   *
   * De parametrische beelden meten hun eigen tekengebied en schalen zich pas
   * daarna; meteen verdelen zou op hoogtes gebeuren die een tel later niet meer
   * kloppen. Een ResizeObserver op de meetopstelling vangt elke wijziging op,
   * en een korte vertraging bundelt een reeks wijzigingen tot één verdeling.
   *
   * Bewust geen requestAnimationFrame: dat staat volledig stil zodra het
   * venster niet zichtbaar is. Het voorbeeld zou dan blijven hangen op
   * "pagina's opmaken" tot de gebruiker terugkomt.
   */
  useEffect(() => {
    const bron = meetRef.current;
    if (!bron) return;
    setBezig(true);

    let timer = 0;
    const plan = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(bouwPaginas, 120);
    };

    const ro = new ResizeObserver(plan);
    ro.observe(bron);
    plan();

    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [bouwPaginas, bladen]);

  return (
    <div className="av-paneel">
      <div className="av-balk">
        <span className="av-titel">Afdrukvoorbeeld</span>
        <span className="av-tel">
          {bezig ? "pagina's opmaken…" : `${aantal} pagina${aantal === 1 ? "" : "'s"}`}
        </span>
        <span className="av-rek" />
        <span className="av-zoom">
          <label htmlFor="av-zoom">Zoom</label>
          <select
            id="av-zoom"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          >
            {ZOOMSTANDEN.map((z) => (
              <option key={z} value={z}>{Math.round(z * 100)}%</option>
            ))}
          </select>
        </span>
        <button className="av-primair" onClick={afdrukken}>Afdrukken…</button>
        <button onClick={sluitVoorbeeld}>Sluiten</button>
      </div>

      <div className="av-vellen">
        <div className="av-vellen-binnen" ref={vellenRef} style={{ zoom }} />
      </div>

      {/* De meetopstelling: buiten beeld, op ware bladbreedte. */}
      <div className="av-meet print-opmaak" ref={meetRef} aria-hidden="true">
        <PrintVoorblad uitdraai={uitdraai} />
        {bladen.map(({ ex, html }, i) => (
          <PrintBlad key={ex.id} ex={ex} html={html} nummer={i + 1} />
        ))}
      </div>
    </div>
  );
}
