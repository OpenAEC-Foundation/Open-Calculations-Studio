/**
 * Voetplaatverbinding (kolomvoet) volgens NEN-EN 1993-1-8 met NB, met de
 * kegelbreuk van het beton volgens NEN-EN 1992-4.
 *
 * Invoer zoals het parametrische beeld (VoetplaatDesigner.tsx): plaat
 * d_p × b_p × t_p, randafstanden e_d en e_b, zes ankeropzetten, ankermaat en
 * sterkteklasse. Getoetst: druk op het beton met de equivalente T-stukken
 * (§6.2.5, §6.2.6.9), trek in de ankerrij met de voetplaat op buiging
 * (§6.2.6.11, tabel 6.2 en 6.6), bij ankers binnen het profiel het T-stuk rond
 * het lijf (tabel 6.4), de krachtsverdeling bij normaalkracht en moment
 * volgens tabel 6.7 (§6.2.8.3), afschuiving met wrijving en de ankerbouten
 * (§6.2.2), trek en afschuiving samen (tabel 3.4), de hoeklassen (§4.5.3.2) en
 * de kegelbreuk van het beton (EN 1992-4 §7.2.1.4). f_y en f_u van de plaat
 * volgen tabel 3.1 naar dikte.
 *
 * Het T-stuk rond het lijf rekent als een rij zonder verstijving (tabel 6.4):
 * de flenzen vergroten l_eff alleen, dus dat ligt aan de veilige kant.
 *
 * Profielen HEB 100–400, HEA 100–400 en IPE 200–400 (id 1–38, gelijk aan het
 * beeld). Geen referentieberekening beschikbaar; scripts/check-voetplaat.mjs
 * rekent de uitkomsten onafhankelijk na.
 */

