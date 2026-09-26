# Splitspunten tussen de referentie-uitwerking en de norm

Bij het calibreren van de modules op de referentiebladen komen soms
verschillen naar boven waarbij het referentieprogramma aantoonbaar iets anders
doet dan de Eurocode. Dit register houdt bij wáár dat gebeurt, wat het verschil
bij een concrete invoer betekent, en welke van de twee lezingen het blad volgt.

## Hoe het werkt

**De referentie-uitwerking is het rekenprogramma dat we vandaag hanteren en is daarom de
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

De keuze staat op één regel, nooit binnen een tussenformule — zo blijft de
rekengang leesbaar en zie je in één oogopslag waar de twee lezingen
uiteenlopen. Meestal is dat de laatste stap vóór de u.c. Drukt het blad
tussenwaarden af die van de keuze afhangen, dan staat de keuze zo vroeg dat
elke afgedrukte regel rekenkundig klopt (kruipfactor: op β(t₀) en β_H). Is het
splitspunt geen waarde maar een toets die in één stand niet meedoet (6.10a bij
de gording, de minimale-excentriciteitstoets bij de metselwerkwand), dan zet
het blad die toets op `rekenwijze` aan of uit. `rekenwijze` komt uit de
**projectgegevens** en geldt dus voor het hele project; de gekozen stand staat
op de afdruk in de projectkop.

Drie controles bewaken dit:

| script | wat het bewaakt |
|---|---|
| `check-rekenwijze.mjs` | elke `_XC`- of `_nb`-tak bereikt een schakelaar, direct of via een tussenstap. Een tak die wordt uitgerekend, netjes wordt afgedrukt en nergens meetelt, valt hier door. |
| `check-projectvariabelen.mjs` | geen blad zet `rekenwijze` als eigen invoerveld neer |
| de module-controlescripts | draaien elke referentieset twee keer: in de referentiestand moet **élke** waarde exact kloppen, in de norm-stand wordt op eindigheid en op de richting van het verschil getoetst, en waar een handberekening bestaat ook op het getal |

Sinds de invoering van de schakelaar staat er in de referentiestand **geen
enkele afwijking meer open** in de controlescripts. Wat vroeger als
`afwijkend` werd gemeld en niet meetelde, is nu een gewone toets — dat zijn er
zo'n dertig.

Waar dit naartoe gaat: dit programma wordt uiteindelijk onafhankelijk van
de referentie-uitwerking. De norm-tak is de kant die dan overblijft, en draait daarom nu al
mee in plaats van als voetnoot te verstoffen.

Status: **open** = nog te bespreken · **vastgesteld** = keuze staat, blijft zo ·
**vervallen** = bij nader inzien geen afwijking; het nummer blijft staan.

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

| cementklasse | norm-stand | referentiestand |
|---|---|---|
| S | **1,66** | 1,61 |
| N | 1,61 | 1,61 |
| R | **1,57** | 1,61 |

Het splitspunt ligt op β(t₀). φ₀, β_c en φ rekenen daarna met de gekozen tak,
zodat elke afgedrukte regel rekenkundig klopt. Is φ volgens bijlage B hoger
(klasse S), dan meldt het blad in de referentiestand die waarde. Het
parametrisch beeld leest φ en de tussenwaarden uit het blad en toont dus
dezelfde tak.

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

**Gevolg:** bij de door de referentie-uitwerking gehanteerde t = 100000 dagen
is β_c toch al ≈ 0,998, dus het eindresultaat verandert niet (φ = 1,382 in
beide gevallen). Bij een korte belastingduur loopt het verschil wél door in φ.
C45/55, RH 70 %, t₀ 28 d, h₀ 300 mm, t = 90 d:

```
norm:        β_H = 1,5·(1 + 0,84^18)·300 + 250·0,813 = 673
             β_c = (62/735)^0,3 = 0,476      φ = 1,385 × 0,476 = 0,660
referentie:  β_H = 1,5·300 + 250·0,813 = 653
             β_c = (62/715)^0,3 = 0,480      φ = 1,385 × 0,480 = 0,665
```

Hier ligt de referentiestand dus iets aan de veilige kant.

Het splitspunt ligt op β_H. In de norm-stand telt de term mee, in de
referentiestand niet; β_c en φ volgen de gekozen tak.

---

## 3. Voetplaatverbinding — splijtcriterium is een vaste 5 N/mm²

| | |
|---|---|
| Module | Voetplaatverbinding (`templates/voetplaatverbinding.ts`) |
| Norm | EN 1993-1-8 §6.2.5(7) |
| Referenties | document4 (C30/37), document5 (C50/60) |
| Status | **open** |

De referentie-uitwerking schrijft bovenaan correct `f_gr,k ≥ 0,2·f_ck` en rekent dat ook uit
(6 resp. 10 N/mm²), maar toetst de spreidingsspanning σ_c1 daarna tegen een
vaste 5 N/mm² — de waarde die bij C25/30 hoort:

```
C30/37:  0,58 N/mm² < 5 N/mm²    (0,2·f_ck = 6)
C50/60:  0,58 N/mm² < 5 N/mm²    (0,2·f_ck = 10)
```

**Gevolg:** ons blad rekent σ_c1 niet uit en heeft geen spreidings- of
splijttoets; op dit punt is er dus geen rekenwijze-schakelaar. Het blad drukt
in §5 wel de eis aan de ondersabeling af: f_ck,g ≥ 0,2·f_ck, en bij
t_g > 50 mm f_ck,g ≥ f_ck van het blok (§6.2.5(7)). Is de ondersabeling dikker
dan 0,2·min(b_p; d_p), dan geldt β_j = 2/3 niet. Er staat dan een oranje
melding onder §5 en in de samenvatting de regel 'Ondersabeling — apart
toetsen'. De slotzin zegt 'niet volledig getoetst', zodat de rapportkop geen
'voldoet' leest. De vaste 5 N/mm² van de referentie-uitwerking ligt bij C30/37
en hoger onder de eis van §6.2.5(7). In de referentiesets bleef σ_c1 ver onder
beide grenzen, dus de conclusie verschilde nergens.

---

## 4. Verankeringslengte — α₁ = 0,70 wordt ook op rechte staven toegepast

