/**
 * Nagel- en schroefverbinding — stiftvormige verbindingsmiddelen in hout
 * volgens NEN-EN 1995-1-1:2005+A2:2014 met NB:2013, hoofdstuk 8.
 *
 * Vijf opbouwen: hout–hout en plaat–hout enkelsnedig (8.6), hout–hout–hout
 * dubbelsnedig (8.7), staalplaat–hout enkelsnedig (8.9/8.10, met interpolatie
 * tussen dunne en dikke plaat) en hout–staalplaat–hout dubbelsnedig (8.11).
 * Verbindingsmiddelen: gladde, vierkante of gegroefde, en ring- of
 * schroefnagels, en schroeven. Nagels tot 8 mm en schroeven met d_ef ≤ 6 mm
 * volgen de nagelregels (§8.3.1); schroeven met d_ef > 6 mm de boutregels
 * (§8.5.1 via §8.7.1(4)), nagels boven 8 mm alleen voor de stuiksterkte
 * (§8.3.1.1(6)). Een vierkante of gegroefde nagel zonder profilering volgens
 * EN 14592 is axiaal een gladde nagel; alleen het vloeimoment (8.14) en de
 * grens van het koordeffect verschillen.
 *
 * Axiaal: §8.3.2 voor nagels en §8.7.2 voor schroeven, met (8.40a) in de
 * vorm van het Engelstalige aanvullingsblad A1. Het koordeffect telt mee
 * volgens §8.2.2(2) en krijgt alleen het deel van de uittreksterkte dat de
 * axiale belasting overlaat (NB bij §8.2.2(5)). Groep volgens §8.1.2 met n_ef
 * uit tabel 8.1 of (8.34)/(8.35); combinatie (8.27)/(8.28); splijten door de
 * kracht loodrecht op de vezel (8.2)–(8.4); minimale afstanden uit tabel 8.2,
 * 8.4 en 8.6 met de buitendiameter (§8.7.1(1)). De hoeken α (kracht) en α_s
 * (schroefas) tellen als de scherpe hoek met de vezel.
 *
 * Geen referentieberekening beschikbaar; scripts/check-nagel-schroef.mjs
 * rekent de uitkomsten onafhankelijk na. Status in de catalogus: controleren.
 */

