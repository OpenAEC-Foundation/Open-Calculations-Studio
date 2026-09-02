# Splitspunten tussen de referentie-uitwerking en de norm

Bij het calibreren van de modules op de referentie-uitwerking-referentiebladen komen soms
verschillen naar boven waarbij het referentieprogramma aantoonbaar iets anders
doet dan de Eurocode. Dit register houdt bij wáár dat gebeurt, wat het verschil
bij een concrete invoer betekent, en welke van de twee lezingen het blad volgt.

## Hoe het werkt

**de referentie-uitwerking is het rekenprogramma dat we vandaag hanteren en is daarom de
standaard.** De reden is nuchter: elke uitkomst in die stand is tegen een
referentieblad na te rekenen. De norm-tak heeft per definitie geen referentie —
er bestaat geen referentie-uitwerking van wat de Eurocode zou geven — en is
daarom alleen op eindigheid en op de richting van het verschil te controleren.

Elk blad rekent op zo'n punt **allebei** uit en kiest er één:

```
X_nb = …                                  volgens de norm
X_XC = …                                  volgens de referentie-uitwerking
X    = if(rekenwijze ≡ 1; X_XC; X_nb)     de gehanteerde waarde
```

De keuze staat áltijd op de laatste stap vóór de u.c., nooit binnen een
tussenformule — zo blijft de rekengang leesbaar en zie je in één oogopslag waar
de twee lezingen uiteenlopen. `rekenwijze` komt uit de **projectgegevens** en
geldt dus voor het hele project; de gekozen stand staat op de afdruk in de
projectkop.

Drie controles bewaken dit:

| script | wat het bewaakt |
|---|---|
| `check-rekenwijze.mjs` | elke `_XC`- of `_nb`-tak bereikt een schakelaar, direct of via een tussenstap. Een tak die wordt uitgerekend, netjes wordt afgedrukt en nergens meetelt, valt hier door. |
| `check-projectvariabelen.mjs` | geen blad zet `rekenwijze` als eigen invoerveld neer |
| de module-controlescripts | draaien elke referentieset twee keer: in de de referentie-uitwerking-stand moet **élke** waarde exact kloppen, in de norm-stand wordt op eindigheid en op de richting van het verschil getoetst |

Sinds de invoering van de schakelaar staat er in de de referentie-uitwerking-stand **geen
enkele afwijking meer open** in de controlescripts. Wat vroeger als
`afwijkend` werd gemeld en niet meetelde, is nu een gewone toets — dat zijn er
zo'n dertig.

Waar dit naartoe gaat: dit programma wordt uiteindelijk onafhankelijk van
de referentie-uitwerking. De norm-tak is de kant die dan overblijft, en draait daarom nu al
mee in plaats van als voetnoot te verstoffen.

Status: **open** = nog te bespreken · **vastgesteld** = keuze staat, blijft zo.

---

## 1. Kruipfactor — cementcorrectie (B.9) wordt berekend maar niet gebruikt

| | |
|---|---|
| Module | Kruipfactor (`templates/kruipfactor.ts`) |
| Norm | NEN-EN 1992-1-1 bijlage B, (B.5) met (B.9) |
| Referenties | document2A (klasse R), document4A (klasse S) |
| Status | **open** |

De referentie-uitwerking rekent de cementcorrectie netjes uit en print hem ook:

```
klasse R:  t₀ = 28 × (9/(2+28^1,2) + 1)^+1 = 32,5 d      ...(B.9)
klasse S:  t₀ = 28 × (9/(2+28^1,2) + 1)^−1 = 24,2 d      ...(B.9)
```

Maar vult vervolgens in (B.5) tóch de **onbewerkte** t₀ = 28 in:

```
β(t₀) = 1/(0,1 + 28^0,20) = 0,488                        ...(B.5)
```

(B.9) bestaat juist om via (B.5) door te werken; de correctie heeft in
de referentie-uitwerking dus geen enkel effect — klasse N, R en S geven alle drie φ = 1,61.

**Gevolg** (C45/55, RH 50 %, t₀ 28 d, h₀ 300 mm):

| cementklasse | ons blad | de referentie-uitwerking |
|---|---|---|
| S | **1,66** | 1,61 |
| N | 1,61 | 1,61 |
| R | **1,57** | 1,61 |

---

