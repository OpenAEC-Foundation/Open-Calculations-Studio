/**
 * Boutberekening — weerstanden van één bout volgens NEN-EN 1993-1-8 tabel 3.4.
 *
 * BOUWSTEEN: dit blad levert F_v,Rd, F_b,Rd, F_t,Rd en B_p,Rd voor één bout.
 * De momentverbinding, dwarskrachtverbinding, schoorverbinding en penverbinding
 * hangen daaraan; de formules staan daarom bewust op zichzelf, zonder aannames
 * over de verbinding waarin de bout zit.
 *
 * Gecalibreerd op zes de referentie-uitwerking-referenties (document1C t/m 6C), basis
 * S235 · 8.8 · M16 · draad in het afschuifvlak · eindbout · t 20 · e₁ 30 ·
 * p₁ 80 · e₂ 25 · p₂ 60 → F_t,Rd 90,4 · F_v,Rd 60,3 · F_b,Rd 112,1 kN.
 * Varianten: schacht in het afschuifvlak (F_v,Rd 77,2 — met A i.p.v. A_s) ·
 * binnenste bout (α_d = p₁/3d₀ − ¼ = 1,231 → α_b 1,00 → F_b,Rd 201,7) ·
 * randbout (identiek aan de eindbout) · enkele bout (k₁ zonder de p₂-tak) ·
 * e₁ 60 met e₂ 50 (k₁ op de bovengrens 2,5 én α_b op 1,00 → F_b,Rd 230,4).
 * F_t,Rd, F_v,Rd en F_b,Rd komen in alle zes exact overeen.
 *
 * AFWIJKING — B_p,Rd. de referentie-uitwerking vult voor d_m de sleutelwijdte over de platte
 * kanten in (M16 → 24,0 mm). §3.6.1(3) vraagt het gemiddelde van de maat over
 * de platte kanten en die over de hoeken, dus 25,4 mm voor M16. de referentie-uitwerking komt
 * daardoor 5,5 % lager uit (260,6 tegen 275,8 kN) — veilig, maar niet
 * economisch. Zie docs/afwijkingen-referentie.
 *
 * AFWIJKING — boutpositie. Tabel 3.4 kent twee ONAFHANKELIJKE assen: eind- of
 * binnenste bout in de krachtsrichting (bepaalt α_d) en rand- of binnenste bout
 * loodrecht daarop (bepaalt k₁). de referentie-uitwerking heeft die tot één keuzelijst
 * samengetrokken en neemt voor k₁ het minimum van beide takken. Dat is veilig,
 * maar de combinatie "binnenste bout loodrecht op de kracht" is er niet mee uit
 * te drukken. Dit blad houdt de twee assen gescheiden.
 *
 * §3.6.1(10) — de begrenzing F_b,Rd ≤ 1,5·f_u·d·t/γ_M2 bij een enkele overlap
 * met één boutrij zit erin als aparte keuze (`overlaptype`). Alle zes
 * referentiebladen hebben twee boutrijen, dus die stand blijft ongetoetst; op
 * de basisinvoer zou de grens 138,2 kN zijn, ruim boven de 112,1 uit tabel 3.4.
 *
 * QUIRK — de referentie-uitwerking drukt bij B_p,Rd "3,14" af maar rekent met de volle π;
 * met 3,14 zou er 260,4 in plaats van 260,6 kN uitkomen.
 *
 * Variabelenamen komen exact overeen met BoutDesigner.tsx.
 */

