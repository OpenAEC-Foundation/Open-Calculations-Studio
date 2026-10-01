/**
 * Houten kap — sporen, spanten en hoekkepers volgens NEN-EN 1995-1-1+C1+A1:2011/NB:2013.
 *
 * Eén blad met een keuze voor het systeem:
 *   1. sporen van een zadeldak op muurplaat en nokgording;
 *   2. dezelfde sporen met een knieschot, een verticaal steunpunt tussen voet
 *      en nok (doorgaande ligger op drie steunpunten);
 *   3. een A-spant: twee sporen die elkaar in de nok scharnierend raken, met een
 *      trekband op voethoogte of een hanenbalk hoger in de kap; vast scharnier
 *      onder de linker spoor, horizontale rol onder de rechter;
 *   4. sporen van een lessenaardak;
 *   5. een hoekkeper van een schild- of piramidedak: gelijke hellingen, 45° in
 *      het grondvlak, met de driehoekig verlopende last van de aansluitende
 *      sporen (per m hoekkeper in het grondvlak p·t/2 op afstand t van de hoek).
 * Bij 1, 2, 4 en 5 is de voet een vast scharnier (vogelbek op de muurplaat) en
 * bovenin een horizontale rol (verticale reactie) of een schuine rol (reactie
 * loodrecht op de spoor; de muurplaat krijgt dan de spatkracht).
 *
 * Belastingen: eigen gewicht dakopbouw per m² dakvlak plus de spoor zelf
 * (ρ_mean·g·A); dakbelasting categorie H volgens tabel NB.4 – 6.10 (q_k naar de
 * helling, per m² dakvlak; Q_k = 2 kN direct onder het dakbeschot); sneeuw met
 * μ_1 uit tabel 5.2 (A-spant ook de gevallen (ii) en (iii) van figuur 5.3);
 * wind met q_p uit de projectgegevens en z_e = h, c_pe per zone uit tabel
 * NB.10 – 7.4a en NB.11 – 7.4b (zadeldak, ook voor de hoekkeper) of NB.8 –
 * 7.3a en NB.9 – 7.3b (lessenaardak), logaritmisch in de belaste oppervlakte
 * (7.2.1) en met c_pi = −0,3 bij druk en +0,2 bij zuiging (7.2.9(6)). Een spoor
 * krijgt per windgeval twee zones: de strook e/10 langs goot of nok (θ = 90°:
 * e/4 langs de goot in het randgebied) en de rest.
 *
 * Combinaties 6.10a (alleen G, blijvend) en 6.10b per gevolgklasse (tabel NB.4
 * en NB.5 – A1.2(B)), met ψ_0 = 0 voor dak, sneeuw en wind (tabel NB.2 – A1.1):
 * één veranderlijke per combinatie. Duurklasse: q_k middellang, Q_k, sneeuw en
 * wind kort. Opwaartse wind met 0,9·G; bij het A-spant ook druk aan één kant
 * met 0,9·G, want het onderscheid gunstig/ongunstig geldt voor het hele G.
 *
 * Krachtswerking: de spoor als staaf in zijn eigen vlak, de lasten ontbonden
 * loodrecht op en langs de spoor, in gesloten vorm (gedeeltelijk gelijkmatige,
 * driehoekige en puntlasten). Knieschot: steunmoment uit de drie-momenten-
 * vergelijking. A-spant: statisch bepaald (scharnier in de nok, trekband of
 * hanenbalk als pendelstaaf). M, V en N worden langs de spoor bemonsterd (16
 * vakken plus beide kanten van een puntlast en van het knieschot of de
 * hanenbalk); de toetsen per doorsnede:
 *   • trek + buiging (6.17), druk + buiging (6.19), knik (6.23)/(6.24) met
 *     k_c,y over de veldlengte en k_c,z over de steunafstand van de bovenrand;
 *   • kip (6.33)/(6.35): bovenrand met l_ef = 0,9·l_st + 2h (last op de
 *     gedrukte rand), onderrand met 0,9·l − 0,5h (tabel 6.1);
 *   • knik en kip zijn staaftoetsen: per combinatie en per staaf ook de
 *     grootste drukkracht samen met het grootste |M| (kip: de grootste
 *     σ_m/(k_crit·f_m,d)), naast de toets per doorsnede;
 *   • afschuiving (6.13) met k_cr = 1,0 (NB bij 6.1.7(2)), de keep aan de voet
 *     met (6.60)/(6.62);
 *   • oplegging §6.1.5 met 6.2.2 (6.16): de reactie op een horizontaal
 *     zadelvlak staat onder 90° − β op de vezel; k_c,90 = 1,0. Aan de voet is
 *     het zadelvlak van een keep t_keep (loodrecht op de staaf) t_keep/sin β
 *     lang, ten hoogste de breedte van de muurplaat.
 * Q_k staat op de ongunstigste plaats: gezocht langs de staaf (per deel negen
 * plaatsen, dan zes keer halverend verfijnd) naar het grootste veldmoment en,
 * bij knieschot of hanenbalk, het grootste moment daar; de combinatie met Q_k
 * rekent met die plaatsen en met Q_k direct onder en boven de knoop. Voor de doorbuiging is apart gezocht naar de
 * grootste w_bij. Voor V en de reacties komt γ_Q·Q_k/2 erbij, zoals met de last
 * op het steunpunt; de tabel met reacties toont Q_k op de plaats van het
 * grootste veldmoment.
 *
 * Doorbuiging loodrecht op het dakvlak volgens A1.4.3(3) van de NB bij NEN-EN
 * 1990: w_2 + w_3 = k_def·u_G + u_Q ≤ ℓ/250 bij de karakteristieke combinatie,
 * elke veranderlijke apart (ψ_2 = 0); desgewenst ook w_max = (1 + k_def)·u_G +
 * u_Q ≤ ℓ/250 (A1.4.3(4)). ℓ is de veldlengte langs de spoor; de zakking is
 * gemeten ten opzichte van de lijn door de steunpunten van het veld, op 0,3 tot
 * 0,7 van de veldlengte.
 *
 * Niet in dit blad: de verbinding met de muurplaat en de trekband zelf, een
 * overstek voorbij de muurplaat, belasting op de hanenbalk of trekband (zolder,
 * plafond) en de zones langs de hoekkeper van tabel NB.12 – 7.5.
 *
 * Op papier is het blad beknopt (PrintDocument.css): uitleg draagt de klasse
 * alleen-scherm, korte regels een merkteken kolom-2, kolom-3 of kolom-4.
 *
 * Geen referentieberekening beschikbaar; scripts/check-houten-kap.mjs rekent
 * per systeem een voorbeeld met de hand na en vergelijkt varianten met een
 * onafhankelijke uitwerking. Variabelenamen komen overeen met
 * HoutenKapDesigner.tsx.
 */

