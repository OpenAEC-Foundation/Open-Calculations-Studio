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
  concentratiefactor k_r is dan 1,0 en de trillingstoets staat standaard uit.
  Bij schema 4 (raveelbalk) blijft de belaste breedte l_staart/2.

## Belastinggevallen

Karakteristieke waarden per balk:

| geval | omschrijving | schema's |
|---|---|---|
| BG1 | permanent P_g,k op alle velden (en het overstek) | alle |
| BG2 | veranderlijk q_q,k op veld 1 (en het overstek bij schema 2) | alle |
| BG3 | veranderlijk q_q,k op veld 2 | 3 |
| BG4 | puntlast F_Q,k midden veld 1 (schema 2: ook op het overstekeinde, maatgevende van de twee) | alle |
| BG5 | puntlast F_Q,k midden veld 2 | 3 |

De permanente last gaat altijd over alle velden met één factor: volgens de NB
bij tabel NB.4 – A1.2(B) hoeft het onderscheid tussen gunstig en ongunstig bij
STR/GEO alleen voor het totaal van een soort belasting te worden gemaakt.

Rekenwijze bij schema 3: de drie-momentenvergelijking per geval. Voor een
gelijkmatige last w₁ op veld 1 en w₂ op veld 2 geldt
M_B = (w₁·L₁³ + w₂·L₂³) / (8·(L₁ + L₂)); voor een puntlast P midden in veld 1
M_B = 3·P·L₁² / (16·(L₁ + L₂)). Daaruit volgen reacties, M(x), V(x) en de
zakking (met de bestaande vormfuncties). Zakkingen tellen per geval lineair op in
een vast punt. Het bestaande midden-van-het-veld-criterium met de toeslag van 4 %
blijft de maat voor de grootste zakking.

## Combinaties

Factoren uit de projectgegevens (CC) volgens NB.4/NB.5; ψ uit de gekozen
belastingcategorie.

| combinatie | wat | opbouw |
|---|---|---|
| UGT veld 1 | 6.10b | γ_G·BG1 + γ_Q·BG2 |
| UGT steun | 6.10b | γ_G·BG1 + γ_Q·(BG2 + BG3) |
| UGT veld 2 | 6.10b | γ_G·BG1 + γ_Q·BG3 |
| UGT puntlast | 6.10b | γ_G·BG1 + γ_Q·BG4 (of BG5) |
| BGT karakteristiek veld i | 6.14b | 1,0·BG1 + 1,0·BG(veranderlijk op veld i) |
| BGT quasi-blijvend veld i | 6.16b | 1,0·BG1 + ψ₂·BG(veranderlijk op veld i) |

M_y,Ed en V_z,Ed zijn de omhullende over de UGT-combinaties. w_fin per veld is
w_inst + k_def·w_qp, gelijk aan de huidige formule
(1 + k_def)·u_g + (1 + ψ₂·k_def)·u_var. De rekenwijze-keuze voor u_var
(alleen de verdeelde last, of de maatgevende van verdeeld en puntlast) blijft
bestaan.

Voor schema 1, 2 en 4 levert dit dezelfde uitkomsten als nu (er is maar één
veld). `scripts/check-balklaag.mjs` moet dus ongewijzigd groen blijven.

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
doorrekeningen. De lijnen in het beeld volgen de omhullende uit het blad.

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