export const boutberekening = `"Boutberekening — weerstanden van één bout volgens NEN-EN 1993-1-8 tabel 3.4

'<i>Dit blad rekent de vier weerstanden van één bout uit: op trek, op
'afschuiving, op stuik in de plaat en op doorponsen van de plaat onder kop of
'moer. Het is bedoeld als bouwsteen — de verbindingsbladen halen hier hun
'F<sub>v,Rd</sub> en F<sub>b,Rd</sub> vandaan.</i>

# 1. Invoer

@select staalsoort "Staalsoort plaatmateriaal"
  S235 = 235
  S275 = 275
  S355 = 355
@end

@select boutkwaliteit "Boutkwaliteit"
  4.6 = 46
  4.8 = 48
  5.6 = 56
  5.8 = 58
  6.8 = 68
  8.8 = 88
  10.9 = 109
@end

@select boutdiameter "Boutdiameter"
  M12 = 12
  M16 = 16
  M20 = 20
  M24 = 24
  M27 = 27
  M30 = 30
  M36 = 36
@end

@select afschuifvlak "Ligging van het afschuifvlak"
  Afschuifvlak door de draad = 1
  Afschuifvlak door de schacht = 2
@end

@select boutpositie "Positie in de krachtsrichting — bepaalt α_d"
  Eindbout = 1
  Binnenste bout = 2
@end

@select randpositie "Positie loodrecht op de kracht — bepaalt k_1"
  Randbout = 1
  Binnenste bout = 2
@end

@select overlaptype "Verbindingsvorm — §3.6.1(10)"
  Overige gevallen = 1
  Enkele overlap met één boutrij = 2
@end

t_plaat = ?*(mm)', dunste plaatdikte t — ook gebruikt als t_p bij het doorponsen'
e_1 = ?*(mm)', eindafstand in de krachtsrichting e_1'
p_1 = ?*(mm)', steek in de krachtsrichting p_1 — alleen bij een binnenste bout'
e_2 = ?*(mm)', eindafstand loodrecht op de kracht e_2'
p_2 = ?*(mm)', steek loodrecht op de kracht p_2 — alleen bij een binnenste bout'

n_v = ?', aantal afschuifvlakken van deze bout'

'<i>Laat de twee krachten hieronder op nul staan om alleen de weerstanden te
'krijgen; dan wordt paragraaf 8 overgeslagen. Het referentieprogramma kent geen
'krachtinvoer en drukt uitsluitend de weerstanden af.</i>
F_v,Ed = ?*(kN)', afschuifkracht op de bout — 0 = geen toetsing'
F_t,Ed = ?*(kN)', trekkracht op de bout — 0 = geen toetsing'

# 2. Materiaal- en boutgegevens

#hide
'Tabellen op de kale keuzewaarde; hieronder pas van eenheden voorzien.
fub_ = if(boutkwaliteit ≡ 46; 400; if(boutkwaliteit ≡ 48; 400; if(boutkwaliteit ≡ 56; 500; if(boutkwaliteit ≡ 58; 500; if(boutkwaliteit ≡ 68; 600; if(boutkwaliteit ≡ 88; 800; 1000))))))
fyb_ = if(boutkwaliteit ≡ 46; 240; if(boutkwaliteit ≡ 48; 320; if(boutkwaliteit ≡ 56; 300; if(boutkwaliteit ≡ 58; 400; if(boutkwaliteit ≡ 68; 480; if(boutkwaliteit ≡ 88; 640; 900))))))
'α_v = 0,6 voor 4.6, 5.6 en 8.8; 0,5 voor 4.8, 5.8, 6.8 en 10.9 (tabel 3.4).
avd_ = if(boutkwaliteit ≡ 46; 0.6; if(boutkwaliteit ≡ 56; 0.6; if(boutkwaliteit ≡ 88; 0.6; 0.5)))
'Staalsoort: f_u volgens de Nationale Bijlage bij NEN-EN 1993-1-1, t ≤ 40 mm.
fu_ = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 430; 490))
'Gatdiameter bij normale gatspeling (EN 1090-2): +1 mm t/m M14, +2 mm t/m M24, +3 mm daarboven.
d0_ = if(boutdiameter ≡ 12; 13; if(boutdiameter ≡ 16; 18; if(boutdiameter ≡ 20; 22; if(boutdiameter ≡ 24; 26; if(boutdiameter ≡ 27; 30; if(boutdiameter ≡ 30; 33; 39))))))
'Spanningsoppervlak van de draad volgens ISO 898-1.
As_ = if(boutdiameter ≡ 12; 84.3; if(boutdiameter ≡ 16; 157; if(boutdiameter ≡ 20; 245; if(boutdiameter ≡ 24; 353; if(boutdiameter ≡ 27; 459; if(boutdiameter ≡ 30; 561; 817))))))
'Sleutelwijdte s over de platte kanten en maat e over de hoeken (ISO 4014/4032).
sw_ = if(boutdiameter ≡ 12; 18; if(boutdiameter ≡ 16; 24; if(boutdiameter ≡ 20; 30; if(boutdiameter ≡ 24; 36; if(boutdiameter ≡ 27; 41; if(boutdiameter ≡ 30; 46; 55))))))
ew_ = if(boutdiameter ≡ 12; 20.03; if(boutdiameter ≡ 16; 26.75; if(boutdiameter ≡ 20; 32.95; if(boutdiameter ≡ 24; 39.55; if(boutdiameter ≡ 27; 45.20; if(boutdiameter ≡ 30; 50.85; 60.79))))))
γ_M2 = 1.25
k_2 = 0.9
#show

d = boutdiameter*mm', nominale boutdiameter'
d_0 = d0_*mm', gatdiameter bij normale gatspeling'
A_s = As_ mm^2', spanningsoppervlak van de draad'
A = pi*d^2/4', oppervlak van de gladde schacht'
f_ub = fub_ N/mm^2', treksterkte van het boutmateriaal (tabel 3.1)'
f_yb = fyb_ N/mm^2', vloeigrens van het boutmateriaal (tabel 3.1)'
f_u = fu_ N/mm^2', treksterkte van het plaatmateriaal'
d_m = (sw_ + ew_)/2*mm', gemiddelde van de maat over de platte kanten en over de hoeken — §3.6.1(3)'

d
d_0
A_s
A
f_ub
f_u
d_m

# 3. Trekweerstand — tabel 3.4

'<i>De trekweerstand rekent altijd met A<sub>s</sub>: de draad is doorsnedebepalend
'ongeacht waar het afschuifvlak ligt. k<sub>2</sub> = 0,9 voor een gewone bout;
'voor een verzonken bout geldt 0,63.</i>

F_t,Rd = k_2*f_ub*A_s/γ_M2 to kN
F_t,Rd

# 4. Afschuifweerstand per afschuifvlak — tabel 3.4

'<i>Gaat het afschuifvlak door de draad, dan rekent de weerstand met
'A<sub>s</sub> en hangt α<sub>v</sub> van de boutklasse af. Gaat het door de
'gladde schacht, dan geldt A en is α<sub>v</sub> = 0,6 voor elke klasse.</i>

A_v = if(afschuifvlak ≡ 1; A_s; A)', doorsnede in het afschuifvlak'
α_v = if(afschuifvlak ≡ 1; avd_; 0.6)', afschuiffactor'

A_v
α_v
F_v,Rd = α_v*f_ub*A_v/γ_M2 to kN', per afschuifvlak'
F_v,Rd
F_v,Rd,tot = n_v*F_v,Rd', over alle afschuifvlakken van deze bout samen'
F_v,Rd,tot

# 5. Stuikweerstand — tabel 3.4

'<i>Tabel 3.4 kent twee onafhankelijke assen. In de krachtsrichting bepaalt de
'positie α<sub>d</sub>: een eindbout steunt op e<sub>1</sub>, een binnenste bout
'op p<sub>1</sub>. Loodrecht op de kracht bepaalt de positie k<sub>1</sub>: een
'randbout op e<sub>2</sub>, een binnenste bout op p<sub>2</sub>. Beide zijn hier
'apart in te stellen; k<sub>1</sub> is bovendien op 2,5 begrensd.</i>

k_1,rand = 2.8*e_2/d_0 - 1.7', tak voor een randbout'
k_1,bin = 1.4*p_2/d_0 - 1.7', tak voor een binnenste bout'
k_1 = min(if(randpositie ≡ 1; k_1,rand; k_1,bin); 2.5)

k_1,rand
k_1,bin
k_1

α_d = if(boutpositie ≡ 1; e_1/(3*d_0); p_1/(3*d_0) - 0.25)', e_1-tak bij een eindbout, p_1-tak bij een binnenste bout'
α_d
α_b = min(min(α_d; f_ub/f_u); 1.0)
α_b

F_b,Rd,tab = k_1*α_b*f_u*d*t_plaat/γ_M2 to kN', volgens tabel 3.4'
F_b,Rd,tab

'<h6>Begrenzing bij een enkele overlap met één boutrij — §3.6.1(10)</h6>

'<i>Bij een enkele overlapverbinding met slechts één boutrij staat er niets de
'rotatie in de weg die uit de excentriciteit van het ene afschuifvlak volgt. De
'norm begrenst de stuikweerstand daarom op 1,5·f<sub>u</sub>·d·t/γ<sub>M2</sub>
'en eist sluitringen onder zowel de kop als de moer.</i>

F_b,Rd,cap = 1.5*f_u*d*t_plaat/γ_M2 to kN', bovengrens uit §3.6.1(10)'
F_b,Rd,cap
F_b,Rd,nb = if(overlaptype ≡ 2; min(F_b,Rd,tab; F_b,Rd,cap); F_b,Rd,tab)', volgens tabel 3.4'
'<i>Splitspunt — k<sub>1</sub> bij de randpositie (register punt 7). de referentie-uitwerking trekt
'de twee assen van tabel 3.4 samen en neemt altijd de kleinste van beide takken.</i>
#hide
k_1,XC = min(min(k_1,rand; k_1,bin); 2.5)
F_b,Rd,tab,XC = k_1,XC*α_b*f_u*d*t_plaat/γ_M2 to kN
#show
k_1,XC
F_b,Rd,XC = if(overlaptype ≡ 2; min(F_b,Rd,tab,XC; F_b,Rd,cap); F_b,Rd,tab,XC)', volgens de referentie-uitwerking'
F_b,Rd = if(rekenwijze ≡ 1; F_b,Rd,XC; F_b,Rd,nb)', gehanteerde stuikweerstand'
F_b,Rd,nb
F_b,Rd,XC
F_b,Rd

#if overlaptype ≡ 2
    #if F_b,Rd,tab > F_b,Rd,cap
        '<b style="color: #b45309">De begrenzing van §3.6.1(10) is maatgevend:</b>
        'tabel 3.4 geeft 'F_b,Rd,tab' kN, maar bij een enkele overlap met één
        'boutrij geldt ten hoogste 'F_b,Rd,cap' kN.
        '<b>Vergeet de sluitringen onder kop én moer niet</b> — die eist §3.6.1(10) erbij.
    #else
        'De begrenzing van §3.6.1(10) ('F_b,Rd,cap' kN) is hier niet maatgevend;
        'tabel 3.4 geeft al 'F_b,Rd,tab' kN. <b>Sluitringen onder kop én moer
        'blijven wel vereist.</b>
    #end if
#else
    '<i>Niet van toepassing: de begrenzing geldt alleen bij een enkele overlap
    'met één boutrij. Zou die hier gelden, dan was de weerstand op
    ''F_b,Rd,cap' kN begrensd.</i>
#end if

# 6. Ponsweerstand — §3.6.1(3)

'<i>Doorponsen van de plaat onder de kop of de moer. t<sub>p</sub> is de dikte
'van de plaat waar de kop of de moer op drukt; hier gelijkgesteld aan de
'ingevoerde plaatdikte.</i>

t_p = t_plaat
B_p,Rd,nb = 0.6*pi*d_m*t_p*f_u/γ_M2 to kN', met d_m volgens §3.6.1(3)'
'<i>Splitspunt — d<sub>m</sub> (register punt 6). de referentie-uitwerking vult de sleutelwijdte
'over de platte kanten in waar §3.6.1(3) het gemiddelde van de platte kanten en
'de hoeken vraagt; dat geeft een lagere, dus veilige, ponsweerstand.</i>
d_m,XC = sw_*mm', sleutelwijdte — de referentie-uitwerking'
B_p,Rd,XC = 0.6*pi*d_m,XC*t_p*f_u/γ_M2 to kN', volgens de referentie-uitwerking'
B_p,Rd = if(rekenwijze ≡ 1; B_p,Rd,XC; B_p,Rd,nb)', gehanteerde ponsweerstand'
B_p,Rd,nb
B_p,Rd,XC
B_p,Rd

# 7. Afstandseisen — tabel 3.3

'<i>Signalering, geen onderdeel van de weerstanden. Tabel 3.4 blijft alleen
'geldig binnen deze grenzen. Het referentieprogramma toetst ze niet.</i>

#hide
e1min = 1.2*d_0
e2min = 1.2*d_0
p1min = 2.2*d_0
p2min = 2.4*d_0
pmax = min(14*t_plaat; 200 mm)
'Eenheidloos maken, anders vergelijkt de #if een lengte met een kaal getal.
tekort = (if(e_1 < e1min; 1; 0) + if(e_2 < e2min; 1; 0) + if(boutpositie ≡ 2; if(p_1 < p1min; 1; 0); 0) + if(randpositie ≡ 2; if(p_2 < p2min; 1; 0); 0) + if(boutpositie ≡ 2; if(p_1 > pmax; 1; 0); 0) + if(randpositie ≡ 2; if(p_2 > pmax; 1; 0); 0))
#show

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Afstand</th><th style="text-align:right; padding-right:14px">aanwezig [mm]</th><th style="text-align:right; padding-right:14px">minimum [mm]</th><th style="text-align:right">maximum [mm]</th></tr>
'<tr><td style="padding:2px 12px 2px 0">e<sub>1</sub></td><td style="text-align:right; padding-right:14px">'e_1'</td><td style="text-align:right; padding-right:14px">1,2 d<sub>0</sub> = 'e1min'</td><td style="text-align:right">—</td></tr>
'<tr><td style="padding:2px 12px 2px 0">e<sub>2</sub></td><td style="text-align:right; padding-right:14px">'e_2'</td><td style="text-align:right; padding-right:14px">1,2 d<sub>0</sub> = 'e2min'</td><td style="text-align:right">—</td></tr>
'<tr><td style="padding:2px 12px 2px 0">p<sub>1</sub></td><td style="text-align:right; padding-right:14px">'p_1'</td><td style="text-align:right; padding-right:14px">2,2 d<sub>0</sub> = 'p1min'</td><td style="text-align:right">'pmax'</td></tr>
'<tr><td style="padding:2px 12px 2px 0">p<sub>2</sub></td><td style="text-align:right; padding-right:14px">'p_2'</td><td style="text-align:right; padding-right:14px">2,4 d<sub>0</sub> = 'p2min'</td><td style="text-align:right">'pmax'</td></tr>
'</table>

#if tekort ≡ 0
    '<span style="color: green">Alle van toepassing zijnde afstanden liggen binnen tabel 3.3.</span>
#else
    '<span style="color: red">'tekort' afstand(en) buiten tabel 3.3 — de weerstanden hierboven zijn dan niet zonder meer geldig.</span>
#end if

'<i>De maxima voor e<sub>1</sub> en e<sub>2</sub> (4t + 40 mm) gelden alleen bij
'constructies die aan weer en wind blootstaan; die zijn hier niet getoetst.
'p<sub>1</sub> en p<sub>2</sub> worden alleen beoordeeld als de bout in die
'richting een binnenste bout is.</i>

# 8. Toetsing van de bout

#hide
'Eenheidloos, zodat de #if met een kaal getal kan vergelijken.
belast = (F_v,Ed + F_t,Ed)/(1*kN)
#show

#if belast ≤ 0
    '<i>Geen krachten ingevoerd — dit blad geeft alleen de weerstanden. Vul
    'F<sub>v,Ed</sub> en/of F<sub>t,Ed</sub> in om de eenheidschecks te krijgen.</i>
#else
    'Afschuiving en stuik worden elk apart getoetst; de trek loopt via de bout
    'én via het doorponsen van de plaat.

    UC_v = F_v,Ed/F_v,Rd,tot', afschuiving van de bout'
    UC_b = F_v,Ed/F_b,Rd', stuik in de plaat'
    UC_t = F_t,Ed/F_t,Rd', trek in de bout'
    UC_p = F_t,Ed/B_p,Rd', doorponsen van de plaat'
    UC_v
    UC_b
    UC_t
    UC_p

    'Bij gelijktijdige trek en afschuiving geldt de interactie uit tabel 3.4.
    UC_vt = F_v,Ed/F_v,Rd,tot + F_t,Ed/(1.4*F_t,Rd)', interactie trek + afschuiving'
    UC_vt

    #hide
    UC_max = max(max(max(UC_v; UC_b); max(UC_t; UC_p)); UC_vt)
    #show
    #if UC_max ≤ 1.0
        '<b style="color: green">Voldoet — maatgevende eenheidscheck 'UC_max'.</b>
    #else
        '<b style="color: red">Voldoet niet — maatgevende eenheidscheck 'UC_max'.</b>
    #end if
#end if

# 9. Afwijking ten opzichte van het referentieprogramma

'<i>Dit blad volgt de norm. Op twee punten wijkt de referentie-uitwerking daarvan af; hieronder
'staat wat dat bij déze invoer betekent. Het volledige register staat in
'<b>docs/afwijkingen-referentie</b>.</i>

#hide
'Beide takken staan al bij §6 en §8; hier alleen het verschil, eenheidloos.
'Let op: vergelijken met de NORM-tak, niet met de gehanteerde waarde — anders
'meldt dit blok "geen afwijking" zodra de de referentie-uitwerking-stand is gekozen.
Δk = abs(F_b,Rd,nb - F_b,Rd,XC)/(1*kN)
#show

'<b style="color: #1d4ed8">B<sub>p,Rd</sub> — d<sub>m</sub> volgens §3.6.1(3).</b>
'de referentie-uitwerking vult voor d<sub>m</sub> de sleutelwijdte over de platte kanten in
'('d_m,XC' mm voor M'boutdiameter'), terwijl §3.6.1(3) het gemiddelde vraagt van
'die maat en de maat over de hoeken ('d_m' mm). Dat scheelt hier
''B_p,Rd,nb' kN tegen 'B_p,Rd,XC' kN — De referentie-uitwerking rekent dus <b>veilig maar niet
'economisch</b>.

#if Δk ≤ 0.05
    '<span style="color: green">De stuikweerstand komt bij deze invoer overeen:
    'F<sub>b,Rd</sub> = 'F_b,Rd,XC' kN in beide.</span>
#else
    '<b style="color: #1d4ed8">F<sub>b,Rd</sub> — k<sub>1</sub> bij een binnenste bout loodrecht op de kracht.</b>
    'de referentie-uitwerking heeft de twee assen van tabel 3.4 tot één keuzelijst
    'samengetrokken en neemt voor k<sub>1</sub> het minimum van beide takken
    '('k_1,XC'), terwijl de tabel voor een binnenste bout loodrecht op de kracht
    'alleen de p<sub>2</sub>-tak vraagt ('k_1'). Dat geeft
    ''F_b,Rd,nb' kN tegen 'F_b,Rd,XC' kN.
    '<i>Deze situatie is met de referentie-uitwerking niet in te voeren; de vergelijking is
    'daarom niet tegen een referentieblad te controleren.</i>
#end if

# 10. Samenvatting

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Weerstand</th><th style="text-align:right">Waarde</th></tr>
'<tr><td style="padding:2px 12px 2px 0">F<sub>t,Rd</sub> — trek in de bout</td><td style="text-align:right">'F_t,Rd' kN</td></tr>
'<tr><td style="padding:2px 12px 2px 0">F<sub>v,Rd</sub> — afschuiving per afschuifvlak</td><td style="text-align:right">'F_v,Rd' kN</td></tr>
'<tr><td style="padding:2px 12px 2px 0">F<sub>v,Rd</sub> — over alle afschuifvlakken (n<sub>v</sub> = 'n_v')</td><td style="text-align:right">'F_v,Rd,tot' kN</td></tr>
'<tr><td style="padding:2px 12px 2px 0">F<sub>b,Rd</sub> — stuik in de plaat</td><td style="text-align:right">'F_b,Rd' kN</td></tr>
'<tr><td style="padding:2px 12px 2px 0">B<sub>p,Rd</sub> — doorponsen</td><td style="text-align:right">'B_p,Rd' kN</td></tr>
'</table>

'<hr/>
'<i>Aandachtspunten:
'<ul>
'<li>Gecalibreerd op <b>zes</b> de referentie-uitwerking-referenties (document1C t/m 6C).
'Basis S235 · 8.8 · M16 · draad · eindbout · t 20 · e<sub>1</sub> 30 ·
'p<sub>1</sub> 80 · e<sub>2</sub> 25 · p<sub>2</sub> 60 → F<sub>t,Rd</sub> 90,4 ·
'F<sub>v,Rd</sub> 60,3 · F<sub>b,Rd</sub> 112,1 kN. Varianten: <b>schacht in het
'afschuifvlak</b> (A in plaats van A<sub>s</sub> → 77,2) · <b>binnenste bout</b>
'(α<sub>d</sub> = p<sub>1</sub>/3d<sub>0</sub> − ¼ = 1,231 → α<sub>b</sub> 1,00 →
'201,7) · <b>randbout</b> (identiek aan de eindbout) · <b>enkele bout</b> ·
'<b>e<sub>1</sub> 60 met e<sub>2</sub> 50</b> (k<sub>1</sub> op 2,5 én
'α<sub>b</sub> op 1,00 → 230,4). F<sub>t,Rd</sub>, F<sub>v,Rd</sub> en
'F<sub>b,Rd</sub> komen in alle zes exact overeen; B<sub>p,Rd</sub> wijkt af door
'de d<sub>m</sub>-kwestie hierboven.</li>
'<li><b>Nog niet tegen een referentie getoetst:</b> de boutklassen met
'α<sub>v</sub> = 0,5 (4.8, 5.8, 6.8, 10.9), andere staalsoorten dan S235, andere
'diameters dan M16, en de eenheidschecks van paragraaf 8 — het
'referentieprogramma kent geen krachtinvoer en drukt alleen weerstanden af.</li>
'<li>De begrenzing van <b>§3.6.1(10)</b> zit erin, maar moet je zelf aanzetten:
'zij geldt alleen bij een <b>enkele overlapverbinding met één boutrij</b>. De
'referentiebladen hebben twee boutrijen, dus die stand is niet tegen een
'referentie getoetst. Vergeet in dat geval de <b>sluitringen onder kop én
'moer</b> niet — die eist hetzelfde artikel.</li>
'<li>Twee verwante correcties zitten hier bewust <b>niet</b> in, omdat ze bij de
'verbinding horen en niet bij de losse bout: <b>§3.8</b> (lange verbindingen,
'β<sub>Lf</sub> zodra L<sub>j</sub> &gt; 15d) en <b>§3.6.1(12)</b> (vulplaten,
'β<sub>p</sub> zodra t<sub>p</sub> &gt; d/3). De verbindingsmodules moeten die
'zelf toepassen op de F<sub>v,Rd</sub> die dit blad levert.</li>
'<li>De <b>blokschuif</b> (§3.10.2) en het <b>hefboomeffect</b> (prying, §3.11)
'zitten hier niet in. Bij een trekverbinding met een doorbuigende eindplaat moet
'de trekkracht in de bout inclusief hefboomkracht worden ingevoerd.</li>
'<li>F<sub>v,Rd</sub> geldt <b>per afschuifvlak</b> en gaat uit van een
'stempelverbinding (categorie A). Slipvaste verbindingen (categorie B en C)
'vragen §3.9 en staan hier niet in.</li>
'<li>t is de <b>dunste</b> plaat in de stuiktoets. Voor het doorponsen is
't<sub>p</sub> strikt genomen de plaat onder de kop of de moer; dit blad
'gelijkstelt beide, net als het referentieprogramma.</li>
'<li>Tabel 3.4 gaat uit van een gat met <b>normale</b> gatspeling. Bij een
'overmaats of slobgat moet F<sub>b,Rd</sub> met 0,8 resp. 0,6 worden
'vermenigvuldigd (§3.6.1(14)); dat zit hier niet in.</li>
'</ul></i>
`;
