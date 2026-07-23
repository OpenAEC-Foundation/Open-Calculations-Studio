# VIBRO-paal PDF-digitalisering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw een VIBRO-palentool die één sonderingscurve uit een PDF digitaliseert, automatisch `qc;I`, `qc;II`, `qc;III`, `qc;z;a` en `Rc;net;d` berekent, en een zelfstandige Calcpad-rekensheet opslaat.

**Architecture:** De PDF- en beeldverwerking blijft in de desktoppackage; de numerieke digitalisering, trajectselectie en geotechnische formules worden ondergebracht in kleine, pure TypeScript-modules. Een React-ontwerper biedt kalibratie en visuele controle, waarna een generator de gecontroleerde meetpunten en invoer als zelfstandige Calcpad-bron in het bestaande documentmodel laadt.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Zustand, `pdfjs-dist`, browser Canvas API, Vitest, bestaande `@ifc-calc/core` parser/evaluator en Tauri file/dialog-plug-ins.

## Global Constraints

- Versie 1 verwerkt exact één sondering per rekensheet.
- Eerste referentiegeval: sondering 1, schacht Ø323 mm, voet Ø365 mm, NAP -18,50 m tot en met -22,00 m in stappen van 0,50 m.
- De eindwaarde is `Rc;net;d`; negatieve kleef is geen optionele narekening.
- Geen extrapolatie buiten het gedigitaliseerde dieptebereik.
- Kalibratie, gedigitaliseerde meetpunten en invoer moeten in de gegenereerde sheet worden opgeslagen.
- Repo-content bevat geen namen van externe rekensoftware en geen verwijzingen naar conversatiegeschiedenis.
- De bestaande Windows-bundelconfiguratie en meegeleverde WebView2-loader blijven ongewijzigd en behouden.

---

## Bestandsstructuur

Nieuwe modules worden per verantwoordelijkheid gesplitst:

- `packages/desktop/src/vibro/types.ts` — gedeelde, seriële datamodellen.
- `packages/desktop/src/vibro/calibration.ts` — pixel/waarde-transformaties.
- `packages/desktop/src/vibro/curveDigitizer.ts` — curve-extractie uit RGBA-pixels.
- `packages/desktop/src/vibro/geotechnical.ts` — trajecten en draagkracht.
- `packages/desktop/src/vibro/pdfPage.ts` — PDF laden en pagina naar canvas renderen.
- `packages/desktop/src/vibro/sheetGenerator.ts` — zelfstandige Calcpad-bron.
- `packages/desktop/src/vibro/referenceCase.ts` — eerste testconfiguratie en referentiewaarden.
- `packages/desktop/src/components/calc/VibroPileDesigner.tsx` — gebruikersstroom.
- `packages/desktop/src/components/calc/VibroPileDesigner.css` — gerichte opmaak.
- `packages/desktop/src/vibro/*.test.ts` — tests naast de pure modules.

Gewijzigde integratiebestanden:

- `packages/desktop/package.json`
- `packages/desktop/src/App.tsx`
- `packages/desktop/src/templates/index.ts`
- `packages/desktop/src/components/calc/projectTree.ts`

---

### Task 1: Testinfrastructuur en gedeelde modellen

**Files:**
- Modify: `packages/desktop/package.json`
- Create: `packages/desktop/src/vibro/types.ts`
- Create: `packages/desktop/src/vibro/types.test.ts`

**Interfaces:**
- Produces: `DigitizedCptPoint`, `CptCalibration`, `PlotBoundsPx`, `NegativeSkinLayer`, `VibroPileInput`, `QcAverages`, `PileResistanceResult`, `DigitizationResult`.

- [ ] **Step 1: Voeg Vitest toe en schrijf een falende serialisatietest**

Voeg scripts en dependency toe:

```json
"test": "vitest run",
"test:watch": "vitest"
```

```json
"vitest": "^3.2.4"
```