## 2. Kruipfactor — β_H is bij de referentie-uitwerking onafhankelijk van RH

| | |
|---|---|
| Module | Kruipfactor (`templates/kruipfactor.ts`) |
| Norm | NEN-EN 1992-1-1 bijlage B, (B.8a)/(B.8b) |
| Referenties | document1A (RH 50), document5A (RH 30), document6A (RH 70) |
| Status | **open** |

De term (0,012·RH)¹⁸ draagt bij de referentie-uitwerking nooit bij. Bij RH 30 en 50 % is hij
inderdaad verwaarloosbaar, maar bij RH 70 % hoort hij 19,5 toe te voegen:

| RH | norm | de referentie-uitwerking |
|---|---|---|
| 30 % | 653 | 653 |
| 50 % | 653 | 653 |
| 70 % | **673** | 653 |

**Gevolg:** bij de door de referentie-uitwerking gehanteerde t = 100000 dagen is β_c toch al
≈ 0,998, dus het eindresultaat verandert niet (φ = 1,382 in beide gevallen).
Bij een korte belastingduur — bijvoorbeeld ontkisten op 90 dagen — loopt het
verschil wél door in φ. Ons blad rekent de term mee.

---

## 3. Voetplaatverbinding — splijtcriterium is een vaste 5 N/mm²

| | |
|---|---|
| Module | Voetplaatverbinding (`templates/voetplaatverbinding.ts`) |
| Norm | EN 1993-1-8 §6.2.5(7) |
| Referenties | document4 (C30/37), document5 (C50/60) |
| Status | **open** |

de referentie-uitwerking schrijft bovenaan correct `f_gr,k ≥ 0,2·f_ck` en rekent dat ook uit
(6 resp. 10 N/mm²), maar toetst de spreidingsspanning σ_c1 daarna tegen een
vaste 5 N/mm² — de waarde die bij C25/30 hoort:

```
C30/37:  0,58 N/mm² < 5 N/mm²    (0,2·f_ck = 6)
C50/60:  0,58 N/mm² < 5 N/mm²    (0,2·f_ck = 10)
```

**Gevolg:** ons blad toetst tegen 0,2·f_ck en is daarmee bij C30/37 en hoger
strenger. In de referentiesets bleef σ_c1 ver onder beide grenzen, dus de
conclusie verschilde nergens — het verschil kan pas opspelen bij een zwaar
belaste, kleine voetplaat.

---

## 4. Verankeringslengte — α₁ = 0,70 wordt ook op rechte staven toegepast

| | |
|---|---|
| Module | Verankeringslengte (`templates/verankeringslengte.ts`) |
| Norm | NEN-EN 1992-1-1 tabel 8.2 |
| Referenties | document5B (Ø6 · c 60) en document7B (lijst per diameter) |
| Status | **open** — let op: dit is de enige afwijking die **onveilig** uitpakt |

Tabel 8.2 geeft voor de staafvorm:

- **rechte staaf** → α₁ = 1,00, zonder voorwaarde;
- **anders dan recht** → α₁ = 0,70 als c_d > 3Ø, anders 1,00.

de referentie-uitwerking laat de staafvorm buiten beschouwing en past 0,70 toe zodra
c_d > 3Ø, óók bij `Staaftype = Recht`. In document5B (Ø6, c = 60) staat:

```
l_bd = a1 a2 a3 a4 a5 l_b,rqd = 0.70 x 0.70 x 1.00 x 1.00 x 1.00 x 164 = 80 mm
```

terwijl α₂ = 0,70 is en de staaf recht — de eerste 0,70 is dus α₁.

**Gevolg** (C45/55, c = 30 mm, goede aanhechting, rechte staaf) — bij kleine
diameters is c_d > 3Ø en loopt het verschil op:

| Ø | norm | de referentie-uitwerking |
|---|---|---|
| 6 | **115** | 100 |
| 8 | **153** | 107 |
| 10 | 191 | 191 |
| 12 | 254 | 254 |
| 16 | 379 | 379 |
| 20 | 505 | 505 |

Bij Ø10 en hoger is c_d ≤ 3Ø en verdwijnt het verschil. Twee keer onafhankelijk
waargenomen. Anders dan de overige punten in dit register geeft de referentie-uitwerking hier
een **kortere** verankeringslengte dan de norm toestaat.

---

