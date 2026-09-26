# Balklaag: schaakbordbelasting, belastinggevallen en combinaties — ontwerp

Datum: 26-09-2026
Status: ontwerp, uit te werken na het constructierapport

## Aanleiding

Drie wensen voor de module Balklaag:

1. Bij een ligger op drie steunpunten (schema 3) ook schaakbordbelasting: de
   veranderlijke last per veld apart, zodat het veldmoment en de doorbuiging van
   elk veld maatgevend kunnen worden.
2. In de uitwerking (in het rapport bijlage A) de belastinggevallen afzonderlijk
   laten zien, elk met zijn M-, V- en u-lijn.
3. Laten zien hoe de quasi-blijvende combinatie (6.16b) is opgebouwd.

Nu rekent het blad schema 3 met de volle lijnlast op beide velden. Het
steunmoment klopt daarmee, maar het veldmoment en de doorbuiging van een veld
zijn onder schaakbordbelasting groter.

## Afmetingen en soort ligger

Twee aanvullingen, nodig voor de liggers in lopende projecten:

- **Vrije afmetingen.** De profiellijst krijgt een laatste keuze "Zelf invullen"
  met b en h in mm. Zo zijn ook maten als 60×205, 63×211, 90×230 en 200×200 te
  rekenen. Het beeld toont dan twee invoervelden in plaats van de lijst.
  "Ontwerp" blijft alleen over de lijst lopen.
- **Soort ligger.** Keuze "Balk in een balklaag" (belaste breedte = h.o.h., zoals
  nu) of "Onderslag (belaste breedte)". Bij een onderslag is de belaste breedte
  invoer in m: bij doorgaande balken over twee gelijke velden 1,25 × L, bij
  losse balken aan weerszijden de som van de halve overspanningen. De
  concentratiefactor k_r is dan 1,0 en de trillingstoets vervalt: het blad
  toetst trilling alleen als `controleer_trilling = 1` én de ligger geen
  onderslag is. Bij schema 4 (raveelbalk) blijft de belaste breedte
  l_staart/2 en blijft de trillingstoets, ook als de soort op "Onderslag" staat.
- **Tweede veld.** `L_veld2` is de theoretische overspanning van het tweede
  veld (hart op hart steunpunten), niet de dagmaat: bij veld 1 telt het blad
  a_opl zelf bij L_d op, bij veld 2 niet.

## Belastinggevallen

Karakteristieke waarden per balk:

| geval | omschrijving | schema's |
|---|---|---|
| BG1 | permanent P_g,k op alle velden (en het overstek) | alle |
| BG2 | veranderlijk q_q,k op veld 1 | alle |
| BG3 | veranderlijk q_q,k op veld 2, of op het overstek | 2 en 3 |
| BG4 | puntlast F_Q,k midden veld 1 | alle |
| BG5 | puntlast F_Q,k midden veld 2, of op het uiteinde van het overstek | 2 en 3 |

Het overstek is voor de schaakbordbelasting een tweede deel, net als veld 2.
Een veranderlijke last op het overstek ontlast het veld; stond hij er altijd
op (zoals eerst in dit ontwerp, BG2 op veld én overstek), dan kwamen het
veldmoment en de zakking van het veld te gunstig uit.

De permanente last gaat altijd over alle velden met één factor: volgens de NB
bij tabel NB.4 – A1.2(B) hoeft het onderscheid tussen gunstig en ongunstig bij
STR/GEO alleen voor het totaal van een soort belasting te worden gemaakt.

