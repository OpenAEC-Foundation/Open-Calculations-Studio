# Balklaag: belastinggevallen, combinaties, vrije afmetingen en onderslag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Het rekenblad Balklaag rekent met vijf belastinggevallen (schaakbordbelasting bij twee velden), toont per geval de M-, V- en u-lijn, bouwt de UGT- en BGT-combinaties in een tabel op (6.16b uitgeschreven), tekent de omhullende in §10, kent vrije afmetingen en de soort ligger "onderslag", en het parametrische beeld leest zijn uitkomsten uit het blad.

**Architecture:** Alles wat rekent staat in het CalcPAD-blad `packages/desktop/src/templates/balklaag.ts`, binnen de bestaande evaluator: verborgen functies voor één lastset (verdeelde last per veld, puntlast per veld, steunmoment uit de drie-momentenvergelijking) en daarop per belastinggeval en per combinatie de kenmerkende waarden. Het beeld (`BalklaagDesigner.tsx`) verliest zijn eigen `toets()`: de unity checks, M_y,Ed, V_z,Ed en w_fin komen via `useBladUitkomst`, "Ontwerp" rekent het blad per profiel door, en de lijnen in het beeld zijn de statica van dezelfde gevallen met de lasten en factoren uit het blad. Controle met een nieuw script dat het blad naast een onafhankelijke numerieke balkberekening (verplaatsingsmethode, fijne verdeling) legt.

**Tech Stack:** CalcPAD-rekentaal van `@ifc-calc/core` (mathjs), Node-controlescripts (`scripts/*.mjs`), React 19 + TypeScript.

## Global Constraints

