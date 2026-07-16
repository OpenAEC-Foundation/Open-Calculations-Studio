# Toetsing balklaag-berekening tegen referentie-uitwerking

**Doel:** de template [`packages/desktop/src/templates/balklaag.ts`](../packages/desktop/src/templates/balklaag.ts)
volledig toetsen tegen de referentie-uitwerking die stuksgewijs wordt aangeleverd.
Alle punten waar de template **afwijkt** van de referentie, of waar iets **niet klopt**,
worden hieronder vastgelegd.

**Status:** 🟢 rekendeel getoetst — Balklaag voldoet (UC_max = 0,61). B-07/B-08
(designer-sync) opgelost en geverifieerd.
**Laatste update:** B-08 opgelost — designer seedt de store; beeld = berekening.

---

## Referentie-casus (invoer)

| Parameter | Waarde |
|---|---|
| Gevolgklasse | CC2 (K_FI = 1,00) |
| Profiel b×h | 71 × 221 mm |
| Sterkteklasse | C24 (gezaagd hout) |
| Gebruiksklasse | 1 |
| γ_M | 1,30 |
| k_def | 0,60 |
| Dagmaat | 4000 mm |
| Opleglengte | 70 mm |
| Hart-op-hart | 600 mm |
| Dikte vloerhout | 18 mm |

Invoer zelf is in orde; de waarden komen overeen met C24 / gebruiksklasse 1 / gezaagd hout.

---

## Bevindingen

**Werkwijze (vanaf de rekenstappen):** de aangeleverde berekening geldt als
**correct binnen zijn eigen aannames**. Ik corrigeer niets en stel geen wijzigingen
voor. Ik lees mee, ga voor elke waarde na of de herkomst duidelijk is, en voeg
hieronder **alleen** iets toe wanneer ik het ergens **niet mee eens ben** of het
zelf anders zou doen — altijd mét reden. Dit is dus een log van opmerkingen, geen
correctielijst.

- 🟠 **Afwijkende keuze/aanname** — ik zou een andere waarde kiezen (bijv. ρ 550 vs
  420 kg/m³, kalibratieconstanten). Geen fout; alleen genoteerd mét reden.
- ⚪ **Herkomst onduidelijk** — waar komt de waarde vandaan? (vraag of observatie)
- 🟢 **Begrepen & akkoord.**

Legenda oordeel: 🟠 afwijkende keuze · ⚪ onduidelijk/informatief · 🟢 akkoord

### B-01 — Oplegdruktoets (f_c,90, §6.1.5) ontbreekt — in beide ⚪ (aanbeveling)

- **Herzien na volledige uitwerking:** de referentie sluit af na de afschuiving en
  doet **zelf óók geen oplegdruktoets**. Het is dus **geen verschil** tussen
  referentie en template — beide laten §6.1.5 weg. De f_c,90,d in de materiaaltabel
  en de opleglengte (70 mm, alleen gebruikt voor L_th) misleidden mij eerder.
- **Mijn aanbeveling (geen fout):** voor volledigheid §6.1.5 toevoegen. Snelle check:
  σ_c,90,d = V/(b·a_opl) = 4609/(71·70) = 0,93 N/mm²; f_c,90,d = 1,54 → UC ≈ 0,60
  (zonder k_c,90), **niet maatgevend** t.o.v. de doorbuiging (0,61). Verandert de
  conclusie niet.

### B-02 — k_mod "Kort", gebruiksklasse 3 🟢 (template) / 🔴 (referentie)

- **Template:** `k_mod_3` voor Kort = **0,70** (EN 1995-1-1 Tabel 3.1, gezaagd hout, GK3).
- **Referentie:** `Kort 0,90(0,80)` → haakjeswaarde (GK3) = **0,80**.
- **Oordeel:** de **template is correct**, de referentie-waarde 0,80 is fout
  (moet 0,70 zijn). Niet maatgevend voor deze casus (GK1), maar genoteerd.

### B-03 — f_t,90,d-kolom referentie inconsistent ⚪

- **Template:** gebruikt f_t,90 niet (geen trek-loodrecht-toets), dus geen impact.
- **Referentie:** f_t,90,d = 0,15 / 0,20 / 0,25 voor Blijvend/Middellang/Kort.
  Narekenen met k_mod·f_t,90,k/γ_M (GK1) geeft **0,18 / 0,25 / 0,28**.
  De opgegeven waarden corresponderen met de **GK3** k_mod's (0,50/0,65/0,80) —
  dus in de referentie is voor deze kolom per ongeluk gebruiksklasse 3 gebruikt.
