/**
 * Persoonlijke normbestanden blijven in de lokale applicatieopslag. Alleen
 * nummer, editie en bestandsnaam worden in de catalogus getoond; de PDF wordt
 * nooit aan een projectbestand of de broncode toegevoegd.
 */
export interface LokaleNorm {
  id: string;
  nummer: string;
  editie: string;
  bestandsnaam: string;
  toegevoegd: string;
  pdf: Blob;
}

const DATABASE = "open-calculations-lokale-normen";
const STORE = "normen";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lokale opslag niet beschikbaar"));
  });
}

function leesVerzoek<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Normbestand lezen mislukt"));
  });
}

function wachtOpTransactie(transactie: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transactie.oncomplete = () => resolve();
    transactie.onerror = () => reject(transactie.error ?? new Error("Lokale opslag mislukt"));
    transactie.onabort = () => reject(transactie.error ?? new Error("Lokale opslag afgebroken"));
  });
}

export async function lijstLokaleNormen(): Promise<Omit<LokaleNorm, "pdf">[]> {
  const database = await openDatabase();
  try {
    const transactie = database.transaction(STORE, "readonly");
    const items = await leesVerzoek<LokaleNorm[]>(transactie.objectStore(STORE).getAll());
    return items.map(({ pdf: _pdf, ...gegevens }) => gegevens)
      .sort((a, b) => a.nummer.localeCompare(b.nummer, "nl") || a.editie.localeCompare(b.editie, "nl"));
  } finally {
    database.close();
  }
}

export async function leesLokaleNorm(id: string): Promise<Blob | null> {
  const database = await openDatabase();
  try {
    const transactie = database.transaction(STORE, "readonly");
    const item = await leesVerzoek<LokaleNorm | undefined>(transactie.objectStore(STORE).get(id));
    return item?.pdf ?? null;
  } finally {
    database.close();
  }
}

export async function voegLokaleNormToe(nummer: string, editie: string, bestand: File): Promise<void> {
  const begin = new TextDecoder().decode(await bestand.slice(0, 5).arrayBuffer());
  if (begin !== "%PDF-") throw new Error("Kies een geldig PDF-bestand");
  if (bestand.size > 100 * 1024 * 1024) throw new Error("PDF is groter dan 100 MB");
  const database = await openDatabase();
  try {
    const transactie = database.transaction(STORE, "readwrite");
    const klaar = wachtOpTransactie(transactie);
    transactie.objectStore(STORE).put({
      id: crypto.randomUUID(),
      nummer: nummer.trim(),
      editie: editie.trim(),
      bestandsnaam: bestand.name,
      toegevoegd: new Date().toISOString(),
      pdf: bestand,
    } satisfies LokaleNorm);
    await klaar;
  } finally {
    database.close();
  }
}

export async function verwijderLokaleNorm(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transactie = database.transaction(STORE, "readwrite");
    const klaar = wachtOpTransactie(transactie);
    transactie.objectStore(STORE).delete(id);
    await klaar;
  } finally {
    database.close();
  }
}
