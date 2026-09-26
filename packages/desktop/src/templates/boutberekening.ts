/**
 * Boutberekening — weerstanden van één bout volgens NEN-EN 1993-1-8 tabel 3.4.
 *
 * BOUWSTEEN: dit blad levert F_v,Rd, F_b,Rd, F_t,Rd en B_p,Rd voor één bout.
 * De momentverbinding, dwarskrachtverbinding en schoorverbinding hangen
 * daaraan; de formules staan daarom bewust op zichzelf, zonder aannames
 * over de verbinding waarin de bout zit.
 *
 * Gecalibreerd op zes referentieberekeningen (document1C t/m 6C), basis
 * S235 · 8.8 · M16 · draad in het afschuifvlak · eindbout · t 20 · e₁ 30 ·
 * p₁ 80 · e₂ 25 · p₂ 60 → F_t,Rd 90,4 · F_v,Rd 60,3 · F_b,Rd 112,1 kN.
 * Varianten: schacht in het afschuifvlak (F_v,Rd 77,2 — met A i.p.v. A_s) ·
 * binnenste bout (α_d = p₁/3d₀ − ¼ = 1,231 → α_b 1,00 → F_b,Rd 201,7) ·
 * randbout (identiek aan de eindbout) · enkele bout (k₁ zonder de p₂-tak) ·
 * e₁ 60 met e₂ 50 (k₁ op de bovengrens 2,5 én α_b op 1,00 → F_b,Rd 230,4).
 * F_t,Rd, F_v,Rd en F_b,Rd komen in alle zes exact overeen. Niet tegen een
 * referentie getoetst: de klassen met α_v = 0,5, andere staalsoorten en
 * diameters, §3.6.1(10) en de eenheidschecks — de referentie kent geen
 * krachtinvoer.
 *
 * AFWIJKING — B_p,Rd. de referentie-uitwerking vult voor d_m de sleutelwijdte over de platte
 * kanten in (M16 → 24,0 mm). §3.6.1(3) vraagt het gemiddelde van de maat over
 * de platte kanten en die over de hoeken, dus 25,4 mm voor M16. de referentie-uitwerking komt
 * daardoor 5,5 % lager uit (260,6 tegen 275,5 kN) — veilig, maar niet
 * economisch. Zie docs/afwijkingen-referentie.
 *
 * k₁ — tabel 3.4 met het correctieblad. Twee onafhankelijke assen: eind- of
 * binnenste bout in de krachtsrichting (bepaalt α_d) en rand- of binnenste
 * bout loodrecht daarop (bepaalt k₁). Een randbout neemt het kleinste van de
 * e₂-tak, de p₂-tak en 2,5; staat er loodrecht op de kracht geen tweede bout
 * (p₂ = 0 of niet ingevuld), dan vervalt de p₂-tak. Een binnenste bout neemt
 * alleen de p₂-tak.
 *
 * Tabel 3.3: onder een minimum is het oordeel altijd "voldoet niet"; een steek
 * boven het maximum is alleen een signaal, want de voetnoot bij de maxima
 * beperkt ze tot gedrukte en aan weer blootgestelde delen.
 *
 * AFWIJKING — binnenste bout loodrecht op de kracht. de referentie-uitwerking
 * trekt de twee assen samen tot één keuzelijst en neemt voor k₁ altijd het
 * minimum van beide takken. Voor een randbout is dat precies de tabel; alleen
 * bij een binnenste bout loodrecht op de kracht rekent zij lager (veilig).
 *
 * §3.6.1(10) — de begrenzing F_b,Rd ≤ 1,5·f_u·d·t/γ_M2 bij een enkele overlap
 * met één boutrij zit erin als aparte keuze (overlaptype). Alle zes
 * referentiebladen hebben twee boutrijen, dus die stand blijft ongetoetst; op
 * de basisinvoer zou de grens 138,2 kN zijn, ruim boven de 112,1 uit tabel 3.4.
 *
 * QUIRK — de referentie-uitwerking drukt bij B_p,Rd "3,14" af maar rekent met de volle π;
 * met 3,14 zou er 260,4 in plaats van 260,6 kN uitkomen.
 *
 * Invoernamen komen exact overeen met BoutDesigner.tsx; dat beeld leest de
 * weerstanden en het oordeel uit dit blad.
 */