- **Oordeel:** referentie-onregelmatigheid, geen template-impact.

### B-04 — Eigengewicht balk: referentie rekent met ρ = 550 kg/m³ 🟠

- **Referentie:** G = 8,63 kg/m. Met A = 15691 mm² volgt ρ = 8,63 / 0,015691 =
  **550 kg/m³** (de referentie-aanname, niet EN 338 ρ_mean = 420).
- **Template:** standaard `eigengewicht` = "EN 338 (ρ_mean)" → 420 kg/m³ →
  G = 6,59 kg/m. Om de referentie te reproduceren moet de optie
  **"Referentie (550 kg/m³)"** gekozen worden; dan G = 8,63 kg/m (exacte match).
- **Oordeel:** geen fout, maar een **instelling-afhankelijke afwijking**. De
  template kán de referentie exact reproduceren, maar niet met de default.
- **Nuance uit rekenstap BG1:** de referentie rekent de eigengewicht-**last** met
  γ = **5,5 kN/m³** (= 550 kg/m³ × g≈10): g_balk = A·5,5 = 0,015691·5,5 = **0,086 kN/m**.
  Ik/template reken A·550·9,81 = **0,085 kN/m** (g = 9,81). De doorsnede-G (8,63 kg/m)
  hoort bij ρ = 550 (massa), de last bij γ = 5,5 — intern dus g = 10 voor de last.
  Verschil ≈ 1%, valt weg in afronding (P_g,k = 0,446 → 0,45 in beide gevallen).
  Geen fout; ik zou 9,81 aanhouden, genoteerd.

### B-05 — Herkomst derde term k_r (3402 / 50000) onduidelijk ⚪

- **Referentie:** k_r = 0,37 + 0,8·a/a_ref − (E₀,ser,rep·I)/(E₀,ser,rep·I₁)
  = 0,37 + 0,48 − 3402/50000 = **0,782**. Resultaat correct.
- **Template:** k_r = 0,37 + 0,8·hoh/a_ref − t_vloer³/C_kr = 0,37 + 0,48 − 5832/85700
  = 0,782. **Identiek resultaat** (3402/50000 en 5832/85700 zijn dezelfde breuk,
  factor 12/7 uit elkaar).
- **Onduidelijk:** wat I = 3402 mm⁴ (≈ 7·18³/12) en I₁ = 50000 mm⁴ fysiek
  voorstellen. Niet eenduidig te herleiden tot vloerhout/balk.
- **Relevantie:** de template gebruikt een teruggerekende kalibratieconstante C_kr
  i.p.v. de echte NB-stijfheidsverhouding. Voor déze casus identiek, maar voor
  andere t_vloer/plaatmateriaal lopen ze mogelijk uiteen.
- **Bevinding opsteller (nagekeken):** I is gebaseerd op de **vloerhout-dikte**,
  maar het eindresultaat lijkt nauwelijks te veranderen als de invoer wordt
  aangepast — onduidelijk of deze term in de praktijk echt invloed heeft.
- **Status:** 🅿️ **geparkeerd** — later nader bekijken (heeft de term werkelijk
  invloed, en zo ja onder welke invoer?). Geen actie nu.

### B-06 — V_Q,k: interne inconsistentie in de referentie (3,00 vs 2,35) ⚪

- **BG3 referentie:** `V_Q,k = 3,00 kN` (= volle, ónverlaagde puntlast).
- **UGT-combinatie referentie:** `V_zEd = 1,20·0,91 + 1,50·`**`2,35`**` = 4,61 kN`
  → in de combinatie wordt **F_Q,k = 2,35 kN** (k_r-verlaagd) gebruikt, **niet** 3,00.
- **Template:** `V_Q,k = F_Q,k` = 2,35 kN → V_zEd_2 = 4,61 kN.
- **Stand:** template en de **gebruikte** referentiewaarde zijn dus **identiek**
  (2,35 kN → 4,61 kN). Mijn eerdere conclusie "template onveilig" is hiermee
  **ingetrokken**. Wat resteert is een inconsistentie binnen de referentie zelf
  (BG3 noteert 3,00, combinatie gebruikt 2,35).
- **BESLECHT (na afschuiving):** τ_d wordt gerekend met V_Ed = **4608,7 N = 4,61 kN**,
  dus consequent op basis van F_Q,k = 2,35 kN. De "V_Q,k = 3,00" uit BG3 werkt
  nergens door — het is een losse weergavewaarde. De ontwerpwaarden zijn dus
  **consistent**, en de template gebruikt exact dezelfde 2,35 kN.