## 5. de referentie-uitwerking gebruikt twee verschillende formules voor l_b,rqd

| | |
|---|---|
| Modules | Verankeringslengte én de bijlegwapening in Voetplaatverbinding |
| Norm | NEN-EN 1992-1-1 §8.4, (8.2)/(8.3) |
| Referenties | document1B (verankeringslengte) · document11–19 (voetplaat) |
| Status | **open** |

Geen afwijking van de norm, maar een inconsistentie ín de referentie-uitwerking: dezelfde
grootheid wordt in twee modules met twee verschillende generaties van de norm
berekend, en beide krijgen het label `(8.3)`.

**Verankeringslengte** — klassieke route van 2011, via de aanhechtspanning:

```
f_bd    = 2,25·η₁·η₂·f_ctd                    ...(8.2)
l_b,rqd = (Ø/4)·(σ_sd/f_bd)                   ...(8.3)
```

**Voetplaat, bijlegwapening** — de vorm van de nieuwe generatie, zonder f_bd:

```
l_b,rqd = α₁·α₂·0,77·Ø·σ_sd / f_ck^(2/3)      ...(8.3)
```

**Gevolg:** voor C25/30, Ø16, σ_sd = 272 N/mm², c = 30 mm geeft de klassieke
route l_bd ≈ 351 mm en de nieuwe-generatievorm 341 mm — ruim 3 % verschil voor
hetzelfde geval. Onze Verankeringslengte-module volgt de klassieke route, omdat
die overeenkomt met de norm die het blad zelf bovenaan noemt
(NEN-EN 1992-1-1+C2:2011). Bij het uitwerken van de voetplaat-ankerbranche moet
dezelfde keuze gemaakt worden, anders geven onze twee modules straks óók
verschillende getallen.

---

## 6. Boutberekening — d_m is de sleutelwijdte in plaats van het gemiddelde

| | |
|---|---|
| Module | Boutberekening (`templates/boutberekening.ts`) |
| Norm | NEN-EN 1993-1-8 §3.6.1(3), tabel 3.4 |
| Referenties | document1C t/m 6C (alle zes, M16) |
| Status | **open** |

De ponsweerstand van de plaat onder de kop of de moer is

```
B_p,Rd = 0,6·π·d_m·t_p·f_u / γ_M2
```

§3.6.1(3) omschrijft d_m als het **gemiddelde** van de maat over de platte
kanten en de maat over de hoeken van kop of moer, de kleinste van beide
genomen. Voor M16 is dat (24,00 + 26,75)/2 = 25,38 mm. de referentie-uitwerking vult 24,0 mm
in — precies de sleutelwijdte s, dus zonder de maat over de hoeken mee te
middelen.

**Gevolg** (M16, S235, t_p = 20 mm):

| | ons blad | de referentie-uitwerking |
|---|---|---|
| d_m | **25,38 mm** | 24,00 mm |
| B_p,Rd | **275,5 kN** | 260,6 kN |

Het verschil is exact 24/25,38 = 0,945, dus 5,5 % — De referentie-uitwerking rekent hier
**veilig maar niet economisch**. Alle zes referentiebladen gebruiken M16, dus
de aanname dat de referentie-uitwerking in het algemeen s invult is op één diameter
vastgesteld; bij een volgende export met een andere maat is dat te bevestigen.

Let op: de referentie-uitwerking print in dezelfde regel `3,14` voor π maar rekent met de
volle π — met 3,14 zou er 260,4 in plaats van 260,6 kN uitkomen. Zie ook
*Weergavefouten* hieronder.

---

## 7. Boutberekening — de twee assen van tabel 3.4 zijn samengetrokken

| | |
|---|---|
| Module | Boutberekening (`templates/boutberekening.ts`) |
| Norm | NEN-EN 1993-1-8 tabel 3.4 |
| Referenties | document1C (eindbout) · 3C (binnenste bout) · 4C (randbout) · 5C (enkele bout) |
| Status | **open** |

Tabel 3.4 kent voor de stuikweerstand twee **onafhankelijke** assen:

| richting | positie | grootheid |
|---|---|---|
| in de krachtsrichting | eindbout | α_d = e₁/(3d₀) |
| | binnenste bout | α_d = p₁/(3d₀) − ¼ |
| loodrecht op de kracht | randbout | k₁ = min(2,8·e₂/d₀ − 1,7 ; 2,5) |
| | binnenste bout | k₁ = min(1,4·p₂/d₀ − 1,7 ; 2,5) |

