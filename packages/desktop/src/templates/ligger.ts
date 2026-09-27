/**
 * Ligger — één module voor een ligger van hout of staal, in plaats van een
 * blad per statisch schema en per materiaal.
 *
 * Het systeem: twee, drie of vier steunpunten of een uitkraging, met een
 * overstek links en rechts, een inklemming aan een of beide einden en tot twee
 * gerberscharnieren. De belasting: het eigen gewicht en tot zes lasten, elk
 * permanent of veranderlijk (met een categorie voor ψ en de belastingsduur),
 * gelijkmatig over de hele ligger of een deel, trapezium- of driehoekvormig, of
 * als puntlast. De krachtsverdeling komt uit de rekenkern: ligger() lost de
 * ligger op met de verplaatsingsmethode (packages/core/src/ligger.ts, getoetst
 * in scripts/check-ligger-kern.mjs); ligger_omh() stelt per punt de
 * ongunstigste combinatie samen, met elke veranderlijke last alleen op de delen
 * waar hij ongunstig werkt (schaakbordbelasting), de permanente last met één
 * factor (gunstig of ongunstig op het totaal) en per punt de ongunstigste keuze
 * van de overheersende veranderlijke last.
 *
 * Combinaties: 6.10a en 6.10b met de factoren van de gevolgklasse uit de
 * projectgegevens (tabel NB.4 en NB.5 — A1.2(B)), de karakteristieke,
 * frequente en quasi-blijvende combinatie (6.14b, 6.15b, 6.16b) voor de
 * doorbuiging en de evenwichtscombinatie (tabel NB.3 — A1.2(A)) voor trek in
 * een oplegging.
 *
 * Hout (NEN-EN 1995-1-1 + NB): buiging, afschuiving met k_cr = 1,0 (NB),
 * oplegdruk, kip met k_crit en de doorbuiging met k_def. k_mod per
 * belastingsduur: de toetsen lopen de duurklassen af, telkens met de lasten die
 * minstens zo lang duren en de k_mod van die klasse. Staal (NEN-EN 1993-1-1 +
 * NB): doorsnedeklasse, buiging, dwarskracht, interactie met de dwarskracht,
 * kip met M_cr volgens bijlage NB.NB en de doorbuiging. De profielen komen uit
 * de gedeelde tabel (components/calc/profielen.ts, matrix geplakt en bewaakt
 * door scripts/check-profielen.mjs).
 *
 * Doorbuiging volgens de NB bij NEN-EN 1990, A1.4.3: w_bij = w_2 + w_3 bij de
 * frequente (vloeren) of karakteristieke (daken) combinatie, de eindstand
 * w_max = w_inst + w_kruip; per veld, met l_rep de overspanning of tweemaal de
 * lengte van een overstek.
 *
 * Op papier beknopt: de invoer staat in een lastentabel, de omhullende M-, V-
 * en w-lijn klein naast de maatgevende waarden, de combinaties in één tabel en
 * per toets één regel. Uitleg en de tabellen per segment staan alleen op het
 * scherm.
 *
 * Voorbeelden met handberekening: scripts/check-ligger.mjs.
 */