- **Conclusie:** B-06 **vervalt als afwijking**. Enige restpunt is cosmetisch: de
  "3,00 kN" in BG3 spreekt de gebruikte 2,35 kN tegen (verwarrende weergave).

### B-07 — Template-default K_FI = 0,90 (CC1) i.p.v. casus CC2 🔴 (door opsteller gevonden)

- **Symptoom:** template gebruikt in de buiging M_y,Ed = **4,217 kNm**, referentie 4,689.
- **Herkomst:** template-stap `M_y,Ed = K_FI · max(M_yEd_1; M_yEd_2)`.
  max = 4,685 (= referentie 4,689, op B-04-detail na) → × **0,90** = 4,217.
  K_FI = 0,90 hoort bij **CC1**; de casus is **CC2** (K_FI = 1,00 → 4,685 ≈ 4,689).
- **Root-cause (code):** [evaluator.ts:443](../packages/core/src/evaluator.ts) —
  `selectValues[name] ?? node.options[0]?.value` → een niet-aangeraakte keuzelijst
  valt terug op de **eerste optie**. In [balklaag.ts:70](../packages/desktop/src/templates/balklaag.ts)
  staat **CC1 als eerste** → default K_FI = 0,90. De project-`gevolgklasse` (CC2)
  werkt niet door naar de sheet.
- **Gevolg:** zonder handmatig CC2 te kiezen is de **UGT ~10% onveilig** (M_y,Ed,
  V_z,Ed beide ×0,90). BGT/doorbuiging niet geraakt → eindconclusie "voldoet" blijft,
  maar UGT-UC's (buiging/afschuiving) worden onderschat.
- **Verwante val (B-07b):** `duurklasse` default óók naar eerste optie = **"Kort"**
  (k_mod 0,90) i.p.v. casus **"Middellang"** (k_mod 0,80) → f_m,d 16,62 i.p.v. 14,77,
  dus weerstand ~12% te hoog. Zelfde root-cause.
- **Mogelijke actie (template):** CC2 als default, sheet de project-gevolgklasse
  laten erven; duurklasse-default heroverwegen. **Nog te besluiten met opsteller.**

### B-08 — Designer-defaults niet gesynct met evaluator-defaults 🔴 (root-cause B-07)

- **Kern:** [BalklaagDesigner.tsx](../packages/desktop/src/components/calc/BalklaagDesigner.tsx)
  toont waarden via eigen fallback-defaults `num(name, def)`, maar **schrijft die
  defaults nooit naar de store** (alleen bij gebruikersinteractie). De evaluator leest
  dezelfde store maar valt voor onaangeraakte waarden terug op **andere** defaults:
  keuzelijst → eerste @select-optie ([evaluator.ts:443](../packages/core/src/evaluator.ts));
  `?`-veld → '0' ([parser.ts:845](../packages/core/src/parser.ts)).
- **Gevolg:** beeld en berekening lopen uiteen voor elk niet-aangeraakt veld. De
  designer-pane en de uitwerking-pane rekenen dan met verschillende invoer.

| Invoer | Designer toont | Berekening (onaangeraakt) |
|---|---|---|
| Gevolgklasse | CC2 (1,0) | CC1 (0,9) ← B-07 |
| Duurklasse | Middellang | Kort |
| Profiel | 71×171 | 46×96 |
| Sterkteklasse | C24 | C18 |
| L_d / a_opl / hoh / t_vloer | 5000 / 50 / 450 / 25 | 0 / 0 / 0 / 0 |
| g_vloerplaat / q_k / Q_k | 1,5 / 1,0 / 2 | 0 / 0 / 0 |
| klimaat · eigengewicht · belastingcat · verplaatsbaar · controleer · grensfactor | — | match ✓ |

- **OPGELOST (implementatie):** gedeelde `DEFAULTS`-bron in BalklaagDesigner +
  nieuwe store-methode `seedActiveValues(defaults)` ([loadCaseStore.ts](../packages/desktop/src/store/loadCaseStore.ts))
  die op mount/case-switch alle ontbrekende keys vult (bestaande waarden blijven
  staan; geeft state ongewijzigd terug als er niets te vullen is → geen render-loop).
  De `num()`-defaults lezen nu uit diezelfde `DEFAULTS`, dus beeld en evaluator
  kunnen niet meer uiteenlopen.