- Schema 1, 2 en 4 leveren dezelfde uitkomsten als vóór deze wijziging; `scripts/check-balklaag.mjs` blijft ongewijzigd groen.
- Templates zijn CalcPAD-tekst in een template-literal zonder `${}`-interpolatie.
- Geen namen van externe rekensoftware of concurrerende producten, nergens; normteksten alleen als nummer of tabel-id.
- Toelichtend commentaar in het Nederlands, in de stijl van het bestand.
- Commitberichten in Nederlandse conventional-stijl, eindigend op `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `packages/desktop/.gitignore` nooit meecommitten.
- Alle bestaande controles blijven groen: `node scripts/check-alles.mjs` (na `npm --prefix packages/core run build`) en `npx tsc --noEmit -p packages/desktop`.

---

## Bestandsstructuur

- `packages/desktop/src/templates/balklaag.ts` — het rekenblad (profiel "Zelf invullen", soort ligger, belastinggevallen, combinaties, lijnen).
- `scripts/check-balklaag-schema3.mjs` — nieuw controlescript: handberekeningen schema 3, numerieke balk, combinaties, 6.16b, regressie schema 2 en 4, vrije afmetingen, onderslag, rendercontrole per schema.
- `packages/desktop/src/components/calc/bladResultaat.ts` — `rekenBladDoor()` los van de hook, zodat "Ontwerp" het blad per profiel kan doorrekenen.
- `packages/desktop/src/components/calc/balklaagLijnen.ts` — nieuw: statica van één lastset voor de tekening (M, V, u), zonder toetsing.
- `packages/desktop/src/components/calc/BalklaagDesigner.tsx` — leest het blad; nieuwe invoer voor vrije afmetingen en soort ligger; omhullende lijnen.

## Rekenmodel (gedeeld door alle taken)

Eenheden in de verborgen functies: lengtes in m, verdeelde lasten in kN/m, puntlasten in kN; momenten in kNm, dwarskrachten in kN, zakkingen in mm. Een lastset is `(w1; w2; P1; P2)`: verdeelde last op veld 1 en op het tweede deel (overstek of veld 2), puntlast midden veld 1 en op het tweede deel (midden veld 2, of het uiteinde van het overstek).

```
Mb(w1; w2; P1; P2) = if(schema ≡ 3; (w1*d_L^3 + w2*d_L2^3)/(8*(d_L + d_L2)) + 3*(P1*d_L^2 + P2*d_L2^2)/(16*(d_L + d_L2)); if(schema ≡ 2; w2*d_a^2/2 + P2*d_a; 0))
Ra(w1; P1; m) = w1*d_L/2 + P1/2 - m/d_L
Rc(w2; P2; m) = if(d_L2 > 0; w2*d_L2/2 + P2/2 - m/max(d_L2; 0.001); 0)
m1(x; w1; P1; m) = Ra(w1; P1; m)*x - w1*x^2/2 - P1*max(0; x - d_L/2)
v1(x; w1; P1; m) = Ra(w1; P1; m) - w1*x - P1*bool(x > d_L/2)
m2(t; w2; P2; m) = if(d_a > 0; -w2*t^2/2 - P2*t; Rc(w2; P2; m)*t - w2*t^2/2 - P2*max(0; t - d_L2/2))
v2(t; w2; P2; m) = if(d_a > 0; w2*t + P2; -Rc(w2; P2; m) + w2*t + P2*bool(t > d_L2/2))
```

Gevallen: BG1 `(g; g; 0; 0)`, BG2 `(q; q·[schema 2]; 0; 0)`, BG3 `(0; q·[schema 3]; 0; 0)`, BG4 `(F·(1−e4); 0; 0; F·e4)` met `e4` = overstek langer dan L/4, BG5 `(0; 0; 0; F·[schema 3])`.

Combinaties (factor per geval): UGT veld 1 `γG·BG1 + γQ·BG2`, UGT steun `γG·BG1 + γQ·(BG2 + BG3)`, UGT veld 2 `γG·BG1 + γQ·BG3`, UGT puntlast `γG·max|M_BG1| + γQ·max|M_BG4|` (maxima opgeteld, zoals tot nu toe), 6.14b en 6.16b per veld.

Zakking per veld: midden van het veld, met 4 % toeslag bij schema 2 en 3 (niet bij de puntlast van schema 2), negatief telt als nul; `w_fin = w_inst + k_def·w_qp`.

---

### Task 1: Controlescript schema 3 en regressie (falend)

**Files:**
- Create: `scripts/check-balklaag-schema3.mjs`

**Interfaces:**
- Consumes: `laadTemplate`, `afronden` uit `scripts/lib/refcheck.mjs`; `parse`, `evaluate`, `render` uit `packages/core/dist/index.js`.
- Produces: namen die het blad moet tonen: per geval (onder een kop `<h6>BGk — …`) `M_veld1`, `M_steun`, `M_veld2`, `V_max`, `u_veld1`, `u_veld2`, `u_eind`; verder `b_belast`, `k_r`, `P_g_k`, `q_q_k`, `F_Q_k`, `u_g_k`, `u_q_k`, `u_Q_k`, `u_g_k_2`, `u_q_k_2`, `u_Q_k_2`, `u_var`, `u_var_2`, `w_inst`, `w_inst_2`, `q_qp`, `w_qp`, `w_qp_2`, `w_kruip`, `w_kruip_2`, `w_fin`, `w_fin_2`, `w_lim`, `w_lim_2`, `UC_doorbuiging`, `M_y_Ed`, `V_z_Ed`, `k_def`, `ψ_2`.

- [ ] **Step 1: Schrijf het script**

Onderdelen:
1. `rekenPerGeval(invoer, project)` — evalueert het blad, loopt de knopen in volgorde af, houdt het huidige geval bij uit tekstknopen met `<h6>BG(\d)` en verzamelt var-displays per geval; daarnaast alle zichtbare waarden (laatste telt).
2. `balkNumeriek({ schema, L1, L2, a, EI, w1, w2, P1, P2 })` — verplaatsingsmethode met Euler-Bernoulli-elementen (200 per veld, knopen in het midden van elk veld en op het uiteinde), consistente knooplasten; reacties uit `K·d − F`; `M(x)` en `V(x)` daarna uit het evenwicht links van `x`; zakking in de knopen.
3. Handberekeningen gelijke velden (L = 4,0 m): BG2 `M_steun = qL²/16`, `M_veld1 = 49/512·qL²`; BG1 `M_steun = gL²/8`, `M_veld1 = M_veld2 = 9/128·gL²`; BG4 `M_steun = 3·F·L1²/(16·(L1 + L2))`; BG3 en BG5 gespiegeld.
4. Ongelijke velden (3160/2610, 4600/4400, 2000/5000 mm): per geval M_veld1, M_steun, M_veld2, V_max, u_veld1, u_veld2 tegen de numerieke balk (relatief 2‰).
5. Combinaties: `M_y_Ed` en `V_z_Ed` tegen de numerieke omhullende; omhullende ≥ volle belasting; `u_g_k` = 1,04 · numerieke zakking; 6.16b: `q_qp = P_g_k + ψ_2·q_q_k`, `w_qp = u_g_k + ψ_2·u_var`, `w_fin = w_inst + k_def·w_qp`, idem veld 2.
6. Regressie schema 2 en 4 tegen de waarden van het blad vóór deze wijziging (tabel `OUD` in het script).
7. Vrije afmetingen (`profiel` 28, 71×221 = profiel 12) en onderslag (`ligger` 2: `b_belast = b_ond`, `k_r = 1`; raveelbalk blijft `l_staart/2`).
8. Rendercontrole voor schema 1 t/m 4 × ligger 1 en 2 × beide rekenwijzen: geen foutmelding, geen NaN, geen onuitgerekende expressie in een tekening, geen tekening in stukken.

- [ ] **Step 2: Draai het script en zie het falen**

Run: `node scripts/check-balklaag-schema3.mjs`
Expected: FOUT op de ontbrekende per-geval-waarden en op profiel 28 / ligger 2; regressie schema 2 en 4 al groen.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-balklaag-schema3.mjs
git commit -m "test(balklaag): controle belastinggevallen, combinaties en onderslag"
```