export const houtenKap = `"Houten kap — sporen, spanten en hoekkepers volgens EN 1995-1-1

'<i>Eén blad voor de houten kap: sporen van een zadeldak op muurplaat en nokgording, met een horizontale of schuine rol bovenin en eventueel een knieschot; een A-spant met trekband of hanenbalk; de sporen van een lessenaardak; en een hoekkeper met de driehoekig verlopende last van de aansluitende sporen. Belastingen volgens NEN-EN 1991 met de NB, combinaties 6.10a en 6.10b met de factoren van de gevolgklasse van het project, toetsing volgens NEN-EN 1995-1-1 met de NB.</i><span class="alleen-scherm"></span>

@select systeem "Systeem"
  Sporen op muurplaat en nokgording (zadeldak) = 1
  Sporen met een knieschot (zadeldak) = 2
  A-spant met trekband of hanenbalk (zadeldak) = 3
  Sporen van een lessenaardak = 4
  Hoekkeper van een schild- of piramidedak = 5
@end
#if systeem ≠ 3
    @select rol "Oplegging bovenin"
      Horizontale rol: verticale reactie = 1
      Schuine rol: reactie loodrecht op de spoor = 2
    @end
#else
    #hide
    rol = 1
    #show
#end if
#if systeem ≡ 1
    '<i>De spoor ligt met een vogelbek op de muurplaat (vast scharnier) en bovenin op de nokgording. Met een horizontale rol is de reactie in de nok verticaal: onder verticale last geen spatkracht, de spoor is onderin gedrukt en bovenin getrokken. Met een schuine rol staat de reactie loodrecht op de spoor: de muurplaat neemt de hele langskracht op en krijgt een spatkracht naar buiten.</i><span class="alleen-scherm"></span>
#else if systeem ≡ 2
    '<i>Als bij sporen op muurplaat en nokgording, met een knieschot als verticaal steunpunt tussen voet en nok: een doorgaande ligger op drie steunpunten. Het steunmoment boven het knieschot volgt uit de drie-momentenvergelijking; het knieschot draagt verticaal af.</i><span class="alleen-scherm"></span>
#else if systeem ≡ 3
    '<i>Twee sporen die elkaar in de nok scharnierend raken, zonder nokgording. De linker voet is een vast scharnier, de rechter een horizontale rol: de spatkracht gaat naar de trekband op voethoogte of naar de hanenbalk hoger in de kap. Bij een hanenbalk buigt de spoor eronder extra door de trekkracht die daar aangrijpt.</i><span class="alleen-scherm"></span>
#else if systeem ≡ 4
    '<i>De spoor van een lessenaardak ligt onderin met een vogelbek op de muurplaat (vast scharnier) en bovenin op de hoge muurplaat of een ligger. Wind volgens de tabellen voor lessenaardaken.</i><span class="alleen-scherm"></span>
#else
    '<i>De hoekkeper ligt in het grondvlak onder 45° tussen twee dakvlakken met dezelfde helling. De sporen die erop aansluiten brengen van beide kanten de helft van hun last af: een driehoekig verlopende last, nul bij de hoek en het grootst bij de nok. Onderin een vast scharnier op de hoek van de muurplaten, bovenin een horizontale rol (nokbalk of stijl) of een schuine rol (tegen de andere kepers).</i><span class="alleen-scherm"></span>
#end if

# 1. Geometrie, doorsnede en materiaal

#if systeem ≡ 5
    α_dak = ?*(deg)', helling van de dakvlakken<span class="kolom-3"></span>'
    l_h = ?*(m)', horizontaal, gevel tot nok<span class="kolom-3"></span>'
    #hide
    a_hoh = 1 m
    #show
#else
    α_dak = ?*(deg)', dakhelling<span class="kolom-3"></span>'
    l_h = ?*(m)', horizontaal, voet tot top<span class="kolom-3"></span>'
    a_hoh = ?*(m)', h.o.h.<span class="kolom-3"></span>'
#end if
#if systeem ≡ 2
    l_ks = ?*(m)', knieschot, horizontaal vanaf de voet<span class="kolom-3"></span>'
#else
    #hide
    l_ks = 0 m
    #show
#end if
#if systeem ≡ 3
    z_hb = ?*(m)', trekband of hanenbalk boven de voet<span class="alleen-scherm">, 0 = trekband op voethoogte</span><span class="kolom-3"></span>'
#else
    #hide
    z_hb = 0 m
    #show
#end if
b_sp = ?*(mm)', breedte<span class="kolom-4"></span>'
h_sp = ?*(mm)', hoogte<span class="kolom-4"></span>'
@select sterkteklasse "Sterkteklasse"
  C18 = 1
  C24 = 2
  C30 = 3
  GL24h = 4
  GL28h = 5
@end
@select klimaatklasse "Klimaatklasse"
  Klimaatklasse 1 = 1
  Klimaatklasse 2 = 2
  Klimaatklasse 3 = 3
@end
a_opl = ?*(mm)', breedte muurplaat<span class="alleen-scherm"> en knieschot, oplegging aan de voet</span><span class="kolom-4"></span>'
#if systeem ≠ 3
    a_nok = ?*(mm)', breedte bovenin<span class="alleen-scherm">, oplegging op nokgording of nokbalk</span><span class="kolom-4"></span>'
#else
    #hide
    a_nok = 1 mm
    #show
#end if
t_keep = ?*(mm)', keep aan de voet<span class="alleen-scherm">, loodrecht op de spoor, 0 = geen keep</span><span class="kolom-4"></span>'
l_st = ?*(m)', steunafstand bovenrand<span class="alleen-scherm">: panlatten, tengels of beschot</span><span class="kolom-4"></span>'
l_so = ?*(m)', steunafstand onderrand<span class="alleen-scherm">, 0 = alleen bij de opleggingen</span><span class="kolom-4"></span>'

# 2. Belastingen

g_opb = ?*(kN/m^2)', dakopbouw per m² dakvlak<span class="alleen-scherm">: pannen, panlatten, beschot, isolatie, afwerking; bij een hoekkeper met de aansluitende sporen</span><span class="kolom-2"></span>'
@select puntlast "Puntlast"
  Onderhoudslast Q_k op de ongunstigste plaats = 1
  Puntlast op een vaste plaats (mangat, raveel) = 2
  Geen puntlast, alleen verdeelde belasting = 0
@end
#if puntlast ≡ 2
    F_G = ?*(kN)', permanent<span class="kolom-3"></span>'
    F_Q = ?*(kN)', veranderlijk, categorie H<span class="kolom-3"></span>'
    x_F = ?*(m)', horizontaal vanaf de voet<span class="kolom-3"></span>'
#else
    #hide
    F_G = 0 kN
    F_Q = 0 kN
    x_F = 0 m
    #show
#end if
h_geb = ?*(m)', nokhoogte boven maaiveld<span class="alleen-scherm">, z_e = h</span><span class="kolom-3"></span>'
#if systeem ≠ 5
    b_geb = ?*(m)', lengte van het gebouw<span class="alleen-scherm">, evenwijdig aan de nok</span><span class="kolom-3"></span>'
    @select ligging "Ligging van de spoor (wind)"
      Middengebied, verder dan e/2 van de kopgevel = 1
      Randgebied bij de kopgevel = 2
    @end
#else
    #hide
    b_geb = 1 m
    ligging = 1
    #show
#end if
@select wmax_eis "Uiterlijk van belang: ook w_max ≤ ℓ/250 (A1.4.3(4))"
  Ja = 1
  Nee = 0
@end

#hide
'Hoeken en lengten als kaal getal: graden, meters.
a_deg = α_dak/(1 deg)
L_h = l_h/(1 m)
a_n = a_hoh/(1 m)
b_n = b_sp/(1 m)
h_n = h_sp/(1 m)
Lp = if(systeem ≡ 5; sqrt(2)*L_h; L_h)
hT = L_h*tan(α_dak)
ok_sys = if(systeem ≡ 2; bool(l_ks ≥ 0.1*l_h and l_ks ≤ 0.9*l_h); if(systeem ≡ 3; bool(z_hb ≥ 0 m and z_hb ≤ 0.8*hT*(1 m)); 1))
ok_F = if(puntlast ≡ 2; bool(F_G ≥ 0 kN and F_Q ≥ 0 kN and x_F ≥ 0 m and x_F ≤ Lp*(1 m)); 1)
ok_inv = bool(a_deg > 0 and a_deg ≤ 75 and L_h > 0 and a_n > 0 and b_n > 0 and h_n > 0 and t_keep ≥ 0 mm and t_keep ≤ 0.5*h_sp and a_opl > 0 mm and a_nok > 0 mm and l_st > 0 m and l_so ≥ 0 m and g_opb ≥ 0 kN/m^2 and h_geb > 0 m and b_geb > 0 m)*ok_sys*ok_F
#show
#if ok_inv ≡ 0
    '<b style="color:#b91c1c">De invoer is onvolledig of past niet: helling groter dan 0° en ten hoogste 75°, overspanning, h.o.h., breedte en hoogte, opleggingen, steunafstand bovenrand, nokhoogte en gebouwlengte positief; de keep niet dieper dan de halve hoogte; een knieschot tussen 0,1 en 0,9 van de overspanning; een hanenbalk niet hoger dan 0,8 van de nokhoogte; een puntlast op de spoor.</b>
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de kap is niet getoetst: invoer onvolledig</b></span>
#else
    #hide
    'Materiaal [id, f_m,k, f_t,0,k, f_c,0,k, f_v,k, f_c,90,k, E_0,mean, E_0,05, ρ_mean, γ_M, gelamineerd]:
    'EN 338 voor C18 tot en met C30, EN 14080 voor GL24h en GL28h.
    materialen = [1; 2; 3; 4; 5 |18; 24; 30; 24; 28 |11; 14; 18; 19.2; 22.3 |18; 21; 23; 24; 28 |3.4; 4.0; 4.0; 3.5; 3.5 |2.2; 2.5; 2.7; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600 |6000; 7400; 8000; 9600; 10500 |380; 420; 460; 420; 460 |1.30; 1.30; 1.30; 1.25; 1.25 |0; 0; 0; 1; 1]
    f_mk = hlookup(materialen; sterkteklasse; 1; 2)
    f_t0k = hlookup(materialen; sterkteklasse; 1; 3)
    f_c0k = hlookup(materialen; sterkteklasse; 1; 4)
    f_vk = hlookup(materialen; sterkteklasse; 1; 5)
    f_c90k = hlookup(materialen; sterkteklasse; 1; 6)
    E_0m = hlookup(materialen; sterkteklasse; 1; 7)
    E_005 = hlookup(materialen; sterkteklasse; 1; 8)
    ρ_m = hlookup(materialen; sterkteklasse; 1; 9)
    gl = hlookup(materialen; sterkteklasse; 1; 11)
    f_m,k = f_mk*N/mm^2
    f_t,0,k = f_t0k*N/mm^2
    f_c,0,k = f_c0k*N/mm^2
    f_v,k = f_vk*N/mm^2
    f_c,90,k = f_c90k*N/mm^2
    E_0,mean = E_0m*N/mm^2
    E_0,05 = E_005*N/mm^2
    ρ_mean = ρ_m*kg/m^3
    γ_M = hlookup(materialen; sterkteklasse; 1; 10)
    k_def = if(klimaatklasse ≡ 1; 0.6; if(klimaatklasse ≡ 2; 0.8; 2.0))
    k_h = if(gl ≡ 1; if(h_sp < 600 mm; min((600 mm/h_sp)^0.1; 1.1); 1); if(h_sp < 150 mm; min((150 mm/h_sp)^0.2; 1.3); 1))
    k_mod,perm = if(klimaatklasse ≡ 3; 0.5; 0.6)
    k_mod,mid = if(klimaatklasse ≡ 3; 0.65; 0.8)
    k_mod,kort = if(klimaatklasse ≡ 3; 0.7; 0.9)
    'Hoeken en lengten; β is de helling van de staaf zelf (bij de hoekkeper flauwer dan het dakvlak).
    α_r = a_deg*pi/180
    β_r = if(systeem ≡ 5; atan(tan(α_r)/sqrt(2)); α_r)
    ca = cos(α_r)
    sa = sin(α_r)
    cb = cos(β_r)
    sb = sin(β_r)
    tb = tan(β_r)
    Lm = Lp/cb
    SCk = l_ks/(1 m)/cb
    z_t = z_hb/(1 m)
    SCt = z_t/sb
    'Aantal staven: twee bij het A-spant.
    n_r = if(systeem ≡ 3; 2; 1)
    zl = bool(systeem ≡ 4)
    zh = bool(systeem ≡ 5)
    #show
    'Materiaal<span class="alleen-scherm"> (EN 338 en EN 14080)</span>
    f_m,k'<span class="kolom-4"></span>'
    f_t,0,k'<span class="kolom-4"></span>'
    f_c,0,k'<span class="kolom-4"></span>'
    f_v,k'<span class="kolom-4"></span>'
    f_c,90,k'<span class="kolom-4"></span>'
    E_0,mean'<span class="kolom-4"></span>'
    E_0,05'<span class="kolom-4"></span>'
    ρ_mean'<span class="kolom-4"></span>'
    γ_M', tabel 2.3<span class="kolom-4"></span>'
    k_def', tabel 3.2<span class="kolom-4"></span>'
    k_h', 3.2(3) of 3.3(3)<span class="alleen-scherm">, op f<sub>m</sub> en f<sub>t,0</sub></span><span class="kolom-4"></span>'
    k_mod,perm', blijvend<span class="kolom-4"></span>'
    k_mod,mid', middellang<span class="kolom-4"></span>'
    k_mod,kort', kort<span class="kolom-4"></span>'
    'Doorsnede en geometrie<span class="alleen-scherm"></span>
    #hide
    A = b_sp*h_sp to mm^2
    W = b_sp*h_sp^2/6 to mm^3
    I = b_sp*h_sp^3/12 to mm^4
    β_hk = β_r*180/pi*deg
    L_p = Lp*m
    L = Lm*m
    h_nok = l_h*tan(α_dak)
    #show
    A'<span class="kolom-4"></span>'
    W'<span class="kolom-4"></span>'
    I'<span class="kolom-4"></span>'
    #if systeem ≡ 5
        β_hk', helling van de hoekkeper, tan β = tan α/√2<span class="kolom-4"></span>'
        L_p', in het grondvlak<span class="kolom-4"></span>'
        L', lengte van de hoekkeper<span class="kolom-4"></span>'
    #else
        L', lengte van de spoor<span class="kolom-4"></span>'
    #end if
    h_nok', top boven de voet<span class="kolom-4"></span>'
    #hide
    'Doorsnede in m; stijfheid in kNm².
    A_n = b_n*h_n
    W_n = b_n*h_n^2/6
    I_n = b_n*h_n^3/12
    EI = E_0m*1000*I_n
    k_hn = k_h
    k_mod1 = k_mod,perm
    k_mod2 = k_mod,mid
    k_mod3 = k_mod,kort
    β_c = if(gl ≡ 1; 0.1; 0.2)
    k_n = if(gl ≡ 1; 6.5; 5)
    #show

    '<h6>Permanent<span class="alleen-scherm"></span></h6>
    g_eig = ρ_mean*9.81 m/s^2*A to kN/m', eigen gewicht<span class="alleen-scherm"></span>'
    g_eig', eigen gewicht<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #hide
    g_opb_n = g_opb/(1 kN/m^2)
    g_eig_n = g_eig/(1 kN/m)
    #show
    #if systeem ≡ 5
        '<i>Per m hoekkeper in het grondvlak komt op afstand t van de hoek p·t/2 binnen: van beide dakvlakken de halve spoor met lengte t/√2. Per m hoekkeper is dat op afstand s langs de hoekkeper p·s·cos²β/2, met p per m² grondvlak.</i><span class="alleen-scherm"></span>
        g_top = g_opb/cos(α_dak)*L*cos(β_hk)^2/2 to kN/m', driehoekig, bij de nok<span class="alleen-scherm"></span>'
        g_top', driehoekig, bij de nok<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #else
        g_d = g_opb*a_hoh + g_eig to kN/m', per m spoor, verticaal<span class="alleen-scherm"></span>'
        g_d', per m spoor, verticaal<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #end if

    '<h6>Dak, categorie H (tabel NB.4 – 6.10)<span class="alleen-scherm"></span></h6>
    #hide
    q_kn = if(a_deg < 15; 1.0; if(a_deg < 20; 4 - 0.2*a_deg; 0))
    QQ = 2
    #show
    #if a_deg < 15
        q_k = 1.0 kN/m^2', tabel NB.4 – 6.10<span class="alleen-scherm">, α &lt; 15°, per m² dakvlak</span><span class="kolom-4"></span>'
    #else if a_deg < 20
        q_k = (4 - 0.2*α_dak/(1 deg))*(kN/m^2)', tabel NB.4 – 6.10<span class="alleen-scherm">, 15° ≤ α &lt; 20°, per m² dakvlak</span><span class="kolom-4"></span>'
    #else
        q_k = 0 kN/m^2', tabel NB.4 – 6.10<span class="alleen-scherm">, α ≥ 20°</span><span class="kolom-4"></span>'
    #end if
    #if puntlast ≡ 1
        Q_k = 2.0 kN', direct onder het dakbeschot<span class="kolom-4"></span>'
    #else if puntlast ≡ 2
        '<i>Puntlast op een vaste plaats: F<sub>G</sub> telt bij het eigen gewicht, F<sub>Q</sub> als veranderlijke belasting van categorie H.</i><span class="alleen-scherm"></span>
    #else
        '<i class="ook-afdruk">Zonder puntlast is de geconcentreerde last Q<sub>k</sub> = 2 kN uit tabel NB.4 – 6.10 niet getoetst.</i>
    #end if
    '<i>q<sub>k</sub> werkt volgens de tabel op ten hoogste 10 m²; hier op de hele spoor, dat ligt aan de veilige kant. Q<sub>k</sub>, q<sub>k</sub>, sneeuw en wind werken niet tegelijk (ψ<sub>0</sub> = 0).</i><span class="alleen-scherm"></span>

    '<h6>Sneeuw (NEN-EN 1991-1-3)<span class="alleen-scherm"></span></h6>
    #if DesignLife > 50
        #hide
        f_sn = (1 - 0.8*sqrt(6)/pi*(log(-log(1 - 1/DesignLife)) + 0.57722))/(1 + 2.5923*0.8)
        #show
        f_sn', (D.1) van NEN-EN 1991-1-3 met V = 0,8<span class="alleen-scherm">, ontwerplevensduur boven 50 jaar, P<sub>n</sub> = 1/t</span><span class="kolom-4"></span>'
        s_k = f_sn*0.70 kN/m^2', NEN-EN 1991-1-3<span class="alleen-scherm">: grondwaarde 0,70 aangepast volgens A1.1(2) van de NB bij NEN-EN 1990</span><span class="kolom-4"></span>'
    #else
        s_k = 0.70 kN/m^2', NEN-EN 1991-1-3<span class="alleen-scherm">, grondwaarde (NB bij 4.1)</span><span class="kolom-4"></span>'
    #end if
    #hide
    μ_1 = if(a_deg ≤ 30; 0.8; if(a_deg < 60; 0.8*(60 - a_deg)/30; 0))
    #show
    μ_1', tabel 5.2<span class="alleen-scherm">, C<sub>e</sub> = C<sub>t</sub> = 1</span><span class="kolom-4"></span>'
    s_dak = μ_1*s_k', per m² grondvlak<span class="alleen-scherm"></span>'
    s_dak', per m² grondvlak<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if systeem ≡ 3
        '<i>A-spant: ook de sneeuwgevallen (ii) en (iii) van figuur 5.3, met 0,5·μ<sub>1</sub> op één dakvlak.</i><span class="alleen-scherm"></span>
    #end if
    #hide
    s_n = s_dak/(1 kN/m^2)
    #show

    '<h6>Wind (NEN-EN 1991-1-4)</h6>
    #hide
    'Tabel NB.1: basiswindsnelheid; tabel NB.3 – 4.1: z_0 en z_min per terreincategorie.
    vb0_ruw = if(windgebied ≡ 1; 29.5; if(windgebied ≡ 2; 27.0; 24.5))
    z0_ruw = if(terreincategorie ≡ 1; 0.005; if(terreincategorie ≡ 2; 0.2; 0.5))
    zmin_ruw = if(terreincategorie ≡ 1; 1; if(terreincategorie ≡ 2; 4; 7))
    ze_ruw = max(h_geb/(1 m); zmin_ruw)
    verh = ze_ruw/z0_ruw
    'Opmerking 4 bij 4.2 en tabel NB.2: c_prob bij een ontwerplevensduur boven 50 jaar, p = 1/t, n = 0,5.
    K_prob = if(windgebied ≡ 1; 0.2; if(windgebied ≡ 2; 0.234; 0.281))
    t_prob = max(DesignLife; 50)
    cprob_ruw = sqrt((1 - K_prob*log(-log(1 - 1/t_prob)))/(1 - K_prob*log(-log(0.98))))
    vm_ruw = 0.19*(z0_ruw/0.05)^0.07*log(verh)*cprob_ruw*vb0_ruw
    #show
    #hide
    v_b0 = vb0_ruw*(m/s)
    z_e = ze_ruw*(m)
    #show
    v_b0', tabel NB.1<span class="kolom-4"></span>'
    #if DesignLife > 50
        c_prob = cprob_ruw', (4.2)<span class="alleen-scherm">, opmerking 4 bij 4.2</span><span class="kolom-4"></span>'
    #end if
    z_e', ten minste z<sub>min</sub><span class="kolom-4"></span>'
    v_m = vm_ruw*(m/s)', (4.3), c<sub>o</sub> = 1<span class="alleen-scherm"></span>'
    I_v = 1/log(verh)', (4.7)<span class="alleen-scherm"></span>'
    q_p = (1 + 7*I_v)*0.5*1.25*vm_ruw^2/1000*(kN/m^2)', (4.8)<span class="alleen-scherm"></span>'
    q_p', (4.8)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #hide
    qp_n = q_p/(1 kN/m^2)
    'Tabel NB.10 – 7.4a (θ = 0°) per helling: c_pe,10 en c_pe,1 van F, G, H, I en J; dan de druk op F en G, op H en op J.
    T_0 = [5; 15; 30; 45; 60; 75 | -1.7; -0.9; -0.5; 0; 0; 0 | -2.5; -2.0; -1.5; 0; 0; 0 | -1.2; -0.8; -0.5; 0; 0; 0 | -2.0; -1.5; -1.5; 0; 0; 0 | -0.6; -0.3; -0.2; 0; 0; 0 | -1.2; -1.0; -1.0; 0; 0; 0 | -0.6; -0.4; -0.4; -0.2; -0.2; -0.2 | -1.0; -1.0; -1.0; -1.0; -1.0; -1.0 | -0.6; -1.0; -0.5; -0.3; -0.3; -0.3 | -1.0; -1.5; -1.0; -1.0; -1.0; -1.0 | 0; 0.2; 0.7; 0.7; 0.7; 0.8 | 0; 0.2; 0.4; 0.6; 0.7; 0.8 | 0.2; 0; 0; 0; 0; 0]
    'Tabel NB.11 – 7.4b (θ = 90°) per helling: c_pe,10 en c_pe,1 van F, G, H en I.
    T_90 = [5; 15; 30; 45; 60; 75 | -1.6; -1.3; -1.1; -1.1; -1.1; -1.1 | -2.2; -2.0; -1.5; -1.5; -1.5; -1.5 | -1.3; -1.3; -1.4; -1.4; -1.2; -1.2 | -2.0; -2.0; -2.0; -2.0; -2.0; -2.0 | -0.7; -0.6; -0.8; -0.9; -0.8; -0.8 | -1.2; -1.2; -1.2; -1.2; -1.0; -1.0 | -0.6; -0.5; -0.5; -0.5; -0.5; -0.5 | -1.0; -1.0; -1.0; -1.0; -1.0; -1.0]
    'Tabel NB.8 – 7.3a (lessenaardak) per helling: θ = 0° c_pe,10 en c_pe,1 van F, G en H; de druk op F, G en H; θ = 180° c_pe,10 en c_pe,1 van F, G en H.
    T_L = [5; 15; 30; 45; 60; 75 | -1.7; -0.9; -0.5; 0; 0; 0 | -2.5; -2.0; -1.5; 0; 0; 0 | -1.2; -0.8; -0.5; 0; 0; 0 | -2.0; -1.5; -1.5; 0; 0; 0 | -0.6; -0.3; -0.2; 0; 0; 0 | -1.2; -1.0; -1.0; 0; 0; 0 | 0; 0.2; 0.7; 0.7; 0.7; 0.8 | 0; 0.2; 0.7; 0.7; 0.7; 0.8 | 0; 0.2; 0.4; 0.6; 0.7; 0.8 | -2.3; -2.5; -1.1; -0.6; -0.5; -0.5 | -2.5; -2.8; -2.3; -1.3; -1.0; -1.0 | -1.3; -1.3; -0.8; -0.5; -0.5; -0.5 | -2.0; -2.0; -1.5; -1.0; -1.0; -1.0 | -0.8; -0.9; -0.8; -0.7; -0.5; -0.5 | -1.2; -1.2; -1.0; -1.0; -1.0; -1.0]
    'Tabel NB.9 – 7.3b (lessenaardak, θ = 90°) per helling: c_pe,10 en c_pe,1 van F hoog, F laag, G, H en I.
    T_L90 = [5; 15; 30; 45; 60; 75 | -2.1; -2.4; -2.1; -1.5; -1.2; -1.2 | -2.6; -2.9; -2.9; -2.4; -2.0; -2.0 | -2.1; -1.6; -1.3; -1.3; -1.2; -1.2 | -2.4; -2.4; -2.0; -2.0; -2.0; -2.0 | -1.8; -1.9; -1.5; -1.4; -1.2; -1.2 | -2.0; -2.5; -2.0; -2.0; -2.0; -2.0 | -0.6; -0.8; -1.0; -1.0; -1.0; -1.0 | -1.2; -1.2; -1.3; -1.3; -1.3; -1.3 | -0.5; -0.7; -0.8; -0.9; -0.7; -0.5 | -1.0; -1.2; -1.2; -1.2; -1.2; -1.0]
    'Lineair tussen de rijen; kolom 1 is de helling. Onder 5° de waarden bij 5°.
    ip(tab; kol; xa) = hlookup_le(tab; xa; 1; kol) + (hlookup_ge(tab; xa; 1; kol) - hlookup_le(tab; xa; 1; kol))*if(hlookup_ge(tab; xa; 1; 1) > hlookup_le(tab; xa; 1; 1); (xa - hlookup_le(tab; xa; 1; 1))/(hlookup_ge(tab; xa; 1; 1) - hlookup_le(tab; xa; 1; 1)); 0)
    cl(x; lo; hi) = min(max(x; lo); hi)
    a_t = min(max(a_deg; 5); 75)
    'Belaste oppervlakte: de spoor over zijn h.o.h., bij de hoekkeper de twee driehoeken die hij draagt.
    A_w = if(zh ≡ 1; L_h^2/(2*ca); a_n*Lm)
    cpe(c1; c10) = if(A_w ≥ 10; c10; if(A_w ≤ 1; c1; c1 - (c1 - c10)*log10(A_w)))
    cz_F = cpe(ip(T_0; 3; a_t); ip(T_0; 2; a_t))
    cz_G = cpe(ip(T_0; 5; a_t); ip(T_0; 4; a_t))
    cz_H = cpe(ip(T_0; 7; a_t); ip(T_0; 6; a_t))
    cz_I = cpe(ip(T_0; 9; a_t); ip(T_0; 8; a_t))
    cz_J = cpe(ip(T_0; 11; a_t); ip(T_0; 10; a_t))
    cd_FG = ip(T_0; 12; a_t)
    cd_H = ip(T_0; 13; a_t)
    c9_F = cpe(ip(T_90; 3; a_t); ip(T_90; 2; a_t))
    c9_G = cpe(ip(T_90; 5; a_t); ip(T_90; 4; a_t))
    c9_H = cpe(ip(T_90; 7; a_t); ip(T_90; 6; a_t))
    c9_I = cpe(ip(T_90; 9; a_t); ip(T_90; 8; a_t))
    cl_Fz = cpe(ip(T_L; 3; a_t); ip(T_L; 2; a_t))
    cl_Gz = cpe(ip(T_L; 5; a_t); ip(T_L; 4; a_t))
    cl_Hz = cpe(ip(T_L; 7; a_t); ip(T_L; 6; a_t))
    cl_Fd = ip(T_L; 8; a_t)
    cl_Gd = ip(T_L; 9; a_t)
    cl_Hd = ip(T_L; 10; a_t)
    cl_F180 = cpe(ip(T_L; 12; a_t); ip(T_L; 11; a_t))
    cl_G180 = cpe(ip(T_L; 14; a_t); ip(T_L; 13; a_t))
    cl_H180 = cpe(ip(T_L; 16; a_t); ip(T_L; 15; a_t))
    cl_Fh = cpe(ip(T_L90; 3; a_t); ip(T_L90; 2; a_t))
    cl_Fl = cpe(ip(T_L90; 5; a_t); ip(T_L90; 4; a_t))
    cl_G90 = cpe(ip(T_L90; 7; a_t); ip(T_L90; 6; a_t))
    cl_I90 = cpe(ip(T_L90; 11; a_t); ip(T_L90; 10; a_t))
    'Zones langs de spoor (horizontaal gemeten): e/10 langs goot of nok bij θ = 0°, e/4 langs de goot bij θ = 90°.
    e_0n = min(b_geb/(1 m); 2*h_geb/(1 m))
    e_90n = min(if(zl ≡ 1; L_h; 2*L_h); 2*h_geb/(1 m))
    x_e0 = min(e_0n/10; L_h)
    x_e90 = min(e_90n/4; L_h)
    lz1 = bool(ligging ≡ 1)
    'Windgevallen 1 tot en met 4 voor één dakvlak: c_pe van het deel vanaf de voet en van de rest, c_pi, de grens (horizontaal).
    'Zadeldak: 1 loef druk, 2 loef zuiging, 3 lij, 4 θ = 90°. Lessenaardak: 1 en 2 θ = 0°, 3 θ = 180°, 4 θ = 90°.
    'Hoekkeper: 1 druk, 2 zuiging, gelijk op beide dakvlakken.
    ce1a = if(zh ≡ 1; cd_H; if(zl ≡ 1; if(lz1 ≡ 1; cl_Gd; cl_Fd); cd_FG))
    ce1b = if(zh ≡ 1; cd_H; if(zl ≡ 1; cl_Hd; cd_H))
    ce2a = if(zh ≡ 1; min(cz_H; cz_I; c9_H; c9_I); if(zl ≡ 1; if(lz1 ≡ 1; cl_Gz; cl_Fz); if(lz1 ≡ 1; cz_G; cz_F)))
    ce2b = if(zh ≡ 1; ce2a; if(zl ≡ 1; cl_Hz; cz_H))
    ce3a = if(zl ≡ 1; cl_H180; cz_I)
    ce3b = if(zl ≡ 1; if(lz1 ≡ 1; cl_G180; cl_F180); cz_J)
    ce4a = if(lz1 ≡ 1; if(zl ≡ 1; cl_I90; c9_I); if(zl ≡ 1; cl_Fl; c9_F))
    ce4b = if(lz1 ≡ 1; ce4a; if(zl ≡ 1; min(cl_G90; cl_Fh); c9_G))
    cea(w) = if(w ≡ 1; ce1a; if(w ≡ 2; ce2a; if(w ≡ 3; ce3a; ce4a)))
    ceb(w) = if(w ≡ 1; ce1b; if(w ≡ 2; ce2b; if(w ≡ 3; ce3b; ce4b)))
    cpi(w) = if(w ≡ 1; -0.3; 0.2)
    xw(w) = if(zh ≡ 1; Lp; if(w ≤ 2; x_e0; if(w ≡ 3; L_h - x_e0; if(lz1 ≡ 1; L_h; x_e90))))
    'Netto last per m spoor loodrecht op de spoor (+ = naar het dak toe); bij de hoekkeper de waarde bij de nok van de driehoek.
    K_hk = sqrt(2*sa^2 + 4*ca^2)
    nwa(w) = (cea(w) - cpi(w))*qp_n*if(zh ≡ 1; K_hk*Lm*cb^2/(4*ca); a_n)
    nwb(w) = (ceb(w) - cpi(w))*qp_n*if(zh ≡ 1; K_hk*Lm*cb^2/(4*ca); a_n)
    swm(w) = cl(xw(w); 0; L_h)/cb
    n_w = if(zh ≡ 1; 2; 4)
    'Zuiging op het loefvlak bestaat alleen tot 45°.
    w_ok(w) = if(w ≡ 2 and zh ≡ 0; bool(a_deg ≤ 45); 1)
    wid(w) = if(systeem ≡ 3; if(w ≡ 1; "a"; if(w ≡ 2; "b"; if(w ≡ 3; "c"; "d"))); if(w ≡ 1; "W1"; if(w ≡ 2; "W2"; if(w ≡ 3; "W3"; "W4"))))
    wrt(w) = if(zh ≡ 1; if(w ≡ 1; "druk op beide dakvlakken"; "zuiging op beide dakvlakken"); if(w ≡ 1; "θ = 0°, druk"; if(w ≡ 2; "θ = 0°, zuiging"; if(w ≡ 3; if(zl ≡ 1; "θ = 180°"; "θ = 0°, lijzijde"); "θ = 90°"))))
    zna(w) = if(zh ≡ 1; if(w ≡ 1; "H"; "H en I"); if(w ≡ 1; if(zl ≡ 1; if(lz1 ≡ 1; "G"; "F"); "F en G"); if(w ≡ 2; if(lz1 ≡ 1; "G"; "F"); if(w ≡ 3; if(zl ≡ 1; "H"; "I"); if(lz1 ≡ 1; "I"; if(zl ≡ 1; "F laag"; "F"))))))
    znb(w) = if(zh ≡ 1; "—"; if(w ≤ 2; "H"; if(w ≡ 3; if(zl ≡ 1; if(lz1 ≡ 1; "G"; "F"); "J"); if(lz1 ≡ 1; "I"; if(zl ≡ 1; "G en F hoog"; "G")))))
    #show
    #if systeem ≡ 4
        e = min(b_geb; 2*h_geb)', θ = 0° en 180°<span class="alleen-scherm"></span>'
        e', θ = 0° en 180°<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        e_90 = min(l_h; 2*h_geb)', θ = 90°<span class="alleen-scherm"></span>'
        e_90', θ = 90°<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #else if systeem ≠ 5
        e = min(b_geb; 2*h_geb)', θ = 0°<span class="alleen-scherm"></span>'
        e', θ = 0°<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        e_90 = min(2*l_h; 2*h_geb)', θ = 90°<span class="alleen-scherm"></span>'
        e_90', θ = 90°<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #end if
    #if systeem ≡ 5
        A_ref = l_h^2/(2*cos(α_dak))', belaste oppervlakte (7.2.1)<span class="alleen-scherm"></span>'
        A_ref', (7.2.1)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #else
        A_ref = a_hoh*L', belaste oppervlakte (7.2.1)<span class="alleen-scherm"></span>'
        A_ref', (7.2.1)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #end if
    #if a_deg < 5
        '<b style="color:#b45309">α &lt; 5°: eigenlijk een plat dak (7.2.3); hier met de waarden bij 5°.</b>
    #end if
    #if systeem ≡ 4
        '<i>Tabel NB.8 – 7.3a en NB.9 – 7.3b. Zone 1 ligt vanaf de voet (lage kant) tot de grens, zone 2 is de rest; bij θ = 180° ligt de strook langs de hoge kant.</i><span class="alleen-scherm"></span>
    #else if systeem ≡ 5
        '<i>Tabel NB.10 – 7.4a en NB.11 – 7.4b met de helling van de dakvlakken. De druk van beide dakvlakken samen staat loodrecht op de hoekkeper; de zones langs de hoekkeper van tabel NB.12 – 7.5 zijn niet apart beschouwd.</i>
    #else
        '<i>Tabel NB.10 – 7.4a en NB.11 – 7.4b. Zone 1 ligt vanaf de voet tot de grens (de strook e/10 langs de goot, bij θ = 90° in het randgebied e/4), zone 2 is de rest; bij de lijzijde ligt de strook J langs de nok.</i><span class="alleen-scherm"></span>
    #end if
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Geval</th><th style="padding:1px 4px; text-align:left;">Richting</th><th style="padding:1px 4px; text-align:left;">Zone 1</th><th style="padding:1px 4px; text-align:right;">c<sub>pe</sub></th><th style="padding:1px 4px; text-align:left;">Zone 2</th><th style="padding:1px 4px; text-align:right;">c<sub>pe</sub></th><th style="padding:1px 4px; text-align:right;">c<sub>pi</sub></th><th style="padding:1px 4px; text-align:right;">grens (m)</th><th style="padding:1px 4px; text-align:right;">'if(zh ≡ 1; "n<sub>top</sub> (kN/m)"; "n<sub>1</sub> (kN/m)")'</th><th style="padding:1px 4px; text-align:right;">'if(zh ≡ 1; ""; "n<sub>2</sub> (kN/m)")'</th></tr>
    #for w = 1 : n_w
        #if w_ok(w) ≡ 1
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'wid(w)'</td><td style="padding:0 4px;">'wrt(w)'</td><td style="padding:0 4px;">'zna(w)'</td><td style="padding:0 4px; text-align:right;">'round(cea(w)*100)/100'</td><td style="padding:0 4px;">'znb(w)'</td><td style="padding:0 4px; text-align:right;">'if(zh ≡ 1; ""; round(ceb(w)*100)/100)'</td><td style="padding:0 4px; text-align:right;">'cpi(w)'</td><td style="padding:0 4px; text-align:right;">'if(zh ≡ 1; "—"; round(cl(xw(w); 0; L_h)*100)/100)'</td><td style="padding:0 4px; text-align:right;">'round(nwa(w)*1000)/1000'</td><td style="padding:0 4px; text-align:right;">'if(zh ≡ 1; ""; round(nwb(w)*1000)/1000)'</td></tr>
        #end if
    #loop
    '</table>
    #if systeem ≡ 3
        '<i>A-spant: W1 = a links en c rechts (wind van links), W2 = b links en c rechts, W3 = c links en a rechts (wind van rechts), W4 = c links en b rechts, W5 = d op beide sporen; c<sub>pi</sub> per dakvlak de ongunstigste.</i>
    #end if

    # 3. Combinaties en krachtswerking

    #hide
    'Belastinggevallen per staaf (r = 1: de spoor, of links bij het A-spant; r = 2: rechts), als kaal getal in kN en m.
    'V0 verticaal per m staaf, VT driehoekig verticaal (waarde bij de top), NA en NB loodrecht op zone 1 en 2,
    'SW de grens langs de staaf, NT driehoekig loodrecht, P een verticale puntlast op s_P.
    G_V0 = if(zh ≡ 1; g_eig_n; g_opb_n*a_n + g_eig_n)
    G_VT = if(zh ≡ 1; g_opb_n/ca*Lm*cb^2/2; 0)
    Q_V0 = if(zh ≡ 1; 0; q_kn*a_n)
    Q_VT = if(zh ≡ 1; q_kn/ca*Lm*cb^2/2; 0)
    S_V0 = if(zh ≡ 1; 0; s_n*a_n*cb)
    S_VT = if(zh ≡ 1; s_n*Lm*cb^2/2; 0)
    F_Gn = F_G/(1 kN)
    F_Qn = if(puntlast ≡ 1; QQ; F_Q/(1 kN))
    'Beginplaats van Q_k: midden in het langste veld (de zoektocht verderop vindt de ongunstigste).
    s_Q = if(systeem ≡ 2; if(SCk ≥ Lm - SCk; SCk/2; (SCk + Lm)/2); if(systeem ≡ 3 and z_t > 0; if(SCt ≥ Lm - SCt; SCt/2; (SCt + Lm)/2); Lm/2))
    s_P = if(puntlast ≡ 2; x_F/(1 m)/cb; s_Q)
    'Geval v: 0 alleen G, 1 q_k, 2 puntlast, 3 tot en met 5 sneeuw (i), (ii), (iii), 6 tot en met 10 wind W1 tot en met W5.
    fsn(v; r) = if(v ≡ 3; 1; if(v ≡ 4; if(r ≡ 1; 0.5; 1); if(v ≡ 5; if(r ≡ 1; 1; 0.5); 0)))
    wL(j) = if(j ≡ 1; 1; if(j ≡ 2; 2; if(j ≤ 4; 3; 4)))
    wR(j) = if(j ≤ 2; 3; if(j ≡ 3; 1; if(j ≡ 4; 2; 4)))
    wsg(v; r) = if(v < 6; 0; if(systeem ≡ 3; if(r ≡ 1; wL(v - 5); wR(v - 5)); v - 5))
    xV0(fg; fq; v; r) = fg*G_V0 + fq*(bool(v ≡ 1)*Q_V0 + fsn(v; r)*S_V0)
    xVT(fg; fq; v) = fg*G_VT + fq*(bool(v ≡ 1)*Q_VT + fsn(v; 1)*S_VT)
    xNA(fq; v; r) = if(wsg(v; r) ≡ 0 or zh ≡ 1; 0; fq*nwa(wsg(v; r)))
    xNB(fq; v; r) = if(wsg(v; r) ≡ 0 or zh ≡ 1; 0; fq*nwb(wsg(v; r)))
    xSW(v; r) = if(wsg(v; r) ≡ 0 or zh ≡ 1; Lm; swm(wsg(v; r)))
    xNT(fq; v) = if(wsg(v; 1) ≡ 0 or zh ≡ 0; 0; fq*nwa(wsg(v; 1)))
    xP(fg; fq; v) = fg*F_Gn + fq*bool(v ≡ 2)*F_Qn
    'De staaf die nu wordt doorgerekend staat in de registers C_…, met de reactie aan de voet loodrecht (CAP) en langs (CAA).
    'Integralen van de last vanaf de voet tot x: loodrecht, langs, en het moment om x.
    Im(x; c; d) = (cl(x; c; d) - c)*(x - (c + cl(x; c; d))/2)
    Pp(x) = cb*(C_V0*x + C_VT*x^2/(2*Lm)) + C_NA*cl(x; 0; C_SW) + C_NB*(cl(x; C_SW; Lm) - C_SW) + C_NT*x^2/(2*Lm) + cb*C_P*bool(x ≥ s_P)
    Pa(x) = sb*(C_V0*x + C_VT*x^2/(2*Lm) + C_P*bool(x ≥ s_P))
    Mp(x) = cb*(C_V0*x^2/2 + C_VT*x^3/(6*Lm)) + C_NA*Im(x; 0; C_SW) + C_NB*Im(x; C_SW; Lm) + C_NT*x^3/(6*Lm) + cb*C_P*max(x - s_P; 0)
    'Snedekrachten, met een knoopkracht op SC (knieschot of hanenbalk): loodrecht QP, langs QA.
    Mx(x) = CAP*x - Mp(x) + QP*max(x - SC; 0)
    Vx(x) = CAP - Pp(x) + QP*bool(x > SC)
    Nx(x) = -CAA + Pa(x) - QA*bool(x > SC)
    'Drie-momentenvergelijking: EI·θ aan het rechter (KR) en linker (KL) einde van een ligger op twee steunpunten.
    KR(w; c; d; l) = w/(6*l)*((l^2*d^2/2 - d^4/4) - (l^2*c^2/2 - c^4/4))
    KL(w; c; d; l) = KR(w; l - d; l - c; l)
    KRP(p; a; l) = p*a*(l^2 - a^2)/(6*l)
    KLP(p; a; l) = KRP(p; l - a; l)
    'Beginwaarden, zodat elke functie iets vindt.
    L_V0 = 0
    L_VT = 0
    L_NA = 0
    L_NB = 0
    L_SW = Lm
    L_NT = 0
    L_P = 0
    R_V0 = 0
    R_NA = 0
    R_NB = 0
    R_SW = Lm
    C_V0 = 0
    C_VT = 0
    C_NA = 0
    C_NB = 0
    C_SW = Lm
    C_NT = 0
    C_P = 0
    RAP_L = 0
    RAA_L = 0
    RAP_R = 0
    RAA_R = 0
    CAP = 0
    CAA = 0
    QP = 0
    QA = 0
    SC = Lm
    'Staaf r in de registers zetten.
    #def kap_staaf()
    C_V0 = if(r ≡ 1; L_V0; R_V0)
    C_VT = if(r ≡ 1; L_VT; 0)
    C_NA = if(r ≡ 1; L_NA; R_NA)
    C_NB = if(r ≡ 1; L_NB; R_NB)
    C_SW = if(r ≡ 1; L_SW; R_SW)
    C_NT = if(r ≡ 1; L_NT; 0)
    C_P = if(r ≡ 1; L_P; 0)
    CAP = if(r ≡ 1; RAP_L; RAP_R)
    CAA = if(r ≡ 1; RAA_L; RAA_R)
    #end def
    'Lastset (fg, fq, v) opzetten en oplossen.
    #def kap_los()
    L_V0 = xV0(fg; fq; v; 1)
    L_VT = xVT(fg; fq; v)
    L_NA = xNA(fq; v; 1)
    L_NB = xNB(fq; v; 1)
    L_SW = xSW(v; 1)
    L_NT = xNT(fq; v)
    L_P = xP(fg; fq; v)
    R_V0 = xV0(fg; fq; v; 2)
    R_NA = xNA(fq; v; 2)
    R_NB = xNB(fq; v; 2)
    R_SW = xSW(v; 2)
    C_V0 = L_V0
    C_VT = L_VT
    C_NA = L_NA
    C_NB = L_NB
    C_SW = L_SW
    C_NT = L_NT
    C_P = L_P
    #if systeem ≡ 3
        tPL = Pp(Lm)
        tAL = Pa(Lm)
        tML = Mp(Lm)
        C_V0 = R_V0
        C_VT = 0
        C_NA = R_NA
        C_NB = R_NB
        C_SW = R_SW
        C_NT = 0
        C_P = 0
        tPR = Pp(Lm)
        tAR = Pa(Lm)
        tMR = Mp(Lm)
        FxL = tPL*sb - tAL*cb
        FzL = -tPL*cb - tAL*sb
        FxR = -tPR*sb + tAR*cb
        FzR = -tPR*cb - tAR*sb
        MPL = Lm*tPL - tML
        MPR = Lm*tPR - tMR
        R_Ax = -(FxL + FxR)
        R_Bz = (MPL - MPR - 2*L_h*FzR)/(2*L_h)
        R_Az = -(FzL + FzR) - R_Bz
        T_t = -(-L_h*R_Az + hT*R_Ax - MPL - L_h*FzL + hT*FxL)/(hT - z_t)
        RAP_L = -R_Ax*sb + R_Az*cb
        RAA_L = R_Ax*cb + R_Az*sb
        RAP_R = R_Bz*cb
        RAA_R = R_Bz*sb
        QP = -T_t*sb
        QA = T_t*cb
        SC = SCt
        R_Cz = 0
        R_Bx = 0
        R_Bn = R_Bz
    #else
        #if systeem ≡ 2
            Θ_1 = KR(cb*L_V0; 0; SCk; SCk) + KR(L_NA; 0; cl(L_SW; 0; SCk); SCk) + KR(L_NB; cl(L_SW; 0; SCk); SCk; SCk) + bool(s_P < SCk)*KRP(cb*L_P; s_P; SCk)
            Θ_2 = KL(cb*L_V0; 0; Lm - SCk; Lm - SCk) + KL(L_NA; 0; cl(L_SW - SCk; 0; Lm - SCk); Lm - SCk) + KL(L_NB; cl(L_SW - SCk; 0; Lm - SCk); Lm - SCk; Lm - SCk) + bool(s_P ≥ SCk)*KLP(cb*L_P; s_P - SCk; Lm - SCk)
            M_C = -3*(Θ_1 + Θ_2)/Lm
            RAP_L = (M_C + Mp(SCk))/SCk
            QP = (Mp(Lm) - RAP_L*Lm)/(Lm - SCk)
            QA = QP*tb
            SC = SCk
            RBP = Pp(Lm) - RAP_L - QP
        #else
            RBP = (Lm*Pp(Lm) - Mp(Lm))/Lm
            RAP_L = Pp(Lm) - RBP
            QP = 0
            QA = 0
            SC = Lm
        #end if
        RAA_L = Pa(Lm) - if(rol ≡ 1; RBP*tb; 0) - QA
        R_Az = RAP_L*cb + RAA_L*sb
        R_Ax = -RAP_L*sb + RAA_L*cb
        R_Cz = QP/cb
        R_Bz = if(rol ≡ 1; RBP/cb; RBP*cb)
        R_Bx = if(rol ≡ 1; 0; RBP*sb)
        R_Bn = if(rol ≡ 1; R_Bz; RBP)
        T_t = 0
    #end if
    #end def
    'Combinaties [k, factor op G, geval v, duurklasse, spoor, A-spant, hoekkeper]:
    'factor 1 = γ_G,a (6.10a), 2 = γ_G, 3 = 0,9, 4 = γ_G bij het A-spant en anders 0,9; duurklasse 1 blijvend, 2 middellang, 3 kort.
    KC = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13 |1; 2; 2; 2; 2; 2; 2; 3; 3; 4; 3; 3; 3 |0; 1; 2; 3; 4; 5; 6; 6; 7; 8; 8; 9; 10 |1; 2; 3; 3; 3; 3; 3; 3; 3; 3; 3; 3; 3 |1; 1; 1; 1; 0; 0; 1; 0; 1; 1; 0; 1; 0 |1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 1 |1; 1; 1; 1; 0; 0; 1; 0; 1; 0; 0; 0; 0]
    grp = if(systeem ≡ 3; 2; if(zh ≡ 1; 3; 1))
    γ_G = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
    γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
    γ_Ga = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
    γ_Gi = 0.9
    kv(k) = hlookup(KC; k; 1; 3)
    fGk(k) = if(hlookup(KC; k; 1; 2) ≡ 1; γ_Ga; if(hlookup(KC; k; 1; 2) ≡ 2; γ_G; if(hlookup(KC; k; 1; 2) ≡ 3; γ_Gi; if(systeem ≡ 3; γ_G; γ_Gi))))
    kmk(k) = if(hlookup(KC; k; 1; 4) ≡ 1; k_mod1; if(hlookup(KC; k; 1; 4) ≡ 2; k_mod2; k_mod3))
    'Zuiging op het loefvlak: bij één spoor W2, bij het A-spant W2 en W4; alleen tot 45°.
    lz(v) = if(systeem ≡ 3; bool(v ≡ 7 or v ≡ 9); if(zh ≡ 1; 0; bool(v ≡ 7)))
    act(k) = hlookup(KC; k; 1; 4 + grp)*if(kv(k) ≡ 1; bool(q_kn > 0); 1)*if(kv(k) ≡ 2; bool(puntlast > 0); 1)*if(lz(kv(k)) ≡ 1; bool(a_deg ≤ 45); 1)
    vdoe(v) = if(v ≡ 0; 1; if(v ≡ 1; bool(q_kn > 0); if(v ≡ 2; bool(puntlast > 0); if(v ≡ 3; 1; if(v ≤ 5; bool(systeem ≡ 3); if(zh ≡ 1; bool(v ≤ 7); bool(v ≤ 9 or systeem ≡ 3)*if(lz(v) ≡ 1; bool(a_deg ≤ 45); 1)))))))
    vnaam(v) = if(v ≡ 0; "G"; if(v ≡ 1; "q<sub>k</sub>"; if(v ≡ 2; if(puntlast ≡ 1; "Q<sub>k</sub>"; "F<sub>Q</sub>"); if(v ≡ 3; if(systeem ≡ 3; "S (i)"; "S"); if(v ≡ 4; "S (ii)"; if(v ≡ 5; "S (iii)"; if(v ≡ 6; "W1"; if(v ≡ 7; "W2"; if(v ≡ 8; "W3"; if(v ≡ 9; "W4"; "W5"))))))))))
    'Knik (6.21) tot en met (6.28): in het vlak over de veldlengte, uit het vlak over de steunafstand van de bovenrand.
    L_cy = if(systeem ≡ 2; max(SCk; Lm - SCk); Lm)
    λ_rely = L_cy/(h_n/sqrt(12))/pi*sqrt(f_c0k/E_005)
    λ_relz = l_st/(1 m)/(b_n/sqrt(12))/pi*sqrt(f_c0k/E_005)
    k_yk = 0.5*(1 + β_c*(λ_rely - 0.3) + λ_rely^2)
    k_zk = 0.5*(1 + β_c*(λ_relz - 0.3) + λ_relz^2)
    k_cy = if(λ_rely ≤ 0.3; 1; 1/(k_yk + sqrt(k_yk^2 - λ_rely^2)))
    k_cz = if(λ_relz ≤ 0.3; 1; 1/(k_zk + sqrt(k_zk^2 - λ_relz^2)))
    'Kip (6.30) tot en met (6.34): bovenrand tussen de steunen, last op de gedrukte rand; onderrand tussen steunen of opleggingen, last op de getrokken rand.
    l_eft = 0.9*l_st/(1 m) + 2*h_n
    l_bo = if(l_so > 0 m; l_so/(1 m); L_cy)
    l_efb = max(0.9*l_bo - 0.5*h_n; 0.5*l_bo)
    σ_crt = 0.78*b_n^2*E_005/(h_n*l_eft)
    σ_crb = 0.78*b_n^2*E_005/(h_n*l_efb)
    λ_mt = sqrt(f_mk/σ_crt)
    λ_mb = sqrt(f_mk/σ_crb)
    kcrit(λ) = if(λ ≤ 0.75; 1; if(λ ≤ 1.4; 1.56 - 0.75*λ; 1/λ^2))
    k_crt = kcrit(λ_mt)
    k_crb = kcrit(λ_mb)
    'Toetsen per doorsnede, spanningen in N/mm²: (6.17) of (6.19); (6.23) en (6.24); (6.33) of (6.35).
    σm(m) = abs(m)/W_n/1000
    σn(n) = n/A_n/1000
    kcr(m) = if(m ≥ 0; k_crt; k_crb)
    uS(m; n) = if(n ≥ 0; σn(n)/ftd + σm(m)/fmd; (σn(n)/fcd)^2 + σm(m)/fmd)
    uB(m; n) = if(n ≥ 0; 0; max(-σn(n)/(k_cy*fcd) + σm(m)/fmd; -σn(n)/(k_cz*fcd) + 0.7*σm(m)/fmd))
    uK(m; n) = if(n < 0; (σm(m)/(kcr(m)*fmd))^2 - σn(n)/(k_cz*fcd); σm(m)/(kcr(m)*fmd))
    'Bemonstering langs de staaf: 16 vakken en beide kanten van de knoop en van de puntlast.
    NS = 16
    ε_s = Lm*10^-6
    sp(i) = cl(if(i ≤ NS; Lm*i/NS; if(i ≡ NS + 1; SC - ε_s; if(i ≡ NS + 2; SC + ε_s; if(i ≡ NS + 3; s_P - ε_s; s_P + ε_s)))); ε_s; Lm - ε_s)
    'Uiterste waarden over de bemonsterde doorsneden, als functie: een functie wordt één keer vertaald, een regel in een lus bij elke doorgang.
    uNM2(m; n) = max(uS(m; n); uB(m; n))
    uNMx(x) = uNM2(Mx(x); Nx(x))
    uKx(x) = uK(Mx(x); Nx(x))
    'Waar N van teken wisselt, gaat de kiptoets van (6.35) met het kwadraat over in (6.33); daar telt het moment bij N = 0 (lineair tussen twee punten).
    xa(i) = max(Lm*i/NS; ε_s)
    xN0(i) = cl(xa(i) + (Lm*(i + 1)/NS - xa(i))*Nx(xa(i))/(Nx(xa(i)) - Nx(Lm*(i + 1)/NS)); ε_s; Lm - ε_s)
    kN0(i) = if(Nx(xa(i))*Nx(Lm*(i + 1)/NS) < 0; σm(Mx(xN0(i)))/(kcr(Mx(xN0(i)))*fmd); 0)
    cMmax(z) = max(abs(Mx(sp(0))); abs(Mx(sp(1))); abs(Mx(sp(2))); abs(Mx(sp(3))); abs(Mx(sp(4))); abs(Mx(sp(5))); abs(Mx(sp(6))); abs(Mx(sp(7))); abs(Mx(sp(8))); abs(Mx(sp(9))); abs(Mx(sp(10))); abs(Mx(sp(11))); abs(Mx(sp(12))); abs(Mx(sp(13))); abs(Mx(sp(14))); abs(Mx(sp(15))); abs(Mx(sp(16))); abs(Mx(sp(17))); abs(Mx(sp(18))); abs(Mx(sp(19))); abs(Mx(sp(20))))
    cNmin(z) = min(Nx(sp(0)); Nx(sp(1)); Nx(sp(2)); Nx(sp(3)); Nx(sp(4)); Nx(sp(5)); Nx(sp(6)); Nx(sp(7)); Nx(sp(8)); Nx(sp(9)); Nx(sp(10)); Nx(sp(11)); Nx(sp(12)); Nx(sp(13)); Nx(sp(14)); Nx(sp(15)); Nx(sp(16)); Nx(sp(17)); Nx(sp(18)); Nx(sp(19)); Nx(sp(20)))
    cVmax(z) = max(abs(Vx(sp(0))); abs(Vx(sp(1))); abs(Vx(sp(2))); abs(Vx(sp(3))); abs(Vx(sp(4))); abs(Vx(sp(5))); abs(Vx(sp(6))); abs(Vx(sp(7))); abs(Vx(sp(8))); abs(Vx(sp(9))); abs(Vx(sp(10))); abs(Vx(sp(11))); abs(Vx(sp(12))); abs(Vx(sp(13))); abs(Vx(sp(14))); abs(Vx(sp(15))); abs(Vx(sp(16))); abs(Vx(sp(17))); abs(Vx(sp(18))); abs(Vx(sp(19))); abs(Vx(sp(20))))
    cNMmax(z) = max(uNMx(sp(0)); uNMx(sp(1)); uNMx(sp(2)); uNMx(sp(3)); uNMx(sp(4)); uNMx(sp(5)); uNMx(sp(6)); uNMx(sp(7)); uNMx(sp(8)); uNMx(sp(9)); uNMx(sp(10)); uNMx(sp(11)); uNMx(sp(12)); uNMx(sp(13)); uNMx(sp(14)); uNMx(sp(15)); uNMx(sp(16)); uNMx(sp(17)); uNMx(sp(18)); uNMx(sp(19)); uNMx(sp(20)))
    cKPmax(z) = max(uKx(sp(0)); uKx(sp(1)); uKx(sp(2)); uKx(sp(3)); uKx(sp(4)); uKx(sp(5)); uKx(sp(6)); uKx(sp(7)); uKx(sp(8)); uKx(sp(9)); uKx(sp(10)); uKx(sp(11)); uKx(sp(12)); uKx(sp(13)); uKx(sp(14)); uKx(sp(15)); uKx(sp(16)); uKx(sp(17)); uKx(sp(18)); uKx(sp(19)); uKx(sp(20)); kN0(0); kN0(1); kN0(2); kN0(3); kN0(4); kN0(5); kN0(6); kN0(7); kN0(8); kN0(9); kN0(10); kN0(11); kN0(12); kN0(13); kN0(14); kN0(15))
    'Knik (6.23)/(6.24) en kip (6.35) zijn staaftoetsen: naast de toets per doorsnede ook de grootste drukkracht samen met het grootste moment langs de staaf (bij kip de grootste σ_m/(k_crit·f_m,d)).
    rK(x) = σm(Mx(x))/(kcr(Mx(x))*fmd)
    cKr(z) = max(rK(sp(0)); rK(sp(1)); rK(sp(2)); rK(sp(3)); rK(sp(4)); rK(sp(5)); rK(sp(6)); rK(sp(7)); rK(sp(8)); rK(sp(9)); rK(sp(10)); rK(sp(11)); rK(sp(12)); rK(sp(13)); rK(sp(14)); rK(sp(15)); rK(sp(16)); rK(sp(17)); rK(sp(18)); rK(sp(19)); rK(sp(20)); kN0(0); kN0(1); kN0(2); kN0(3); kN0(4); kN0(5); kN0(6); kN0(7); kN0(8); kN0(9); kN0(10); kN0(11); kN0(12); kN0(13); kN0(14); kN0(15))
    uKst(ro; n) = if(n < 0; ro^2 - σn(n)/(k_cz*fcd); 0)
    'Keep (6.60) tot en met (6.63): uitkeping aan de steunpuntzijde, rechthoekig (i = 0), x tot het midden van de oplegging.
    h_ef = h_sp - t_keep
    α_v = h_ef/h_sp
    k_v = if(t_keep > 0 mm; min(1; k_n/(sqrt(h_sp/(1 mm))*(sqrt(α_v*(1 - α_v)) + 0.8*(a_opl/2)/h_sp*sqrt(1/α_v - α_v^2)))); 1)
    h_efn = h_ef/(1 m)
    a_on = a_opl/(1 m)
    a_kn = a_nok/(1 m)
    'Zadelvlak aan de voet: een keep t_keep loodrecht op de staaf laat een horizontaal zadelvlak van t_keep/sin β over, ten hoogste de breedte van de muurplaat.
    l_zv = if(t_keep > 0 mm; min(a_opl; t_keep/sb); a_opl)
    a_zn = l_zv/(1 m)
    'Q_k op de ongunstigste plaats. Per deel van de staaf (bij het knieschot of de hanenbalk twee delen) negen plaatsen op 0,1 tot 0,9 van het deel, dan rond de beste zes keer verfijnd met halverende stappen vanaf 0,06 van het deel. Gezocht in γ_G·G + γ_Q·Q_k (6.10b): het grootste moment onder de last (veldmoment) en het grootste moment bij het knieschot of de hanenbalk (steunmoment). De combinatie met Q_k rekent met beide plaatsen.
    SC_q = if(systeem ≡ 2; SCk; if(systeem ≡ 3 and z_t > 0; SCt; Lm))
    n_sg = if(SC_q < Lm; 2; 1)
    s_P0 = s_P
    qF = s_Q
    qS = s_Q
    #def q_doel()
    s_P = xq
    kap_los()
    r = 1
    kap_staaf()
    oF = Mx(xq)
    oS = abs(Mx(SC_q))
    #end def
    #if puntlast ≡ 1
        fg = γ_G
        fq = γ_Q
        v = 2
        bF = -10^9
        bS = -10^9
        #for j = 1 : n_sg
            #for i = 1 : 9
                xq = if(j ≡ 1; 0; SC_q) + if(j ≡ 1; SC_q; Lm - SC_q)*i/10
                q_doel()
                qF = if(oF > bF; xq; qF)
                bF = max(bF; oF)
                qS = if(oS > bS; xq; qS)
                bS = max(bS; oS)
            #loop
        #loop
        h_q = 0.06*if(qF ≤ SC_q; SC_q; Lm - SC_q)
        #for it = 1 : 6
            xq = cl(qF - h_q; ε_s; Lm - ε_s)
            q_doel()
            o_1 = oF
            x_1 = xq
            xq = cl(qF + h_q; ε_s; Lm - ε_s)
            q_doel()
            qF = if(oF > max(o_1; bF); xq; if(o_1 > bF; x_1; qF))
            bF = max(bF; o_1; oF)
            h_q = h_q/2
        #loop
        #if n_sg ≡ 2
            h_q = 0.06*if(qS ≤ SC_q; SC_q; Lm - SC_q)
            #for it = 1 : 6
                xq = cl(qS - h_q; ε_s; Lm - ε_s)
                q_doel()
                o_1 = oS
                x_1 = xq
                xq = cl(qS + h_q; ε_s; Lm - ε_s)
                q_doel()
                qS = if(oS > max(o_1; bS); xq; if(o_1 > bS; x_1; qS))
                bS = max(bS; o_1; oS)
                h_q = h_q/2
            #loop
        #end if
    #end if
    'Kandidaten: het grootste veldmoment, het grootste steunmoment en Q_k direct onder en boven het knieschot of de hanenbalk (0,001·L ervandaan).
    δ_q = 0.001*Lm
    nQ = if(puntlast ≡ 1; if(n_sg ≡ 2; 4; 1); 1)
    qpos(jq) = if(jq ≡ 1; qF; if(jq ≡ 2; qS; if(jq ≡ 3; SC_q - δ_q; SC_q + δ_q)))
    j_nm = 1
    j_kp = 1
    'Maxima over de combinaties, met de maatgevende combinatie.
    g_unm = 0
    g_knm = 1
    g_ukp = 0
    g_kkp = 1
    g_uV = 0
    g_kV = 1
    g_τ = 0
    g_uk = 0
    g_kk = 1
    g_τk = 0
    g_uo = 0
    g_ko = 1
    g_σA = 0
    g_σB = 0
    g_σC = 0
    g_Azmax = 0
    g_Azmin = 0
    g_Axmax = 0
    g_Axmin = 0
    g_Bzmax = 0
    g_Bzmin = 0
    g_Bxmax = 0
    g_Czmax = 0
    g_Czmin = 0
    g_Tmax = 0
    g_Tmin = 0
    d_u = 0
    d_m = 0
    d_n = 0
    d_s = 0
    d_r = 1
    e_u = 0
    e_m = 0
    e_n = 0
    e_s = 0
    e_r = 1
    #show
    'Partiële factoren bij CC'CC' (tabel NB.4 en NB.5 – A1.2(B)): 6.10a met γ<sub>G</sub> = 'γ_Ga', 6.10b met γ<sub>G</sub> = 'γ_G' en γ<sub>Q</sub> = 'γ_Q', gunstig 'γ_Gi'. ψ<sub>0</sub> = 0 voor dak, sneeuw en wind: één veranderlijke per combinatie.<span class="alleen-scherm"></span>
    '<i>Per combinatie de grootste waarden langs de spoor'if(systeem ≡ 3; " (beide sporen)"; "")': M en V in absolute waarde, N de grootste druk; de UC van normaalkracht met buiging (6.17)/(6.19) en knik (6.23)/(6.24), van kip (6.33)/(6.35), van afschuiving (6.13) en van de opleggingen.</i><span class="alleen-scherm"></span>
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Combinatie</th><th style="padding:1px 4px; text-align:right;">k<sub>mod</sub></th><th style="padding:1px 4px; text-align:right;">M<sub>d</sub> (kNm)</th><th style="padding:1px 4px; text-align:right;">N<sub>d</sub> (kN)</th><th style="padding:1px 4px; text-align:right;">V<sub>d</sub> (kN)</th><th style="padding:1px 4px; text-align:right;">N+M</th><th style="padding:1px 4px; text-align:right;">kip</th><th style="padding:1px 4px; text-align:right;">V</th><th style="padding:1px 4px; text-align:right;">opl.</th></tr>
    #for kk = 1 : 15
        #hide
        k = if(kk ≤ 13; kk; if(kk ≡ 14; g_knm; g_kkp))
        doe = act(k)
        #show
        #if doe ≡ 1
            #hide
            fg = fGk(k)
            v = kv(k)
            fq = γ_Q*bool(v > 0)
            kmd = kmk(k)
            fmd = kmd*f_mk*k_hn/γ_M
            ftd = kmd*f_t0k*k_hn/γ_M
            fcd = kmd*f_c0k/γ_M
            fvd = kmd*f_vk/γ_M
            fc90d = kmd*f_c90k/γ_M
            fcad = fcd/(fcd/fc90d*cb^2 + sb^2)
            'Q_k op het steunpunt geeft γ_Q·Q_k/2 meer dan in het veld.
            dPQ = fq*bool(v ≡ 2)*bool(puntlast ≡ 1)*QQ/2
            'Vrije Q_k: beide gezochte plaatsen; in de extra doorgangen de maatgevende.
            vq = bool(v ≡ 2)*bool(puntlast ≡ 1)
            n_q = if(vq ≡ 1 and kk ≤ 13; nQ; 1)
            c_M = 0
            c_N = 0
            c_V = 0
            c_Vv = 0
            c_nm = 0
            c_kp = 0
            σ_A = 0
            σ_B = 0
            σ_C = 0
            #for jq = 1 : n_q
                s_P = if(vq ≡ 1; qpos(if(kk ≤ 13; jq; if(kk ≡ 14; j_nm; j_kp))); s_P0)
                kap_los()
                q_nm = 0
                q_kp = 0
                #for r = 1 : n_r
                    kap_staaf()
                    c_Vv = max(c_Vv; abs(Vx(ε_s)))
                    c_M = max(c_M; cMmax(0))
                    c_N = min(c_N; cNmin(0))
                    c_V = max(c_V; cVmax(0))
                    'De staaf als geheel: grootste |M| met de grootste drukkracht (knik), grootste σ_m/(k_crit·f_m,d) met de grootste drukkracht (kip).
                    M_st = cMmax(0)
                    N_st = min(cNmin(0); 0)
                    u_nme = uNM2(M_st; N_st)
                    u_kpe = uKst(cKr(0); N_st)
                    q_nm = max(q_nm; cNMmax(0); u_nme)
                    q_kp = max(q_kp; cKPmax(0); u_kpe)
                    'De maatgevende doorsnede alleen in de twee extra doorgangen; −1 als plaats: de staaftoets.
                    #if kk ≡ 14
                        #for i = 0 : NS + 4
                            x_i = sp(i)
                            unm = uNMx(x_i)
                            d_m = if(unm > d_u; Mx(x_i); d_m)
                            d_n = if(unm > d_u; Nx(x_i); d_n)
                            d_s = if(unm > d_u; x_i; d_s)
                            d_r = if(unm > d_u; r; d_r)
                            d_u = max(d_u; unm)
                        #loop
                        d_m = if(u_nme > d_u; M_st; d_m)
                        d_n = if(u_nme > d_u; N_st; d_n)
                        d_s = if(u_nme > d_u; -1; d_s)
                        d_r = if(u_nme > d_u; r; d_r)
                        d_u = max(d_u; u_nme)
                    #else if kk ≡ 15
                        ρ_b = 0
                        ρ_x = ε_s
                        #for i = 0 : NS + 4
                            x_i = sp(i)
                            ukp = uKx(x_i)
                            e_m = if(ukp > e_u; Mx(x_i); e_m)
                            e_n = if(ukp > e_u; Nx(x_i); e_n)
                            e_s = if(ukp > e_u; x_i; e_s)
                            e_r = if(ukp > e_u; r; e_r)
                            e_u = max(e_u; ukp)
                            ρ_x = if(rK(x_i) > ρ_b; x_i; ρ_x)
                            ρ_b = max(ρ_b; rK(x_i))
                        #loop
                        #for i = 0 : NS - 1
                            ukp = kN0(i)
                            e_m = if(ukp > e_u; Mx(xN0(i)); e_m)
                            e_n = if(ukp > e_u; 0; e_n)
                            e_s = if(ukp > e_u; xN0(i); e_s)
                            e_r = if(ukp > e_u; r; e_r)
                            e_u = max(e_u; ukp)
                            ρ_x = if(ukp > ρ_b; xN0(i); ρ_x)
                            ρ_b = max(ρ_b; ukp)
                        #loop
                        e_m = if(u_kpe > e_u; Mx(ρ_x); e_m)
                        e_n = if(u_kpe > e_u; N_st; e_n)
                        e_s = if(u_kpe > e_u; -1; e_s)
                        e_r = if(u_kpe > e_u; r; e_r)
                        e_u = max(e_u; u_kpe)
                    #end if
                #loop
                j_nm = if(kk ≤ 13 and vq ≡ 1 and q_nm > c_nm; jq; j_nm)
                j_kp = if(kk ≤ 13 and vq ≡ 1 and q_kp > c_kp; jq; j_kp)
                c_nm = max(c_nm; q_nm)
                c_kp = max(c_kp; q_kp)
                'Opleggingen: de voet, bovenin (bij het A-spant de rechter voet) en het knieschot; alleen druk.
                σ_A = max(σ_A; max(R_Az + dPQ; 0)/(b_n*a_zn)/1000)
                σ_B = max(σ_B; max(R_Bn + dPQ*if(rol ≡ 1; 1; cb); 0)/(b_n*if(systeem ≡ 3; a_zn; a_kn))/1000)
                σ_C = max(σ_C; max(R_Cz + dPQ; 0)/(b_n*a_on)/1000)
                #if kk ≤ 13
                    g_Azmax = max(g_Azmax; R_Az + dPQ)
                    g_Azmin = min(g_Azmin; R_Az)
                    g_Axmax = max(g_Axmax; R_Ax)
                    g_Axmin = min(g_Axmin; R_Ax)
                    g_Bzmax = max(g_Bzmax; R_Bz + dPQ)
                    g_Bzmin = min(g_Bzmin; R_Bz)
                    g_Bxmax = max(g_Bxmax; R_Bx + dPQ*sb*bool(rol ≡ 2))
                    g_Czmax = max(g_Czmax; R_Cz + dPQ)
                    g_Czmin = min(g_Czmin; R_Cz)
                    g_Tmax = max(g_Tmax; T_t)
                    g_Tmin = min(g_Tmin; T_t)
                #end if
            #loop
            c_V = c_V + dPQ*cb
            c_Vv = c_Vv + dPQ*cb
            τ_c = 1.5*c_V/(b_n*h_n)/1000
            u_V = τ_c/fvd
            τ_kc = 1.5*c_Vv/(b_n*h_efn)/1000
            u_kp = if(t_keep > 0 mm; τ_kc/(k_v*fvd); 0)
            u_o = max(σ_A/fcad; σ_B/if(rol ≡ 2 and systeem ≠ 3; fc90d; fcad); σ_C/fcad)
            #if kk ≤ 13
                g_knm = if(c_nm > g_unm; k; g_knm)
                g_unm = max(g_unm; c_nm)
                g_kkp = if(c_kp > g_ukp; k; g_kkp)
                g_ukp = max(g_ukp; c_kp)
                g_τ = if(u_V > g_uV; τ_c; g_τ)
                g_kV = if(u_V > g_uV; k; g_kV)
                g_uV = max(g_uV; u_V)
                g_τk = if(u_kp > g_uk; τ_kc; g_τk)
                g_kk = if(u_kp > g_uk; k; g_kk)
                g_uk = max(g_uk; u_kp)
                g_σA = if(u_o > g_uo; σ_A; g_σA)
                g_σB = if(u_o > g_uo; σ_B; g_σB)
                g_σC = if(u_o > g_uo; σ_C; g_σC)
                g_ko = if(u_o > g_uo; k; g_ko)
                g_uo = max(g_uo; u_o)
            #end if
            #show
            #if kk ≤ 13
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'k': 'fg'·G'if(v > 0; " + "; "")''if(v > 0; γ_Q; "")''if(v > 0; "·"; "")''if(v > 0; vnaam(v); "")'</td><td style="padding:0 4px; text-align:right;">'kmd'</td><td style="padding:0 4px; text-align:right;">'round(c_M*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(c_N*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(c_V*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(c_nm*1000)/1000'</td><td style="padding:0 4px; text-align:right;">'round(c_kp*1000)/1000'</td><td style="padding:0 4px; text-align:right;">'round(u_V*1000)/1000'</td><td style="padding:0 4px; text-align:right;">'round(u_o*1000)/1000'</td></tr>
            #end if
        #end if
    #loop
    '</table>
    #if puntlast ≡ 1
        #if n_sg ≡ 2
            '<i>Q<sub>k</sub> staat voor M en N op de plaats met het grootste veldmoment ('round(qF*cb*100)/100' m horizontaal vanaf de voet) en op de plaats met het grootste moment bij 'if(systeem ≡ 2; "het knieschot"; "de hanenbalk")' ('round(qS*cb*100)/100' m), beide gezocht langs de spoor, en direct onder en boven 'if(systeem ≡ 2; "het knieschot"; "de hanenbalk")'; de combinatie geeft het grootste van deze vier. Voor V en de opleggingen is γ<sub>Q</sub>·Q<sub>k</sub>/2 opgeteld, zoals met de last op het steunpunt.</i><span class="alleen-scherm"></span>
            x_Q = round(qpos(j_nm)*cb*100)/100*m'<span class="alleen-scherm"></span><span class="alleen-afdruk"></span>'
        #else
            '<i>Q<sub>k</sub> staat voor M en N op de plaats met het grootste veldmoment, gezocht langs de 'if(zh ≡ 1; "hoekkeper"; "spoor")' ('round(qF*cb*100)/100' m horizontaal vanaf de voet). Voor V en de opleggingen is γ<sub>Q</sub>·Q<sub>k</sub>/2 opgeteld, zoals met de last op het steunpunt.</i><span class="alleen-scherm"></span>
        #end if
    #end if
    '<i>N+M en kip zijn per doorsnede getoetst en voor de staaf als geheel met de grootste drukkracht samen met het grootste moment (knik en kip zijn staaftoetsen).</i><span class="alleen-scherm"></span>

    # 4. Reacties

    '<i>Karakteristiek per belastinggeval en per 'if(zh ≡ 1; "hoekkeper"; if(systeem ≡ 3; "spant"; "spoor"))', in kN: verticaal omhoog positief, H naar buiten positief'if(rol ≡ 2 and systeem ≠ 3; ", bovenin de reactie loodrecht op de spoor en de horizontale kracht die de spoor uitoefent"; "")'. Per strekkende meter muurplaat delen door de h.o.h.</i><span class="alleen-scherm"></span>
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    #if systeem ≡ 3
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Geval</th><th style="padding:1px 4px; text-align:right;">R<sub>links</sub></th><th style="padding:1px 4px; text-align:right;">H<sub>links</sub></th><th style="padding:1px 4px; text-align:right;">R<sub>rechts</sub></th><th style="padding:1px 4px; text-align:right;">T 'if(z_t > 0; "hanenbalk"; "trekband")'</th></tr>
    #else if systeem ≡ 2
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Geval</th><th style="padding:1px 4px; text-align:right;">R<sub>voet</sub></th><th style="padding:1px 4px; text-align:right;">H<sub>voet</sub></th><th style="padding:1px 4px; text-align:right;">R<sub>knieschot</sub></th><th style="padding:1px 4px; text-align:right;">R<sub>boven</sub></th><th style="padding:1px 4px; text-align:right;">H<sub>boven</sub></th></tr>
    #else
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Geval</th><th style="padding:1px 4px; text-align:right;">R<sub>voet</sub></th><th style="padding:1px 4px; text-align:right;">H<sub>voet</sub></th><th style="padding:1px 4px; text-align:right;">R<sub>boven</sub></th><th style="padding:1px 4px; text-align:right;">H<sub>boven</sub></th></tr>
    #end if
    #for v = 0 : 10
        #if vdoe(v) ≡ 1
            #hide
            fg = bool(v ≡ 0)
            fq = bool(v > 0)
            s_P = if(v ≡ 2 and puntlast ≡ 1; qF; s_P0)
            kap_los()
            #show
            #if systeem ≡ 3
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'vnaam(v)'</td><td style="padding:0 4px; text-align:right;">'round(R_Az*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(R_Ax*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(R_Bz*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(T_t*100)/100'</td></tr>
            #else if systeem ≡ 2
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'vnaam(v)'</td><td style="padding:0 4px; text-align:right;">'round(R_Az*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(R_Ax*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(R_Cz*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(R_Bn*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(R_Bx*100)/100'</td></tr>
            #else
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'vnaam(v)'</td><td style="padding:0 4px; text-align:right;">'round(R_Az*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(R_Ax*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(R_Bn*100)/100'</td><td style="padding:0 4px; text-align:right;">'round(R_Bx*100)/100'</td></tr>
            #end if
        #end if
    #loop
    '</table>
    #hide
    R_voet,d = g_Azmax*kN
    R_voet,min = g_Azmin*kN
    H_voet,d = max(g_Axmax; -g_Axmin)*kN
    R_rechts,d = g_Bzmax*kN
    R_rechts,min = g_Bzmin*kN
    T_d = g_Tmax*kN
    T_min = g_Tmin*kN
    R_knieschot,d = g_Czmax*kN
    R_knieschot,min = g_Czmin*kN
    R_boven,d = g_Bzmax*kN
    R_boven,min = g_Bzmin*kN
    H_boven,d = g_Bxmax*kN
    #show
    '<b>Rekenwaarden</b><span class="alleen-scherm">, het uiterste over de combinaties uit 3</span>:
    R_voet,d', grootste, verticaal<span class="kolom-4"></span>'
    #if g_Azmin < 0
        R_voet,min', trek: verankeren<span class="kolom-4"></span>'
    #end if
    H_voet,d', horizontaal<span class="kolom-4"></span>'
    #if systeem ≡ 3
        R_rechts,d', rechter voet<span class="kolom-4"></span>'
        #if g_Bzmin < 0
            R_rechts,min', trek: verankeren<span class="kolom-4"></span>'
        #end if
        T_d', trekkracht<span class="kolom-4"></span>'
        #if g_Tmin < 0
            T_min', druk<span class="kolom-4"></span>'
        #end if
    #else
        #if systeem ≡ 2
            R_knieschot,d'<span class="kolom-4"></span>'
            #if g_Czmin < 0
                R_knieschot,min', trek<span class="kolom-4"></span>'
            #end if
        #end if
        R_boven,d', verticaal<span class="kolom-4"></span>'
        #if g_Bzmin < 0
            R_boven,min', trek: verankeren<span class="kolom-4"></span>'
        #end if
        #if rol ≡ 2
            H_boven,d', horizontaal<span class="kolom-4"></span>'
        #end if
    #end if
    '<i class="ook-afdruk">Niet in dit blad getoetst: de verbinding met de muurplaat (spatkracht, verankering)'if(systeem ≡ 3; " en de trekband of hanenbalk zelf"; "")'.</i>

    # 5. Toetsing UGT

    #hide
    'De maatgevende combinatie voor normaalkracht met buiging, met haar sterkten.
    k_mod = kmk(g_knm)
    M_d = d_m*kN*m
    N_d = d_n*kN
    λ_rel,y = λ_rely
    k_c,y = k_cy
    λ_rel,z = λ_relz
    k_c,z = k_cz
    ℓ_y = L_cy*m
    #show
    '<h6>5.1 Normaalkracht en buiging — §6.2.3/§6.2.4 en knik §6.3.2</h6>
    ℓ_y', kniklengte in het vlak<span class="kolom-4"></span>'
    λ_rel,y', (6.21)<span class="kolom-4"></span>'
    k_c,y', (6.25)<span class="kolom-4"></span>'
    λ_rel,z', (6.22), ℓ<sub>z</sub> = l<sub>st</sub><span class="kolom-4"></span>'
    k_c,z', (6.26)<span class="kolom-4"></span>'
    #if d_s < 0
        'Maatgevend: combinatie 'g_knm''if(systeem ≡ 3; if(d_r ≡ 1; ", linker spoor"; ", rechter spoor"); "")', de staaf als geheel:<span class="alleen-scherm"> het grootste moment samen met de grootste drukkracht langs de 'if(zh ≡ 1; "hoekkeper"; "spoor")' (knik is een staaftoets):</span>
    #else
        'Maatgevend: combinatie 'g_knm''if(systeem ≡ 3; if(d_r ≡ 1; ", linker spoor"; ", rechter spoor"); "")', op 'round(d_s*100)/100' m langs de 'if(zh ≡ 1; "hoekkeper"; "spoor")' vanaf de voet:
    #end if
    k_mod'<span class="kolom-4"></span>'
    M_d'<span class="kolom-4"></span>'
    N_d', + trek<span class="kolom-4"></span>'
    σ_m,d = abs(M_d)/W to N/mm^2'<span class="alleen-scherm"></span>'
    σ_m,d'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    f_m,d = k_mod*f_m,k*k_h/γ_M'<span class="alleen-scherm"></span>'
    f_m,d'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if d_n ≥ 0
        σ_t,0,d = N_d/A to N/mm^2'<span class="alleen-scherm"></span>'
        σ_t,0,d'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        f_t,0,d = k_mod*f_t,0,k*k_h/γ_M'<span class="alleen-scherm"></span>'
        f_t,0,d'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        UC_617 = σ_t,0,d/f_t,0,d + σ_m,d/f_m,d', (6.17)<span class="alleen-scherm"></span>'
        UC_617', (6.17)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        #hide
        UC_619 = 0
        UC_623 = 0
        UC_624 = 0
        #show
    #else
        σ_c,0,d = -N_d/A to N/mm^2'<span class="alleen-scherm"></span>'
        σ_c,0,d'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        f_c,0,d = k_mod*f_c,0,k/γ_M'<span class="alleen-scherm"></span>'
        f_c,0,d'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        UC_619 = (σ_c,0,d/f_c,0,d)^2 + σ_m,d/f_m,d', (6.19)<span class="alleen-scherm"></span>'
        UC_619', (6.19)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        UC_623 = σ_c,0,d/(k_c,y*f_c,0,d) + σ_m,d/f_m,d', (6.23)<span class="alleen-scherm"></span>'
        UC_623', (6.23)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        UC_624 = σ_c,0,d/(k_c,z*f_c,0,d) + 0.7*σ_m,d/f_m,d', (6.24), k<sub>m</sub> = 0,7<span class="alleen-scherm"></span>'
        UC_624', (6.24)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        #hide
        UC_617 = 0
        #show
    #end if
    UC_NM = max(UC_617; UC_619; UC_623; UC_624)'<span class="alleen-scherm"></span>'
    #if UC_NM ≤ 1.0
        '<span class="alleen-scherm">UC<sub>N+M</sub> = 'UC_NM'</span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        '<span class="alleen-scherm">UC<sub>N+M</sub> = 'UC_NM'</span><span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    '<h6>5.2 Kip — §6.3.3 (6.33)/(6.35)</h6>
    #hide
    l_ef,boven = l_eft*m
    k_crit,boven = k_crt
    l_ef,onder = l_efb*m
    k_crit,onder = k_crb
    UC_kip = e_u
    #show
    l_ef,boven', 0,9·l<sub>st</sub> + 2h<span class="kolom-4"></span>'
    k_crit,boven', (6.34)<span class="kolom-4"></span>'
    l_ef,onder', 0,9·l − 0,5h<span class="kolom-4"></span>'
    k_crit,onder'<span class="kolom-4"></span>'
    #if e_s < 0
        'Maatgevend: combinatie 'g_kkp''if(systeem ≡ 3; if(e_r ≡ 1; ", linker spoor"; ", rechter spoor"); "")', de staaf als geheel, 'if(e_m ≥ 0; "bovenrand gedrukt"; "onderrand gedrukt")': het moment met de grootste σ<sub>m,d</sub>/(k<sub>crit</sub>·f<sub>m,d</sub>), M<sub>d</sub> = 'round(e_m*100)/100' kNm, samen met de grootste drukkracht N<sub>d</sub> = 'round(e_n*100)/100' kN.
    #else
        'Maatgevend: combinatie 'g_kkp''if(systeem ≡ 3; if(e_r ≡ 1; ", linker spoor"; ", rechter spoor"); "")', op 'round(e_s*100)/100' m, 'if(e_m ≥ 0; "bovenrand gedrukt"; "onderrand gedrukt")': M<sub>d</sub> = 'round(e_m*100)/100' kNm, N<sub>d</sub> = 'round(e_n*100)/100' kN.
    #end if
    #if e_n < 0
        UC_kip', (σ<sub>m,d</sub>/(k<sub>crit</sub>·f<sub>m,d</sub>))² + σ<sub>c,0,d</sub>/(k<sub>c,z</sub>·f<sub>c,0,d</sub>) (6.35)'
    #else
        UC_kip', σ<sub>m,d</sub>/(k<sub>crit</sub>·f<sub>m,d</sub>) (6.33)'
    #end if
    #if UC_kip ≤ 1.0
        '<span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        '<span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    '<h6>5.3 Afschuiving — §6.1.7 (6.13), k<sub>cr</sub> = 1,0 (NB)</h6>
    #hide
    k_mod,V = kmk(g_kV)
    τ_d = g_τ*(N/mm^2)
    #show
    'Maatgevend: combinatie 'g_kV'.
    τ_d', 1,5·V<sub>d</sub>/(k<sub>cr</sub>·b·h)<span class="kolom-4"></span>'
    f_v,d = k_mod,V*f_v,k/γ_M'<span class="alleen-scherm"></span>'
    f_v,d'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    UC_V = τ_d/f_v,d'<span class="alleen-scherm"></span>'
    UC_V'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if UC_V ≤ 1.0
        '<span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        '<span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if
    #if t_keep > 0 mm
        '<b>Keep aan de voet</b> — §6.5.2 (6.60) en (6.62), uitkeping aan de steunpuntzijde, k<sub>n</sub> = 'k_n', i = 0, x = a<sub>opl</sub>/2; maatgevend combinatie 'g_kk':
        #hide
        k_mod,k = kmk(g_kk)
        τ_d,keep = g_τk*(N/mm^2)
        #show
        h_ef'<span class="kolom-4"></span>'
        k_v'<span class="kolom-4"></span>'
        τ_d,keep', 1,5·V<sub>d</sub>/(b·h<sub>ef</sub>)<span class="kolom-4"></span>'
        f_v,d,keep = k_mod,k*f_v,k/γ_M'<span class="alleen-scherm"></span>'
        f_v,d,keep'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        UC_keep = τ_d,keep/(k_v*f_v,d,keep)'<span class="alleen-scherm"></span>'
        UC_keep'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
        #if UC_keep ≤ 1.0
            '<span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
        #else
            '<span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
        #end if
    #else
        #hide
        UC_keep = 0
        #show
    #end if

    '<h6>5.4 Opleggingen — §6.1.5 met 6.2.2 (6.16)</h6>
    '<i>De reactie op een horizontaal zadelvlak staat onder 90° − β op de vezel: f<sub>c,α,d</sub> = f<sub>c,0,d</sub>/((f<sub>c,0,d</sub>/(k<sub>c,90</sub>·f<sub>c,90,d</sub>))·cos²β + sin²β) met k<sub>c,90</sub> = 1,0 en het zadelvlak als contactlengte, zonder de 30 mm uitbreiding. Aan de voet laat een keep t<sub>keep</sub> loodrecht op de staaf een zadelvlak van t<sub>keep</sub>/sin β over, ten hoogste de breedte van de muurplaat.'if(rol ≡ 2 and systeem ≠ 3; " Bij de schuine rol staat de reactie bovenin loodrecht op de spoor: §6.1.5 met f<sub>c,90,d</sub>."; "")'</i><span class="alleen-scherm"></span>
    #hide
    k_mod,o = kmk(g_ko)
    f_c,0,d,o = k_mod,o*f_c,0,k/γ_M
    f_c,90,d = k_mod,o*f_c,90,k/γ_M
    β = β_r*rad
    σ_c,voet = g_σA*(N/mm^2)
    σ_c,rechts = g_σB*(N/mm^2)
    σ_c,boven = g_σB*(N/mm^2)
    σ_c,knieschot = g_σC*(N/mm^2)
    UC_opl = g_uo
    #show
    'Maatgevend: combinatie 'g_ko', k<sub>mod</sub> = 'k_mod,o'.
    f_c,α,d = f_c,0,d,o/(f_c,0,d,o/f_c,90,d*cos(β)^2 + sin(β)^2)', (6.16)<span class="alleen-scherm"></span>'
    f_c,α,d', (6.16)<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #if rol ≡ 2 and systeem ≠ 3
        f_c,90,d'<span class="kolom-4"></span>'
    #end if
    l_zv', zadelvlak aan de voet: min(a<sub>opl</sub>; t<sub>keep</sub>/sin β)<span class="kolom-4"></span>'
    σ_c,voet'<span class="kolom-4"></span>'
    #if systeem ≡ 3
        σ_c,rechts'<span class="kolom-4"></span>'
    #else
        #if systeem ≡ 2
            σ_c,knieschot'<span class="kolom-4"></span>'
        #end if
        σ_c,boven'<span class="kolom-4"></span>'
    #end if
    UC_opl'<span class="kolom-4"></span>'
    #if UC_opl ≤ 1.0
        '<span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        '<span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    # 6. Toetsing BGT — doorbuiging (A1.4.3 van de NB bij NEN-EN 1990)

    '<i>Loodrecht op het dakvlak, bij de karakteristieke combinatie met elke veranderlijke apart als overheersende: w<sub>bij</sub> = w<sub>2</sub> + w<sub>3</sub> = k<sub>def</sub>·u<sub>G</sub> + u<sub>Q</sub> (ψ<sub>2</sub> = 0) ≤ ℓ/250 (A1.4.3(3)).</i>
    #if wmax_eis ≡ 1
        '<i>Het uiterlijk is van belang: ook w<sub>max</sub> = (1 + k<sub>def</sub>)·u<sub>G</sub> + u<sub>Q</sub> ≤ ℓ/250 (A1.4.3(4)).</i>
    #end if
    '<i>ℓ is de veldlengte langs de spoor; de zakking ten opzichte van de lijn door de steunpunten van het veld, op 0,3 tot 0,7 van ℓ.'if(puntlast ≡ 1; " Q<sub>k</sub> staat op de plaats met de grootste w<sub>bij</sub>, gezocht langs de staaf; w<sub>max</sub> met dezelfde plaats."; "")'</i><span class="alleen-scherm"></span>
    #hide
    'Zakking × EI op x in een veld [s0, s0 + l] ten opzichte van de koorde: gedeeltelijk gelijkmatig (UW), puntlast (UPl), driehoek (UT), randmomenten (UE).
    F1(a; x; l) = (l - x)/(6*l)*((l^2 - (l - x)^2)*a^2/2 - a^4/4)
    F2(b; x; l) = x/(6*l)*((l^2 - x^2)*b^2/2 - b^4/4)
    UW(x; w; c; d; l) = w*(F1(min(d; x); x; l) - F1(min(c; x); x; l) + F2(l - max(c; x); x; l) - F2(l - max(d; x); x; l))
    UPl(x; p; a; l) = bool(a > 0)*bool(a < l)*if(a ≤ x; p*a*(l - x)*(l^2 - a^2 - (l - x)^2)/(6*l); p*(l - a)*x*(l^2 - (l - a)^2 - x^2)/(6*l))
    UT(x; k; l) = k*(l - x)/(6*l)*((l^2 - (l - x)^2)*x^3/3 - x^5/5) + k*x/(6*l)*(l*(l^2 - x^2)*(l - x)^2/2 - l*(l - x)^4/4 - (l^2 - x^2)*(l - x)^3/3 + (l - x)^5/5)
    UE(x; ml; mr; l) = ml*x*(l - x)*(2*l - x)/(6*l) + mr*x*(l - x)*(l + x)/(6*l)
    Uf(x; s0; l) = UW(x; cb*C_V0; 0; l; l) + UW(x; C_NA; cl(0 - s0; 0; l); cl(C_SW - s0; 0; l); l) + UW(x; C_NB; cl(C_SW - s0; 0; l); cl(Lm - s0; 0; l); l) + UT(x; (cb*C_VT + C_NT)/Lm; l) + UPl(x; cb*C_P; s_P - s0; l) + UPl(x; -QP; SC - s0; l) + UE(x; Mx(s0); Mx(s0 + l); l)
    'Grootste zakking in een veld op 0,3 tot 0,7 van de lengte, in m; 0,4 en 0,6 vangen het uiterste van een veld met een ingeklemd einde.
    uF(s0; l) = max(abs(Uf(0.3*l; s0; l)); abs(Uf(0.4*l; s0; l)); abs(Uf(0.45*l; s0; l)); abs(Uf(0.5*l; s0; l)); abs(Uf(0.55*l; s0; l)); abs(Uf(0.6*l; s0; l)); abs(Uf(0.7*l; s0; l)))/EI
    n_f = if(systeem ≡ 2; 2; 1)
    'Q_k voor de doorbuiging: gezocht zoals voor de momenten, met w_bij = k_def·u_G + u_Q als maat; w_max rekent met dezelfde plaats.
    #def w_doel()
    s_P = xq
    kap_los()
    oW = 0
    #for r = 1 : n_r
        kap_staaf()
        #for f = 1 : n_f
            s_0 = if(f ≡ 1; 0; SCk)
            l_f = if(n_f ≡ 1; Lm; if(f ≡ 1; SCk; Lm - SCk))
            oW = max(oW; uF(s_0; l_f)/(l_f/250))
        #loop
    #loop
    #end def
    qW = qF
    #if puntlast ≡ 1
        fg = k_def
        fq = 1
        v = 2
        bW = -1
        #for j = 1 : n_sg
            #for i = 1 : 9
                xq = if(j ≡ 1; 0; SC_q) + if(j ≡ 1; SC_q; Lm - SC_q)*i/10
                w_doel()
                qW = if(oW > bW; xq; qW)
                bW = max(bW; oW)
            #loop
        #loop
        h_q = 0.06*if(qW ≤ SC_q; SC_q; Lm - SC_q)
        #for it = 1 : 6
            xq = cl(qW - h_q; ε_s; Lm - ε_s)
            w_doel()
            o_1 = oW
            x_1 = xq
            xq = cl(qW + h_q; ε_s; Lm - ε_s)
            w_doel()
            qW = if(oW > max(o_1; bW); xq; if(o_1 > bW; x_1; qW))
            bW = max(bW; o_1; oW)
            h_q = h_q/2
        #loop
    #end if
    g_ub = 0
    g_vb = 3
    g_wb = 0
    g_um = 0
    g_vm = 3
    g_wm = 0
    w_b = 0
    u_b = 0
    l_b = Lm
    #show
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Overheersend</th><th style="padding:1px 4px; text-align:right;">w<sub>bij</sub> (mm)</th><th style="padding:1px 4px; text-align:right;">UC</th><th style="padding:1px 4px; text-align:right;">'if(wmax_eis ≡ 1; "w<sub>max</sub> (mm)"; "")'</th><th style="padding:1px 4px; text-align:right;">'if(wmax_eis ≡ 1; "UC"; "")'</th><th style="padding:1px 4px; text-align:right;">ℓ/250 (mm)</th></tr>
    #for jj = 1 : 20
        #hide
        v = floor((jj + 1)/2)
        stp = jj - 2*(v - 1)
        #show
        #if vdoe(v) ≡ 1
            #hide
            fg = if(stp ≡ 1; k_def; 1 + k_def)
            fq = 1
            s_P = if(v ≡ 2 and puntlast ≡ 1; qW; s_P0)
            #if stp ≡ 1 or wmax_eis ≡ 1
                kap_los()
            #end if
            c_u = 0
            c_w = 0
            c_l = Lm
            n_rr = n_r*if(stp ≡ 1 or wmax_eis ≡ 1; 1; 0)
            #for r = 1 : n_rr
                kap_staaf()
                #for f = 1 : n_f
                    s_0 = if(f ≡ 1; 0; SCk)
                    l_f = if(n_f ≡ 1; Lm; if(f ≡ 1; SCk; Lm - SCk))
                    u_j = uF(s_0; l_f)
                    c_w = if(u_j/(l_f/250) > c_u; u_j; c_w)
                    c_l = if(u_j/(l_f/250) > c_u; l_f; c_l)
                    c_u = max(c_u; u_j/(l_f/250))
                #loop
            #loop
            w_b = if(stp ≡ 1; c_w; w_b)
            u_b = if(stp ≡ 1; c_u; u_b)
            l_b = if(stp ≡ 1; c_l; l_b)
            g_vb = if(stp ≡ 1 and c_u > g_ub; v; g_vb)
            g_wb = if(stp ≡ 1 and c_u > g_ub; c_w; g_wb)
            g_ub = if(stp ≡ 1; max(g_ub; c_u); g_ub)
            g_vm = if(stp ≡ 2 and c_u > g_um; v; g_vm)
            g_wm = if(stp ≡ 2 and c_u > g_um; c_w; g_wm)
            g_um = if(stp ≡ 2; max(g_um; c_u); g_um)
            #show
            #if stp ≡ 2
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'vnaam(v)'</td><td style="padding:0 4px; text-align:right;">'round(w_b*10000)/10'</td><td style="padding:0 4px; text-align:right;">'round(u_b*1000)/1000'</td><td style="padding:0 4px; text-align:right;">'if(wmax_eis ≡ 1; round(c_w*10000)/10; "")'</td><td style="padding:0 4px; text-align:right;">'if(wmax_eis ≡ 1; round(c_u*1000)/1000; "")'</td><td style="padding:0 4px; text-align:right;">'round(l_b/250*10000)/10'</td></tr>
            #end if
        #end if
    #loop
    '</table>
    #hide
    UC_wbij = g_ub
    UC_wmax = if(wmax_eis ≡ 1; g_um; 0)
    #show
    UC_wbij', w<sub>bij</sub><span class="kolom-2"></span>'
    #if wmax_eis ≡ 1
        UC_wmax', w<sub>max</sub><span class="kolom-2"></span>'
        'Maatgevend: w<sub>bij</sub> = 'round(g_wb*10000)/10' mm bij 'vnaam(g_vb)'; w<sub>max</sub> = 'round(g_wm*10000)/10' mm bij 'vnaam(g_vm)'.<span class="alleen-scherm"></span>
    #else
        'Maatgevend: w<sub>bij</sub> = 'round(g_wb*10000)/10' mm bij 'vnaam(g_vb)'.<span class="alleen-scherm"></span>
    #end if
    #if max(UC_wbij; UC_wmax) ≤ 1.0
        '<span class="oordeel" style="color: green"> ≤ 1.0 → <b>voldoet</b></span>
    #else
        '<span class="oordeel" style="color: red"> > 1.0 → <b>voldoet niet</b></span>
    #end if

    # 7. Samenvatting

    #hide
    uc_lijst(i) = if(i ≡ 1; UC_NM; if(i ≡ 2; UC_kip; if(i ≡ 3; UC_V; if(i ≡ 4; UC_keep; if(i ≡ 5; UC_opl; if(i ≡ 6; UC_wbij; UC_wmax))))))
    uc_naam(i) = if(i ≡ 1; "normaalkracht en buiging"; if(i ≡ 2; "kip"; if(i ≡ 3; "afschuiving"; if(i ≡ 4; "keep"; if(i ≡ 5; "oplegging"; if(i ≡ 6; "doorbuiging w<sub>bij</sub>"; "doorbuiging w<sub>max</sub>"))))))
    i_max = 1
    #for i = 2 : 7
        i_max = if(uc_lijst(i) > uc_lijst(i_max); i; i_max)
    #loop
    #show
    UC_max = max(UC_NM; UC_kip; UC_V; UC_keep; UC_opl; UC_wbij; UC_wmax)'<span class="alleen-scherm"></span>'
    #if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ('uc_naam(i_max)') ≤ 1,0 → <b>de 'if(zh ≡ 1; "hoekkeper"; if(systeem ≡ 3; "kap"; "spoor"))' voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> ('uc_naam(i_max)') > 1,0 → <b>de 'if(zh ≡ 1; "hoekkeper"; if(systeem ≡ 3; "kap"; "spoor"))' voldoet niet</b></span>
    #end if
#end if
`;