| | |
|---|---|
| Module | Verankeringslengte (`templates/verankeringslengte.ts`) |
| Norm | NEN-EN 1992-1-1 tabel 8.2 |
| Referenties | document5B (Ø6 · c 60) en document7B (lijst per diameter) |
| Status | **open** — let op: de referentie-uitwerking pakt hier **onveilig** uit |

Tabel 8.2 geeft voor de staafvorm:

- **rechte staaf** → α₁ = 1,00, zonder voorwaarde;
- **anders dan recht** → α₁ = 0,70 als c_d > 3Ø, anders 1,00.

De referentie-uitwerking laat de staafvorm buiten beschouwing en past 0,70 toe zodra
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
waargenomen. De referentie-uitwerking geeft hier dus een **kortere**
verankeringslengte dan de norm toestaat.

**Weergave:** in de referentiestand drukt het blad het product in §7 af met de
α₁ die het getal stuurt (0,70). Factoren, product en l_bd passen daardoor bij
elkaar. Direct onder l_bd staat een rode regel 'Korter dan tabel 8.2 toestaat'
met de normwaarde l_bd,nb. Het parametrische beeld volgt dezelfde stand
(`ctx.xc`) en toont de normwaarde in oranje ernaast. Het splitspunt afschaffen
(altijd de normwaarde) is een aparte keuze; dan moeten de verwachtingen van
document5B (100) en document7B (107) in `check-verankeringslengte.mjs` mee.

---

## 5. De referentie-uitwerking gebruikt twee verschillende formules voor l_b,rqd

| | |
|---|---|
| Modules | Verankeringslengte; bij de referentie-uitwerking ook de bijlegwapening in de voetplaatmodule |
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
die overeenkomt met de norm die het referentieblad zelf bovenaan noemt
(NEN-EN 1992-1-1+C2:2011). Onze Voetplaatverbinding heeft geen tak voor
bijlegwapening; komt die er, dan moet dezelfde keuze gemaakt worden, anders
geven onze twee modules óók verschillende getallen.

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
genomen. Voor M16 is dat (24,00 + 26,75)/2 = 25,38 mm. De referentie-uitwerking vult 24,0 mm
in — precies de sleutelwijdte s, dus zonder de maat over de hoeken mee te
middelen.

**Gevolg** (M16, S235, t_p = 20 mm):

| | norm-stand | referentiestand |
|---|---|---|
| d_m | **25,38 mm** | 24,00 mm |
| B_p,Rd | **275,5 kN** | 260,6 kN |

Het verschil is exact 24/25,38 = 0,945, dus 5,5 % — de referentie-uitwerking rekent hier
**veilig maar niet economisch**. Het blad rekent beide; in de referentiestand
staat de normwaarde erbij. Alle zes referentiebladen gebruiken M16, dus
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
| Norm | NEN-EN 1993-1-8 tabel 3.4, met correctieblad |
| Referenties | document1C (eindbout) · 3C (binnenste bout) · 4C (randbout) · 5C (enkele bout) |
| Status | **open** |

Tabel 3.4 kent voor de stuikweerstand twee **onafhankelijke** assen:

| richting | positie | grootheid |
|---|---|---|
| in de krachtsrichting | eindbout | α_d = e₁/(3d₀) |
| | binnenste bout | α_d = p₁/(3d₀) − ¼ |
| loodrecht op de kracht | randbout | k₁ = min(2,8·e₂/d₀ − 1,7 ; 1,4·p₂/d₀ − 1,7 ; 2,5) |
| | randbout, geen tweede bout loodrecht op de kracht | k₁ = min(2,8·e₂/d₀ − 1,7 ; 2,5) |
| | binnenste bout | k₁ = min(1,4·p₂/d₀ − 1,7 ; 2,5) |

De p₂-tak bij de randbout staat in de tabel sinds het correctieblad; de tekst
daarvóór gaf voor een randbout alleen de e₂-tak. In het blad betekent p₂ = 0
(of niet ingevuld) bij een randbout: geen tweede bout loodrecht op de kracht.

Een bout kan binnenste bout zijn in de krachtsrichting én randbout daar
loodrecht op; dat zijn twee losse keuzes. De referentie-uitwerking heeft ze tot
**één** keuzelijst samengetrokken — *Eindbout · Randbout · Binnenste bout ·
Enkele bout* — en neemt voor k₁ het minimum van beide takken:

```
k₁ = min[ 2,8·e₂/d₀ − 1,7 ; 1,4·p₂/d₀ − 1,7 ; 2,5 ]
```

Bij *Enkele bout* vervalt de p₂-tak (document5C), omdat p₁ en p₂ dan niet eens
invoerbaar zijn. *Eindbout* en *Randbout* geven bij gelijke invoer **exact
hetzelfde** resultaat (document1C en 4C, beide 112,1 kN) — die twee opties zijn
in de referentie-uitwerking dus onderling verwisselbaar.

Voor een randbout is dat minimum precies de tabel, en *Enkele bout* is de
randbout zonder tweede bout loodrecht op de kracht; daar rekenen het blad en de
referentie-uitwerking in beide rekenwijzen hetzelfde. Alleen bij een
**binnenste bout loodrecht op de kracht** wijken ze af: de tabel vraagt dan
alleen de p₂-tak, de referentie-uitwerking neemt ook de e₂-tak mee en komt
lager uit — veilig, maar de combinatie is in de referentie-uitwerking niet in
te voeren. Dit blad houdt de twee assen gescheiden en reproduceert alle zes
referenties exact door loodrecht steeds *randbout* te kiezen.

**Gevolg** (M16, S235, t 20, eindbout in de krachtsrichting):

| geval | k₁ tabel 3.4 | k₁ referentie-uitwerking | F_b,Rd tabel 3.4 | F_b,Rd referentie-uitwerking |
|---|---|---|---|---|
| randbout, e₂ 25, p₂ 60 | 2,189 | 2,189 | 112,1 kN | 112,1 kN |
| randbout, e₂ 40, p₂ 45 | 1,800 | 1,800 | 92,2 kN | 92,2 kN |
| binnenste bout, e₂ 25, p₂ 60 | **2,500** | 2,189 (niet invoerbaar) | **128,0 kN** | 112,1 kN |