### Task 2: Vrije afmetingen en soort ligger in het blad

**Files:**
- Modify: `packages/desktop/src/templates/balklaag.ts` (§1 profiel, §2 geometrie, belaste breedte, k_r, doorsnede)

**Interfaces:**
- Produces: invoer `b_zelf`, `h_zelf` (mm), `@select ligger` (1 balk in een balklaag, 2 onderslag), invoer `b_ond` (m); profielkeuze `Zelf invullen = 28`; `k_def` zichtbaar in §1.

- [ ] **Step 1:** Profiellijst uitbreiden met `Zelf invullen = 28`; invoer `b_zelf`, `h_zelf`; `b_balk = if(profiel ≡ 28; b_zelf; hlookup(profielen; profiel; 1; 2)*mm)`, idem `h_balk`; `h_ruw = h_balk/(1 mm)`.
- [ ] **Step 2:** `@select ligger "Soort ligger"` en invoer `b_ond = ?*(m)`; `b_belast = if(schema ≡ 4; l_staart/2; if(ligger ≡ 2; b_ond; hoh)) to mm`; `k_r = if(schema ≡ 4; 1; if(ligger ≡ 2; 1; min(1; k_r_0)))`; toelichting dat de trillingstoets bij een onderslag uit hoort.
- [ ] **Step 3:** Doorsnede van de balklaag alleen bij `ligger ≡ 1`; bij een onderslag een regel met de belaste breedte.
- [ ] **Step 4:** Run `node scripts/check-balklaag.mjs` (PASS) en `node scripts/check-balklaag-schema3.mjs` — onderdelen 7 PASS.
- [ ] **Step 5:** Commit `feat(balklaag): vrije afmetingen en onderslag met belaste breedte`.

### Task 3: Belastinggevallen BG1–BG5 met de drie-momentenvergelijking

**Files:**
- Modify: `packages/desktop/src/templates/balklaag.ts` (§4b rekenmodel, §5 belasting per balk, §7 belastinggevallen)

**Interfaces:**
- Consumes: `P_g,k`, `q_q,k`, `F_Q,k`, `b_belast`.
- Produces: verborgen functies uit "Rekenmodel" hierboven plus `Mv1`, `Mv2`, `Vmx`, `Um1`, `Um2`, `Ue`, `Ux`, `Mx`, `Vx`, `bw1(k)`, `bw2(k)`, `bP1(k)`, `bP2(k)`, `mB_bg(k)`; per geval een kop `<h6>BGk — …</h6>` met var-displays `M_veld1`, `M_steun`, `M_veld2`, `V_max`, `u_veld1`, `u_veld2`, `u_eind` (alleen die bij het schema horen) en een tekening met M-, V- en u-lijn.

- [ ] **Step 1:** Oude coëfficiënten (`c_M_1` … `c_u_3`, `uz/mz/vz`) vervangen door het rekenmodel.
- [ ] **Step 2:** `#for k = 1 : 5` met per geval kop, waarden en een SVG op de lengteschaal van het statische schema (`sx1` … `sx3`).
- [ ] **Step 3:** Run `node scripts/check-balklaag-schema3.mjs` — onderdelen 3 en 4 PASS; `node scripts/check-balklaag.mjs` PASS.
- [ ] **Step 4:** Commit `feat(balklaag): belastinggevallen met schaakbordbelasting bij twee velden`.

### Task 4: Combinaties, 6.16b uitgeschreven en de toetsing per veld

**Files:**
- Modify: `packages/desktop/src/templates/balklaag.ts` (§8 combinaties, §9 BGT, §10 UGT)

