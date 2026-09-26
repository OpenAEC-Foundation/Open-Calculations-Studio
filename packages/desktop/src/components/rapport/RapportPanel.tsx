import { useRef } from "react";
import DocumentSectie from "./paneel/DocumentSectie";
import HoofdstukTeksten from "./paneel/HoofdstukTeksten";
import RevisieSectie from "./paneel/RevisieSectie";
import { OpzetBron } from "./paneel/velden";
import "./RapportPanel.css";

/**
 * Het rapportpaneel: één scrollend formulier met alles wat in het
 * constructierapport komt en niet al in de projectgegevens of de rekenbladen
 * staat.
 *
 * Wat je hier invult hoort bij het project: het gaat mee in het
 * projectbestand en in ongedaan maken. Grijze waarden volgen uit de
 * projectgegevens of de norm en worden pas bij het opmaken berekend, zodat
 * rapport en rekenbladen nooit uit de pas lopen. De tab Afdrukvoorbeeld
 * ernaast toont het hele rapport.
 */

/** De secties in volgorde, voor de sprongbalk bovenaan. */
const SECTIES: readonly [id: string, label: string][] = [
  ["document", "Document"],
  ["revisies", "Revisies"],
  ["teksten", "Hoofdstukken 1–3"],
];

export default function RapportPanel() {
  const paneelRef = useRef<HTMLDivElement>(null);

  const naarSectie = (id: string) =>
    paneelRef.current
      ?.querySelector(`[data-sectie="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="rapport-panel" ref={paneelRef}>
      <div className="rapport-kop">
        <h1>Rapport</h1>
        <p>
          Documentgegevens, teksten, uitgangspunten en belastingen van het constructierapport. Alles
          hier hoort bij het project en gaat mee in opslaan en ongedaan maken. Grijze waarden komen uit
          de projectgegevens of de norm.
        </p>
      </div>

      <nav className="rapport-nav" aria-label="Secties van het rapport">
        {SECTIES.map(([id, label]) => (
          <button key={id} type="button" onClick={() => naarSectie(id)}>
            {label}
          </button>
        ))}
      </nav>

      <OpzetBron>
        <DocumentSectie />
        <RevisieSectie />
        <HoofdstukTeksten />
      </OpzetBron>

      <p className="rapport-voet">
        Het bureauprofiel — naam, logo, huisstijl en constructeurs — staat bij Instellingen → Bureau.
        Rapport (PDF) in het lint drukt het hele rapport af; PDF blad blijft één losse berekening.
      </p>
    </div>
  );
}