Rekenwijze bij schema 3: de drie-momentenvergelijking per geval. Voor een
gelijkmatige last w₁ op veld 1 en w₂ op veld 2 geldt
M_B = (w₁·L₁³ + w₂·L₂³) / (8·(L₁ + L₂)); voor een puntlast P midden in veld 1
M_B = 3·P·L₁² / (16·(L₁ + L₂)). Daaruit volgen reacties, M(x), V(x) en de
zakking (met de bestaande vormfuncties). Zakkingen tellen per geval lineair op in
één punt per veld: waar de eindstand w_fin het grootst is. Dat punt wordt langs
de hele lijn van het veld gezocht (49 punten, daarna een parabool door het
hoogste punt en zijn buren); alle belastinggevallen worden in dat punt
opgeteld, zodat w_fin = w_inst + w_kruip exact blijft. De vroegere toeslag van
4 % op de zakking midden in het veld vervalt: die gold alleen zolang het
steunmoment kleiner is dan wL²/8, en bij ongelijke velden is het korte veld
daar niet aan gebonden. Bij een overstek telt daarnaast het uiteinde (BG1 met
BG3, in de norm-stand of BG5), getoetst tegen grensfactor·2a.

## Combinaties

Factoren uit de projectgegevens (CC) volgens NB.4/NB.5; ψ uit de gekozen
belastingcategorie.

| combinatie | wat | opbouw |
|---|---|---|
| UGT veld 1 | 6.10a en 6.10b | f_G·BG1 + f_Q·BG2 |
| UGT steun | 6.10a en 6.10b | f_G·BG1 + f_Q·(BG2 + BG3) |
| UGT veld 2 of overstek | 6.10a en 6.10b | f_G·BG1 + f_Q·BG3 |
| UGT puntlast | 6.10a en 6.10b | f_G·BG1 + f_Q·BG4 (of BG5) |
| BGT karakteristiek deel i | 6.14b | 1,0·BG1 + 1,0·BG(veranderlijk op deel i) |
| BGT quasi-blijvend deel i | 6.16b | 1,0·BG1 + ψ₂·BG(veranderlijk op deel i) |

De NB bij tabel A1.2(B) vraagt 6.10a én 6.10b. Per UGT-rij telt de
ongunstigste; de tabel in het blad toont beide, de maatgevende vet.

| gevolgklasse | 6.10a: f_G / f_Q | 6.10b: f_G / f_Q |
|---|---|---|
| CC1 | 1,2 / 1,35·ψ₀ | 1,1 / 1,35 |
| CC2 | 1,35 / 1,5·ψ₀ | 1,2 / 1,5 |
| CC3 | 1,5 / 1,65·ψ₀ | 1,3 / 1,65 |

6.10a wint bij ψ₀ = 1,0 (categorie E) altijd, en bij ψ₀ = 0,4 zodra G > 6·Q,
bijvoorbeeld een onderslag met wanden erop.

M_y,Ed en V_z,Ed zijn de omhullende over de UGT-combinaties. w_fin per veld is
w_inst + k_def·w_qp, gelijk aan de huidige formule
(1 + k_def)·u_g + (1 + ψ₂·k_def)·u_var. De rekenwijze-keuze voor u_var
(alleen de verdeelde last, of de maatgevende van verdeeld en puntlast) blijft
bestaan.

Uitkomsten tegenover het blad vóór de belastinggevallen:

- **Schema 1 en 4**: zakkingen, doorbuigings- en trillingstoets gelijk.
  M_y,Ed en V_z,Ed alleen hoger waar 6.10a maatgevend is.
  `scripts/check-balklaag.mjs` blijft ongewijzigd groen.
- **Schema 2 (overstek)**: de uitkomsten veranderen. Het oude blad zette de
  veranderlijke last tegelijk op veld en overstek en zat daardoor aan de
  onveilige kant: bij 4,05 + 1,20 m was M_y,Ed 9,6 % te laag (4,22 tegen
  4,63 kNm), bij 4,05 + 0,80 m 5,4 %, en w_fin van het veld 9,57 tegen
  10,50 mm. Nieuw is de toets van het uiteinde tegen grensfactor·2a.
- **Schema 3**: de zakking van het korte veld komt hoger uit dan met de
  toeslag van 4 % (bij 3,00 + 4,00 m met G_k = 3,0: 1,57 tegen 1,45 mm); de
  trillingstoets rekent met het langste veld in plaats van veld 1.

## Trilling bij twee velden

De eigenfrequentie f₁ en de responssnelheid rekenen met het langste veld als
ligger op twee steunpunten: dat geeft de laagste eigenfrequentie. Het
stijfheidscriterium (1 kN) zet de eenheidslast midden in het langste veld L en
rekent de doorlopendheid mee:

