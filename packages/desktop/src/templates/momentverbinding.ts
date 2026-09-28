/**
 * Momentverbinding — ligger op de flens van een doorgaande kolom, volgens
 * NEN-EN 1993-1-8 met de Nederlandse NB.
 *
 * Geboute kopplaat: de componentenmethode van §6.2.7.2. Per boutrij (6) de
 * kleinste van kolomflens op buiging (tabel 6.4), kolomlijf op trek (6.15),
 * kopplaat op buiging (tabel 6.6, α uit figuur 6.11) en liggerlijf op trek
 * (6.22); daarna de grens uit kolomlijf op afschuiving,
 * kolomlijf op druk en liggerflens op druk (7), de rijgroepen (8) en de
 * driehoeksverdeling (9), volgens de NB vanaf 1,8·F_t,Rd in plaats van
 * 1,9·F_t,Rd. Draagt een rij meer dan 1,8·F_t,Rd terwijl de verbinding niet
 * volledig sterk is (M_j,Rd < min(M_pl,b,Rd; 2·M_pl,c,Rd), figuur 5.5), dan
 * vraagt de opmerking in de NB een ander ontwerp: het blad keurt af.
 * M_j,Rd = Σ h_r·F_tr,Rd (6.25). Gelaste verbinding: de
 * flenskracht door kolomlijf en kolomflens (§6.2.6.3, §6.2.6.4.3), de
 * flenslassen op de volle flens (§4.10(5)). Verder de dwarskracht via de
 * bouten met de interactie van tabel 3.4, de lassen van de ligger (§4.5.3),
 * S_j,ini (§6.3, tabel 6.11) en de classificatie (§5.2.2.5).
 *
 * Lassen volgens §6.2.3(4): ze mogen M_j,Rd niet begrenzen. De flenslas
 * draagt daarom de flenskracht bij M_j,Rd, M_j,Rd/z_f (niet M_Ed/z_f). De
 * lijflas zit niet in de component liggerlijf op trek; in de trekzone moet hij
 * per mm minstens zo sterk zijn als het lijf zelf (√2·a·f_u/(β_w·γ_M2) ≥
 * t_w·f_y/γ_M0), dan kan hij bij geen enkele rij of rijgroep maatgevend zijn.
 * Een zwakkere lijflas keurt af, ook als de rijen het lijf niet volbelasten
 * (veilige kant).
 *
 * Geometrie. De diepte y loopt vanaf de bovenkant van de ligger naar beneden.
 * Korte kopplaat: plaat gelijk met de ligger, rij 1 op e_kp. Overstekende en
 * doorlopende kopplaat: plaat u_kp boven de ligger, rij 1 op e_kp onder de
 * plaatrand (boven de trekflens), rij 2 op p_fl daaronder en onder de
 * trekflens; daarna p_kp. De doorlopende kopplaat steekt ook onder u_kp uit
 * (alleen van belang voor s_p). Een rij waarvan de sluitring een flens of
 * flenslas raakt, of een tweede rij boven de ligger, maakt de verbinding
 * ongeldig; het blad noemt de rij. Het beeld rekent dezelfde zones na en
 * kleurt zo'n rij rood. Het blad toetst M_Ed ≥ 0 (trek bovenin) en V_Ed ≥ 0
 * (omlaag); een negatieve waarde keurt af.
 *
 * Aannames aan de veilige kant: β = 1 (enkelzijdig, tabel 5.4); kolommoment
 * gelijk aan M_Ed voor k_wc; A_vc met η = 1; bij een console met flens alleen
 * die flens op druk; een console zonder flens telt niet mee; bouten in
 * getrokken rijen dragen hooguit 0,4/1,4·F_v,Rd dwarskracht; α uit figuur 6.11
 * nooit onder de waarde van een onverstijfde rij (4m + 1,25e). Een kolom die
 * boven de verbinding eindigt, verstijvingen en een moment met trek onderin
 * zitten er niet in; de slotregel van het blad noemt wat ontbreekt.
 *
 * Figuur 6.11 staat er analytisch in: boven λ₂,lim loopt een lijn verticaal op
 * λ₁,lim = 1,25/(α − 2,75), daaronder λ₂ = λ₂,lim·(λ₁,lim/λ₁)^((α/√2)^1,785)
 * met λ₂,lim = α·λ₁,lim/2; α ≤ 8.
 *
 * De profielmatrix komt uit profielen.ts (scripts/check-profielen.mjs bewaakt
 * hem). De rijen 1–8 staan uitgeschreven. scripts/check-moment.mjs rekent het
 * blad onafhankelijk na en legt een handberekening vast.
 *
 * Invoernamen komen overeen met MomentverbindingDesigner.tsx; dat beeld leest
 * de UC en het oordeel uit de slotregel van dit blad.
 */