Maak `types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { CptCalibration } from "./types";

describe("CptCalibration", () => {
  it("blijft volledig JSON-serialiseerbaar", () => {
    const value: CptCalibration = {
      pageIndex: 0,
      plotBoundsPx: { left: 100, top: 50, right: 900, bottom: 1450 },
      qcMinMpa: 0,
      qcMaxMpa: 20,
      depthTopNapM: 0,
      depthBottomNapM: -37,
    };
    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });
});
```

- [ ] **Step 2: Run de test en bevestig de typefout**

Run: `npm --prefix packages/desktop test -- src/vibro/types.test.ts`

Expected: FAIL omdat `./types` nog niet bestaat.

- [ ] **Step 3: Definieer de minimale modellen**

Gebruik uitsluitend `number`, `string`, `boolean` en arrays/objects daarvan. Definieer onder meer:

```ts
export interface DigitizedCptPoint {
  depthNapM: number;
  qcMpa: number;
  confidence: number;
}

export interface PlotBoundsPx {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CptCalibration {
  pageIndex: number;
  plotBoundsPx: PlotBoundsPx;
  qcMinMpa: number;
  qcMaxMpa: number;
  depthTopNapM: number;
  depthBottomNapM: number;
}
```

Neem in `VibroPileInput` expliciet diameters, niveaus, `alphaP`, `alphaS`,
`beta`, `shapeFactor`, `xiSingleCpt`, `gammaB`, `gammaS`, `designLoadKn`,
positieve-kleefgrenzen en `negativeSkinLayers` op.

- [ ] **Step 4: Run test en typecheck**

Run: `npm --prefix packages/desktop test -- src/vibro/types.test.ts`

Expected: PASS.

Run: `npm --prefix packages/desktop run build`

Expected: bestaande build blijft slagen.

- [ ] **Step 5: Commit**

```powershell
git add packages/desktop/package.json package-lock.json packages/desktop/src/vibro/types.ts packages/desktop/src/vibro/types.test.ts
git commit -m "test: voeg VIBRO-rekenmodellen toe"
```

---

### Task 2: Kalibratie van PDF-pixels naar qc en NAP

**Files:**
- Create: `packages/desktop/src/vibro/calibration.ts`
- Create: `packages/desktop/src/vibro/calibration.test.ts`

**Interfaces:**
- Consumes: `CptCalibration` uit `types.ts`.
- Produces: `pixelToQc(xPx, calibration): number`, `pixelToDepthNap(yPx, calibration): number`, `qcToPixel(qcMpa, calibration): number`, `depthNapToPixel(depthNapM, calibration): number`, `validateCalibration(calibration): string[]`.

- [ ] **Step 1: Schrijf falende transformatie- en validatietests**

```ts
expect(pixelToQc(500, calibration)).toBeCloseTo(10, 8);
expect(pixelToDepthNap(750, calibration)).toBeCloseTo(-18.5, 8);
expect(qcToPixel(10, calibration)).toBeCloseTo(500, 8);
expect(depthNapToPixel(-18.5, calibration)).toBeCloseTo(750, 8);
expect(validateCalibration({ ...calibration, qcMaxMpa: 0 }))
  .toContain("qcMaxMpa moet groter zijn dan qcMinMpa");
```

- [ ] **Step 2: Run en bevestig FAIL**

Run: `npm --prefix packages/desktop test -- src/vibro/calibration.test.ts`

Expected: FAIL door ontbrekende exports.

- [ ] **Step 3: Implementeer lineaire transformaties en harde grenzen**

Gebruik:

```ts
const tx = (xPx - left) / (right - left);
const qc = qcMinMpa + tx * (qcMaxMpa - qcMinMpa);
const ty = (yPx - top) / (bottom - top);
const depth = depthTopNapM + ty * (depthBottomNapM - depthTopNapM);
```

Validatie controleert eindige waarden, positieve pixelbreedte/-hoogte,
oplopende `qc`-schaal en verschillende diepteniveaus.