Alleen de laatste regel is een splitspunt. Die is niet tegen een referentieblad
te controleren: het geval is in de referentie-uitwerking niet in te voeren.

---

## 8. Balklaag — eigen gewicht met 550 kg/m³ en g = 10 m/s²

| | |
|---|---|
| Module | Balklaag (`templates/balklaag.ts`); dezelfde splitsing in Gording (`templates/gording.ts`) |
| Norm | NEN-EN 338 (ρ_mean per sterkteklasse) + NEN-EN 1991-1-1 |
| Referenties | document1 t/m document9 (alle negen) |
| Status | **vastgesteld** — splitspunt: de referentiestand rekent met 550 kg/m³ en g = 10 m/s², de norm-stand met ρ_mean uit EN 338 en g = 9,81 m/s² |

De referentie-uitwerking drukt de juiste ρ_mean af in de materiaaltabel — 420 kg/m³ voor C24 —
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

De spuwer rekent water ook met 10 kN/m³, maar daar is het geen afwijking: de
NB bij NEN-EN 1991-1-3 schrijft γ_w = 10 kN/m³ voor (7.2(1) en 7.2(8)).

**Gevolg** — het verschil zit alleen in de permanente lijnlast en werkt door in
u_g,k, w_fin en de UGT. Op het basisgeval (document1, 71×221 C24):

| grootheid | norm-stand | referentiestand |
|---|---|---|
| eigen gewicht balk | **0,0647 kN/m** | 0,0863 kN/m (afgedrukt 0,086) |
| u_g,k | **8,01 mm** | 8,27 mm |
| w_fin | **27,76 mm** | 28,17 mm |
| UC doorbuiging | **1,374** | 1,395 (afgedrukt 1,39) |
| UC buiging | **0,886** | 0,896 (afgedrukt 0,90) |

In de referentiestand komen alle negen referentiebladen exact uit. Het
grootste deel van het verschil zit in de dichtheid (420 tegen 550 kg/m³), een
klein deel in g. De gording splitst op dezelfde manier: A·5,5 kN/m³ in de
referentiestand, A·ρ_mean·9,81 in de norm-stand; dat werkt door in de
norm-standgetallen van punt 10 en 13.

---

## 9. Balklaag — de BGT toetst de geconcentreerde last niet

| | |
|---|---|
| Module | Balklaag (`templates/balklaag.ts`) |
| Norm | NEN-EN 1995-1-1 §2.2.3 + §7.2 |
| Referenties | document1 t/m document9 |
| Status | **vastgesteld** — splitspunt: de referentiestand telt in de BGT alleen de verdeelde last, de norm-stand de grootste van de verdeelde last en de puntlast |

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

**Ons blad** telt in de referentiestand alleen `u_q,k`, zoals de
referentie-uitwerking. In de norm-stand neemt het `u_var = max(u_q,k; u_Q,k)`
en toetst het dus beide; is de puntlast maatgevend, dan staat de zakking in
het punt waar de eindstand met de puntlast het grootst is. Op alle negen
referenties is de q-variant maatgevend en geven beide standen hetzelfde u_var.

Hetzelfde speelt een verdieping lager in de UGT: de referentie-uitwerking kiest
daar de maatgevende combinatie op de **grootste M**, niet op de grootste u.c.
Dat gaat mis zodra de twee combinaties in een verschillende
belastingsduurklasse vallen — een puntlast is vaak "Kort" (k_mod 0,90) en de
UDL "Middellang" (0,80), en dan kan de kleinere M de grotere u.c. geven. Ons
blad rekent de UGT-combinaties met één k_mod, uit de keuzelijst
*Belastingsduurklasse (maatgevend variabel)*, en kiest daardoor in beide
standen ook op de grootste M; dat is geen splitspunt. Staan de puntlast en de
verdeelde last in een verschillende duurklasse, dan ligt de keuzelijst op de
langste van de twee aan de veilige kant. Op deze negen bladen is de
UDL-combinatie steeds maatgevend.

---

## 10. Gording — 6.10a wordt niet getoetst, en dat is op een steil dak maatgevend

| | |
|---|---|
| Module | Gording (`templates/gording.ts`) |
| Norm | NEN-EN 1990 §6.4.3.2 + NB, (6.10a) |
| Referenties | document1 t/m document8 (gording) |
| Status | **vastgesteld** — splitspunt: de referentiestand volgt de referentie-uitwerking met een kanttekening, de norm-stand toetst 6.10a |

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

**Ons blad, referentiestand (standaard):** 6.10a telt niet mee, zoals bij de
referentie-uitwerking. Op document7 staat 1,45 / 1,77 en `check-gording.mjs`
toetst dat als gewone toets. Komt 6.10a hoger uit, dan staat onder de
buigtoets de kanttekening *"6.10a (1,35·G, blijvend) telt in de gekozen
rekenwijze niet mee; meegeteld zou (6.11) = … en (6.12) = … zijn"*. Op
document7 is dat 1,54 / 1,88. In deze stand toont de combinatietabel 6.10a
niet.

**Ons blad, norm-stand:** 6.10a is combinatie 0 in de combinatietabel, met
k_mod = 0,60 (klimaatklasse 3: 0,50). Hij telt mee in buiging, afschuiving en
oplegdruk. Op document7 geeft dat 1,51 / 1,85. Dat ligt iets onder
1,54 / 1,88 omdat de norm-stand het eigen gewicht met ρ_mean en g = 9,81
rekent (punt 8). `check-gording-aanvullend.mjs` (geval D) toetst de
kanttekening en de norm-stand.

Voor balklaag speelt dit bij een vloer niet: categorie A heeft ψ₀ = 0,4, dus
6.10a houdt daar een veranderlijke term en blijft in dezelfde duurklasse. Hij
wordt pas maatgevend bij G > 6·Q, bijvoorbeeld bij een onderslag met wanden
erop. Het balklaagblad toetst daarom ook 6.10a naast 6.10b; de combinatietabel
toont beide en de maatgevende telt.

---

## 11. Gording — windzuiging alleen bij een plat dak