- **Geverifieerd (browser-preview):** na openen Balklaag-sheet zijn designer en
  uitwerking identiek — doorbuiging 2,18 = 2,178 · **buiging 0,96 = 0,9638** ·
  afschuiving 0,20. De buiging-match bewijst dat K_FI = 1,0 (CC2) én k_mod = 0,80
  (Middellang) nu doorwerken; `b_balk = 71 mm` bevestigt het profiel-seed. Geen
  console-fouten.

---

## Geverifieerd akkoord (geen afwijking)

Onderstaande waarden uit de referentie komen overeen met de template en/of EN 338 / EN 1995-1-1:

- **Karakteristieke sterkten C24:** f_m,k 24 · f_t,0,k 14,0 · f_t,90,k 0,40 ·
  f_c,0,k 21,0 · f_c,90,k 2,5 · f_v,k 4,0 N/mm². ✅ (template gebruikt f_m,k en f_v,k)
- **k_mod GK1** (gezaagd hout): Blijvend 0,60 · Middellang 0,80 · Kort 0,90. ✅
- **Rekenwaarden** (k_mod·f_k/γ_M, γ_M = 1,30): f_m,d / f_t,0,d / f_c,0,d /
  f_c,90,d / f_v,d kloppen voor alle duurklassen. ✅ (uitz. f_t,90,d → zie B-03)
- **Moduli & dichtheid:** ρ_mean 420 · ρ_k 350 · E₀,mean 11000 · E₉₀,mean 370 ·
  E₀,fin 6875 (=E₀,mean/1,60) · E₉₀,fin 231 · E₀,₀₅ 7400 · E₀,d 8462 (=E₀,mean/1,30) ·
  G_mean 690 · G₀,₀₅ 460. ✅ — bevestigt k_def = 0,60 (gebruiksklasse 1).
- **Doorsnede-eigenschappen 71×221** — template-formules matchen exact:
  - A = b·h = 15691 mm² ✅
  - I_y = b·h³/12 = 63 863 678 mm⁴ ✅
  - W_y = b·h²/6 = 577 952 mm³ ✅ (= W_y,el referentie = I_y/z_max)
  - S_y = b·h²/8 = 433 464 mm³ ✅ (statisch moment voor afschuiving)
  - **Asconventie bevestigd:** y = sterke (horizontale) as, z = zwakke as; z_max = h/2 = 110,5,
    y_max = b/2 = 35,5. Consistent met de template.
- **Niet door template berekend, wel referentie-correct (informatief):**
  I_z 6 591 528 · S_z 139 258 · i_y 63,8 · i_z 20,5 · W_z,el 185 677. Niet nodig
  (vloerbalk zijdelings gesteund → geen zwakke-as/kniktoets). Allen narekenbaar correct.
- **Belastingen** — template-sommatie matcht exact:
  - g_k = g_vloerplaat + g_plafond + g_overig + g_wanden(vast) = 0,500 + 0,100 + 0 + 0
    = **0,600 kN/m²** ✅
  - q_k = **1,750 kN/m²** ✅ · Q_k = **3 kN** ✅
  - Scheidingswanden = 0 → keuze vast/verplaatsbaar niet van invloed in deze casus.
  - ⚪ Terminologie: "E.g." in de referentie = **eigengewicht** (niet Engels "e.g.");
    komt overeen met de template-labels `e.g. vloerplaat` etc. Eventueel labels
    verduidelijken naar "eigengewicht …" om misleesbaarheid te voorkomen.
- **BGT doorbuiging (§7.2 / §2.2.3)** — volledig conform template:
  - u_Q,k = F·L³/(48·E·I) = 4,69 mm ✅ (met onafgeronde F = 2,346 kN)
  - u_var = max(u_q,k; u_Q,k) = max(5,34; 4,69) = 5,34 mm ✅ (q_k en Q_k niet
    gelijktijdig — EN 1991-1-1 §6.3.1.2; grootste maatgevend)
  - w_fin = (1+k_def)·u_g + (1+ψ₂·k_def)·u_var = 1,60·2,27 + 1,18·5,34 = **9,93 mm** ✅
  - w_lim = 0,004·L_th = 16,28 mm (= L/250) ✅ · UC = 9,93/16,28 = **0,61** voldoet ✅
- **UGT-snedekrachten** — combinatie 6.10b (1,20·G + 1,50·Q), K_FI = 1,00 (CC2):
  - Combi 1 (P+UDL): M_yEd 4,37 kNm · V_zEd 4,29 kN ✅
  - Combi 2 (P+Q, maatgevend): M_yEd 4,69 kNm · V_zEd 4,61 kN ✅ (V met F_Q,k = 2,35; zie B-06)
  - Duurklasse **Middellang** → k_mod = 0,80 (GK1) → f_m,d 14,77 · f_v,d 2,46 N/mm². ✅