export const boutberekening = `"Boutberekening — weerstanden van één bout volgens NEN-EN 1993-1-8 tabel 3.4

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
p_2 = ?*(mm)', steek loodrecht op de kracht p_2 — 0 = geen tweede bout loodrecht op de kracht'

n_v = ?', aantal afschuifvlakken van deze bout'

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
d = boutdiameter*mm
d_0 = d0_*mm
A_s = As_*mm^2
A = pi*d^2/4
f_ub = fub_*N/mm^2
f_yb = fyb_*N/mm^2
f_u = fu_*N/mm^2
#show
'Bout M'boutdiameter': d<sub>0</sub> = 'd_0' mm (normale gatspeling), A<sub>s</sub> = 'A_s' mm², A = 'A' mm², f<sub>ub</sub> = 'f_ub' N/mm² (tabel 3.1). Plaat: f<sub>u</sub> = 'f_u' N/mm². γ<sub>M2</sub> = 'γ_M2'.

# 3. Trekweerstand — tabel 3.4

F_t,Rd = k_2*f_ub*A_s/γ_M2 to kN', altijd met A_s; k_2 = 0,9 voor een gewone bout'

# 4. Afschuifweerstand — tabel 3.4

#hide
α_v = if(afschuifvlak ≡ 1; avd_; 0.6)
#show
#if afschuifvlak ≡ 1
    A_v = A_s', afschuifvlak door de draad'
#else
    A_v = A', afschuifvlak door de schacht'
#end if
α_v', tabel 3.4'
F_v,Rd = α_v*f_ub*A_v/γ_M2 to kN', per afschuifvlak'
F_v,Rd,tot = n_v*F_v,Rd', over alle afschuifvlakken van deze bout'

# 5. Stuikweerstand — tabel 3.4

#hide
'Randbout zonder tweede bout loodrecht op de kracht (p_2 = 0 of niet ingevuld): de p_2-tak vervalt.
enkel = if(randpositie ≡ 1; if(p_2 > 0 mm; 0; 1); 0)
#show
#if randpositie ≡ 2
    k_1,bin = 1.4*p_2/d_0 - 1.7', binnenste bout loodrecht op de kracht'
    k_1 = min(k_1,bin; 2.5)
#else if enkel ≡ 1
    k_1,rand = 2.8*e_2/d_0 - 1.7', randbout zonder tweede bout loodrecht op de kracht'
    k_1 = min(k_1,rand; 2.5)
#else
    k_1,rand = 2.8*e_2/d_0 - 1.7', randbout'
    k_1,bin = 1.4*p_2/d_0 - 1.7', tak met de steek p_2 — geldt ook voor een randbout'
    k_1 = min(min(k_1,rand; k_1,bin); 2.5)
#end if
#if boutpositie ≡ 1
    α_d = e_1/(3*d_0)', eindbout'
#else
    α_d = p_1/(3*d_0) - 0.25', binnenste bout in de krachtsrichting'
#end if
α_b = min(min(α_d; f_ub/f_u); 1.0)
F_b,Rd,tab = k_1*α_b*f_u*d*t_plaat/γ_M2 to kN

#hide
F_b,Rd,cap = 1.5*f_u*d*t_plaat/γ_M2 to kN
F_b,Rd,nb = if(overlaptype ≡ 2; min(F_b,Rd,tab; F_b,Rd,cap); F_b,Rd,tab)
'Referentie-uitwerking (register punt 7): k_1 altijd als kleinste van beide takken.
k_1,XC = min(min(2.8*e_2/d_0 - 1.7; if(enkel ≡ 1; 2.5; 1.4*p_2/d_0 - 1.7)); 2.5)
F_b,Rd,tab,XC = k_1,XC*α_b*f_u*d*t_plaat/γ_M2 to kN
F_b,Rd,XC = if(overlaptype ≡ 2; min(F_b,Rd,tab,XC; F_b,Rd,cap); F_b,Rd,tab,XC)
F_b,Rd = if(rekenwijze ≡ 1; F_b,Rd,XC; F_b,Rd,nb)
'Eenheidloos, voor de #if: verschilt de gehanteerde waarde van de norm-tak?
ΔF_b = abs(F_b,Rd - F_b,Rd,nb)/(1*kN)
#show
#if overlaptype ≡ 2
    F_b,Rd,cap', 1,5·f_u·d·t/γ_M2 — §3.6.1(10), enkele overlap met één boutrij; sluitringen onder kop en moer vereist'
#end if
#if ΔF_b > 0.05
    k_1,XC', rekenwijze referentie-uitwerking: kleinste van de e_2- en de p_2-tak, ook bij een binnenste bout loodrecht op de kracht'
#end if
F_b,Rd', gehanteerde stuikweerstand'

# 6. Ponsweerstand — §3.6.1(3)

#hide
t_p = t_plaat
d_m = (sw_ + ew_)/2*mm
B_p,Rd,nb = 0.6*pi*d_m*t_p*f_u/γ_M2 to kN
'Referentie-uitwerking (register punt 6): d_m is de sleutelwijdte.
d_m,XC = sw_*mm
B_p,Rd,XC = 0.6*pi*d_m,XC*t_p*f_u/γ_M2 to kN
B_p,Rd = if(rekenwijze ≡ 1; B_p,Rd,XC; B_p,Rd,nb)
#show
'B<sub>p,Rd</sub> = 0,6·π·d<sub>m</sub>·t<sub>p</sub>·f<sub>u</sub>/γ<sub>M2</sub>, met t<sub>p</sub> = t en d<sub>m</sub> = 'd_m' mm (gemiddelde van sleutelwijdte en maat over de hoeken).
#if rekenwijze ≡ 1
    'Rekenwijze referentie-uitwerking: d<sub>m</sub> = sleutelwijdte = 'd_m,XC' mm. Dat geeft 'B_p,Rd' kN in plaats van 'B_p,Rd,nb' kN.
#end if
B_p,Rd', doorponsen van de plaat onder kop of moer'

# 7. Afstanden — tabel 3.3

#hide
e1min = 1.2*d_0
e2min = 1.2*d_0
p1min = 2.2*d_0
p2min = 2.4*d_0
pmax = min(14*t_plaat; 200 mm)
'p_1 en p_2 tellen mee zodra ze in de weerstand zitten. Eenheidloos, anders vergelijkt de #if een lengte met een kaal getal.
'Onder een minimum geldt tabel 3.4 niet; het maximum alleen bij gedrukte of aan weer blootgestelde delen, dus als signaal.
tekort = (if(e_1 < e1min; 1; 0) + if(e_2 < e2min; 1; 0) + if(boutpositie ≡ 2; if(p_1 < p1min; 1; 0); 0) + if(enkel ≡ 0; if(p_2 < p2min; 1; 0); 0))
teveel = (if(boutpositie ≡ 2; if(p_1 > pmax; 1; 0); 0) + if(enkel ≡ 0; if(p_2 > pmax; 1; 0); 0))
#show

'<table style="border-collapse:collapse; font-size:13px">
'<tr><th style="text-align:left; padding:2px 12px 2px 0">Afstand</th><th style="text-align:right; padding-right:14px">aanwezig [mm]</th><th style="text-align:right; padding-right:14px">minimum [mm]</th><th style="text-align:right">maximum [mm]</th></tr>
'<tr><td style="padding:2px 12px 2px 0">e<sub>1</sub></td><td style="text-align:right; padding-right:14px">'e_1'</td><td style="text-align:right; padding-right:14px">1,2 d<sub>0</sub> = 'e1min'</td><td style="text-align:right">—</td></tr>
'<tr><td style="padding:2px 12px 2px 0">e<sub>2</sub></td><td style="text-align:right; padding-right:14px">'e_2'</td><td style="text-align:right; padding-right:14px">1,2 d<sub>0</sub> = 'e2min'</td><td style="text-align:right">—</td></tr>
#if boutpositie ≡ 2
    '<tr><td style="padding:2px 12px 2px 0">p<sub>1</sub></td><td style="text-align:right; padding-right:14px">'p_1'</td><td style="text-align:right; padding-right:14px">2,2 d<sub>0</sub> = 'p1min'</td><td style="text-align:right">'pmax'</td></tr>
#end if
#if enkel ≡ 0
    '<tr><td style="padding:2px 12px 2px 0">p<sub>2</sub></td><td style="text-align:right; padding-right:14px">'p_2'</td><td style="text-align:right; padding-right:14px">2,4 d<sub>0</sub> = 'p2min'</td><td style="text-align:right">'pmax'</td></tr>
#end if
'</table>

#if tekort + teveel ≡ 0
    '<span style="color: green">Alle afstanden die in de weerstand meetellen liggen binnen tabel 3.3.</span>
#else if tekort ≡ 0
    '<span style="color: #b45309">'teveel' steek(en) boven het maximum van tabel 3.3; dat maximum geldt alleen bij gedrukte en bij aan weer blootgestelde delen.</span>
#else
    '<span style="color: red">'tekort' afstand(en) onder het minimum van tabel 3.3 — de weerstanden hierboven gelden dan niet.</span>
#end if

# 8. Toetsing van de bout

#hide
'Eenheidloos, zodat de #if met een kaal getal kan vergelijken.
belast = (F_v,Ed + F_t,Ed)/(1*kN)
#show

#if belast ≤ 0
    'Geen krachten ingevoerd: alleen de weerstanden.
#else
    UC_v = F_v,Ed/F_v,Rd,tot', afschuiving van de bout'
    UC_b = F_v,Ed/F_b,Rd', stuik in de plaat'
    UC_t = F_t,Ed/F_t,Rd', trek in de bout'
    UC_p = F_t,Ed/B_p,Rd', doorponsen van de plaat'
    UC_vt = F_v,Ed/F_v,Rd,tot + F_t,Ed/(1.4*F_t,Rd)', trek en afschuiving samen, tabel 3.4'
    #hide
    UC_max = max(UC_v; UC_b; UC_t; UC_p; UC_vt)
    'Een stuikweerstand ≤ 0 (k_1 of α_d ≤ 0) of een afstand onder het minimum van tabel 3.3 is nooit een voldoende.
    stuikfout = if(F_v,Ed > 0 kN; if(F_b,Rd > 0 kN; 0; 1); 0)
    maatfout = if(tekort ≡ 0; 0; 1)
    #show
    #if stuikfout ≡ 1
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar F<sub>b,Rd</sub> ≤ 0: k<sub>1</sub> of α<sub>d</sub> is niet positief (een rand- of steekafstand is te klein) → <b>voldoet niet</b></span>
    #else if maatfout ≡ 1
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar 'tekort' afstand(en) onder het minimum van tabel 3.3 → <b>voldoet niet</b></span>
    #else if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
    #end if
#end if

# 9. Samenvatting

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
'<li><b>§3.6.1(10)</b> geldt alleen bij een enkele overlap met één boutrij (keuze Verbindingsvorm); dan zijn sluitringen onder kop én moer vereist.</li>
'<li>Horen bij de verbinding en staan hier niet in: lange verbindingen (§3.8), vulplaten (§3.6.1(12)), blokschuif (§3.10.2) en hefboomwerking (§3.11). Voer F<sub>t,Ed</sub> in inclusief hefboomkracht.</li>
'<li>F<sub>v,Rd</sub> geldt per afschuifvlak voor een stempelverbinding (categorie A); slipvaste verbindingen (§3.9) staan hier niet in.</li>
'<li>t is de <b>dunste</b> plaat; voor het doorponsen is t<sub>p</sub> hier gelijk aan t genomen.</li>
'<li>Normale gatspeling. Overmaatse gaten en slobgaten (§3.6.1(14)) en de maxima voor e<sub>1</sub> en e<sub>2</sub> bij blootstelling aan weer (tabel 3.3) zijn niet meegenomen.</li>
'</ul></i>
`;