export const nagelSchroefverbinding = `"Nagel- en schroefverbinding — EN 1995-1-1 hoofdstuk 8

# 1. Uitgangspunten

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
kleur_ok(b) = if(b ≡ 1; "#047857"; "#b91c1c")
#show

@select klimaat "Klimaatklasse"
  Klimaatklasse 1 = 1
  Klimaatklasse 2 = 2
  Klimaatklasse 3 = 3
@end

@select duur "Belastingsduurklasse: de kortste belasting in de combinatie (§3.1.3(2))"
  Blijvend = 1
  Lang = 2
  Middellang = 3
  Kort = 4
  Zeer kort = 5
@end

γ_M = 1.3', verbindingen (tabel 2.3)'

# 2. Opbouw van de verbinding

@select opbouw "Opbouw"
  Hout – hout, enkelsnedig = 1
  Hout – hout – hout, dubbelsnedig = 2
  Plaat – hout, enkelsnedig = 3
  Staalplaat – hout, enkelsnedig = 4
  Hout – staalplaat – hout, dubbelsnedig = 5
@end

#if opbouw ≡ 3
    @select plaat "Plaatmateriaal (element 1)"
      OSB/3 (EN 300) = 1
      OSB/4 (EN 300) = 2
      Spaanplaat P5 (EN 312) = 3
      Multiplex (EN 636) = 4
      Gipskartonplaat (NEN-EN 520) = 5
      Gipsvezelplaat (NEN-EN 15283-2) = 6
    @end
    t_1 = ?*(mm)', dikte van de plaat'
    #if plaat ≡ 4
        ρ_pl = ?*(kg/m^3)', karakteristieke volumieke massa van het multiplex'
    #else
        #hide
        ρ_pl = 0 kg/m^3
        #show
    #end if
    #hide
    t_s = 0 mm
    #show
#else if opbouw ≡ 4
    t_s = ?*(mm)', dikte van de staalplaat (element 1)'
    #hide
    plaat = 1
    ρ_pl = 0 kg/m^3
    t_1 = t_s
    #show
#else
    @select klasse_1 "Sterkteklasse element 1, aan de kopzijde (bij dubbelsnedig: beide zijdelen)"
      C14 = 1
      C16 = 2
      C18 = 3
      C20 = 4
      C22 = 5
      C24 = 6
      C27 = 7
      C30 = 8
      GL24h = 9
      GL28h = 10
      GL32h = 11
    @end
    t_1 = ?*(mm)', dikte element 1'
    #hide
    plaat = 1
    ρ_pl = 0 kg/m^3
    t_s = 0 mm
    #show
#end if
#if opbouw ≡ 5
    t_s = ?*(mm)', dikte van de staalplaat (middendeel)'
    #hide
    klasse_2 = klasse_1
    t_2 = t_1
    #show
#else
    @select klasse_2 "Sterkteklasse element 2, aan de puntzijde (bij dubbelsnedig: het middendeel)"
      C14 = 1
      C16 = 2
      C18 = 3
      C20 = 4
      C22 = 5
      C24 = 6
      C27 = 7
      C30 = 8
      GL24h = 9
      GL28h = 10
      GL32h = 11
    @end
    t_2 = ?*(mm)', dikte element 2'
    #if opbouw ≥ 3
        #hide
        klasse_1 = klasse_2
        #show
    #end if
#end if

#hide
'EN 338 en EN 14080: karakteristieke volumieke massa per klasse.
hout = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11 |290; 310; 320; 330; 340; 350; 370; 380; 385; 425; 440]
ρ_1 = hlookup(hout; klasse_1; 1; 2)*kg/m^3
ρ_2 = hlookup(hout; klasse_2; 1; 2)*kg/m^3
'Tabel 3.1: [klimaatklasse | blijvend | lang | middellang | kort | zeer kort], hout en gelamineerd hout.
kmod_h = [1; 2; 3 |0.60; 0.60; 0.50 |0.70; 0.70; 0.55 |0.80; 0.80; 0.65 |0.90; 0.90; 0.70 |1.10; 1.10; 0.90]
'Platen, tabel 3.1 en voor gipsplaat tabel NB.2. Sleutel = 10 × plaat + klimaatklasse; 0 = niet toegestaan.
kmod_p = [11; 12; 13; 21; 22; 23; 31; 32; 33; 41; 42; 43; 51; 52; 53; 61; 62; 63 |0.40; 0.30; 0; 0.40; 0.30; 0; 0.30; 0.20; 0; 0.60; 0.60; 0.50; 0.20; 0.15; 0; 0.20; 0.15; 0 |0.50; 0.40; 0; 0.50; 0.40; 0; 0.45; 0.30; 0; 0.70; 0.70; 0.55; 0.40; 0.30; 0; 0.40; 0.30; 0 |0.70; 0.55; 0; 0.70; 0.55; 0; 0.65; 0.45; 0; 0.80; 0.80; 0.65; 0.60; 0.45; 0; 0.60; 0.45; 0 |0.90; 0.70; 0; 0.90; 0.70; 0; 0.85; 0.60; 0; 0.90; 0.90; 0.70; 0.80; 0.60; 0; 0.80; 0.60; 0 |1.10; 0.90; 0; 1.10; 0.90; 0; 1.10; 0.80; 0; 1.10; 1.10; 0.90; 1.00; 0.80; 0; 1.00; 0.80; 0]
k_mod,h = hlookup(kmod_h; klimaat; 1; duur + 1)
k_mod,p = hlookup(kmod_p; 10*plaat + klimaat; 1; duur + 1)
#show
#if opbouw ≤ 2
    ρ_1', element 1'
    ρ_2', element 2'
#else if opbouw ≡ 5
    ρ_1', zijdelen'
#else
    ρ_2', element 2'
#end if
k_mod,h', hout (tabel 3.1)'
#if opbouw ≡ 3
    k_mod,p', plaat (tabel 3.1, gipsplaat tabel NB.2)'
    k_mod = sqrt(k_mod,h*k_mod,p)', twee materialen (2.6)'
    #if k_mod,p ≡ 0
        '<b style="color:#b91c1c">Dit plaatmateriaal mag in klimaatklasse 'klimaat' niet worden toegepast (tabel 3.1, §3.8).</b>
    #end if
#else
    k_mod = k_mod,h', een houtsoort, of hout met staal'
#end if

# 3. Verbindingsmiddel

@select middel "Verbindingsmiddel"
  Gladde nagel = 1
  Vierkante of gegroefde nagel, niet geprofileerd = 2
  Ring-, schroef- of andere geprofileerde nagel (EN 14592) = 3
  Schroef = 4
@end

d_v = ?*(mm)', diameter; bij een schroef de buitendiameter van de draad'
l_v = ?*(mm)', lengte'
d_h = ?*(mm)', diameter van de kop'
f_u = ?*(N/mm^2)', treksterkte van het draadmateriaal'

#if middel ≡ 4
    d_1 = ?*(mm)', kerndiameter van de schroefdraad'
    l_g = ?*(mm)', lengte van de schroefdraad aan de puntzijde'
    d_ef = 1.1*d_1', meewerkende diameter voor stuik en vloeimoment (§8.7.1(3))'
    f_head,k = ?*(N/mm^2)', doortrekparameter van de kop (EN 14592)'
    f_tens,k = ?*(kN)', treksterkte van de schroef (EN 14592)'
    ρ_a = ?*(kg/m^3)', volumieke massa waarbij f_head,k is bepaald'
    f_ax,in = ?*(N/mm^2)', uittreksterkte (EN 14592); alleen nodig buiten 6 ≤ d ≤ 12 mm of 0,6 ≤ d_1/d ≤ 0,75'
    α_s = ?', hoek tussen de schroefas en de vezelrichting, in graden'
    γ_M2 = 1.25', staal van de schroef op trek (NEN-EN 1993-1-8 tabel 2.1)'
    #hide
    f_ax,nk = 0 N/mm^2
    f_head,nk = 0 N/mm^2
    #show
#else
    d_ef = d_v', meewerkende diameter: de diameter van de nagel (bij een vierkante nagel de zijde)'
    #hide
    d_1 = d_v
    f_head,k = 0 N/mm^2
    f_tens,k = 0 kN
    ρ_a = 350 kg/m^3
    f_ax,in = 0 N/mm^2
    α_s = 90
    γ_M2 = 1.25
    #show
    #if middel ≤ 2
        #hide
        l_g = l_v
        f_ax,nk = 0 N/mm^2
        f_head,nk = 0 N/mm^2
        #show
    #else
        l_g = ?*(mm)', lengte van het geprofileerde deel aan de puntzijde'
        f_ax,nk = ?*(N/mm^2)', uittreksterkte f_ax,k (EN 14592)'
        f_head,nk = ?*(N/mm^2)', doortreksterkte van de kop f_head,k (EN 14592)'
    #end if
#end if

@select voorboren "Voorgeboord"
  Nee = 0
  Ja = 1
@end

M_y,in = ?*(N*mm)', vloeimoment uit de productverklaring; 0 = volgens (8.14) of (8.30)'

#if opbouw ≡ 3
    #if plaat ≥ 5
        #hide
        f_head,p = 0 N/mm^2
        #show
    #else
        f_head,p = ?*(N/mm^2)', doortrekparameter van de kop in de plaat (productverklaring; 0 = geen axiale sterkte)'
    #end if
#else
    #hide
    f_head,p = 0 N/mm^2
    #show
#end if

#hide
'Stuiksterkte volgens de boutregels: schroeven met d_ef > 6 mm (§8.7.1(4)) en
'nagels boven 8 mm (§8.3.1.1(6)). Afstanden en n_ef volgens de boutregels alleen
'voor die schroeven.
fh_bout = if(middel ≡ 4; bool(d_ef > 6 mm); bool(d_v > 8 mm))
boutregels = if(middel ≡ 4; bool(d_ef > 6 mm); 0)
#show
#if middel ≡ 4
    #if boutregels ≡ 1
        '<i>d<sub>ef</sub> > 6 mm: de regels voor bouten gelden (§8.7.1(4)), met de stuiksterkte onder een hoek met de vezel.</i>
    #else
        '<i>d<sub>ef</sub> ≤ 6 mm: de regels voor nagels gelden (§8.7.1(5)).</i>
    #end if
#else if fh_bout ≡ 1
    '<i>d > 8 mm: de stuiksterkte volgt de regels voor bouten (§8.3.1.1(6)).</i>
#end if

# 4. Groep, afstanden en belasting

n_1 = ?', aantal verbindingsmiddelen in een rij evenwijdig aan de vezel'
n_2 = ?', aantal rijen'
#if boutregels ≡ 0
    @select versprongen "De verbindingsmiddelen in een rij verspringen ten minste 1d loodrecht op de vezel"
      Nee = 0
      Ja = 1
    @end
#else
    #hide
    versprongen = 0
    #show
#end if

a_1 = ?*(mm)', tussenafstand evenwijdig aan de vezel'
#if n_2 > 1
    a_2 = ?*(mm)', tussenafstand loodrecht op de vezel'
#else
    #hide
    a_2 = 0 mm
    #show
#end if
a_3 = ?*(mm)', eindafstand'
a_4 = ?*(mm)', randafstand'

@select eind "Het eind"
  Belast = 1
  Onbelast = 0
@end

@select rand "De rand"
  Belast = 1
  Onbelast = 0
@end

α = ?', hoek tussen de kracht en de vezelrichting, in graden (0 tot 90)'
#hide
α_n = min(mod(abs(α); 180); 180 - mod(abs(α); 180))
splijt = bool(rand ≡ 1)*bool(α_n > 0)
#show
#if abs(α - α_n) > 0.001
    '<b style="color:#b91c1c">α ligt buiten 0 tot 90°: gerekend is met de scherpe hoek tussen kracht en vezel, 'α_n'°.</b>
#end if
F_v,Ed = ?*(kN)', rekenwaarde van de dwarskracht op de hele verbinding'
F_ax,Ed = ?*(kN)', rekenwaarde van de trekkracht in de richting van de verbindingsmiddelen'
#if splijt ≡ 1
    #if opbouw ≤ 2
        @select el_90 "Splijten: element dat aan de belaste rand loodrecht op de vezel wordt belast"
          Element aan de puntzijde (dubbelsnedig: de zijdelen) = 1
          Het andere element (dubbelsnedig: het middendeel) = 2
        @end
    #else
        #hide
        el_90 = 1
        #show
    #end if
    h_90 = ?*(mm)', splijten: hoogte loodrecht op de vezel van het belaste houten element'
    η_in = ?', deel van de kracht loodrecht op de vezel aan de maatgevende zijde van de verbinding (8.3), 0,5 tot 1; 0 = alles aan één zijde'
#else
    #hide
    el_90 = 1
    h_90 = 0 mm
    η_in = 0
    #show
#end if
#if middel ≤ 2
    #if F_ax,Ed > 0 kN
        @select ax_lang "De axiale belasting is geheel of gedeeltelijk blijvend of langdurig"
          Nee = 0
          Ja = 1
        @end
    #else
        #hide
        ax_lang = 0
        #show
    #end if
#else
    #hide
    ax_lang = 0
    #show
#end if

# 5. Stuiksterkte en vloeimoment

#hide
α_r = α_n*pi/180
α_sr = α_s*pi/180
hout_1 = bool(opbouw ≡ 1) + bool(opbouw ≡ 2) + bool(opbouw ≡ 5)
hout_2 = bool(opbouw ≤ 4)
#show
#if fh_bout ≡ 1
    '<i>Stuiksterkte onder de hoek α met de vezel, naaldhout: (8.31) tot en met (8.33).</i>
    k_90 = 1.35 + 0.015*d_ef/mm', (8.33)'
    #if hout_1 ≡ 1
        f_h,0,1 = 0.082*(1 - 0.01*d_ef/mm)*ρ_1/(kg/m^3)*N/mm^2', (8.32), element 1'
        f_h,1 = f_h,0,1/(k_90*sin(α_r)^2 + cos(α_r)^2)', (8.31)'
    #end if
    #if hout_2 ≡ 1
        f_h,0,2 = 0.082*(1 - 0.01*d_ef/mm)*ρ_2/(kg/m^3)*N/mm^2', (8.32), element 2'
        f_h,2 = f_h,0,2/(k_90*sin(α_r)^2 + cos(α_r)^2)', (8.31)'
    #end if
#else if voorboren ≡ 1
    #if hout_1 ≡ 1
        f_h,1 = 0.082*(1 - 0.01*d_ef/mm)*ρ_1/(kg/m^3)*N/mm^2', voorgeboord (8.16), element 1'
    #end if
    #if hout_2 ≡ 1
        f_h,2 = 0.082*(1 - 0.01*d_ef/mm)*ρ_2/(kg/m^3)*N/mm^2', voorgeboord (8.16), element 2'
    #end if
#else
    #if hout_1 ≡ 1
        f_h,1 = 0.082*ρ_1/(kg/m^3)*(d_ef/mm)^-0.3*N/mm^2', niet voorgeboord (8.15), element 1'
    #end if
    #if hout_2 ≡ 1
        f_h,2 = 0.082*ρ_2/(kg/m^3)*(d_ef/mm)^-0.3*N/mm^2', niet voorgeboord (8.15), element 2'
    #end if
#end if
#if opbouw ≡ 3
    #if plaat ≤ 3
        f_h,1 = 65*(d_ef/mm)^-0.7*(t_1/mm)^0.1*N/mm^2', OSB en spaanplaat (8.22)'
    #else if plaat ≡ 4
        f_h,1 = 0.11*ρ_pl/(kg/m^3)*(d_ef/mm)^-0.3*N/mm^2', multiplex (8.20)'
    #else if plaat ≡ 5
        f_h,1 = 3.9*(d_ef/mm)^-0.6*(t_1/mm)^0.7*N/mm^2', gipskartonplaat (NB.8.1)'
    #else
        f_h,1 = 7*(d_ef/mm)^-0.7*(t_1/mm)^0.9*N/mm^2', gipsvezelplaat, bovengrens (NB.8.2)'
    #end if
#else if opbouw ≡ 4
    #hide
    f_h,1 = f_h,2
    #show
#else if opbouw ≡ 5
    #hide
    f_h,2 = f_h,1
    #show
#end if
#if opbouw ≤ 3
    β = f_h,2/f_h,1', verhouding van de stuiksterkten'
#else
    #hide
    β = 1
    #show
#end if
#if M_y,in > 0 N*mm
    M_y,Rk = M_y,in', uit de productverklaring'
#else if middel ≡ 2
    M_y,Rk = 0.45*f_u/(N/mm^2)*(d_ef/mm)^2.6*N*mm', vierkante of gegroefde nagel (8.14)'
#else if boutregels ≡ 1
    M_y,Rk = 0.3*f_u/(N/mm^2)*(d_ef/mm)^2.6*N*mm', (8.30)'
#else
    M_y,Rk = 0.3*f_u/(N/mm^2)*(d_ef/mm)^2.6*N*mm', (8.14)'
#end if

# 6. Indringdiepte en axiale sterkte

#if opbouw ≡ 2
    t_pen = min(l_v - t_1 - t_2; t_1)', lengte in het derde deel; de zijdelen rekenen met min(t_1; t_pen)'
#else if opbouw ≡ 4
    t_pen = min(l_v - t_s; t_2)', lengte in element 2'
#else if opbouw ≡ 5
    t_pen = min(l_v - t_1 - t_s; t_1)', lengte in het derde deel; de zijdelen rekenen met min(t_1; t_pen)'
#else
    t_pen = min(l_v - t_1; t_2)', lengte in element 2'
#end if
#hide
t_pen = max(t_pen; 0 mm)
t_elem = if(opbouw ≡ 2; t_1; if(opbouw ≡ 5; t_1; t_2))
'Johansen-diktes: zijelement of element aan de kopzijde (t_J1) en middendeel of element aan de puntzijde (t_J2).
t_J1 = if(opbouw ≡ 2; min(t_1; t_pen); if(opbouw ≡ 5; min(t_1; t_pen); if(opbouw ≡ 4; t_pen; t_1)))
t_J2 = if(opbouw ≡ 2; t_2; t_pen)
t_J1g = max(t_J1; 0.1 mm)
t_J2g = max(t_J2; 0.1 mm)
'Axiaal: volumieke massa aan de puntzijde; aan de kopzijde is dat ρ_1.
ρ_punt = if(opbouw ≡ 2; ρ_1; if(opbouw ≡ 5; ρ_1; ρ_2))
kop_staal = bool(opbouw ≡ 4)
kop_plaat = bool(opbouw ≡ 3)
#show

#if middel ≤ 2
    '<h6>Gladde nagel (8.24) tot en met (8.26)</h6>
    f_ax,k = 20*10^-6*(ρ_punt/(kg/m^3))^2*N/mm^2', (8.25), puntzijde'
    f_head,k,n = 70*10^-6*(ρ_1/(kg/m^3))^2*N/mm^2', (8.26), kopzijde'
    #if t_pen ≥ 12*d_v
        k_pen = 1', t_pen ≥ 12d'
    #else if t_pen ≥ 8*d_v
        k_pen = t_pen/(4*d_v) - 2', 8d ≤ t_pen < 12d (§8.3.2(7))'
    #else
        k_pen = 0', t_pen < 8d: geen uittreksterkte (§8.3.2(7))'
    #end if
    F_ax,a = k_pen*f_ax,k*d_v*t_pen to N', (8.24a) uittrekken aan de puntzijde'
    #if kop_staal ≡ 1
        F_ax,Rk = F_ax,a to N', kop op de staalplaat: alleen uittrekken'
    #else if kop_plaat ≡ 1
        F_ax,b = f_head,p*d_h^2 to N', doortrekken van de kop door de plaat'
        F_ax,Rk = min(F_ax,a; F_ax,b) to N
    #else
        F_ax,b = k_pen*f_ax,k*d_v*t_1 + f_head,k,n*d_h^2 to N', (8.24b) kop door element 1'
        F_ax,Rk = min(F_ax,a; F_ax,b) to N
    #end if
    #hide
    F_t,Rk = 10^9 N
    #show
#else if middel ≡ 3
    '<h6>Geprofileerde nagel (8.23)</h6>
    t_pg = min(t_pen; l_g)', geprofileerd deel in het element aan de puntzijde (§8.3.2(2))'
    #if t_pg ≥ 8*d_v
        k_pen = 1', geprofileerd deel ≥ 8d'
    #else if t_pg ≥ 6*d_v
        k_pen = t_pg/(2*d_v) - 3', 6d ≤ geprofileerd deel < 8d (§8.3.2(7))'
    #else
        k_pen = 0', geprofileerd deel < 6d: geen uittreksterkte (§8.3.2(7))'
    #end if
    F_ax,a = k_pen*f_ax,nk*d_v*t_pg to N', (8.23a)'
    #if kop_staal ≡ 1
        F_ax,Rk = F_ax,a to N', kop op de staalplaat: alleen uittrekken'
    #else if kop_plaat ≡ 1
        F_ax,b = f_head,p*d_h^2 to N', doortrekken van de kop door de plaat'
        F_ax,Rk = min(F_ax,a; F_ax,b) to N
    #else
        F_ax,b = f_head,nk*d_h^2 to N', (8.23b)'
        F_ax,Rk = min(F_ax,a; F_ax,b) to N
    #end if
    #hide
    F_t,Rk = 10^9 N
    #show
#else
    '<h6>Schroef (8.38) tot en met (8.40c)</h6>
    ℓ_ef = min(t_pen; l_g)', schroefdraad in het element aan de puntzijde'
    #hide
    normschroef = bool(d_v ≥ 6 mm)*bool(d_v ≤ 12 mm)*bool(d_1/d_v ≥ 0.6)*bool(d_1/d_v ≤ 0.75)
    #show
    #if ℓ_ef < 6*d_v
        F_ax,a = 0 N', schroefdraad korter dan 6d: geen uittreksterkte (§8.7.2(3))'
    #else if normschroef ≡ 1
        f_ax,k = 0.52*(d_v/mm)^-0.5*(ℓ_ef/mm)^-0.1*(ρ_punt/(kg/m^3))^0.8*N/mm^2', (8.39)'
        k_d = min(d_v/(8 mm); 1)', (8.40)'
        F_ax,a = f_ax,k*d_v*ℓ_ef*k_d/(1.2*cos(α_sr)^2 + sin(α_sr)^2) to N', (8.38) uittrekken'
    #else
        F_ax,a = f_ax,in*d_v*ℓ_ef/(1.2*cos(α_sr)^2 + sin(α_sr)^2)*(ρ_punt/ρ_a)^0.8 to N', (8.40a) uittrekken'
    #end if
    #if kop_staal ≡ 1
        F_ax,Rk = F_ax,a to N', kop op de staalplaat: geen doortrekken'
    #else if kop_plaat ≡ 1
        F_ax,b = f_head,p*d_h^2 to N', doortrekken van de kop door de plaat'
        F_ax,Rk = min(F_ax,a; F_ax,b) to N
    #else
        F_ax,b = f_head,k*d_h^2*(ρ_1/ρ_a)^0.8 to N', (8.40b) doortrekken van de kop'
        F_ax,Rk = min(F_ax,a; F_ax,b) to N
    #end if
    F_t,Rk = f_tens,k to N', staal (8.40c)'
#end if

# 7. Sterkte op afschuiving per verbindingsmiddel en per snede

#hide
p_ax = if(opbouw ≡ 3; if(plaat ≥ 5; 0; 1); 1)*if(middel ≡ 1; 0.15; if(middel ≡ 2; 0.25; if(middel ≡ 3; 0.50; 1)))
p_proc = 100*p_ax
n_tot = max(n_1*n_2; 1)
n_ef,ax = if(middel ≡ 4; n_tot^0.9; n_tot)
F_ax,Rd0 = min(n_ef,ax*k_mod*F_ax,Rk/γ_M; n_ef,ax*F_t,Rk/γ_M2) to kN
F_ax,Rk,koord = min(F_ax,Rk; F_t,Rk)
#show
#if F_ax,Ed > 0 kN
    F_ax,koord = F_ax,Rk,koord*max(0; 1 - F_ax,Ed/F_ax,Rd0) to N', uittreksterkte na aftrek van de axiale belasting (NB bij §8.2.2(5))'
#else
    F_ax,koord = F_ax,Rk,koord to N', uittreksterkte voor het koordeffect'
#end if
'<i>Koordeffect F<sub>ax,koord</sub>/4, ten hoogste 'p_proc' % van het Johansen-deel (§8.2.2(2), §8.3.1.5(5)).</i>

#hide
k_1(x) = x + min(F_ax,koord/4; p_ax*x)
ρ_J = t_J2g/t_J1g
'(8.6) enkelsnedig, hout of plaat op hout
J_a = f_h,1*t_J1g*d_ef
J_b = f_h,2*t_J2g*d_ef
J_c = f_h,1*t_J1g*d_ef/(1 + β)*(sqrt(β + 2*β^2*(1 + ρ_J + ρ_J^2) + β^3*ρ_J^2) - β*(1 + ρ_J))
J_d = 1.05*f_h,1*t_J1g*d_ef/(2 + β)*(sqrt(2*β*(1 + β) + 4*β*(2 + β)*M_y,Rk/(f_h,1*d_ef*t_J1g^2)) - β)
J_e = 1.05*f_h,1*t_J2g*d_ef/(1 + 2*β)*(sqrt(2*β^2*(1 + β) + 4*β*(1 + 2*β)*M_y,Rk/(f_h,1*d_ef*t_J2g^2)) - β)
J_f = 1.15*sqrt(2*β/(1 + β))*sqrt(2*M_y,Rk*f_h,1*d_ef)
'(8.7) dubbelsnedig, hout
J_g = f_h,1*t_J1g*d_ef
J_h = 0.5*f_h,2*t_J2g*d_ef
'(8.9) dunne en (8.10) dikke staalplaat, enkelsnedig: hout met dikte t_pen
S_a = 0.4*f_h,2*t_J1g*d_ef
S_b = 1.15*sqrt(2*M_y,Rk*f_h,2*d_ef)
S_c = f_h,2*t_J1g*d_ef
S_d = f_h,2*t_J1g*d_ef*(sqrt(2 + 4*M_y,Rk/(f_h,2*d_ef*t_J1g^2)) - 1)
S_e = 2.3*sqrt(M_y,Rk*f_h,2*d_ef)
'(8.11) staalplaat als middendeel
S_f = f_h,1*t_J1g*d_ef
S_g = f_h,1*t_J1g*d_ef*(sqrt(2 + 4*M_y,Rk/(f_h,1*d_ef*t_J1g^2)) - 1)
S_h = 2.3*sqrt(M_y,Rk*f_h,1*d_ef)
'Met het koordeffect.
J_ck = k_1(J_c)
J_dk = k_1(J_d)
J_ek = k_1(J_e)
J_fk = k_1(J_f)
S_bk = k_1(S_b)
S_dk = k_1(S_d)
S_ek = k_1(S_e)
S_gk = k_1(S_g)
S_hk = k_1(S_h)
F_dun = min(S_a; S_bk)
F_dik = min(S_c; S_dk; S_ek)
'Tussen dun (t_s ≤ 0,5d) en dik (t_s ≥ d) lineair interpoleren (§8.2.3(1)).
w_dik = min(1; max(0; (t_s/d_v - 0.5)/0.5))
#show

#if opbouw ≡ 2
    '<h6>Dubbelsnedig, hout – hout – hout (8.7)</h6>
    '<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;"><tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Mechanisme (N)</th><th style="padding:3px 8px;">(g)</th><th style="padding:3px 8px;">(h)</th><th style="padding:3px 8px;">(j)</th><th style="padding:3px 8px;">(k)</th></tr><tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Johansen-deel</td><td style="padding:3px 8px; text-align:right;">'J_g'</td><td style="padding:3px 8px; text-align:right;">'J_h'</td><td style="padding:3px 8px; text-align:right;">'J_d'</td><td style="padding:3px 8px; text-align:right;">'J_f'</td></tr><tr><td style="padding:3px 8px;">met koordeffect</td><td style="padding:3px 8px; text-align:right;">'J_g'</td><td style="padding:3px 8px; text-align:right;">'J_h'</td><td style="padding:3px 8px; text-align:right;">'J_dk'</td><td style="padding:3px 8px; text-align:right;">'J_fk'</td></tr></table>
    #hide
    F_v,Rk = min(J_g; J_h; J_dk; J_fk) to N
    #show
    F_v,Rk', per snede: het kleinste mechanisme uit de tabel'
#else if opbouw ≡ 4
    '<h6>Enkelsnedig, staalplaat – hout (8.9) en (8.10)</h6>
    '<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;"><tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Mechanisme (N)</th><th style="padding:3px 8px;">dun (a)</th><th style="padding:3px 8px;">dun (b)</th><th style="padding:3px 8px;">dik (c)</th><th style="padding:3px 8px;">dik (d)</th><th style="padding:3px 8px;">dik (e)</th></tr><tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Johansen-deel</td><td style="padding:3px 8px; text-align:right;">'S_a'</td><td style="padding:3px 8px; text-align:right;">'S_b'</td><td style="padding:3px 8px; text-align:right;">'S_c'</td><td style="padding:3px 8px; text-align:right;">'S_d'</td><td style="padding:3px 8px; text-align:right;">'S_e'</td></tr><tr><td style="padding:3px 8px;">met koordeffect</td><td style="padding:3px 8px; text-align:right;">'S_a'</td><td style="padding:3px 8px; text-align:right;">'S_bk'</td><td style="padding:3px 8px; text-align:right;">'S_c'</td><td style="padding:3px 8px; text-align:right;">'S_dk'</td><td style="padding:3px 8px; text-align:right;">'S_ek'</td></tr></table>
    F_dun', dunne plaat, t_s ≤ 0,5d: het kleinste van (a) en (b)'
    F_dik', dikke plaat, t_s ≥ d: het kleinste van (c), (d) en (e)'
    w_dik', aandeel van de dikke plaat bij deze plaatdikte'
    F_v,Rk = F_dun + w_dik*(F_dik - F_dun) to N', per snede'
#else if opbouw ≡ 5
    '<h6>Dubbelsnedig, hout – staalplaat – hout (8.11)</h6>
    '<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;"><tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Mechanisme (N)</th><th style="padding:3px 8px;">(f)</th><th style="padding:3px 8px;">(g)</th><th style="padding:3px 8px;">(h)</th></tr><tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Johansen-deel</td><td style="padding:3px 8px; text-align:right;">'S_f'</td><td style="padding:3px 8px; text-align:right;">'S_g'</td><td style="padding:3px 8px; text-align:right;">'S_h'</td></tr><tr><td style="padding:3px 8px;">met koordeffect</td><td style="padding:3px 8px; text-align:right;">'S_f'</td><td style="padding:3px 8px; text-align:right;">'S_gk'</td><td style="padding:3px 8px; text-align:right;">'S_hk'</td></tr></table>
    #hide
    F_v,Rk = min(S_f; S_gk; S_hk) to N
    #show
    F_v,Rk', per snede: het kleinste mechanisme uit de tabel'
#else
    #if opbouw ≡ 3
        '<h6>Enkelsnedig, plaat – hout (8.6)</h6>
    #else
        '<h6>Enkelsnedig, hout – hout (8.6)</h6>
    #end if
    '<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;"><tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Mechanisme (N)</th><th style="padding:3px 8px;">(a)</th><th style="padding:3px 8px;">(b)</th><th style="padding:3px 8px;">(c)</th><th style="padding:3px 8px;">(d)</th><th style="padding:3px 8px;">(e)</th><th style="padding:3px 8px;">(f)</th></tr><tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Johansen-deel</td><td style="padding:3px 8px; text-align:right;">'J_a'</td><td style="padding:3px 8px; text-align:right;">'J_b'</td><td style="padding:3px 8px; text-align:right;">'J_c'</td><td style="padding:3px 8px; text-align:right;">'J_d'</td><td style="padding:3px 8px; text-align:right;">'J_e'</td><td style="padding:3px 8px; text-align:right;">'J_f'</td></tr><tr><td style="padding:3px 8px;">met koordeffect</td><td style="padding:3px 8px; text-align:right;">'J_a'</td><td style="padding:3px 8px; text-align:right;">'J_b'</td><td style="padding:3px 8px; text-align:right;">'J_ck'</td><td style="padding:3px 8px; text-align:right;">'J_dk'</td><td style="padding:3px 8px; text-align:right;">'J_ek'</td><td style="padding:3px 8px; text-align:right;">'J_fk'</td></tr></table>
    #hide
    F_v,Rk = min(J_a; J_b; J_ck; J_dk; J_ek; J_fk) to N
    #show
    F_v,Rk', per snede: het kleinste mechanisme uit de tabel'
#end if
F_v,Rd = k_mod*F_v,Rk/γ_M to N', per verbindingsmiddel en per snede'

# 8. Groep en toetsing

#hide
n_s = if(opbouw ≡ 2; 2; if(opbouw ≡ 5; 2; 1))
'Tabel 8.1: k_ef bij a_1/d = 14, 10, 7 en 4 (die laatste alleen voorgeboord), lineair ertussen.
a1d = a_1/d_v
k_ef0 = if(a1d ≥ 14; 1; if(a1d ≥ 10; 0.85 + 0.15*(a1d - 10)/4; if(a1d ≥ 7; 0.7 + 0.15*(a1d - 7)/3; if(voorboren ≡ 1; max(0.5; 0.5 + 0.2*(a1d - 4)/3); 0.7))))
k_ef = if(versprongen ≡ 1; 1; k_ef0)
#show
n_s', aantal sneden per verbindingsmiddel'
#if boutregels ≡ 0
    #if versprongen ≡ 1
        k_ef', de rij verspringt: geen vermindering (§8.3.1.1(8))'
    #else
        a_1,d = a_1/d_v', tussenafstand in de rij, uitgedrukt in d'
        k_ef', tabel 8.1, lineair geïnterpoleerd'
    #end if
    n_ef = n_1^k_ef', meewerkend aantal per rij (8.17)'
    F_v,Rd,0 = n_2*n_ef*n_s*F_v,Rd to kN', evenwijdig aan de rijen'
    F_v,Rd,t = n_2*n_1*n_s*F_v,Rd to kN', alle verbindingsmiddelen'
    UC_v,0 = F_v,Ed*cos(α_r)/F_v,Rd,0', component evenwijdig aan de rijen (§8.1.2(5))'
    UC_v,t = F_v,Ed/F_v,Rd,t', de hele kracht'
    UC_v = max(UC_v,0; UC_v,t)', afschuiving'
#else
    n_ef,0 = min(n_1; n_1^0.9*(a_1/(13*d_v))^0.25)', meewerkend aantal per rij evenwijdig aan de vezel (8.34)'
    n_ef = n_ef,0 + (n_1 - n_ef,0)*α_n/90', lineair naar n loodrecht op de vezel (8.35)'
    F_v,Rd,t = n_2*n_ef*n_s*F_v,Rd to kN', groep'
    UC_v = F_v,Ed/F_v,Rd,t', afschuiving'
#end if

#if F_ax,Ed > 0 kN
    n_ef,ax', meewerkend aantal op trek; bij schroeven n^0,9 (8.41)'
    F_ax,Rd = n_ef,ax*k_mod*F_ax,Rk/γ_M to kN', hout'
    #if middel ≡ 4
        F_t,Rd = n_ef,ax*F_t,Rk/γ_M2 to kN', staal van de schroef'
        UC_ax = F_ax,Ed/min(F_ax,Rd; F_t,Rd)', trek'
    #else
        UC_ax = F_ax,Ed/F_ax,Rd', trek'
    #end if
    #if middel ≤ 2
        UC_c = UC_ax + UC_v', gladde nagel (8.27)'
    #else
        UC_c = UC_ax^2 + UC_v^2', (8.28)'
    #end if
#else
    #hide
    UC_ax = 0
    UC_c = UC_v
    #show
#end if

#if splijt ≡ 1
    '<h6>Splijten door de kracht loodrecht op de vezel (§8.1.4)</h6>
    #hide
    b_90 = if(el_90 ≡ 1; if(opbouw ≡ 2; 2*t_1; if(opbouw ≡ 5; 2*t_1; t_2)); if(opbouw ≡ 2; t_2; t_1))
    #show
    b_90', dikte van het element; bij de zijdelen beide samen'
    h_e = a_4 + (n_2 - 1)*a_2', van de belaste rand tot het verste verbindingsmiddel'
    #if h_90 > h_e
        #hide
        ok_90 = 1
        η_90 = if(η_in > 0; min(max(η_in; 0.5); 1); 1)
        #show
        F_90,Rd = k_mod,h*14*b_90/mm*sqrt(h_e/mm/(1 - h_e/h_90))*N/γ_M to kN', (8.4) naaldhout, w = 1'
        F_90,Ed = η_90*F_v,Ed*sin(α_r)', (8.3), met het deel η_90 aan de maatgevende zijde'
        UC_90 = F_90,Ed/F_90,Rd', splijten (8.2)'
    #else
        #hide
        ok_90 = 0
        UC_90 = 0
        #show
        '<b style="color:#b91c1c">Vul de hoogte h van het element in; die moet groter zijn dan h<sub>e</sub>.</b>
    #end if
#else
    #hide
    ok_90 = 1
    UC_90 = 0
    #show
#end if

# 9. Afstanden en detaillering

#hide
cosα = abs(cos(α_r))
sinα = abs(sin(α_r))
d_a = d_v
dklein = bool(d_v < 5 mm)
ρ_max = if(opbouw ≤ 2; max(ρ_1; ρ_2); if(opbouw ≡ 5; ρ_1; ρ_2))
'Tabel 8.2: zonder voorboren ρ_k ≤ 420 (groep 1) of ≤ 500 (groep 2), of voorgeboord (groep 3).
groep = if(voorboren ≡ 1; 3; if(ρ_max ≤ 420 kg/m^3; 1; 2))
n_a1 = if(groep ≡ 1; if(dklein ≡ 1; 5 + 5*cosα; 5 + 7*cosα); if(groep ≡ 2; 7 + 8*cosα; 4 + cosα))*d_a
n_a2 = if(groep ≡ 1; 5; if(groep ≡ 2; 7; 3 + sinα))*d_a
n_a3 = if(eind ≡ 1; if(groep ≡ 1; 10 + 5*cosα; if(groep ≡ 2; 15 + 5*cosα; 7 + 5*cosα)); if(groep ≡ 1; 10; if(groep ≡ 2; 15; 7)))*d_a
n_a4 = if(rand ≡ 1; if(groep ≡ 1; if(dklein ≡ 1; 5 + 2*sinα; 5 + 5*sinα); if(groep ≡ 2; if(dklein ≡ 1; 7 + 2*sinα; 7 + 5*sinα); if(dklein ≡ 1; 3 + 2*sinα; 3 + 4*sinα))); if(groep ≡ 1; 5; if(groep ≡ 2; 7; 3)))*d_a
'Plaat op hout ×0,85 (§8.3.1.3(1)), staal op hout ×0,7 (§8.3.1.4(1)), alleen op de tussenafstanden.
f_tus = if(opbouw ≡ 3; 0.85; if(opbouw ≥ 4; 0.7; 1))
'Tabel 8.4, boutregels. Onbelast eind: 4d, en (1 + 6 sin α)d zodra de kracht meer dan 30° afwijkt.
b_a1 = (4 + cosα)*d_a
b_a2 = 4*d_a
b_a3 = if(eind ≡ 1; max(7*d_a; 80 mm); max(4*d_a; (1 + 6*sinα)*d_a))
b_a4 = if(rand ≡ 1; max((2 + 2*sinα)*d_a; 3*d_a); 3*d_a)
'Tabel 8.6, axiaal belaste schroeven: a_1 7d, a_2 5d, eind 10d, rand 4d.
x_ax = bool(middel ≡ 4)*bool(F_ax,Ed > 0 kN)
'Gipsplaat: a_1 tussen 20d en 60d of 150 mm, rand 7d onbelast en 10d belast (§8.3.1.5(6) tot (8)).
gips = bool(opbouw ≡ 3)*bool(plaat ≥ 5)
a1_min = max(if(boutregels ≡ 0; f_tus*n_a1; b_a1); x_ax*7*d_v; gips*20*d_v)
a2_min = max(if(boutregels ≡ 0; f_tus*n_a2; b_a2); x_ax*5*d_v)
a3_min = max(if(boutregels ≡ 0; n_a3; b_a3); x_ax*10*d_v)
a4_min = max(if(boutregels ≡ 0; n_a4; b_a4); x_ax*4*d_v; gips*if(rand ≡ 1; 10; 7)*d_v)
a1_max = if(gips ≡ 1; min(60*d_v; 150 mm); 10^6 mm)
UC_a1 = max(a1_min/max(a_1; 0.1 mm); a_1/a1_max)
UC_a2 = if(n_2 > 1; a2_min/max(a_2; 0.1 mm); 0)
UC_a3 = a3_min/max(a_3; 0.1 mm)
UC_a4 = a4_min/max(a_4; 0.1 mm)
pen_min = if(middel ≤ 2; 8; 6)*d_v
UC_pen = pen_min/max(t_pen; 0.1 mm)
'Voorboren: houtdikte (8.18) volgens de nagelregels, en §8.3.1.1(2) voor nagels of §10.4.5 voor schroeven.
t_min = max(7*d_v; (13*(d_v/(1 mm)) - 30)*(ρ_max/(400 kg/m^3))*mm)
t_hout = if(opbouw ≤ 2; min(t_1; t_2); if(opbouw ≡ 5; t_1; t_2))
ok_t18 = if(voorboren ≡ 1; 1; if(boutregels ≡ 1; 1; bool(t_hout ≥ t_min)))
ok_vb = if(voorboren ≡ 1; 1; if(middel ≡ 4; bool(d_v ≤ 6 mm); bool(ρ_max ≤ 500 kg/m^3)*bool(d_v ≤ 6 mm)))
ok_aantal = if(middel ≤ 3; bool(n_1*n_2 ≥ 2); 1)
ok_kop = if(opbouw ≡ 3; if(plaat ≤ 4; bool(d_h ≥ 2*d_v); 1); 1)
ok_fu = if(middel ≤ 3; if(M_y,in > 0 N*mm; 1; bool(f_u ≥ 600 N/mm^2)); 1)
ok_hoek = if(x_ax ≡ 1; bool(min(mod(abs(α_s); 180); 180 - mod(abs(α_s); 180)) ≥ 30); 1)
ok_t12 = if(x_ax ≡ 1; bool(t_elem ≥ 12*d_v); 1)
ok_draad = if(x_ax ≡ 1; bool(min(t_pen; l_g) ≥ 6*d_v); 1)
ok_glad = bool(ax_lang ≡ 0)
ok_mat = bool(k_mod > 0)
ok_det = bool(UC_a1 ≤ 1)*bool(UC_a2 ≤ 1)*bool(UC_a3 ≤ 1)*bool(UC_a4 ≤ 1)*bool(UC_pen ≤ 1)*ok_t18*ok_vb*ok_aantal*ok_kop*ok_fu*ok_hoek*ok_t12*ok_draad*ok_glad*ok_mat
#show

#if boutregels ≡ 1
    '<i>Minimale afstanden uit tabel 8.4 (boutregels, §8.7.1(4)), met de buitendiameter d (§8.7.1(1)).</i>
#else if opbouw ≡ 3
    '<i>Minimale afstanden uit tabel 8.2; de tussenafstanden ×0,85 bij plaat op hout (§8.3.1.3(1)).</i>
#else if opbouw ≥ 4
    '<i>Minimale afstanden uit tabel 8.2; de tussenafstanden ×0,7 bij staal op hout (§8.3.1.4(1)).</i>
#else
    '<i>Minimale afstanden uit tabel 8.2.</i>
#end if
#if x_ax ≡ 1
    '<i>De schroeven zijn ook axiaal belast: ten minste de afstanden van tabel 8.6.</i>
#end if
#if gips ≡ 1
    '<i>Gipsplaat: a<sub>1</sub> tussen 20d en 60d of 150 mm, de randafstand ten minste 7d onbelast en 10d belast (§8.3.1.5).</i>
#end if

'<table style="border-collapse:collapse; font-size:0.95em; margin:4px 0;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:3px 8px;">Eis (mm)</th><th style="text-align:right; padding:3px 8px;">Aanwezig</th><th style="text-align:right; padding:3px 8px;">Minimaal</th><th style="text-align:left; padding:3px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">a<sub>1</sub>, evenwijdig aan de vezel</td><td style="padding:3px 8px; text-align:right;">'a_1'</td><td style="padding:3px 8px; text-align:right;">'a1_min'</td><td style="padding:3px 8px; color:'kleur(UC_a1)'">'oordeel(UC_a1)'</td></tr>
#if n_2 > 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">a<sub>2</sub>, loodrecht op de vezel</td><td style="padding:3px 8px; text-align:right;">'a_2'</td><td style="padding:3px 8px; text-align:right;">'a2_min'</td><td style="padding:3px 8px; color:'kleur(UC_a2)'">'oordeel(UC_a2)'</td></tr>
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">a<sub>3</sub>, eindafstand</td><td style="padding:3px 8px; text-align:right;">'a_3'</td><td style="padding:3px 8px; text-align:right;">'a3_min'</td><td style="padding:3px 8px; color:'kleur(UC_a3)'">'oordeel(UC_a3)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">a<sub>4</sub>, randafstand</td><td style="padding:3px 8px; text-align:right;">'a_4'</td><td style="padding:3px 8px; text-align:right;">'a4_min'</td><td style="padding:3px 8px; color:'kleur(UC_a4)'">'oordeel(UC_a4)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Indringdiepte aan de puntzijde</td><td style="padding:3px 8px; text-align:right;">'t_pen'</td><td style="padding:3px 8px; text-align:right;">'pen_min'</td><td style="padding:3px 8px; color:'kleur(UC_pen)'">'oordeel(UC_pen)'</td></tr>
#if voorboren ≡ 0
    #if boutregels ≡ 0
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Houtdikte zonder voorboren (8.18)</td><td style="padding:3px 8px; text-align:right;">'t_hout'</td><td style="padding:3px 8px; text-align:right;">'t_min'</td><td style="padding:3px 8px; color:'kleur_ok(ok_t18)'">'if(ok_t18 ≡ 1; "voldoet"; "voorboren")'</td></tr>
    #end if
#end if
#if x_ax ≡ 1
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Houtdikte voor tabel 8.6, 12d (§8.7.2(2))</td><td style="padding:3px 8px; text-align:right;">'t_elem'</td><td style="padding:3px 8px; text-align:right;">'12*d_v'</td><td style="padding:3px 8px; color:'kleur_ok(ok_t12)'">'if(ok_t12 ≡ 1; "voldoet"; "voldoet niet")'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:3px 8px;">Schroefdraad aan de puntzijde, 6d (§8.7.2(3))</td><td style="padding:3px 8px; text-align:right;">'ℓ_ef'</td><td style="padding:3px 8px; text-align:right;">'6*d_v'</td><td style="padding:3px 8px; color:'kleur_ok(ok_draad)'">'if(ok_draad ≡ 1; "voldoet"; "voldoet niet")'</td></tr>
#end if
'</table>

#if ok_vb ≡ 0
    #if middel ≡ 4
        '<b style="color:#b91c1c">Voorboren is nodig: de schroef is dikker dan 6 mm (§10.4.5(1)), tenzij de productverklaring anders toestaat.</b>
    #else
        '<b style="color:#b91c1c">Voorboren is nodig: de nagel is dikker dan 6 mm of het hout zwaarder dan 500 kg/m³ (§8.3.1.1(2)).</b>
    #end if
#end if
#if ok_aantal ≡ 0
    '<b style="color:#b91c1c">Een verbinding met nagels bevat ten minste twee nagels (§8.3.1.1(9)).</b>
#end if
#if ok_kop ≡ 0
    '<b style="color:#b91c1c">De stuiksterkte in de plaat geldt voor een kopdiameter van ten minste 2d (§8.3.1.3(3)).</b>
#end if
#if ok_fu ≡ 0
    '<b style="color:#b91c1c">Formule (8.14) geldt voor draad met een treksterkte van ten minste 600 N/mm² (§8.3.1.1(4)); neem anders het vloeimoment uit de productverklaring.</b>
#end if
#if ok_hoek ≡ 0
    '<b style="color:#b91c1c">De hoek tussen de schroefas en de vezel is kleiner dan 30° (§8.7.2(4)).</b>
#end if
#if ok_glad ≡ 0
    '<b style="color:#b91c1c">Gladde nagels mogen geen blijvende of langdurige axiale belasting opnemen; kies een geprofileerde nagel (§8.3.2(1)).</b>
#end if

# 10. Samenvatting

UC_max = max(UC_v; UC_ax; UC_c; UC_90)
'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Toets</th><th style="text-align:left; padding:4px 8px;">Norm</th><th style="text-align:right; padding:4px 8px;">UC</th><th style="text-align:left; padding:4px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Afschuiving</td><td style="padding:4px 8px;">§8.1.2, §8.2</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_v)'">'UC_v'</td><td style="padding:4px 8px; color:'kleur(UC_v)'">'oordeel(UC_v)'</td></tr>
#if F_ax,Ed > 0 kN
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Trek</td><td style="padding:4px 8px;">§8.3.2 / §8.7.2</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_ax)'">'UC_ax'</td><td style="padding:4px 8px; color:'kleur(UC_ax)'">'oordeel(UC_ax)'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Afschuiving met trek</td><td style="padding:4px 8px;">(8.27) / (8.28)</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_c)'">'UC_c'</td><td style="padding:4px 8px; color:'kleur(UC_c)'">'oordeel(UC_c)'</td></tr>
#end if
#if splijt ≡ 1
    #if ok_90 ≡ 1
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Splijten</td><td style="padding:4px 8px;">§8.1.4</td><td style="padding:4px 8px; text-align:right; color:'kleur(UC_90)'">'UC_90'</td><td style="padding:4px 8px; color:'kleur(UC_90)'">'oordeel(UC_90)'</td></tr>
    #else
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Splijten</td><td style="padding:4px 8px;">§8.1.4</td><td style="padding:4px 8px; text-align:right;">—</td><td style="padding:4px 8px; color:#b91c1c;">hoogte h ontbreekt</td></tr>
    #end if
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Afstanden en detaillering</td><td style="padding:4px 8px;">tabel 8.2 / 8.4 / 8.6</td><td style="padding:4px 8px; text-align:right;">—</td><td style="padding:4px 8px; color:'kleur_ok(ok_det)'">'if(ok_det ≡ 1; "voldoet"; "voldoet niet")'</td></tr>
'</table>

#if ok_mat ≡ 0
    '<b style="color:#b91c1c">De verbinding voldoet niet: dit plaatmateriaal mag in klimaatklasse 'klimaat' niet worden toegepast.</b>
#else if ok_90 ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>de verbinding voldoet niet: splijten is niet getoetst, vul de hoogte h in</b></span>
#else if UC_max ≤ 1.0
    #if ok_det ≡ 1
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de verbinding voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> → <b>de verbinding voldoet niet: de detaillering klopt niet</b></span>
    #end if
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de verbinding voldoet niet</b></span>
#end if

#hide
nt_90 = if(bool(rand ≡ 0)*bool(α_n > 0) ≡ 1; "splijten naar de rand tegenover a<sub>4</sub> (§8.1.4), "; "")
#show
'<i>Niet getoetst: 'nt_90'verbindingsmiddelen in kops hout, blokschuif en de staalplaat zelf (bijlage A, §8.2.3(2)), de gatspeling onder 0,1d die een dikke staalplaat vraagt (§8.2.3(1)) en de factor 2/3 voor hout dat onder belasting droogt (§8.3.2(8)).</i>
`;