| | |
|---|---|
| Module | Gording (`templates/gording.ts`) |
| Norm | NEN-EN 1991-1-4 §7.2.3–7.2.5, §7.2.9 + NB; NEN-EN 1990 NB, tabel NB.4/NB.5 |
| Referenties | document1 (33,7°), document4 (plat), document7 (53,1°) |
| Status | **vastgesteld** — combinatie 4 volgt de referentie-uitwerking; ons blad toetst in beide rekenwijzen daarnaast opwaarts (combinaties 5 en 6) en op een plat dak de druk in zone I (combinatie 7) |

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

Boven 60° loopt C_pe in beide rekenwijzen op tot +0,8 bij 75°, lineair
(tabel NB.10 – 7.4a: +0,7 tot 60°, +0,8 bij 75° in de zones F, G en H); bij
75° is P_w dan 1,1·q_p in plaats van 1,0·q_p, en M_wy 10 % hoger. Onder 60°
ligt +0,70 gelijk aan of boven de tabel. De referentiebladen (33,7° en 53,1°)
veranderen niet; `check-gording-aanvullend.mjs` toetst het (geval L).

Combinatie 4 (1,2·G + 1,5·W) volgt de referentie-uitwerking; het daktype
stuurt het teken (document4: P_w = −0,329 kN/m²). Daarnaast toetst ons blad in
beide rekenwijzen:

- **Combinatie 5: 0,9·G + γ_Q·W opwaarts**, met c_pi = +0,2. §7.2.9(6) vraagt
  de ongunstigste van +0,2 en −0,3, en bij zuiging is dat +0,2: bij
  c_pe = −0,7 is de netto zuiging −0,9·q_p en niet −0,4·q_p. γ_G,inf = 0,9
  volgt uit tabel NB.4/NB.5.
- **Combinatie 6 (schuin dak): γ_G·G + γ_Q·W opwaarts.** Het onderscheid
  gunstig/ongunstig geldt voor het hele eigen gewicht (NEN-EN 1990 NB, onder
  tabel NB.4). Op een schuin dak werkt G gunstig op de sterke as maar
  ongunstig op de zwakke as, dus beide varianten tellen. Op een plat dak is
  M_g,∥ = 0 en is hij nooit maatgevend (opwaarts wint combinatie 5, neerwaarts
  combinatie 3); daar vervalt hij.
- **Combinatie 7 (plat dak): γ_G·G + γ_Q·W druk in zone I**, met c_pe = +0,2
  (tabel NB.7 – 7.2, zone I, waar beide tekens beschouwd moeten worden) en
  c_pi = −0,3: netto +0,5·q_p. Deze druk telt ook in de BGT als
  veranderlijke ⊥ naast Q_k, q_k en sneeuw.
- **Opwaartse doorbuiging (BGT):** w_op,y = −(u_g,⊥ + u_w,op), met het eigen
  gewicht zonder kruip. Alleen als die netto opwaarts is, tegen dezelfde
  w_lim.

c_pe bij zuiging is invoer, standaard −0,7. De gebruiker kiest hem voor de
zone van de gording uit tabel NB.7 – 7.2 (plat) of NB.10 – 7.4a / NB.11 – 7.4b
(schuin), bij A = hoh·L volgens fig. 7.2; het blad drukt A af. Een waarde die
niet negatief is (of een leeg veld, dat als 0 rekent) geeft een melding op het
blad. Verder:

- 6.11 en 6.12 tellen een negatief moment met zijn grootte.
- Kip van de ongesteunde onderrand wordt getoetst voor combinatie 5 (§6.3.3,
  l_ef = 0,9·L − 0,5·h); die heeft het grootste negatieve moment.
- De trekkracht per oplegging uit combinatie 5 staat op het blad, voor de
  verankering.

Voorbeeld, plat dak: 71×196 C24, L_th = 3575, hoh 1875, g = 0,25 kN/m²,
windgebied I, terreincategorie 0, z = 6 m (q_p = 1,421 kN/m²):

```
opwaarts, c_pe = −0,7:
P_w,op = (−0,7 − 0,2)·1,421 = −1,279 kN/m²   q_w,op = −2,398 kN/m   M_w,op = −3,831 kNm
M_y,d  = 0,9·0,871 − 1,5·3,831 = −4,963 kNm  →  6.11 = 10,92/16,62 = 0,66 (was 0,49)
kip: l_ef = 3120 mm, σ_m,crit = 47,6, λ_rel,m = 0,71 → k_crit = 1,0 → 0,66
F_t,d  = −(0,9·0,975 − 1,5·4,287) = 5,55 kN per oplegging
w_op,y = 10,41 − 2,37 = 8,04 mm  →  8,04/14,30 = 0,56

druk in zone I:
P_w,dr = (0,2 + 0,3)·1,421 = 0,711 kN/m²     q_w,dr = 1,332 kN/m    M_w,dr = 2,128 kNm
BGT:   u_w,dr = 5,78 mm > u_s = 4,56 mm  →  w_fin,y = 1,6·2,37 + 5,78 = 9,57 mm → 0,67 (was 0,58)
zone-I-gording (c_pe = −0,2): M_y,d = 1,2·0,871 + 1,5·2,128 = 4,238 kNm → 6.11 = 0,56
       (combinatie 7 maatgevend; eerder 0,49 uit de puntlast)
```

Voorbeeld, schuin dak (combinatie 6): 96×296 C24, L_th = 4575, nok 6000
(53,1°), pannen 0,5 kN/m², q_∥ = 0, windgebied I, terreincategorie 0, z = 9 m
(q_p = 1,545 kN/m²), c_pe = −1,5:

```
M_g,⊥ = 1,717   M_g,∥ = 2,943   M_w,op = −12,89 kNm
5: M_y = 0,9·1,717 − 1,5·12,89 = −17,79; M_z = 0,9·2,943 = 2,649 → 6.11 = 0,764 + 0,225 = 0,99
6: M_y = 1,2·1,717 − 1,5·12,89 = −17,27; M_z = 1,2·2,943 = 3,532 → 6.11 = 0,742 + 0,299 = 1,04
```