- [ ] **Step 4: Run tests**

Run: `npm --prefix packages/desktop test -- src/vibro/calibration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/desktop/src/vibro/calibration.ts packages/desktop/src/vibro/calibration.test.ts
git commit -m "feat: kalibreer sonderingsdiagram"
```

---

### Task 3: Robuuste curvedigitalisering

**Files:**
- Create: `packages/desktop/src/vibro/curveDigitizer.ts`
- Create: `packages/desktop/src/vibro/curveDigitizer.test.ts`

**Interfaces:**
- Consumes: `ImageDataLike = { width: number; height: number; data: Uint8ClampedArray }`, `CptCalibration`.
- Produces: `digitizeQcCurve(image, calibration, options?): DigitizationResult`.

- [ ] **Step 1: Maak synthetische beelden en schrijf falende tests**

De test maakt een wit raster met grijze verticale rasterlijnen en een donkere,
doorlopende curve van 4 naar 12 MPa. Controleer:

```ts
const result = digitizeQcCurve(image, calibration);
expect(result.points.length).toBeGreaterThan(100);
expect(result.coverage).toBeGreaterThan(0.95);
expect(result.points.at(0)?.qcMpa).toBeCloseTo(4, 0);
expect(result.points.at(-1)?.qcMpa).toBeCloseTo(12, 0);
```

Voeg een tweede test toe met een onderbreking van drie pixels en verwacht
interpolatie met `confidence < 1`.

- [ ] **Step 2: Run en bevestig FAIL**

Run: `npm --prefix packages/desktop test -- src/vibro/curveDigitizer.test.ts`

Expected: FAIL door ontbrekende digitaliseerder.

- [ ] **Step 3: Implementeer kandidaatdetectie en doorlopende route**

Per beeldrij:

- bepaal donkere kandidaatpixels binnen `plotBoundsPx`;
- onderdruk kolommen die over meer dan 70% van de beeldhoogte donker zijn;
- scoor kandidaten op donkerte en afstand tot de vorige gekozen x;
- accepteer een sprong tot `maxJumpPx`, standaard 24;
- interpoleer maximaal `maxGapRows`, standaard 5;
- aggregeer naar één punt per 20 mm diepte om ruis te beperken.

Retourneer `points`, `coverage`, `warnings` en `uncertainDepthRanges`.

- [ ] **Step 4: Voeg foutgevallen toe**

Test een leeg beeld en een curve die ontbreekt in een relevant middengebied.
Verwacht respectievelijk `coverage === 0` en een waarschuwing met het
ontbrekende dieptebereik.

- [ ] **Step 5: Run tests en commit**

Run: `npm --prefix packages/desktop test -- src/vibro/curveDigitizer.test.ts`

Expected: PASS.

```powershell
git add packages/desktop/src/vibro/curveDigitizer.ts packages/desktop/src/vibro/curveDigitizer.test.ts
git commit -m "feat: digitaliseer qc-curve uit rasterbeeld"
```

---

### Task 4: Geotechnische trajecten en Rc;net;d

**Files:**
- Create: `packages/desktop/src/vibro/geotechnical.ts`
- Create: `packages/desktop/src/vibro/geotechnical.test.ts`
- Create: `packages/desktop/src/vibro/referenceCase.ts`

**Interfaces:**
- Consumes: `DigitizedCptPoint[]`, `VibroPileInput`.
- Produces: `calculateQcAverages(points, input): QcAverages`, `calculateNegativeSkinFriction(input): NegativeSkinResult`, `calculatePileResistance(points, input): PileResistanceResult`, `validateCoverage(points, input): string[]`.

- [ ] **Step 1: Leg de eerste referentie-invoer vast**

`referenceCase.ts` exporteert:

