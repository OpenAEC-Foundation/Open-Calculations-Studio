/**
 * rapport-pdf — maakt zonder printdialoog een PDF van het constructierapport
 * van een projectbestand.
 *
 * Het script start een geïnstalleerde Chrome of Edge headless, stuurt die via
 * het DevTools-protocol aan (met de ingebouwde WebSocket van Node, dus zonder
 * extra afhankelijkheden), laadt het project in de draaiende dev-server en laat
 * de browser de afdruk als PDF wegschrijven. De PDF is daarmee precies wat
 * "Rapport (PDF)" in de app oplevert: dezelfde componenten, dezelfde CSS en
 * dezelfde paginering door Chromium.
 *
 * Gebruik:
 *   node scripts/rapport-pdf.mjs <projectbestand> <uit.pdf>
 *        [--bureau profiel.json] [--url http://localhost:3021] [--browser <pad>]
 *
 *   --bureau   een bureauprofiel (JSON in de vorm van BureauProfiel); komt in
 *              rapport.bureau, zodat huisstijl en voet van dat profiel gelden.
 *   --url      de dev-server; standaard http://localhost:3021.
 *   --browser  chrome.exe of msedge.exe; standaard de eerste die bestaat van
 *              Chrome en Edge op hun gewone installatieplek.
 *
 * Vereist:
 *   • een draaiende dev-server: npm --prefix packages/desktop run dev. Het script
 *     gebruikt de haak `window.__ocs` uit main.tsx, die alleen in dev bestaat.
 *   • een gebouwde core: npm --prefix packages/core run build. De app laadt
 *     packages/core/dist; zonder die map blijft de pagina leeg.
 *   • netwerk voor de lettertypen uit index.html, anders vallen ze terug.
 *
 * Valkuilen die het script afvangt:
 *   • Vite luistert alleen op ::1, dus localhost en niet 127.0.0.1. DevTools
 *     zelf luistert juist op 127.0.0.1.
 *   • De afdruk ruimt zichzelf op: App.tsx roept 250 ms na het starten
 *     window.print() aan en daarna klaar(), waarmee de afdrukweergave weer
 *     verdwijnt. Headless keert print() meteen terug. Daarom worden klaar en
 *     window.print eerst op een no-op gezet.
 *   • Een eigen import("/src/store/…") kan na een hot update een tweede
 *     store-exemplaar laden (met ?t=… in de URL) dat de app nooit leest. Via
 *     __ocs gebruikt het script de exemplaren die de app zelf gebruikt.
 *   • De headless pagina is een extra HMR-client: wijzig geen bronbestanden
 *     terwijl het script loopt, anders herlaadt Vite de pagina halverwege.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const GEBRUIK =
  "gebruik: node scripts/rapport-pdf.mjs <projectbestand> <uit.pdf> " +
  "[--bureau profiel.json] [--url http://localhost:3021] [--browser <pad>]";

/** Een fout met een uitleg voor de gebruiker: gemeld zonder stacktrace. */
class Stop extends Error {}
const stop = (tekst) => {
  throw new Stop(tekst);
};
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (tekst) => console.log(`[${(performance.now() / 1000).toFixed(1)} s] ${tekst}`);

/** Meldingen uit de pagina (fouten, mislukte modules); ze helpen bij een lege app. */
const meldingen = [];

function leesArgumenten(argv) {
  const los = [];
  const opties = { bureau: null, url: "http://localhost:3021", browser: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") opties.help = true;
    else if (a === "--bureau" || a === "--url" || a === "--browser") {
      const w = argv[++i];
      if (w === undefined || w.startsWith("--")) stop(`${a} verwacht een waarde.\n${GEBRUIK}`);
      opties[a.slice(2)] = w;
    } else if (a.startsWith("--")) stop(`onbekende optie ${a}.\n${GEBRUIK}`);
    else los.push(a);
  }
  if (opties.help) return { ...opties, project: null, uit: null };
  if (los.length !== 2) stop(`verwacht een projectbestand en een uitvoerbestand.\n${GEBRUIK}`);
  return { ...opties, project: resolve(los[0]), uit: resolve(los[1]) };
}