**Interfaces:**
- Produces: `γ_G`, `γ_Q` in §8; verborgen `M_Ed,veld1`, `M_Ed,steun`, `M_Ed,veld2`, `M_Ed,F1`, `M_Ed,F2`, `V_Ed,…`; tabel; zichtbaar `u_g,k` … `u_Q,k,2`, `u_var`, `u_var,2`, `w_inst(,2)`, `q_qp`, `w_qp(,2)`, `w_kruip(,2)`, `w_fin(,2)`, `w_lim(,2)`, `UC_doorbuiging`, `M_y,Ed`, `V_z,Ed`.

- [ ] **Step 1:** Lastsets per combinatie (`c1_w1` … `c5_m`) en de uitkomsten; UGT-puntlast met opgetelde maxima.
- [ ] **Step 2:** Combinatietabel (rijen per combinatie, kolommen BG1…BG5, factor per cel, uitkomst rechts).
- [ ] **Step 3:** §9 per veld: 6.14b, 6.16b uitgeschreven (`q_qp`, `w_qp`, `w_kruip`), `w_fin = w_inst + w_kruip`, grens per veld, `UC_doorbuiging`.
- [ ] **Step 4:** §10.1 `M_y,Ed` en `V_z,Ed` als maximum over de combinaties.
- [ ] **Step 5:** Run beide balklaag-scripts — alles PASS behalve de rendercontrole van de nieuwe lijnen.
- [ ] **Step 6:** Commit `feat(balklaag): combinatietabel en quasi-blijvende combinatie uitgeschreven`.

### Task 5: Omhullende en doorbuigingslijn in het blad

**Files:**
- Modify: `packages/desktop/src/templates/balklaag.ts` (§9.4, §10.1b)

- [ ] **Step 1:** `Mo_max(x)`, `Mo_min(x)`, `Vo_max(x)`, `Vo_min(x)` over de vijf UGT-lastsets; M- en V-lijn als gevuld vlak boven en onder de as, met de waarden bij de uitersten en de steunpunten.
- [ ] **Step 2:** Doorbuigingslijn: `w_inst(x)` en `w_fin(x)` uit BG1 plus het maatgevende veranderlijke geval per veld.
- [ ] **Step 3:** Run `node scripts/check-balklaag-schema3.mjs` (alles PASS) en `node scripts/check-renders.mjs` (PASS).
- [ ] **Step 4:** Commit `feat(balklaag): omhullende M- en V-lijn en doorbuigingslijn per veld`.

### Task 6: Het beeld leest het blad

**Files:**
- Modify: `packages/desktop/src/components/calc/bladResultaat.ts`
- Create: `packages/desktop/src/components/calc/balklaagLijnen.ts`
- Modify: `packages/desktop/src/components/calc/BalklaagDesigner.tsx`

**Interfaces:**
- Produces: `rekenBladDoor(source: string, waarden: Record<string, string>, scope: Record<string, unknown>, naam: string): BladUitkomst | null`; `lastgevallen(g: LiggerMaten, lasten: {g: number; q: number; F: number}): Lastset[]`; `lijnen(g: LiggerMaten, set: Lastset, EI: number): { M(x), V(x), u(x) }`.

- [ ] **Step 1:** `rekenBladDoor` uit `useBladUitkomst` halen; de hook gebruikt hem.
- [ ] **Step 2:** `balklaagLijnen.ts`: lastsets per geval en per UGT-combinatie, M/V/u van een lastset (dezelfde statica als het blad).
- [ ] **Step 3:** Designer: `toets()`, `MATS`, `vormVan`, `puntlastVan` weg; UC's, M_y,Ed, V_z,Ed, w_fin, w_lim, lasten en factoren uit `useBladUitkomst().getallen`; kop met `resultaat`; "Ontwerp" loopt de profielen 1…27 asynchroon door met `rekenBladDoor`; profiel "Zelf invullen" met b en h; keuze soort ligger met belaste breedte (trilling uit bij onderslag); M- en V-lijn als omhullende, doorbuigingslijn per veld.
- [ ] **Step 4:** Run `npx tsc --noEmit -p packages/desktop` en `node scripts/check-designerkeuze.mjs` — PASS.
- [ ] **Step 5:** Commit `refactor(balklaag): beeld leest de uitkomst uit het blad`.

### Task 7: Eindcontrole

- [ ] **Step 1:** `npm --prefix packages/core run build && node scripts/check-alles.mjs` — alle controles groen.
- [ ] **Step 2:** `npx tsc --noEmit -p packages/desktop` — geen fouten.
- [ ] **Step 3:** Zoek in de diff naar verboden namen (externe software) en `${` in de template.