```ts
export const vibroReferenceInput: VibroPileInput = {
  shaftDiameterMm: 323,
  baseDiameterMm: 365,
  pileHeadNapM: -0.9,
  pileTipNapM: -18.5,
  positiveShaftStartNapM: -14.25,
  alphaP: 0.7,
  alphaS: 0.01,
  beta: 1,
  shapeFactor: 1,
  xiSingleCpt: 1.3,
  gammaB: 1.2,
  gammaS: 1.2,
  designLoadKn: 0,
  negativeSkinLayers: [],
};
```

Factoren blijven expliciete invoer; pas ze tijdens referentievalidatie alleen
aan met een gedocumenteerde onderbouwing uit het referentierapport.

- [ ] **Step 2: Schrijf falende tests voor gecontroleerde constante curves**

Gebruik een curve met `qc = 10 MPa` over alle benodigde trajecten. Verwacht:

```ts
expect(qc.qcIAvgMpa).toBeCloseTo(10, 8);
expect(qc.qcIIAvgMpa).toBeCloseTo(10, 8);
expect(qc.qcIIIAvgMpa).toBeCloseTo(10, 8);
expect(qc.qcShaftAvgMpa).toBeCloseTo(10, 8);
expect(result.rcNetDesignKn).toBeCloseTo(result.rcDesignKn - result.negativeSkinDesignKn, 8);
```

Voeg een aflopende curve toe waarmee de minimumroute van `qc;II` aantoonbaar
lager uitvalt dan een eenvoudig rekenkundig gemiddelde.

- [ ] **Step 3: Run en bevestig FAIL**

Run: `npm --prefix packages/desktop test -- src/vibro/geotechnical.test.ts`

Expected: FAIL door ontbrekende functies.

- [ ] **Step 4: Implementeer trajectselectie en integratie**

Gebruik lineaire interpolatie tussen meetpunten en trapeziumintegratie over
exact afgesneden trajectgrenzen. Implementeer `qc;II` als de voorgeschreven
minimumroute, niet als een los minimum van meetpunten. Weiger ontbrekende
dekking; extrapoleer niet.

- [ ] **Step 5: Implementeer weerstanden en negatieve kleef**

Bereken zichtbaar:

```ts
qbMaxMpa =
  0.5 * alphaP * beta * shapeFactor
  * (((qcIAvgMpa + qcIIAvgMpa) / 2) + qcIIIAvgMpa);
rbCalKn = baseAreaM2 * qbMaxMpa * 1000;
rsCalKn = shaftCircumferenceM * positiveShaftLengthM
  * alphaS * qcShaftAvgMpa * 1000;
rcCalKn = rbCalKn + rsCalKn;
rcCharacteristicKn = rcCalKn / xiSingleCpt;
rcDesignKn =
  rbCalKn / xiSingleCpt / gammaB
  + rsCalKn / xiSingleCpt / gammaS;
rcNetDesignKn = rcDesignKn - negativeSkinDesignKn;
```

Negatieve kleef wordt per aaneengesloten laag geïntegreerd uit effectieve
verticale spanning, `K0`, `tan(delta)` en paalomtrek. Gaten en overlap leveren
validatiefouten op.

- [ ] **Step 6: Run tests en commit**

Run: `npm --prefix packages/desktop test -- src/vibro/geotechnical.test.ts`

Expected: PASS.

```powershell
git add packages/desktop/src/vibro/geotechnical.ts packages/desktop/src/vibro/geotechnical.test.ts packages/desktop/src/vibro/referenceCase.ts
git commit -m "feat: bereken VIBRO-paaldraagvermogen"
```

---

### Task 5: PDF-pagina laden en kalibratie-UI

**Files:**
- Modify: `packages/desktop/package.json`
- Create: `packages/desktop/src/vibro/pdfPage.ts`
- Create: `packages/desktop/src/components/calc/VibroPileDesigner.tsx`
- Create: `packages/desktop/src/components/calc/VibroPileDesigner.css`
- Modify: `packages/desktop/src/App.tsx`

