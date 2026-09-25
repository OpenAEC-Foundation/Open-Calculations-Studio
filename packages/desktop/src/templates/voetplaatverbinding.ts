/**
 * Voetplaatverbinding (kolomvoet) volgens NEN-EN 1993-1-8 met NB, met de
 * kegelbreuk van het beton volgens NEN-EN 1992-4.
 *
 * Invoer zoals het parametrische beeld (VoetplaatDesigner.tsx): plaat
 * d_p × b_p × t_p, randafstanden e_d en e_b, zes ankeropzetten, ankermaat en
 * sterkteklasse. Getoetst: druk op het beton met de equivalente T-stukken
 * (§6.2.5, §6.2.6.9), trek in de ankerrij met de voetplaat op buiging
 * (§6.2.6.11, tabel 6.2 en 6.6), de krachtsverdeling bij normaalkracht en
 * moment volgens tabel 6.7 (§6.2.8.3), afschuiving met wrijving en de
 * ankerbouten (§6.2.2), trek en afschuiving samen (tabel 3.4), de hoeklassen
 * (§4.5.3.2) en de kegelbreuk van het beton (EN 1992-4 §7.2.1.4).
 *
 * Profielen HEB 100–400, HEA 100–400 en IPE 200–400 (id 1–38, gelijk aan het
 * beeld). Geen referentieberekening beschikbaar; scripts/check-voetplaat.mjs
 * rekent de uitkomsten onafhankelijk na.
 */