Zonder combinatie 6 stond hier 0,99 en "voldoet". In een scan over 864
doorrekeningen van schuine daken (beide rekenwijzen, c_pe −0,9 tot −1,5) sloeg
de conclusie zo 5 keer om.

Op de vijftien referentiebladen blijven combinaties 5 tot en met 7 en de
opwaartse doorbuiging onder de maatgevende toets; geen enkele referentiewaarde
verandert. `check-gording-aanvullend.mjs` toetst ze (gevallen C, H, I en J).

Open: de randzones F/G volgen niet automatisch; c_pe per gording blijft de
keuze van de gebruiker. Kip bij opwaartse wind toetst (6.33) op de sterke as;
M_z telt daar niet in mee, want NEN-EN 1995-1-1 geeft geen formule voor kip
bij dubbele buiging. M_z van combinaties 5 en 6 zit wel in 6.11 en 6.12.

---

## 12. Kolom — L_cr wordt in §6.3.3 niet gebruikt

| | |
|---|---|
| Module | Kolom (`templates/kolom.ts`) |
| Norm | NEN-EN 1995-1-1 §6.3.3, tabel 6.1 |
| Referenties | document4 (kolom) |
| Status | **vastgesteld** |

Het invoerveld *Ongesteunde lengte L_cr* wordt in de kiptoets genegeerd:
de referentie-uitwerking rekent l_ef uit de **kolomlengte**. document4 maakt dat hard —
L_cr = 1600 mm, en het blad drukt af:

```
l_ef = 0,9 × 3200 = 2880 mm      l_ef = l_ef + 2h = 2880 + 2 × 144 = 3168 mm
```

Zolang L_cr ≤ L — en fysiek kan de ongesteunde lengte de kolom niet overtreffen —
is dat de **veilige kant**: een langere kiplengte geeft een lagere σ_m,crit en
dus een lagere k_crit. Het is dus geen rekenfout maar een dood invoerveld.

**In de norm-stand rekent het blad met `max(L; L_cr)`, in de referentiestand
met L.** Op alle zes referenties is L_cr ≤ L, dus l_ef is in beide standen
gelijk. Vult iemand een L_cr groter dan de kolomlengte in, dan telt die in de
norm-stand mee. In de referentiestand meldt het blad dat L_cr niet meetelt.

---

## 13. Gording — 6.11 en 6.12 worden uit één combinatie afgedrukt

| | |
|---|---|
| Module | Gording (`templates/gording.ts`) |
| Norm | NEN-EN 1995-1-1 §6.1.6, (6.11) en (6.12) |
| Referenties | wind4 en wind7 (de windvarianten) |
| Status | **vastgesteld** — splitspunt: de referentiestand kiest één combinatie zoals de referentie-uitwerking (wind4: 2,06), de norm-stand neemt per formule de max (wind4: 2,16, met het eigen gewicht van punt 8) |

De referentie-uitwerking kiest één maatgevende belastingcombinatie en drukt daarvan zowel
(6.11) als (6.12) af. Maar beide formules moeten voor **elke** combinatie
gelden, en ze wegen de assen tegengesteld: (6.11) telt σ_m,y vol en σ_m,z met
k_m, (6.12) andersom. Een combinatie die op 6.11 wint, kan op 6.12 verliezen.

Op wind4 (terreincategorie zee/kust, q_p = 1,295) gebeurt precies dat:

| combinatie | 6.11 | 6.12 |
|---|---|---|
| permanent + puntlast | 2,11 | **2,18** |
| permanent + wind | **2,50** | 2,06 |

De referentie-uitwerking kiest de windcombinatie — terecht, die wint op 6.11 — en drukt dan
haar 6.12 van 2,06 af. De werkelijke maatgevende 6.12 is 2,18, uit de
puntlastcombinatie. Idem op wind7 (1,88 afgedrukt, 2,18 werkelijk).

In de norm-stand neemt ons blad per formule de max over alle combinaties. Met
het eigen gewicht van de referentie-uitwerking is dat 2,18; de norm-stand
rekent het eigen gewicht met ρ_mean (punt 8) en drukt 2,16 af. Op de conclusie
maakt het hier niets uit — beide bladen zakken toch — maar de gerapporteerde
u.c. is bij de referentie-uitwerking te laag.

In de referentiestand kiest het blad één combinatie, zoals de
referentie-uitwerking, en drukt 2,06 af. Zonder dubbele buiging telt 6.12 in
die keuze niet mee. Eerder kon de puntlast via een 6.12 die niet getoetst wordt
de keuze winnen: document7 met dubbele buiging uit gaf 6.11 = 0,41
(combinatie 2) in plaats van 0,76 (combinatie 4). `check-gording-aanvullend.mjs`
(geval G) toetst dit.

Dit is dezelfde soort vereenvoudiging als punt 9 bij balklaag: te vroeg
terugvallen op één combinatie.

---

## 14. Metselwerk — f_m ≤ 2·f_b wordt niet toegepast

| | |
|---|---|
| Modules | Oplegging op metselwerk (`templates/oplegMetselwerk.ts`), Dragende metselwerkwand (`templates/metselwerkwand.ts`) |
| Norm | NEN-EN 1996-1-1 NB bij 3.6.1.2 |
| Referenties | metselwerk-oplegging-2 (baksteen fb 5, M15) |
| Status | **open** |

De Nederlandse bijlage begrenst de mortelsterkte in formule (3.2) op 20 N/mm²,
en bij metselmortel bovendien op 2·f_b. Het referentieprogramma past alleen de
eerste grens toe:

```
referentie:  f_k = 0,6 × 5^0,65 × 15^0,25 = 3,36 N/mm²
norm:        f_k = 0,6 × 5^0,65 × 10^0,25 = 3,04 N/mm²    (f_m = 2 × 5)
```

Het verschil treedt alleen op bij een zwakke steen met een sterke mortel
(f_m > 2·f_b). De referentie-uitwerking geeft dan een f_k die
(min(f_m; 20) / 2·f_b)^0,25 keer te hoog is. In referentie 2 is dat 10 %,
maar het kan veel meer zijn:

| steen en mortel | f_k referentie | f_k norm | verschil |
|---|---|---|---|
| baksteen fb 5, M15 (referentie 2) | 3,36 | 3,04 | +10 % |
| baksteen fb 5, M20 | 3,61 | 3,04 | +19 % |
| cellenbeton G2, M15 (standaardinvoer van het oplegbeeld) | 1,853 | 1,331 | +39 % |

Cellenbeton met metselmortel valt er snel onder: met M15 geven G2 tot en met
G6 een verschil, alleen G8 niet. De standaardinvoer van het oplegbeeld (CC2)
geeft u.c. 12,66 in de referentiestand en 17,61 in de norm-stand. Het verschil
kan ook het oordeel omdraaien. Voorbeeld: baksteen fb 5 + M20, categorie I,
CC2, t = 200, h = 2800, h_k = 250, a_L = 200, a_t = 150, a_1 = 300,
q_Edc = 5,5 kN/m, N_Edc = 70 kN. De referentie komt uit op N_Rdc = 83,4 kN en
u.c. 0,85 (voldoet), de norm op N_Rdc = 70,2 kN en u.c. 1,01 (voldoet niet).

De tabel voor de druksterkte in de NB bij NEN-EN 1996-3 past de grens ook toe:
bij f_b = 5 geven M10, M15 en M20 daar dezelfde f_k.

In de referentiestand rekent het blad met f_m = min(f_m; 20), in de norm-stand
bij metselmortel met min(f_m; 20; 2·f_b). Treedt het verschil op, dan meldt de
referentiestand in rood dat f_k te hoog is en de uitkomst te gunstig, net als
bij punt 15. Beide modules doen dat.

---

## 15. Metselwerk — het belaste vlak telt de hele oplegplaat

| | |
|---|---|
| Module | Oplegging op metselwerk (`templates/oplegMetselwerk.ts`) |
| Norm | NEN-EN 1996-1-1 §6.1.3(2), (6.10) en (6.11) |
| Referenties | metselwerk-oplegging-2 (a_t = 160 op t = 150) |
| Status | **open** |

De referentie-uitwerking neemt als belast vlak de hele oplegplaat,
A_b = a_L·a_t, ook als die breder is dan de wand of uit het wandvlak steekt.
Volgens §6.1.3(2) belast alleen het deel van de plaat dat op de wand ligt de
wand. Referentie 2 laat dat zien: N_Rdc = 1,249 × 32 000 × 1,681 / 1000 =
67,19 kN (β_calc = 1,249 < β_max = 1,25), dus A_b = 200 × 160 op een wand van
150 mm.

```
referentie:  A_b = 200 × 160 = 32 000 mm²   N_Rdc = 67,2 kN   u.c. 0,76
norm:        A_b = 200 × 150 = 30 000 mm²   N_Rdc = 63,0 kN   u.c. 0,81
```

(Dit is het effect van deze begrenzing alleen. Samen met punt 14 geeft de
norm-stand N_Rdc = 56,9 kN en u.c. 0,90.)

Hoe verder de plaat buiten de wand steekt, hoe groter het verschil. Voorbeeld:
kalkzandsteen CS12 + M15, categorie I, CC1, t = 200, h = 2800, h_k = 250,
a_L = 200, a_1 = 300, L_r = 2000, q_Edc = 5,5 kN/m, a_t = 300, N_Edc = 250 kN.
De referentie rekent met A_b = 60 000 mm², N_Rdc = 303 kN en u.c. 0,83
(voldoet). De norm rekent met A_b = 40 000 mm², N_Rdc = 207 kN en u.c. 1,21
(voldoet niet).

Het blad gaat ervan uit dat de plaat gecentreerd onder de last ligt
(excentriciteit exc). Het deel op de wand is
a_t,ef = max(0; min(t/2; exc + a_t/2) − max(−t/2; exc − a_t/2)). In de
referentiestand rekent het blad met a_L·a_t en meldt het in rood dat de
uitkomst te gunstig is zodra a_t,ef < a_t. In de norm-stand rekent het met
a_L·a_t,ef. Ligt de plaat helemaal op de wand, dan zijn beide gelijk en staat
er één regel.

De eis van een oplegging van ten minste 90 mm (§8.1.6(1)) zit niet in de
referentie-uitwerking. Het blad toetst hem in beide standen op
min(a_L; a_t,ef), dus op het deel van de plaat dat op de wand ligt.

---

## 16. Metselwerkwand — de minimale-excentriciteitstoets vervalt na een eerste afkeur

| | |
|---|---|
| Module | Dragende metselwerkwand (`templates/metselwerkwand.ts`) |
| Norm | NEN-EN 1996-1-1 NB bij 5.5.1.1(5), §6.1.2 en bijlage G |
| Referenties | metselwerkwand-3, -4 en -9 (toets overgeslagen) |
| Status | **open** |

De Nederlandse bijlage vraagt naast de toets met de werkelijke momenten een
tweede toets. Die rekent met de grootste normaalkracht, ρ_2 = 1,00 en een
constante excentriciteit van ten minste 10 mm en h_ef/300. De
referentie-uitwerking voert die tweede toets alleen uit als de eerste voldoet.
Voldoet de eerste niet, dan geeft de referentie de u.c. van de eerste toets
als maatgevend, ook als de tweede hoger uitvalt. Set 9 (CC3, M5) laat dat zien:

```
referentie:  UC_1 = 200/192,7 = 1,04   tweede toets niet uitgevoerd       u.c. 1,04
norm:        UC_2 = 200/114,8 = 1,74   (Φ_m2 = 0,360, f_d = 2,654)       u.c. 1,74
```

Het oordeel verandert niet: in beide standen voldoet de wand niet. Alleen de
maatgevende u.c. van de referentie is te laag, en die zegt hoe ver de wand van
voldoen af zit. Bij sets 3 en 4 is de eerste toets maatgevend (2,37 en 2,14,
tegen 1,32 en 1,99); daar verandert niets.

In de referentiestand slaat het blad de toets over zodra UC_1 > 1, zoals de
referentie. In de norm-stand voert het hem altijd uit, behalve bij trek
(N_Ed < 0), die al afkeurt.

Punt 13 bij de gording is een vergelijkbare vereenvoudiging: de gerapporteerde
u.c. is te laag, maar de conclusie klopt.

