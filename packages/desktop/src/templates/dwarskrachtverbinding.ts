/**
 * Dwarskrachtverbinding — scharnierende ligger-kolomverbinding met een
 * kopplaat, volgens NEN-EN 1993-1-8 met NB. Invoer zoals het parametrische
 * beeld (DwarskrachtDesigner.tsx); de variabelenamen komen daar exact mee
 * overeen, en het beeld leest de UC's en het oordeel uit dit blad.
 *
 * Kopplaat van partiële hoogte, alleen aan het liggerlijf gelast, met twee
 * bouten per rij in de kolomflens. Getoetst:
 *   • de bouten op afschuiving en stuik (tabel 3.4), in de kopplaat én in de
 *     kolomflens, als groep volgens §3.7(1), met §3.8 bij een lange
 *     verbinding en (3.2) van §3.6.1(10) bij één boutrij (enkelsnedig);
 *     afstanden volgens tabel 3.3;
 *   • de kopplaat op afschuiving, bruto en netto (EN 1993-1-1 6.2.6), en op
 *     blokschuif: de twee buitenstroken (3.10) en het deel tussen de
 *     boutlijnen (3.9);
 *   • het liggerlijf op afschuiving over de laslengte (EN 1993-1-1 6.2.6);
 *   • de twee hoeklassen op het lijf (§4.5.3.3), met §4.5.1(2) en §4.5.2(2);
 *   • het scharniergedrag: de plaat blijft boven de onderflens, (6.32) van
 *     §6.4.2(2) voor de kopplaat of de kolomflens, en de rotatie van het
 *     liggereinde tot de onderflens tegen de kolom komt;
 *   • de passing van de sluitringen (ISO 7089): vrij van de afronding van de
 *     kolom (t_w,c/2 + r_c) en van de las op het liggerlijf (t_w/2 + a√2).
 *
 * Aannames, alle aan de veilige kant:
 *   • draad in het afschuifvlak (A_s);
 *   • bruto afschuiving van de kopplaat met de factor 1,27 voor de buiging in
 *     de plaat;
 *   • in de kolomflens is alleen de onderste rij een eindbout, met e_1
 *     oneindig (de kolom loopt door); de overige rijen zijn binnenste bouten;
 *   • de las en het liggerlijf tellen alleen over het deel van de plaat dat
 *     op het rechte lijf ligt, tussen t_f + r en h − t_f − r;
 *   • de rotatie van het liggereinde is de bovengrens bij een symmetrische
 *     belasting, V·L²/(8EI); het draaipunt ligt aan de onderrand van de plaat.
 *
 * De plaat zit op z_kp onder de bovenkant van de ligger. Een z_kp kleiner dan
 * t_f (ook 0, zoals in een blad van vóór dit veld) telt als een plaat tegen
 * de bovenflens: de hoogste stand, met de grootste h_e en het kortste rechte
 * lijfdeel, dus de veilige kant. Zonder overspanning L_b is de rotatie niet
 * getoetst en voldoet de verbinding niet.
 *
 * Materiaal: tabel 3.1 van NEN-EN 1993-1-1 met A1 (EN 10025-2, t ≤ 40 mm),
 * S355 f_u = 490 N/mm², zoals en1993.ts en de boutberekening. Kopplaat, ligger
 * en kolom hebben dezelfde staalsoort.
 *
 * De keuze "hartlijn" (versprongen of in lijn) is alleen voor de tekening: het
 * blad rekent met dezelfde w en e_2 in elke rij, en zegt dat bij "versprongen"
 * ook op papier. De netto doorsnede en de blokschuif tellen per boutlijn alle
 * n gaten.
 *
 * Niet gerekend: de stijfheidsklasse met S_j,ini (§5.2.2.5). Het scharnier
 * steunt op de detaillering (§5.2.2.1(2)): een dunne plaat die aan (6.32)
 * voldoet, binnen de flenzen blijft en de rotatie kan volgen.
 *
 * Lijfplaat en dubbel hoekstaal: alleen de passing tussen de afrondingen
 * (h_p ≤ h − 2t_f − 2r). De toetsing van die vormen is nog niet uitgewerkt;
 * de slotzin zegt dan "niet getoetst", zodat de rapportkop geen "voldoet"
 * leest.
 *
 * De profielmatrix is geplakt uit profielen.ts (node scripts/check-profielen.mjs
 * --matrix 4,5,6,7,8,9,10,14,16,18,20,21,22,23,24,25,26,27); check-profielen
 * bewaakt dat hij gelijk blijft. scripts/check-dwars.mjs rekent het blad
 * onafhankelijk na, met een handberekening van de standaardinvoer.
 */