/** Alles wat vóór het starten van een browser te controleren is. */
async function controleerVooraf(o) {
  if (!existsSync(o.project)) stop(`projectbestand ${o.project} bestaat niet.`);
  if (!existsSync(join(REPO, "packages/core/dist/index.js"))) {
    stop("packages/core/dist ontbreekt: bouw eerst de core met `npm --prefix packages/core run build`. " +
      "Zonder die map blijft de app leeg.");
  }
  const browser = o.browser ?? BROWSERS.find((p) => existsSync(p));
  if (!browser) stop(`geen Chrome of Edge gevonden op ${BROWSERS.join(" of ")}; geef er een op met --browser.`);
  if (!existsSync(browser)) stop(`--browser ${browser} bestaat niet.`);

  let url;
  try {
    url = new URL(o.url);
  } catch {
    stop(`--url ${o.url} is geen geldige URL.`);
  }
  let antwoord;
  try {
    antwoord = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    const tip = url.hostname === "127.0.0.1" ? " Vite luistert alleen op ::1; gebruik http://localhost:3021." : "";
    stop(`geen dev-server op ${url.href}: start hem met \`npm --prefix packages/desktop run dev\`.${tip}`);
  }
  const html = await antwoord.text();
  if (!antwoord.ok || !html.includes('id="root"')) stop(`${url.href} geeft geen app-pagina (status ${antwoord.status}).`);

  let bureau = null;
  if (o.bureau) {
    if (!existsSync(o.bureau)) stop(`--bureau ${o.bureau} bestaat niet.`);
    try {
      bureau = JSON.parse(readFileSync(o.bureau, "utf8"));
    } catch (e) {
      stop(`--bureau ${o.bureau} is geen geldige JSON: ${e.message}`);
    }
    if (!bureau || typeof bureau !== "object" || Array.isArray(bureau)) stop(`--bureau ${o.bureau} bevat geen profiel (object).`);
  }

  const raw = readFileSync(o.project, "utf8");
  try {
    if (!JSON.parse(raw).project) log(`let op: ${basename(o.project)} heeft geen "project"; de app opent het als los blad.`);
  } catch {
    log(`let op: ${basename(o.project)} is geen JSON; de app opent het als losse rekentekst.`);
  }
  return { browser, url: url.href, bureau, raw };
}

/** Start de browser met een eigen, tijdelijk profiel en een vrije debugpoort. */
function startBrowser(pad, profiel) {
  const proc = spawn(pad, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profiel}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1280,900",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const b = { proc, stderr: "", fout: null, gestopt: false };
  proc.stderr.on("data", (d) => {
    b.stderr = (b.stderr + d).slice(-4000);
  });
  b.einde = new Promise((r) => {
    proc.on("exit", (code) => {
      b.gestopt = true;
      r(code);
    });
    proc.on("error", (e) => {
      b.fout = e;
      b.gestopt = true;
      r(null);
    });
  });
  return b;
}

/** De poort die de browser koos, uit <profiel>/DevToolsActivePort. */
async function debugPoort(b, profiel) {
  const bestand = join(profiel, "DevToolsActivePort");
  for (let i = 0; i < 150; i++) {
    if (b.fout) stop(`kan de browser niet starten: ${b.fout.message}`);
    if (b.gestopt) stop(`de browser stopte meteen.\n${b.stderr.trim()}`);
    if (existsSync(bestand)) {
      const poort = Number(readFileSync(bestand, "utf8").split(/\r?\n/)[0]);
      if (poort > 0) return poort;
    }
    await wacht(100);
  }
  stop(`de browser gaf binnen 15 s geen debugpoort.\n${b.stderr.trim()}`);
}