Een bout kan binnenste bout zijn in de krachtsrichting én randbout daar
loodrecht op; dat zijn twee losse keuzes. de referentie-uitwerking heeft ze tot **één**
keuzelijst samengetrokken — *Eindbout · Randbout · Binnenste bout · Enkele
bout* — en lost het verlies aan vrijheid op door voor k₁ het minimum van beide
takken te nemen:

```
k₁ = min[ 2,8·e₂/d₀ − 1,7 ; 1,4·p₂/d₀ − 1,7 ; 2,5 ]
```

Bij *Enkele bout* vervalt de p₂-tak (document5C), omdat p₁ en p₂ dan niet eens
invoerbaar zijn. *Eindbout* en *Randbout* geven bij gelijke invoer **exact
hetzelfde** resultaat (document1C en 4C, beide 112,1 kN) — die twee opties zijn
in de referentie-uitwerking dus onderling verwisselbaar.

Het minimum nemen is veilig, maar de combinatie "binnenste bout loodrecht op de
kracht" is er niet mee uit te drukken: daar vraagt de tabel alleen de p₂-tak.
Dit blad houdt de twee assen gescheiden en reproduceert alle zes referenties
exact door loodrecht steeds *randbout* te kiezen.

**Gevolg** (M16, S235, t 20, e₂ 25, p₂ 60, eindbout in de krachtsrichting):

| loodrechte positie | k₁ ons blad | k₁ de referentie-uitwerking | F_b,Rd ons blad |
|---|---|---|---|
| randbout | 2,189 | 2,189 | 112,1 kN |
| binnenste bout | **2,500** | niet invoerbaar | **128,0 kN** |

Deze regel is niet tegen een referentieblad te controleren — het geval is in
de referentie-uitwerking niet in te voeren.

---

## 8. Balklaag — eigen gewicht met 550 kg/m³ en g = 10 m/s²

| | |
|---|---|
| Module | Balklaag (`templates/balklaag.ts`) |
| Norm | NEN-EN 338 (ρ_mean per sterkteklasse) + NEN-EN 1991-1-1 |
| Referenties | document1 t/m document9 (alle negen) |
| Status | **vastgesteld** |

de referentie-uitwerking drukt de juiste ρ_mean af in de materiaaltabel — 420 kg/m³ voor C24 —
en rekent het eigen gewicht vervolgens met **550 kg/m³**:

```
71×221:  A = 15691 mm²  →  G = 8,63 kg/m     (15691 × 550e-9 = 8,63; met 420: 6,59)
96×271:  A = 26016 mm²  →  G = 14,31 kg/m    (26016 × 550e-9 = 14,31)
```

document7 laat zien dat die 550 een **vaste constante** is en niet aan de
sterkteklasse hangt: GL24h heeft dezelfde ρ_mean van 420 kg/m³, en het blad
houdt onveranderd 8,63 kg/m aan. document9 bevestigt de constante op een derde
doorsnede: 71×146 geeft 10366 × 550e-9 = 5,70 kg/m.

Daarbovenop rekent de referentie-uitwerking met **g = 10 m/s²** in plaats van 9,81:

```
8,63 kg/m × 10 = 0,0863 kN/m  →  afgedrukt als 0,086
8,63 kg/m × 9,81 = 0,0847 kN/m  →  zou 0,085 zijn geweest
```

Dezelfde g = 10 duikt op bij de spuwer (water met 10 kN/m³).

**Gevolg** — het verschil zit alleen in de permanente lijnlast en werkt door in
u_g,k en w_fin. Op het basisgeval (document1):

| grootheid | ons blad | de referentie-uitwerking |
|---|---|---|
| eigen gewicht balk | **0,0847 kN/m** | 0,086 kN/m |
| u_g,k | **8,25 mm** | 8,27 mm |
| w_fin | **28,14 mm** | 28,17 mm |
| UC doorbuiging | 1,393 | 1,39 |

De UC's zelf komen op alle negen referentiebladen exact uit — het verschil is te
klein om op twee decimalen zichtbaar te worden. Het blad heeft een keuzelijst
*Eigengewicht-dichtheid balk* waarmee de 550 kg/m³ alsnog te kiezen is; de g
blijft dan 9,81.