export const ligger = `"Ligger van hout of staal — EN 1995-1-1 of EN 1993-1-1

'<i>Eén blad voor een ligger van hout of staal: op twee, drie of vier steunpunten of als uitkraging, met overstekken, inklemmingen en gerberscharnieren, onder het eigen gewicht en tot zes lasten — gelijkmatig over de hele ligger of een deel, trapezium- of driehoekvormig, of als puntlast. De rekenkern lost de ligger op met de verplaatsingsmethode (exact binnen de balktheorie); het blad stelt de belastinggevallen en combinaties samen en toetst de doorsnede.</i><span class="alleen-scherm"></span>

#hide
kleur(u) = if(u > 1; "#b91c1c"; if(u > 0.9; "#b45309"; "#047857"))
oordeel(u) = if(u ≤ 1; "voldoet"; "voldoet niet")
r2(x) = round(x; 2)
#show

# 1. Materiaal en doorsnede

@select materiaal "Materiaal"
  Hout = 1
  Staal = 2
@end
#hide
hout = bool(materiaal ≡ 1)
#show
#if hout ≡ 1
    @select houtklasse "Sterkteklasse"
      C24 = 2
      C18 = 1
      C30 = 3
      GL24h = 4
      GL28h = 5
      GL32h = 6
    @end
    @select klimaat "Klimaatklasse"
      Klimaatklasse 1 = 1
      Klimaatklasse 2 = 2
      Klimaatklasse 3 = 3
    @end
    b = ?*(mm)', breedte<span class="kolom-3"></span>'
    h = ?*(mm)', hoogte<span class="kolom-3"></span>'
    a_opl = ?*(mm)', opleglengte<span class="kolom-3"></span>'
    #hide
    'Materiaalmatrix [id | f_m,k | f_v,k | f_c,90,k | E_mean | E_0,05 (N/mm²) | ρ_mean (kg/m³) | γ_M]:
    'EN 338 voor C18 t/m C30, EN 14080 voor GL24h t/m GL32h.
    houtsoorten = [1; 2; 3; 4; 5; 6 |18; 24; 30; 24; 28; 32 |3.4; 4.0; 4.0; 3.5; 3.5; 3.5 |2.2; 2.5; 2.7; 2.5; 2.5; 2.5 |9000; 11000; 12000; 11500; 12600; 14200 |6000; 7400; 8000; 9600; 10500; 11800 |380; 420; 460; 420; 460; 490 |1.30; 1.30; 1.30; 1.25; 1.25; 1.25]
    f_m,k = hlookup(houtsoorten; houtklasse; 1; 2)*N/mm^2
    f_v,k = hlookup(houtsoorten; houtklasse; 1; 3)*N/mm^2
    f_c,90,k = hlookup(houtsoorten; houtklasse; 1; 4)*N/mm^2
    E_mean = hlookup(houtsoorten; houtklasse; 1; 5)*N/mm^2
    E_0,05 = hlookup(houtsoorten; houtklasse; 1; 6)*N/mm^2
    ρ_mean = hlookup(houtsoorten; houtklasse; 1; 7)*kg/m^3
    γ_M = hlookup(houtsoorten; houtklasse; 1; 8)
    gelijmd = bool(houtklasse ≥ 4)
    'Hoogtefactor op f_m,k: massief §3.2(3) bij h < 150 mm, gelamineerd §3.3(3) bij h < 600 mm.
    h_ruw = max(h/(1 mm); 1)
    k_h = if(gelijmd ≡ 1; if(h_ruw < 600; min(1.1; (600/h_ruw)^0.1); 1); if(h_ruw < 150; min(1.3; (150/h_ruw)^0.2); 1))
    'k_def (tabel 3.2) en k_mod (tabel 3.1) per belastingsduurklasse d: 1 blijvend, 2 lang, 3 middellang, 4 kort.
    k_def = if(klimaat ≡ 1; 0.6; if(klimaat ≡ 2; 0.8; 2.0))
    k_mod(d) = if(klimaat ≡ 3; if(d ≡ 1; 0.5; if(d ≡ 2; 0.55; if(d ≡ 3; 0.65; 0.7))); if(d ≡ 1; 0.6; if(d ≡ 2; 0.7; if(d ≡ 3; 0.8; 0.9))))
    A = b*h to mm^2
    I_y = b*h^3/12 to mm^4
    W_y = b*h^2/6 to mm^3
    E = E_mean
    g_eg = A*ρ_mean*9.81 m/s^2 to kN/m
    'Kale getallen in kN en m voor de toetsen per belastingsduur.
    b_n = max(b/(1 m); 10^-6)
    h_n = max(h/(1 m); 10^-6)
    a_n = max(a_opl/(1 m); 0)
    A_n = b_n*h_n
    W_n = b_n*h_n^2/6
    fmk_n = f_m,k/(1 kN/m^2)
    fvk_n = f_v,k/(1 kN/m^2)
    fc90k_n = f_c,90,k/(1 kN/m^2)
    E005_n = E_0,05/(1 kN/m^2)
    #show
    f_m,k'<span class="kolom-4"></span>'
    f_v,k'<span class="kolom-4"></span>'
    f_c,90,k'<span class="kolom-4"></span>'
    E_mean'<span class="kolom-4"></span>'
    E_0,05'<span class="kolom-4"></span>'
    ρ_mean'<span class="kolom-4"></span>'
    γ_M'<span class="kolom-4"></span>'
    k_h', §3.2(3) en §3.3(3)<span class="kolom-4"></span>'
    k_def', tabel 3.2<span class="kolom-4"></span>'
    W_y', b·h²/6<span class="kolom-4"></span>'
    I_y', b·h³/12<span class="kolom-4"></span>'
#else
    @select profiel "Profiel"
      IPE 200 = 21
      IPE 240 = 22
      IPE 270 = 23
      IPE 300 = 24
      IPE 330 = 25
      IPE 360 = 26
      IPE 400 = 27
      HEA 100 = 1
      HEA 120 = 2
      HEA 140 = 3
      HEA 160 = 4
      HEA 180 = 5
      HEA 200 = 6
      HEA 220 = 7
      HEA 240 = 8
      HEA 260 = 9
      HEA 300 = 10
      HEB 100 = 11
      HEB 120 = 12
      HEB 140 = 13
      HEB 160 = 14
      HEB 180 = 15
      HEB 200 = 16
      HEB 220 = 17
      HEB 240 = 18
      HEB 260 = 19
      HEB 300 = 20
    @end
    @select staalsoort "Staalsoort"
      S235 = 235
      S275 = 275
      S355 = 355
    @end
    #hide
    'Profieltabel uit profielen.ts: id | h (mm) | b (mm) | t_w (mm) | t_f (mm) | r (mm) | A (cm²) | I_y (cm⁴) | W_el,y (cm³) | W_pl,y (cm³) | i_y (cm) | A_v,z (cm²) | I_z (cm⁴) | W_el,z (cm³) | W_pl,z (cm³) | i_z (cm) | I_t (cm⁴) | I_w (cm⁶)
    profielen = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23; 24; 25; 26; 27 |96; 114; 133; 152; 171; 190; 210; 230; 250; 290; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 200; 240; 270; 300; 330; 360; 400 |100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 140; 160; 180; 200; 220; 240; 260; 300; 100; 120; 135; 150; 160; 170; 180 |5; 5; 5.5; 6; 6; 6.5; 7; 7.5; 7.5; 8.5; 6; 6.5; 7; 8; 8.5; 9; 9.5; 10; 10; 11; 5.6; 6.2; 6.6; 7.1; 7.5; 8; 8.6 |8; 8; 8.5; 9; 9.5; 10; 11; 12; 12.5; 14; 10; 11; 12; 13; 14; 15; 16; 17; 17.5; 19; 8.5; 9.8; 10.2; 10.7; 11.5; 12.7; 13.5 |12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 12; 12; 15; 15; 18; 18; 21; 24; 27; 12; 15; 15; 15; 18; 18; 21 |21.24; 25.34; 31.42; 38.77; 45.25; 53.83; 64.34; 76.84; 86.82; 112.5; 26.04; 34.01; 42.96; 54.25; 65.25; 78.08; 91.04; 106; 118.4; 149.1; 28.48; 39.12; 45.95; 53.81; 62.61; 72.73; 84.46 |349.2; 606.2; 1033; 1673; 2510; 3692; 5410; 7763; 10450; 18260; 449.5; 864.4; 1509; 2492; 3831; 5696; 8091; 11260; 14920; 25170; 1943; 3892; 5790; 8356; 11770; 16270; 23130 |72.76; 106.3; 155.4; 220.1; 293.6; 388.6; 515.2; 675.1; 836.4; 1260; 89.91; 144.1; 215.6; 311.5; 425.7; 569.6; 735.5; 938.3; 1148; 1678; 194.3; 324.3; 428.9; 557.1; 713.1; 903.6; 1156 |83.01; 119.5; 173.5; 245.1; 324.9; 429.5; 568.5; 744.6; 919.8; 1383; 104.2; 165.2; 245.4; 354; 481.4; 642.5; 827; 1053; 1283; 1869; 220.6; 366.6; 484; 628.4; 804.3; 1019; 1307 |4.06; 4.89; 5.73; 6.57; 7.45; 8.28; 9.17; 10.05; 10.97; 12.74; 4.16; 5.04; 5.93; 6.78; 7.66; 8.54; 9.43; 10.31; 11.22; 12.99; 8.26; 9.97; 11.23; 12.46; 13.71; 14.95; 16.55 |7.56; 8.46; 10.12; 13.21; 14.47; 18.08; 20.67; 25.18; 28.76; 37.28; 9.04; 10.96; 13.08; 17.59; 20.24; 24.83; 27.92; 33.23; 37.59; 47.43; 14; 19.14; 22.14; 25.68; 30.81; 35.14; 42.69 |133.8; 230.9; 389.3; 615.6; 924.6; 1336; 1955; 2769; 3668; 6310; 167.3; 317.5; 549.7; 889.2; 1363; 2003; 2843; 3923; 5135; 8563; 142.4; 283.6; 419.9; 603.8; 788.1; 1043; 1318 |26.76; 38.48; 55.62; 76.95; 102.7; 133.6; 177.7; 230.7; 282.1; 420.6; 33.45; 52.92; 78.52; 111.2; 151.4; 200.3; 258.5; 326.9; 395; 570.9; 28.47; 47.27; 62.2; 80.5; 98.52; 122.8; 146.4 |41.14; 58.85; 84.85; 117.6; 156.5; 203.8; 270.6; 351.7; 430.2; 641.2; 51.42; 80.97; 119.8; 170; 231; 305.8; 393.9; 498.4; 602.2; 870.1; 44.61; 73.92; 96.95; 125.2; 153.7; 191.1; 229 |2.51; 3.02; 3.52; 3.98; 4.52; 4.98; 5.51; 6; 6.5; 7.49; 2.53; 3.06; 3.58; 4.05; 4.57; 5.07; 5.59; 6.08; 6.58; 7.58; 2.24; 2.69; 3.02; 3.35; 3.55; 3.79; 3.95 |5.24; 5.99; 8.13; 12.19; 14.8; 20.98; 28.46; 41.55; 52.37; 85.17; 9.25; 13.84; 20.06; 31.24; 42.16; 59.28; 76.57; 102.7; 123.8; 185; 6.98; 12.88; 15.94; 20.12; 28.15; 37.32; 51.08 |2580; 6470; 15060; 31410; 60210; 108000; 193300; 328500; 516400; 1200000; 3380; 9410; 22480; 47940; 93750; 171100; 295400; 486900; 753700; 1688000; 12990; 37390; 70580; 125900; 199100; 313600; 490000]
    h = hlookup(profielen; profiel; 1; 2)*mm
    b = hlookup(profielen; profiel; 1; 3)*mm
    t_w = hlookup(profielen; profiel; 1; 4)*mm
    t_f = hlookup(profielen; profiel; 1; 5)*mm
    r = hlookup(profielen; profiel; 1; 6)*mm
    A = hlookup(profielen; profiel; 1; 7)*cm^2
    I_y = hlookup(profielen; profiel; 1; 8)*cm^4
    W_el,y = hlookup(profielen; profiel; 1; 9)*cm^3
    W_pl,y = hlookup(profielen; profiel; 1; 10)*cm^3
    A_v,z = hlookup(profielen; profiel; 1; 12)*cm^2
    I_z = hlookup(profielen; profiel; 1; 13)*cm^4
    I_t = hlookup(profielen; profiel; 1; 17)*cm^4
    I_w = hlookup(profielen; profiel; 1; 18)*cm^6
    f_y = staalsoort*1 N/mm^2
    E = 210000 N/mm^2
    G_st = 81000 N/mm^2
    γ_M0 = 1.0
    γ_M1 = 1.0
    ε = sqrt(235 N/mm^2/f_y)
    k_def = 0
    k_mod(d) = 1
    g_eg = A*78.5 kN/m^3 to kN/m
    'Doorsnedeklasse (tabel 5.2): het lijf op buiging, de flens op druk.
    c_w = h - 2*t_f - 2*r
    c_f = (b - t_w - 2*r)/2
    kl_w = if(c_w/t_w ≤ 72*ε; 1; if(c_w/t_w ≤ 83*ε; 2; if(c_w/t_w ≤ 124*ε; 3; 4)))
    kl_f = if(c_f/t_f ≤ 9*ε; 1; if(c_f/t_f ≤ 10*ε; 2; if(c_f/t_f ≤ 14*ε; 3; 4)))
    #show
    h'<span class="kolom-4"></span>'
    b'<span class="kolom-4"></span>'
    t_w'<span class="kolom-4"></span>'
    t_f'<span class="kolom-4"></span>'
    A'<span class="kolom-4"></span>'
    I_y'<span class="kolom-4"></span>'
    W_pl,y'<span class="kolom-4"></span>'
    W_el,y'<span class="kolom-4"></span>'
    I_z'<span class="kolom-4"></span>'
    I_t'<span class="kolom-4"></span>'
    I_w'<span class="kolom-4"></span>'
    f_y'<span class="kolom-4"></span>'
    klasse = max(kl_w; kl_f)', tabel 5.2: lijf op buiging, flens op druk<span class="kolom-2"></span>'
    #if klasse ≡ 4
        '<b style="color:#b91c1c">Klasse 4: daarvoor is een effectieve doorsnede volgens NEN-EN 1993-1-5 nodig, die dit blad niet bepaalt; het rekent aan de onveilige kant met W<sub>el,y</sub>.</b>
    #end if
    #hide
    W_y = if(klasse ≤ 2; W_pl,y; W_el,y)
    #show
    W_y', W<sub>pl,y</sub> bij klasse 1 en 2, W<sub>el,y</sub> bij klasse 3<span class="kolom-2"></span>'
    #hide
    b_n = b/(1 m)
    h_n = h/(1 m)
    A_n = A/(1 m^2)
    W_n = W_y/(1 m^3)
    fy_n = f_y/(1 kN/m^2)
    E_n = E/(1 kN/m^2)
    G_n = G_st/(1 kN/m^2)
    Iz_n = I_z/(1 m^4)
    It_n = I_t/(1 m^4)
    Iw_n = I_w/(1 m^6)
    #show
#end if
#hide
EI_n = max(E*I_y/(1 kN*m^2); 0.001)
g_n = g_eg/(1 kN/m)
#show
EI = E*I_y to kN*m^2', buigstijfheid<span class="kolom-2"></span>'

# 2. Statisch systeem

@select systeem "Statisch systeem"
  Ligger op twee steunpunten = 2
  Doorgaande ligger op drie steunpunten = 3
  Doorgaande ligger op vier steunpunten = 4
  Uitkraging, ingeklemd = 1
@end
#if systeem ≡ 1
    L_1 = ?*(m)', lengte van de uitkraging<span class="kolom-3"></span>'
#else
    L_1 = ?*(m)', veld 1<span class="kolom-3"></span>'
#end if
#if systeem ≥ 3
    L_2 = ?*(m)', veld 2<span class="kolom-3"></span>'
#else
    #hide
    L_2 = 0 m
    #show
#end if
#if systeem ≡ 4
    L_3 = ?*(m)', veld 3<span class="kolom-3"></span>'
#else
    #hide
    L_3 = 0 m
    #show
#end if
#if systeem ≥ 2
    a_l = ?*(m)', overstek links (0 = geen)<span class="kolom-3"></span>'
    a_r = ?*(m)', overstek rechts (0 = geen)<span class="kolom-3"></span>'
    @select inklemming "Inklemming"
      Geen = 0
      Links = 1
      Rechts = 2
      Aan beide einden = 3
    @end
#else
    #hide
    a_l = 0 m
    a_r = 0 m
    inklemming = 0
    #show
#end if
@select scharnieren "Gerberscharnieren"
  Geen = 0
  Eén = 1
  Twee = 2
@end
#if scharnieren ≥ 1
    x_h1 = ?*(m)', scharnier 1, vanaf het linkereind<span class="kolom-3"></span>'
#else
    #hide
    x_h1 = 0 m
    #show
#end if
#if scharnieren ≡ 2
    x_h2 = ?*(m)', scharnier 2, vanaf het linkereind<span class="kolom-3"></span>'
#else
    #hide
    x_h2 = 0 m
    #show
#end if
@select kipsteun "Zijdelingse steun van de ligger (kip)"
  Gedrukte rand in het veld doorlopend gesteund (vloer, dakbeschot) = 1
  Alleen bij de steunpunten gesteund = 2
  Kipsteunen op onderlinge afstand a_kip = 3
@end
#if kipsteun ≡ 3
    a_kip = ?*(m)', afstand tussen de kipsteunen<span class="kolom-3"></span>'
#else
    #hide
    a_kip = 0 m
    #show
#end if
#if kipsteun ≥ 2
    @select aangrijping "Aangrijpingspunt van de lasten"
      Bovenzijde = 1
      Zwaartelijn = 0
      Onderzijde = -1
    @end
#else
    #hide
    aangrijping = 0
    #show
#end if
'<i>Posities worden gemeten vanaf het linkereind van de ligger, inclusief een overstek links. Een steunpunt draagt verticaal en is vrij draaibaar, tenzij hij als inklemming is gekozen; een gerberscharnier brengt geen moment over. Bij de steunpunten is de ligger tegen kantelen gesteund (gaffels).</i><span class="alleen-scherm"></span>

#hide
r_L1 = max(L_1/(1 m); 0)
r_L2 = max(L_2/(1 m); 0)
r_L3 = max(L_3/(1 m); 0)
r_al = max(a_l/(1 m); 0)
r_ar = max(a_r/(1 m); 0)
kl_l = bool(inklemming ≡ 1) + bool(inklemming ≡ 3)
kl_r = bool(inklemming ≡ 2) + bool(inklemming ≡ 3)
'Steunpunten van links af; een ongebruikt steunpunt krijgt soort -1 en telt niet mee.
'Soort 1 is een steunpunt, 2 een inklemming, 3 een scharnier, 0 een vrij eind.
xs_1 = r_al
xs_2 = xs_1 + r_L1
xs_3 = xs_2 + r_L2
xs_4 = xs_3 + r_L3
st_1 = if(systeem ≡ 1; 2; if(kl_l ≡ 1; 2; 1))
st_2 = if(systeem ≡ 2; if(kl_r ≡ 1; 2; 1); if(systeem ≥ 3; 1; -1))
st_3 = if(systeem ≡ 3; if(kl_r ≡ 1; 2; 1); if(systeem ≡ 4; 1; -1))
st_4 = if(systeem ≡ 4; if(kl_r ≡ 1; 2; 1); -1)
x_eind = if(systeem ≡ 1; r_L1; if(systeem ≡ 2; xs_2; if(systeem ≡ 3; xs_3; xs_4)) + r_ar)
n_s = max(systeem; 1)
span_min = if(systeem ≡ 4; min(r_L1; r_L2; r_L3); if(systeem ≡ 3; min(r_L1; r_L2); r_L1))
'Een scharnier buiten de ligger telt niet.
xh_1 = x_h1/(1 m)
xh_2 = x_h2/(1 m)
sh_1 = if(scharnieren ≥ 1; if(xh_1 > 0; if(xh_1 < x_eind; 3; -1); -1); -1)
sh_2 = if(scharnieren ≡ 2; if(xh_2 > 0; if(xh_2 < x_eind; 3; -1); -1); -1)
geo = [0; xs_1; xs_2; xs_3; xs_4; x_eind; xh_1; xh_2 |0; st_1; st_2; st_3; st_4; 0; sh_1; sh_2]
status = if(span_min > 0; ligger_status(geo; EI_n); 0)
L_tot = x_eind*m
vSt = [st_1; st_2; st_3; st_4]
a_kn = max(a_kip/(1 m); 0)
#show
L_tot', totale lengte van de ligger<span class="kolom-3"></span>'
#if scharnieren ≥ 1
    #if sh_1 < 0
        '<span style="color:#b45309">Scharnier 1 ligt niet binnen de ligger en telt niet mee.</span>
    #end if
#end if
#if scharnieren ≡ 2
    #if sh_2 < 0
        '<span style="color:#b45309">Scharnier 2 ligt niet binnen de ligger en telt niet mee.</span>
    #end if
#end if
#if status ≡ -1
    '<span style="color:#b91c1c"><b>De ligger is beweeglijk</b>: te weinig steunpunten of een scharnier te veel, bijvoorbeeld een scharnier in een ligger op twee steunpunten of boven het steunpunt van een overstek. Verplaats het scharnier of kies een steunpunt of inklemming erbij.</span>
#else if status ≡ 0
    '<span style="color:#b45309">Vul de overspanning(en) in; zonder lengte valt er niets te rekenen.</span>
#end if

# 3. Belastingen

'<i>Karakteristieke waarden, positief naar beneden. Permanente lasten (G) gaan samen als één bron in de combinaties; elke veranderlijke last (Q) is een eigen last met de ψ-factoren en de belastingsduur van zijn categorie (tabel NB.2 — A1.1 van NEN-EN 1990 en tabel 2.2 van de NB bij NEN-EN 1995-1-1: vloeren middellang, opslag lang, daken, sneeuw en wind kort). Een verdeelde last over een deel loopt van a tot b; bij een trapezium lineair van de waarde in a naar die in b.</i><span class="alleen-scherm"></span>
@select eg "Eigen gewicht van de ligger"
  Meenemen als permanente last = 1
  Niet meenemen = 0
@end
#if eg ≡ 1
    #if hout ≡ 1
        g_eg', A·ρ<sub>mean</sub>·g<span class="kolom-3"></span>'
    #else
        g_eg', A·78,5 kN/m³<span class="kolom-3"></span>'
    #end if
#end if

@select soort_1 "Last 1"
  Permanent (G) = 1
  Veranderlijk (Q) = 2
  Geen = 0
@end
#if soort_1 ≥ 1
    @select vorm_1 "Vorm van last 1"
      Gelijkmatig over de hele ligger = 1
      Gelijkmatig over een deel = 2
      Trapezium of driehoek = 3
      Puntlast = 4
    @end
    #if soort_1 ≡ 2
        @select cat_1 "Categorie van last 1 (tabel NB.2 — A1.1)"
          A — woon- en verblijfsruimtes = 1
          B — kantoorruimtes = 2
          C — bijeenkomstruimtes = 3
          D — winkelruimtes = 4
          E — opslagruimtes = 5
          F — verkeersruimte, voertuig ≤ 25 kN = 6
          G — verkeersruimte, 25 < voertuig ≤ 160 kN = 7
          H — daken = 8
          Sneeuwbelasting = 9
          Windbelasting = 10
        @end
    #else
        #hide
        cat_1 = 0
        #show
    #end if
    #if vorm_1 ≡ 4
        F_1 = ?*(kN)', puntlast<span class="alleen-scherm"></span>'
        a_1 = ?*(m)', plaats vanaf het linkereind<span class="alleen-scherm"></span>'
        #hide
        q_1 = 0 kN/m
        q_1,e = 0 kN/m
        b_1 = a_1
        #show
    #else if vorm_1 ≡ 1
        q_1 = ?*(kN/m)', over de hele ligger<span class="alleen-scherm"></span>'
        #hide
        q_1,e = q_1
        F_1 = 0 kN
        a_1 = 0 m
        b_1 = L_tot
        #show
    #else if vorm_1 ≡ 2
        q_1 = ?*(kN/m)'<span class="alleen-scherm"></span>'
        a_1 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_1 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        q_1,e = q_1
        F_1 = 0 kN
        #show
    #else
        q_1 = ?*(kN/m)', in a<span class="alleen-scherm"></span>'
        q_1,e = ?*(kN/m)', in b (0 in een van beide: driehoek)<span class="alleen-scherm"></span>'
        a_1 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_1 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        F_1 = 0 kN
        #show
    #end if
    #if vorm_1 ≡ 2
        #if b_1 ≤ a_1
            '<span class="alleen-scherm" style="color:#b45309">Last 1: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #else if vorm_1 ≡ 3
        #if b_1 ≤ a_1
            '<span class="alleen-scherm" style="color:#b45309">Last 1: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #end if
    #if vorm_1 ≡ 4
        #if bool(x_eind > 0)*(bool(a_1/(1 m) < -10^-6) + bool(a_1/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b91c1c">Last 1: de puntlast ligt buiten de ligger (van 0 tot 'r2(x_eind)' m) en telt niet mee.</span>
        #end if
    #else if vorm_1 ≥ 2
        #if bool(x_eind > 0)*(bool(a_1/(1 m) < -10^-6) + bool(b_1/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b45309">Last 1: de last loopt buiten de ligger (van 0 tot 'r2(x_eind)' m); alleen het deel op de ligger telt mee.</span>
        #end if
    #end if
#else
    #hide
    vorm_1 = 1
    cat_1 = 0
    q_1 = 0 kN/m
    q_1,e = 0 kN/m
    F_1 = 0 kN
    a_1 = 0 m
    b_1 = 0 m
    #show
#end if

@select soort_2 "Last 2"
  Veranderlijk (Q) = 2
  Permanent (G) = 1
  Geen = 0
@end
#if soort_2 ≥ 1
    @select vorm_2 "Vorm van last 2"
      Gelijkmatig over de hele ligger = 1
      Gelijkmatig over een deel = 2
      Trapezium of driehoek = 3
      Puntlast = 4
    @end
    #if soort_2 ≡ 2
        @select cat_2 "Categorie van last 2 (tabel NB.2 — A1.1)"
          A — woon- en verblijfsruimtes = 1
          B — kantoorruimtes = 2
          C — bijeenkomstruimtes = 3
          D — winkelruimtes = 4
          E — opslagruimtes = 5
          F — verkeersruimte, voertuig ≤ 25 kN = 6
          G — verkeersruimte, 25 < voertuig ≤ 160 kN = 7
          H — daken = 8
          Sneeuwbelasting = 9
          Windbelasting = 10
        @end
    #else
        #hide
        cat_2 = 0
        #show
    #end if
    #if vorm_2 ≡ 4
        F_2 = ?*(kN)', puntlast<span class="alleen-scherm"></span>'
        a_2 = ?*(m)', plaats vanaf het linkereind<span class="alleen-scherm"></span>'
        #hide
        q_2 = 0 kN/m
        q_2,e = 0 kN/m
        b_2 = a_2
        #show
    #else if vorm_2 ≡ 1
        q_2 = ?*(kN/m)', over de hele ligger<span class="alleen-scherm"></span>'
        #hide
        q_2,e = q_2
        F_2 = 0 kN
        a_2 = 0 m
        b_2 = L_tot
        #show
    #else if vorm_2 ≡ 2
        q_2 = ?*(kN/m)'<span class="alleen-scherm"></span>'
        a_2 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_2 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        q_2,e = q_2
        F_2 = 0 kN
        #show
    #else
        q_2 = ?*(kN/m)', in a<span class="alleen-scherm"></span>'
        q_2,e = ?*(kN/m)', in b (0 in een van beide: driehoek)<span class="alleen-scherm"></span>'
        a_2 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_2 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        F_2 = 0 kN
        #show
    #end if
    #if vorm_2 ≡ 2
        #if b_2 ≤ a_2
            '<span class="alleen-scherm" style="color:#b45309">Last 2: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #else if vorm_2 ≡ 3
        #if b_2 ≤ a_2
            '<span class="alleen-scherm" style="color:#b45309">Last 2: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #end if
    #if vorm_2 ≡ 4
        #if bool(x_eind > 0)*(bool(a_2/(1 m) < -10^-6) + bool(a_2/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b91c1c">Last 2: de puntlast ligt buiten de ligger (van 0 tot 'r2(x_eind)' m) en telt niet mee.</span>
        #end if
    #else if vorm_2 ≥ 2
        #if bool(x_eind > 0)*(bool(a_2/(1 m) < -10^-6) + bool(b_2/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b45309">Last 2: de last loopt buiten de ligger (van 0 tot 'r2(x_eind)' m); alleen het deel op de ligger telt mee.</span>
        #end if
    #end if
#else
    #hide
    vorm_2 = 1
    cat_2 = 0
    q_2 = 0 kN/m
    q_2,e = 0 kN/m
    F_2 = 0 kN
    a_2 = 0 m
    b_2 = 0 m
    #show
#end if

@select soort_3 "Last 3"
  Geen = 0
  Permanent (G) = 1
  Veranderlijk (Q) = 2
@end
#if soort_3 ≥ 1
    @select vorm_3 "Vorm van last 3"
      Gelijkmatig over de hele ligger = 1
      Gelijkmatig over een deel = 2
      Trapezium of driehoek = 3
      Puntlast = 4
    @end
    #if soort_3 ≡ 2
        @select cat_3 "Categorie van last 3 (tabel NB.2 — A1.1)"
          A — woon- en verblijfsruimtes = 1
          B — kantoorruimtes = 2
          C — bijeenkomstruimtes = 3
          D — winkelruimtes = 4
          E — opslagruimtes = 5
          F — verkeersruimte, voertuig ≤ 25 kN = 6
          G — verkeersruimte, 25 < voertuig ≤ 160 kN = 7
          H — daken = 8
          Sneeuwbelasting = 9
          Windbelasting = 10
        @end
    #else
        #hide
        cat_3 = 0
        #show
    #end if
    #if vorm_3 ≡ 4
        F_3 = ?*(kN)', puntlast<span class="alleen-scherm"></span>'
        a_3 = ?*(m)', plaats vanaf het linkereind<span class="alleen-scherm"></span>'
        #hide
        q_3 = 0 kN/m
        q_3,e = 0 kN/m
        b_3 = a_3
        #show
    #else if vorm_3 ≡ 1
        q_3 = ?*(kN/m)', over de hele ligger<span class="alleen-scherm"></span>'
        #hide
        q_3,e = q_3
        F_3 = 0 kN
        a_3 = 0 m
        b_3 = L_tot
        #show
    #else if vorm_3 ≡ 2
        q_3 = ?*(kN/m)'<span class="alleen-scherm"></span>'
        a_3 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_3 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        q_3,e = q_3
        F_3 = 0 kN
        #show
    #else
        q_3 = ?*(kN/m)', in a<span class="alleen-scherm"></span>'
        q_3,e = ?*(kN/m)', in b (0 in een van beide: driehoek)<span class="alleen-scherm"></span>'
        a_3 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_3 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        F_3 = 0 kN
        #show
    #end if
    #if vorm_3 ≡ 2
        #if b_3 ≤ a_3
            '<span class="alleen-scherm" style="color:#b45309">Last 3: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #else if vorm_3 ≡ 3
        #if b_3 ≤ a_3
            '<span class="alleen-scherm" style="color:#b45309">Last 3: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #end if
    #if vorm_3 ≡ 4
        #if bool(x_eind > 0)*(bool(a_3/(1 m) < -10^-6) + bool(a_3/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b91c1c">Last 3: de puntlast ligt buiten de ligger (van 0 tot 'r2(x_eind)' m) en telt niet mee.</span>
        #end if
    #else if vorm_3 ≥ 2
        #if bool(x_eind > 0)*(bool(a_3/(1 m) < -10^-6) + bool(b_3/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b45309">Last 3: de last loopt buiten de ligger (van 0 tot 'r2(x_eind)' m); alleen het deel op de ligger telt mee.</span>
        #end if
    #end if
#else
    #hide
    vorm_3 = 1
    cat_3 = 0
    q_3 = 0 kN/m
    q_3,e = 0 kN/m
    F_3 = 0 kN
    a_3 = 0 m
    b_3 = 0 m
    #show
#end if

@select soort_4 "Last 4"
  Geen = 0
  Permanent (G) = 1
  Veranderlijk (Q) = 2
@end
#if soort_4 ≥ 1
    @select vorm_4 "Vorm van last 4"
      Gelijkmatig over de hele ligger = 1
      Gelijkmatig over een deel = 2
      Trapezium of driehoek = 3
      Puntlast = 4
    @end
    #if soort_4 ≡ 2
        @select cat_4 "Categorie van last 4 (tabel NB.2 — A1.1)"
          A — woon- en verblijfsruimtes = 1
          B — kantoorruimtes = 2
          C — bijeenkomstruimtes = 3
          D — winkelruimtes = 4
          E — opslagruimtes = 5
          F — verkeersruimte, voertuig ≤ 25 kN = 6
          G — verkeersruimte, 25 < voertuig ≤ 160 kN = 7
          H — daken = 8
          Sneeuwbelasting = 9
          Windbelasting = 10
        @end
    #else
        #hide
        cat_4 = 0
        #show
    #end if
    #if vorm_4 ≡ 4
        F_4 = ?*(kN)', puntlast<span class="alleen-scherm"></span>'
        a_4 = ?*(m)', plaats vanaf het linkereind<span class="alleen-scherm"></span>'
        #hide
        q_4 = 0 kN/m
        q_4,e = 0 kN/m
        b_4 = a_4
        #show
    #else if vorm_4 ≡ 1
        q_4 = ?*(kN/m)', over de hele ligger<span class="alleen-scherm"></span>'
        #hide
        q_4,e = q_4
        F_4 = 0 kN
        a_4 = 0 m
        b_4 = L_tot
        #show
    #else if vorm_4 ≡ 2
        q_4 = ?*(kN/m)'<span class="alleen-scherm"></span>'
        a_4 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_4 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        q_4,e = q_4
        F_4 = 0 kN
        #show
    #else
        q_4 = ?*(kN/m)', in a<span class="alleen-scherm"></span>'
        q_4,e = ?*(kN/m)', in b (0 in een van beide: driehoek)<span class="alleen-scherm"></span>'
        a_4 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_4 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        F_4 = 0 kN
        #show
    #end if
    #if vorm_4 ≡ 2
        #if b_4 ≤ a_4
            '<span class="alleen-scherm" style="color:#b45309">Last 4: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #else if vorm_4 ≡ 3
        #if b_4 ≤ a_4
            '<span class="alleen-scherm" style="color:#b45309">Last 4: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #end if
    #if vorm_4 ≡ 4
        #if bool(x_eind > 0)*(bool(a_4/(1 m) < -10^-6) + bool(a_4/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b91c1c">Last 4: de puntlast ligt buiten de ligger (van 0 tot 'r2(x_eind)' m) en telt niet mee.</span>
        #end if
    #else if vorm_4 ≥ 2
        #if bool(x_eind > 0)*(bool(a_4/(1 m) < -10^-6) + bool(b_4/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b45309">Last 4: de last loopt buiten de ligger (van 0 tot 'r2(x_eind)' m); alleen het deel op de ligger telt mee.</span>
        #end if
    #end if
#else
    #hide
    vorm_4 = 1
    cat_4 = 0
    q_4 = 0 kN/m
    q_4,e = 0 kN/m
    F_4 = 0 kN
    a_4 = 0 m
    b_4 = 0 m
    #show
#end if

@select soort_5 "Last 5"
  Geen = 0
  Permanent (G) = 1
  Veranderlijk (Q) = 2
@end
#if soort_5 ≥ 1
    @select vorm_5 "Vorm van last 5"
      Gelijkmatig over de hele ligger = 1
      Gelijkmatig over een deel = 2
      Trapezium of driehoek = 3
      Puntlast = 4
    @end
    #if soort_5 ≡ 2
        @select cat_5 "Categorie van last 5 (tabel NB.2 — A1.1)"
          A — woon- en verblijfsruimtes = 1
          B — kantoorruimtes = 2
          C — bijeenkomstruimtes = 3
          D — winkelruimtes = 4
          E — opslagruimtes = 5
          F — verkeersruimte, voertuig ≤ 25 kN = 6
          G — verkeersruimte, 25 < voertuig ≤ 160 kN = 7
          H — daken = 8
          Sneeuwbelasting = 9
          Windbelasting = 10
        @end
    #else
        #hide
        cat_5 = 0
        #show
    #end if
    #if vorm_5 ≡ 4
        F_5 = ?*(kN)', puntlast<span class="alleen-scherm"></span>'
        a_5 = ?*(m)', plaats vanaf het linkereind<span class="alleen-scherm"></span>'
        #hide
        q_5 = 0 kN/m
        q_5,e = 0 kN/m
        b_5 = a_5
        #show
    #else if vorm_5 ≡ 1
        q_5 = ?*(kN/m)', over de hele ligger<span class="alleen-scherm"></span>'
        #hide
        q_5,e = q_5
        F_5 = 0 kN
        a_5 = 0 m
        b_5 = L_tot
        #show
    #else if vorm_5 ≡ 2
        q_5 = ?*(kN/m)'<span class="alleen-scherm"></span>'
        a_5 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_5 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        q_5,e = q_5
        F_5 = 0 kN
        #show
    #else
        q_5 = ?*(kN/m)', in a<span class="alleen-scherm"></span>'
        q_5,e = ?*(kN/m)', in b (0 in een van beide: driehoek)<span class="alleen-scherm"></span>'
        a_5 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_5 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        F_5 = 0 kN
        #show
    #end if
    #if vorm_5 ≡ 2
        #if b_5 ≤ a_5
            '<span class="alleen-scherm" style="color:#b45309">Last 5: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #else if vorm_5 ≡ 3
        #if b_5 ≤ a_5
            '<span class="alleen-scherm" style="color:#b45309">Last 5: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #end if
    #if vorm_5 ≡ 4
        #if bool(x_eind > 0)*(bool(a_5/(1 m) < -10^-6) + bool(a_5/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b91c1c">Last 5: de puntlast ligt buiten de ligger (van 0 tot 'r2(x_eind)' m) en telt niet mee.</span>
        #end if
    #else if vorm_5 ≥ 2
        #if bool(x_eind > 0)*(bool(a_5/(1 m) < -10^-6) + bool(b_5/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b45309">Last 5: de last loopt buiten de ligger (van 0 tot 'r2(x_eind)' m); alleen het deel op de ligger telt mee.</span>
        #end if
    #end if
#else
    #hide
    vorm_5 = 1
    cat_5 = 0
    q_5 = 0 kN/m
    q_5,e = 0 kN/m
    F_5 = 0 kN
    a_5 = 0 m
    b_5 = 0 m
    #show
#end if

@select soort_6 "Last 6"
  Geen = 0
  Permanent (G) = 1
  Veranderlijk (Q) = 2
@end
#if soort_6 ≥ 1
    @select vorm_6 "Vorm van last 6"
      Gelijkmatig over de hele ligger = 1
      Gelijkmatig over een deel = 2
      Trapezium of driehoek = 3
      Puntlast = 4
    @end
    #if soort_6 ≡ 2
        @select cat_6 "Categorie van last 6 (tabel NB.2 — A1.1)"
          A — woon- en verblijfsruimtes = 1
          B — kantoorruimtes = 2
          C — bijeenkomstruimtes = 3
          D — winkelruimtes = 4
          E — opslagruimtes = 5
          F — verkeersruimte, voertuig ≤ 25 kN = 6
          G — verkeersruimte, 25 < voertuig ≤ 160 kN = 7
          H — daken = 8
          Sneeuwbelasting = 9
          Windbelasting = 10
        @end
    #else
        #hide
        cat_6 = 0
        #show
    #end if
    #if vorm_6 ≡ 4
        F_6 = ?*(kN)', puntlast<span class="alleen-scherm"></span>'
        a_6 = ?*(m)', plaats vanaf het linkereind<span class="alleen-scherm"></span>'
        #hide
        q_6 = 0 kN/m
        q_6,e = 0 kN/m
        b_6 = a_6
        #show
    #else if vorm_6 ≡ 1
        q_6 = ?*(kN/m)', over de hele ligger<span class="alleen-scherm"></span>'
        #hide
        q_6,e = q_6
        F_6 = 0 kN
        a_6 = 0 m
        b_6 = L_tot
        #show
    #else if vorm_6 ≡ 2
        q_6 = ?*(kN/m)'<span class="alleen-scherm"></span>'
        a_6 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_6 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        q_6,e = q_6
        F_6 = 0 kN
        #show
    #else
        q_6 = ?*(kN/m)', in a<span class="alleen-scherm"></span>'
        q_6,e = ?*(kN/m)', in b (0 in een van beide: driehoek)<span class="alleen-scherm"></span>'
        a_6 = ?*(m)', van, vanaf het linkereind<span class="alleen-scherm"></span>'
        b_6 = ?*(m)', tot<span class="alleen-scherm"></span>'
        #hide
        F_6 = 0 kN
        #show
    #end if
    #if vorm_6 ≡ 2
        #if b_6 ≤ a_6
            '<span class="alleen-scherm" style="color:#b45309">Last 6: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #else if vorm_6 ≡ 3
        #if b_6 ≤ a_6
            '<span class="alleen-scherm" style="color:#b45309">Last 6: het eind b ligt niet voorbij het begin a; de last telt niet mee.</span>
        #end if
    #end if
    #if vorm_6 ≡ 4
        #if bool(x_eind > 0)*(bool(a_6/(1 m) < -10^-6) + bool(a_6/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b91c1c">Last 6: de puntlast ligt buiten de ligger (van 0 tot 'r2(x_eind)' m) en telt niet mee.</span>
        #end if
    #else if vorm_6 ≥ 2
        #if bool(x_eind > 0)*(bool(a_6/(1 m) < -10^-6) + bool(b_6/(1 m) > x_eind + 10^-6)) ≥ 1
            '<span style="color:#b45309">Last 6: de last loopt buiten de ligger (van 0 tot 'r2(x_eind)' m); alleen het deel op de ligger telt mee.</span>
        #end if
    #end if
#else
    #hide
    vorm_6 = 1
    cat_6 = 0
    q_6 = 0 kN/m
    q_6,e = 0 kN/m
    F_6 = 0 kN
    a_6 = 0 m
    b_6 = 0 m
    #show
#end if

#hide
'ψ-factoren uit tabel NB.2 — A1.1 van NEN-EN 1990 en de belastingsduurklasse
'(1 blijvend, 2 lang, 3 middellang, 4 kort) per categorie:
'   [categorie | ψ_0 | ψ_1 | ψ_2 | duurklasse]
ψ_tabel = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10 |0.4; 0.5; 0.4; 0.4; 1.0; 0.7; 0.7; 0; 0; 0 |0.5; 0.5; 0.7; 0.7; 0.9; 0.7; 0.5; 0; 0.2; 0.2 |0.3; 0.3; 0.6; 0.6; 0.8; 0.6; 0.3; 0; 0; 0 |3; 3; 3; 3; 2; 3; 3; 4; 4; 4]
'Per last de rij [soort, a, b, q_a, q_b] voor de rekenkern, in m, kN/m en kN;
'soort 1 is een verdeelde last, 2 een puntlast, 0 geen last. Rij 7 is het
'eigen gewicht.
ls_1 = if(soort_1 ≡ 0; 0; if(vorm_1 ≡ 4; 2; 1))
xa_1 = a_1/(1 m)
xb_1 = b_1/(1 m)
qa_1 = if(vorm_1 ≡ 4; F_1/(1 kN); q_1/(1 kN/m))
qb_1 = if(vorm_1 ≡ 4; 0; q_1,e/(1 kN/m))
isG_1 = bool(soort_1 ≡ 1)
isQ_1 = bool(soort_1 ≡ 2)
ψ0_1 = isQ_1*hlookup(ψ_tabel; cat_1; 1; 2)
ψ1_1 = isQ_1*hlookup(ψ_tabel; cat_1; 1; 3)
ψ2_1 = isQ_1*hlookup(ψ_tabel; cat_1; 1; 4)
duur_1 = if(isQ_1 ≡ 1; hlookup(ψ_tabel; cat_1; 1; 5); 1)
ls_2 = if(soort_2 ≡ 0; 0; if(vorm_2 ≡ 4; 2; 1))
xa_2 = a_2/(1 m)
xb_2 = b_2/(1 m)
qa_2 = if(vorm_2 ≡ 4; F_2/(1 kN); q_2/(1 kN/m))
qb_2 = if(vorm_2 ≡ 4; 0; q_2,e/(1 kN/m))
isG_2 = bool(soort_2 ≡ 1)
isQ_2 = bool(soort_2 ≡ 2)
ψ0_2 = isQ_2*hlookup(ψ_tabel; cat_2; 1; 2)
ψ1_2 = isQ_2*hlookup(ψ_tabel; cat_2; 1; 3)
ψ2_2 = isQ_2*hlookup(ψ_tabel; cat_2; 1; 4)
duur_2 = if(isQ_2 ≡ 1; hlookup(ψ_tabel; cat_2; 1; 5); 1)
ls_3 = if(soort_3 ≡ 0; 0; if(vorm_3 ≡ 4; 2; 1))
xa_3 = a_3/(1 m)
xb_3 = b_3/(1 m)
qa_3 = if(vorm_3 ≡ 4; F_3/(1 kN); q_3/(1 kN/m))
qb_3 = if(vorm_3 ≡ 4; 0; q_3,e/(1 kN/m))
isG_3 = bool(soort_3 ≡ 1)
isQ_3 = bool(soort_3 ≡ 2)
ψ0_3 = isQ_3*hlookup(ψ_tabel; cat_3; 1; 2)
ψ1_3 = isQ_3*hlookup(ψ_tabel; cat_3; 1; 3)
ψ2_3 = isQ_3*hlookup(ψ_tabel; cat_3; 1; 4)
duur_3 = if(isQ_3 ≡ 1; hlookup(ψ_tabel; cat_3; 1; 5); 1)
ls_4 = if(soort_4 ≡ 0; 0; if(vorm_4 ≡ 4; 2; 1))
xa_4 = a_4/(1 m)
xb_4 = b_4/(1 m)
qa_4 = if(vorm_4 ≡ 4; F_4/(1 kN); q_4/(1 kN/m))
qb_4 = if(vorm_4 ≡ 4; 0; q_4,e/(1 kN/m))
isG_4 = bool(soort_4 ≡ 1)
isQ_4 = bool(soort_4 ≡ 2)
ψ0_4 = isQ_4*hlookup(ψ_tabel; cat_4; 1; 2)
ψ1_4 = isQ_4*hlookup(ψ_tabel; cat_4; 1; 3)
ψ2_4 = isQ_4*hlookup(ψ_tabel; cat_4; 1; 4)
duur_4 = if(isQ_4 ≡ 1; hlookup(ψ_tabel; cat_4; 1; 5); 1)
ls_5 = if(soort_5 ≡ 0; 0; if(vorm_5 ≡ 4; 2; 1))
xa_5 = a_5/(1 m)
xb_5 = b_5/(1 m)
qa_5 = if(vorm_5 ≡ 4; F_5/(1 kN); q_5/(1 kN/m))
qb_5 = if(vorm_5 ≡ 4; 0; q_5,e/(1 kN/m))
isG_5 = bool(soort_5 ≡ 1)
isQ_5 = bool(soort_5 ≡ 2)
ψ0_5 = isQ_5*hlookup(ψ_tabel; cat_5; 1; 2)
ψ1_5 = isQ_5*hlookup(ψ_tabel; cat_5; 1; 3)
ψ2_5 = isQ_5*hlookup(ψ_tabel; cat_5; 1; 4)
duur_5 = if(isQ_5 ≡ 1; hlookup(ψ_tabel; cat_5; 1; 5); 1)
ls_6 = if(soort_6 ≡ 0; 0; if(vorm_6 ≡ 4; 2; 1))
xa_6 = a_6/(1 m)
xb_6 = b_6/(1 m)
qa_6 = if(vorm_6 ≡ 4; F_6/(1 kN); q_6/(1 kN/m))
qb_6 = if(vorm_6 ≡ 4; 0; q_6,e/(1 kN/m))
isG_6 = bool(soort_6 ≡ 1)
isQ_6 = bool(soort_6 ≡ 2)
ψ0_6 = isQ_6*hlookup(ψ_tabel; cat_6; 1; 2)
ψ1_6 = isQ_6*hlookup(ψ_tabel; cat_6; 1; 3)
ψ2_6 = isQ_6*hlookup(ψ_tabel; cat_6; 1; 4)
duur_6 = if(isQ_6 ≡ 1; hlookup(ψ_tabel; cat_6; 1; 5); 1)
last = [ls_1; ls_2; ls_3; ls_4; ls_5; ls_6; eg |xa_1; xa_2; xa_3; xa_4; xa_5; xa_6; 0 |xb_1; xb_2; xb_3; xb_4; xb_5; xb_6; x_eind |qa_1; qa_2; qa_3; qa_4; qa_5; qa_6; g_n |qb_1; qb_2; qb_3; qb_4; qb_5; qb_6; g_n]
'Per lastrij: permanent, veranderlijk, groep (het nummer van de veranderlijke
'last), ψ-factoren en belastingsduur.
vG = [isG_1; isG_2; isG_3; isG_4; isG_5; isG_6; eg]
vQ = [isQ_1; isQ_2; isQ_3; isQ_4; isQ_5; isQ_6; 0]
vAct = [bool(ls_1 ≥ 1); bool(ls_2 ≥ 1); bool(ls_3 ≥ 1); bool(ls_4 ≥ 1); bool(ls_5 ≥ 1); bool(ls_6 ≥ 1); eg]
vLs = [ls_1; ls_2; ls_3; ls_4; ls_5; ls_6; eg]
vVorm = [vorm_1; vorm_2; vorm_3; vorm_4; vorm_5; vorm_6; 1]
vCat = [cat_1; cat_2; cat_3; cat_4; cat_5; cat_6; 0]
vGr = [isQ_1*1; isQ_2*2; isQ_3*3; isQ_4*4; isQ_5*5; isQ_6*6; 0]
vGrE = [isQ_1*1 - isG_1; isQ_2*2 - isG_2; isQ_3*3 - isG_3; isQ_4*4 - isG_4; isQ_5*5 - isG_5; isQ_6*6 - isG_6; -eg]
vXa = [xa_1; xa_2; xa_3; xa_4; xa_5; xa_6; 0]
vXb = [xb_1; xb_2; xb_3; xb_4; xb_5; xb_6; x_eind]
vQa = [qa_1; qa_2; qa_3; qa_4; qa_5; qa_6; g_n]
vQb = [qb_1; qb_2; qb_3; qb_4; qb_5; qb_6; g_n]
vψ0 = [ψ0_1; ψ0_2; ψ0_3; ψ0_4; ψ0_5; ψ0_6; 0]
vψ1 = [ψ1_1; ψ1_2; ψ1_3; ψ1_4; ψ1_5; ψ1_6; 0]
vψ2 = [ψ2_1; ψ2_2; ψ2_3; ψ2_4; ψ2_5; ψ2_6; 0]
vD = [duur_1; duur_2; duur_3; duur_4; duur_5; duur_6; 1]
vEen = [1; 1; 1; 1; 1; 1; 1]
n_Q = isQ_1 + isQ_2 + isQ_3 + isQ_4 + isQ_5 + isQ_6
catnaam(c) = if(c ≡ 1; "A"; if(c ≡ 2; "B"; if(c ≡ 3; "C"; if(c ≡ 4; "D"; if(c ≡ 5; "E"; if(c ≡ 6; "F"; if(c ≡ 7; "G"; if(c ≡ 8; "H"; if(c ≡ 9; "sneeuw"; if(c ≡ 10; "wind"; "–"))))))))))
vormnaam(v) = if(v ≡ 1; "gelijkmatig"; if(v ≡ 2; "gelijkmatig, deel"; if(v ≡ 3; "trapezium"; "puntlast")))
duurnaam(d) = if(d ≡ 1; "blijvend"; if(d ≡ 2; "lang"; if(d ≡ 3; "middellang"; "kort")))
#show

'<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
'<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Last</th><th style="padding:1px 4px; text-align:left;">Categorie</th><th style="padding:1px 4px; text-align:left;">Vorm</th><th style="padding:1px 4px; text-align:right;">Waarde</th><th style="padding:1px 4px; text-align:right;">van (m)</th><th style="padding:1px 4px; text-align:right;">tot (m)</th><th style="padding:1px 4px; text-align:right;">ψ<sub>0</sub></th><th style="padding:1px 4px; text-align:right;">ψ<sub>1</sub></th><th style="padding:1px 4px; text-align:right;">ψ<sub>2</sub></th></tr>
#for j = 1 : 7
    #if vAct.(j) ≡ 1
        #if j ≡ 7
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">G, eigen gewicht</td><td style="padding:0 4px;">–</td>
        #else
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'if(vQ.(j) ≡ 1; "Q"; "G")''j'</td><td style="padding:0 4px;">'catnaam(vCat.(j))'</td>
        #end if
        '<td style="padding:0 4px;">'vormnaam(vVorm.(j))'</td>
        #if vLs.(j) ≡ 2
            '<td style="padding:0 4px; text-align:right;">'r2(vQa.(j))' kN</td><td style="padding:0 4px; text-align:right;">'r2(vXa.(j))'</td><td style="padding:0 4px; text-align:right;">–</td>
        #else if vVorm.(j) ≡ 3
            '<td style="padding:0 4px; text-align:right;">'r2(vQa.(j))' – 'r2(vQb.(j))' kN/m</td><td style="padding:0 4px; text-align:right;">'r2(vXa.(j))'</td><td style="padding:0 4px; text-align:right;">'r2(vXb.(j))'</td>
        #else
            '<td style="padding:0 4px; text-align:right;">'r2(vQa.(j))' kN/m</td><td style="padding:0 4px; text-align:right;">'r2(vXa.(j))'</td><td style="padding:0 4px; text-align:right;">'r2(vXb.(j))'</td>
        #end if
        '<td style="padding:0 4px; text-align:right;">'vψ0.(j)'</td><td style="padding:0 4px; text-align:right;">'vψ1.(j)'</td><td style="padding:0 4px; text-align:right;">'vψ2.(j)'</td></tr>
    #end if
#loop
'</table>

#if status ≡ 1
    #hide
    RR0 = ligger_R(geo; last; EI_n)
    'Tekening: de ligger over 400 px, elke last een eigen strook van 18 px erboven.
    sx = 400/max(x_eind; 0.001)
    sX(x) = 40 + sx*min(max(x; 0); x_eind)
    n_band = sum(vAct)
    y_lig = 26 + 18*n_band
    sH = y_lig + 58
    band = 0
    #show
    '<svg viewbox="0 0 480 'sH'" xmlns="http://www.w3.org/2000/svg" style="font-size:10px; width:100%; max-height:'sH + 16'px;">
    #for j = 1 : 7
        #if vAct.(j) ≡ 1
            #hide
            band = band + 1
            yb = 12 + 18*band
            kl = if(vQ.(j) ≡ 1; "#B45309"; "#475569")
            qm = max(abs(vQa.(j)); abs(vQb.(j)); 10^-9)
            xA = sX(vXa.(j))
            xB = sX(vXb.(j))
            #show
            #if vLs.(j) ≡ 2
                '<line x1="'xA'" y1="'yb - 12'" x2="'xA'" y2="'y_lig - 8'" style="stroke:'kl'; stroke-width:1.4"/>
                '<polygon points="'xA','y_lig - 2' 'xA - 4','y_lig - 10' 'xA + 4','y_lig - 10'" style="fill:'kl'"/>
                '<text x="'xA + 5'" y="'yb - 3'" style="fill:'kl'; font-weight:700">'if(vQ.(j) ≡ 1; "Q"; "G")''j' = 'r2(vQa.(j))' kN</text>
            #else
                '<polygon points="'xA','yb' 'xA','yb - 11*vQa.(j)/qm' 'xB','yb - 11*vQb.(j)/qm' 'xB','yb'" style="fill:'kl'; fill-opacity:0.25; stroke:'kl'; stroke-width:1"/>
                #if j ≡ 7
                    '<text x="'xA + 3'" y="'yb - 3'" style="fill:'kl'; font-weight:700">eigen gewicht 'r2(vQa.(j))' kN/m</text>
                #else if vVorm.(j) ≡ 3
                    '<text x="'xA + 3'" y="'yb - 3'" style="fill:'kl'; font-weight:700">'if(vQ.(j) ≡ 1; "Q"; "G")''j' = 'r2(vQa.(j))' – 'r2(vQb.(j))' kN/m</text>
                #else
                    '<text x="'xA + 3'" y="'yb - 3'" style="fill:'kl'; font-weight:700">'if(vQ.(j) ≡ 1; "Q"; "G")''j' = 'r2(vQa.(j))' kN/m</text>
                #end if
            #end if
        #end if
    #loop
    '<rect x="40" y="'y_lig - 3'" width="400" height="6" style="fill:#d1d5db; stroke:#374151; stroke-width:1"/>
    #for i = 1 : 4
        #if vSt.(i) ≡ 1
            '<polygon points="'sX(RR0.(i; 1))','y_lig + 3' 'sX(RR0.(i; 1)) - 7','y_lig + 15' 'sX(RR0.(i; 1)) + 7','y_lig + 15'" style="fill:#fbbf24; stroke:#92400e; stroke-width:1"/>
        #else if vSt.(i) ≡ 2
            '<rect x="'sX(RR0.(i; 1)) - 4'" y="'y_lig - 14'" width="8" height="28" style="fill:#9ca3af; stroke:#374151; stroke-width:1"/>
        #end if
    #loop
    #if sh_1 ≡ 3
        '<circle cx="'sX(xh_1)'" cy="'y_lig'" r="4" style="fill:#ffffff; stroke:#374151; stroke-width:1.4"/>
    #end if
    #if sh_2 ≡ 3
        '<circle cx="'sX(xh_2)'" cy="'y_lig'" r="4" style="fill:#ffffff; stroke:#374151; stroke-width:1.4"/>
    #end if
    #hide
    Vd = ligger_velden(geo)
    n_v = n_rows(Vd)
    #show
    #for v = 1 : n_v
        '<line x1="'sX(Vd.(v; 1))'" y1="'y_lig + 34'" x2="'sX(Vd.(v; 2))'" y2="'y_lig + 34'" style="stroke:#1E40AF; stroke-width:1"/>
        '<circle cx="'sX(Vd.(v; 1))'" cy="'y_lig + 34'" r="2.2" style="fill:#1E40AF"/>
        '<circle cx="'sX(Vd.(v; 2))'" cy="'y_lig + 34'" r="2.2" style="fill:#1E40AF"/>
        '<text x="'(sX(Vd.(v; 1)) + sX(Vd.(v; 2)))/2'" y="'y_lig + 30'" text-anchor="middle" style="fill:#1E40AF; font-weight:700">'r2(Vd.(v; 2) - Vd.(v; 1))' m</text>
    #loop
    '</svg>'
    '<span class="alleen-scherm"><span style="display:inline-block; width:14px; border-top:3px solid #475569; vertical-align:middle"></span>&nbsp;permanent &nbsp;&nbsp; <span style="display:inline-block; width:14px; border-top:3px solid #B45309; vertical-align:middle"></span>&nbsp;veranderlijk &nbsp;&nbsp; driehoek: steunpunt, blok: inklemming, rondje: scharnier</span>

    # 4. Belastinggevallen

    '<i>BG1 is de permanente last, met het eigen gewicht; elke veranderlijke last is een eigen belastinggeval. In de combinaties (§5) staat een veranderlijke last per deel apart: alleen op de delen waar hij ongunstig werkt (schaakbordbelasting). De delen zijn de stukken tussen de steunpunten en de scharnieren; een overstek is een eigen deel.</i><span class="alleen-scherm"></span>
    #hide
    Dl = ligger_delen(geo)
    n_del = n_rows(Dl)
    ej(j) = [bool(j ≡ 1); bool(j ≡ 2); bool(j ≡ 3); bool(j ≡ 4); bool(j ≡ 5); bool(j ≡ 6); 0]
    Rbg1 = ligger(geo; last; EI_n; vG)
    #show
    'Karakteristiek, per belastinggeval over de hele ligger; 'n_del' delen voor de schaakbordbelasting.
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Geval</th><th style="padding:1px 4px; text-align:right;">M<sub>max</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">M<sub>min</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">|V|<sub>max</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">w<sub>max</sub> [mm]</th><th style="padding:1px 4px; text-align:right;">w<sub>min</sub> [mm]</th></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">BG1 — permanent</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(Rbg1; 3)[1])'</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(Rbg1; 3)[3])'</td><td style="padding:0 4px; text-align:right;">'r2(max(ligger_ext(Rbg1; 2)[1]; -ligger_ext(Rbg1; 2)[3]))'</td><td style="padding:0 4px; text-align:right;">'r2(1000*ligger_ext(Rbg1; 4)[1])'</td><td style="padding:0 4px; text-align:right;">'r2(1000*ligger_ext(Rbg1; 4)[3])'</td></tr>
    #hide
    k_bg = 1
    #show
    #for j = 1 : 6
        #if vQ.(j) ≡ 1
            #hide
            k_bg = k_bg + 1
            Rbg = ligger(geo; last; EI_n; ej(j))
            #show
            '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">BG'k_bg' — Q'j' ('catnaam(vCat.(j))')</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(Rbg; 3)[1])'</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(Rbg; 3)[3])'</td><td style="padding:0 4px; text-align:right;">'r2(max(ligger_ext(Rbg; 2)[1]; -ligger_ext(Rbg; 2)[3]))'</td><td style="padding:0 4px; text-align:right;">'r2(1000*ligger_ext(Rbg; 4)[1])'</td><td style="padding:0 4px; text-align:right;">'r2(1000*ligger_ext(Rbg; 4)[3])'</td></tr>
        #end if
    #loop
    '</table>

    # 5. Combinaties en omhullende

    'Gevolgklasse CC'CC', factoren uit NEN-EN 1990 tabel 'if(CC ≡ 2; "NB.4"; "NB.5")'<span class="alleen-scherm"> — A1.2(B), met 6.10a en 6.10b; de permanente last ongunstig met γ<sub>G</sub> of gunstig met γ<sub>G,inf</sub>, op het totaal van de permanente lasten</span>.
    #hide
    γ_G = if(CC ≡ 1; 1.1; if(CC ≡ 3; 1.3; 1.2))
    γ_Q = if(CC ≡ 1; 1.35; if(CC ≡ 3; 1.65; 1.5))
    γ_G,a = if(CC ≡ 1; 1.2; if(CC ≡ 3; 1.5; 1.35))
    γ_G,inf = 0.9
    'Evenwicht (tabel NB.3 — A1.2(A)): 1,1 en 0,9 op de permanente last per deel,
    '1,5 op de veranderlijke last (bij CC3 de hogere γ_Q).
    γ_Q,equ = max(1.5; γ_Q)
    #show
    γ_G,a', 6.10a<span class="kolom-4"></span>'
    γ_G', 6.10b<span class="kolom-4"></span>'
    γ_G,inf', gunstig<span class="kolom-4"></span>'
    γ_Q'<span class="kolom-4"></span>'
    #hide
    'Niveaus van belastingsduur d (hout): op niveau d tellen de lasten die minstens
    'zo lang duren (duurklasse ≤ d), met k_mod van klasse d. Niveau 1 is alleen de
    'permanente last. Bij staal één niveau (4) met alle lasten.
    Qd(d) = isQ_1*bool(duur_1 ≡ d) + isQ_2*bool(duur_2 ≡ d) + isQ_3*bool(duur_3 ≡ d) + isQ_4*bool(duur_4 ≡ d) + isQ_5*bool(duur_5 ≡ d) + isQ_6*bool(duur_6 ≡ d)
    lvl(d) = if(hout ≡ 1; min(1; bool(d ≡ 1) + bool(Qd(d) > 0)); bool(d ≡ 4))
    aan(i; d) = bool(vD.(i) ≤ d)
    nQd(d) = vQ.(1)*aan(1; d) + vQ.(2)*aan(2; d) + vQ.(3)*aan(3; d) + vQ.(4)*aan(4; d) + vQ.(5)*aan(5; d) + vQ.(6)*aan(6; d)
    'Factoren per lastrij: f1 voor een ongunstige permanente last en voor de
    'overheersende veranderlijke last, f2 voor een gunstige permanente last en
    'voor de gelijktijdige veranderlijke lasten.
    fb1(i; d) = vG.(i)*γ_G + vQ.(i)*γ_Q*aan(i; d)
    fb2(i; d) = vG.(i)*γ_G,inf + vQ.(i)*γ_Q*vψ0.(i)*aan(i; d)
    fa1(i; d) = vG.(i)*γ_G,a + vQ.(i)*γ_Q*vψ0.(i)*aan(i; d)
    fe1(i) = vG.(i)*1.1 + vQ.(i)*γ_Q,equ
    fe2(i) = vG.(i)*0.9 + vQ.(i)*γ_Q,equ*vψ0.(i)
    fw(i; cG; vL) = vG.(i)*cG + vQ.(i)*vL.(i)
    Fb1(d) = [fb1(1; d); fb1(2; d); fb1(3; d); fb1(4; d); fb1(5; d); fb1(6; d); fb1(7; d)]
    Fb2(d) = [fb2(1; d); fb2(2; d); fb2(3; d); fb2(4; d); fb2(5; d); fb2(6; d); fb2(7; d)]
    Fa1(d) = [fa1(1; d); fa1(2; d); fa1(3; d); fa1(4; d); fa1(5; d); fa1(6; d); fa1(7; d)]
    FE1 = [fe1(1); fe1(2); fe1(3); fe1(4); fe1(5); fe1(6); fe1(7)]
    FE2 = [fe2(1); fe2(2); fe2(3); fe2(4); fe2(5); fe2(6); fe2(7)]
    FW(cG; vL) = [fw(1; cG; vL); fw(2; cG; vL); fw(3; cG; vL); fw(4; cG; vL); fw(5; cG; vL); fw(6; cG; vL); fw(7; cG; vL)]
    Oa(d; t) = ligger_omh(geo; last; EI_n; vGr; Fa1(d); Fb2(d); t; 0)
    Ob(d; t; ld) = ligger_omh(geo; last; EI_n; vGr; Fb1(d); Fb2(d); t; ld)
    Ra(d; t) = ligger_omhR(geo; last; EI_n; vGr; Fa1(d); Fb2(d); t; 0)
    Rb(d; t; ld) = ligger_omhR(geo; last; EI_n; vGr; Fb1(d); Fb2(d); t; ld)
    'Omhullende van 6.10a en 6.10b samen, per niveau.
    Pmx(d) = ligger_max(Oa(d; 1); Ob(d; 1; 0))
    Pmn(d) = ligger_min(Oa(d; -1); Ob(d; -1; 0))
    Rmx(d) = ligger_max(Ra(d; 1); Rb(d; 1; 0))
    Rmn(d) = ligger_min(Ra(d; -1); Rb(d; -1; 0))
    Mabs(d; x0; x1) = max(ligger_ext(Pmx(d); 3; x0; x1)[1]; -ligger_ext(Pmn(d); 3; x0; x1)[3]; 0)
    Mneg(d; x0; x1) = max(-ligger_ext(Pmn(d); 3; x0; x1)[3]; 0)
    Vabs(d) = max(ligger_ext(Pmx(d); 2)[1]; -ligger_ext(Pmn(d); 2)[3]; 0)
    'Het hoogste niveau heeft alle lasten; daarvan de tekening.
    dT = if(hout ≡ 1; max(1; 2*lvl(2); 3*lvl(3); 4*lvl(4)); 4)
    PT = Pmx(dT)
    NT = Pmn(dT)
    #show
    '<i>Per combinatie de omhullende over de ligger: elke veranderlijke last alleen op de delen waar hij ongunstig werkt, de permanente last ongunstig of gunstig op het totaal. Bij 6.10b staat per rij één veranderlijke last overheersend. Bij hout per belastingsduur: op elk niveau de lasten die minstens zo lang duren, met de k<sub>mod</sub> van dat niveau (§3.1.3(2)).</i><span class="alleen-scherm"></span>
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Combinatie</th><th style="padding:1px 4px; text-align:center;">G</th>
    #for j = 1 : 6
        #if vQ.(j) ≡ 1
            '<th style="padding:1px 4px; text-align:center;">Q'j'</th>
        #end if
    #loop
    '<th style="padding:1px 4px; text-align:right;">M<sub>Ed,max</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">M<sub>Ed,min</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">V<sub>Ed</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">R<sub>Ed,max</sub> [kN]</th></tr>
    #for d = 1 : 4
        #if lvl(d) ≡ 1
            #if hout ≡ 1
                '<tr style="border-top:1px solid #9ca3af;"><td style="padding:1px 4px; font-style:italic;" colspan="12">tot en met 'duurnaam(d)': k<sub>mod</sub> = 'k_mod(d)'</td></tr>
            #end if
            #hide
            cP = Oa(d; 1)
            cN = Oa(d; -1)
            cR = Ra(d; 1)
            #show
            '<tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:0 4px;">6.10a</td><td style="padding:0 4px; text-align:center;">'γ_G,a'</td>
            #for i = 1 : 6
                #if vQ.(i) ≡ 1
                    #if aan(i; d) ≡ 1
                        '<td style="padding:0 4px; text-align:center;">'r2(γ_Q*vψ0.(i))'</td>
                    #else
                        '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
                    #end if
                #end if
            #loop
            '<td style="padding:0 4px; text-align:right;">'r2(ligger_ext(cP; 3)[1])'</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(cN; 3)[3])'</td><td style="padding:0 4px; text-align:right;">'r2(max(ligger_ext(cP; 2)[1]; -ligger_ext(cN; 2)[3]))'</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(cR; 2)[1])'</td></tr>
            #if nQd(d) ≡ 0
                #hide
                cP = Ob(d; 1; 0)
                cN = Ob(d; -1; 0)
                cR = Rb(d; 1; 0)
                #show
                '<tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:0 4px;">6.10b</td><td style="padding:0 4px; text-align:center;">'γ_G'</td>
                #for i = 1 : 6
                    #if vQ.(i) ≡ 1
                        '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
                    #end if
                #loop
                '<td style="padding:0 4px; text-align:right;">'r2(ligger_ext(cP; 3)[1])'</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(cN; 3)[3])'</td><td style="padding:0 4px; text-align:right;">'r2(max(ligger_ext(cP; 2)[1]; -ligger_ext(cN; 2)[3]))'</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(cR; 2)[1])'</td></tr>
            #else
                #for j = 1 : 6
                    #if vQ.(j)*aan(j; d) ≡ 1
                        #hide
                        cP = Ob(d; 1; j)
                        cN = Ob(d; -1; j)
                        cR = Rb(d; 1; j)
                        #show
                        '<tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:0 4px;">6.10b, Q'j' overheersend</td><td style="padding:0 4px; text-align:center;">'γ_G'</td>
                        #for i = 1 : 6
                            #if vQ.(i) ≡ 1
                                #if aan(i; d) ≡ 0
                                    '<td style="padding:0 4px; text-align:center; color:#9ca3af;">–</td>
                                #else if i ≡ j
                                    '<td style="padding:0 4px; text-align:center;">'γ_Q'</td>
                                #else
                                    '<td style="padding:0 4px; text-align:center;">'r2(γ_Q*vψ0.(i))'</td>
                                #end if
                            #end if
                        #loop
                        '<td style="padding:0 4px; text-align:right;">'r2(ligger_ext(cP; 3)[1])'</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(cN; 3)[3])'</td><td style="padding:0 4px; text-align:right;">'r2(max(ligger_ext(cP; 2)[1]; -ligger_ext(cN; 2)[3]))'</td><td style="padding:0 4px; text-align:right;">'r2(ligger_ext(cR; 2)[1])'</td></tr>
                    #end if
                #loop
            #end if
        #end if
    #loop
    '</table>
    'G gunstig: γ<sub>G,inf</sub> = 0,9. Een veranderlijke last staat per deel alleen waar hij ongunstig werkt.<span class="alleen-scherm"></span>

    '<h6>Omhullende UGT<span class="alleen-scherm"></span></h6>
    #hide
    eMT1 = ligger_ext(PT; 3)
    eMT2 = ligger_ext(NT; 3)
    eVT1 = ligger_ext(PT; 2)
    eVT2 = ligger_ext(NT; 2)
    'Eindstand w_max (§7) voor de lijn van de doorbuiging.
    vFin1 = vEen + k_def*vψ2
    vFin2 = vψ0 + k_def*vψ2
    WT1 = ligger_omh(geo; last; EI_n; vGr; FW(1 + k_def; vFin1); FW(1 + k_def; vFin2); 1; 0)
    WT2 = ligger_omh(geo; last; EI_n; vGr; FW(1 + k_def; vFin1); FW(1 + k_def; vFin2); -1; 0)
    eWT1 = ligger_ext(WT1; 4)
    eWT2 = ligger_ext(WT2; 4)
    M_p = max(eMT1.1; 0)
    M_m = max(-eMT2.3; 0)
    V_p = max(eVT1.1; 0)
    V_m = max(-eVT2.3; 0)
    w_p = max(1000*eWT1.1; 0)
    w_m = max(-1000*eWT2.3; 0)
    ox = 400/max(x_eind; 0.001)
    oE = 40 + ox*x_eind
    m_s = 44/max(M_p + M_m; 10^-9)
    my = 20 + M_m*m_s
    v_s = 40/max(V_p + V_m; 10^-9)
    vy = my + M_p*m_s + 30 + V_p*v_s
    w_s = 30/max(w_p + w_m; 10^-9)
    wy = vy + V_m*v_s + 30 + w_m*w_s
    oH = wy + w_p*w_s + 18
    #show
    '<svg class="omhullende" viewbox="0 0 480 'oH'" xmlns="http://www.w3.org/2000/svg" style="font-size:11px; width:100%; max-height:'oH + 10'px;">
    '  <polygon points="40,'my' 'ligger_svg(PT; 3; 40; ox; my; m_s)' 'oE','my'" style="fill:rgba(239,68,68,0.20); stroke:#dc2626; stroke-width:1.6; stroke-linejoin:round"/>
    '  <polygon points="40,'my' 'ligger_svg(NT; 3; 40; ox; my; m_s)' 'oE','my'" style="fill:rgba(239,68,68,0.10); stroke:#dc2626; stroke-width:1.1; stroke-dasharray:5 3; stroke-linejoin:round"/>
    '  <line x1="34" y1="'my'" x2="'oE + 6'" y2="'my'" style="stroke:#374151; stroke-width:1"/>
    '  <text x="4" y="'my + 4'" style="fill:#dc2626; font-weight:700">M</text>
    #if M_p > 10^-6
        '  <text x="'40 + ox*eMT1.2'" y="'my + M_p*m_s + 12'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'r2(M_p)'</text>
    #end if
    #if M_m > 10^-6
        '  <text x="'40 + ox*eMT2.4'" y="'my - M_m*m_s - 4'" text-anchor="middle" style="fill:#dc2626; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'r2(-M_m)'</text>
    #end if
    '  <polygon points="40,'vy' 'ligger_svg(PT; 2; 40; ox; vy; -v_s)' 'oE','vy'" style="fill:rgba(59,130,246,0.18); stroke:#2563eb; stroke-width:1.6; stroke-linejoin:round"/>
    '  <polygon points="40,'vy' 'ligger_svg(NT; 2; 40; ox; vy; -v_s)' 'oE','vy'" style="fill:rgba(59,130,246,0.08); stroke:#2563eb; stroke-width:1.1; stroke-dasharray:5 3; stroke-linejoin:round"/>
    '  <line x1="34" y1="'vy'" x2="'oE + 6'" y2="'vy'" style="stroke:#374151; stroke-width:1"/>
    '  <text x="4" y="'vy + 4'" style="fill:#2563eb; font-weight:700">V</text>
    #if V_p > 10^-6
        '  <text x="'40 + ox*eVT1.2'" y="'vy - V_p*v_s - 4'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'r2(V_p)'</text>
    #end if
    #if V_m > 10^-6
        '  <text x="'40 + ox*eVT2.4'" y="'vy + V_m*v_s + 12'" text-anchor="middle" style="fill:#2563eb; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'r2(-V_m)'</text>
    #end if
    '  <polyline points="'ligger_svg(WT1; 4; 40; ox; wy; 1000*w_s)'" style="fill:none; stroke:#7c3aed; stroke-width:1.8; stroke-linejoin:round"/>
    '  <polyline points="'ligger_svg(WT2; 4; 40; ox; wy; 1000*w_s)'" style="fill:none; stroke:#7c3aed; stroke-width:1.1; stroke-dasharray:5 3; stroke-linejoin:round"/>
    '  <line x1="34" y1="'wy'" x2="'oE + 6'" y2="'wy'" style="stroke:#9ca3af; stroke-width:1; stroke-dasharray:4 3"/>
    '  <text x="4" y="'wy + 4'" style="fill:#7c3aed; font-weight:700">w</text>
    #if w_p > 10^-6
        '  <text x="'40 + ox*eWT1.2'" y="'wy + w_p*w_s + 13'" text-anchor="middle" style="fill:#7c3aed; font-weight:700; stroke:#ffffff; stroke-width:3; paint-order:stroke">'r2(w_p)'</text>
    #end if
    #for i = 1 : n_s
        '  <polygon points="'40 + ox*RR0.(i; 1)','my' '40 + ox*RR0.(i; 1) - 5','my + 9' '40 + ox*RR0.(i; 1) + 5','my + 9'" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/>
        '  <polygon points="'40 + ox*RR0.(i; 1)','wy' '40 + ox*RR0.(i; 1) - 5','wy + 9' '40 + ox*RR0.(i; 1) + 5','wy + 9'" style="fill:#fbbf24; stroke:#92400e; stroke-width:0.8"/>
    #loop
    '</svg>'
    #hide
    M_Ed,max = M_p*kN*m
    M_Ed,min = -M_m*kN*m
    V_Ed,max = max(V_p; V_m)*kN
    w_max,lijn = w_p*mm
    #show
    M_Ed,max'<span class="alleen-scherm">, grootste veldmoment</span><span class="kolom-4"></span>'
    M_Ed,min'<span class="alleen-scherm">, grootste steunmoment</span><span class="kolom-4"></span>'
    V_Ed,max'<span class="kolom-4"></span>'
    w_max,lijn'<span class="alleen-scherm">, eindstand (§7)</span><span class="kolom-4"></span>'
    'M aan de trekzijde [kNm], V [kN], w naar beneden [mm]; doorgetrokken de grootste, onderbroken de kleinste waarde. 'if(hout ≡ 1; "Hout: M en V van het niveau met alle lasten."; "")'<span class="alleen-scherm"></span>

    '<h6>Oplegreacties<span class="alleen-scherm"></span></h6>
    #hide
    RGk = ligger_R(geo; last; EI_n; vG)
    RQk = ligger_omhR(geo; last; EI_n; vGr; vQ; vQ; 1; 0)
    RUmx = Rmx(dT)
    RUmn = Rmn(dT)
    REq = ligger_omhR(geo; last; EI_n; vGrE; FE1; FE2; -1; 0)
    R_min = 10^9
    #show
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Steunpunt</th><th style="padding:1px 4px; text-align:right;">x [m]</th><th style="padding:1px 4px; text-align:right;">R<sub>G,k</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">R<sub>Q,k,max</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">R<sub>Ed,max</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">R<sub>Ed,min</sub> [kN]</th><th style="padding:1px 4px; text-align:right;">M ter plaatse [kNm]</th></tr>
    #for i = 1 : n_s
        #hide
        Rmin_i = min(RUmn.(i; 2); REq.(i; 2))
        R_min = min(R_min; Rmin_i)
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'i''if(vSt.(i) ≡ 2; ", inklemming"; "")'</td><td style="padding:0 4px; text-align:right;">'r2(RR0.(i; 1))'</td><td style="padding:0 4px; text-align:right;">'r2(RGk.(i; 2))'</td><td style="padding:0 4px; text-align:right;">'r2(RQk.(i; 2))'</td><td style="padding:0 4px; text-align:right;">'r2(RUmx.(i; 2))'</td><td style="padding:0 4px; text-align:right; color:'if(Rmin_i < 0; "#b91c1c"; "inherit")';">'r2(Rmin_i)'</td><td style="padding:0 4px; text-align:right;">'r2(RUmn.(i; 3))'</td></tr>
    #loop
    '</table>
    'R<sub>Ed,min</sub>: de kleinste over de UGT-combinaties en de evenwichtscombinatie (tabel NB.3 — A1.2(A): 1,1·G ongunstig en 0,9·G gunstig per deel, γ<sub>Q</sub>·Q waar ongunstig); M ter plaatse: het kleinste moment (UGT), bij een inklemming het inklemmingsmoment.<span class="alleen-scherm"></span>
    #hide
    R_Ed,min = R_min*kN
    #show
    R_Ed,min', kleinste oplegreactie, UGT en evenwicht<span class="kolom-2"></span>'
    #if R_min < 0
        '<span style="color:#b91c1c"><b>Trek in een oplegging</b>: verankeren voor ten minste 'r2(-R_min)' kN.</span>
    #end if

    # 6. Toetsing UGT

    #if hout ≡ 1
        '<i>NEN-EN 1995-1-1 met NB. Per niveau van belastingsduur (zie §5) de omhullende van 6.10a en 6.10b met de k<sub>mod</sub> van dat niveau; hieronder het maatgevende niveau per toets.</i><span class="alleen-scherm"></span>
        #hide
        fm(d) = k_mod(d)*k_h*fmk_n/γ_M
        fv(d) = k_mod(d)*fvk_n/γ_M
        fc90(d) = k_mod(d)*fc90k_n/γ_M
        u_b = 0
        d_b = 1
        u_v = 0
        d_v = 1
        #for d = 1 : 4
            u_t = lvl(d)*Mabs(d; 0; x_eind)/(W_n*fm(d))
            d_b = if(u_t > u_b; d; d_b)
            u_b = max(u_b; u_t)
            u_t = lvl(d)*1.5*Vabs(d)/(A_n*fv(d))
            d_v = if(u_t > u_v; d; d_v)
            u_v = max(u_v; u_t)
        #loop
        #show
        '<h6>6.1 Buiging — §6.1.6 (6.11)</h6>
        'Maatgevend: tot en met belastingsduur 'duurnaam(d_b)'.
        #hide
        M_y,Ed = Mabs(d_b; 0; x_eind)*kN*m
        k_mod,b = k_mod(d_b)
        #show
        M_y,Ed'<span class="kolom-3"></span>'
        k_mod,b'<span class="kolom-3"></span>'
        f_m,d = k_mod,b*k_h*f_m,k/γ_M'<span class="alleen-scherm"></span>'
        f_m,d'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        σ_m,y,d = M_y,Ed/W_y to N/mm^2'<span class="alleen-scherm"></span>'
        UC_buiging = σ_m,y,d/f_m,d
        #if UC_buiging ≤ 1
            '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if

        '<h6>6.2 Afschuiving — §6.1.7 (6.13), k<sub>cr</sub> = 1,0 (NB)</h6>
        'Maatgevend: tot en met belastingsduur 'duurnaam(d_v)'.
        #hide
        V_z,Ed = Vabs(d_v)*kN
        k_mod,v = k_mod(d_v)
        #show
        V_z,Ed'<span class="kolom-3"></span>'
        k_mod,v'<span class="kolom-3"></span>'
        f_v,d = k_mod,v*f_v,k/γ_M'<span class="alleen-scherm"></span>'
        f_v,d'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        τ_d = 1.5*V_z,Ed/(1.0*b*h) to N/mm^2'<span class="alleen-scherm"></span>'
        UC_afsch = τ_d/f_v,d
        #if UC_afsch ≤ 1
            '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if

        '<h6>6.3 Oplegdruk — §6.1.5 (6.3)</h6>
        '<i>Per steunpunt de grootste oplegreactie (6.10a en 6.10b) op het contactvlak b·l<sub>ef</sub>, met l<sub>ef</sub> de opleglengte plus 30 mm aan elke kant waar de ligger doorloopt (6.1.5(1)). k<sub>c,90</sub> volgens 6.1.5(4) bij losse steunpunten met l<sub>1</sub> ≥ 2h. Een inklemming is een verbinding en valt buiten deze toets.</i><span class="alleen-scherm"></span>
        #hide
        k_c90 = if(span_min ≥ 2*h_n; if(gelijmd ≡ 1; if(a_n ≤ 0.4; 1.75; 1); 1.5); 1)
        zijden(i) = 2 - bool(i ≡ 1)*bool(r_al ≡ 0) - bool(i ≡ n_s)*bool(r_ar ≡ 0)
        lef(i) = max(a_n + min(0.03; a_n)*zijden(i); 10^-6)
        u_c = 0
        d_c = 1
        i_c = 1
        #for i = 1 : n_s
            #for d = 1 : 4
                u_t = lvl(d)*bool(vSt.(i) ≡ 1)*Rmx(d)[i; 2]/(b_n*lef(i)*k_c90*fc90(d))
                d_c = if(u_t > u_c; d; d_c)
                i_c = if(u_t > u_c; i; i_c)
                u_c = max(u_c; u_t)
            #loop
        #loop
        #show
        #hide
        k_c,90 = k_c90
        #show
        k_c,90', 6.1.5(4)<span class="kolom-3"></span>'
        #if u_c > 0
            'Maatgevend: steunpunt 'i_c', tot en met belastingsduur 'duurnaam(d_c)'.
            #hide
            R_Ed = Rmx(d_c)[i_c; 2]*kN
            l_ef = lef(i_c)*m to mm
            #show
            R_Ed'<span class="kolom-3"></span>'
            l_ef'<span class="alleen-scherm">, opleglengte plus 30 mm per doorlopende kant</span><span class="kolom-3"></span>'
            σ_c,90,d = R_Ed/(b*l_ef) to N/mm^2'<span class="alleen-scherm"></span>'
            σ_c,90,d'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            #hide
            k_mod,c = k_mod(d_c)
            #show
            f_c,90,d = k_mod,c*f_c,90,k/γ_M'<span class="alleen-scherm"></span>'
            f_c,90,d'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
            UC_c90 = σ_c,90,d/(k_c,90*f_c,90,d)
            #if UC_c90 ≤ 1
                '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
            #else
                '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
            #end if
        #else
            'Geen oplegging om te toetsen (alleen inklemmingen).
            #hide
            UC_c90 = 0
            #show
        #end if
        #hide
        UC_MV = 0
        #show
    #else
        '<i>NEN-EN 1993-1-1 met NB, γ<sub>M0</sub> = γ<sub>M1</sub> = 1,0. De omhullende van 6.10a en 6.10b uit §5.</i><span class="alleen-scherm"></span>
        '<h6>6.1 Buiging — §6.2.5</h6>
        #hide
        M_y,Ed = Mabs(4; 0; x_eind)*kN*m
        #show
        M_y,Ed'<span class="kolom-2"></span>'
        M_c,Rd = W_y*f_y/γ_M0 to kN*m', (6.13) en (6.14)<span class="kolom-2"></span>'
        UC_buiging = M_y,Ed/M_c,Rd
        #if UC_buiging ≤ 1
            '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if

        '<h6>6.2 Dwarskracht — §6.2.6</h6>
        h_w = h - 2*t_f'<span class="alleen-scherm"></span>'
        A_v = max(A_v,z; 1.0*h_w*t_w) to mm^2', 6.2.6(3)a, ten minste η·h<sub>w</sub>·t<sub>w</sub> met η = 1,0<span class="alleen-scherm"></span>'
        V_pl,Rd = A_v*(f_y/sqrt(3))/γ_M0 to kN', (6.18)<span class="alleen-scherm"></span>'
        #hide
        V_z,Ed = Vabs(4)*kN
        #show
        A_v'<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        V_z,Ed'<span class="kolom-3"></span>'
        V_pl,Rd', (6.18)<span class="alleen-afdruk"></span><span class="kolom-3"></span>'
        UC_dwars = V_z,Ed/V_pl,Rd
        #if UC_dwars ≤ 1
            '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if
        #if h_w/t_w > 72*ε
            '<span style="color:#b45309">h<sub>w</sub>/t<sub>w</sub> > 72ε: toets de plooi van het lijf volgens NEN-EN 1993-1-5 §5.</span>
        #end if

        '<h6>6.3 Buiging met dwarskracht — §6.2.8</h6>
        #if UC_dwars ≤ 0.5
            'V<sub>Ed</sub> ≤ 0,5·V<sub>pl,Rd</sub> overal: geen vermindering van de buigweerstand (6.2.8(2)).
            #hide
            UC_MV = 0
            #show
        #else
            '<i>Waar V<sub>Ed</sub> > 0,5·V<sub>pl,Rd</sub>: M<sub>y,V,Rd</sub> = (W<sub>y</sub> − ρ·A<sub>w</sub>²/(4t<sub>w</sub>))·f<sub>y</sub>/γ<sub>M0</sub> ≤ M<sub>c,Rd</sub> met ρ = (2V<sub>Ed</sub>/V<sub>pl,Rd</sub> − 1)² (6.30), bij klasse 3 met W<sub>el,y</sub> aan de veilige kant; in elk punt van de omhullende, met M en V aan de veilige kant uit dezelfde omhullende.</i><span class="alleen-scherm"></span>
            #hide
            Vpl_n = V_pl,Rd/(1 kN)
            Mc_n = M_c,Rd/(1 kN*m)
            Aw_n = h_w*t_w/(1 m^2)
            tw_n = t_w/(1 m)
            u_mv = 0
            #for i = 1 : n_rows(PT)
                V_i = max(abs(PT.(i; 2)); abs(NT.(i; 2)))
                M_i = max(abs(PT.(i; 3)); abs(NT.(i; 3)))
                ρ_i = if(V_i > 0.5*Vpl_n; (2*V_i/Vpl_n - 1)^2; 0)
                u_mv = max(u_mv; M_i/max(min(max(W_n - ρ_i*Aw_n^2/(4*tw_n); 0)*fy_n/γ_M0; Mc_n); 10^-9))
            #loop
            UC_MV = u_mv
            #show
            UC_MV', grootste M<sub>Ed</sub>/M<sub>y,V,Rd</sub> langs de ligger'
            #if UC_MV ≤ 1
                '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
            #else
                '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
            #end if
        #end if
        #hide
        UC_afsch = UC_dwars
        UC_c90 = 0
        #show
    #end if

    '<h6>6.4 Kip</h6>
    #hide
    'Segmenten voor kip. Soort 1: een zone met een negatief moment bij een
    'steunpunt (gedrukte rand in het veld gesteund); 2: een veld tussen twee
    'steunpunten; 3: een overstek; 4: een stuk tussen kipsteunen.
    Mq(x) = max(abs(ligger_int(PT; 3; x)); abs(ligger_int(NT; 3; x)))
    Msg(x) = if(ligger_int(PT; 3; x) ≥ -ligger_int(NT; 3; x); ligger_int(PT; 3; x); ligger_int(NT; 3; x))
    βk(x0; x1) = if(abs(Msg(x0)) ≥ abs(Msg(x1)); Msg(x1)/max(abs(Msg(x0)); 10^-9)*sign(Msg(x0)); Msg(x0)/max(abs(Msg(x1)); 10^-9)*sign(Msg(x1)))
    'C_1: bij een rechte momentenlijn (geen last in het segment) tabel NB.NB.1 geval 1 met β = βk; anders uit de
    'momenten op de kwartpunten. De kwartpuntformule geeft bij een rechte lijn een te hoge C_1 (1,82 tegen 1,75 bij β = 0).
    Mrecht(x0; x1) = bool(abs(Msg((x0 + x1)/2) - (Msg(x0) + Msg(x1))/2) + abs(Msg(x0 + (x1 - x0)/4) - (3*Msg(x0) + Msg(x1))/4) + abs(Msg(x1 - (x1 - x0)/4) - (Msg(x0) + 3*Msg(x1))/4) ≤ 0.001*max(abs(Msg(x0)); abs(Msg(x1)); 10^-9))
    C1q(x0; x1) = if(Mrecht(x0; x1) ≡ 1; min(1.75 - 1.05*βk(x0; x1) + 0.3*βk(x0; x1)^2; 2.3); min(2.3; max(1; sqrt(35*Mabs(dT; x0; x1)^2/max(Mabs(dT; x0; x1)^2 + 9*Mq(x0 + (x1 - x0)/4)^2 + 16*Mq((x0 + x1)/2)^2 + 9*Mq(x1 - (x1 - x0)/4)^2; 10^-12)))))
    u_k = 0
    n_k = 0
    #show
    #if hout ≡ 1
        '<i>§6.3.3: σ<sub>m,crit</sub> = 0,78·b²·E<sub>0,05</sub>/(h·l<sub>ef</sub>) (6.32), λ<sub>rel,m</sub> (6.30), k<sub>crit</sub> (6.34); σ<sub>m,d</sub> ≤ k<sub>crit</sub>·f<sub>m,d</sub> per niveau van belastingsduur. l<sub>ef</sub> volgens tabel 6.1: in een veld 1,0·l (constant moment, aan de veilige kant), bij een overstek 0,8·l, plus 2h voor een last op de bovenzijde of min 0,5h op de onderzijde; in een zone met een negatief moment naast een steunpunt de lengte van die zone.</i><span class="alleen-scherm"></span>
        #hide
        λm(lf) = sqrt(fmk_n*h_n*max(lf; 10^-6)/(0.78*b_n^2*E005_n))
        kcrit(lf) = if(λm(lf) ≤ 0.75; 1; if(λm(lf) ≤ 1.4; 1.56 - 0.75*λm(lf); 1/λm(lf)^2))
        Δlef = if(aangrijping ≡ 1; 2*h_n; if(aangrijping ≡ -1; -0.5*h_n; 0))
        ukh(x0; x1; lf; ng) = max(lvl(1)*if(ng ≡ 1; Mneg(1; x0; x1); Mabs(1; x0; x1))/fm(1); lvl(2)*if(ng ≡ 1; Mneg(2; x0; x1); Mabs(2; x0; x1))/fm(2); lvl(3)*if(ng ≡ 1; Mneg(3; x0; x1); Mabs(3; x0; x1))/fm(3); lvl(4)*if(ng ≡ 1; Mneg(4; x0; x1); Mabs(4; x0; x1))/fm(4))/(W_n*kcrit(lf))
        #show
        '<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Segment</th><th style="padding:1px 4px; text-align:right;">van – tot [m]</th><th style="padding:1px 4px; text-align:right;">l<sub>ef</sub> [m]</th><th style="padding:1px 4px; text-align:right;">λ<sub>rel,m</sub></th><th style="padding:1px 4px; text-align:right;">k<sub>crit</sub></th><th style="padding:1px 4px; text-align:right;">M<sub>Ed</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">UC</th></tr>
    #else
        '<i>§6.3.2.3 met bijlage NB.NB: M<sub>cr</sub> = C·√(E·I<sub>z</sub>·G·I<sub>t</sub>) met C = C<sub>1</sub>·π/L<sub>kip</sub>·(√(1 + π²S²(C<sub>2</sub>² + 1)/L<sub>kip</sub>²) + π·C<sub>2</sub>·S/L<sub>kip</sub>), S = √(E·I<sub>w</sub>/(G·I<sub>t</sub>)) en k<sub>red</sub> = 1 (gewalst profiel). Kipkromme 'if(h/b ≤ 2; "b"; "c")' (tabel 6.5), λ̄<sub>LT,0</sub> = 0,4, β = 0,75. C<sub>1</sub> bij een rechte momentenlijn (geen last in het segment) uit tabel NB.NB.1, geval 1: 1,75 − 1,05β + 0,3β² ≤ 2,3, anders uit de momenten op de kwartpunten van het segment (een benadering voor een willekeurige momentenlijn, tussen 1,0 en 2,3); C<sub>2</sub> = −0,45 voor een last op de bovenflens, +0,45 op de onderflens (tabel NB.NB.1). Tussen twee steunpunten L<sub>kip</sub> = L<sub>st</sub>; bij een kipsteun (1,4 − 0,8β)·L<sub>st</sub> tussen 1,0 en 1,4·L<sub>st</sub>; een overstek als 2·L met C<sub>1</sub> = 1. In een zone met een negatief moment naast een steunpunt (gedrukte rand in het veld gesteund): L<sub>kip</sub> is de lengte van die zone, C<sub>1</sub> = 1 en C<sub>2</sub> = 0.</i><span class="alleen-scherm"></span>
        #hide
        S_n = sqrt(E_n*Iw_n/(G_n*It_n))
        Mcr(Lk; C1; C2) = C1*pi/max(Lk; 10^-6)*(sqrt(1 + pi^2*S_n^2*(C2^2 + 1)/max(Lk; 10^-6)^2) + pi*C2*S_n/max(Lk; 10^-6))*sqrt(E_n*Iz_n*G_n*It_n)
        α_LT = if(h/b ≤ 2; 0.34; 0.49)
        Φlt(λ) = 0.5*(1 + α_LT*(λ - 0.4) + 0.75*λ^2)
        χlt(λ) = min(1; 1/max(λ^2; 10^-12); 1/(Φlt(λ) + sqrt(max(Φlt(λ)^2 - 0.75*λ^2; 0))))
        λlt(Lk; C1; C2) = sqrt(W_n*fy_n/Mcr(Lk; C1; C2))
        C2k = -0.45*aangrijping
        #show
        '<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
        '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Segment</th><th style="padding:1px 4px; text-align:right;">van – tot [m]</th><th style="padding:1px 4px; text-align:right;">L<sub>kip</sub> [m]</th><th style="padding:1px 4px; text-align:right;">C<sub>1</sub></th><th style="padding:1px 4px; text-align:right;">C<sub>2</sub></th><th style="padding:1px 4px; text-align:right;">M<sub>cr</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">χ<sub>LT</sub></th><th style="padding:1px 4px; text-align:right;">M<sub>Ed</sub> [kNm]</th><th style="padding:1px 4px; text-align:right;">UC</th></tr>
    #end if
    #if kipsteun ≡ 1
        #for i = 1 : n_s
            #hide
            i_l = max(i - 1; 1)
            i_r = min(i + 1; n_s)
            x_i = RR0.(i; 1)
            x_l = if(i ≡ 1; 0; RR0.(i_l; 1))
            x_r = if(i ≡ n_s; x_eind; RR0.(i_r; 1))
            z_l = ligger_nul(NT; 3; x_i; x_l)
            z_r = ligger_nul(NT; 3; x_i; x_r)
            L_z = max(x_i - z_l; z_r - x_i)
            k0 = min(z_l; x_i)
            k1 = max(z_r; x_i)
            #show
            #if L_z > 10^-6
                #hide
                n_k = n_k + 1
                #show
                #if hout ≡ 1
                    #hide
                    u_t = ukh(k0; k1; L_z; 1)
                    u_k = max(u_k; u_t)
                    #show
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">negatief moment bij steunpunt 'i'</td><td style="padding:0 4px; text-align:right;">'r2(k0)' – 'r2(k1)'</td><td style="padding:0 4px; text-align:right;">'r2(L_z)'</td><td style="padding:0 4px; text-align:right;">'r2(λm(L_z))'</td><td style="padding:0 4px; text-align:right;">'r2(kcrit(L_z))'</td><td style="padding:0 4px; text-align:right;">'r2(Mneg(dT; k0; k1))'</td><td style="padding:0 4px; text-align:right; color:'kleur(u_t)'; font-weight:700;">'r2(u_t)'</td></tr>
                #else
                    #hide
                    u_t = Mneg(4; k0; k1)/(χlt(λlt(L_z; 1; 0))*W_n*fy_n/γ_M1)
                    u_k = max(u_k; u_t)
                    #show
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">negatief moment bij steunpunt 'i'</td><td style="padding:0 4px; text-align:right;">'r2(k0)' – 'r2(k1)'</td><td style="padding:0 4px; text-align:right;">'r2(L_z)'</td><td style="padding:0 4px; text-align:right;">1</td><td style="padding:0 4px; text-align:right;">0</td><td style="padding:0 4px; text-align:right;">'r2(Mcr(L_z; 1; 0))'</td><td style="padding:0 4px; text-align:right;">'r2(χlt(λlt(L_z; 1; 0)))'</td><td style="padding:0 4px; text-align:right;">'r2(Mneg(4; k0; k1))'</td><td style="padding:0 4px; text-align:right; color:'kleur(u_t)'; font-weight:700;">'r2(u_t)'</td></tr>
                #end if
            #end if
        #loop
    #else
        #for v = 1 : n_v
            #hide
            v0 = Vd.(v; 1)
            v1 = Vd.(v; 2)
            ov = Vd.(v; 3)
            n_sg = if(ov ≡ 1; 1; if(kipsteun ≡ 3; if(a_kn > 0; min(40; max(1; ceil((v1 - v0)/max(a_kn; 10^-6) - 10^-9))); 1); 1))
            #show
            #for p = 1 : n_sg
                #hide
                k0 = v0 + (v1 - v0)*(p - 1)/n_sg
                k1 = v0 + (v1 - v0)*p/n_sg
                L_st = k1 - k0
                n_k = n_k + 1
                #show
                #if hout ≡ 1
                    #hide
                    lf_k = max(if(ov ≡ 1; 0.8; 1)*L_st + Δlef; 10^-6)
                    u_t = ukh(k0; k1; lf_k; 0)
                    u_k = max(u_k; u_t)
                    #show
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'if(ov ≡ 1; "overstek"; "veld")' 'v''if(n_sg > 1; ", deel "; "")''if(n_sg > 1; p; "")'</td><td style="padding:0 4px; text-align:right;">'r2(k0)' – 'r2(k1)'</td><td style="padding:0 4px; text-align:right;">'r2(lf_k)'</td><td style="padding:0 4px; text-align:right;">'r2(λm(lf_k))'</td><td style="padding:0 4px; text-align:right;">'r2(kcrit(lf_k))'</td><td style="padding:0 4px; text-align:right;">'r2(Mabs(dT; k0; k1))'</td><td style="padding:0 4px; text-align:right; color:'kleur(u_t)'; font-weight:700;">'r2(u_t)'</td></tr>
                #else
                    #hide
                    Lk_k = if(ov ≡ 1; 2*L_st; if(n_sg > 1; min(max(1.4 - 0.8*βk(k0; k1); 1); 1.4)*L_st; L_st))
                    C1_k = if(ov ≡ 1; 1; C1q(k0; k1))
                    u_t = Mabs(4; k0; k1)/(χlt(λlt(Lk_k; C1_k; C2k))*W_n*fy_n/γ_M1)
                    u_k = max(u_k; u_t)
                    #show
                    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'if(ov ≡ 1; "overstek"; "veld")' 'v''if(n_sg > 1; ", deel "; "")''if(n_sg > 1; p; "")'</td><td style="padding:0 4px; text-align:right;">'r2(k0)' – 'r2(k1)'</td><td style="padding:0 4px; text-align:right;">'r2(Lk_k)'</td><td style="padding:0 4px; text-align:right;">'r2(C1_k)'</td><td style="padding:0 4px; text-align:right;">'r2(C2k)'</td><td style="padding:0 4px; text-align:right;">'r2(Mcr(Lk_k; C1_k; C2k))'</td><td style="padding:0 4px; text-align:right;">'r2(χlt(λlt(Lk_k; C1_k; C2k)))'</td><td style="padding:0 4px; text-align:right;">'r2(Mabs(4; k0; k1))'</td><td style="padding:0 4px; text-align:right; color:'kleur(u_t)'; font-weight:700;">'r2(u_t)'</td></tr>
                #end if
            #loop
        #loop
    #end if
    '</table>
    #if n_k ≡ 0
        'Geen segment met een gedrukte, ongesteunde rand: geen kip.
    #end if
    #hide
    UC_kip = u_k
    #show
    UC_kip', grootste over de segmenten'
    #if UC_kip ≤ 1
        '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
    #else
        '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
    #end if
    #if hout ≡ 0
        #if kipsteun ≥ 2
            #if span_min < 5*h_n
                '<span style="color:#b45309">Een veld is korter dan 5·h: de rekenregels van bijlage NB.NB gelden niet (NB.NB.1(2)); toets de gedrukte rand volgens NB.NB.4.2(3).</span>
            #end if
        #end if
    #end if

    # 7. Toetsing BGT — doorbuiging

    '<i>Volgens de NB bij NEN-EN 1990, A1.4.3: w<sub>bij</sub> = w<sub>2</sub> + w<sub>3</sub> (de kruip plus het veranderlijke deel) bij de frequente combinatie (6.15b) voor vloeren of de karakteristieke (6.14b) voor daken, en de eindstand w<sub>max</sub> = w<sub>inst</sub> (6.14b) + k<sub>def</sub>·w<sub>qp</sub> (6.16b), 'if(hout ≡ 1; "met k<sub>def</sub> uit tabel 3.2 (§2.2.3)"; "bij staal zonder kruip")'. Per veld, met l<sub>rep</sub> de overspanning of tweemaal de lengte van een overstek; de schaakbordbelasting per deel en per punt de ongunstigste overheersende last, zoals in §5. De absolute waarde telt: ook een opbuiging.</i><span class="alleen-scherm"></span>
    @select toepassing "Grens bijkomende doorbuiging w_bij (A1.4.3(3))"
      Overige vloer of intensief gebruikt dak: 0,003·l_rep, frequent = 2
      Vloer met scheurgevoelige scheidingswanden: 0,002·l_rep, frequent = 1
      Overig dak: 0,004·l_rep, karakteristiek = 3
      Niet toetsen = 0
    @end
    @select uiterlijk "Eindstand w_max ≤ 0,004·l_rep (A1.4.3(4))"
      Toetsen = 1
      Niet toetsen = 0
    @end
    #hide
    g_bij = if(toepassing ≡ 1; 0.002; if(toepassing ≡ 3; 0.004; 0.003))
    freq = bool(toepassing ≤ 2)
    'w_bij: permanent k_def; overheersend ψ_1 (frequent) of 1 (karakteristiek), gelijktijdig
    'ψ_2 of ψ_0; beide plus k_def·ψ_2.
    vBij1 = if(freq ≡ 1; vψ1; vEen) + k_def*vψ2
    vBij2 = if(freq ≡ 1; vψ2; vψ0) + k_def*vψ2
    WB1 = ligger_omh(geo; last; EI_n; vGr; FW(k_def; vBij1); FW(k_def; vBij2); 1; 0)
    WB2 = ligger_omh(geo; last; EI_n; vGr; FW(k_def; vBij1); FW(k_def; vBij2); -1; 0)
    Wabs(Wa; Wb; x0; x1) = 1000*max(ligger_ext(Wa; 4; x0; x1)[1]; -ligger_ext(Wb; 4; x0; x1)[3]; 0)
    u_wf = 0
    u_wb = 0
    #show
    '<table style="width:100%; border-collapse:collapse; font-size:0.85em; line-height:1.25;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="padding:1px 4px; text-align:left;">Veld</th><th style="padding:1px 4px; text-align:right;">van – tot [m]</th><th style="padding:1px 4px; text-align:right;">l<sub>rep</sub> [m]</th><th style="padding:1px 4px; text-align:right;">w<sub>max</sub> [mm]</th><th style="padding:1px 4px; text-align:right;">grens [mm]</th><th style="padding:1px 4px; text-align:right;">w<sub>bij</sub> [mm]</th><th style="padding:1px 4px; text-align:right;">grens [mm]</th></tr>
    #for v = 1 : n_v
        #hide
        v0 = Vd.(v; 1)
        v1 = Vd.(v; 2)
        l_rp = (v1 - v0)*(1 + Vd.(v; 3))
        w_f = Wabs(WT1; WT2; v0; v1)
        w_b = Wabs(WB1; WB2; v0; v1)
        g_f = 4*l_rp
        g_b = 1000*g_bij*l_rp
        u_wf = max(u_wf; uiterlijk*w_f/max(g_f; 10^-9))
        u_wb = max(u_wb; bool(toepassing ≥ 1)*w_b/max(g_b; 10^-9))
        #show
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 4px;">'if(Vd.(v; 3) ≡ 1; "overstek"; "veld")' 'v'</td><td style="padding:0 4px; text-align:right;">'r2(v0)' – 'r2(v1)'</td><td style="padding:0 4px; text-align:right;">'r2(l_rp)'</td><td style="padding:0 4px; text-align:right; color:'kleur(uiterlijk*w_f/max(g_f; 10^-9))';">'r2(w_f)'</td><td style="padding:0 4px; text-align:right;">'r2(g_f)'</td><td style="padding:0 4px; text-align:right; color:'kleur(bool(toepassing ≥ 1)*w_b/max(g_b; 10^-9))';">'r2(w_b)'</td><td style="padding:0 4px; text-align:right;">'r2(g_b)'</td></tr>
    #loop
    '</table>
    #if uiterlijk ≡ 1
        #hide
        UC_wmax = u_wf
        #show
        UC_wmax', eindstand, grootste w<sub>max</sub>/(0,004·l<sub>rep</sub>)'
        #if UC_wmax ≤ 1
            '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if
    #else
        #hide
        UC_wmax = 0
        #show
    #end if
    #if toepassing ≥ 1
        'Bijkomend, 'if(freq ≡ 1; "frequente"; "karakteristieke")' combinatie, grens 'g_bij'·l<sub>rep</sub>:
        #hide
        UC_wbij = u_wb
        #show
        UC_wbij', grootste w<sub>bij</sub>/grens over de velden'
        #if UC_wbij ≤ 1
            '<span class="oordeel" style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<span class="oordeel" style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if
    #else
        #hide
        UC_wbij = 0
        #show
    #end if

    # 8. Samenvatting

    '<table class="alleen-scherm" style="width:100%; border-collapse:collapse; font-size:0.95em;">
    '<tr style="border-bottom:2px solid #374151;"><th style="text-align:left; padding:2px 8px;">Toets</th><th style="text-align:left; padding:2px 8px;">Norm</th><th style="text-align:right; padding:2px 8px;">UC</th><th style="text-align:left; padding:2px 8px;">Oordeel</th></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Buiging</td><td style="padding:2px 8px;">'if(hout ≡ 1; "EN 1995-1-1 §6.1.6"; "EN 1993-1-1 §6.2.5")'</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_buiging)'">'r2(UC_buiging)'</td><td style="padding:2px 8px; color:'kleur(UC_buiging)'">'oordeel(UC_buiging)'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">'if(hout ≡ 1; "Afschuiving"; "Dwarskracht")'</td><td style="padding:2px 8px;">'if(hout ≡ 1; "§6.1.7"; "§6.2.6")'</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_afsch)'">'r2(UC_afsch)'</td><td style="padding:2px 8px; color:'kleur(UC_afsch)'">'oordeel(UC_afsch)'</td></tr>
    #if hout ≡ 1
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Oplegdruk</td><td style="padding:2px 8px;">§6.1.5</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_c90)'">'r2(UC_c90)'</td><td style="padding:2px 8px; color:'kleur(UC_c90)'">'oordeel(UC_c90)'</td></tr>
    #else
        '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Buiging met dwarskracht</td><td style="padding:2px 8px;">§6.2.8</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_MV)'">'r2(UC_MV)'</td><td style="padding:2px 8px; color:'kleur(UC_MV)'">'oordeel(UC_MV)'</td></tr>
    #end if
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Kip</td><td style="padding:2px 8px;">'if(hout ≡ 1; "§6.3.3"; "§6.3.2.3, bijlage NB.NB")'</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_kip)'">'r2(UC_kip)'</td><td style="padding:2px 8px; color:'kleur(UC_kip)'">'oordeel(UC_kip)'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Doorbuiging, eindstand</td><td style="padding:2px 8px;">NB bij EN 1990, A1.4.3(4)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_wmax)'">'if(uiterlijk ≡ 1; r2(UC_wmax); "—")'</td><td style="padding:2px 8px; color:'kleur(UC_wmax)'">'if(uiterlijk ≡ 1; oordeel(UC_wmax); "niet getoetst")'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:2px 8px;">Doorbuiging, bijkomend</td><td style="padding:2px 8px;">NB bij EN 1990, A1.4.3(3)</td><td style="padding:2px 8px; text-align:right; font-weight:700; color:'kleur(UC_wbij)'">'if(toepassing ≥ 1; r2(UC_wbij); "—")'</td><td style="padding:2px 8px; color:'kleur(UC_wbij)'">'if(toepassing ≥ 1; oordeel(UC_wbij); "niet getoetst")'</td></tr>
    '</table>

    UC_max = max(UC_buiging; UC_afsch; UC_c90; UC_MV; UC_kip; UC_wmax; UC_wbij)'<span class="alleen-scherm"></span>'
    UC_max'<span class="alleen-afdruk"></span>'
    #if UC_max ≤ 1.0
        '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: green"> ≤ 1.0 → <b>Ligger voldoet</b></span>
    #else
        '<span class="alleen-scherm"><b>Maatgevende UC = 'UC_max'</b></span><span class="oordeel" style="color: red"> > 1.0 → <b>Ligger voldoet niet</b></span>
    #end if
    #if R_min < 0
        '<span style="color: #b91c1c"><b>Trek in een oplegging:</b> verankeren voor ten minste 'r2(-R_min)' kN (§5).</span>
    #end if
    'Buiten dit blad: de verbindingen en opleggingen zelf'if(hout ≡ 1; ""; ", de plooi van het lijf bij de opleggingen en onder puntlasten")', trillingen en brand.
#else
    #if status ≡ -1
        '<span class="alleen-scherm"><b>Maatgevende UC = ∞</b></span><span class="oordeel" style="color: red"> → <b>Ligger voldoet niet</b>: het systeem is beweeglijk (§2)</span>
    #end if
#end if
`;