**Interfaces:**
- Consumes: lokaal PDF-pad of `Uint8Array`, `CptCalibration`, `digitizeQcCurve`.
- Produces: `renderPdfPage(data, pageIndex, scale): Promise<RenderedPdfPage>` en een ontwerper die gecontroleerde meetpunten in componentstate houdt.

- [ ] **Step 1: Voeg `pdfjs-dist` toe**

Run: `npm --prefix packages/desktop install pdfjs-dist@^5.4.149`

Expected: package en lockfile bijgewerkt.

- [ ] **Step 2: Implementeer PDF-rendering**

`RenderedPdfPage` bevat `canvas`, `width`, `height` en `pageCount`. Configureer
de worker via een Vite-veilige module-URL. Render uitsluitend de geselecteerde
pagina; laad geen volledige documentafbeeldingen in het geheugen.

- [ ] **Step 3: Bouw de ontwerper met expliciete toestanden**

Gebruik de toestanden:

```ts
type DesignerStage =
  | "empty"
  | "loading"
  | "calibrating"
  | "review"
  | "ready"
  | "error";
```

De UI bevat:

- knop `Grondonderzoek-PDF kiezen`;
- paginakeuze;
- numerieke invoer voor diagramgrenzen en schaal;
- canvas met originele pagina;
- overlay voor plotgrenzen, curve en onzekere segmenten;
- knoppen `Curve opnieuw bepalen` en `Kalibratie accepteren`;
- zichtbare blokkade wanneer coverage of relevante trajectdekking faalt.

- [ ] **Step 4: Koppel aan `App.tsx`**

Voeg toe:

```tsx
const designerPane = source.includes("VIBRO-paaldraagvermogen")
  ? <VibroPileDesigner />
  : source.includes("Voetplaatverbinding")
    ? <VoetplaatDesigner />
    : source.includes("Balklaag")
      ? <BalklaagDesigner />
      : null;
```

- [ ] **Step 5: Build en handmatige rooktest**

Run: `npm --prefix packages/desktop run build`

Expected: PASS.

Run: `npm --prefix packages/desktop run tauri dev`

Controleer dat de PDF-keuze opent, pagina 1 rendert en de overlay schaalbaar
boven de pagina blijft liggen.

- [ ] **Step 6: Commit**

```powershell
git add packages/desktop/package.json package-lock.json packages/desktop/src/vibro/pdfPage.ts packages/desktop/src/components/calc/VibroPileDesigner.tsx packages/desktop/src/components/calc/VibroPileDesigner.css packages/desktop/src/App.tsx
git commit -m "feat: voeg PDF-kalibratie voor VIBRO-palen toe"
```

---

### Task 6: Calcpad-rekensheet genereren en opslaan

**Files:**
- Create: `packages/desktop/src/vibro/sheetGenerator.ts`
- Create: `packages/desktop/src/vibro/sheetGenerator.test.ts`
- Create: `packages/desktop/src/templates/vibroPaal.ts`
- Modify: `packages/desktop/src/templates/index.ts`
- Modify: `packages/desktop/src/components/calc/projectTree.ts`
- Modify: `packages/desktop/src/components/calc/VibroPileDesigner.tsx`

**Interfaces:**
- Consumes: `CptCalibration`, `DigitizedCptPoint[]`, `VibroPileInput`, `PileResistanceResult[]`.
- Produces: `generateVibroPileSheet(model: VibroSheetModel): string`.

- [ ] **Step 1: Schrijf een falende generator-test**

Genereer een sheet met drie meetpunten en controleer:

```ts
expect(source).toContain("# VIBRO-paaldraagvermogen");
expect(source).toContain("qc_I_gem");
expect(source).toContain("R_c_net_d");
expect(source).toContain("@svg");
expect(source).not.toContain("NaN");
```

Parse en evalueer vervolgens met de bestaande core-API:

```ts
const ast = parse(source);
const evaluated = evaluate(ast);
expect(evaluated.errors).toEqual([]);
```