---

## 9. Balklaag — de BGT toetst de geconcentreerde last niet

| | |
|---|---|
| Module | Balklaag (`templates/balklaag.ts`) |
| Norm | NEN-EN 1995-1-1 §2.2.3 + §7.2 |
| Referenties | document1 t/m document9 |
| Status | **vastgesteld** |

De referentie-uitwerking rekent `u_Q,k` uit — de doorbuiging door de geconcentreerde last —
en gebruikt hem daarna nergens. In de UGT wórden beide combinaties uitgewerkt
(permanent + q, en permanent + Q); in de BGT verschijnt alleen de q-variant.

Op document1 is dat niet onschuldig:

```
q-variant:  1,60 × 8,27 + 1,18 × 12,66 = 28,17 mm   (afgedrukt)
Q-variant:  1,60 × 8,27 + 1,18 ×  5,97 = 20,28 mm   (niet afgedrukt)
grens:      0,004 × 5050                = 20,20 mm
```

De Q-variant zákt dus ook, met 20,28 > 20,20 — je ziet het alleen niet. Op deze
negen bladen is de q-variant altijd maatgevend, dus het eindantwoord verandert
er nergens door, maar dat is toeval van de invoer.

**Ons blad** neemt `u_var = max(u_q,k; u_Q,k)` en toetst dus beide. Op alle acht
referenties geeft dat hetzelfde getal als de referentie-uitwerking.

Hetzelfde geldt een verdieping lager in de UGT: de referentie-uitwerking kiest daar de
maatgevende combinatie op de **grootste M**, niet op de grootste u.c. Dat gaat
mis zodra de twee combinaties in een verschillende belastingsduurklasse vallen —
een puntlast is vaak "Kort" (k_mod 0,90) en de UDL "Middellang" (0,80), en dan
kan de kleinere M de grotere u.c. geven. Ons blad neemt `max` over beide
combinaties. Op deze negen bladen is de UDL-combinatie steeds maatgevend.

---

## 10. Gording — 6.10a wordt niet getoetst, en dat is op een steil dak maatgevend

| | |
|---|---|
| Module | Gording (`templates/gording.ts`) |
| Norm | NEN-EN 1990 §6.4.3.2 + NB, (6.10a) |
| Referenties | document1 t/m document8 (gording) |
| Status | **vastgesteld** — ons blad toetst 6.10a wél |

Eerst de vraag die hieronder stond — of het ontbreken van een sneeuw+wind-
combinatie een gat is. **Dat is het niet.** De Nederlandse nationale bijlage
geeft voor zowel wind als sneeuw ψ₀ = 0 (ψ₁ = 0,2, ψ₂ = 0), en voor daken
(categorie H) geldt ψ₀ = 0 voor de dakbelasting zelf. De begeleidende term valt
dus overal weg en `permanent + één veranderlijke` is compleet.

Maar precies daardoor ontstaat een ánder gat. De twee fundamentele combinaties
voor CC2 zijn

```
(6.10a)   1,35·G + Σ 1,5·ψ₀·Q      →  met ψ₀ = 0 blijft over:  1,35·G
(6.10b)   1,2·G  + 1,5·Q + Σ 1,5·ψ₀·Q
```

De referentie-uitwerking rekent alleen 6.10b. En 6.10a is op een dak geen formaliteit, want
een combinatie zónder veranderlijke belasting valt in de duurklasse
**Blijvend**: k_mod zakt van 0,90 naar 0,60, oftewel een derde minder sterkte
tegenover een 12,5 % hogere belastingfactor.

Doorgerekend op de acht referentiebladen:

| blad | 6.10b (de referentie-uitwerking) | 6.10a |
|---|---|---|
| document1 | 1,08 | 0,93 |
| document3 | 0,96 | 0,74 |
| document4 | 0,72 | 0,45 |
| document6 | 1,39 | 1,11 |
| **document7** (dak 53,1°) | **1,77** | **1,88** ← maatgevend |
| document8 | 0,45 | 0,28 |

Op document7 is de ∥-component van het eigen gewicht groot (M_g,∥ = 4,38 kNm)
en de puntlast klein, en dan wint 6.10a. Dat blad zakt toch al, dus de conclusie
verandert er niet door — maar de gerapporteerde maatgevende u.c. is 6 % te laag,
en op een steil dak dat nét voldoet keert dat het antwoord om.