w = P·L³/(48·EI) − M_B·L²/(16·EI), met M_B = 3·P·L²/(16·(L₁ + L₂)).

Bij gelijke velden is dat 23/1536·P·L³/EI. Zo geeft dezelfde ligger in
spiegelbeeld hetzelfde oordeel; eerder telde alleen L_th van veld 1.

## Weergave in het blad

- **Belastinggevallen**: per geval een kop, de lijnlast of puntlast, en drie kleine
  lijnen (M, V, u) op dezelfde lengteschaal als het statische schema, met de
  kenmerkende waarden erbij (veldmomenten, steunmoment, grootste dwarskracht,
  zakking per veld).
- **Combinatietabel**: rijen per combinatie, kolommen per belastinggeval, in elke
  cel de factor, en rechts de uitkomst (M_Ed, V_Ed, of u).
- **6.16b uitgeschreven**: q_qp = 1,0·P_g,k + ψ₂·q_q,k met ingevulde getallen,
  u_qp = 1,0·u_BG1 + ψ₂·u_BG2 per veld, en daarna w_kruip = k_def·w_qp en
  w_fin = w_inst + w_kruip.
- **Omhullende M- en V-lijn** in §10 (de huidige lijn toont alleen volle
  belasting).

Omdat de uitwerking bijlage A van het rapport is, staan de gevallen daarmee ook
in het rapport.

## Het parametrische beeld

`BalklaagDesigner.tsx` heeft een eigen kopie van de coëfficiënten (`toets()`),
ook voor de knop "Ontwerp", die het eerste passende profiel kiest. Die kopie
wordt niet uitgebreid. Het beeld leest de uitkomst voortaan uit het blad
(`useBladUitkomst`, zoals de andere beelden). "Ontwerp" rekent per profiel het
blad door (parse + evaluate met een ander `profiel`); dat zijn hooguit 27
doorrekeningen. Verandert de invoer terwijl hij zoekt, dan schrijft hij niets.
De lijnen in het beeld volgen de omhullende uit het blad, over 6.10a en 6.10b;
de stippen van w_fin staan op de plaats die het blad vond.

Een ingevoegd blad bewaart zijn eigen tekst. Het beeld leest af wat die tekst
kent (`balklaagBlad.ts`): zonder de keuze "soort ligger" of "Zelf invullen"
biedt het die niet aan en meldt het dat het blad uit een oudere versie komt;
een verborgen k_def volgt dan uit de klimaatklasse, en zonder 6.10a-factoren
tekent het alleen 6.10b.

## Controles

- `check-balklaag.mjs` blijft groen voor schema 1 (referentiebladen).
- Nieuwe gevallen voor schema 3, met de hand nagerekend:
  - gelijke velden L₁ = L₂ = L en alleen BG2: steunmoment q·L²/16, veldmoment
    veld 1 49/512·q·L²;
  - volle belasting op beide velden: steunmoment q·L²/8, veldmoment 9/128·q·L²;
  - ongelijke velden tegen een onafhankelijke numerieke balkberekening in het
    controlescript (differentiemethode met fijne verdeling);
  - de omhullende is nooit kleiner dan de oude volle-belastingwaarde, behalve
    waar schaakbord ontlast;
  - de 6.16b-regel: q_qp en u_qp gelijk aan de optelling van de gevallen.
- Het overstek tegen dezelfde numerieke balk: veld zonder last op het overstek,
  en het uiteinde (BG1 + BG3) tegen grensfactor·2a.
- De zakking als grootste waarde langs de lijn van elk veld, met de plaats
  ervan, ook voor een kort veld dat omhoog komt.
- 6.10a naast 6.10b: categorie E, en een onderslag met een zware permanente
  last.
- Trilling: spiegelbeeld geeft hetzelfde oordeel, f₁ gelijk aan de
  enkelvoudige ligger over het langste veld, w/F met de hand
  (23/1536·P·L³/EI bij gelijke velden); geen toets bij een onderslag.