- [ ] **Step 2: Run en bevestig FAIL**

Run: `npm --prefix packages/desktop test -- src/vibro/sheetGenerator.test.ts`

Expected: FAIL door ontbrekende generator.

- [ ] **Step 3: Implementeer een zelfstandige, auditbare sheet**

De bron bevat:

- marker `VIBRO-paaldraagvermogen`;
- bronbestandsnaam en paginanummer;
- kalibratievelden;
- meetpuntentabel in Calcpad-data;
- invoervelden voor alle factoren en grondlagen;
- Calcpad-formules voor alle afgeleide grootheden;
- acht resultaatblokken voor NAP -18,50 t/m -22,00 m;
- SVG met curve en gekleurde trajecten;
- tabel met `qc;I`, `qc;II`, `qc;III`, `qc;z;a`, `Rb;cal`, `Rs;cal`,
  `Rc;d`, `Fnk;d`, `Rc;net;d` en unity check.

Gebruik ASCII-variabelen zoals `qc_I_gem` in formules en typografische labels
alleen in begeleidende tekst.

- [ ] **Step 4: Koppel genereren aan de documentstore**

In de ontwerper:

```ts
const loadTemplate = useDocumentStore((s) => s.loadTemplate);
const source = generateVibroPileSheet(model);
loadTemplate(source, "VIBRO-paal sondering 1");
```

Hierdoor gebruikt `Opslaan`/`Opslaan als` de bestaande file-operaties en wordt
de nieuwe sheet niet in een afwijkend opslagpad geschreven.

- [ ] **Step 5: Voeg bibliotheekitem toe**

Registreer `vibro-paaldraagvermogen` in `templates/index.ts` en voeg onder
funderingen een projecttree-item toe. De starttemplate bevat de marker en
uitleg dat eerst een PDF moet worden gekozen.

- [ ] **Step 6: Run tests en build**

Run: `npm --prefix packages/desktop test -- src/vibro/sheetGenerator.test.ts`

Expected: PASS.

Run: `npm --prefix packages/desktop run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add packages/desktop/src/vibro/sheetGenerator.ts packages/desktop/src/vibro/sheetGenerator.test.ts packages/desktop/src/templates/vibroPaal.ts packages/desktop/src/templates/index.ts packages/desktop/src/components/calc/projectTree.ts packages/desktop/src/components/calc/VibroPileDesigner.tsx
git commit -m "feat: genereer en bewaar VIBRO-rekensheet"
```

---

### Task 7: Referentiedigitalisering en vergelijking

**Files:**
- Create: `packages/desktop/src/vibro/referenceValidation.test.ts`
- Modify: `packages/desktop/src/vibro/referenceCase.ts`
- Modify: `packages/desktop/src/components/calc/VibroPileDesigner.tsx`

**Interfaces:**
- Consumes: de echte PDF-pagina via een testfixture-pad uit
  `VIBRO_REFERENCE_PDF`; alle pure rekenfuncties.
- Produces: `compareReferenceResults(actual, expected): ReferenceComparison[]`.

- [ ] **Step 1: Leg gepubliceerde tussenwaarden vast**

Neem voor sondering 1 en de acht paalpuntniveaus de gepubliceerde waarden uit
bijlage 3.4 over in `referenceCase.ts`. Gebruik per rij:

```ts
{
  pileTipNapM: -18.5,
  qcIAvgMpa: 10.3,
  qcIIAvgMpa: 8.5,
  qcShaftAvgMpa: 10.6,
  qbMaxMpa: 4.66,
  rbCalKn: 487,
  rsCalKn: 189,
  rcDesignKn: 434,
  rcNetDesignKn: 189,
}
```

Neem de overige zeven rijen exact uit hetzelfde referentierapport over.

- [ ] **Step 2: Schrijf vergelijkingstests**