---

## 17. Kolom — afschuiving over de volle breedte (vervallen)

| | |
|---|---|
| Module | Kolom (`templates/kolom.ts`) |
| Norm | NEN-EN 1995-1-1+C1+A1 §6.1.7(2), (6.13) en (6.13a); NB art. 6.1.7(2) |
| Referenties | document2, document3, document4 (kolom) |
| Status | **vervallen** — geen afwijking: de referentie-uitwerking rekent zoals de NB |

De referentie-uitwerking toetst de schuifspanning over de volle breedte:
τ_d = V_Ed·S_y/(b·I_y). (6.13a) rekent met een werkzame breedte
b_ef = k_cr·b. De aanbevolen waarde 0,67 uit de EN geldt in Nederland niet:
NB art. 6.1.7(2) schrijft voor een ligger met een prismatische doorsnede
k_cr = 1,0 voor, en dan is b_ef = b. De referentie rekent dus volgens de norm;
dit is geen splitspunt. Het blad rekent in beide standen met k_cr = 1,0.

document4 (44×144 C24, V_Ed = 3,825 kN), in beide standen:

```
τ_d = 1,5 × 3825/(1,0 × 44 × 144) = 0,906 N/mm²    UC = 0,906/1,846 = 0,49
f_v,d = 0,6 × 4,0/1,3 = 1,846 N/mm²
```

Hetzelfde geldt voor de Balklaag (8.2 en 8.5), de normbladen in
`eurocode5.ts` (ec5Afschuiving, ec5HoutenBalk) en het blad voor de
schuifspanning in `vandepitte.ts`. Alleen bij een I-, T- of kokerprofiel met
een lijf van gezaagd of gelamineerd hout geeft de NB een lagere waarde, tot 0,8
bij een lijf dunner dan de halve flensbreedte. Het schuifspanningsblad kent de
flensbreedte niet en neemt bij zo'n profiel die ondergrens van 0,8.

---

## 18. Schijfwerking — vier vereenvoudigingen aan de veilige kant

| | |
|---|---|
| Module | Schijfwerking (`templates/schijfwerking.ts`) |
| Norm | NEN-EN 1995-1-1 §9.2.4.2(5) en (11), §10.8.2(1), §6.1.5(1) |
| Referenties | geen vastgelegd referentieblad; handberekening in `check-schijfwerking.mjs` |
| Status | **open** |

De referentie-uitwerking rekent de wandschijf op vier punten strenger dan de
norm. Het blad rekent op die punten beide lezingen uit:

| grootheid | referentie-uitwerking (`_xc`) | norm (`_nb`) |
|---|---|---|
| `F_ivRd` | F_f,Rd zonder de verhoging 1,2 langs de plaatranden | × 1,2 (§9.2.4.2(5)) |
| `UC_plooi` | h.o.h.-afstand van de stijlen / (100·t) | dagmaat h.o.h. − t_stijl / (100·t) (§9.2.4.2(11)) |
| `UC_hoh` (via `s_max`) | hoogstens 150 mm, ook bij schroeven | 200 mm bij schroeven, 150 mm bij nagels (§10.8.2(1)) |
| `A_c90` | t_stijl · min(b_stijl; b_regel) | (t_stijl + min(30 mm; t_stijl; (hoh − t_stijl)/2)) · min(b_stijl; b_regel) (§6.1.5(1)) |

Startwaarden van het beeld (wand 7200 × 2600, platen 1220, schroeven 0,42 kN op
150 mm, dubbelzijdig, 76×184 C24):

```
referentie:  F_i,v,Rd = 37,27 kN   UC_plooi = 0,508   UC_hoh = 1,00   A_c90 = 13 984 mm²   UC_druk⊥ = 0,408
norm:        F_i,v,Rd = 44,72 kN   UC_plooi = 0,445   UC_hoh = 0,75   A_c90 = 19 504 mm²   UC_druk⊥ = 0,292
```

Alle vier liggen in de referentiestand aan de veilige kant; de norm-stand geeft
een hogere sterkte en lagere u.c.'s. In beide standen rekent het blad de
sterkte per paneel: n volle platen plus een restpaneel met een eigen c_i, en
een paneel smaller dan h/4 telt niet. De hefboom in (9.23) is de meetellende
lengte Σ b_i·c_i gedeeld door c_i van de breedste plaat. Dat is geen
splitspunt. Ook in beide standen: bij een horizontale naad telt een paneel
smaller dan 0,5·h voor 0,85 mee (NB bij 9.2.4.2(17)), en gipsplaat moet
minstens 12,5 mm dik zijn en in een toegestane klimaatklasse staan (NB bij
3.8). De referentiestand blijft zo 1/1,2 van de norm-stand; met een naad bij
de startwaarden is dat 31,68 tegen 38,02 kN. De vroegere berekening met de
volle wandlengte en de c_i van één plaat was onveilig bij een restpaneel
smaller dan h/2 of een wand korter dan een plaat (b = 1800: 9,46 in plaats van
6,41 kN; b = 600: 3,15 kN in plaats van 0).

---

## 19. Funderingsstrook — inclinatiefactoren volgens bijlage D in plaats van 6.5.2.2(j)

| | |
|---|---|
| Module | Funderingsstrook (`templates/en1997.ts`, `en1997Funderingsstrook`) |
| Norm | NEN 9997-1 6.5.2.2(a) en (j), bijlage D (D.4) |
| Referenties | geen referentieblad; handberekening in `check-en1997.mjs` |
| Status | **vastgesteld** |

Volgens 6.5.2.2(a) gelden voor de draagkracht de bepalingen (b) t/m (s);
bijlage D is informatief en wijkt er op punten van af. Het blad rekent de
inclinatiefactoren toch met D.4, met m = 2 (strook, H evenwijdig aan B′) en
zonder de term A′·c′·cot φ′ in de noemer:

```
i_q = (1 − H_d/V_Ed)²      i_γ = (1 − H_d/V_Ed)³      i_c = i_q − (1 − i_q)/(N_c·tan φ′_d)
```