export const momentverbinding = `"Momentverbinding — EN 1993-1-8 §6.2.7

'<i>Momentvaste ligger–kolomverbinding, enkelzijdig op de flens van een doorgaande kolom zonder verstijvingen; het moment geeft trek bovenin. Geboute kopplaat: trek per boutrij en per rijgroep uit de T-stukken van kolomflens en kopplaat, begrensd door het kolomlijf op afschuiving en druk en de liggerflens op druk (§6.2.7.2). Gelaste verbinding: de flenskracht door de kolomflens en het kolomlijf (§6.2.7.1). Daarna de dwarskracht, de lassen van de ligger, de rotatiestijfheid en de classificatie.</i><span class="alleen-scherm"></span>

# 1. Systeem, profielen en materiaal

@select stabiliteit "Stabiliteit van het raamwerk"
  Ongeschoord = 1
  Geschoord = 2
@end

@select verbindingstype "Type verbinding"
  Geboute verbinding = 1
  Gelaste verbinding = 2
@end

@select kopplaattype "Kopplaat"
  Korte kopplaat = 1
  Doorlopende kopplaat = 2
  Overstekende kopplaat = 3
@end

@select kolomprofiel "Kolomprofiel"
  HEB 140 = 13
  HEB 160 = 14
  HEB 180 = 15
  HEB 200 = 16
  HEB 220 = 17
  HEB 240 = 18
  HEB 260 = 19
  HEB 300 = 20
  HEA 200 = 6
  HEA 240 = 8
  HEA 300 = 10
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
  M27 = 27
  M30 = 30
@end

@select console "Console onder de ligger"
  Geen = 0
  Console zonder flens = 1
  Console met flens = 2
@end

'<i>Korte kopplaat: gelijk met de bovenkant van de ligger, alle boutrijen onder de trekflens. Overstekende kopplaat: steekt u<sub>kp</sub> boven de ligger uit, met de bovenste boutrij boven de trekflens. Doorlopende kopplaat: als de overstekende, en steekt ook onder u<sub>kp</sub> uit. Een console zonder flens telt in de toetsing niet mee; bij een console met flens ligt het drukpunt in die flens. Flens en lijf van de console zijn gerekend als die van de ligger, de kleinste maten die §6.2.6.7(2) toelaat.</i><span class="alleen-scherm"></span>
#hide
'Profieltabel uit profielen.ts: id | h (mm) | b (mm) | t_w (mm) | t_f (mm) | r (mm) | A (cm²) | I_y (cm⁴) | W_el,y (cm³) | W_pl,y (cm³) | i_y (cm) | A_v,z (cm²) | I_z (cm⁴) | W_el,z (cm³) | W_pl,z (cm³) | i_z (cm) | I_t (cm⁴) | I_w (cm⁶)
profielen = [13; 14; 15; 16; 17; 18; 19; 20; 6; 8; 10; 21; 22; 23; 24; 25; 26; 27 |140; 160; 180; 200; 220; 240; 260; 300; 190; 230; 290; 200; 240; 270; 300; 330; 360; 400 |140; 160; 180; 200; 220; 240; 260; 300; 200; 240; 300; 100; 120; 135; 150; 160; 170; 180 |7; 8; 8.5; 9; 9.5; 10; 10; 11; 6.5; 7.5; 8.5; 5.6; 6.2; 6.6; 7.1; 7.5; 8; 8.6 |12; 13; 14; 15; 16; 17; 17.5; 19; 10; 12; 14; 8.5; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5 |12; 15; 15; 18; 18; 21; 24; 27; 18; 21; 27; 12; 15; 15; 15; 18; 18; 21 |42.96; 54.25; 65.25; 78.08; 91.04; 106; 118.4; 149.1; 53.83; 76.84; 112.5; 28.48; 39.12; 45.95; 53.81; 62.61; 72.73; 84.46 |1509; 2492; 3831; 5696; 8091; 11260; 14920; 25170; 3692; 7763; 18260; 1943; 3892; 5790; 8356; 11770; 16270; 23130 |215.6; 311.5; 425.7; 569.6; 735.5; 938.3; 1148; 1678; 388.6; 675.1; 1260; 194.3; 324.3; 428.9; 557.1; 713.1; 903.6; 1156 |245.4; 354; 481.4; 642.5; 827; 1053; 1283; 1869; 429.5; 744.6; 1383; 220.6; 366.6; 484; 628.4; 804.3; 1019; 1307 |5.93; 6.78; 7.66; 8.54; 9.43; 10.31; 11.22; 12.99; 8.28; 10.05; 12.74; 8.26; 9.97; 11.23; 12.46; 13.71; 14.95; 16.55 |13.08; 17.59; 20.24; 24.83; 27.92; 33.23; 37.59; 47.43; 18.08; 25.18; 37.28; 14; 19.14; 22.14; 25.68; 30.81; 35.14; 42.69 |549.7; 889.2; 1363; 2003; 2843; 3923; 5135; 8563; 1336; 2769; 6310; 142.4; 283.6; 419.9; 603.8; 788.1; 1043; 1318 |78.52; 111.2; 151.4; 200.3; 258.5; 326.9; 395; 570.9; 133.6; 230.7; 420.6; 28.47; 47.27; 62.2; 80.5; 98.52; 122.8; 146.4 |119.8; 170; 231; 305.8; 393.9; 498.4; 602.2; 870.1; 203.8; 351.7; 641.2; 44.61; 73.92; 96.95; 125.2; 153.7; 191.1; 229 |3.58; 4.05; 4.57; 5.07; 5.59; 6.08; 6.58; 7.58; 4.98; 6; 7.49; 2.24; 2.69; 3.02; 3.35; 3.55; 3.79; 3.95 |20.06; 31.24; 42.16; 59.28; 76.57; 102.7; 123.8; 185; 20.98; 41.55; 85.17; 6.98; 12.88; 15.94; 20.12; 28.15; 37.32; 51.08 |22480; 47940; 93750; 171100; 295400; 486900; 753700; 1688000; 108000; 328500; 1200000; 12990; 37390; 70580; 125900; 199100; 313600; 490000]
h_c = hlookup(profielen; kolomprofiel; 1; 2)*mm
b_c = hlookup(profielen; kolomprofiel; 1; 3)*mm
t_wc = hlookup(profielen; kolomprofiel; 1; 4)*mm
t_fc = hlookup(profielen; kolomprofiel; 1; 5)*mm
r_c = hlookup(profielen; kolomprofiel; 1; 6)*mm
A_c = hlookup(profielen; kolomprofiel; 1; 7)*cm^2
I_c = hlookup(profielen; kolomprofiel; 1; 8)*cm^4
W_pl,c = hlookup(profielen; kolomprofiel; 1; 10)*cm^3
A_vz,c = hlookup(profielen; kolomprofiel; 1; 12)*cm^2
h_b = hlookup(profielen; liggerprofiel; 1; 2)*mm
b_b = hlookup(profielen; liggerprofiel; 1; 3)*mm
t_wb = hlookup(profielen; liggerprofiel; 1; 4)*mm
t_fb = hlookup(profielen; liggerprofiel; 1; 5)*mm
r_b = hlookup(profielen; liggerprofiel; 1; 6)*mm
I_b = hlookup(profielen; liggerprofiel; 1; 8)*cm^4
W_pl,b = hlookup(profielen; liggerprofiel; 1; 10)*cm^3
A_vz,b = hlookup(profielen; liggerprofiel; 1; 12)*cm^2
fu_tab = if(staalsoort ≡ 235; 360; if(staalsoort ≡ 275; 430; 490))
bw_tab = if(staalsoort ≡ 235; 0.8; if(staalsoort ≡ 275; 0.85; 0.9))
fub_tab = if(boutkwaliteit ≡ 46; 400; if(boutkwaliteit ≡ 56; 500; if(boutkwaliteit ≡ 88; 800; 1000)))
av_tab = if(boutkwaliteit ≡ 109; 0.5; 0.6)
As_tab = if(boutmaat ≡ 12; 84.3; if(boutmaat ≡ 16; 157; if(boutmaat ≡ 20; 245; if(boutmaat ≡ 24; 353; if(boutmaat ≡ 27; 459; 561)))))
d0_tab = if(boutmaat ≡ 12; 13; if(boutmaat ≡ 16; 18; if(boutmaat ≡ 20; 22; if(boutmaat ≡ 24; 26; if(boutmaat ≡ 27; 30; 33)))))
'Sluitring ISO 7089 (buitendiameter en dikte), kop ISO 4014, moer ISO 4032, sleutelwijdte en maat over de hoeken.
dw_tab = if(boutmaat ≡ 12; 24; if(boutmaat ≡ 16; 30; if(boutmaat ≡ 20; 37; if(boutmaat ≡ 24; 44; if(boutmaat ≡ 27; 50; 56)))))
tr_tab = if(boutmaat ≡ 12; 2.5; if(boutmaat ≡ 16; 3; if(boutmaat ≡ 20; 3; 4)))
kop_tab = if(boutmaat ≡ 12; 7.5; if(boutmaat ≡ 16; 10; if(boutmaat ≡ 20; 12.5; if(boutmaat ≡ 24; 15; if(boutmaat ≡ 27; 17; 18.7)))))
moer_tab = if(boutmaat ≡ 12; 10.8; if(boutmaat ≡ 16; 14.8; if(boutmaat ≡ 20; 18; if(boutmaat ≡ 24; 21.5; if(boutmaat ≡ 27; 23.8; 25.6)))))
sw_tab = if(boutmaat ≡ 12; 18; if(boutmaat ≡ 16; 24; if(boutmaat ≡ 20; 30; if(boutmaat ≡ 24; 36; if(boutmaat ≡ 27; 41; 46)))))
ew_tab = if(boutmaat ≡ 12; 20.03; if(boutmaat ≡ 16; 26.75; if(boutmaat ≡ 20; 32.95; if(boutmaat ≡ 24; 39.55; if(boutmaat ≡ 27; 45.2; 50.85)))))
γ_M0 = 1.0
γ_M1 = 1.0
γ_M2 = 1.25
β = 1
E = 210000 N/mm^2
F_oo = 1e9 kN
F_ool = 1e9 mm
#show
'Kolom: h = 'h_c', b = 'b_c', t<sub>w</sub> = 't_wc', t<sub>f</sub> = 't_fc', r = 'r_c' mm. Ligger: h = 'h_b', b = 'b_b', t<sub>w</sub> = 't_wb', t<sub>f</sub> = 't_fb', r = 'r_b' mm, W<sub>pl,y</sub> = 'W_pl,b' cm³.
f_y = staalsoort*N/mm^2', tabel 3.1 van EN 1993-1-1, t ≤ 40 mm<span class="alleen-scherm"></span>'
f_y', tabel 3.1 van EN 1993-1-1, t ≤ 40 mm<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
f_u = fu_tab*N/mm^2', tabel 3.1 van EN 1993-1-1<span class="alleen-scherm"></span>'
f_u', tabel 3.1 van EN 1993-1-1<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
β_w = bw_tab', tabel 4.1<span class="alleen-scherm"></span>'
β_w', tabel 4.1<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
'γ<sub>M0</sub> = γ<sub>M1</sub> = 1,0 en γ<sub>M2</sub> = 1,25 (NB). Enkelzijdige verbinding: β = 1 (tabel 5.4).

# 2. Kopplaat, bouten en lassen

#if verbindingstype ≡ 1
    n_boutrijen = ?', aantal boutrijen, ten hoogste 8<span class="kolom-3"></span>'
    t_kp = ?*(mm)', dikte kopplaat<span class="kolom-3"></span>'
    b_kp = ?*(mm)', breedte kopplaat<span class="kolom-3"></span>'
    w_kp = ?*(mm)', hart-op-hart bouten in een rij<span class="kolom-3"></span>'
    e_kp = ?*(mm)', bovenrand kopplaat – bovenste rij<span class="kolom-3"></span>'
    p_kp = ?*(mm)', steek van de rijen onder de trekflens<span class="kolom-3"></span>'
    #if kopplaattype ≡ 1
        #hide
        y_kp = 0 mm
        p_12 = p_kp
        #show
    #else
        u_kp = ?*(mm)', uitsteek boven de ligger<span class="kolom-3"></span>'
        p_fl = ?*(mm)', steek over de trekflens, rij 1 – rij 2<span class="kolom-3"></span>'
        #hide
        y_kp = -u_kp
        p_12 = p_fl
        #show
    #end if
#end if
a_flens = ?*(mm)', keeldikte flenslassen<span class="kolom-3"></span>'
a_lijf = ?*(mm)', keeldikte lijflassen<span class="kolom-3"></span>'
#if console > 0
    h_console = ?*(mm)', hoogte console<span class="kolom-3"></span>'
    l_console = ?*(mm)', lengte console<span class="kolom-3"></span>'
    #hide
    h_cs = h_console
    l_cs = l_console
    #show
#else
    #hide
    h_cs = 0 mm
    l_cs = 0 mm
    #show
#end if

# 3. Belastingen

M_Ed = ?*(kN*m)', moment, trek bovenin<span class="kolom-3"></span>'
V_Ed = ?*(kN)', dwarskracht<span class="kolom-3"></span>'
N_c,Ed = ?*(kN)', normaalkracht kolom, druk positief<span class="kolom-3"></span>'
L_b = ?*(mm)', overspanning ligger, voor de classificatie<span class="kolom-3"></span>'

# 4. Geometrie en voorwaarden

#hide
ok_a = if(a_flens ≥ 3 mm and a_lijf ≥ 3 mm; 1; 0)
ok_cs = if(console ≡ 2; if(h_cs ≤ l_cs; 1; 0); 1)
ε = sqrt(235 N/mm^2/f_y)
d_wc = h_c - 2*(t_fc + r_c)
ok_dc = if(d_wc/t_wc ≤ 69*ε; 1; 0)
'Drukpunt (figuur 6.15): midden van de flens van de console, anders van de onderflens van de ligger.
y_c = if(console ≡ 2; h_b + h_cs - t_fb/2; h_b - t_fb/2)
z_f = y_c - t_fb/2
ok_last = if(M_Ed ≥ 0 kN*m and V_Ed ≥ 0 kN; 1; 0)
ok_geo = 1
ok_bfc = 1
ok_volsterk = 1
n_t = 1
#show
#if ok_last ≡ 0
    '<b style="color:#b91c1c">M<sub>Ed</sub> en V<sub>Ed</sub> mogen niet negatief zijn: het blad toetst een moment met trek bovenin en een dwarskracht omlaag.</b>
#end if
#if ok_a ≡ 0
    '<b style="color:#b91c1c">Een keeldikte is kleiner dan 3 mm (§4.5.2(2)).</b>
#end if
#if ok_cs ≡ 0
    '<b style="color:#b91c1c">De flens van de console staat steiler dan 45° op de liggerflens: h<sub>console</sub> > l<sub>console</sub> (§6.2.6.7(2)).</b>
#end if
#if ok_dc ≡ 0
    '<b style="color:#b91c1c">Het kolomlijf is te slank voor §6.2.6.1: d<sub>c</sub>/t<sub>w</sub> > 69ε.</b>
#end if
#if verbindingstype ≡ 1
    #hide
    n_r = min(max(round(n_boutrijen); 1); 8)
    ext = if(kopplaattype ≡ 1; 0; 1)
    r_f = if(ext ≡ 1; 2; 1)
    b_p = max(b_kp; b_b)
    d = boutmaat*mm
    d_0 = d0_tab*mm
    r_w = dw_tab/2*mm
    A_s = As_tab*mm^2
    f_ub = fub_tab*N/mm^2
    u_onder = if(kopplaattype ≡ 2; -y_kp; 0 mm)
    y_1 = y_kp + e_kp
    y_2 = y_1 + p_12
    y_3 = y_2 + 1*p_kp
    y_4 = y_2 + 2*p_kp
    y_5 = y_2 + 3*p_kp
    y_6 = y_2 + 4*p_kp
    y_7 = y_2 + 5*p_kp
    y_8 = y_2 + 6*p_kp
    yv(j) = if(j ≡ 1; y_1; y_2 + (j - 2)*p_kp)
    h_1 = y_c - y_1
    h_2 = y_c - y_2
    h_3 = y_c - y_3
    h_4 = y_c - y_4
    h_5 = y_c - y_5
    h_6 = y_c - y_6
    h_7 = y_c - y_7
    h_8 = y_c - y_8
    n_t = if(n_r ≥ 1 and h_1 > 0 mm; 1; 0) + if(n_r ≥ 2 and h_2 > 0 mm; 1; 0) + if(n_r ≥ 3 and h_3 > 0 mm; 1; 0) + if(n_r ≥ 4 and h_4 > 0 mm; 1; 0) + if(n_r ≥ 5 and h_5 > 0 mm; 1; 0) + if(n_r ≥ 6 and h_6 > 0 mm; 1; 0) + if(n_r ≥ 7 and h_7 > 0 mm; 1; 0) + if(n_r ≥ 8 and h_8 > 0 mm; 1; 0)
    'Zones van flens en flenslas in de diepte vanaf de bovenkant van de ligger, verbreed met de straal van de sluitring.
    z_1o = -sqrt(2)*a_flens
    z_1u = t_fb + sqrt(2)*a_flens
    z_2o = h_b - t_fb - sqrt(2)*a_flens
    z_2u = h_b + sqrt(2)*a_flens
    z_3o = h_b + h_cs - t_fb - sqrt(2)*a_flens
    z_3u = h_b + h_cs + sqrt(2)*a_flens
    inzone(y; o; u) = if(y > o - r_w and y < u + r_w; 1; 0)
    bots(y) = max(inzone(y; z_1o; z_1u); inzone(y; z_2o; z_2u); if(console ≡ 2; inzone(y; z_3o; z_3u); 0))
    bots_1 = if(n_r ≥ 1; bots(y_1); 0)
    bots_2 = if(n_r ≥ 2; bots(y_2); 0)
    bots_3 = if(n_r ≥ 3; bots(y_3); 0)
    bots_4 = if(n_r ≥ 4; bots(y_4); 0)
    bots_5 = if(n_r ≥ 5; bots(y_5); 0)
    bots_6 = if(n_r ≥ 6; bots(y_6); 0)
    bots_7 = if(n_r ≥ 7; bots(y_7); 0)
    bots_8 = if(n_r ≥ 8; bots(y_8); 0)
    n_bots = bots_1 + bots_2 + bots_3 + bots_4 + bots_5 + bots_6 + bots_7 + bots_8
    e_p = (b_p - w_kp)/2
    e_c = (b_c - w_kp)/2
    ok_33 = if(e_kp ≥ 1.2*d_0 and e_p ≥ 1.2*d_0 and e_c ≥ 1.2*d_0 and w_kp ≥ 2.4*d_0 and (n_r ≡ 1 or p_12 ≥ 2.2*d_0) and (n_r ≤ 2 or p_kp ≥ 2.2*d_0); 1; 0)
    ok_hor = if((w_kp - t_wb)/2 - sqrt(2)*a_lijf ≥ r_w and (w_kp - t_wc)/2 - r_c ≥ r_w; 1; 0)
    ok_ext = if(ext ≡ 1; if(y_1 < 0 mm and (n_r ≡ 1 or y_2 > 0 mm); 1; 0); 1)
    ok_tkp = if(t_kp ≤ 40 mm; 1; 0)
    ok_geo = if(n_bots ≡ 0 and ok_33 ≡ 1 and ok_hor ≡ 1 and ok_ext ≡ 1 and ok_tkp ≡ 1; 1; 0)
    #show
    #if n_r ≡ 1
        'Eén boutrij, op y = 'y_1' mm; drukpunt op y<sub>c</sub> = 'y_c' mm (y vanaf de bovenkant van de ligger, naar beneden positief). Kopplaat 'b_p' mm breed.
    #else
        'Boutrijen: 'n_r', rij 1 op y = 'y_1' mm, rij 2 op 'y_2' mm en daarna om de 'p_kp' mm; drukpunt op y<sub>c</sub> = 'y_c' mm (y vanaf de bovenkant van de ligger, naar beneden positief). Kopplaat 'b_p' mm breed.
    #end if
    #if n_boutrijen > 8
        '<b style="color:#b45309">Ten hoogste 8 boutrijen: gerekend met de bovenste 8.</b>
    #end if
    #if bots_1 ≡ 1
        '<b style="color:#b91c1c">Rij 1 (y = 'y_1' mm) botst met een flens of flenslas van de ligger: de sluitring (Ø'dw_tab' mm) moet er vrij van liggen.</b>
    #end if
    #if bots_2 ≡ 1
        '<b style="color:#b91c1c">Rij 2 (y = 'y_2' mm) botst met een flens of flenslas van de ligger: de sluitring (Ø'dw_tab' mm) moet er vrij van liggen.</b>
    #end if
    #if bots_3 ≡ 1
        '<b style="color:#b91c1c">Rij 3 (y = 'y_3' mm) botst met een flens of flenslas van de ligger: de sluitring (Ø'dw_tab' mm) moet er vrij van liggen.</b>
    #end if
    #if bots_4 ≡ 1
        '<b style="color:#b91c1c">Rij 4 (y = 'y_4' mm) botst met een flens of flenslas van de ligger: de sluitring (Ø'dw_tab' mm) moet er vrij van liggen.</b>
    #end if
    #if bots_5 ≡ 1
        '<b style="color:#b91c1c">Rij 5 (y = 'y_5' mm) botst met een flens of flenslas van de ligger: de sluitring (Ø'dw_tab' mm) moet er vrij van liggen.</b>
    #end if
    #if bots_6 ≡ 1
        '<b style="color:#b91c1c">Rij 6 (y = 'y_6' mm) botst met een flens of flenslas van de ligger: de sluitring (Ø'dw_tab' mm) moet er vrij van liggen.</b>
    #end if
    #if bots_7 ≡ 1
        '<b style="color:#b91c1c">Rij 7 (y = 'y_7' mm) botst met een flens of flenslas van de ligger: de sluitring (Ø'dw_tab' mm) moet er vrij van liggen.</b>
    #end if
    #if bots_8 ≡ 1
        '<b style="color:#b91c1c">Rij 8 (y = 'y_8' mm) botst met een flens of flenslas van de ligger: de sluitring (Ø'dw_tab' mm) moet er vrij van liggen.</b>
    #end if
    #if ok_33 ≡ 0
        '<b style="color:#b91c1c">Een afstand is kleiner dan het minimum van tabel 3.3: e ≥ 1,2·d<sub>0</sub> = '1.2*d_0' mm (e<sub>kp</sub> = 'e_kp', kopplaat 'e_p', kolomflens 'e_c' mm), w ≥ 2,4·d<sub>0</sub> = '2.4*d_0' mm, p ≥ 2,2·d<sub>0</sub> = '2.2*d_0' mm.</b>
    #end if
    #if ok_hor ≡ 0
        '<b style="color:#b91c1c">De bouten staan te dicht bij het lijf: de sluitring raakt de lijflas van de ligger of de afronding van de kolom. Vergroot w.</b>
    #end if
    #if ok_ext ≡ 0
        #if y_1 ≥ 0 mm
            '<b style="color:#b91c1c">De bovenste boutrij ligt niet boven de ligger: maak u<sub>kp</sub> groter dan e<sub>kp</sub>, of kies een korte kopplaat.</b>
        #else
            '<b style="color:#b91c1c">Rij 2 (y = 'y_2' mm) ligt ook boven de ligger; het blad rekent met één rij boven de trekflens. Maak p<sub>fl</sub> groter dan u<sub>kp</sub> − e<sub>kp</sub>.</b>
        #end if
    #end if
    #if ok_tkp ≡ 0
        '<b style="color:#b91c1c">De kopplaat is dikker dan 40 mm: f<sub>y</sub> en f<sub>u</sub> hierboven gelden alleen tot 40 mm (tabel 3.1 van EN 1993-1-1).</b>
    #end if
#else
    #hide
    k_fc = min(t_fc/t_fb; 1)
    b_eff,b,fc = min(t_wc + 2*r_c + 7*k_fc*t_fc; b_b)
    ok_bfc = if(b_eff,b,fc ≥ f_y/f_u*b_b; 1; 0)
    #show
    #if ok_bfc ≡ 0
        '<b style="color:#b91c1c">De kolomflens is te slap voor een gelaste flens: b<sub>eff</sub> = 'b_eff,b,fc' mm < (f<sub>y</sub>/f<sub>u</sub>)·b = 'f_y/f_u*b_b' mm; verstijf de kolom (§4.10).</b>
    #end if
#end if
#hide
ok_all = if(ok_last ≡ 1 and ok_a ≡ 1 and ok_cs ≡ 1 and ok_dc ≡ 1 and ok_geo ≡ 1 and ok_bfc ≡ 1; 1; 0)
M_j,Rd = 0 kN*m
UC_lt = 0
#show

#if ok_all ≡ 1
    # 5. Kolomlijf en liggerflens (§6.2.6.1, §6.2.6.2 en §6.2.6.7)

    A_vc = max(A_vz,c; (h_c - 2*t_fc)*t_wc) to mm^2', η = 1 (veilige kant)<span class="alleen-scherm"></span>'
    A_vc', η = 1 (veilige kant)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    V_wp,Rd = 0.9*f_y*A_vc/(sqrt(3)*γ_M0) to kN', kolomlijf op afschuiving (6.7)'
    #if verbindingstype ≡ 1
        s_p = min(2*t_kp; t_kp + u_onder)', spreiding door de kopplaat<span class="alleen-scherm"></span>'
        s_p', spreiding door de kopplaat<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    #else
        #hide
        s_p = 0 mm
        #show
    #end if
    b_eff,c,wc = t_fb + 2*sqrt(2)*a_flens + 5*(t_fc + r_c) + s_p', (6.10) en (6.11)<span class="alleen-scherm"></span>'
    b_eff,c,wc', (6.10) en (6.11)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    ω_c = 1/sqrt(1 + 1.3*(b_eff,c,wc*t_wc/A_vc)^2)', tabel 6.3<span class="alleen-scherm"></span>'
    ω_c', tabel 6.3<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    σ_com,Ed = N_c,Ed/A_c + M_Ed*(h_c/2 - t_fc - r_c)/I_c to N/mm^2', kolommoment M_Ed (veilige kant)<span class="alleen-scherm"></span>'
    σ_com,Ed', kolommoment M_Ed (veilige kant)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    k_wc = if(σ_com,Ed ≤ 0.7*f_y; 1; max(1.7 - σ_com,Ed/f_y; 0))', 6.2.6.2(2)<span class="alleen-scherm"></span>'
    k_wc', 6.2.6.2(2)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    λ_p = 0.932*sqrt(b_eff,c,wc*d_wc*f_y/(E*t_wc^2))', (6.13c)<span class="alleen-scherm"></span>'
    λ_p', (6.13c)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    ρ = if(λ_p ≤ 0.72; 1; (λ_p - 0.2)/λ_p^2)', (6.13a) en (6.13b)<span class="alleen-scherm"></span>'
    ρ', (6.13a) en (6.13b)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    F_c,wc,Rd = ω_c*k_wc*ρ*b_eff,c,wc*t_wc*f_y/γ_M1 to kN', kolomlijf op druk (6.9)'
    A_vb = max(A_vz,b; (h_b - 2*t_fb)*t_wb) to mm^2', ligger, η = 1<span class="alleen-scherm"></span>'
    A_vb', ligger, η = 1<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    V_pl,b,Rd = A_vb*f_y/(sqrt(3)*γ_M0) to kN', EN 1993-1-1 (6.18)<span class="alleen-scherm"></span>'
    V_pl,b,Rd', EN 1993-1-1 (6.18)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    #if console ≡ 2
        F_c,fb,Rd = b_b*t_fb*f_y/γ_M0 to kN', alleen de consoleflens, even groot als de liggerflens (§6.2.6.7(2)); veilige kant van (6.21)'
    #else
        ρ_V = if(V_Ed > 0.5*V_pl,b,Rd; (2*V_Ed/V_pl,b,Rd - 1)^2; 0)', EN 1993-1-1 6.2.8(3)<span class="alleen-scherm"></span>'
        ρ_V', EN 1993-1-1 6.2.8(3)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        M_c,Rd = max(W_pl,b - ρ_V*(h_b - 2*t_fb)^2*t_wb/4; 0 mm^3)*f_y/γ_M0 to kN*m', EN 1993-1-1 (6.30)<span class="alleen-scherm"></span>'
        M_c,Rd', EN 1993-1-1 (6.30)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        F_c,fb,Rd = M_c,Rd/(h_b - t_fb) to kN', liggerflens en -lijf op druk (6.21)'
    #end if
    F_lim = min(V_wp,Rd/β; F_c,wc,Rd; F_c,fb,Rd)', grens voor de som van de trekkrachten (§6.2.7.2(7))'

    #if verbindingstype ≡ 1
        # 6. Trek per boutrij (§6.2.6 en §6.2.7.2)

        'Bout M'boutmaat' – 'boutkwaliteit/10': d<sub>0</sub> = 'd_0' mm, A<sub>s</sub> = 'A_s' mm², f<sub>ub</sub> = 'f_ub' N/mm², sluitring Ø'dw_tab' mm.
        #hide
        d_m = (sw_tab + ew_tab)/2*mm
        t_min = min(t_kp; t_fc)
        #show
        F_t,Rd = 0.9*f_ub*A_s/γ_M2 to kN', per bout (tabel 3.4)<span class="alleen-scherm"></span>'
        F_t,Rd', per bout (tabel 3.4)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        B_p,Rd = 0.6*pi*d_m*t_min*f_u/γ_M2 to kN', doorponsen (tabel 3.4)<span class="alleen-scherm"></span>'
        B_p,Rd', doorponsen (tabel 3.4)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        L_bout = t_fc + t_kp + 2*tr_tab*mm + (kop_tab + moer_tab)/2*mm', rekklengte bout (tabel 6.2)<span class="alleen-scherm"></span>'
        L_bout', rekklengte bout (tabel 6.2)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        m_c = (w_kp - t_wc)/2 - 0.8*r_c', kolomflens (figuur 6.8)<span class="alleen-scherm"></span>'
        m_c', kolomflens (figuur 6.8)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        m_p = (w_kp - t_wb)/2 - 0.8*sqrt(2)*a_lijf', kopplaat (figuur 6.10)<span class="alleen-scherm"></span>'
        m_p', kopplaat (figuur 6.10)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        n_c = min(e_c; e_p; 1.25*m_c)', tabel 6.2<span class="alleen-scherm"></span>'
        n_c', tabel 6.2<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        n_p = min(e_c; e_p; 1.25*m_p)', tabel 6.2<span class="alleen-scherm"></span>'
        n_p', tabel 6.2<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        e_c', randafstand kolomflens<span class="kolom-3"></span>'
        e_p', randafstand kopplaat<span class="kolom-3"></span>'
        #hide
        m_x = 1 mm
        e_x = 1 mm
        n_x = 1 mm
        l_x,cp = 1 mm
        l_x,nc = 1 mm
        F_px = F_oo
        α = 8
        #show
        #if ext ≡ 1
            m_x = -y_1 - 0.8*sqrt(2)*a_flens', rij boven de trekflens (figuur 6.10)<span class="alleen-scherm"></span>'
            m_x', rij boven de trekflens (figuur 6.10)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            e_x = e_kp'<span class="alleen-scherm"></span>'
            n_x = min(e_x; 1.25*m_x)', tabel 6.2<span class="alleen-scherm"></span>'
            n_x', tabel 6.2<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            l_x,cp = min(2*pi*m_x; pi*m_x + w_kp; pi*m_x + 2*e_p)', tabel 6.6<span class="alleen-scherm"></span>'
            l_x,cp', tabel 6.6<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            l_x,nc = min(4*m_x + 1.25*e_x; e_p + 2*m_x + 0.625*e_x; 0.5*b_p; 0.5*w_kp + 2*m_x + 0.625*e_x)', tabel 6.6<span class="alleen-scherm"></span>'
            l_x,nc', tabel 6.6<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        #end if
        #if n_r ≥ r_f
            #hide
            y_rf = if(ext ≡ 1; y_2; y_1)
            #show
            m_2 = y_rf - t_fb - 0.8*sqrt(2)*a_flens', eerste rij onder de trekflens<span class="alleen-scherm"></span>'
            m_2', eerste rij onder de trekflens<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            λ_1 = m_p/(m_p + e_p)'<span class="alleen-scherm"></span>'
            λ_1'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            λ_2 = m_2/(m_p + e_p)'<span class="alleen-scherm"></span>'
            λ_2'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            #hide
            'Figuur 6.11 analytisch: boven λ_2,lim is de lijn verticaal op λ_1,lim = 1,25/(α − 2,75); daaronder λ_2 = λ_2,lim·(λ_1,lim/λ_1)^((α/√2)^1,785).
            α_v = 2.75 + 1.25/λ_1
            l1g(a) = 1.25/(a - 2.75)
            l2g(a) = a*l1g(a)/2*(l1g(a)/λ_1)^((a/sqrt(2))^1.785)
            α_s = $Find{l2g(a) - λ_2 @ a = α_v : 8}
            α = if(α_v ≥ 8; 8; if(λ_2 ≥ α_v*λ_1/2; α_v; if(l2g(8) ≥ λ_2; 8; α_s)))
            #show
            α', figuur 6.11<span class="kolom-3"></span>'
        #end if
        #hide
        'T-stuk (tabel 6.2): methode 1; zonder wrikkracht als L_b > L_b*.
        F_tb = min(F_t,Rd; B_p,Rd)
        Tst(l1; l2; t; m; n; k) = if(L_bout ≤ 8.8*m^3*A_s*k/(l1*t^3); min(l1*t^2*f_y/(m*γ_M0); (0.5*l2*t^2*f_y/γ_M0 + 2*k*n*F_tb)/(m + n); 2*k*F_tb); min(0.5*l1*t^2*f_y/(m*γ_M0); 2*k*F_tb))
        sp(j; r) = yv(r) - yv(j)
        'Kolomflens (tabel 6.4) en kolomlijf op trek (6.15), per rij of voor de groep j..r.
        lcc(s) = 2*pi*m_c + 2*s
        lnc(s) = 4*m_c + 1.25*e_c + s
        Fcf(j; r) = Tst(min(lcc(sp(j; r)); lnc(sp(j; r))); lnc(sp(j; r)); t_fc; m_c; n_c; r - j + 1)
        om(b) = 1/sqrt(1 + 1.3*(b*t_wc/A_vc)^2)
        Fwcb(b) = om(b)*b*t_wc*f_y/γ_M0
        Fwc(j; r) = Fwcb(min(lcc(sp(j; r)); lnc(sp(j; r))))
        'Kopplaat (tabel 6.6) en liggerlijf op trek (6.22), rijen onder de trekflens. De lijflas staat in hoofdstuk 8 (§6.2.3(4)).
        lcp(s) = 2*pi*m_p + 2*s
        lnp(j; s) = if(j ≡ r_f; α*m_p; 4*m_p + 1.25*e_p) + s
        Fep(j; r) = Tst(min(lcp(sp(j; r)); lnp(j; sp(j; r))); lnp(j; sp(j; r)); t_kp; m_p; n_p; r - j + 1)
        Fwbb(b) = b*t_wb*f_y/γ_M0
        Fwb(j; r) = Fwbb(min(lcp(sp(j; r)); lnp(j; sp(j; r))))
        F_px = Tst(min(l_x,cp; l_x,nc); l_x,nc; t_kp; m_x; n_x; 1)
        'Groep j..r: kleinste groepsweerstand min de rijen erboven in de groep.
        F_t1,Rd = 0 kN
        F_t2,Rd = 0 kN
        F_t3,Rd = 0 kN
        F_t4,Rd = 0 kN
        F_t5,Rd = 0 kN
        F_t6,Rd = 0 kN
        F_t7,Rd = 0 kN
        F_t8,Rd = 0 kN
        Fsom(k) = if(k ≥ 1; F_t1,Rd; 0 kN) + if(k ≥ 2; F_t2,Rd; 0 kN) + if(k ≥ 3; F_t3,Rd; 0 kN) + if(k ≥ 4; F_t4,Rd; 0 kN) + if(k ≥ 5; F_t5,Rd; 0 kN) + if(k ≥ 6; F_t6,Rd; 0 kN) + if(k ≥ 7; F_t7,Rd; 0 kN) + if(k ≥ 8; F_t8,Rd; 0 kN)
        Grp(j; r) = min(Fcf(j; r); Fwc(j; r); if(j ≥ r_f; min(Fep(j; r); Fwb(j; r)); F_oo)) - (Fsom(r - 1) - Fsom(j - 1))
        x_set = 0
        x_F = 0 kN
        x_h = 1 mm
        #show
        '<i>Per rij de kleinste van: kolomflens op buiging, kolomlijf op trek, kopplaat op buiging en liggerlijf op trek, als losse rij (§6.2.7.2(6)); de rest van de grens F<sub>lim</sub> (7); de groepen met de rijen erboven, al verminderd met die rijen (8); en onder een rij met meer dan 1,8·F<sub>t,Rd</sub> de driehoeksverdeling (9, NB: 1,8 in plaats van 1,9). Krachten in kN.</i><span class="alleen-scherm"></span>
        '<table style="border-collapse:collapse; font-size:0.9em; margin:2px 0 6px 0;">
        '<tr style="border-bottom:1px solid #9ca3af;"><th style="padding:1px 5px; text-align:left; font-weight:600;">Rij</th><th style="padding:1px 5px; text-align:left; font-weight:600;">t.o.v. flens</th><th style="padding:1px 5px; text-align:right; font-weight:600;">h<sub>r</sub> [mm]</th><th style="padding:1px 5px; text-align:right; font-weight:600;">kolomflens</th><th style="padding:1px 5px; text-align:right; font-weight:600;">kolomlijf</th><th style="padding:1px 5px; text-align:right; font-weight:600;">kopplaat</th><th style="padding:1px 5px; text-align:right; font-weight:600;">liggerlijf</th><th style="padding:1px 5px; text-align:right; font-weight:600;">groep</th><th style="padding:1px 5px; text-align:right; font-weight:600;">rest F<sub>lim</sub></th><th style="padding:1px 5px; text-align:right; font-weight:600;">driehoek</th><th style="padding:1px 5px; text-align:right; font-weight:600;">F<sub>tr,Rd</sub></th></tr>
        #if n_r ≥ 1
            #hide
            Fc_1 = Fcf(1; 1) to kN
            Fw_1 = Fwc(1; 1) to kN
            Fp_1 = if(ext ≡ 1; F_px; Fep(1; 1)) to kN
            Fb_1 = if(ext ≡ 1; F_oo; Fwb(1; 1)) to kN
            Fg_1 = F_oo to kN
            Fr_1 = F_lim - Fsom(0) to kN
            Fd_1 = if(x_set ≡ 1; x_F*h_1/x_h; F_oo) to kN
            F_t1,Rd = if(h_1 > 0 mm; max(0 kN; min(Fc_1; Fw_1; Fp_1; Fb_1; Fg_1; Fr_1; Fd_1)); 0 kN) to kN
            x_F = if(x_set ≡ 0 and F_t1,Rd > 1.8*F_t,Rd; F_t1,Rd; x_F)
            x_h = if(x_set ≡ 0 and F_t1,Rd > 1.8*F_t,Rd; h_1; x_h)
            x_set = if(x_set ≡ 0 and F_t1,Rd > 1.8*F_t,Rd; 1; x_set)
            #show
            #if h_1 > 0 mm
                '<tr><td style="padding:1px 5px;">1</td><td style="padding:1px 5px;">'if(ext ≡ 1; "boven"; "onder")'</td><td style="padding:1px 5px; text-align:right;">'h_1'</td><td style="padding:1px 5px; text-align:right;">'Fc_1'</td><td style="padding:1px 5px; text-align:right;">'Fw_1'</td><td style="padding:1px 5px; text-align:right;">'Fp_1'</td><td style="padding:1px 5px; text-align:right;">'if(ext ≡ 1; "—"; Fb_1)'</td><td style="padding:1px 5px; text-align:right;">'"—"'</td><td style="padding:1px 5px; text-align:right;">'Fr_1'</td><td style="padding:1px 5px; text-align:right;">'"—"'</td><td style="padding:1px 5px; text-align:right;"><b>'F_t1,Rd'</b></td></tr>
            #else
                '<tr><td style="padding:1px 5px;">1</td><td style="padding:1px 5px;">drukzone</td><td style="padding:1px 5px; text-align:right;">'h_1'</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;"><b>0</b></td></tr>
            #end if
        #end if
        #if n_r ≥ 2
            #hide
            Fc_2 = Fcf(2; 2) to kN
            Fw_2 = Fwc(2; 2) to kN
            Fp_2 = Fep(2; 2) to kN
            Fb_2 = Fwb(2; 2) to kN
            Fg_2 = min(Grp(1; 2)) to kN
            Fr_2 = F_lim - Fsom(1) to kN
            Fd_2 = if(x_set ≡ 1; x_F*h_2/x_h; F_oo) to kN
            F_t2,Rd = if(h_2 > 0 mm; max(0 kN; min(Fc_2; Fw_2; Fp_2; Fb_2; Fg_2; Fr_2; Fd_2)); 0 kN) to kN
            x_F = if(x_set ≡ 0 and F_t2,Rd > 1.8*F_t,Rd; F_t2,Rd; x_F)
            x_h = if(x_set ≡ 0 and F_t2,Rd > 1.8*F_t,Rd; h_2; x_h)
            x_set = if(x_set ≡ 0 and F_t2,Rd > 1.8*F_t,Rd; 1; x_set)
            #show
            #if h_2 > 0 mm
                '<tr><td style="padding:1px 5px;">2</td><td style="padding:1px 5px;">'"onder"'</td><td style="padding:1px 5px; text-align:right;">'h_2'</td><td style="padding:1px 5px; text-align:right;">'Fc_2'</td><td style="padding:1px 5px; text-align:right;">'Fw_2'</td><td style="padding:1px 5px; text-align:right;">'Fp_2'</td><td style="padding:1px 5px; text-align:right;">'Fb_2'</td><td style="padding:1px 5px; text-align:right;">'Fg_2'</td><td style="padding:1px 5px; text-align:right;">'Fr_2'</td><td style="padding:1px 5px; text-align:right;">'if(Fd_2 < F_oo; Fd_2; "—")'</td><td style="padding:1px 5px; text-align:right;"><b>'F_t2,Rd'</b></td></tr>
            #else
                '<tr><td style="padding:1px 5px;">2</td><td style="padding:1px 5px;">drukzone</td><td style="padding:1px 5px; text-align:right;">'h_2'</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;"><b>0</b></td></tr>
            #end if
        #end if
        #if n_r ≥ 3
            #hide
            Fc_3 = Fcf(3; 3) to kN
            Fw_3 = Fwc(3; 3) to kN
            Fp_3 = Fep(3; 3) to kN
            Fb_3 = Fwb(3; 3) to kN
            Fg_3 = min(Grp(1; 3); Grp(2; 3)) to kN
            Fr_3 = F_lim - Fsom(2) to kN
            Fd_3 = if(x_set ≡ 1; x_F*h_3/x_h; F_oo) to kN
            F_t3,Rd = if(h_3 > 0 mm; max(0 kN; min(Fc_3; Fw_3; Fp_3; Fb_3; Fg_3; Fr_3; Fd_3)); 0 kN) to kN
            x_F = if(x_set ≡ 0 and F_t3,Rd > 1.8*F_t,Rd; F_t3,Rd; x_F)
            x_h = if(x_set ≡ 0 and F_t3,Rd > 1.8*F_t,Rd; h_3; x_h)
            x_set = if(x_set ≡ 0 and F_t3,Rd > 1.8*F_t,Rd; 1; x_set)
            #show
            #if h_3 > 0 mm
                '<tr><td style="padding:1px 5px;">3</td><td style="padding:1px 5px;">'"onder"'</td><td style="padding:1px 5px; text-align:right;">'h_3'</td><td style="padding:1px 5px; text-align:right;">'Fc_3'</td><td style="padding:1px 5px; text-align:right;">'Fw_3'</td><td style="padding:1px 5px; text-align:right;">'Fp_3'</td><td style="padding:1px 5px; text-align:right;">'Fb_3'</td><td style="padding:1px 5px; text-align:right;">'Fg_3'</td><td style="padding:1px 5px; text-align:right;">'Fr_3'</td><td style="padding:1px 5px; text-align:right;">'if(Fd_3 < F_oo; Fd_3; "—")'</td><td style="padding:1px 5px; text-align:right;"><b>'F_t3,Rd'</b></td></tr>
            #else
                '<tr><td style="padding:1px 5px;">3</td><td style="padding:1px 5px;">drukzone</td><td style="padding:1px 5px; text-align:right;">'h_3'</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;"><b>0</b></td></tr>
            #end if
        #end if
        #if n_r ≥ 4
            #hide
            Fc_4 = Fcf(4; 4) to kN
            Fw_4 = Fwc(4; 4) to kN
            Fp_4 = Fep(4; 4) to kN
            Fb_4 = Fwb(4; 4) to kN
            Fg_4 = min(Grp(1; 4); Grp(2; 4); Grp(3; 4)) to kN
            Fr_4 = F_lim - Fsom(3) to kN
            Fd_4 = if(x_set ≡ 1; x_F*h_4/x_h; F_oo) to kN
            F_t4,Rd = if(h_4 > 0 mm; max(0 kN; min(Fc_4; Fw_4; Fp_4; Fb_4; Fg_4; Fr_4; Fd_4)); 0 kN) to kN
            x_F = if(x_set ≡ 0 and F_t4,Rd > 1.8*F_t,Rd; F_t4,Rd; x_F)
            x_h = if(x_set ≡ 0 and F_t4,Rd > 1.8*F_t,Rd; h_4; x_h)
            x_set = if(x_set ≡ 0 and F_t4,Rd > 1.8*F_t,Rd; 1; x_set)
            #show
            #if h_4 > 0 mm
                '<tr><td style="padding:1px 5px;">4</td><td style="padding:1px 5px;">'"onder"'</td><td style="padding:1px 5px; text-align:right;">'h_4'</td><td style="padding:1px 5px; text-align:right;">'Fc_4'</td><td style="padding:1px 5px; text-align:right;">'Fw_4'</td><td style="padding:1px 5px; text-align:right;">'Fp_4'</td><td style="padding:1px 5px; text-align:right;">'Fb_4'</td><td style="padding:1px 5px; text-align:right;">'Fg_4'</td><td style="padding:1px 5px; text-align:right;">'Fr_4'</td><td style="padding:1px 5px; text-align:right;">'if(Fd_4 < F_oo; Fd_4; "—")'</td><td style="padding:1px 5px; text-align:right;"><b>'F_t4,Rd'</b></td></tr>
            #else
                '<tr><td style="padding:1px 5px;">4</td><td style="padding:1px 5px;">drukzone</td><td style="padding:1px 5px; text-align:right;">'h_4'</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;"><b>0</b></td></tr>
            #end if
        #end if
        #if n_r ≥ 5
            #hide
            Fc_5 = Fcf(5; 5) to kN
            Fw_5 = Fwc(5; 5) to kN
            Fp_5 = Fep(5; 5) to kN
            Fb_5 = Fwb(5; 5) to kN
            Fg_5 = min(Grp(1; 5); Grp(2; 5); Grp(3; 5); Grp(4; 5)) to kN
            Fr_5 = F_lim - Fsom(4) to kN
            Fd_5 = if(x_set ≡ 1; x_F*h_5/x_h; F_oo) to kN
            F_t5,Rd = if(h_5 > 0 mm; max(0 kN; min(Fc_5; Fw_5; Fp_5; Fb_5; Fg_5; Fr_5; Fd_5)); 0 kN) to kN
            x_F = if(x_set ≡ 0 and F_t5,Rd > 1.8*F_t,Rd; F_t5,Rd; x_F)
            x_h = if(x_set ≡ 0 and F_t5,Rd > 1.8*F_t,Rd; h_5; x_h)
            x_set = if(x_set ≡ 0 and F_t5,Rd > 1.8*F_t,Rd; 1; x_set)
            #show
            #if h_5 > 0 mm
                '<tr><td style="padding:1px 5px;">5</td><td style="padding:1px 5px;">'"onder"'</td><td style="padding:1px 5px; text-align:right;">'h_5'</td><td style="padding:1px 5px; text-align:right;">'Fc_5'</td><td style="padding:1px 5px; text-align:right;">'Fw_5'</td><td style="padding:1px 5px; text-align:right;">'Fp_5'</td><td style="padding:1px 5px; text-align:right;">'Fb_5'</td><td style="padding:1px 5px; text-align:right;">'Fg_5'</td><td style="padding:1px 5px; text-align:right;">'Fr_5'</td><td style="padding:1px 5px; text-align:right;">'if(Fd_5 < F_oo; Fd_5; "—")'</td><td style="padding:1px 5px; text-align:right;"><b>'F_t5,Rd'</b></td></tr>
            #else
                '<tr><td style="padding:1px 5px;">5</td><td style="padding:1px 5px;">drukzone</td><td style="padding:1px 5px; text-align:right;">'h_5'</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;"><b>0</b></td></tr>
            #end if
        #end if
        #if n_r ≥ 6
            #hide
            Fc_6 = Fcf(6; 6) to kN
            Fw_6 = Fwc(6; 6) to kN
            Fp_6 = Fep(6; 6) to kN
            Fb_6 = Fwb(6; 6) to kN
            Fg_6 = min(Grp(1; 6); Grp(2; 6); Grp(3; 6); Grp(4; 6); Grp(5; 6)) to kN
            Fr_6 = F_lim - Fsom(5) to kN
            Fd_6 = if(x_set ≡ 1; x_F*h_6/x_h; F_oo) to kN
            F_t6,Rd = if(h_6 > 0 mm; max(0 kN; min(Fc_6; Fw_6; Fp_6; Fb_6; Fg_6; Fr_6; Fd_6)); 0 kN) to kN
            x_F = if(x_set ≡ 0 and F_t6,Rd > 1.8*F_t,Rd; F_t6,Rd; x_F)
            x_h = if(x_set ≡ 0 and F_t6,Rd > 1.8*F_t,Rd; h_6; x_h)
            x_set = if(x_set ≡ 0 and F_t6,Rd > 1.8*F_t,Rd; 1; x_set)
            #show
            #if h_6 > 0 mm
                '<tr><td style="padding:1px 5px;">6</td><td style="padding:1px 5px;">'"onder"'</td><td style="padding:1px 5px; text-align:right;">'h_6'</td><td style="padding:1px 5px; text-align:right;">'Fc_6'</td><td style="padding:1px 5px; text-align:right;">'Fw_6'</td><td style="padding:1px 5px; text-align:right;">'Fp_6'</td><td style="padding:1px 5px; text-align:right;">'Fb_6'</td><td style="padding:1px 5px; text-align:right;">'Fg_6'</td><td style="padding:1px 5px; text-align:right;">'Fr_6'</td><td style="padding:1px 5px; text-align:right;">'if(Fd_6 < F_oo; Fd_6; "—")'</td><td style="padding:1px 5px; text-align:right;"><b>'F_t6,Rd'</b></td></tr>
            #else
                '<tr><td style="padding:1px 5px;">6</td><td style="padding:1px 5px;">drukzone</td><td style="padding:1px 5px; text-align:right;">'h_6'</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;"><b>0</b></td></tr>
            #end if
        #end if
        #if n_r ≥ 7
            #hide
            Fc_7 = Fcf(7; 7) to kN
            Fw_7 = Fwc(7; 7) to kN
            Fp_7 = Fep(7; 7) to kN
            Fb_7 = Fwb(7; 7) to kN
            Fg_7 = min(Grp(1; 7); Grp(2; 7); Grp(3; 7); Grp(4; 7); Grp(5; 7); Grp(6; 7)) to kN
            Fr_7 = F_lim - Fsom(6) to kN
            Fd_7 = if(x_set ≡ 1; x_F*h_7/x_h; F_oo) to kN
            F_t7,Rd = if(h_7 > 0 mm; max(0 kN; min(Fc_7; Fw_7; Fp_7; Fb_7; Fg_7; Fr_7; Fd_7)); 0 kN) to kN
            x_F = if(x_set ≡ 0 and F_t7,Rd > 1.8*F_t,Rd; F_t7,Rd; x_F)
            x_h = if(x_set ≡ 0 and F_t7,Rd > 1.8*F_t,Rd; h_7; x_h)
            x_set = if(x_set ≡ 0 and F_t7,Rd > 1.8*F_t,Rd; 1; x_set)
            #show
            #if h_7 > 0 mm
                '<tr><td style="padding:1px 5px;">7</td><td style="padding:1px 5px;">'"onder"'</td><td style="padding:1px 5px; text-align:right;">'h_7'</td><td style="padding:1px 5px; text-align:right;">'Fc_7'</td><td style="padding:1px 5px; text-align:right;">'Fw_7'</td><td style="padding:1px 5px; text-align:right;">'Fp_7'</td><td style="padding:1px 5px; text-align:right;">'Fb_7'</td><td style="padding:1px 5px; text-align:right;">'Fg_7'</td><td style="padding:1px 5px; text-align:right;">'Fr_7'</td><td style="padding:1px 5px; text-align:right;">'if(Fd_7 < F_oo; Fd_7; "—")'</td><td style="padding:1px 5px; text-align:right;"><b>'F_t7,Rd'</b></td></tr>
            #else
                '<tr><td style="padding:1px 5px;">7</td><td style="padding:1px 5px;">drukzone</td><td style="padding:1px 5px; text-align:right;">'h_7'</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;"><b>0</b></td></tr>
            #end if
        #end if
        #if n_r ≥ 8
            #hide
            Fc_8 = Fcf(8; 8) to kN
            Fw_8 = Fwc(8; 8) to kN
            Fp_8 = Fep(8; 8) to kN
            Fb_8 = Fwb(8; 8) to kN
            Fg_8 = min(Grp(1; 8); Grp(2; 8); Grp(3; 8); Grp(4; 8); Grp(5; 8); Grp(6; 8); Grp(7; 8)) to kN
            Fr_8 = F_lim - Fsom(7) to kN
            Fd_8 = if(x_set ≡ 1; x_F*h_8/x_h; F_oo) to kN
            F_t8,Rd = if(h_8 > 0 mm; max(0 kN; min(Fc_8; Fw_8; Fp_8; Fb_8; Fg_8; Fr_8; Fd_8)); 0 kN) to kN
            x_F = if(x_set ≡ 0 and F_t8,Rd > 1.8*F_t,Rd; F_t8,Rd; x_F)
            x_h = if(x_set ≡ 0 and F_t8,Rd > 1.8*F_t,Rd; h_8; x_h)
            x_set = if(x_set ≡ 0 and F_t8,Rd > 1.8*F_t,Rd; 1; x_set)
            #show
            #if h_8 > 0 mm
                '<tr><td style="padding:1px 5px;">8</td><td style="padding:1px 5px;">'"onder"'</td><td style="padding:1px 5px; text-align:right;">'h_8'</td><td style="padding:1px 5px; text-align:right;">'Fc_8'</td><td style="padding:1px 5px; text-align:right;">'Fw_8'</td><td style="padding:1px 5px; text-align:right;">'Fp_8'</td><td style="padding:1px 5px; text-align:right;">'Fb_8'</td><td style="padding:1px 5px; text-align:right;">'Fg_8'</td><td style="padding:1px 5px; text-align:right;">'Fr_8'</td><td style="padding:1px 5px; text-align:right;">'if(Fd_8 < F_oo; Fd_8; "—")'</td><td style="padding:1px 5px; text-align:right;"><b>'F_t8,Rd'</b></td></tr>
            #else
                '<tr><td style="padding:1px 5px;">8</td><td style="padding:1px 5px;">drukzone</td><td style="padding:1px 5px; text-align:right;">'h_8'</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;">—</td><td style="padding:1px 5px; text-align:right;"><b>0</b></td></tr>
            #end if
        #end if
        '</table>
        #if x_set ≡ 1
            'Driehoeksverdeling onder de eerste rij met F<sub>tr,Rd</sub> > 1,8·F<sub>t,Rd</sub> (§6.2.7.2(9) met de NB).
        #end if
        #if n_r ≡ 1
            M_j,Rd = (h_1*F_t1,Rd) to kN*m', (6.25)'
        #else if n_r ≡ 2
            M_j,Rd = (h_1*F_t1,Rd + h_2*F_t2,Rd) to kN*m', (6.25)'
        #else if n_r ≡ 3
            M_j,Rd = (h_1*F_t1,Rd + h_2*F_t2,Rd + h_3*F_t3,Rd) to kN*m', (6.25)'
        #else if n_r ≡ 4
            M_j,Rd = (h_1*F_t1,Rd + h_2*F_t2,Rd + h_3*F_t3,Rd + h_4*F_t4,Rd) to kN*m', (6.25)'
        #else if n_r ≡ 5
            M_j,Rd = (h_1*F_t1,Rd + h_2*F_t2,Rd + h_3*F_t3,Rd + h_4*F_t4,Rd + h_5*F_t5,Rd) to kN*m', (6.25)'
        #else if n_r ≡ 6
            M_j,Rd = (h_1*F_t1,Rd + h_2*F_t2,Rd + h_3*F_t3,Rd + h_4*F_t4,Rd + h_5*F_t5,Rd + h_6*F_t6,Rd) to kN*m', (6.25)'
        #else if n_r ≡ 7
            M_j,Rd = (h_1*F_t1,Rd + h_2*F_t2,Rd + h_3*F_t3,Rd + h_4*F_t4,Rd + h_5*F_t5,Rd + h_6*F_t6,Rd + h_7*F_t7,Rd) to kN*m', (6.25)'
        #else if n_r ≡ 8
            M_j,Rd = (h_1*F_t1,Rd + h_2*F_t2,Rd + h_3*F_t3,Rd + h_4*F_t4,Rd + h_5*F_t5,Rd + h_6*F_t6,Rd + h_7*F_t7,Rd + h_8*F_t8,Rd) to kN*m', (6.25)'
        #end if
        #if x_set ≡ 1
            #hide
            M_fs = min(W_pl,b; 2*W_pl,c)*f_y/γ_M0 to kN*m
            ok_volsterk = if(M_j,Rd ≥ M_fs; 1; 0)
            #show
            #if ok_volsterk ≡ 0
                '<b style="color:#b91c1c">Een boutrij draagt meer dan 1,8·F<sub>t,Rd</sub> en de verbinding is niet volledig sterk: M<sub>j,Rd</sub> &lt; min(M<sub>pl,b,Rd</sub>; 2·M<sub>pl,c,Rd</sub>) = 'M_fs' kNm (figuur 5.5). De NB bij §6.2.7.2(9) vraagt dan een ander ontwerp, bijvoorbeeld grotere of sterkere bouten.</b>
            #end if
        #end if
    #else
        # 6. Flenskracht (§6.2.6.3, §6.2.6.4.3 en §6.2.7.1)

        b_eff,t,wc = t_fb + 2*sqrt(2)*a_flens + 5*(t_fc + r_c)', (6.16)<span class="alleen-scherm"></span>'
        b_eff,t,wc', (6.16)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        ω_t = 1/sqrt(1 + 1.3*(b_eff,t,wc*t_wc/A_vc)^2)', tabel 6.3<span class="alleen-scherm"></span>'
        ω_t', tabel 6.3<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        F_t,wc,Rd = ω_t*b_eff,t,wc*t_wc*f_y/γ_M0 to kN', kolomlijf op trek (6.15)'
        k_fc', min(t_fc/t_fb; 1), §4.10<span class="kolom-3"></span>'
        b_eff,b,fc', t_wc + 2r_c + 7k_fc·t_fc, ten hoogste b (§4.10)<span class="kolom-3"></span>'
        F_fc,Rd = b_eff,b,fc*t_fb*f_y/γ_M0 to kN', kolomflens op buiging (6.20)'
        z_f', hefboomsarm tussen de flenzen (figuur 6.15)<span class="kolom-3"></span>'
        M_j,Rd = z_f*min(F_t,wc,Rd; F_fc,Rd; F_lim) to kN*m', §6.2.7.1'
    #end if
    #if M_j,Rd > 0 kN*m
        UC_M = M_Ed/M_j,Rd', (6.23)'
    #else
        '<b style="color:#b91c1c">De verbinding heeft geen momentweerstand: M<sub>j,Rd</sub> = 0.</b>
    #end if

    # 7. Dwarskracht

    #if verbindingstype ≡ 1
        F_v,Rd = av_tab*f_ub*A_s/γ_M2 to kN', per bout, schroefdraad (tabel 3.4)<span class="alleen-scherm"></span>'
        F_v,Rd', per bout, schroefdraad (tabel 3.4)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        #hide
        e_2 = min(e_p; e_c)
        p_min = if(n_r ≥ 3; min(p_12; p_kp); if(n_r ≡ 2; p_12; F_ool))
        n_t,b = 2*(if(F_t1,Rd > 0 kN; 1; 0) + if(F_t2,Rd > 0 kN; 1; 0) + if(F_t3,Rd > 0 kN; 1; 0) + if(F_t4,Rd > 0 kN; 1; 0) + if(F_t5,Rd > 0 kN; 1; 0) + if(F_t6,Rd > 0 kN; 1; 0) + if(F_t7,Rd > 0 kN; 1; 0) + if(F_t8,Rd > 0 kN; 1; 0))
        #show
        k_1 = min(2.8*e_2/d_0 - 1.7; 1.4*w_kp/d_0 - 1.7; 2.5)', e_2 = min(e_c; e_p), tabel 3.4<span class="alleen-scherm"></span>'
        k_1', e_2 = min(e_c; e_p), tabel 3.4<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        α_d = min(e_kp/(3*d_0); p_min/(3*d_0) - 0.25)', tabel 3.4<span class="alleen-scherm"></span>'
        α_d', tabel 3.4<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        α_b = min(α_d; f_ub/f_u; 1)', tabel 3.4<span class="alleen-scherm"></span>'
        α_b', tabel 3.4<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        F_b,Rd = k_1*α_b*f_u*d*t_min/γ_M2 to kN', stuik, dunste plaat<span class="alleen-scherm"></span>'
        F_b,Rd', stuik, dunste plaat<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        n_t,b', bouten in de getrokken rijen<span class="kolom-3"></span>'
        V_Rd = (2*n_r - n_t,b)*min(F_v,Rd; F_b,Rd) + n_t,b*min(0.4/1.4*F_v,Rd; F_b,Rd) to kN', getrokken bouten: F_v,Ed ≤ (1 − 1/1,4)·F_v,Rd (tabel 3.4)'
        UC_V = V_Ed/V_Rd', bouten'
    #else
        #hide
        UC_V = 0
        #show
    #end if
    UC_Vb = V_Ed/V_pl,b,Rd', liggerlijf op afschuiving'

    # 8. Lassen van de ligger (§4.5.3)

    '<i>De lassen mogen M<sub>j,Rd</sub> niet begrenzen (§6.2.3(4)): de flenslas draagt de flenskracht bij M<sub>j,Rd</sub>, niet bij M<sub>Ed</sub>.</i><span class="alleen-scherm"></span>
    #if verbindingstype ≡ 1
        F_f,Ed = M_j,Rd/z_f to kN', flenskracht bij M<sub>j,Rd</sub>, z<sub>f</sub> = y<sub>c</sub> − t<sub>fb</sub>/2 (§6.2.3(4))<span class="alleen-scherm"></span>'
        F_f,Ed', M<sub>j,Rd</sub>/z<sub>f</sub> (§6.2.3(4))<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    #else
        F_f,Ed = max(M_j,Rd/z_f; b_b*t_fb*f_y/γ_M0) to kN', flenskracht, ten minste de volle liggerflens (§4.10(5))<span class="alleen-scherm"></span>'
        F_f,Ed', ten minste de volle liggerflens (§4.10(5))<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    #end if
    L_w,f = 2*b_b - t_wb - 2*r_b', flenslassen, boven- en onderzijde<span class="alleen-scherm"></span>'
    L_w,f', flenslassen, boven- en onderzijde<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    F_w,f,Rd = a_flens*L_w,f*f_u/(sqrt(2)*β_w*γ_M2) to kN', dwars belast (4.1)'
    UC_lf = F_f,Ed/F_w,f,Rd', flenslassen'
    L_w,w = 2*(h_b - 2*t_fb - 2*r_b)', lijflassen, beide zijden<span class="alleen-scherm"></span>'
    L_w,w', lijflassen, beide zijden<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
    F_w,w,Rd = a_lijf*L_w,w*f_u/(sqrt(3)*β_w*γ_M2) to kN', langs belast (4.3)'
    UC_lw = V_Ed/F_w,w,Rd', lijflassen'
    #if verbindingstype ≡ 1
        f_w,t = sqrt(2)*a_lijf*f_u/(β_w*γ_M2) to N/mm', lijflassen in de trekzone, beide zijden, dwars belast (4.1)<span class="alleen-scherm"></span>'
        f_w,t', lijflassen dwars belast (4.1)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        f_wb,t = t_wb*f_y/γ_M0 to N/mm', liggerlijf op trek per mm (6.22)<span class="alleen-scherm"></span>'
        f_wb,t', liggerlijf per mm (6.22)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        UC_lt = f_wb,t/f_w,t', lijflassen in de trekzone, sterker dan het lijf (§6.2.3(4))'
    #end if

    # 9. Rotatiestijfheid en classificatie (§6.3 en §5.2.2)

    #if n_t ≡ 0
        'Geen boutrij boven het drukpunt: geen rotatiestijfheid en geen classificatie.
    #else
        #if verbindingstype ≡ 1
            #hide
            k_10 = 1.6*A_s/L_bout to mm
            pb(j) = yv(j) - yv(j - 1)
            po(j) = yv(j + 1) - yv(j)
            lsc(j) = min(2*pi*m_c; 4*m_c + 1.25*e_c; if(j > 1; min(pi*m_c + pb(j); 2*m_c + 0.625*e_c + 0.5*pb(j)); F_ool); if(j < n_t; min(pi*m_c + po(j); 2*m_c + 0.625*e_c + 0.5*po(j)); F_ool); if(j > 1 and j < n_t; 0.5*(pb(j) + po(j)); F_ool))
            lsp(j) = min(2*pi*m_p; lnp(j; 0 mm); if(j > r_f; min(pi*m_p + pb(j); 2*m_p + 0.625*e_p + 0.5*pb(j)); F_ool); if(j < n_t; min(pi*m_p + po(j); if(j ≡ r_f; 0.5*po(j) + α*m_p - 2*m_p - 0.625*e_p; 2*m_p + 0.625*e_p + 0.5*po(j))); F_ool); if(j > r_f and j < n_t; 0.5*(pb(j) + po(j)); F_ool))
            ls_c1 = lsc(1) to mm
            ls_p1 = if(ext ≡ 1; min(l_x,cp; l_x,nc); lsp(1)) to mm
            k_3r1 = 0.7*ls_c1*t_wc/d_wc to mm
            k_4r1 = 0.9*ls_c1*t_fc^3/m_c^3 to mm
            k_5r1 = 0.9*ls_p1*t_kp^3/if(ext ≡ 1; m_x; m_p)^3 to mm
            k_e1 = if(h_1 > 0 mm and n_r ≥ 1; 1/(1/k_3r1 + 1/k_4r1 + 1/k_5r1 + 1/k_10); 0 mm) to mm
            ls_c2 = lsc(2) to mm
            ls_p2 = lsp(2) to mm
            k_3r2 = 0.7*ls_c2*t_wc/d_wc to mm
            k_4r2 = 0.9*ls_c2*t_fc^3/m_c^3 to mm
            k_5r2 = 0.9*ls_p2*t_kp^3/m_p^3 to mm
            k_e2 = if(h_2 > 0 mm and n_r ≥ 2; 1/(1/k_3r2 + 1/k_4r2 + 1/k_5r2 + 1/k_10); 0 mm) to mm
            ls_c3 = lsc(3) to mm
            ls_p3 = lsp(3) to mm
            k_3r3 = 0.7*ls_c3*t_wc/d_wc to mm
            k_4r3 = 0.9*ls_c3*t_fc^3/m_c^3 to mm
            k_5r3 = 0.9*ls_p3*t_kp^3/m_p^3 to mm
            k_e3 = if(h_3 > 0 mm and n_r ≥ 3; 1/(1/k_3r3 + 1/k_4r3 + 1/k_5r3 + 1/k_10); 0 mm) to mm
            ls_c4 = lsc(4) to mm
            ls_p4 = lsp(4) to mm
            k_3r4 = 0.7*ls_c4*t_wc/d_wc to mm
            k_4r4 = 0.9*ls_c4*t_fc^3/m_c^3 to mm
            k_5r4 = 0.9*ls_p4*t_kp^3/m_p^3 to mm
            k_e4 = if(h_4 > 0 mm and n_r ≥ 4; 1/(1/k_3r4 + 1/k_4r4 + 1/k_5r4 + 1/k_10); 0 mm) to mm
            ls_c5 = lsc(5) to mm
            ls_p5 = lsp(5) to mm
            k_3r5 = 0.7*ls_c5*t_wc/d_wc to mm
            k_4r5 = 0.9*ls_c5*t_fc^3/m_c^3 to mm
            k_5r5 = 0.9*ls_p5*t_kp^3/m_p^3 to mm
            k_e5 = if(h_5 > 0 mm and n_r ≥ 5; 1/(1/k_3r5 + 1/k_4r5 + 1/k_5r5 + 1/k_10); 0 mm) to mm
            ls_c6 = lsc(6) to mm
            ls_p6 = lsp(6) to mm
            k_3r6 = 0.7*ls_c6*t_wc/d_wc to mm
            k_4r6 = 0.9*ls_c6*t_fc^3/m_c^3 to mm
            k_5r6 = 0.9*ls_p6*t_kp^3/m_p^3 to mm
            k_e6 = if(h_6 > 0 mm and n_r ≥ 6; 1/(1/k_3r6 + 1/k_4r6 + 1/k_5r6 + 1/k_10); 0 mm) to mm
            ls_c7 = lsc(7) to mm
            ls_p7 = lsp(7) to mm
            k_3r7 = 0.7*ls_c7*t_wc/d_wc to mm
            k_4r7 = 0.9*ls_c7*t_fc^3/m_c^3 to mm
            k_5r7 = 0.9*ls_p7*t_kp^3/m_p^3 to mm
            k_e7 = if(h_7 > 0 mm and n_r ≥ 7; 1/(1/k_3r7 + 1/k_4r7 + 1/k_5r7 + 1/k_10); 0 mm) to mm
            ls_c8 = lsc(8) to mm
            ls_p8 = lsp(8) to mm
            k_3r8 = 0.7*ls_c8*t_wc/d_wc to mm
            k_4r8 = 0.9*ls_c8*t_fc^3/m_c^3 to mm
            k_5r8 = 0.9*ls_p8*t_kp^3/m_p^3 to mm
            k_e8 = if(h_8 > 0 mm and n_r ≥ 8; 1/(1/k_3r8 + 1/k_4r8 + 1/k_5r8 + 1/k_10); 0 mm) to mm
            Σ_kh = (k_e1*h_1 + k_e2*h_2 + k_e3*h_3 + k_e4*h_4 + k_e5*h_5 + k_e6*h_6 + k_e7*h_7 + k_e8*h_8) to mm^2
            Σ_khh = (k_e1*h_1^2 + k_e2*h_2^2 + k_e3*h_3^2 + k_e4*h_4^2 + k_e5*h_5^2 + k_e6*h_6^2 + k_e7*h_7^2 + k_e8*h_8^2) to mm^3
            #show
            '<i>Stijfheidscoëfficiënten per rij in mm (tabel 6.11): kolomlijf op trek k<sub>3</sub>, kolomflens k<sub>4</sub>, kopplaat k<sub>5</sub> en bouten k<sub>10</sub>, met l<sub>eff</sub> als kleinste van de rij en de groep.</i><span class="alleen-scherm"></span>
            '<table class="alleen-scherm" style="border-collapse:collapse; font-size:0.9em; margin:2px 0 6px 0;">
            '<tr style="border-bottom:1px solid #9ca3af;"><th style="padding:1px 5px; text-align:left; font-weight:600;">Rij</th><th style="padding:1px 5px; text-align:right; font-weight:600;">h<sub>r</sub></th><th style="padding:1px 5px; text-align:right; font-weight:600;">l<sub>eff</sub> kolom</th><th style="padding:1px 5px; text-align:right; font-weight:600;">l<sub>eff</sub> kopplaat</th><th style="padding:1px 5px; text-align:right; font-weight:600;">k<sub>3</sub></th><th style="padding:1px 5px; text-align:right; font-weight:600;">k<sub>4</sub></th><th style="padding:1px 5px; text-align:right; font-weight:600;">k<sub>5</sub></th><th style="padding:1px 5px; text-align:right; font-weight:600;">k<sub>10</sub></th><th style="padding:1px 5px; text-align:right; font-weight:600;">k<sub>eff,r</sub></th></tr>
            #if n_t ≥ 1
                '<tr><td style="padding:1px 5px;">1</td><td style="padding:1px 5px; text-align:right;">'h_1'</td><td style="padding:1px 5px; text-align:right;">'ls_c1'</td><td style="padding:1px 5px; text-align:right;">'ls_p1'</td><td style="padding:1px 5px; text-align:right;">'k_3r1'</td><td style="padding:1px 5px; text-align:right;">'k_4r1'</td><td style="padding:1px 5px; text-align:right;">'k_5r1'</td><td style="padding:1px 5px; text-align:right;">'k_10'</td><td style="padding:1px 5px; text-align:right;"><b>'k_e1'</b></td></tr>
            #end if
            #if n_t ≥ 2
                '<tr><td style="padding:1px 5px;">2</td><td style="padding:1px 5px; text-align:right;">'h_2'</td><td style="padding:1px 5px; text-align:right;">'ls_c2'</td><td style="padding:1px 5px; text-align:right;">'ls_p2'</td><td style="padding:1px 5px; text-align:right;">'k_3r2'</td><td style="padding:1px 5px; text-align:right;">'k_4r2'</td><td style="padding:1px 5px; text-align:right;">'k_5r2'</td><td style="padding:1px 5px; text-align:right;">'k_10'</td><td style="padding:1px 5px; text-align:right;"><b>'k_e2'</b></td></tr>
            #end if
            #if n_t ≥ 3
                '<tr><td style="padding:1px 5px;">3</td><td style="padding:1px 5px; text-align:right;">'h_3'</td><td style="padding:1px 5px; text-align:right;">'ls_c3'</td><td style="padding:1px 5px; text-align:right;">'ls_p3'</td><td style="padding:1px 5px; text-align:right;">'k_3r3'</td><td style="padding:1px 5px; text-align:right;">'k_4r3'</td><td style="padding:1px 5px; text-align:right;">'k_5r3'</td><td style="padding:1px 5px; text-align:right;">'k_10'</td><td style="padding:1px 5px; text-align:right;"><b>'k_e3'</b></td></tr>
            #end if
            #if n_t ≥ 4
                '<tr><td style="padding:1px 5px;">4</td><td style="padding:1px 5px; text-align:right;">'h_4'</td><td style="padding:1px 5px; text-align:right;">'ls_c4'</td><td style="padding:1px 5px; text-align:right;">'ls_p4'</td><td style="padding:1px 5px; text-align:right;">'k_3r4'</td><td style="padding:1px 5px; text-align:right;">'k_4r4'</td><td style="padding:1px 5px; text-align:right;">'k_5r4'</td><td style="padding:1px 5px; text-align:right;">'k_10'</td><td style="padding:1px 5px; text-align:right;"><b>'k_e4'</b></td></tr>
            #end if
            #if n_t ≥ 5
                '<tr><td style="padding:1px 5px;">5</td><td style="padding:1px 5px; text-align:right;">'h_5'</td><td style="padding:1px 5px; text-align:right;">'ls_c5'</td><td style="padding:1px 5px; text-align:right;">'ls_p5'</td><td style="padding:1px 5px; text-align:right;">'k_3r5'</td><td style="padding:1px 5px; text-align:right;">'k_4r5'</td><td style="padding:1px 5px; text-align:right;">'k_5r5'</td><td style="padding:1px 5px; text-align:right;">'k_10'</td><td style="padding:1px 5px; text-align:right;"><b>'k_e5'</b></td></tr>
            #end if
            #if n_t ≥ 6
                '<tr><td style="padding:1px 5px;">6</td><td style="padding:1px 5px; text-align:right;">'h_6'</td><td style="padding:1px 5px; text-align:right;">'ls_c6'</td><td style="padding:1px 5px; text-align:right;">'ls_p6'</td><td style="padding:1px 5px; text-align:right;">'k_3r6'</td><td style="padding:1px 5px; text-align:right;">'k_4r6'</td><td style="padding:1px 5px; text-align:right;">'k_5r6'</td><td style="padding:1px 5px; text-align:right;">'k_10'</td><td style="padding:1px 5px; text-align:right;"><b>'k_e6'</b></td></tr>
            #end if
            #if n_t ≥ 7
                '<tr><td style="padding:1px 5px;">7</td><td style="padding:1px 5px; text-align:right;">'h_7'</td><td style="padding:1px 5px; text-align:right;">'ls_c7'</td><td style="padding:1px 5px; text-align:right;">'ls_p7'</td><td style="padding:1px 5px; text-align:right;">'k_3r7'</td><td style="padding:1px 5px; text-align:right;">'k_4r7'</td><td style="padding:1px 5px; text-align:right;">'k_5r7'</td><td style="padding:1px 5px; text-align:right;">'k_10'</td><td style="padding:1px 5px; text-align:right;"><b>'k_e7'</b></td></tr>
            #end if
            #if n_t ≥ 8
                '<tr><td style="padding:1px 5px;">8</td><td style="padding:1px 5px; text-align:right;">'h_8'</td><td style="padding:1px 5px; text-align:right;">'ls_c8'</td><td style="padding:1px 5px; text-align:right;">'ls_p8'</td><td style="padding:1px 5px; text-align:right;">'k_3r8'</td><td style="padding:1px 5px; text-align:right;">'k_4r8'</td><td style="padding:1px 5px; text-align:right;">'k_5r8'</td><td style="padding:1px 5px; text-align:right;">'k_10'</td><td style="padding:1px 5px; text-align:right;"><b>'k_e8'</b></td></tr>
            #end if
            '</table>
            z_eq = Σ_khh/Σ_kh', (6.31)<span class="alleen-scherm"></span>'
            z_eq', (6.31)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            k_eq = Σ_kh/z_eq', (6.29)<span class="alleen-scherm"></span>'
            k_eq', (6.29)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            k_1 = 0.38*A_vc/z_eq', tabel 6.11, β = 1<span class="alleen-scherm"></span>'
            k_1', tabel 6.11, β = 1<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            k_2 = 0.7*b_eff,c,wc*t_wc/d_wc', tabel 6.11<span class="alleen-scherm"></span>'
            k_2', tabel 6.11<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            S_j,ini = E*z_eq^2/(1/k_1 + 1/k_2 + 1/k_eq) to kN*m', per rad (6.27)'
        #else
            k_1 = 0.38*A_vc/z_f', tabel 6.11, β = 1<span class="alleen-scherm"></span>'
            k_1', tabel 6.11, β = 1<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            k_2 = 0.7*b_eff,c,wc*t_wc/d_wc', tabel 6.11<span class="alleen-scherm"></span>'
            k_2', tabel 6.11<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            k_3 = 0.7*b_eff,t,wc*t_wc/d_wc', tabel 6.11<span class="alleen-scherm"></span>'
            k_3', tabel 6.11<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            S_j,ini = E*z_f^2/(1/k_1 + 1/k_2 + 1/k_3) to kN*m', per rad (6.27)'
        #end if
        #hide
        k_b = if(stabiliteit ≡ 2; 8; 25)
        #show
        S_j,st = k_b*E*I_b/L_b to kN*m', grens stijf, k_b = 8 geschoord, 25 ongeschoord (§5.2.2.5)<span class="alleen-scherm"></span>'
        S_j,st', grens stijf, k_b = 8 geschoord, 25 ongeschoord (§5.2.2.5)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
        S_j,sch = 0.5*E*I_b/L_b to kN*m', grens nominaal scharnierend (§5.2.2.5)<span class="alleen-scherm"></span>'
        S_j,sch', grens nominaal scharnierend (§5.2.2.5)<span class="alleen-afdruk"></span><span class="kolom-2"></span>'
        #if S_j,ini ≥ S_j,st
            #if stabiliteit ≡ 1
                'Classificatie naar stijfheid: <b>stijf</b>, mits K<sub>b</sub>/K<sub>c</sub> ≥ 0,1 (§5.2.2.5(1), figuur 5.4).
            #else
                'Classificatie naar stijfheid: <b>stijf</b>.
            #end if
        #else if S_j,ini ≤ S_j,sch
            'Classificatie naar stijfheid: <b>nominaal scharnierend</b>.
        #else
            'Classificatie naar stijfheid: <b>semi-stijf</b>; reken het raamwerk met de stijfheid van de verbinding (§5.1.2).
        #end if
    #end if
#end if

#if ok_all ≡ 0
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de verbinding voldoet niet</b>: de geometrie of een voorwaarde hierboven klopt niet.</span>
#else if M_j,Rd ≤ 0 kN*m
    '<b>Maatgevende UC</b><span style="color: red"> niet bepaald → <b>de verbinding voldoet niet</b>: er is geen momentweerstand.</span>
#else
    #hide
    UC_max = max(UC_M; UC_V; UC_Vb; UC_lf; UC_lw; UC_lt)
    #show
    #if ok_volsterk ≡ 0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red">, maar <b>de verbinding voldoet niet</b>: een boutrij draagt meer dan 1,8·F<sub>t,Rd</sub> in een verbinding die niet volledig sterk is (NB bij §6.2.7.2(9)).</span>
    #else if UC_max ≤ 1.0
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>de verbinding voldoet</b></span>
    #else
        '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>de verbinding voldoet niet</b></span>
    #end if
#end if
'<i class="ook-afdruk">Nog niet getoetst: moment met trek onderin, normaalkracht in de ligger, verstijvingen of een kolomeinde bij de verbinding, trek en afschuiving samen in de lijflas, de lassen bij een plastisch scharnier in de verbinding (§6.2.3(5)), het liggerlijf op druk aan het eind van de console (§6.2.6.7(3)) en de rotatiecapaciteit (§6.4).</i>
`;