Test eerst `compareReferenceResults` met kunstmatige afwijkingen. Test daarna,
indien `VIBRO_REFERENCE_PDF` bestaat, de volledige render/digitaliseer/reken-
keten. Sla de test alleen expliciet over wanneer de omgevingsvariabele niet is
gezet.

- [ ] **Step 3: Kalibreer pagina 1 en digitaliseer sondering 1**

Gebruik een vaste eerste kalibratie voor de bekende layout en toon die in de
UI als voorstel. Laat de gebruiker alle vier diagramgrenzen corrigeren. Bewaar
de geaccepteerde kalibratie in het gegenereerde model.

- [ ] **Step 4: Rapporteer afwijkingen in de UI**

Toon per niveau absolute en procentuele afwijking. Gebruik geen verborgen
ruime tolerantie. Markeer:

- groen: binnen de op pixelresolutie gebaseerde tolerantie;
- oranje: groter maar verklaarbaar door curvelezing;
- rood: formule- of trajectverschil dat onderzoek vereist.

- [ ] **Step 5: Run referentietest**

```powershell
$env:VIBRO_REFERENCE_PDF='C:\Users\rickd\Documents\GitHub\verification-files\Constructieberekeningen\Funderingspaal\Vibro\AA22485resultaten grondonderzoek.pdf'
npm --prefix packages/desktop test -- src/vibro/referenceValidation.test.ts
```

Expected: test produceert acht vergelijkingsrijen zonder ontbrekende
trajectdekking. Numerieke afwijkingen worden in de testuitvoer zichtbaar en
de onderbouwde tolerantie wordt daarna in de assertions vastgelegd.

- [ ] **Step 6: Commit**

```powershell
git add packages/desktop/src/vibro/referenceValidation.test.ts packages/desktop/src/vibro/referenceCase.ts packages/desktop/src/components/calc/VibroPileDesigner.tsx
git commit -m "test: valideer VIBRO-paal tegen referentierapport"
```

---

### Task 8: Eindverificatie en opgeslagen sheet

**Files:**
- Modify only if verification exposes defects in files from Tasks 1–7.
- Create through the app: a saved `.ifccalc`/supported calculation document in the user-selected verification location; do not commit the generated user artifact unless explicitly requested.

**Interfaces:**
- Consumes: volledige tool.
- Produces: werkende, opgeslagen rekensheet en verificatierapport in de testuitvoer.

- [ ] **Step 1: Run alle tests**

Run: `npm --prefix packages/desktop test`

Expected: PASS zonder skipped referentietest wanneer `VIBRO_REFERENCE_PDF` is
ingesteld.

- [ ] **Step 2: Run core- en desktopbuild**

Run: `npm --prefix packages/core run build`

Expected: PASS.

Run: `npm --prefix packages/desktop run build`

Expected: PASS.

- [ ] **Step 3: Handmatige end-to-endtest**

Run: `npm --prefix packages/desktop run tauri dev`

Controleer:

1. VIBRO-paaltool openen;
2. grondonderzoek-PDF kiezen;
3. sondering 1/pagina 1 selecteren;
4. kalibratie en curve visueel controleren;
5. acht paalpuntniveaus berekenen;
6. Calcpad-sheet genereren;
7. `Opslaan als` gebruiken;
8. document sluiten en opnieuw openen;
9. bevestigen dat meetpunten, invoer en resultaten identiek blijven.

- [ ] **Step 4: Controleer repo-regels en diff**

Run:

```powershell
git diff --check
git status --short
```

Lees de gewijzigde repo-content tevens volledig na tegen de verboden
verwijzingen uit de gebruikersrichtlijn. Expected: geen verboden nieuwe
repo-content, geen whitespacefouten en alleen bedoelde wijzigingen.

- [ ] **Step 5: Eindcommit**

Alleen wanneer de eindverificatie nog kleine correcties vereiste:

```powershell
git add packages/desktop
git commit -m "fix: rond VIBRO-paalvalidatie af"
```