**Dat de referentie-uitwerking 6.10a niet stil meerekent is door document7 zelf bewezen:**
had hij hem gecontroleerd, dan had er 1,88 gestaan en niet 1,77.

**Ons blad toetst 6.10a wél**, als vijfde combinatie naast de vier van
de referentie-uitwerking, met k_mod = 0,60 (klimaatklasse 3: 0,50) en ook op afschuiving.
Op zeven van de acht referentiebladen verandert daar niets door — 6.10a blijft
onder 6.10b. Alleen op document7 rapporteren wij 1,54 / **1,88** waar de referentie-uitwerking
1,45 / 1,77 afdrukt; `check-gording.mjs` meldt dat als bekende afwijking.

Voor balklaag speelt dit niet: een vloer is categorie A met ψ₀ = 0,4, dus 6.10a
houdt daar een veranderlijke term en blijft in dezelfde duurklasse. Hij wordt
pas maatgevend bij G > 6·Q.

---

## 11. Gording — windzuiging alleen bij een plat dak

| | |
|---|---|
| Module | Gording (`templates/gording.ts`) |
| Norm | NEN-EN 1991-1-4 §7.2.3–7.2.5 + NB |
| Referenties | document1 (33,7°), document4 (plat), document7 (53,1°) |
| Status | **open** |

De drukcoëfficiënten staan vast op C_pi = −0,30 met C_pe afhankelijk van het
daktype:

| dak | C_pe | netto |
|---|---|---|
| plat (document4) | **−0,70** | −0,329 kN/m² — zuiging |
| 33,7° (document1) | +0,70 | +0,822 kN/m² — druk |
| 53,1° (document7) | +0,70 | +0,822 kN/m² — druk |

Een schuin dak krijgt dus nooit een zuigingsgeval en een plat dak nooit een
drukgeval. In werkelijkheid heeft een schuin dak beide: de loefzijde kan bij
lage hellingen negatief zijn en de lijzijde is dat altijd. Voor een licht dak
is opwaartse zuiging vaak maatgevend — hij keert de buiging om en ontlast het
eigen gewicht, waardoor de bevestiging het knelpunt wordt.

Ons blad volgt de referentie-uitwerking; het daktype stuurt het teken.

---

## 12. Kolom — L_cr wordt in §6.3.3 niet gebruikt

| | |
|---|---|
| Module | Kolom (`templates/kolom.ts`) |
| Norm | NEN-EN 1995-1-1 §6.3.3, tabel 6.1 |
| Referenties | document4 (kolom) |
| Status | **vastgesteld** |

Het invoerveld *Ongesteunde lengte L_cr* wordt in de kiptoets genegeerd:
De referentie-uitwerking rekent l_ef uit de **kolomlengte**. document4 maakt dat hard —
L_cr = 1600 mm, en het blad drukt af:

```
l_ef = 0,9 × 3200 = 2880 mm      l_ef = l_ef + 2h = 2880 + 2 × 144 = 3168 mm
```

Zolang L_cr ≤ L — en fysiek kan de ongesteunde lengte de kolom niet overtreffen —
is dat de **veilige kant**: een langere kiplengte geeft een lagere σ_m,crit en
dus een lagere k_crit. Het is dus geen rekenfout maar een dood invoerveld.

**Ons blad rekent met `max(L; L_cr)`.** Op alle zes referenties is L_cr ≤ L, dus
l_ef blijft daar exact gelijk aan de referentie-uitwerking. Het verschil treedt alleen op als
iemand een L_cr groter dan de kolomlengte invult — dan wordt hij bij ons wél
gebruikt in plaats van stilzwijgend genegeerd.

---

## 13. Gording — 6.11 en 6.12 worden uit één combinatie afgedrukt

| | |
|---|---|
| Module | Gording (`templates/gording.ts`) |
| Norm | NEN-EN 1995-1-1 §6.1.6, (6.11) en (6.12) |
| Referenties | wind4 en wind7 (de windvarianten) |
| Status | **vastgesteld** — ons blad neemt per formule de max |

de referentie-uitwerking kiest één maatgevende belastingcombinatie en drukt daarvan zowel
(6.11) als (6.12) af. Maar beide formules moeten voor **elke** combinatie
gelden, en ze wegen de assen tegengesteld: (6.11) telt σ_m,y vol en σ_m,z met
k_m, (6.12) andersom. Een combinatie die op 6.11 wint, kan op 6.12 verliezen.