export const voetplaatverbinding = `"Voetplaatverbinding — EN 1993-1-8 §6.2.5 en §6.2.8

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
fu_tab = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 430; 510))
bw_tab = if(staalsoort ≡ 235; 0.8; if(staalsoort ≡ 275; 0.85; 0.9))
#show
f_u = fu_tab*N/mm^2', tabel 3.1, t ≤ 40 mm'
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
ok_tp = 1
#show
#if flush ≡ 1
    '<i>De plaat is gelijk met het profiel (d<sub>p</sub> ≤ h); deze kolomvoet geldt als scharnierend.</i>
#end if
'Voetplaat 'd_pl' × 'b_pl' × 't_p' mm met 'n_a' ankers M'd_anker' – 'kwaliteit'; de buitenste ankers staan op x = 'x_max' mm en y = 'y_max' mm van het hart.
#if t_p ≤ 40 mm
    #hide
    f_y,p = f_y
    f_u,p = f_u
    #show
#else
    #hide
    fup_tab = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 410; 470))
    #show
    f_y,p = (staalsoort - 20)*N/mm^2', voetplaat, tabel 3.1, 40 < t ≤ 80 mm'
    f_u,p = fup_tab*N/mm^2', tabel 3.1, 40 < t ≤ 80 mm'
    #if t_p > 80 mm
        #hide
        ok_tp = 0
        #show
        '<b style="color:#b91c1c">De voetplaat is dikker dan 80 mm: f<sub>y</sub> en f<sub>u</sub> vallen buiten tabel 3.1.</b>
    #end if
#end if
f_yb = fyb_tab*N/mm^2
f_ub = fub_tab*N/mm^2

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

@select c_onder "Onder de ankerplaat: dikte van plaat of kop plus dekking"
  50 mm = 50
  40 mm = 40
  60 mm = 60
  75 mm = 75
  100 mm = 100
@end

f_ck = betonklasse*N/mm^2
f_cd = f_ck/1.5', α_cc = 1,0 (NB bij EN 1992-1-1)'
h_b,min = h_ef + c_onder*mm', ankerplaat en dekking (EN 1992-1-1 §4.4.1) passen in het blok'
#hide
ok_hb = 1
#show
#if h_b < h_b,min
    #hide
    ok_hb = 0
    #show
    '<b style="color:#b91c1c">Het betonblok is te laag voor de verankeringsdiepte: h<sub>b</sub> = 'h_b' mm &lt; 'h_b,min' mm.</b>
#end if

# 4. Belasting

N_Ed = ?*(kN)', normaalkracht, druk positief'
M_Ed = ?*(kN*m)', moment om de sterke as'
V_Ed = ?*(kN)', dwarskracht in de richting van d_p'
#hide
M_abs = abs(M_Ed) to kN*m
#show

# 5. Druk op het beton (§6.2.5 en EN 1992-1-1 §6.7)

k_sp = min(3; 1 + h_b/max(b_pl; d_pl))', spreiding in het blok, A_c1 ≤ 9·A_c0'
k_j = if(positie ≡ 1; k_sp; 1)', concentratiefactor, 1 bij een rand dichtbij'
f_jd = 2/3*k_j*f_cd', β_j = 2/3 (§6.2.5(7))'
t_g,max = 0.2*min(b_pl; d_pl)
#if t_g > 50 mm
    f_ck,g = f_ck', minimale sterkte van de ondersabeling, t_g > 50 mm (§6.2.5(7))'
#else
    f_ck,g = 0.2*f_ck', minimale sterkte van de ondersabeling (§6.2.5(7))'
#end if
#if t_g > t_g,max
    '<b style="color:#b45309">De ondersabeling is dikker dan 0,2·min(b<sub>p</sub>; d<sub>p</sub>) = 't_g,max' mm: β<sub>j</sub> = 2/3 geldt dan niet (§6.2.5(7)); toets de ondersabeling apart.</b>
#end if
c = t_p*sqrt(f_y,p/(3*f_jd*γ_M0)) to mm', bijkomende steunbreedte (6.5)'
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
    '<i>Ankerrij buiten de getrokken flens als equivalent T-stuk (tabel 6.6); wrikkrachten tellen alleen voor de ankers (§6.2.6.11(2)).</i>
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
    M_pl,1,Rd = 0.25*l_eff,1*t_p^2*f_y,p/γ_M0 to kN*m
    M_pl,2,Rd = 0.25*l_eff,nc*t_p^2*f_y,p/γ_M0 to kN*m
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
#else if N_Ed < 0 kN
    '<i>De plaat buigt rond het lijf: equivalent T-stuk met de ankers aan weerszijden van het lijf (tabel 6.4, zonder de verstijving door de flenzen); wrikkrachten tellen alleen voor de ankers (§6.2.6.11(2)).</i>
    m_w = y_g - t_w/2 - 0.8*sqrt(2)*hoeklas', van het anker tot de voet van de lijflas'
    #if m_w ≤ 0 mm
        #hide
        ok_mx = 0
        #show
        '<b style="color:#b91c1c">De ankers staan te dicht bij het lijf (m<sub>w</sub> ≤ 0).</b>
    #end if
    e_w = b_pl/2 - y_g', van het anker tot de rand van de plaat'
    #if ank_opzet ≡ 1
        l_eff,cp = 2*pi*m_w to mm', rond patroon, per kant'
        l_eff,nc = 4*m_w + 1.25*e_w to mm', niet-rond patroon, per kant'
    #else
        s_w = 2*x_h', afstand tussen de twee ankers aan één kant van het lijf'
        l_eff,cp = min(4*pi*m_w; 2*pi*m_w + 2*s_w) to mm', rond, los of als groep, per kant'
        l_eff,nc = min(8*m_w + 2.5*e_w; 4*m_w + 1.25*e_w + s_w) to mm', niet-rond, los of als groep, per kant'
    #end if
    l_eff,1 = min(l_eff,cp; l_eff,nc)
    M_pl,1,Rd = 0.25*l_eff,1*t_p^2*f_y,p/γ_M0 to kN*m
    M_pl,2,Rd = 0.25*l_eff,nc*t_p^2*f_y,p/γ_M0 to kN*m
    n_e = min(e_w; 1.25*m_w)
    L_b = 8*d_a + t_g + t_p + 0.6*d_a', 8d, ondersabeling, plaat, sluitring en halve moer'
    L_b,s = 8.8*m_w^3*A_s*(n_a/2)/(l_eff,1*t_p^3) to mm', L_b*, n_a/2 rijen'
    F_T,12,Rd = 2*M_pl,1,Rd/m_w to kN', plaat zonder wrikkrachten'
    F_T,2,Rd = (2*M_pl,2,Rd + n_e*n_a*F_t,Rd)/(m_w + n_e) to kN', ankers met wrikkracht'
    F_T,3,Rd = n_a*F_t,Rd', alle ankers'
    F_t,wb,Rd = l_eff,1*t_w*f_y/γ_M0 to kN', getrokken lijf (§6.2.6.8)'
    #if L_b > L_b,s
        F_T,Rd = min(F_T,12,Rd; F_T,3,Rd; F_t,wb,Rd) to kN', geen wrikkrachten'
    #else
        F_T,Rd = min(F_T,12,Rd; F_T,2,Rd; F_T,3,Rd; F_t,wb,Rd) to kN', met wrikkrachten voor de ankers'
    #end if
#end if

# 7. Krachtsverdeling (§6.2.8.3, tabel 6.7)

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
z_C = (h - t_f)/2', tot het midden van de gedrukte flens'
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
        UC_t = -N_Ed/F_T,Rd', T-stuk rond het lijf met alle ankers'
        #hide
        F_groep = -N_Ed
        n_T = n_a
        s_x = if(ank_opzet ≡ 6; 2*x_h; 0 mm)
        s_y = 2*y_g
        #show
    #end if
#else
    z_T = x_E', tot de getrokken ankerrij'
    z = z_T + z_C
    #if M_abs ≡ 0 kN*m and N_Ed ≥ 0 kN
        UC_c = N_Ed/N_j,Rd', zuivere druk'
    #else
        #hide
        F_T,0 = (M_abs - N_Ed*z_C)/z to kN
        #show
        #if F_T,0 ≤ 0 kN
            '<i>Geen trek in de ankers: beide kanten zijn gedrukt.</i>
            F_C = N_Ed/2 + M_abs/(2*z_C) to kN', zwaarst gedrukte flens'
            UC_c = F_C/F_C,Rd
        #else if N_Ed + F_T,0 > 0 kN
            '<i>De ene kant is getrokken, de andere gedrukt.</i>
            F_T = (M_abs - N_Ed*z_C)/z to kN', getrokken ankerrij, momenten om het drukpunt'
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
    k_1 = if(gescheurd ≡ 1; 8.9; 12.7)', ingestort anker: gescheurd 8,9, ongescheurd 12,7'
    s_cr = 3*h_ef', s_cr,N'
    N_Rk,c0 = k_1*sqrt(betonklasse)*(h_ef/(1 mm))^1.5*N to kN
    a_x = s_cr + min(s_x; s_cr)
    a_y = s_cr + min(s_y; s_cr)
    A_c,N = a_x*a_y to mm^2', één kegel voor de getrokken ankers samen'
    A_c,N0 = s_cr^2 to mm^2
    ψ_re = min(1; 0.5 + h_ef/(200 mm))
    ψ_ec', excentriciteit van de trek in de groep'
    N_Rd,c = N_Rk,c0*A_c,N/A_c,N0*ψ_re*ψ_ec/1.5 to kN', γ_Mc = 1,5'
    UC_kegel = F_groep/N_Rd,c
    #if positie ≠ 1
        '<b style="color:#b45309">Er ligt een rand dichtbij: de kegelbreuk is hier zonder randeffect gerekend. Toets de kegelbreuk met de werkelijke randafstanden en de randbreuk apart (EN 1992-4 §7.2.1.4 en §7.2.2.5).</b>
    #end if
#else
    '<i>Geen trek in de ankers: de kegelbreuk is niet maatgevend.</i>
#end if

# 9. Afschuiving (§6.2.2)

@select wrijving "Wrijving meenemen"
  Ja = 1
  Nee = 0
@end

N_c,Ed = max(N_Ed; 0 kN)', drukkracht, bij trek nul'
F_f,Rd = if(wrijving ≡ 1; 0.20*N_c,Ed; 0 kN) to kN', (6.1), zand-cementmortel'
α_bc = 0.44 - 0.0003*fyb_tab', (6.2)'
#if fyb_tab > 640
    '<i>(6.2) geldt voor f<sub>yb</sub> tot 640 N/mm²; voor klasse 10.9 is α<sub>bc</sub> hier met de werkelijke f<sub>yb</sub> doorgetrokken.</i>
#end if
F_2,vb,Rd = α_bc*f_ub*A_s/γ_M2 to kN', (6.2)'
#hide
spel = if(d_anker ≤ 14; 1; if(d_anker ≤ 24; 2; 3))
ok_e = 1
#show
d_0 = d_a + spel*mm', gatdiameter bij normale speling'
e_1 = d_pl/2 - x_max', randafstand in de krachtrichting'
e_2 = b_pl/2 - y_max', randafstand loodrecht erop'
#if min(e_1; e_2) < 1.2*d_0
    #hide
    ok_e = 0
    e_min = 1.2*d_0
    #show
    '<b style="color:#b91c1c">De randafstand van de ankers is kleiner dan 1,2·d<sub>0</sub> = 'e_min' mm (tabel 3.3).</b>
#end if
α_b = min(e_1/(3*d_0); f_ub/f_u,p; 1)
k_1s = max(min(2.8*e_2/d_0 - 1.7; 2.5); 0)
F_1,vb,Rd = k_1s*α_b*f_u,p*d_a*t_p/γ_M2 to kN', stuik van de plaat (tabel 3.4)'
F_vb,Rd = min(F_1,vb,Rd; F_2,vb,Rd)
n_v = if(gatspeling ≡ 1; n_a; 0)', ankers die meedoen: alleen bij normale gatspeling (§6.2.2(5))'
V_Rd = F_f,Rd + n_v*F_vb,Rd to kN', (6.3)'
#hide
ok_v = 1
UC_v = 0
#show
#if V_Rd > 0 kN
    UC_v = abs(V_Ed)/V_Rd
#else if abs(V_Ed) > 0 kN
    #hide
    ok_v = 0
    #show
    '<b style="color:#b91c1c">Geen afschuifweerstand: geen wrijving en vergrote gaten. Pas een schuifprop of gaten met normale speling toe.</b>
#else
    UC_v', geen dwarskracht'
#end if

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

A_fl = b_k*t_f
F_M = M_abs/(h - t_f) to kN', flenskracht uit het moment'
F_N = N_Ed*A_fl/A_k to kN', deel van de normaalkracht in de flens'
F_fl = max(F_M - F_N; 0 kN)', trek in de flens, dwars op de lassen rond de flens'
a_fl,req = sqrt(2)*F_fl/(2*b_k - t_w)*β_w*γ_M2/f_u,p to mm', richtingsmethode, f_u van het zwakste deel'
A_wb = (h - 2*t_f)*t_w
F_dw = max(-N_Ed; 0 kN)*A_wb/A_k/(2*(h - 2*t_f)) to N/mm', dwars op de lijflassen'
F_la = abs(V_Ed)/(2*(h - 2*t_f)) to N/mm', langs de lijflassen'
a_w,req = sqrt(2*F_dw^2 + 3*F_la^2)*β_w*γ_M2/f_u,p to mm
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
#if t_g > t_g,max
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Ondersabeling</td><td style="padding:4px 8px;">§6.2.5(7)</td><td style="padding:4px 8px; text-align:right; color:#b45309">—</td><td style="padding:4px 8px; color:#b45309">apart toetsen</td></tr>
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Trek in ankers en voetplaat</td><td style="padding:4px 8px;">§6.2.6.11, §6.2.6.12</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_t)'">'UC_t'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_t)'">'oordeel(UC_t)'</td></tr>
#if positie ≡ 1 or F_groep ≤ 0 kN
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kegelbreuk van het beton</td><td style="padding:4px 8px;">EN 1992-4 §7.2.1.4</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_kegel)'">'UC_kegel'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_kegel)'">'oordeel(UC_kegel)'</td></tr>
#else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Kegelbreuk van het beton</td><td style="padding:4px 8px;">EN 1992-4 §7.2.1.4</td><td style="padding:4px 8px; text-align:right; color:#64748b">—</td><td style="padding:4px 8px; color:#64748b">zonder rand; apart toetsen</td></tr>
#end if
#if ok_v ≡ 0
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Afschuiving</td><td style="padding:4px 8px;">§6.2.2</td><td style="padding:4px 8px; text-align:right; color:#b91c1c">—</td><td style="padding:4px 8px; color:#b91c1c">geen weerstand</td></tr>
#else
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Afschuiving</td><td style="padding:4px 8px;">§6.2.2</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_v)'">'UC_v'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_v)'">'oordeel(UC_v)'</td></tr>
#end if
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Trek en afschuiving in één anker</td><td style="padding:4px 8px;">tabel 3.4</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_tv)'">'UC_tv'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_tv)'">'oordeel(UC_tv)'</td></tr>
'<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:4px 8px;">Hoeklassen</td><td style="padding:4px 8px;">§4.5.3.2</td><td style="padding:4px 8px; text-align:right; white-space:nowrap; color:'kleur(UC_las)'">'UC_las'</td><td style="padding:4px 8px; white-space:nowrap; color:'kleur(UC_las)'">'oordeel(UC_las)'</td></tr>
'</table>

#if ok_opzet ≡ 0
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de verbinding voldoet niet</b>: een scharnierende kolomvoet kan het moment niet overbrengen.</span>
#else if ok_mx ≡ 0
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de verbinding voldoet niet</b>: de ankers staan te dicht bij het profiel om de trekkant te kunnen toetsen.</span>
#else if ok_tp ≡ 0
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de verbinding is niet getoetst</b>: een voetplaat dikker dan 80 mm valt buiten tabel 3.1.</span>
#else if ok_hb ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar <b>de verbinding voldoet niet</b>: het betonblok is te laag voor de verankeringsdiepte.</span>
#else if ok_e ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar <b>de verbinding voldoet niet</b>: de randafstand van de ankers is kleiner dan 1,2·d<sub>0</sub> (tabel 3.3).</span>
#else if ok_v ≡ 0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar <b>de verbinding voldoet niet</b>: er is geen afschuifweerstand.</span>
#else if UC_max ≤ 1.0
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de verbinding voldoet</b></span>
#else
    '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de verbinding voldoet niet</b></span>
#end if

'<hr/>
'<i>Aandachtspunten:</i>
'<ul style="margin:2px 0 0 0; padding-left:1.3em; font-size:0.95em;"><li>Niet getoetst: het uittrekken van de ankerplaat, het splijten van het beton, de randbreuk onder dwarskracht (EN 1992-4) en de stijfheid van de kolomvoet (§6.3).</li><li>Bij een rand dichtbij: geen spreiding (k<sub>j</sub> = 1) en de kegelbreuk apart toetsen.</li><li>De dwarskracht werkt in de richting van d<sub>p</sub>; de stuik is met de randafstanden van de buitenste ankers gerekend.</li><li>De trekweerstand van de ankers geldt voor schroefdraad volgens EN 1090; anders factor 0,85 (§3.6.1(3)).</li></ul>
`;