- **UGT buiging (§6.1.6, vgl. 6.11)** — conform template:
  - σ_m,y,d = M_y,Ed/W_y = 4,689×10⁶ / 577 952 = 8,1 N/mm² ✅
  - UC = σ_m,y,d/f_m,d = 8,1/14,8 = **0,55** voldoet ✅ (enkele-as, geen k_m-term)
- **UGT afschuiving (§6.1.7, vgl. 6.13)** — conform template:
  - τ_d = V_Ed·S_y/(b·I_y) = 4608,7·433464 / (71·63863678) = 0,44 N/mm² ✅
    (= 1,5·V/A; volle breedte b, geen k_cr — zie informatieve noot hieronder)
  - UC = τ_d/f_v,d = 0,44/2,46 = **0,18** voldoet ✅
  - ⚪ k_cr: met k_cr = 0,67 (EN 1995-1-1/A1) zou τ_d = 0,66 N/mm² → UC 0,27,
    nog steeds ruim. Referentie én template rekenen met volle b. Geen verschil.
- **Eindconclusie** — maatgevend **UC = 0,61** (doorbuiging) > buiging 0,55 > afschuiving 0,18
  → **Balklaag voldoet**. Identiek aan `UC_max` van de template. ✅

---

## Voortgang toetsing

- [x] Belastingen g_k / q_k / Q_k → akkoord
- [x] Lijnlasten + eigengewicht balk → ρ = 550 kg/m³ bevestigd (B-04)
- [x] Doorsnede-eigenschappen (A, I_y, W_y, S_y) → akkoord
- [x] Belastingsgeval 1 (permanent) → akkoord (zie B-04-nuance)
- [x] Belastingsgeval 2 (veranderlijk UDL) → akkoord
- [x] Belastingsgeval 3 (geconcentreerd) → akkoord; B-05 geparkeerd, B-06 beslecht
- [x] BGT doorbuiging (w_fin, grenswaarde) → akkoord (UC 0,61)
- [x] UGT buiging (§6.1.6) → akkoord (UC 0,55)
- [x] UGT afschuiving (§6.1.7) → akkoord (UC 0,18)
- [x] Eindsamenvatting / maatgevende UC → 0,61, voldoet

## Eindstand bevindingen

| ID | Onderwerp | Eindoordeel |
|---|---|---|
| B-01 | Oplegdruk (§6.1.5) niet getoetst | ⚪ in beide weggelaten; aanbeveling, niet maatgevend (~0,60) |
| B-02 | k_mod Kort GK3 = 0,80 in referentie­tabel | 🔴 norm = 0,70; niet gebruikt in deze casus (GK1) |
| B-03 | f_t,90,d-kolom met GK3 k_mod gevuld | ⚪ data-onregelmatigheid, geen impact |
| B-04 | Eigengewicht ρ = 550 / γ = 5,5 kN/m³ vs eigen 420 | 🟠 afwijkende keuze, geen fout |
| B-05 | Herkomst k_r-term (I = 3402 / I₁ = 50000) | 🅿️ geparkeerd, invloed onzeker |
| B-06 | V_Q,k 3,00 (BG3) vs 2,35 (gebruikt) | ⚪ beslecht; alleen cosmetische weergave-slip |
| B-07 | Default K_FI = 0,90 (CC1) i.p.v. CC2; idem duurklasse → Kort | ✅ opgelost via B-08-fix (symptoom van B-08) |
| B-08 | Designer-defaults niet gesynct met evaluator → beeld ≠ berekening | ✅ opgelost — designer seedt store; geverifieerd in preview |

**Slotsom:** de **referentie-uitwerking** is consistent en correct binnen zijn
aannames. De **template** reproduceert hem alleen 1-op-1 als de keuzelijsten correct
worden gezet (eigengewicht 550, **CC2**, **Middellang**) — anders onderschat de
template de UGT met ~10% (B-07). De maatgevende toets (doorbuiging 0,61) is
onafhankelijk van K_FI/duurklasse, dus de eindconclusie "voldoet" blijft staan.
B-07 is de enige echte fout aan de template-kant; overige punten zijn aannames
(B-04), cosmetisch (B-06), geparkeerd (B-05), buiten deze casus (B-02/B-03) of
aanbeveling (B-01).
