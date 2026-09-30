import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  lijstLokaleNormen,
  leesLokaleNorm,
  voegLokaleNormToe,
  verwijderLokaleNorm,
  type LokaleNorm,
} from "../../normen/lokaleNormen";

type NormGegevens = Omit<LokaleNorm, "pdf">;

/** Persoonlijke PDF-catalogus; documenten verlaten de lokale opslag niet. */
export default function LokaleNormen({ zoek }: { zoek: string }) {
  const [items, setItems] = useState<NormGegevens[]>([]);
  const [nummer, setNummer] = useState("");
  const [editie, setEditie] = useState("");
  const [bestand, setBestand] = useState<File | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [weergave, setWeergave] = useState<{ url: string; titel: string; bestandsnaam: string } | null>(null);
  const bestandVeld = useRef<HTMLInputElement>(null);

  const ververs = async () => setItems(await lijstLokaleNormen());
  useEffect(() => {
    void ververs().catch((error: unknown) => setFout((error as Error).message));
  }, []);
  useEffect(() => () => { if (weergave) URL.revokeObjectURL(weergave.url); }, [weergave]);

  const gefilterd = useMemo(() => {
    const tekst = zoek.trim().toLocaleLowerCase("nl");
    return items.filter((item) =>
      `${item.nummer} ${item.editie} ${item.bestandsnaam}`.toLocaleLowerCase("nl").includes(tekst));
  }, [items, zoek]);

  const toevoegen = async (event: FormEvent) => {
    event.preventDefault();
    if (!nummer.trim() || !editie.trim() || !bestand) return;
    setBezig(true);
    setFout("");
    try {
      await voegLokaleNormToe(nummer, editie, bestand);
      await ververs();
      setNummer("");
      setEditie("");
      setBestand(null);
      if (bestandVeld.current) bestandVeld.current.value = "";
    } catch (error) {
      setFout((error as Error).message);
    } finally {
      setBezig(false);
    }
  };

  const tonen = async (item: NormGegevens) => {
    setFout("");
    try {
      const pdf = await leesLokaleNorm(item.id);
      if (!pdf) throw new Error("PDF is niet meer beschikbaar");
      setWeergave({ url: URL.createObjectURL(pdf), titel: `${item.nummer} — ${item.editie}`, bestandsnaam: item.bestandsnaam });
    } catch (error) {
      setFout((error as Error).message);
    }
  };

  const verwijderen = async (item: NormGegevens) => {
    if (!confirm(`${item.nummer} (${item.editie}) uit de lokale bibliotheek verwijderen?`)) return;
    setFout("");
    try {
      await verwijderLokaleNorm(item.id);
      await ververs();
      setWeergave(null);
    } catch (error) {
      setFout((error as Error).message);
    }
  };

  if (weergave) {
    return (
      <div className="mk-normen mk-normen-lezer">
        <button type="button" className="mk-norm-terug" onClick={() => setWeergave(null)}>← Normbestanden</button>
        <strong>{weergave.titel}</strong>
        <p>Open de lokale PDF in een nieuw tabblad. Als de browser geen PDF-weergave heeft, kun je het bestand downloaden.</p>
        <div className="mk-norm-acties">
          <a href={weergave.url} target="_blank" rel="noopener noreferrer">PDF openen ↗</a>
          <a href={weergave.url} download={weergave.bestandsnaam}>PDF downloaden</a>
        </div>
      </div>
    );
  }

  return (
    <div className="mk-normen">
      <p className="mk-norm-uitleg">Koppel je eigen norm-PDF's aan nummer en editie. De bestanden blijven in de lokale opslag van deze app en komen niet in het projectbestand.</p>
      <form className="mk-norm-formulier" onSubmit={(event) => void toevoegen(event)}>
        <label>Normnummer<input value={nummer} onChange={(event) => setNummer(event.target.value)} placeholder="Bijv. NEN-EN 1990" required /></label>
        <label>Editie<input value={editie} onChange={(event) => setEditie(event.target.value)} placeholder="Jaar en bijlage" required /></label>
        <label>PDF-bestand<input ref={bestandVeld} type="file" accept=".pdf,application/pdf" onChange={(event) => setBestand(event.target.files?.[0] ?? null)} required /></label>
        <button type="submit" className="settings-btn settings-btn-primary" disabled={bezig || !bestand}>Toevoegen</button>
      </form>
      {fout && <p className="mk-norm-fout" role="alert">{fout}</p>}
      <div className="mk-norm-lijst">
        {gefilterd.length === 0 && <p className="mk-leeg">{items.length ? "Geen normbestand gevonden." : "Nog geen lokale normbestanden gekoppeld."}</p>}
        {gefilterd.map((item) => (
          <div className="mk-norm-regel" key={item.id}>
            <div><strong>{item.nummer}</strong><span>{item.editie} · {item.bestandsnaam}</span></div>
            <button type="button" onClick={() => void tonen(item)}>Open PDF</button>
            <button type="button" onClick={() => void verwijderen(item)} aria-label={`${item.nummer} verwijderen`}>Verwijder</button>
          </div>
        ))}
      </div>
    </div>
  );
}