export const dwarskrachtverbinding = `"Dwarskrachtverbinding — EN 1993-1-8, scharnierende kopplaat

'<i>Scharnierende oplegging van een ligger op een kolomflens met een kopplaat, lijfplaat of dubbel hoekstaal. De verbinding draagt alleen dwarskracht; de plaat blijft korter dan het lijf, zodat het liggereinde kan draaien. De toetsing is uitgewerkt voor de kopplaat.</i><span class="alleen-scherm"></span>

# 1. Systeem

@select verbindingsvorm "Vorm van de verbinding"
  Kopplaat = 1
  Lijfplaat (schetsplaat) = 2
  Dubbel hoekstaal = 3
@end

@select kolomprofiel "Kolomprofiel"
  HEA 160 = 4
  HEA 180 = 5
  HEA 200 = 6
  HEA 220 = 7
  HEA 240 = 8
  HEA 260 = 9
  HEA 300 = 10
  HEB 160 = 14
  HEB 200 = 16
  HEB 240 = 18
  HEB 300 = 20
@end

@select liggerprofiel "Liggerprofiel"
  IPE 200 = 21
  IPE 240 = 22
  IPE 270 = 23
  IPE 300 = 24
  IPE 330 = 25
  IPE 360 = 26
  IPE 400 = 27
@end

@select staalsoort "Staalsoort"
  S235 = 235
  S275 = 275
  S355 = 355
@end

@select boutkwaliteit "Boutkwaliteit"
  4.6 = 46
  5.6 = 56
  8.8 = 88
  10.9 = 109
@end

@select boutmaat "Boutmaat"
  M12 = 12
  M16 = 16
  M20 = 20
  M24 = 24
@end

@select hartlijn "Hartlijn van de bouten"
  versprongen = 1
  in lijn = 2
@end

# 2. Plaat, bouten en belasting

n_boutrijen = ?', boutrijen<span class="kolom-4"></span>'
e_kp = ?*(mm)', rand boven en onder<span class="kolom-4"></span>'
p_kp = ?*(mm)', steek<span class="kolom-4"></span>'
w_kp = ?*(mm)', bouten h.o.h.<span class="kolom-4"></span>'
t_kp = ?*(mm)', dikte plaat<span class="kolom-4"></span>'
b_kp = ?*(mm)', breedte plaat<span class="kolom-4"></span>'
z_kp = ?*(mm)', bovenkant ligger tot bovenkant plaat<span class="kolom-4"></span>'
a_las = ?*(mm)', keeldikte las<span class="alleen-scherm"> liggerlijf op plaat</span><span class="kolom-4"></span>'
V_Ed = ?*(kN)', dwarskracht<span class="kolom-4"></span>'
L_b = ?*(m)', overspanning ligger<span class="alleen-scherm">, voor de rotatie van het liggereinde</span><span class="kolom-4"></span>'

#hide
'Profieltabel uit profielen.ts: id | h (mm) | b (mm) | t_w (mm) | t_f (mm) | r (mm) | A (cm²) | I_y (cm⁴) | W_el,y (cm³) | W_pl,y (cm³) | i_y (cm) | A_v,z (cm²) | I_z (cm⁴) | W_el,z (cm³) | W_pl,z (cm³) | i_z (cm) | I_t (cm⁴) | I_w (cm⁶)
profielen = [4; 5; 6; 7; 8; 9; 10; 14; 16; 18; 20; 21; 22; 23; 24; 25; 26; 27 |152; 171; 190; 210; 230; 250; 290; 160; 200; 240; 300; 200; 240; 270; 300; 330; 360; 400 |160; 180; 200; 220; 240; 260; 300; 160; 200; 240; 300; 100; 120; 135; 150; 160; 170; 180 |6; 6; 6.5; 7; 7.5; 7.5; 8.5; 8; 9; 10; 11; 5.6; 6.2; 6.6; 7.1; 7.5; 8; 8.6 |9; 9.5; 10; 11; 12; 12.5; 14; 13; 15; 17; 19; 8.5; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5 |15; 15; 18; 18; 21; 24; 27; 15; 18; 21; 27; 12; 15; 15; 15; 18; 18; 21 |38.77; 45.25; 53.83; 64.34; 76.84; 86.82; 112.5; 54.25; 78.08; 106; 149.1; 28.48; 39.12; 45.95; 53.81; 62.61; 72.73; 84.46 |1673; 2510; 3692; 5410; 7763; 10450; 18260; 2492; 5696; 11260; 25170; 1943; 3892; 5790; 8356; 11770; 16270; 23130 |220.1; 293.6; 388.6; 515.2; 675.1; 836.4; 1260; 311.5; 569.6; 938.3; 1678; 194.3; 324.3; 428.9; 557.1; 713.1; 903.6; 1156 |245.1; 324.9; 429.5; 568.5; 744.6; 919.8; 1383; 354; 642.5; 1053; 1869; 220.6; 366.6; 484; 628.4; 804.3; 1019; 1307 |6.57; 7.45; 8.28; 9.17; 10.05; 10.97; 12.74; 6.78; 8.54; 10.31; 12.99; 8.26; 9.97; 11.23; 12.46; 13.71; 14.95; 16.55 |13.21; 14.47; 18.08; 20.67; 25.18; 28.76; 37.28; 17.59; 24.83; 33.23; 47.43; 14; 19.14; 22.14; 25.68; 30.81; 35.14; 42.69 |615.6; 924.6; 1336; 1955; 2769; 3668; 6310; 889.2; 2003; 3923; 8563; 142.4; 283.6; 419.9; 603.8; 788.1; 1043; 1318 |76.95; 102.7; 133.6; 177.7; 230.7; 282.1; 420.6; 111.2; 200.3; 326.9; 570.9; 28.47; 47.27; 62.2; 80.5; 98.52; 122.8; 146.4 |117.6; 156.5; 203.8; 270.6; 351.7; 430.2; 641.2; 170; 305.8; 498.4; 870.1; 44.61; 73.92; 96.95; 125.2; 153.7; 191.1; 229 |3.98; 4.52; 4.98; 5.51; 6; 6.5; 7.49; 4.05; 5.07; 6.08; 7.58; 2.24; 2.69; 3.02; 3.35; 3.55; 3.79; 3.95 |12.19; 14.8; 20.98; 28.46; 41.55; 52.37; 85.17; 31.24; 59.28; 102.7; 185; 6.98; 12.88; 15.94; 20.12; 28.15; 37.32; 51.08 |31410; 60210; 108000; 193300; 328500; 516400; 1200000; 47940; 171100; 486900; 1688000; 12990; 37390; 70580; 125900; 199100; 313600; 490000]
b_c = hlookup(profielen; kolomprofiel; 1; 3)*mm
t_wc = hlookup(profielen; kolomprofiel; 1; 4)*mm
t_fc = hlookup(profielen; kolomprofiel; 1; 5)*mm
r_c = hlookup(profielen; kolomprofiel; 1; 6)*mm
h_b = hlookup(profielen; liggerprofiel; 1; 2)*mm
t_wb = hlookup(profielen; liggerprofiel; 1; 4)*mm
t_fb = hlookup(profielen; liggerprofiel; 1; 5)*mm
r_b = hlookup(profielen; liggerprofiel; 1; 6)*mm
I_y,b = hlookup(profielen; liggerprofiel; 1; 8)*cm^4
'Tabel 3.1 van EN 1993-1-1 (t ≤ 40 mm), β_w uit tabel 4.1, bouten uit tabel 3.1 van EN 1993-1-8.
fu_ = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 430; 490))
bw_ = if(staalsoort ≡ 235; 0.8; if(staalsoort ≡ 275; 0.85; 0.9))
fub_ = if(boutkwaliteit ≡ 46; 400; if(boutkwaliteit ≡ 56; 500; if(boutkwaliteit ≡ 88; 800; 1000)))
'Gatdiameter bij normale gatspeling (EN 1090-2) en spanningsoppervlak (ISO 898-1).
d0_ = if(boutmaat ≡ 12; 13; if(boutmaat ≡ 16; 18; if(boutmaat ≡ 20; 22; 26)))
As_ = if(boutmaat ≡ 12; 84.3; if(boutmaat ≡ 16; 157; if(boutmaat ≡ 20; 245; 353)))
'Buitendiameter van de sluitring (ISO 7089, ook EN 14399-6).
ds_ = if(boutmaat ≡ 12; 24; if(boutmaat ≡ 16; 30; if(boutmaat ≡ 20; 37; 44)))
f_y = staalsoort*N/mm^2
f_u = fu_*N/mm^2
β_w = bw_
f_ub = fub_*N/mm^2
α_v = if(boutkwaliteit ≡ 109; 0.5; 0.6)
d = boutmaat*mm
d_0 = d0_*mm
A_s = As_*mm^2
d_s = ds_*mm
γ_M0 = 1.0
γ_M2 = 1.25
E = 210000*N/mm^2
'De richting van de dwarskracht doet er niet toe: de plaat is symmetrisch.
V_Ed = abs(V_Ed)
n_r = max(1; round(n_boutrijen))
n = 2*n_r
e_1 = e_kp
p_1 = p_kp
p_2 = w_kp
t_p = t_kp
b_p = b_kp
a = a_las
'Beginwaarden; een toets die niet doorgaat, laat ze staan en zet zijn vlag.
UC_b = 0
UC_kp = 0
UC_wb = 0
UC_w = 0
UC_φ = 0
ok_maat = 1
ok_plaat = 1
ok_b = 1
ok_kp = 1
ok_las = 1
ok_duct = 1
ok_pas = 1
ok_ring = 1
ok_rot = 1
#show
'Ligger: h = 'h_b', t<sub>w</sub> = 't_wb', t<sub>f</sub> = 't_fb', r = 'r_b' mm, I<sub>y</sub> = 'I_y,b' cm⁴. Kolom: b = 'b_c', t<sub>f</sub> = 't_fc', t<sub>w</sub> = 't_wc', r = 'r_c' mm. Staal: f<sub>y</sub> = 'f_y', f<sub>u</sub> = 'f_u' N/mm², β<sub>w</sub> = 'β_w'. Bouten M'boutmaat': d<sub>0</sub> = 'd_0' mm, A<sub>s</sub> = 'A_s' mm², f<sub>ub</sub> = 'f_ub' N/mm², α<sub>v</sub> = 'α_v'. γ<sub>M0</sub> = 'γ_M0', γ<sub>M2</sub> = 'γ_M2'.

# 3. Maatvoering

h_p = 2*e_1 + (n_r - 1)*p_1', plaathoogte<span class="alleen-scherm"></span>'
d_w = h_b - 2*t_fb - 2*r_b', recht deel van het lijf<span class="alleen-scherm"></span>'
h_p', plaathoogte<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
d_w', recht lijfdeel<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
#if verbindingsvorm ≡ 1
    z_p = max(z_kp; t_fb)', bovenkant ligger tot bovenkant plaat, ten minste t<sub>f</sub><span class="alleen-scherm"></span>'
    l_w = max(min(z_p + h_p; h_b - t_fb - r_b) - max(z_p; t_fb + r_b); 0 mm)', laslengte: het deel van de plaat op het rechte lijf<span class="alleen-scherm"></span>'
    e_2 = (b_p - p_2)/2', rand kopplaat<span class="alleen-scherm"></span>'
    e_2,c = (b_c - p_2)/2', rand kolomflens<span class="alleen-scherm"></span>'
    z_p', bovenkant plaat<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    l_w', laslengte<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    e_2', rand kopplaat<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    e_2,c', rand kolomflens<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    #if z_kp < t_fb
        '<i class="ook-afdruk">z<sub>kp</sub> &lt; t<sub>f</sub>: gerekend met de plaat tegen de bovenflens (veilige kant voor rotatie en laslengte).</i>
    #end if
    #if hartlijn ≡ 1
        '<i class="ook-afdruk">Versprongen getekend; gerekend met w = 'p_2' mm en e<sub>2</sub> = 'e_2' mm in elke rij.</i>
    #end if
    #hide
    e_min = 1.2*d_0
    p_1,min = 2.2*d_0
    p_2,min = 2.4*d_0
    'p_1 telt alleen bij twee of meer rijen. Eenheidloos, voor de #if.
    tekort = if(e_1 < e_min; 1; 0) + if(e_2 < e_min; 1; 0) + if(e_2,c < e_min; 1; 0) + if(n_r ≥ 2; if(p_1 < p_1,min; 1; 0); 0) + if(p_2 < p_2,min; 1; 0)
    #show
    #if tekort ≡ 0
        'Tabel 3.3: e<sub>1</sub>, e<sub>2</sub>, e<sub>2,c</sub> ≥ 1,2d<sub>0</sub> = 'e_min' mm; p<sub>1</sub> ≥ 2,2d<sub>0</sub> = 'p_1,min' mm; w ≥ 2,4d<sub>0</sub> = 'p_2,min' mm<span style="color: green"> → voldoet</span>
    #else
        #hide
        ok_maat = 0
        #show
        'Tabel 3.3: e<sub>1</sub>, e<sub>2</sub>, e<sub>2,c</sub> ≥ 1,2d<sub>0</sub> = 'e_min' mm; p<sub>1</sub> ≥ 2,2d<sub>0</sub> = 'p_1,min' mm; w ≥ 2,4d<sub>0</sub> = 'p_2,min' mm<span style="color: red"> → 'tekort' afstand(en) te klein: tabel 3.4 geldt niet</span>
    #end if
    #if z_p + h_p > h_b - t_fb
        #hide
        ok_plaat = 0
        #show
        '<b style="color:#b91c1c">De kopplaat reikt tot de onderflens (z + h<sub>p</sub> > h − t<sub>f</sub>): de onderflens steunt dan direct op de plaat en het liggereinde kan niet draaien.</b>
    #else if l_w < h_p
        '<i>De plaat loopt door tot in de afronding van het lijf; las en liggerlijf tellen alleen over het rechte deel, l<sub>w</sub> = 'l_w' mm.</i><span class="alleen-scherm"></span>
    #end if
    #hide
    c_s = p_2/2 - d_s/2
    c_c = t_wc/2 + r_c
    c_kp = t_wb/2 + sqrt(2)*a
    #show
    #if c_s ≥ max(c_c; c_kp)
        'Sluitring Ø'd_s' mm: w/2 − d<sub>s</sub>/2 = 'c_s' mm ≥ t<sub>w,c</sub>/2 + r<sub>c</sub> = 'c_c' mm (afronding kolom) en ≥ t<sub>w</sub>/2 + a√2 = 'c_kp' mm (las)<span style="color: green"> → ligt vrij</span>
    #else
        #hide
        ok_ring = 0
        #show
        'Sluitring Ø'd_s' mm: w/2 − d<sub>s</sub>/2 = 'c_s' mm, nodig ≥ t<sub>w,c</sub>/2 + r<sub>c</sub> = 'c_c' mm (afronding kolom) en ≥ t<sub>w</sub>/2 + a√2 = 'c_kp' mm (las)<span style="color: red"> → de sluitring ligt niet vrij: kies een grotere w</span>
    #end if
#else
    #if h_p ≤ d_w
        'Passing: h<sub>p</sub> = 'h_p' ≤ d<sub>w</sub> = 'd_w' mm<span style="color: green"> → de plaat past tussen de afrondingen</span>
    #else
        #hide
        ok_pas = 0
        #show
        'Passing: h<sub>p</sub> = 'h_p' > d<sub>w</sub> = 'd_w' mm<span style="color: red"> → de plaat valt in de afrondingen van het liggerprofiel</span>
    #end if
    '<b style="color:#b45309">De toetsing is alleen voor de kopplaat uitgewerkt. Voor de lijfplaat ontbreken de excentriciteit van de boutgroep en de buiging van de plaat, voor het dubbel hoekstaal de twee afschuifvlakken door het lijf.</b>
#end if

#if verbindingsvorm ≡ 1

# 4. Bouten — tabel 3.4, §3.7

#hide
L_j = (n_r - 1)*p_1
#show
#if L_j > 15*d
    β_Lf = max(0.75; min(1; 1 - (L_j - 15*d)/(200*d)))', §3.8, lange verbinding'
    F_v,Rd = β_Lf*α_v*f_ub*A_s/γ_M2 to kN', per bout, draad in het afschuifvlak'
#else
    F_v,Rd = α_v*f_ub*A_s/γ_M2 to kN', per bout, draad in het afschuifvlak'
#end if
k_1 = min(2.8*e_2/d_0 - 1.7; 1.4*p_2/d_0 - 1.7; 2.5)', kopplaat<span class="alleen-scherm"></span>'
k_1,c = min(2.8*e_2,c/d_0 - 1.7; 1.4*p_2/d_0 - 1.7; 2.5)', kolomflens<span class="alleen-scherm"></span>'
k_1', kopplaat<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
k_1,c', kolomflens<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
α_b,e = min(e_1/(3*d_0); f_ub/f_u; 1)', bovenste rij, kopplaat<span class="alleen-scherm"></span>'
α_b,c = min(f_ub/f_u; 1)', onderste rij, kolomflens (e<sub>1</sub> = ∞)<span class="alleen-scherm"></span>'
#if n_r ≥ 2
    α_b,i = min(p_1/(3*d_0) - 0.25; f_ub/f_u; 1)', binnenste bouten<span class="alleen-scherm"></span>'
    α_b,e', eindbout kopplaat<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    α_b,i', binnenste bouten<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    α_b,c', eindbout kolomflens<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    F_b,kp,e = k_1*α_b,e*f_u*d*t_p/γ_M2 to kN', kopplaat, bovenste rij<span class="alleen-scherm"></span>'
    F_b,kp,i = k_1*α_b,i*f_u*d*t_p/γ_M2 to kN', kopplaat, overige rijen<span class="alleen-scherm"></span>'
    F_b,c,i = k_1,c*α_b,i*f_u*d*t_fc/γ_M2 to kN', kolomflens, overige rijen<span class="alleen-scherm"></span>'
    F_b,c,e = k_1,c*α_b,c*f_u*d*t_fc/γ_M2 to kN', kolomflens, onderste rij<span class="alleen-scherm"></span>'
    F_b,kp,e'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    F_b,kp,i'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    F_b,c,i'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    F_b,c,e'<span class="alleen-afdruk"></span><span class="kolom-4"></span>'
    #hide
    'Per rij telt de kleinste stuik van kopplaat en kolomflens: de bovenste rij is eindbout in de kopplaat, de onderste in de kolomflens.
    F_b,max = max(min(F_b,kp,e; F_b,c,i); min(F_b,kp,i; F_b,c,e); min(F_b,kp,i; F_b,c,i))
    F_b,min = min(F_b,kp,e; F_b,kp,i; F_b,c,i; F_b,c,e)
    #show
#else
    α_b,e', eindbout kopplaat<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    α_b,c', eindbout kolomflens<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    'Eén boutrij, enkelsnedig (§3.6.1(10)): F<sub>b,Rd</sub> ≤ 1,5·f<sub>u</sub>·d·t/γ<sub>M2</sub> (3.2); sluitringen onder kop en moer.
    F_b,kp,e = min(k_1*α_b,e; 1.5)*f_u*d*t_p/γ_M2 to kN', kopplaat, (3.2)<span class="alleen-scherm"></span>'
    F_b,c,e = min(k_1,c*α_b,c; 1.5)*f_u*d*t_fc/γ_M2 to kN', kolomflens, (3.2)<span class="alleen-scherm"></span>'
    F_b,kp,e'<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    F_b,c,e'<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #hide
    F_b,max = min(F_b,kp,e; F_b,c,e)
    F_b,min = F_b,max
    #show
#end if
#if F_b,min ≤ 0 kN
    #hide
    ok_b = 0
    #show
    '<b style="color:#b91c1c">F<sub>b,Rd</sub> ≤ 0: k<sub>1</sub> of α<sub>b</sub> is niet positief, een rand- of steekafstand is te klein.</b>
#else
    #if F_v,Rd ≥ F_b,max
        #if n_r ≥ 2
            V_b,Rd = 2*(min(F_b,kp,e; F_b,c,i) + (n_r - 2)*min(F_b,kp,i; F_b,c,i) + min(F_b,kp,i; F_b,c,e)) to kN', §3.7(1), F<sub>v,Rd</sub> ≥ F<sub>b,Rd</sub>: som van de stuikweerstanden'
        #else
            V_b,Rd = 2*min(F_b,kp,e; F_b,c,e) to kN', §3.7(1), F<sub>v,Rd</sub> ≥ F<sub>b,Rd</sub>: som van de stuikweerstanden'
        #end if
    #else
        #if n_r ≥ 2
            V_b,Rd = n*min(F_v,Rd; F_b,kp,e; F_b,kp,i; F_b,c,i; F_b,c,e) to kN', §3.7(1): n maal de kleinste weerstand'
        #else
            V_b,Rd = n*min(F_v,Rd; F_b,kp,e; F_b,c,e) to kN', §3.7(1): n maal de kleinste weerstand'
        #end if
    #end if
    UC_b = V_Ed/V_b,Rd', bouten'
    #if UC_b ≤ 1.0
        '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
    #else
        '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
    #end if
#end if

# 5. Kopplaat — afschuiving en blokschuif

V_g,Rd = 2*h_p*t_p*f_y/(1.27*sqrt(3)*γ_M0) to kN', bruto, 6.2.6<span class="alleen-scherm">; de factor 1,27 dekt de buiging in de plaat (veilige kant)</span>'
V_n,Rd = 2*(h_p - n_r*d_0)*t_p*f_u/(sqrt(3)*γ_M2) to kN', netto'
A_nt = (e_2 - d_0/2)*t_p to mm^2', buitenstrook<span class="alleen-scherm"></span>'
A_nt,i = (p_2 - d_0)*t_p to mm^2', tussen de boutlijnen<span class="alleen-scherm"></span>'
A_nv = (h_p - e_1 - (n_r - 0.5)*d_0)*t_p to mm^2', per boutlijn<span class="alleen-scherm"></span>'
A_nt', buitenstrook<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
A_nt,i', tussen de boutlijnen<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
A_nv', per boutlijn<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
V_eff,2,Rd = 2*(0.5*f_u*A_nt/γ_M2 + f_y*A_nv/(sqrt(3)*γ_M0)) to kN', (3.10), twee buitenstroken'
V_eff,1,Rd = f_u*A_nt,i/γ_M2 + 2*f_y*A_nv/(sqrt(3)*γ_M0) to kN', (3.9), deel tussen de boutlijnen'
V_kp,Rd = min(V_g,Rd; V_n,Rd; V_eff,2,Rd; V_eff,1,Rd)
#if min(A_nt; A_nt,i; A_nv) ≤ 0 mm^2 or V_kp,Rd ≤ 0 kN
    #hide
    ok_kp = 0
    #show
    '<b style="color:#b91c1c">Een netto doorsnede van de kopplaat is ≤ 0: controleer e<sub>1</sub>, e<sub>2</sub>, p<sub>1</sub>, w en d<sub>0</sub>.</b>
#else
    UC_kp = V_Ed/V_kp,Rd', kopplaat'
    #if UC_kp ≤ 1.0
        '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
    #else
        '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
    #end if
#end if

# 6. Liggerlijf en las

V_wb,Rd = t_wb*l_w*f_y/(sqrt(3)*γ_M0) to kN', EN 1993-1-1 6.2.6, A<sub>v</sub> = t<sub>w</sub>·l<sub>w</sub>'
UC_wb = V_Ed/V_wb,Rd', liggerlijf'
#if UC_wb ≤ 1.0
    '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
#else
    '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
#end if
f_vw,d = f_u/(sqrt(3)*β_w*γ_M2) to N/mm^2', (4.4)<span class="alleen-scherm"></span>'
l_eff = l_w - 2*a', §4.5.1(1)<span class="alleen-scherm"></span>'
f_vw,d', (4.4)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
l_eff', §4.5.1(1)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
#if a < 3 mm
    #hide
    ok_las = 0
    #show
    '<b style="color:#b91c1c">Keeldikte a &lt; 3 mm (§4.5.2(2)).</b>
#end if
#if l_eff < max(30 mm; 6*a)
    #hide
    ok_las = 0
    #show
    '<b style="color:#b91c1c">De las is korter dan max(30 mm; 6a) en mag niet dragend worden gerekend (§4.5.1(2)).</b>
#end if
#if l_eff > 0 mm
    V_w,Rd = 2*a*l_eff*f_vw,d to kN', twee hoeklassen, §4.5.3.3'
    UC_w = V_Ed/V_w,Rd', las'
    #if UC_w ≤ 1.0
        '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
    #else
        '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
    #end if
#end if

# 7. Scharniergedrag — §5.2.2 en §6.4.2

t_min = min(t_p; t_fc)', dunste van kopplaat en kolomflens<span class="alleen-scherm"></span>'
t_max = 0.36*d*sqrt(f_ub/f_y) to mm', (6.32)<span class="alleen-scherm"></span>'
t_min', kopplaat of kolomflens<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
t_max', (6.32)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
#if t_min ≤ t_max
    'Ductiliteit: t<sub>min</sub> ≤ t<sub>max</sub><span style="color: green"> → voldoet</span><span class="alleen-scherm">: de plaat of de kolomflens vloeit voordat de bouten bezwijken</span>
#else
    #hide
    ok_duct = 0
    #show
    'Ductiliteit: t<sub>min</sub> > t<sub>max</sub><span style="color: red"> → voldoet niet</span><span class="alleen-scherm">: kies een dunnere plaat of een grotere bout</span>
#end if
#if ok_plaat ≡ 1
    h_e = h_b - z_p - h_p', onderrand plaat tot onderkant ligger<span class="alleen-scherm"></span>'
    φ_Rd = t_p/h_e', draaiing tot de onderflens de kolom raakt<span class="alleen-scherm"></span>'
    h_e', onderrand plaat tot onderkant ligger<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    φ_Rd', t<sub>p</sub>/h<sub>e</sub><span class="alleen-afdruk"></span><span class="kolom-2"></span>'
    #if L_b ≤ 0 m
        #hide
        ok_rot = 0
        #show
        '<b style="color:#b91c1c">Rotatie niet getoetst: vul de overspanning L<sub>b</sub> van de ligger in.</b>
    #else
        φ_Ed = V_Ed*L_b^2/(8*E*I_y,b)', liggereinde<span class="alleen-scherm">, bovengrens bij een symmetrische belasting</span>'
        UC_φ = φ_Ed/φ_Rd', rotatie'
        #if UC_φ ≤ 1.0
            '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if
    #end if
#end if

#end if

#if verbindingsvorm ≡ 1

# 8. Conclusie

    #hide
    UC_max = max(UC_b; UC_kp; UC_wb; UC_w; UC_φ)
    toets = if(UC_max ≤ 0; "geen dwarskracht"; if(UC_max ≡ UC_wb; "liggerlijf"; if(UC_max ≡ UC_b; "bouten"; if(UC_max ≡ UC_kp; "kopplaat"; if(UC_max ≡ UC_w; "las"; "rotatie")))))
    ok_r = ok_b*ok_kp
    #show
    #if ok_maat ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar 'tekort' afstand(en) onder het minimum van tabel 3.3 → <b>de verbinding voldoet niet</b></span>
    #else if ok_plaat ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar de kopplaat reikt tot de onderflens en kan niet draaien → <b>de verbinding voldoet niet</b></span>
    #else if ok_ring ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar de sluitring ligt op de afronding van de kolom of op de las → <b>de verbinding voldoet niet</b></span>
    #else if ok_rot ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar de rotatie is niet getoetst: de overspanning L<sub>b</sub> ontbreekt → <b>de verbinding voldoet niet</b></span>
    #else if ok_r ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar een weerstand is ≤ 0 → <b>de verbinding voldoet niet</b></span>
    #else if ok_las ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar de las voldoet niet aan §4.5.1(2) of §4.5.2(2) → <b>de verbinding voldoet niet</b></span>
    #else if ok_duct ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar (6.32) is niet gehaald: te weinig rotatiecapaciteit voor een scharnier → <b>de verbinding voldoet niet</b></span>
    #else if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b> ('toets')<span style="color: green"> ≤ 1,0 → <b>de verbinding voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b> ('toets')<span style="color: red"> > 1,0 → <b>de verbinding voldoet niet</b></span>
    #end if
#else

# 4. Conclusie

    #if ok_pas ≡ 0
        '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de verbinding is niet getoetst</b>, en de plaat past niet tussen de afrondingen.</span>
    #else
        '<b>Maatgevende UC</b><span style="color:#b45309"> niet bepaald → <b>de verbinding is niet getoetst</b>: alleen de kopplaat is uitgewerkt.</span>
    #end if
#end if
`;