/** Minimale DevTools-client: commando's met antwoord, en luisteraars voor gebeurtenissen. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.volgende = 0;
    this.open = new Map();
    this.luisteraars = new Set();
    ws.addEventListener("message", (ev) => {
      const b = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString("utf8"));
      if (b.id !== undefined) {
        const w = this.open.get(b.id);
        if (!w) return;
        this.open.delete(b.id);
        if (b.error) w.nee(new Stop(`${w.methode} mislukte: ${b.error.message}`));
        else w.ja(b.result);
      } else {
        for (const f of [...this.luisteraars]) f(b);
      }
    });
    ws.addEventListener("close", () => {
      for (const w of this.open.values()) w.nee(new Stop("de verbinding met de browser is verbroken."));
      this.open.clear();
    });
  }

  static async verbind(url) {
    const ws = new WebSocket(url);
    await new Promise((ja, nee) => {
      ws.addEventListener("open", ja, { once: true });
      ws.addEventListener("error", () => nee(new Stop(`geen verbinding met ${url}.`)), { once: true });
    });
    return new Cdp(ws);
  }

  stuur(methode, params = {}, sessionId) {
    const id = ++this.volgende;
    this.ws.send(JSON.stringify(sessionId ? { id, method: methode, params, sessionId } : { id, method: methode, params }));
    return new Promise((ja, nee) => this.open.set(id, { ja, nee, methode }));
  }

  wachtOp(filter, ms, wat) {
    return new Promise((ja, nee) => {
      const f = (b) => {
        if (!filter(b)) return;
        klaar();
        ja(b);
      };
      const t = setTimeout(() => {
        klaar();
        nee(new Stop(`${wat} bleef na ${ms / 1000} s uit.`));
      }, ms);
      const klaar = () => {
        clearTimeout(t);
        this.luisteraars.delete(f);
      };
      this.luisteraars.add(f);
    });
  }

  sluit() {
    try {
      this.ws.close();
    } catch {
      // al dicht
    }
  }
}

async function hoofd() {
  const o = leesArgumenten(process.argv.slice(2));
  if (o.help) {
    console.log(GEBRUIK);
    return;
  }
  const { browser: browserPad, url, bureau, raw } = await controleerVooraf(o);
  mkdirSync(dirname(o.uit), { recursive: true });

  const profiel = mkdtempSync(join(tmpdir(), "rapport-pdf-"));
  let browser = null;
  let cdp = null;
  try {
    browser = startBrowser(browserPad, profiel);
    const poort = await debugPoort(browser, profiel);
    const versie = await (await fetch(`http://127.0.0.1:${poort}/json/version`)).json();
    cdp = await Cdp.verbind(versie.webSocketDebuggerUrl);
    log(`${basename(browserPad)} gestart (${versie.Browser})`);

    // Eén tabblad, met een platte sessie: elk paginacommando draagt die sessionId.
    const { targetId } = await cdp.stuur("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.stuur("Target.attachToTarget", { targetId, flatten: true });
    const pagina = (methode, params) => cdp.stuur(methode, params, sessionId);
    cdp.luisteraars.add((b) => {
      if (b.sessionId !== sessionId) return;
      if (b.method === "Runtime.exceptionThrown") {
        const d = b.params.exceptionDetails;
        meldingen.push(`uitzondering: ${d.exception?.description ?? d.text}`);
      } else if (b.method === "Runtime.consoleAPICalled" && b.params.type === "error") {
        meldingen.push(`console.error: ${b.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
      } else if (b.method === "Log.entryAdded" && b.params.entry.level === "error") {
        // Een module die niet laadt (404) verschijnt alleen hier.
        const e = b.params.entry;
        meldingen.push(`${e.source}: ${e.text}${e.url ? ` (${e.url})` : ""}`);
      }
    });
    await pagina("Page.enable");
    await pagina("Runtime.enable");
    await pagina("Log.enable");

    const evalueer = async (expressie, wat) => {
      const r = await pagina("Runtime.evaluate", { expression: expressie, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) {
        stop(`${wat} mislukte in de pagina: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      }
      return r.result.value;
    };
    const wachtTot = async (expressie, ms, fout) => {
      const tot = performance.now() + ms;
      while (performance.now() < tot) {
        if (await evalueer(expressie, "wachten")) return;
        await wacht(100);
      }
      stop(fout);
    };

    const geladen = cdp.wachtOp((b) => b.sessionId === sessionId && b.method === "Page.loadEventFired", 30000, "het laden van de app");
    const nav = await pagina("Page.navigate", { url });
    if (nav.errorText) stop(`${url} laden mislukte: ${nav.errorText}.`);
    await geladen;
    await wachtTot("(document.getElementById('root')?.childElementCount ?? 0) > 0", 20000,
      "de app verscheen niet (#root bleef leeg). Meestal ontbreekt packages/core/dist of laadt een module niet; zie de meldingen.");
    await wachtTot("typeof window.__ocs === 'object' && window.__ocs !== null", 5000,
      "window.__ocs ontbreekt. main.tsx zet die haak alleen in de dev-server (import.meta.env.DEV); " +
      "draait er een productie-build, of een versie van vóór de haak?");
    log("app geladen");

    const geladenProject = await evalueer(`(() => {
      const { useProjectStore, leesProjectBestand } = window.__ocs;
      useProjectStore.getState().laadProject(leesProjectBestand(${JSON.stringify(raw)}, ${JSON.stringify(basename(o.project, extname(o.project)))}));
      const bureau = ${JSON.stringify(bureau)};
      if (bureau) {
        // Het profiel wordt de vastgelegde kopie van dit rapport, net als
        // "Bijwerken uit bureauprofiel"; ontbrekende velden houden hun waarde.
        useProjectStore.getState().werkRapportBij((r) => ({
          ...r,
          bureau: { ...r.bureau, ...bureau, huisstijl: { ...r.bureau.huisstijl, ...(bureau.huisstijl ?? {}) } },
        }));
      }
      const s = useProjectStore.getState();
      return {
        naam: s.projectNaam,
        bladen: s.exemplaren.length,
        rapport: !!s.rapport && typeof s.rapport === "object",
        bureau: s.rapport?.bureau?.naam ?? "",
      };
    })()`, "het project laden");
    if (!geladenProject.rapport) stop("na het laden heeft het project geen rapport; heeft de dev-server de rapportstore al?");
    log(`project "${geladenProject.naam}" geladen: ${geladenProject.bladen} bladen` +
      (geladenProject.bureau ? `, bureau "${geladenProject.bureau}"` : ", bureau uit het live profiel"));

    await evalueer(`(() => {
      const { usePrintStore } = window.__ocs;
      // App.tsx roept na 250 ms window.print() en daarna klaar() aan; klaar()
      // haalt de afdrukweergave weg. Beide uit, dan blijft hij staan tot de PDF er is.
      usePrintStore.setState({ klaar: () => {} });
      window.print = () => {};
      usePrintStore.getState().afdrukken(null, "rapport");
      return true;
    })()`, "het afdrukken starten");
    await wachtTot("!!document.querySelector('.print-root .rpa-wortel')", 15000,
      "de afdrukweergave van het rapport (.print-root .rpa-wortel) verscheen niet. Rendert afdrukken(null, \"rapport\") het rapport? " +
      "Kreeg de app net een hot update, herstart dan de dev-server.");

    const staat = await evalueer(`(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll(".print-root img")]
        .map((b) => (b.complete ? null : b.decode().catch(() => null))));
      // De parametrische beelden meten zich met een ResizeObserver: die vuurt
      // pas na een opmaakronde. Twee frames plus een halve seconde; zonder
      // zichtbaar venster valt requestAnimationFrame terug op de timer.
      await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 1000); });
      await new Promise((r) => setTimeout(r, 500));
      const wortel = document.querySelector(".print-root .rpa-wortel");
      return {
        afdrukmodus: document.documentElement.classList.contains("afdrukmodus"),
        secties: wortel ? wortel.querySelectorAll("section").length : 0,
        tekens: wortel ? wortel.innerText.length : 0,
        lettertypen: [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family))],
      };
    })()`, "wachten op lettertypen en beelden");
    if (!staat.afdrukmodus) stop("html.afdrukmodus staat niet meer aan: de afdrukweergave is al gesloten.");
    if (staat.tekens === 0) stop("de afdrukweergave van het rapport is leeg.");
    log(`afdrukweergave klaar: ${staat.secties} secties, lettertypen ${staat.lettertypen.join(", ") || "(systeem)"}`);

    // Als stroom: een rapport met twintig bladen en beelden past niet prettig
    // in één base64-antwoord.
    const { stream } = await pagina("Page.printToPDF", {
      preferCSSPageSize: true,
      printBackground: true,
      transferMode: "ReturnAsStream",
    });
    const delen = [];
    for (;;) {
      const { data, base64Encoded, eof } = await pagina("IO.read", { handle: stream, size: 1 << 20 });
      delen.push(Buffer.from(data, base64Encoded ? "base64" : "utf8"));
      if (eof) break;
    }
    await pagina("IO.close", { handle: stream });
    const pdf = Buffer.concat(delen);
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") stop("de browser gaf geen PDF terug.");
    writeFileSync(o.uit, pdf);
    const paginas = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
    log(`PDF geschreven: ${o.uit} (${paginas} pagina's, ${Math.round(pdf.length / 1024)} kB)`);
  } finally {
    if (cdp) {
      await Promise.race([cdp.stuur("Browser.close").catch(() => {}), wacht(3000)]);
      cdp.sluit();
    }
    if (browser && !browser.gestopt) {
      const code = await Promise.race([browser.einde, wacht(10000).then(() => "loopt nog")]);
      if (code === "loopt nog") browser.proc.kill();
      await wacht(300);
    }
    try {
      rmSync(profiel, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (e) {
      console.warn(`let op: tijdelijk browserprofiel ${profiel} kon niet weg: ${e.message}`);
    }
  }
}

try {
  await hoofd();
} catch (e) {
  if (e instanceof Stop) console.error(`rapport-pdf: ${e.message}`);
  else console.error(`rapport-pdf: onverwachte fout: ${e?.stack ?? e}`);
  if (meldingen.length) {
    console.error("meldingen uit de pagina:");
    for (const m of meldingen.slice(0, 15)) console.error(`  - ${m.slice(0, 400)}`);
  }
  process.exitCode = 1;
}