Op wind4 (terreincategorie zee/kust, q_p = 1,295) gebeurt precies dat:

| combinatie | 6.11 | 6.12 |
|---|---|---|
| permanent + puntlast | 2,11 | **2,18** |
| permanent + wind | **2,50** | 2,06 |

de referentie-uitwerking kiest de windcombinatie — terecht, die wint op 6.11 — en drukt dan
haar 6.12 van 2,06 af. De werkelijke maatgevende 6.12 is 2,18, uit de
puntlastcombinatie. Idem op wind7 (1,88 afgedrukt, 2,18 werkelijk).

Ons blad neemt per formule de max over alle combinaties en komt daarom op 2,18.
Op de conclusie maakt het hier niets uit — beide bladen zakken toch — maar de
gerapporteerde u.c. is bij de referentie-uitwerking te laag.

Dit is dezelfde soort vereenvoudiging als punt 9 bij balklaag: te vroeg
terugvallen op één combinatie.

---

## Weergavefouten (geen rekengevolg)

Deze zijn puur cosmetisch aan de referentie-uitwerking-zijde, maar goed om te kennen bij het
lezen van een referentieblad:

- **Kruipfactor** — het veld *Relatieve vochtigheid* print de betonklasse
  (`C45/55`) in plaats van de ingevoerde RH. De berekening zélf gebruikt de RH
  wel correct; die is alleen af te lezen uit de φ_RH-regel in de uitwerking.
- **Kruipfactor** — er verschijnt een melding
  `Invoerfout: Pas Ld beg. aan: Ld beg. > 50!!`. "Ld beg." is geen grootheid in
  bijlage B; de melding hoort bij een andere module en heeft geen invloed op de
  uitkomst.
- **Kruipfactor** — β_H krijgt altijd het label `(B.8a)`, ook waar aantoonbaar
  (B.8b) wordt toegepast. Ga bij het narekenen af op de formule, niet op het
  label.
- **Boutberekening** — in de regel van B_p,Rd staat `0,6 x 3.14 x …` afgedrukt,
  maar er wordt met de volle π gerekend: het afgedrukte resultaat 260,6 kN is
  niet te reproduceren met 3,14 (dat geeft 260,4). Reken bij het narekenen met π.
- **Boutberekening** — de afschuifweerstand houdt in de formule het symbool
  `A_s` aan, óók wanneer het afschuifvlak door de schacht gaat en er
  aantoonbaar met A = 201 mm² gerekend wordt (document2C). Ga af op het getal,
  niet op het symbool.
- **Balklaag** — `V_Q,k` wordt afgedrukt als de **onverminderde** Q_k (2,00 kN),
  dus zonder de concentratiefactor k_r. document3 maakt dat hard: daar is
  F_Q,k = 1,34 kN, staat er `V_Q,k = 2,00 kN`, en rekent de UGT-combinatie
  eronder met 1,34 (`1,20 × 1,73 + 1,50 × 1,34 = 4,08`). De gedrukte waarde
  hoort bij geen van beide en wordt nergens gebruikt.
- **Balklaag** — de u.c. bij buiging is niet te reproduceren uit de gedrukte
  operanden: `13,2 / 14,8` geeft 0,89, het blad drukt 0,90 af. Er wordt intern
  met 13,229 / 14,769 = 0,8957 gerekend. Reken na met de onafgeronde waarden.
- **Balklaag** — in de k_mod-tabel staat achter elke waarde een tweede getal
  tussen haakjes (klasse 1: `0,60(0,50) 0,80(0,65) 0,90(0,80)`; klasse 3:
  `0,50(0,40) 0,65(0,55) 0,70(0,65)`). Die tweede kolom wordt op geen van de
  negen bladen gebruikt — gerekend wordt altijd met de eerste, en die klopt met
  Tabel 3.1. Wat de haakjes betekenen is onbekend.
- **Gording** — de doorbuigingen worden **afgekapt** op twee decimalen in plaats
  van afgerond. document3 laat het twee keer zien: u_g⊥ = 5,798 wordt `5.79` en
  u_w⊥ = 6,308 wordt `6.30`. Dezelfde afkapping staat al in de kop van
  `kolom.ts` (u.c. 6.35 = 1,035 gedrukt als `1.03`). Reken na met de
  onafgeronde waarden; de gedrukte waarde is een ondergrens.