Dit is geen splitspunt: er is geen referentie-uitwerking, en beide standen van
`rekenwijze` rekenen zo. In het algemeen ligt het aan de veilige kant: de
OPMERKING bij 6.5.2.2(j) zegt dat de factoren van (j) in het algemeen een iets
hogere draagkracht geven dan bijlage D, en het weglaten van A′·c′·cot φ′ maakt
i_q en i_γ bij c′ > 0 nog kleiner. Hoe groot het verschil is, valt niet vast te
stellen: de formules van (j), geval II, staan in de normtekst als afbeelding.
"In het algemeen" sluit een geval met een lagere draagkracht volgens (j) ook
niet uit; komen die formules beschikbaar, dan hoort (j) in de norm-stand.

Standaardinvoer met H_d = 5 kN/m op V_Ed = 80 kN/m: i_q = 0,879 en
i_γ = 0,824. Met het grondwater op maaiveld geeft dat UC = 2,356 (zonder H_d
2,043).

Verwant, en ook niet in de toets: de kier onder de zool bij een grote
excentriciteit (6.5.4(a), figuur 6.j). Bij |e_B| > B/6 meldt het blad de
bijzondere maatregelen van 6.5.4(1)P en telt het de plaatsingsafwijking van
0,1 m mee (6.5.4(2)). De OPMERKING bij 6.5.4(a) noemt naast het glijvlak g1
een glijvlak g2 onder alleen V_d, met σ′_v;z;d = 0 door de kier, dat bij een
kleine b′ en een diepe aanleg maatgevend kan zijn. De ligging van g2 staat
alleen in de figuur; het blad rekent g2 niet. Het oordeel is daarom boven
B/6 hooguit "niet aangetoond", nooit "voldoet".

---

## 20. Spuwer — regenintensiteit uit tabel NB.1 afgerond

| | |
|---|---|
| Module | Spuwer (`templates/spuwer.ts`) |
| Norm | NEN-EN 1991-1-3 NB, 7.2(4), tabel NB.1 |
| Referenties | 6S, 7S en 8S (spuwer) |
| Status | **vastgesteld** — splitspunt: de referentiestand rekent met de afgeronde waarden, de norm-stand met de tabel zelf |

Tabel NB.1 geeft i_r = 0,0215 / 0,0406 / 0,0500 / 0,0561 × 10⁻³ m/s bij 1, 15,
50 en 100 jaar, met lineaire interpolatie daartussen. De referentie-uitwerking
rekent met 0,000027 (5 jaar, geïnterpoleerd en afgerond), 0,000041, 0,00005 en
0,000056. Bij 5 en 15 jaar ligt dat aan de veilige kant, bij 100 jaar 0,2 %
eronder. Het blad rekent `i_r_xc` en `i_r_nb` en meldt in de referentiestand
de tabelwaarde zodra die verschilt.

n 3 · b 600 · h 80 · h_nd 30, A = 600 m²:

| t | i_r referentie | i_r norm | d_nd | UC referentie | UC norm |
|---|---|---|---|---|---|
| 5 jaar | 0,000027 | 0,00002696 | 30,29 / 30,26 | 0,754 | 0,753 |
| 15 jaar | 0,000041 | 0,0000406 | 40,01 / 39,75 | 0,875 | 0,872 |
| 100 jaar | 0,000056 | 0,0000561 | 49,26 / 49,32 | 0,991 | 0,992 |

Bij 100 jaar is de referentiestand dus aan de onveilige kant, maar het scheelt
0,06 mm waterhoogte. `check-spuwer.mjs` toetst beide standen.

---

## Weergavefouten (geen rekengevolg)

Deze zijn puur cosmetisch aan de kant van de referentie-uitwerking, maar goed om te kennen bij het
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
  u_w⊥ = 6,308 wordt `6.30`. Dezelfde afkapping zit in de kolomreferentie
  document2 (u.c. 6.35 = 1,035 gedrukt als `1.03`, zie `check-kolom.mjs`).
  Reken na met de onafgeronde waarden; de gedrukte waarde is een ondergrens.
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

Dat bouwt de core en draait elk `scripts/check-*.mjs`: per gecalibreerde
module één, plus de algemene bewakers zoals `check-afkortingen`,
`check-designerkeuze`, `check-renders` en `check-projectvariabelen` (die
laatste bewaakt de grens tussen projectgegevens en bladinvoer — zie
`docs/projectmodel.md`).
Elk script zet de invoer van de referentiebladen in de module en vergelijkt de
tussenstappen met het afgedrukte getal; de tolerantie volgt uit de
gedocumenteerde precisie, dus `96` toetst op ±0,5 en `45,7` op ±0,05. De
punten uit dít register lopen via de schakelaar: in de referentiestand zijn
het gewone toetsen, in de norm-stand controleert `toetsNormStand` (in
`scripts/lib/refcheck.mjs`) eindigheid en richting, aangevuld met
handberekeningen waar die er zijn. De parameter `afwijkend` van `toets()`
blijft bestaan voor een verschil dat nog geen schakelaar heeft: dat wordt
gemeld maar telt niet als fout.

Een ander gereedschap beantwoordt een andere vraag: `npm run snapshot` haalt
alle rekenbladen door parse → evaluate → render, zodat je vóór en ná een
wijziging in `packages/core` kunt vergelijken. Dat zegt "er is niets
veranderd"; de controlescripts zeggen "het klopt nog met het referentieblad".
Je hebt ze allebei nodig.

Bij een nieuwe afwijking:

1. Reken in het blad beide lezingen uit (`X_nb`, `X_XC`) en kies op één regel
   met `if(rekenwijze ≡ 1; X_XC; X_nb)`; `check-rekenwijze.mjs` controleert
   dat elke tak een schakelaar bereikt.
2. Toets in het controlescript (`check-<module>.mjs`) de referentiestand exact
   tegen het referentieblad en de norm-stand met `toetsNormStand`, zo mogelijk
   met een handberekening.
3. Voeg een `#if`-blok toe dat in de referentiestand het verschil meldt zodra
   het bij die invoer optreedt, zoals bij de kruipfactor, de
   verankeringslengte en de oplegging op metselwerk.
4. Noteer hem hier, met module, normartikel, referentiebladen en het
   getalsmatige gevolg.