export const voetplaatverbinding = `"Voetplaatverbinding — EN 1993-1-8 §6.2.5 en §6.2.8

'<i>Een kolomvoet: voetplaat met ankers op een ondersabeling en een betonblok, belast door een normaalkracht, een moment om de sterke as en een dwarskracht. De druk gaat via equivalente T-stukken onder de flenzen (en bij zuivere druk ook onder het lijf) naar het beton; de trek door een moment gaat via de ankerrij buiten de getrokken flens, waarbij de voetplaat op buiging werkt. De krachtsverdeling volgt tabel 6.7. De dwarskracht gaat via wrijving en de ankers.</i>

# 1. Kolom en staal

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
#show

@select profile "Profiel van de kolom"
  HEB 100 = 1
  HEB 120 = 2
  HEB 140 = 3
  HEB 160 = 4
  HEB 180 = 5
  HEB 200 = 6
  HEB 220 = 7
  HEB 240 = 8
  HEB 260 = 9
  HEB 280 = 10
  HEB 300 = 11
  HEB 320 = 12
  HEB 340 = 13
  HEB 360 = 14
  HEB 400 = 15
  HEA 100 = 16
  HEA 120 = 17
  HEA 140 = 18
  HEA 160 = 19
  HEA 180 = 20
  HEA 200 = 21
  HEA 220 = 22
  HEA 240 = 23
  HEA 260 = 24
  HEA 280 = 25
  HEA 300 = 26
  HEA 320 = 27
  HEA 340 = 28
  HEA 360 = 29
  HEA 400 = 30
  IPE 200 = 31
  IPE 220 = 32
  IPE 240 = 33
  IPE 270 = 34
  IPE 300 = 35
  IPE 330 = 36
  IPE 360 = 37
  IPE 400 = 38
@end

@select staalsoort "Staalsoort kolom en voetplaat"
  S235 = 235
  S275 = 275
  S355 = 355
@end

hoeklas = ?*(mm)', keeldikte van de hoeklas'
f_y = staalsoort*N/mm^2', tabel 3.1, t ≤ 40 mm'
#hide
fu_tab = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 430; 490))
bw_tab = if(staalsoort ≡ 235; 0.8; if(staalsoort ≡ 275; 0.85; 0.9))
#show
f_u = fu_tab*N/mm^2', tabel 3.1'
β_w = bw_tab', correlatiefactor, tabel 4.1'
γ_M0 = 1.0
γ_M2 = 1.25', NB bij EN 1993-1-8, tabel 2.1'

#hide
'Profieltabel: id | h | b | t_w | t_f (mm) | A (cm²) | W_pl,y (cm³)
profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27; 28; 29; 30; 31; 32; 33; 34; 35; 36; 37; 38 |100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 320; 340; 360; 400; 96; 114; 133; 152; 171; 190; 210; 230; 250; 270; 290; 310; 330; 350; 390; 200; 220; 240; 270; 300; 330; 360; 400 |100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 300; 300; 300; 300; 100; 120; 140; 160; 180; 200; 220; 240; 260; 280; 300; 300; 300; 300; 300; 100; 110; 120; 135; 150; 160; 170; 180 |6; 6.5; 7; 8; 8.5; 9; 9.5; 10; 10; 10.5; 11; 11.5; 12; 12.5; 13.5; 5; 5; 5.5; 6; 6; 6.5; 7; 7.5; 7.5; 8; 8.5; 9; 9.5; 10; 11; 5.6; 5.9; 6.2; 6.6; 7.1; 7.5; 8; 8.6 |10; 11; 12; 13; 14; 15; 16; 17; 17.5; 18; 19; 20.5; 21.5; 22.5; 24; 8; 8; 8.5; 9; 9.5; 10; 11; 12; 12.5; 13; 14; 15.5; 16.5; 17.5; 19; 8.5; 9.2; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5 |26; 34; 43; 54.3; 65.3; 78.1; 91; 106; 118; 131; 149; 161.3; 170.9; 180.6; 197.8; 21.2; 25.3; 31.4; 38.8; 45.3; 53.8; 64.3; 76.8; 86.8; 97.3; 112; 124.4; 133.5; 142.8; 159; 28.5; 33.4; 39.1; 45.9; 53.8; 62.6; 72.7; 84.5 |104; 165; 246; 354; 481; 642; 827; 1050; 1280; 1530; 1870; 2150; 2410; 2680; 3230; 83; 119; 174; 245; 325; 430; 569; 745; 920; 1110; 1380; 1630; 1850; 2090; 2560; 221; 285; 367; 484; 628; 804; 1020; 1310]
h = hlookup(profielen; profile; 1; 2)*mm
b_k = hlookup(profielen; profile; 1; 3)*mm
t_w = hlookup(profielen; profile; 1; 4)*mm
t_f = hlookup(profielen; profile; 1; 5)*mm
A_k = hlookup(profielen; profile; 1; 6)*cm^2
W_pl = hlookup(profielen; profile; 1; 7)*cm^3
#show
'Kolom: h = 'h' mm, b = 'b_k' mm, t<sub>w</sub> = 't_w' mm, t<sub>f</sub> = 't_f' mm, A = 'A_k' cm², W<sub>pl,y</sub> = 'W_pl' cm³.

# 2. Voetplaat en ankers

@select ank_opzet "Ankeropzet"
  2 ankers in de openingen van het profiel, plaat gelijk met het profiel = 1
  4 ankers in de hoeken = 2
  6 ankers: 4 in de hoeken en 2 in het midden = 3
  6 ankers: 4 in de hoeken en 2 naast de linkerflens = 4
  6 ankers: 4 in de hoeken en 2 naast de rechterflens = 5
  4 ankers in de openingen van het profiel, plaat gelijk met het profiel = 6
@end

t_p = ?*(mm)', dikte van de voetplaat'
d_p = ?*(mm)', lengte van de plaat in de richting van h'
b_p = ?*(mm)', breedte van de plaat in de richting van b'
e_d = ?*(mm)', randafstand van de ankers in de richting van d_p'
e_b = ?*(mm)', randafstand van de ankers in de richting van b_p'

@select d_anker "Ankermaat"
  M12 = 12
  M16 = 16
  M20 = 20
  M24 = 24
  M30 = 30
  M36 = 36
@end

@select kwaliteit "Sterkteklasse van de ankers"
  4.6 = 4.6
  5.6 = 5.6
  8.8 = 8.8
  10.9 = 10.9
@end

@select gatspeling "Gaten in de voetplaat"
  Normale gatspeling = 1
  Vergrote gaten = 0
@end

h_ef = ?*(mm)', verankeringsdiepte, tot de ankerplaat'

#hide
flush = if(ank_opzet ≡ 1 or ank_opzet ≡ 6; 1; 0)
n_a = if(ank_opzet ≡ 1; 2; if(ank_opzet ≡ 2 or ank_opzet ≡ 6; 4; 6))
d_pl = if(flush ≡ 1; min(d_p; h); max(d_p; h))
b_pl = max(b_p; b_k)
x_E = d_pl/2 - e_d
y_E = b_pl/2 - e_b
x_h = (h/2 - t_f)/2
y_g = (t_w/2 + b_k/2)/2
x_max = if(ank_opzet ≡ 1; 0 mm; if(ank_opzet ≡ 6; x_h; x_E))
y_max = if(flush ≡ 1; y_g; y_E)
d_a = d_anker*mm
A_s = if(d_anker ≡ 12; 84.3; if(d_anker ≡ 16; 157; if(d_anker ≡ 20; 245; if(d_anker ≡ 24; 353; if(d_anker ≡ 30; 561; 817)))))*mm^2
fyb_tab = if(kwaliteit ≡ 4.6; 240; if(kwaliteit ≡ 5.6; 300; if(kwaliteit ≡ 8.8; 640; 900)))
fub_tab = if(kwaliteit ≡ 4.6; 400; if(kwaliteit ≡ 5.6; 500; if(kwaliteit ≡ 8.8; 800; 1000)))
#show
#if flush ≡ 1
    '<i>Bij deze opzet steekt de plaat niet buiten het profiel uit: d<sub>p</sub> is begrensd op h. De ankers staan in de openingen van het profiel, bij het lijf; zo’n kolomvoet geldt als scharnierend.</i>
#end if
'Voetplaat 'd_pl' × 'b_pl' × 't_p' mm met 'n_a' ankers M'd_anker' – 'kwaliteit'; de buitenste ankers staan op x = 'x_max' mm en y = 'y_max' mm van het hart.
f_yb = fyb_tab*N/mm^2
f_ub = fub_tab*N/mm^2
A_s', spanningsdoorsnede van de ankerbout'

# 3. Beton en ondersabeling

@select betonklasse "Betonsterkteklasse"
  C20/25 = 20
  C25/30 = 25
  C30/37 = 30
  C35/45 = 35
  C40/50 = 40
  C45/55 = 45
  C50/60 = 50
@end

@select gescheurd "Beton bij de ankers"
  Gescheurd = 1
  Ongescheurd = 0
@end

@select positie "Ligging op het fundatieblok"
  Midden, geen rand dichtbij = 1
  1 rand dichtbij = 2
  2 randen, hoek = 3
  2 randen tegenover elkaar = 4
  3 randen = 5
  4 randen = 6
@end

t_g = ?*(mm)', dikte van de ondersabeling'
h_b = ?*(mm)', hoogte van het betonblok'
f_ck = betonklasse*N/mm^2
f_cd = f_ck/1.5', α_cc = 1,0 (NB bij EN 1992-1-1)'

# 4. Belasting

N_Ed = ?*(kN)', normaalkracht, druk positief'
M_Ed = ?*(kN*m)', moment om de sterke as'
V_Ed = ?*(kN)', dwarskracht in de richting van d_p'
M_abs = abs(M_Ed) to kN*m

# 5. Druk op het beton (§6.2.5 en EN 1992-1-1 §6.7)

'<i>Het spreidingsoppervlak A<sub>c1</sub> heeft dezelfde vorm als de plaat en hetzelfde midden, met b<sub>2</sub> − b<sub>1</sub> ≤ h<sub>b</sub> en A<sub>c1</sub> ≤ 9·A<sub>c0</sub>; dan is k<sub>j</sub> = √(A<sub>c1</sub>/A<sub>c0</sub>) = min(3; 1 + h<sub>b</sub>/max(b<sub>p</sub>; d<sub>p</sub>)). Ligt er een rand van het betonblok dichtbij, dan is er geen spreiding aangenomen: k<sub>j</sub> = 1. β<sub>j</sub> = 2/3 geldt als de ondersabeling niet dikker is dan 0,2 maal de kleinste plaatmaat en ten minste 0,2·f<sub>ck</sub> sterk is (§6.2.5(7)).</i>
k_sp = min(3; 1 + h_b/max(b_pl; d_pl))', bij spreiding in het blok'
k_j = if(positie ≡ 1; k_sp; 1)', concentratiefactor'
f_jd = 2/3*k_j*f_cd', rekenwaarde van de voegdruksterkte, β_j = 2/3'
t_g,max = 0.2*min(b_pl; d_pl)
#if t_g > t_g,max
    '<b style="color:#b45309">De ondersabeling is dikker dan 0,2·min(b<sub>p</sub>; d<sub>p</sub>) = 't_g,max' mm: β<sub>j</sub> = 2/3 geldt dan niet (§6.2.5(7)); toets de ondersabeling apart.</b>
#end if
c = t_p*sqrt(f_y/(3*f_jd*γ_M0)) to mm', bijkomende steunbreedte (6.5)'
c_p = (d_pl - h)/2', plaatoverstek buiten de flens'
c_i = min(c; (h - 2*t_f)/2)', naar binnen, tot halverwege tussen de flenzen'
b_eff,f = t_f + min(c; c_p) + c_i', breedte van het T-stuk onder een flens'
l_eff,f = min(b_k + 2*c; b_pl)', lengte van het T-stuk onder een flens'
F_c,pl,Rd = f_jd*b_eff,f*l_eff,f to kN', T-stuk onder één flens (§6.2.6.9)'
b_eff,w = min(t_w + 2*c; b_pl)
l_eff,w = max(0 mm; h - 2*t_f - 2*c)', strook onder het lijf, tussen de T-stukken'
N_j,Rd = 2*F_c,pl,Rd + f_jd*b_eff,w*l_eff,w to kN', zuivere druk, met het lijf (§6.2.8.2)'
F_c,fc,Rd = W_pl*f_y/(γ_M0*(h - t_f)) to kN', kolomflens en -lijf op druk (§6.2.6.7)'
F_C,Rd = min(F_c,pl,Rd; F_c,fc,Rd) to kN', drukweerstand van één kant'

# 6. Trek: ankers en voetplaat (§6.2.6.11 en §6.2.6.12)

F_t,Rd = 0.9*f_ub*A_s/γ_M2 to kN', trekweerstand van één anker, k_2 = 0,9 (tabel 3.4)'
#hide
ok_mx = 1
#show
#if flush ≡ 0
    '<i>De ankerrij buiten de getrokken flens werkt als een equivalent T-stuk (§6.2.6.5, rij in het uitstekende deel van tabel 6.6). Wrikkrachten tellen niet voor de plaatdikte, wel voor de ankers (§6.2.6.11(2)); ze treden op als L<sub>b</sub> ≤ L<sub>b</sub>*.</i>
    m_x = x_E - h/2 - 0.8*sqrt(2)*hoeklas', van het anker tot de voet van de las'
    #if m_x ≤ 0 mm
        #hide
        ok_mx = 0
        #show
        '<b style="color:#b91c1c">De ankers staan te dicht bij de flens (m<sub>x</sub> ≤ 0): vergroot d<sub>p</sub> of verklein e<sub>d</sub>.</b>
    #end if
    w_a = 2*y_E', afstand tussen de twee ankers van de rij'
    #hide
    l_c1 = 2*pi*m_x to mm
    l_c2 = pi*m_x + w_a to mm
    l_c3 = pi*m_x + 2*e_b to mm
    l_n1 = 4*m_x + 1.25*e_d to mm
    l_n2 = e_b + 2*m_x + 0.625*e_d to mm
    l_n3 = 0.5*b_pl to mm
    l_n4 = 0.5*w_a + 2*m_x + 0.625*e_d to mm
    l_eff,cp = min(l_c1; l_c2; l_c3)
    l_eff,nc = min(l_n1; l_n2; l_n3; l_n4)
    #show
    'Ronde patronen: 2π·m<sub>x</sub> = 'l_c1', π·m<sub>x</sub> + w = 'l_c2' en π·m<sub>x</sub> + 2e = 'l_c3' mm → l<sub>eff,cp</sub> = 'l_eff,cp' mm.
    'Niet-ronde patronen: 4m<sub>x</sub> + 1,25e<sub>x</sub> = 'l_n1', e + 2m<sub>x</sub> + 0,625e<sub>x</sub> = 'l_n2', 0,5b<sub>p</sub> = 'l_n3' en 0,5w + 2m<sub>x</sub> + 0,625e<sub>x</sub> = 'l_n4' mm → l<sub>eff,nc</sub> = 'l_eff,nc' mm.
    l_eff,1 = min(l_eff,cp; l_eff,nc)
    M_pl,1,Rd = 0.25*l_eff,1*t_p^2*f_y/γ_M0 to kN*m
    M_pl,2,Rd = 0.25*l_eff,nc*t_p^2*f_y/γ_M0 to kN*m
    n_e = min(e_d; 1.25*m_x)
    L_b = 8*d_a + t_g + t_p + 0.6*d_a', 8d, ondersabeling, plaat, sluitring en halve moer'
    L_b,s = 8.8*m_x^3*A_s/(l_eff,1*t_p^3) to mm', L_b*, één rij'
    F_T,12,Rd = 2*M_pl,1,Rd/m_x to kN', plaat zonder wrikkrachten'
    F_T,2,Rd = (2*M_pl,2,Rd + n_e*2*F_t,Rd)/(m_x + n_e) to kN', ankers met wrikkracht'
    F_T,3,Rd = 2*F_t,Rd', twee ankers'
    F_t,fl,Rd = b_k*t_f*f_y/γ_M0 to kN', getrokken kolomflens'
    #if L_b > L_b,s
        F_T,Rd = min(F_T,12,Rd; F_T,3,Rd; F_t,fl,Rd) to kN', geen wrikkrachten'
    #else
        F_T,Rd = min(F_T,12,Rd; F_T,2,Rd; F_T,3,Rd; F_t,fl,Rd) to kN', met wrikkrachten voor de ankers'
    #end if
#else
    '<i>De ankers staan binnen het profiel; ze nemen alleen een opwaartse normaalkracht op. De buiging van de plaat tussen de flenzen is dan niet getoetst.</i>
#end if

# 7. Krachtsverdeling (§6.2.8.3, tabel 6.7)

'<i>Bij een moment telt aan de drukkant alleen het T-stuk onder de flens, niet de strook onder het lijf (§6.2.8.3(1)). Hefboomsarmen vanaf het hart van de kolom: z<sub>C</sub> tot het midden van de gedrukte flens, z<sub>T</sub> tot de getrokken ankerrij. Met de momenten om het drukpunt volgt de trekkracht F<sub>T</sub> = (M − N·z<sub>C</sub>)/(z<sub>T</sub> + z<sub>C</sub>).</i>
#hide
ok_opzet = 1
F_T = 0 kN
F_C = 0 kN
F_t,a = 0 kN
F_groep = 0 kN
UC_c = 0
UC_t = 0
n_T = 2
s_x = 0 mm
s_y = 0 mm
ψ_ec = 1
#show
z_C = (h - t_f)/2
#if flush ≡ 1
    #if M_abs > 0 kN*m
        #hide
        ok_opzet = 0
        #show
        '<b style="color:#b91c1c">Deze ankeropzet is een scharnierende kolomvoet en kan geen moment overbrengen. Kies een opzet met ankers buiten de flenzen.</b>
    #else if N_Ed ≥ 0 kN
        UC_c = N_Ed/N_j,Rd', zuivere druk'
    #else
        F_t,a = -N_Ed/n_a to kN', opwaartse kracht per anker'
        UC_t = F_t,a/F_t,Rd
        #hide
        F_groep = -N_Ed
        n_T = n_a
        s_x = if(ank_opzet ≡ 6; 2*x_h; 0 mm)
        s_y = 2*y_g
        #show
    #end if
#else
    z_T = x_E
    z = z_T + z_C
    #if M_abs ≡ 0 kN*m and N_Ed ≥ 0 kN
        UC_c = N_Ed/N_j,Rd', zuivere druk'
    #else
        F_T,0 = (M_abs - N_Ed*z_C)/z to kN
        #if F_T,0 ≤ 0 kN
            '<i>Geen trek in de ankers: beide kanten zijn gedrukt.</i>
            F_C = N_Ed/2 + M_abs/(2*z_C) to kN', zwaarst gedrukte flens'
            UC_c = F_C/F_C,Rd
        #else if N_Ed + F_T,0 > 0 kN
            '<i>De ene kant is getrokken, de andere gedrukt.</i>
            F_T = F_T,0', getrokken ankerrij'
            F_C = N_Ed + F_T to kN', gedrukte flens'
            UC_c = F_C/F_C,Rd
            UC_t = F_T/F_T,Rd
            F_t,a = F_T/2
            #hide
            F_groep = F_T
            s_y = 2*y_E
            #show
        #else
            '<i>Beide ankerrijen zijn getrokken.</i>
            F_T = -N_Ed/2 + M_abs/(2*z_T) to kN', zwaarst getrokken ankerrij'
            UC_t = F_T/F_T,Rd
            F_t,a = F_T/2
            #hide
            F_groep = -N_Ed
            n_T = 4
            s_x = 2*x_E
            s_y = 2*y_E
            ψ_ec = 1/(1 + 2*(M_abs/max(-N_Ed; 0.001 kN))/(3*h_ef))
            #show
        #end if
    #end if
#end if

# 8. Kegelbreuk van het beton (EN 1992-4 §7.2.1.4)

#hide
UC_kegel = 0
#show
#if F_groep > 0 kN
    '<i>Ingestorte ankers met een ankerplaat. N<sup>0</sup><sub>Rk,c</sub> = k<sub>1</sub>·√f<sub>ck</sub>·h<sub>ef</sub><sup>1,5</sup> met k<sub>1</sub> = 8,9 in gescheurd en 12,7 in ongescheurd beton; s<sub>cr,N</sub> = 3·h<sub>ef</sub>; γ<sub>Mc</sub> = 1,5. De getrokken ankers vormen samen één kegel.</i>
    k_1 = if(gescheurd ≡ 1; 8.9; 12.7)
    s_cr = 3*h_ef
    N_Rk,c0 = k_1*sqrt(betonklasse)*(h_ef/(1 mm))^1.5*N to kN
    a_x = s_cr + min(s_x; s_cr)
    a_y = s_cr + min(s_y; s_cr)
    A_c,N = a_x*a_y to mm^2', oppervlak van de kegels van de groep'
    A_c,N0 = s_cr^2 to mm^2
    ψ_re = min(1; 0.5 + h_ef/(200 mm))
    ψ_ec', excentriciteit van de trek in de groep'
    N_Rd,c = N_Rk,c0*A_c,N/A_c,N0*ψ_re*ψ_ec/1.5 to kN
    UC_kegel = F_groep/N_Rd,c
    #if positie ≠ 1
        '<b style="color:#b45309">Er ligt een rand dichtbij: de kegelbreuk is hier zonder randeffect gerekend. Toets de kegelbreuk met de werkelijke randafstanden en de randbreuk apart (EN 1992-4 §7.2.1.4 en §7.2.2.5).</b>
    #end if
#else
    '<i>Geen trek in de ankers: de kegelbreuk is niet maatgevend.</i>
#end if

# 9. Afschuiving (§6.2.2)

'<i>De dwarskracht gaat via wrijving tussen plaat en ondersabeling, F<sub>f,Rd</sub> = 0,20·N<sub>c,Ed</sub> voor zand-cementmortel, en via de ankerbouten. Die tellen alleen mee in gaten met normale speling (§6.2.2(5)); hun weerstand is de kleinste van de stuikweerstand en α<sub>bc</sub>·f<sub>ub</sub>·A<sub>s</sub>/γ<sub>M2</sub> met α<sub>bc</sub> = 0,44 − 0,0003·f<sub>yb</sub> (§6.2.2(7)).</i>

@select wrijving "Wrijving meenemen"
  Ja = 1
  Nee = 0
@end

N_c,Ed = max(N_Ed; 0 kN)', drukkracht, bij trek nul'
F_f,Rd = if(wrijving ≡ 1; 0.20*N_c,Ed; 0 kN) to kN', (6.1)'
α_bc = 0.44 - 0.0003*fyb_tab
#if fyb_tab > 640
    '<i>(6.2) geldt voor f<sub>yb</sub> tot 640 N/mm²; voor klasse 10.9 is α<sub>bc</sub> hier met de werkelijke f<sub>yb</sub> doorgetrokken.</i>
#end if
F_2,vb,Rd = α_bc*f_ub*A_s/γ_M2 to kN', (6.2)'
#hide
spel = if(d_anker ≤ 14; 1; if(d_anker ≤ 24; 2; 3))
#show
d_0 = d_a + spel*mm', gatdiameter bij normale speling'
e_1 = d_pl/2 - x_max', randafstand in de krachtrichting'
e_2 = b_pl/2 - y_max', randafstand loodrecht erop'
α_b = min(e_1/(3*d_0); f_ub/f_u; 1)
k_1s = max(min(2.8*e_2/d_0 - 1.7; 2.5); 0)
F_1,vb,Rd = k_1s*α_b*f_u*d_a*t_p/γ_M2 to kN', stuik van de plaat (tabel 3.4)'
F_vb,Rd = min(F_1,vb,Rd; F_2,vb,Rd)
n_v = if(gatspeling ≡ 1; n_a; 0)', ankers die meedoen'
V_Rd = F_f,Rd + n_v*F_vb,Rd to kN', (6.3)'
UC_v = abs(V_Ed)/V_Rd

# 10. Trek en afschuiving in één anker (tabel 3.4)

#hide
UC_tv = 0
#show
#if F_t,a > 0 kN and n_v > 0
    F_v,a = max(abs(V_Ed) - F_f,Rd; 0 kN)/n_v to kN', afschuiving per anker, na de wrijving'
    UC_tv = F_v,a/F_vb,Rd + F_t,a/(1.4*F_t,Rd)
#else
    '<i>Geen anker krijgt tegelijk trek en afschuiving.</i>
#end if

# 11. Hoeklassen kolom–voetplaat (§4.5.3.2)

'<i>De getrokken flens draagt M/(h − t<sub>f</sub>) min haar deel van de drukkracht, N·A<sub>f</sub>/A; de lassen rond de flens (buitenkant en beide binnenkanten, samen 2·b − t<sub>w</sub>) zijn dwars belast. Het lijf draagt de dwarskracht en bij een opwaartse kracht zijn deel daarvan, met twee lassen over h − 2·t<sub>f</sub>. Richtingsmethode: a ≥ √(2·F<sub>⊥</sub>² + 3·F<sub>∥</sub>²)·β<sub>w</sub>·γ<sub>M2</sub>/f<sub>u</sub>, per mm las.</i>
A_fl = b_k*t_f
F_M = M_abs/(h - t_f) to kN', flenskracht uit het moment'
F_N = N_Ed*A_fl/A_k to kN', deel van de normaalkracht in de flens'
F_fl = max(F_M - F_N; 0 kN)', trek in de flens'
a_fl,req = sqrt(2)*F_fl/(2*b_k - t_w)*β_w*γ_M2/f_u to mm
A_wb = (h - 2*t_f)*t_w
F_dw = max(-N_Ed; 0 kN)*A_wb/A_k/(2*(h - 2*t_f)) to N/mm', dwars op de lijflassen'
F_la = abs(V_Ed)/(2*(h - 2*t_f)) to N/mm', langs de lijflassen'
a_w,req = sqrt(2*F_dw^2 + 3*F_la^2)*β_w*γ_M2/f_u to mm
a_req = max(3 mm; a_fl,req; a_w,req)', ten minste 3 mm'
UC_las = a_req/hoeklas

# 12. Samenvatting

#hide
UC_max = max(UC_c; UC_t; UC_kegel; UC_v; UC_tv; UC_las)
#show
UC_max', grootste van de toetsen hieronder'
'<table style="width:100%; border-collapse:collapse; font-size:0.95em;">
'<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:4px 8px;">Toets</th><th style="text-align:left; padding:4px 8px;">Norm</th><th style="text-align:right; padding:4px 8px;">UC</th><th style="text-align:left; padding:4px 8px;">Oordeel</th></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Druk op het beton en de kolomflens</td><td style="padding:4px 8px;">§6.2.5, §6.2.8</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_c)'">'UC_c'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_c)'">'oordeel(UC_c)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Trek in ankers en voetplaat</td><td style="padding:4px 8px;">§6.2.6.11, §6.2.6.12</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_t)'">'UC_t'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_t)'">'oordeel(UC_t)'</td></tr>
#if positie ≡ 1 or F_groep ≤ 0 kN
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kegelbreuk van het beton</td><td style="padding:4px 8px;">EN 1992-4 §7.2.1.4</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_kegel)'">'UC_kegel'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_kegel)'">'oordeel(UC_kegel)'</td></tr>
#else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kegelbreuk van het beton</td><td style="padding:4px 8px;">EN 1992-4 §7.2.1.4</td><td style="padding:4px 8px; text-align:right; color:#64748b">—</td><td style="padding:4px 8px; color:#64748b">zonder rand; apart toetsen</td></tr>
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Afschuiving</td><td style="padding:4px 8px;">§6.2.2</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_v)'">'UC_v'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_v)'">'oordeel(UC_v)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Trek en afschuiving in één anker</td><td style="padding:4px 8px;">tabel 3.4</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_tv)'">'UC_tv'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_tv)'">'oordeel(UC_tv)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Hoeklassen</td><td style="padding:4px 8px;">§4.5.3.2</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_las)'">'UC_las'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_las)'">'oordeel(UC_las)'</td></tr>
'</table>

#if ok_opzet ≡ 0
    '<b style="color:#b91c1c">De verbinding voldoet niet: een scharnierende kolomvoet kan het moment niet overbrengen.</b>
#else if ok_mx ≡ 0
    '<b style="color:#b91c1c">De verbinding voldoet niet: de ankers staan te dicht bij de flens om de trekkant te kunnen toetsen.</b>
#else if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de verbinding voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de verbinding voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten en vereenvoudigingen:</i>
'<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li>Het uittrekken van de ankerplaat, het splijten van het beton en de randbreuk onder dwarskracht (EN 1992-4) zijn niet getoetst; de ankerplaat moet groot genoeg zijn om de ankerkracht in het beton over te dragen.</li><li>Bij een rand dichtbij is geen spreiding van de druk aangenomen (k<sub>j</sub> = 1) en is de kegelbreuk niet getoetst.</li><li>De ankers in het midden (opzet 3 tot 5) tellen bij trek niet mee; dat ligt aan de veilige kant.</li><li>De trekweerstand van de ankers geldt voor schroefdraad volgens EN 1090; anders is een factor 0,85 nodig (§3.6.1(3)).</li><li>De dwarskracht werkt in de richting van d<sub>p</sub>; de stuikweerstand is met de randafstanden van de buitenste ankers gerekend.</li><li>De stijfheid van de kolomvoet (§6.3) en de ondersabeling zelf zijn niet getoetst.</li></ul>
`;