- **Gording** — `Aantal gordingen 3 mm`: een eenheid achter een aantal.
- **Gording** — blad 4 zet de sneeuwbelasting onder de labels `M g,k⊥`,
  `V g,k⊥` en `u g,k⊥`, overgebleven van het permanente geval. De getallen zijn
  wél die van de sneeuw.
- **Gording** — boven de BGT staat *"Alleen buiging om de sterke as"*, waarna
  w_fin,z gewoon wordt getoetst en op document1 met 3,63 zelfs maatgevend is.
- **Gording** — de V in de afschuivingsregel wijkt 0,04 % af van de V uit de
  eigen combinatietabel: 7264,2 N tegen 1,20 × 2,53 + 1,50 × 2,82 = 7267 N
  (document1). Niet te herleiden, zonder gevolg voor het resultaat.
- **Gording** — `Dikte dakbeschot` en `I dakbeschot` zijn onafhankelijke
  invoervelden: document2 zet de dikte van 18 naar 25 mm en er verandert geen
  enkel getal, omdat alleen I meetelt.
- **Kolom** — het veld *Oppervlak / Gewicht* drukt `G = 380,00 kg/m` af voor een
  75×175 (document1) en `420,00 kg/m` voor dezelfde doorsnede in document5 en 6.
  Het eigen gewicht van 75×175 hout is ~7 kg/m; er staat een dichtheid in een
  massa-per-lengte-veld, en dan ook nog een andere per blad. Het getal wordt
  nergens gebruikt — dit blad rekent met rekenwaarden.
- **Kolom** — in de 6.19-regel staat de noemer als `f t,0,d` afgedrukt terwijl er
  aantoonbaar met f_c,0,d = 9,7 wordt gerekend (document4: (2,4/9,7)² + 43,8/11,2
  = 3,98). Ga af op het getal, niet op het symbool.
- **Kolom** — (6.20) wordt niet afgedrukt, alleen (6.19). In deze module maakt dat
  niets uit omdat er geen moment om de zwakke as is en 6.19 dan altijd de grootste
  van de twee is; ons blad toetst ze allebei.
- **Voetplaatverbinding** — bladen met een lege staalsoort rekenen met
  f_yd = −1 en printen `NaN` door de hele drukbranche, maar eindigen wél met
  "Conclusie: voldoet". Controleer bij een referentieblad altijd eerst of de
  staalsoort is ingevuld.

---

## Werkwijze

Alle gecalibreerde modules hebben een controlescript in `scripts/`. Samen te
draaien met:

```
npm run check
```

Dat bouwt de core en draait `check-spuwer`, `check-kruipfactor`,
`check-verankeringslengte`, `check-boutberekening`, `check-balklaag`,
`check-gording`, `check-kolom`, `check-afkortingen` en
`check-projectvariabelen` (die laatste bewaakt de grens tussen projectgegevens
en bladinvoer — zie `docs/projectmodel.md`).
Elk script zet de invoer van de referentiebladen in de module en vergelijkt de
tussenstappen met het afgedrukte getal; de tolerantie volgt uit de
gedocumenteerde precisie, dus `96` toetst op ±0,5 en `45,7` op ±0,05. De
afwijkingen uit dít register staan er als `afwijkend` in en tellen niet als
fout — anders zou de suite permanent rood staan op iets waarvan juist is
vastgesteld dat wíj gelijk hebben.

Een ander gereedschap beantwoordt een andere vraag: `npm run snapshot` haalt
alle rekenbladen door parse → evaluate → render, zodat je vóór en ná een
wijziging in `packages/core` kunt vergelijken. Dat zegt "er is niets
veranderd"; de controlescripts zeggen "het klopt nog met het referentieblad".
Je hebt ze allebei nodig.

Bij een nieuwe afwijking:

1. Reproduceer beide varianten in het controlescript (`check-<module>.mjs`) en
   markeer de de referentie-uitwerking-waarde als `afwijkend`, niet als fout.
2. Voeg een `#if`-blok toe aan het rekenblad dat het verschil print zodra het
   bij die invoer optreedt.
3. Noteer hem hier, met module, normartikel, referentiebladen en het
   getalsmatige gevolg.
